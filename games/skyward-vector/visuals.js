/* Original generated artwork with animated Canvas lighting and effects. */
import {ArtLibrary} from './art.js?v=20261018-art3';
import {Effects} from './effects.js?v=20261018-art3';
const W = 480, H = 720, TILE = 256;
const TAU = Math.PI * 2;
const heightFor=(kind,width)=>width*({scout:337/370,swoop:375/327,interceptor:412/424}[kind]||1);
const themes = {
  forest: {land:'#183e31', land2:'#23563d', edge:'#336a49', water:'#1a6474', deep:'#103f57', road:'#8d9275', accent:'#94e9c4'},
  delta: {land:'#2a5945', land2:'#427552', edge:'#69936a', water:'#26768b', deep:'#164b6a', road:'#a2a68b', accent:'#75e7dc'},
  desert: {land:'#b18a55', land2:'#c49c62', edge:'#dec084', water:'#347a85', deep:'#2a5965', road:'#7b654c', accent:'#ffe5a3'},
  glacier: {land:'#9dbbbd', land2:'#c7d8d2', edge:'#e3eee7', water:'#327d9b', deep:'#235b7d', road:'#718f9d', accent:'#bbf5ff'},
  storm: {land:'#173a51', land2:'#21465f', edge:'#316278', water:'#173a51', deep:'#10273d', road:'#748b9b', accent:'#bfa8ff'},
  citadel: {land:'#26373d', land2:'#31464b', edge:'#446067', water:'#183743', deep:'#102b35', road:'#6b8081', accent:'#ffb76c'}
};
function hash(a,b=0,c=0) { let n=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453; return n-Math.floor(n); }
function path(c, points, fill, stroke, width=1) { c.beginPath(); points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();} }
function line(c, points, color, width=1) { c.beginPath(); points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.strokeStyle=color;c.lineWidth=width;c.stroke(); }
function circle(c,x,y,r,fill,stroke,width=1){c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function hex(c,x,y,r,fill,stroke,width=1,rot=0){path(c,Array.from({length:6},(_,i)=>[x+Math.cos(i*TAU/6+rot)*r,y+Math.sin(i*TAU/6+rot)*r]),fill,stroke,width);}
function panel(c,x,y,w,h,top='#798b8c',edge='#b7c9c5') { c.fillStyle='#14232a';c.fillRect(x+3,y+4,w,h);c.fillStyle=top;c.fillRect(x,y,w,h);line(c,[[x,y+h],[x,y],[x+w,y]],edge,1);line(c,[[x+w,y],[x+w,y+h],[x,y+h]],'#182d36',2); }

export class Renderer {
  constructor(canvas) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:false});
    this.tiles=new Map(); this.width=W; this.height=H;
    this.pixelRatio=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    canvas.width=W*this.pixelRatio; canvas.height=H*this.pixelRatio;
    this.art=new ArtLibrary();this.ready=this.art.ready;
    this.effects=new Effects({reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches});
    this.ctx.imageSmoothingEnabled=true;
  }
  terrainTile(biome,index,palette) {
    const theme=themes[biome]||themes.forest;
    const key=`${biome}:${index}`;
    if(this.tiles.has(key))return this.tiles.get(key);
    const tile=document.createElement('canvas');tile.width=W;tile.height=TILE;
    const c=tile.getContext('2d');const oy=index*TILE;
    c.fillStyle=theme.land;c.fillRect(0,0,W,TILE);
    // Geological patches are tied to world coordinates, so the terrain never shimmers.
    for(let i=0;i<22;i++) {
      const x=hash(index,i,2)*W,y=hash(index,i,3)*TILE;
      const r=18+hash(index,i,4)*52;
      c.globalAlpha=.25+hash(index,i,5)*.15;
      path(c,Array.from({length:7},(_,j)=>[x+Math.cos(j*TAU/7)*r*(.7+hash(i,j,index)*.5),y+Math.sin(j*TAU/7)*r*.55]),i%3?theme.land2:theme.edge);
    }
    c.globalAlpha=1;
    for(let i=0;i<350;i++){c.fillStyle=i%4?theme.land2:theme.edge;c.globalAlpha=.16;c.fillRect(Math.floor(hash(index,i,8)*W),Math.floor(hash(index,i,9)*TILE),1+hash(i,index,4)*3,1+hash(index,i,7)*2);}c.globalAlpha=1;
    const river=(wy)=>263+Math.sin(wy*.0031)*116+Math.sin(wy*.008+.9)*29;
    const riverWidth=(wy)=>biome==='delta'?80+Math.sin(wy*.004)*24:biome==='glacier'?48:biome==='desert'?15:biome==='storm'?230:39+Math.sin(wy*.003)*10;
    if(biome!=='citadel') {
      for(let layer=0;layer<3;layer++){
        const pts=[];const inset=layer*5;
        for(let y=-10;y<=TILE+10;y+=8)pts.push([river(oy+y)-riverWidth(oy+y)+inset,y]);
        for(let y=TILE+10;y>=-10;y-=8)pts.push([river(oy+y)+riverWidth(oy+y)-inset,y]);
        path(c,pts,layer===0?theme.edge:layer===1?theme.water:theme.deep);
      }
      // Small highlights follow the water flow.
      c.globalAlpha=.2;
      for(let i=0;i<28;i++){const y=hash(index,i,18)*TILE;const x=river(oy+y)+(hash(index,i,19)-.5)*riverWidth(oy+y)*1.5;line(c,[[x,y],[x+6+hash(index,i,20)*16,y-2]],theme.accent,1);}
      c.globalAlpha=1;
    }
    // A continuous service road winding across every area.
    const road=(wy)=>93+Math.sin(wy*.0021+2)*51;
    const roadPts=[];for(let y=-12;y<=TILE+12;y+=8)roadPts.push([road(oy+y),y]);
    line(c,roadPts,'#111e23',13);line(c,roadPts,theme.road,9);line(c,roadPts,biome==='desert'?'#ac936a':'#667d78',5);
    c.setLineDash([9,13]);line(c,roadPts,'#d6d8b6',.7);c.setLineDash([]);
    if(biome==='citadel') {
      // Industrial city blocks, ducts, trenches, and power grids.
      for(let row=0;row<4;row++)for(let col=0;col<5;col++){
        const x=col*102-15+(row%2)*18,y=row*72+8;
        if(Math.abs(x-road(oy+y))<28)continue;
        const v=hash(index,row,col);panel(c,x,y,66+v*15,46,'#344d53','#688187');
        c.fillStyle='#1a303a';c.fillRect(x+8,y+9,28,26);
        for(let j=0;j<3;j++)line(c,[[x+42+j*8,y+9],[x+42+j*8,y+34]],'#597079',2);
        c.fillStyle=v>.5?'#ee956b':'#60b4b5';c.globalAlpha=.7;c.fillRect(x+11,y+13,20,3);c.globalAlpha=1;
      }
      for(let x=16;x<W;x+=120){line(c,[[x,0],[x,TILE]],'#172930',3);line(c,[[x+3,0],[x+3,TILE]],'#577077',1);}
    } else {
      // Biome-specific ground features are placed away from the river and road.
      for(let i=0;i<57;i++){
        const x=hash(index,i,27)*W,y=hash(index,i,28)*TILE;
        if(Math.abs(x-river(oy+y))<riverWidth(oy+y)+8||Math.abs(x-road(oy+y))<12)continue;
        const s=.5+hash(index,i,29)*.9;
        if(biome==='forest'||biome==='delta')this.tree(c,x,y,s,biome);
        else if(biome==='desert'){
          c.globalAlpha=.55;path(c,[[x-8*s,y+2],[x+2*s,y-5*s],[x+12*s,y],[x+5*s,y+4*s]],'#d5b77b');line(c,[[x-8*s,y+2],[x+2*s,y-5*s],[x+12*s,y]],'#e7c88f',1);c.globalAlpha=1;
        }else if(biome==='glacier'){
          path(c,[[x-9*s,y+4*s],[x-3*s,y-7*s],[x+5*s,y-10*s],[x+12*s,y+3*s],[x+2*s,y+8*s]],'#dce9e4','#6d9fad',.7);path(c,[[x-3*s,y-7*s],[x+2*s,y+8*s],[x+12*s,y+3*s],[x+5*s,y-10*s]],'#afd1d1');
        } else {c.globalAlpha=.32;circle(c,x,y,16*s,'#7294a3');c.globalAlpha=1;}
      }
      // Abandoned outposts make the ground read as a lived-in place.
      if(hash(index,99)>.34){const x=18+hash(index,100)*390,y=40+hash(index,101)*160;
        if(Math.abs(x-river(oy+y))>riverWidth(oy+y)+28){
          panel(c,x,y,34,23,biome==='desert'?'#9b805f':'#526b63','#99a495');
          c.fillStyle='#233c39';c.fillRect(x+7,y+6,18,11);line(c,[[x+3,y+29],[x+47,y+29]],theme.road,3);
          line(c,[[x+43,y+7],[x+43,y+24]],'#bec8a6',1);circle(c,x+43,y+7,2,theme.accent);
        }
      }
    }
    this.tiles.set(key,tile);if(this.tiles.size>22)this.tiles.delete(this.tiles.keys().next().value);
    return tile;
  }
  tree(c,x,y,s,biome){
    c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=.35;path(c,[[-3,4],[9,10],[15,5],[3,-2]],'#081c19');c.globalAlpha=1;
    path(c,[[-8,3],[-9,-3],[-3,-10],[4,-11],[10,-5],[10,1],[4,6]],biome==='delta'?'#2b633e':'#153d2a','#356447',.7);
    path(c,[[-7,-2],[-3,-9],[3,-10],[1,-3],[6,1],[-1,3]],biome==='delta'?'#4a8050':'#2e5c38');c.restore();
  }
  draw(game={}) {
    const c=this.ctx;const t=game.totalTime||game.time||0;
    const biome=game.level?.biome||'forest';const theme=themes[biome]||themes.forest;
    const scroll=Number.isFinite(game.scroll)?game.scroll:t*30;
    c.setTransform(this.pixelRatio,0,0,this.pixelRatio,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
    if(!this.art.drawTerrain(c,biome,scroll)){
      const first=Math.floor(-scroll/TILE);
      for(let i=first;i<=first+4;i++)c.drawImage(this.terrainTile(biome,i,game.level?.palette),0,Math.round(i*TILE+scroll));
    }
    // The upper screen is slightly hazy; a subtle vignette frames the action.
    const haze=c.createLinearGradient(0,0,0,H);haze.addColorStop(0,'rgba(175,209,207,.08)');haze.addColorStop(.65,'rgba(0,0,0,0)');haze.addColorStop(1,'rgba(1,9,18,.12)');c.fillStyle=haze;c.fillRect(0,0,W,H);
    const enemies=game.enemies||[];
    for(const e of enemies)if(e.ground)this.enemy(c,e,t,true);
    for(const e of enemies)if(!e.ground){
      if(!this.art.sprite(c,e.kind,e.x+14,e.y+24,e.kind==='interceptor'?58:48,{alpha:.38,shadow:true}))this.shadow(c,e.x+15,e.y+24,(e.r||14),.24);
    }
    const p=game.player;
    if(p&&p.alive!==false){if(!this.art.sprite(c,'player',p.x+17,p.y+29,56,{alpha:.42,shadow:true}))this.shadow(c,p.x+17,p.y+27,16,.28);}
    for(const pickup of game.pickups||[])this.pickup(c,pickup,t);
    for(const b of game.bombs||[])this.bomb(c,b,t);
    // Ground impacts live below the aircraft layer.
    if(!game.explosions)for(const b of game.blasts||[])this.blast(c,b,t);
    for(const s of game.shots||[])this.shot(c,s);
    for(const e of enemies)if(!e.ground)this.enemy(c,e,t,false);
    if(p&&p.alive!==false)this.player(c,p,t);
    this.effects.draw(game,c);
    for(const s of game.hostile||[])this.hostile(c,s,t);
    for(const p of game.particles||[])this.particle(c,p);
    if(game.reticle&&p&&p.alive!==false)this.reticle(c,game.reticle,t);
    if(biome==='storm')this.clouds(c,scroll,t);
    // Side rails define the 4:6 playfield without covering any gameplay.
    const vignette=c.createLinearGradient(0,0,W,0);vignette.addColorStop(0,'rgba(2,8,17,.3)');vignette.addColorStop(.12,'rgba(2,8,17,0)');vignette.addColorStop(.88,'rgba(2,8,17,0)');vignette.addColorStop(1,'rgba(2,8,17,.3)');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    c.fillStyle=theme.accent;c.globalAlpha=.25;c.fillRect(0,0,1,H);c.fillRect(W-1,0,1,H);c.globalAlpha=1;
  }
  shadow(c,x,y,r,opacity=.3){c.save();c.translate(x,y);c.scale(1,.45);circle(c,0,0,r,'rgba(0,8,12,'+opacity+')');c.restore();}
  player(c,p,t){
    c.save();c.translate(p.x,p.y);c.rotate((p.tilt||0)*.13);
    if(p.invulnerable>0){c.globalAlpha=Math.sin(t*38)>.15?.42:.95;}
    if(this.art.sprites.has('player')){
      const glow=c.createRadialGradient(0,24,0,0,24,30);glow.addColorStop(0,'rgba(125,246,255,.65)');glow.addColorStop(1,'rgba(40,140,255,0)');c.fillStyle=glow;c.fillRect(-31,0,62,65);
      for(const x of [-9,0,9]){const len=(x?19:27)+Math.sin(t*48+x)*4;path(c,[[x-3,21],[x-2,29],[x,29+len],[x+2,29],[x+3,21]],'#49ceff');path(c,[[x-1,24],[x,29+len*.72],[x+1,24]],'#e8ffff');}
      this.art.sprite(c,'player',0,0,58);
      c.globalAlpha=1;
      // The exact collision center stays visible on the bright cockpit.
      circle(c,0,0,2.5,'#d5ffff','#1787a4',.8);
      if(p.shield){c.strokeStyle='rgba(143,248,255,.75)';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,37,40,0,0,TAU);c.stroke();}
      if(p.weapon>1){c.fillStyle='#c6fff6';c.fillRect(-20,8,2,8);c.fillRect(18,8,2,8);}
      c.restore();return;
    }
    const thrust=10+Math.sin(t*55)*3;
    const glow=c.createRadialGradient(0,25,1,0,25,25);glow.addColorStop(0,'rgba(83,222,255,.6)');glow.addColorStop(1,'rgba(38,140,255,0)');c.fillStyle=glow;c.fillRect(-26,7,52,48);
    path(c,[[-5,17],[-3,24+thrust],[0,30+thrust],[3,24+thrust],[5,17]],'#46c9f1');path(c,[[-2,17],[0,28+thrust*.8],[2,17]],'#efffff');
    // Broad gull wings and an asymmetric light direction make the craft legible.
    path(c,[[0,-23],[-7,-9],[-13,1],[-25,11],[-25,16],[-10,13],[-8,21],[-3,18],[3,18],[8,21],[10,13],[25,16],[25,11],[13,1],[7,-9]],'#344a60','#172b3f',1.4);
    path(c,[[-6,-8],[-10,6],[-23,13],[-10,10],[-6,14],[-3,9]],'#c6d8dc');path(c,[[6,-8],[10,6],[23,13],[10,10],[6,14],[3,9]],'#7e9aa8');
    path(c,[[0,-23],[-5,-8],[-5,15],[0,20],[5,15],[5,-8]],'#dce8e6','#607e91',.8);
    path(c,[[0,-15],[-3,-6],[-2,2],[2,2],[3,-6]],'#164e72','#69daf1',1);
    path(c,[[0,-16],[-1,-5],[1,0],[2,-6]],'#94f4ff');
    c.fillStyle='#e55b46';c.fillRect(-19,10,6,2);c.fillRect(13,10,6,2);
    line(c,[[-8,3],[-16,9]],'#417c93',1);line(c,[[8,3],[16,9]],'#2d5d77',1);
    c.fillStyle='#95dbe3';c.fillRect(-9,13,3,7);c.fillRect(6,13,3,7);
    if((p.weapon||1)>1){c.fillStyle='#76efff';c.fillRect(-20,8,2,6);c.fillRect(18,8,2,6);}
    c.globalAlpha=1;
    if(p.shield>0){const a=.28+Math.sin(t*4)*.08;c.strokeStyle=`rgba(120,236,255,${a})`;c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,33,34,0,0,TAU);c.stroke();c.strokeStyle='rgba(190,250,255,.7)';c.beginPath();c.ellipse(0,0,33,34,0,-2.5,-1.2);c.stroke();}
    c.restore();
  }
  enemy(c,e,t,ground){
    c.save();c.translate(e.x||0,e.y||0);
    const kind=e.kind||'scout';
    if(this.art.sprites.has(kind)){
      const width={scout:43,swoop:47,interceptor:59,disc:54,turret:48,battery:60,bunker:61,boss:180}[kind]||48;
      const angle=kind==='disc'?(e.age||0)*.28:ground?0:Math.sin((e.age||0)*1.6)*.09;
      if(ground){this.art.sprite(c,kind,5,8,width,{alpha:.45,shadow:true});}
      this.art.sprite(c,kind,0,0,width,{angle});
      if(!ground&&kind!=='disc'){
        const glow=c.createRadialGradient(0,-heightFor(kind,width)*.32,0,0,-heightFor(kind,width)*.32,15);glow.addColorStop(0,'rgba(255,171,66,.45)');glow.addColorStop(1,'rgba(255,86,20,0)');c.fillStyle=glow;c.fillRect(-17,-heightFor(kind,width)*.5-9,34,30);
      }
      if(kind==='boss'){
        const glow=c.createRadialGradient(0,0,1,0,0,27);glow.addColorStop(0,'rgba(255,244,189,.8)');glow.addColorStop(.3,'rgba(255,173,66,.5)');glow.addColorStop(1,'rgba(255,90,15,0)');c.fillStyle=glow;c.globalAlpha=.7+Math.sin(t*6)*.15;c.fillRect(-28,-28,56,56);c.globalAlpha=1;
        circle(c,0,0,18,null,'#ffe3ac',1.2);c.fillStyle='#1a252b';c.fillRect(-43,70,86,5);c.fillStyle='#ffb661';c.fillRect(-42,71,84*Math.max(0,e.hp/e.maxHp),3);
      }
      if(e.damageFlash>0){c.globalCompositeOperation='screen';c.globalAlpha=Math.min(.65,e.damageFlash*5);circle(c,0,0,e.r||20,'#fff5cf');}
      c.restore();return;
    }
    if(ground){
      if(kind==='boss'){this.fortress(c,e,t);}
      else if(kind==='bunker'){
        path(c,[[-25,-12],[-15,-22],[18,-22],[28,-10],[28,17],[17,27],[-18,27],[-25,17]],'#152b30');
        path(c,[[-25,-16],[-15,-26],[18,-26],[28,-14],[28,13],[17,23],[-18,23],[-25,13]],'#72847a','#bac0a2',1);
        panel(c,-19,-18,40,33,'#52665e','#9aa68a');c.fillStyle='#1b373c';c.fillRect(-12,-7,26,11);c.fillStyle='#efb563';c.fillRect(-9,-5,20,3);
        for(let x=-18;x<=18;x+=9)line(c,[[x,14],[x,20]],'#304d49',2);
        circle(c,0,-2,4,'#fabd72');
      }else if(kind==='battery'){
        panel(c,-25,-20,50,44,'#526a64','#a4b8a6');panel(c,-18,-13,36,31,'#72887a','#c0cbb1');
        for(const x of [-12,12]){panel(c,x-5,-22,10,28,'#647e79','#b5c4ae');c.fillStyle='#182f35';c.fillRect(x-3,-24,6,7);circle(c,x,7,5,'#254347','#8cb5aa',1);}
        c.fillStyle='#ffb76a';c.fillRect(-3,-5,6,11);
      }else{
        hex(c,1,5,22,'#142d31');hex(c,0,0,22,'#748a7b','#b2c1a6',1,Math.PI/6);hex(c,0,0,16,'#405e55','#8fa98b',1,Math.PI/6);
        const angle=e.phase??Math.atan2(520-(e.y||0),240-(e.x||0));c.save();c.rotate(angle-Math.PI/2);panel(c,-5,-2,10,24,'#708c7f','#acc3a4');c.fillStyle='#18333a';c.fillRect(-3,17,6,8);c.restore();circle(c,0,0,8,'#8b9d80','#c3c5a1',1);circle(c,0,0,3,'#e7b773');
      }
    }else if(kind==='disc'){
      c.rotate((e.age||t)*.6);hex(c,0,0,23,'#223347','#bdd4db',1.5,Math.PI/6);hex(c,0,0,18,'#83929d','#34475c',1,Math.PI/6);
      for(let i=0;i<6;i++){c.save();c.rotate(i*TAU/6);path(c,[[-4,-21],[4,-21],[3,-11],[-3,-11]],i%2?'#d77a51':'#aebec2');c.restore();}
      circle(c,0,0,11,'#263d58','#ecaf71',1.5);circle(c,-2,-2,6,'#5993a5');circle(c,-3,-3,3,'#b6f7f2');
    }else if(kind==='interceptor'){
      c.rotate(Math.sin((e.age||0)*2)*.12);
      path(c,[[0,25],[-8,6],[-32,-6],[-29,-17],[-8,-10],[-5,-23],[5,-23],[8,-10],[29,-17],[32,-6],[8,6]],'#7a6b70','#e7bf8b',1.2);
      path(c,[[-4,-18],[-8,4],[-27,-8],[-25,-12],[-6,-7],[0,15],[6,-7],[25,-12],[27,-8],[8,4],[4,-18]],'#c89b70');
      path(c,[[0,18],[-5,5],[-4,-6],[0,-12],[4,-6],[5,5]],'#584a69','#e0ac92',1);path(c,[[-3,5],[0,11],[3,5],[2,-1],[-2,-1]],'#f68a61');
      c.fillStyle='#80e0d5';c.fillRect(-23,-10,6,2);c.fillRect(17,-10,6,2);
    }else{
      c.rotate(Math.max(-.22,Math.min(.22,(e.vx||0)*.003)));
      const red=kind==='swoop';const size=kind==='swoop'?1.05:.85;c.scale(size,size);
      path(c,[[0,23],[-7,8],[-23,-4],[-20,-17],[-8,-10],[-5,-20],[5,-20],[8,-10],[20,-17],[23,-4],[7,8]],red?'#8c4d56':'#677a84',red?'#e99d83':'#bed1d1',1.2);
      path(c,[[-8,-7],[-20,-12],[-19,-4],[-7,3]],red?'#d8876b':'#a6bab8');path(c,[[8,-7],[20,-12],[19,-4],[7,3]],red?'#a45b58':'#809a9f');
      path(c,[[0,20],[-4,5],[-4,-10],[0,-15],[4,-10],[4,5]],red?'#de9676':'#bfcebd');path(c,[[0,12],[-3,3],[-2,-3],[2,-3],[3,3]],'#623c58','#f5a17a',.6);circle(c,0,4,2,'#f8d9a3');
      c.fillStyle=red?'#ffaf77':'#b8f4ec';c.fillRect(-7,-20,3,5);c.fillRect(4,-20,3,5);
    }
    if(e.damageFlash>0){c.globalCompositeOperation='screen';c.globalAlpha=Math.min(.7,e.damageFlash*5);circle(c,0,0,e.r||20,'#fff9d6');}
    c.restore();
  }
  fortress(c,e,t){
    // A floating ground bastion with a genuinely distinct bomb target at its core.
    c.save();const pulse=.6+Math.sin(t*4)*.2;
    path(c,[[-73,-38],[-44,-66],[44,-66],[73,-38],[78,45],[50,67],[-50,67],[-78,45]],'#101f2c','#10202a',4);
    path(c,[[-73,-46],[-44,-74],[44,-74],[73,-46],[78,37],[50,59],[-50,59],[-78,37]],'#607a7a','#b2c5b2',1.5);
    path(c,[[-62,-39],[-37,-62],[37,-62],[62,-39],[64,32],[42,46],[-42,46],[-64,32]],'#304f58','#789a99',1);
    for(const side of [-1,1]){
      panel(c,side<0?-72:47,-43,25,78,'#647a71','#b7c8b0');
      for(let j=0;j<7;j++)panel(c,side<0?-68:51,-37+j*10,17,5,'#28484d','#77908c');
      panel(c,side<0?-53:28,-59,25,26,'#8c9880','#d4d0a7');
      c.fillStyle='#263d45';c.fillRect(side<0?-47:34,-67,12,22);c.fillStyle='#9ba892';c.fillRect(side<0?-47:34,-67,3,19);
      circle(c,side*52,34,10,'#183744','#7ca6a0',1.5);circle(c,side*52,34,4,'#df9a61');
      line(c,[[side*51,-20],[side*33,-20],[side*27,-8]],'#e0a364',2);
    }
    panel(c,-22,-56,44,14,'#496269','#8fa6a3');for(let i=0;i<5;i++){c.fillStyle='#172f3b';c.fillRect(-17+i*8,-53,4,7);}
    hex(c,0,0,39,'#152c3d','#94bcb3',2,Math.PI/6);hex(c,0,0,31,'#426570','#d0bf8f',1.5,Math.PI/6);
    c.save();c.rotate(t*.35);for(let i=0;i<6;i++){c.rotate(TAU/6);path(c,[[-3,-31],[3,-31],[7,-21],[4,-17],[-4,-17],[-7,-21]],'#8dabb0','#bed2c3',.6);}c.restore();
    circle(c,0,0,19,'#183b52','#f2b875',2);const rg=c.createRadialGradient(0,0,1,0,0,22);rg.addColorStop(0,'#fff0b0');rg.addColorStop(.35,'#f7aa61');rg.addColorStop(.7,'rgba(228,91,60,.6)');rg.addColorStop(1,'rgba(228,91,60,0)');c.globalAlpha=pulse;c.fillStyle=rg;c.fillRect(-23,-23,46,46);c.globalAlpha=1;
    hex(c,0,0,10,'#ffd68c','#fff3bf',1,Math.PI/6);line(c,[[-6,0],[6,0]],'#fff9d4',1);line(c,[[0,-6],[0,6]],'#fff9d4',1);
    panel(c,-25,38,50,13,'#455f67','#9cb5ac');c.fillStyle='#172e3b';c.fillRect(-20,42,40,4);c.fillStyle='#f7ad6c';c.fillRect(-18,43,36*Math.max(0,(e.hp||0)/(e.maxHp||1)),2);
    c.restore();
  }
  shot(c,s){
    const x=s.x,y=s.y;const glow=c.createLinearGradient(x,y-14,x,y+12);glow.addColorStop(0,'rgba(190,255,247,0)');glow.addColorStop(.35,'rgba(129,250,244,.7)');glow.addColorStop(1,'rgba(53,168,227,0)');c.fillStyle=glow;c.fillRect(x-4,y-14,8,26);c.fillStyle='#cafffa';c.fillRect(x-1.5,y-9,3,12);c.fillStyle='#fff';c.fillRect(x-.5,y-8,1,6);
  }
  hostile(c,s,t){
    c.save();const color=s.color||'#ffac73';c.shadowColor=color;c.shadowBlur=8;circle(c,s.x,s.y,(s.r||4)+1,'#9c473e',color,1);circle(c,s.x,s.y,Math.max(1,(s.r||4)-1),'#fff0c8');c.restore();
  }
  reticle(c,r,t){
    c.save();c.translate(r.x,r.y);const pulse=.7+Math.sin(t*6)*.12;c.globalAlpha=pulse;
    c.strokeStyle='#ffd899';c.lineWidth=1.3;
    for(let i=0;i<4;i++){c.save();c.rotate(i*Math.PI/2);line(c,[[-6,-15],[-13,-15],[-13,-8]],'#ffe1a0',1.3);c.restore();}
    circle(c,0,0,7,null,'rgba(255,217,156,.5)',.8);line(c,[[-3,0],[3,0]],'#fff5d1',1);line(c,[[0,-3],[0,3]],'#fff5d1',1);c.restore();
  }
  bomb(c,b,t){
    const progress=Math.min(1,(b.age||0)/(b.duration||.55));const x=Number.isFinite(b.x)?b.x:(b.startX||0)+((b.targetX||0)-(b.startX||0))*progress;const y=Number.isFinite(b.y)?b.y:(b.startY||0)+((b.targetY||0)-(b.startY||0))*progress;
    c.save();c.globalAlpha=.4;line(c,[[b.startX??x,b.startY??y],[x,y]],'#ffca86',1);c.globalAlpha=1;c.translate(x,y);c.rotate(progress*5);hex(c,0,0,5-progress*2,'#ffe4a6','#fbab68',1,Math.PI/6);circle(c,0,0,2,'#fff8dc');c.restore();
    if(Number.isFinite(b.targetX)&&Number.isFinite(b.targetY)){c.save();c.globalAlpha=.2+progress*.4;circle(c,b.targetX,b.targetY,18*(1-progress)+6,null,'#ffd29a',1);c.restore();}
  }
  blast(c,b,t){
    const p=Math.min(1,(b.age||0)/(b.duration||.45)),r=(b.r||30)*(0.25+p*.85);c.save();c.globalAlpha=1-p;
    const g=c.createRadialGradient(b.x,b.y,0,b.x,b.y,r);g.addColorStop(0,p<.3?'#fff6c0':'rgba(255,218,123,.8)');g.addColorStop(.25,'rgba(255,184,82,.85)');g.addColorStop(.6,'rgba(224,84,48,.5)');g.addColorStop(1,'rgba(117,40,32,0)');c.fillStyle=g;c.fillRect(b.x-r,b.y-r,r*2,r*2);
    circle(c,b.x,b.y,r*.85,null,'#ffd08b',2*(1-p)+.5);for(let i=0;i<7;i++){const a=i*TAU/7+hash(i,b.x)*.4;const rr=r*(.5+hash(i,b.y)*.4);circle(c,b.x+Math.cos(a)*rr,b.y+Math.sin(a)*rr,Math.max(1,r*.15*(1-p)),'#ffd18a');}c.restore();
  }
  particle(c,p){
    const life=Math.max(.001,p.life||.5),alpha=Math.max(0,1-(p.age||0)/life);if(!alpha)return;c.save();c.globalAlpha=alpha;c.fillStyle=p.color||'#ffd18a';const size=Math.max(.4,(p.size||2)*(1-alpha*.15));c.translate(p.x||0,p.y||0);c.rotate((p.age||0)*3);c.fillRect(-size/2,-size/2,size,size);c.restore();
  }
  pickup(c,p,t){
    c.save();c.translate(p.x,p.y);const bob=Math.sin((p.age||t)*5)*2;c.translate(0,bob);c.rotate(Math.PI/4);c.shadowColor=p.kind==='life'?'#ffa3a4':'#82f4df';c.shadowBlur=12;c.fillStyle='#183b47';c.strokeStyle=p.kind==='life'?'#ffb0aa':'#97f1df';c.lineWidth=1.6;c.fillRect(-10,-10,20,20);c.strokeRect(-10,-10,20,20);c.shadowBlur=0;c.rotate(-Math.PI/4);c.fillStyle='#e5fff3';
    if(p.kind==='life'){c.fillRect(-2,-7,4,14);c.fillRect(-7,-2,14,4);}else if(p.kind==='shield'){path(c,[[-6,-7],[6,-7],[6,1],[0,8],[-6,1]],null,'#c1fff5',1.6);line(c,[[-3,-3],[3,-3]],'#c1fff5',1);}else{path(c,[[-6,4],[0,-7],[6,4],[0,1]],'#d0fff5');c.fillRect(-5,7,10,2);}
    c.restore();
  }
  clouds(c,scroll,t){
    c.save();for(let i=0;i<4;i++){const y=((i*241+scroll*.42)%1050)-180,x=90+hash(i,32)*330;c.globalAlpha=.055;for(let j=0;j<4;j++){const g=c.createRadialGradient(x+j*26,y,1,x+j*26,y,85);g.addColorStop(0,'#bcc7e1');g.addColorStop(1,'rgba(170,190,215,0)');c.fillStyle=g;c.fillRect(x+j*26-85,y-85,170,170);}}c.restore();
  }
}
