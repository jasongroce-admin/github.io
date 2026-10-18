// SKYWARD VECTOR — deterministic, browser-independent simulation. No network or runtime dependencies.
export const BUILD = '20261018-1';
export const LEVELS = [
  { name:'Verdant Approach', biome:'forest', tagline:'Find the river. Silence the uplink.', duration:64, scrollSpeed:44, palette:{land:'#294c3c',land2:'#3d6449',water:'#184553',accent:'#79e4c2'} },
  { name:'Riverworks', biome:'delta', tagline:'Cross the delta. Break the blockade.', duration:68, scrollSpeed:48, palette:{land:'#385944',land2:'#597252',water:'#165365',accent:'#88e8ec'} },
  { name:'Amber Expanse', biome:'desert', tagline:'Follow the old road to the buried array.', duration:72, scrollSpeed:49, palette:{land:'#98794c',land2:'#b29861',water:'#305662',accent:'#ffcc83'} },
  { name:'Glacier Array', biome:'glacier', tagline:'Trace the signal through the ice.', duration:74, scrollSpeed:50, palette:{land:'#537d89',land2:'#82a6ac',water:'#254d68',accent:'#c5f3ff'} },
  { name:'Storm Coast', biome:'storm', tagline:'Fly beneath the storm. Cut their supply line.', duration:76, scrollSpeed:53, palette:{land:'#304956',land2:'#4c6265',water:'#1d354b',accent:'#cba9ff'} },
  { name:'The Iron Citadel', biome:'citadel', tagline:'One last fortress. Bring the core down.', duration:80, scrollSpeed:54, palette:{land:'#3b4248',land2:'#50595c',water:'#193e45',accent:'#ffc07d'} },
];
const DIFFICULTY = {
  relaxed:{lives:6,speed:0.75,rate:1.35,enemyHp:0.8,bossHp:0.75},
  arcade:{lives:4,speed:1,rate:1,enemyHp:1,bossHp:1},
  veteran:{lives:3,speed:1.18,rate:0.82,enemyHp:1.15,bossHp:1.25},
};
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const dist2 = (a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
function segmentHit(x0,y0,x1,y1,x,y,r) {
  const dx=x1-x0, dy=y1-y0, den=dx*dx+dy*dy;
  const t=den?clamp(((x-x0)*dx+(y-y0)*dy)/den,0,1):0;
  return (x0+t*dx-x)**2+(y0+t*dy-y)**2<r*r;
}
function makeWaves(index) {
  const waves=[]; const end=LEVELS[index].duration;
  for(let t=3,n=0;t<end-4;t+=Math.max(3.3,5.4-index*.3),n++) {
    const kinds=index===0?['scout','scout','swoop']:index<3?['scout','swoop','interceptor','scout']:['swoop','interceptor','disc','scout'];
    waves.push({t,kind:kinds[n%kinds.length],count:3+Math.min(2,index),side:n%2?-1:1,pattern:n%3});
  }
  for(let t=6,n=0;t<end-7;t+=Math.max(4.2,7-index*.45),n++) {
    waves.push({t,kind:index>1&&n%4===3?'bunker':n%3===2?'battery':'turret',count:index>2&&n%2===0?2:1,side:n%2?-1:1,pattern:n%3});
  }
  // Guaranteed early equipment, then supply beacons earned by bombing marked bunkers.
  waves.push({t:11,kind:'supply',count:1});
  return waves.sort((a,b)=>a.t-b.t);
}
export class Game {
  constructor({difficulty='arcade',sector=0,onEvent=()=>{},seed=71937}={}) {
    this.width=480; this.height=720; this.difficulty=difficulty; this.onEvent=onEvent;
    this.initialSeed=seed; this.seed=seed; this.bestScore=0; this.unlocked=0;
    this.levelIndex=clamp(sector,0,LEVELS.length-1); this.totalTime=0; this.reset();
  }
  get level(){return LEVELS[this.levelIndex];}
  get rules(){return DIFFICULTY[this.difficulty]||DIFFICULTY.arcade;}
  get reticle(){return {x:this.player.x,y:this.player.y-126};}
  get boss(){return this.enemies.find(e=>e.kind==='boss'&&e.hp>0)||null;}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  emit(type,detail={}){this.onEvent(type,detail);}
  clearObjects(){this.enemies=[];this.shots=[];this.hostile=[];this.bombs=[];this.blasts=[];this.particles=[];this.pickups=[];}
  reset(){
    this.state='title';this.time=0;this.scroll=0;this.totalTime=0;this.score=0;this.lives=this.rules.lives;
    this.clearObjects();this.player={x:240,y:590,r:6,invulnerable:0,weapon:1,shield:false,tilt:0,alive:true,fireCooldown:0,bombCooldown:0};
    this.stats={airKills:0,groundKills:0,shots:0,bombs:0,hits:0,deaths:0};this.lastBonus=0;
    this.nextLife=20000;this.killCount=0;this.banner='';this.bannerTime=0;
  }
  start(sector=0){
    this.reset();this.seed=this.initialSeed;this.levelIndex=clamp(Number(sector)||0,0,5);
    this.unlocked=Math.max(this.unlocked,this.levelIndex);this.beginSector();
  }
  beginSector(){
    this.time=0;this.scroll=0;this.clearObjects();this.state='playing';
    Object.assign(this.player,{x:240,y:590,alive:true,invulnerable:3,fireCooldown:0,bombCooldown:0,tilt:0});
    this.waves=makeWaves(this.levelIndex);this.waveIndex=0;this.bossSpawned=false;this.escortTimer=5;
    this.banner=`SECTOR ${String(this.levelIndex+1).padStart(2,'0')} · ${this.level.name.toUpperCase()}`;this.bannerTime=3.5;
    this.checkpoint={score:this.score,lives:this.lives,weapon:this.player.weapon,shield:this.player.shield,stats:{...this.stats},nextLife:this.nextLife,killCount:this.killCount,seed:this.seed};
    this.emit('sectorStart',{sector:this.levelIndex});
  }
  pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
  resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
  nextSector(){if(this.state==='sectorClear'&&this.levelIndex<5){this.levelIndex++;this.unlocked=Math.max(this.unlocked,this.levelIndex);this.beginSector();}}
  retrySector(){
    if(!['gameover','paused','sectorClear'].includes(this.state))return;
    const c=this.checkpoint;if(!c)return;
    this.score=c.score;this.lives=Math.max(3,c.lives);this.player.weapon=c.weapon;this.player.shield=c.shield;
    this.stats={...c.stats};this.nextLife=c.nextLife;this.killCount=c.killCount;this.seed=c.seed;this.beginSector();
  }
  addScore(value){
    this.score+=value;this.bestScore=Math.max(this.bestScore,this.score);
    while(this.score>=this.nextLife){this.lives=Math.min(9,this.lives+1);this.nextLife+=20000;this.emit('extraLife');this.banner='EXTRA SHIP';this.bannerTime=2;}
  }
  spawn(kind,x,y,extra={}){
    const ground=['turret','battery','bunker','boss'].includes(kind);
    const base={scout:1,swoop:2,interceptor:3,disc:4,turret:2,battery:4,bunker:5,boss:42+this.levelIndex*9}[kind]||1;
    const hp=Math.max(1,Math.ceil(base*(kind==='boss'?this.rules.bossHp:this.rules.enemyHp)));
    const enemy={kind,x,y,baseX:x,hp,maxHp:hp,r:kind==='boss'?68:kind==='bunker'?24:kind==='battery'?20:kind==='disc'?21:kind==='turret'?17:16,
      ground,age:0,phase:this.random()*Math.PI*2,vx:0,vy:ground?this.level.scrollSpeed:76+this.levelIndex*6,
      fireTimer:1.2+this.random()*1.8,damageFlash:0,...extra};
    this.enemies.push(enemy);return enemy;
  }
  spawnWave(wave){
    if(wave.kind==='supply') {this.pickups.push({x:240,y:-20,kind:'weapon',age:0});return;}
    if(['turret','battery','bunker'].includes(wave.kind)){
      for(let i=0;i<wave.count;i++)this.spawn(wave.kind,wave.count>1?85+i*310:80+this.random()*320,-45-i*70,{supply:wave.kind==='bunker'});
      return;
    }
    const base=wave.pattern===0?85:wave.pattern===1?240:395;
    for(let i=0;i<wave.count;i++){
      const x=clamp(base+(i-(wave.count-1)/2)*45,32,448);
      this.spawn(wave.kind,x,-35-i*48,{side:wave.side,formation:wave.pattern,phase:i*.52,fireTimer:1.7+i*.18});
    }
  }
  fireAir(){
    const p=this.player;if(p.fireCooldown>0)return;
    p.fireCooldown=.14;this.stats.shots++;
    const spread=p.weapon===1?[0]:p.weapon===2?[-8,8]:[-15,0,15];
    for(const off of spread)this.shots.push({x:p.x+off,y:p.y-22,vx:off*(p.weapon>=3?2:0),vy:-650,r:3,damage:1,prevX:p.x+off,prevY:p.y-22});
    this.emit('shot');
  }
  dropBomb(){
    const p=this.player;if(p.bombCooldown>0)return;
    p.bombCooldown=.5;this.stats.bombs++;
    this.bombs.push({x:p.x,y:p.y-6,startX:p.x,startY:p.y-6,targetX:this.reticle.x,targetY:this.reticle.y,age:0,duration:.44});
    this.emit('bomb');
  }
  enemyFire(e){
    if(this.hostile.length>=220||e.y<22||e.y>this.player.y-48||e.y>650)return;
    const angle=Math.atan2(this.player.y-e.y,this.player.x-e.x);
    const speed=(e.kind==='boss'?132:e.ground?128:116)*this.rules.speed+this.levelIndex*6;
    const offsets=e.kind==='boss'?[-.32,-.16,0,.16,.32]:e.kind==='battery'||e.kind==='disc'?[-.13,.13]:[0];
    for(const offset of offsets)this.hostile.push({x:e.x,y:e.y+12,vx:Math.cos(angle+offset)*speed,vy:Math.sin(angle+offset)*speed,r:e.kind==='boss'?4.5:3.8,color:e.ground?'#ffc278':'#ff7d7d',age:0});
    if(e.kind==='boss'&&this.levelIndex>1){
      for(let i=0;i<8;i++){const a=e.age*.6+i*Math.PI/4;this.hostile.push({x:e.x,y:e.y,vx:Math.cos(a)*speed*.75,vy:Math.sin(a)*speed*.75,r:4,color:'#d8a0ff',age:0});}
    }
  }
  burst(x,y,color='#ffbd70',count=14){
    for(let i=0;i<count;i++){
      const a=this.random()*Math.PI*2,s=25+this.random()*115;
      this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,age:0,life:.35+this.random()*.55,size:1+this.random()*4,color});
    }
    if(this.particles.length>360)this.particles.splice(0,this.particles.length-360);
  }
  damageEnemy(e,damage){
    if(e.hp<=0)return;e.hp-=damage;e.damageFlash=.1;this.stats.hits++;
    if(e.hp>0)return;
    this.killCount++;if(e.ground)this.stats.groundKills++;else this.stats.airKills++;
    const values={scout:100,swoop:150,interceptor:220,disc:300,turret:250,battery:400,bunker:600,boss:3500+this.levelIndex*1000};
    this.addScore(values[e.kind]||100);this.burst(e.x,e.y,e.ground?'#ffbd70':'#9cf5ef',e.kind==='boss'?90:18);this.emit('explosion',{boss:e.kind==='boss'});
    if(e.kind==='boss'){this.completeSector();return;}
    if(e.supply||this.killCount%9===0){
      const kind=e.supply?'shield':this.player.weapon<3?'weapon':this.killCount%18===0?'life':'shield';
      this.pickups.push({x:e.x,y:e.y,kind,age:0});
    }
  }
  hurtPlayer(){
    const p=this.player;if(p.invulnerable>0||this.state!=='playing')return;
    if(p.shield){p.shield=false;p.invulnerable=1.5;this.burst(p.x,p.y,'#6df9e4',24);this.hostile=this.hostile.filter(b=>dist2(b,p)>150**2);this.emit('hit',{shield:true});return;}
    this.lives--;this.stats.deaths++;this.burst(p.x,p.y,'#fff0cd',35);this.emit('hit',{shield:false});
    this.hostile=[];this.shots=[];this.bombs=[];
    if(this.lives<=0){p.alive=false;this.state='gameover';this.emit('gameover',{score:this.score,sector:this.levelIndex});return;}
    Object.assign(p,{x:240,y:605,invulnerable:3.2,weapon:Math.max(1,p.weapon-1),fireCooldown:.3,bombCooldown:.3});
  }
  completeSector(){
    this.lastBonus=1000+this.lives*150;this.addScore(this.lastBonus);this.hostile=[];this.shots=[];this.bombs=[];
    this.enemies=[];this.unlocked=Math.max(this.unlocked,Math.min(5,this.levelIndex+1));
    this.state=this.levelIndex===5?'victory':'sectorClear';this.emit(this.state,{score:this.score,sector:this.levelIndex,bonus:this.lastBonus,unlocked:this.unlocked});
  }
  update(dt,input={}){
    dt=clamp(Number(dt)||0,0,.05);
    if(this.state!=='playing')return;
    // Small integration steps keep collisions consistent across 30/60/120 Hz screens.
    const steps=Math.max(1,Math.ceil(dt/(1/120)));const h=dt/steps;
    for(let i=0;i<steps&&this.state==='playing';i++)this.step(h,input);
  }
  step(dt,input){
    this.time+=dt;this.totalTime+=dt;this.scroll+=this.level.scrollSpeed*dt;this.bannerTime=Math.max(0,this.bannerTime-dt);
    const p=this.player;p.invulnerable=Math.max(0,p.invulnerable-dt);p.fireCooldown=Math.max(0,p.fireCooldown-dt);p.bombCooldown=Math.max(0,p.bombCooldown-dt);
    let dx=Number(input.dx)||0,dy=Number(input.dy)||0;
    if(input.pointer&&Number.isFinite(input.pointer.x)&&Number.isFinite(input.pointer.y)){
      const ax=input.pointer.x-p.x,ay=input.pointer.y-p.y,d=Math.hypot(ax,ay);dx=d?ax/d:0;dy=d?ay/d:0;
      const move=Math.min(d,330*dt);p.x+=dx*move;p.y+=dy*move;
    }else{const d=Math.max(1,Math.hypot(dx,dy));dx/=d;dy/=d;p.x+=dx*282*dt;p.y+=dy*282*dt;}
    p.x=clamp(p.x,22,458);p.y=clamp(p.y,155,684);p.tilt+=(dx*.35-p.tilt)*Math.min(1,dt*12);
    if(input.fire)this.fireAir();if(input.bomb)this.dropBomb();
    while(this.waveIndex<this.waves.length&&this.time>=this.waves[this.waveIndex].t)this.spawnWave(this.waves[this.waveIndex++]);
    if(!this.bossSpawned&&this.time>=this.level.duration){
      this.bossSpawned=true;this.spawn('boss',240,-90,{fireTimer:2});this.banner='FORTRESS DETECTED · BOMB THE REACTOR';this.bannerTime=4;this.emit('boss');
    }
    if(this.bossSpawned){this.escortTimer-=dt;if(this.escortTimer<=0){this.escortTimer=7;this.spawnWave({kind:'scout',count:2,side:1,pattern:this.levelIndex%3});}}
    for(const e of this.enemies){
      if(e.hp<=0)continue;e.age+=dt;e.damageFlash=Math.max(0,e.damageFlash-dt);
      if(e.kind==='boss'){
        e.y=Math.min(145,e.y+42*dt);e.x=240+Math.sin(e.age*.43)*(65+this.levelIndex*6);
      }else if(e.ground)e.y+=this.level.scrollSpeed*dt;
      else{
        e.y+=e.vy*dt;
        if(e.kind==='swoop')e.x=e.baseX+Math.sin(e.age*1.9+e.phase)*68;
        else if(e.kind==='interceptor')e.x=clamp(e.baseX+Math.sin(e.age*1.1+e.phase)*95,20,460);
        else if(e.kind==='disc')e.x=e.baseX+Math.sin(e.age*1.4+e.phase)*42;
        else e.x=e.baseX+Math.sin(e.age*1.5+e.phase)*18;
      }
      e.fireTimer-=dt;if(e.fireTimer<=0){this.enemyFire(e);e.fireTimer=(e.kind==='boss'?1.15:e.ground?2.8:e.kind==='scout'?4.2:3.1)*this.rules.rate;}
    }
    for(const b of this.shots){
      if(b.dead)continue;const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
      for(const e of this.enemies){if(e.ground||e.hp<=0)continue;
        if(segmentHit(oldX,oldY,b.x,b.y,e.x,e.y,e.r+b.r)){b.dead=true;this.damageEnemy(e,b.damage);break;}}
    }
    for(const b of this.bombs){
      b.age+=dt;b.targetY+=this.level.scrollSpeed*dt;
      const t=clamp(b.age/b.duration,0,1);b.x=b.startX+(b.targetX-b.startX)*t;b.y=b.startY+(b.targetY-b.startY)*t;
      if(t>=1&&!b.dead){
        b.dead=true;const radius=31;this.blasts.push({x:b.targetX,y:b.targetY,r:radius,age:0,duration:.36});this.burst(b.targetX,b.targetY,'#ffbf73',8);
        // The fortress's visible center is its bomb-only reactor; other ground structures have hull collisions.
        for(const e of this.enemies){if(!e.ground||e.hp<=0)continue;const hitR=e.kind==='boss'?36:e.r;
          if(dist2(e,{x:b.targetX,y:b.targetY})<(radius+hitR*.6)**2){
            this.damageEnemy(e,3);
            if(this.state!=='playing')return;
          }}
      }
    }
    if(this.state!=='playing')return;
    for(const b of this.hostile){
      const x=b.x,y=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;
      if(!b.dead&&segmentHit(x,y,b.x,b.y,p.x,p.y,p.r+b.r)){b.dead=true;this.hurtPlayer();if(this.state!=='playing')break;}
    }
    if(this.state!=='playing')return;
    for(const e of this.enemies){if(!e.ground&&e.hp>0&&dist2(e,p)<(e.r*.7+p.r)**2){this.hurtPlayer();break;}}
    for(const item of this.pickups){
      item.age+=dt;item.y+=70*dt;if(!item.dead&&dist2(item,p)<28**2){
        item.dead=true;if(item.kind==='weapon')p.weapon=Math.min(3,p.weapon+1);else if(item.kind==='shield')p.shield=true;else this.lives=Math.min(9,this.lives+1);
        this.addScore(250);this.burst(item.x,item.y,'#9cffe2',10);this.emit('pickup',{kind:item.kind});this.banner=item.kind==='weapon'?'AIR WEAPON UPGRADED':item.kind==='shield'?'SHIELD ONLINE':'EXTRA SHIP';this.bannerTime=1.5;
      }
    }
    for(const b of this.blasts){b.age+=dt;b.y+=this.level.scrollSpeed*dt;}
    for(const a of this.particles){a.age+=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vx*=1-dt*1.7;a.vy*=1-dt*1.7;}
    this.enemies=this.enemies.filter(e=>e.hp>0&&e.y<790&&e.x>-120&&e.x<600).slice(-80);
    this.shots=this.shots.filter(b=>!b.dead&&b.y>-30&&b.x>-20&&b.x<500).slice(-100);
    this.hostile=this.hostile.filter(b=>!b.dead&&b.y>-40&&b.y<760&&b.x>-40&&b.x<520&&b.age<12).slice(-240);
    this.bombs=this.bombs.filter(b=>!b.dead);this.blasts=this.blasts.filter(b=>b.age<b.duration);
    this.particles=this.particles.filter(a=>a.age<a.life);this.pickups=this.pickups.filter(a=>!a.dead&&a.y<760);
  }
}
