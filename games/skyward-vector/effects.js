/* Original layered explosion effects. Visual randomness never touches combat. */
const TAU=Math.PI*2;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=n=>1-(1-clamp(n))**3;
function noise(seed,index){const n=Math.sin(seed*9127.13+index*127.19)*43758.5453;return n-Math.floor(n);}
function disc(c,x,y,r){c.beginPath();c.arc(x,y,Math.max(.01,r),0,TAU);c.fill();}
function makeCanvas(size){const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(size,size):document.createElement('canvas');canvas.width=size;canvas.height=size;return canvas;}

export class Effects {
  constructor({reducedMotion=false}={}){
    this.reducedMotion=reducedMotion;
    this.sprites=null;
  }
  createSprites(){
    if(this.sprites)return;
    // Bake soft light and billows once. Hundreds of individual puffs then use
    // drawImage, rather than allocating gradients or blur filters every frame.
    const radial=(stops)=>{
      const canvas=makeCanvas(160),c=canvas.getContext('2d');
      const g=c.createRadialGradient(80,80,0,80,80,79);
      for(const [at,color] of stops)g.addColorStop(at,color);
      c.fillStyle=g;disc(c,80,80,79);return canvas;
    };
    const fire=radial([[0,'#fffdea'],[.12,'#fff2a1'],[.32,'#ffc342'],[.52,'#ff7718'],[.72,'rgba(224,49,9,.9)'],[.88,'rgba(105,19,10,.4)'],[1,'rgba(73,15,11,0)']]);
    const ember=radial([[0,'#ffe39b'],[.16,'#ffbd42'],[.46,'#e45018'],[.75,'rgba(102,26,13,.65)'],[1,'rgba(47,21,17,0)']]);
    // Bake turbulent folds into the fire rather than stretching a smooth disc.
    // Every billow has a hot edge and a dark pocket, so large blasts keep detail.
    for(const [canvas,hot] of [[fire,true],[ember,false]]){
      const f=canvas.getContext('2d');
      for(let i=0;i<30;i++){
        const a=i*2.39996,radius=10+noise(41,i)*43;
        const x=80+Math.cos(a)*radius,y=80+Math.sin(a)*radius;
        const size=9+noise(91,i)*17,g=f.createRadialGradient(x-3,y-4,1,x,y,size);
        g.addColorStop(0,hot?'rgba(255,250,174,.9)':'rgba(255,173,52,.7)');
        g.addColorStop(.35,hot?'rgba(255,185,42,.8)':'rgba(231,86,18,.8)');
        g.addColorStop(.68,'rgba(164,37,9,.65)');g.addColorStop(1,'rgba(93,18,9,0)');
        f.fillStyle=g;disc(f,x,y,size);
      }
      for(let i=0;i<55;i++){
        const a=noise(131,i)*TAU,r=noise(82,i)*59,x=80+Math.cos(a)*r,y=80+Math.sin(a)*r;
        f.fillStyle=i%4===0?'rgba(255,247,175,.65)':'rgba(99,25,12,.28)';
        disc(f,x,y,1+noise(67,i)*3);
      }
    }
    const smoke=makeCanvas(160),c=smoke.getContext('2d');
    const body=c.createRadialGradient(66,58,3,80,80,77);
    body.addColorStop(0,'rgba(99,91,79,.8)');body.addColorStop(.35,'rgba(61,61,58,.86)');body.addColorStop(.7,'rgba(29,34,35,.7)');body.addColorStop(.9,'rgba(21,27,30,.3)');body.addColorStop(1,'rgba(18,23,26,0)');
    c.fillStyle=body;disc(c,80,80,78);
    const light=radial([[0,'rgba(255,225,151,.75)'],[.15,'rgba(255,174,56,.4)'],[.48,'rgba(255,108,28,.13)'],[1,'rgba(255,91,13,0)']]);
    this.sprites={fire,ember,smoke,light};
  }
  sprite(c,sprite,x,y,r,alpha=1,stretch=1,rotation=0){
    if(r<.2||alpha<=0)return;
    c.save();c.globalAlpha=clamp(alpha);c.translate(x,y);if(rotation)c.rotate(rotation);c.drawImage(sprite,-r,-r*stretch,r*2,r*2*stretch);c.restore();
  }
  position(game,e){
    const groundShift=e.ground&&e.kind!=='boss'?(game.scroll||0)-(e.spawnScroll||0):0;
    return {x:e.x,y:e.y+groundShift+(e.ground?0:e.age*8)};
  }
  getShake(game){
    if(this.reducedMotion||game.state==='paused')return {x:0,y:0};
    let x=0,y=0;
    for(const e of game.explosions||[]){
      const fade=clamp(1-e.age/(e.kind==='boss'?.85:.32));
      const strength=(e.kind==='boss'?4.5:e.kind==='player'?2.4:e.kind==='ground'?1.3:e.kind==='bomb'?.7:.8)*fade*fade;
      x+=Math.sin(e.age*89+e.seed*TAU)*strength;
      y+=Math.cos(e.age*103+e.seed*9)*strength;
    }
    return {x:clamp(x,-5,5),y:clamp(y,-5,5)};
  }
  draw(game,c){
    const explosions=game.explosions||[];
    if(!explosions.length)return;
    this.createSprites();
    c.save();c.globalCompositeOperation='source-over';
    for(const e of explosions){
      const {x,y}=this.position(game,e);
      if(x+e.r*2<0||x-e.r*2>480||y+e.r*2<0||y-e.r*2>720)continue;
      this.explosion(c,e,x,y);
    }
    c.restore();
  }
  explosion(c,e,x,y){
    const age=e.age,r=e.r||54,seed=e.seed||0;
    const boss=e.kind==='boss',ground=e.ground;
    const life=clamp(age/(e.duration||1.5));
    const speed=this.reducedMotion?.8:1;
    const fireLife=boss?1.75:e.kind==='ground'?.9:.72;
    const flameFade=clamp(1-age/fireLife);
    const fade=clamp((1-life)*1.8);
    const expansion=ease(age/(boss?.58:.23));
    c.save();c.translate(x,y);

    // A dark impact footprint, and a broad warm light pool, ground the blast.
    if(ground){
      c.save();c.scale(1,.78);c.fillStyle=`rgba(13,13,13,${.25*fade*ease(age/.1)})`;disc(c,0,0,r*(.24+expansion*.38));c.restore();
    }
    c.globalCompositeOperation='screen';
    this.sprite(c,this.sprites.light,0,0,r*(.65+expansion*.8),flameFade*(boss?.54:.4),ground?.8:1);
    c.globalCompositeOperation='source-over';

    // The smoke blooms outward in overlapping, shaded billows and lingers
    // after the bright core has burnt away. Its silhouette stays irregular.
    const smokeCount=boss?15:ground?8:6;
    const smokeBirth=ease((age-.08)/.24);
    for(let i=0;i<smokeCount;i++){
      const n=noise(seed,i),a=i*TAU/smokeCount+noise(seed,i+21)*.55;
      const drift=(.1+ease(age/(boss?1.5:.95))*.65)*r;
      const px=Math.cos(a)*drift*(.4+n*.7);
      const py=Math.sin(a)*drift*(ground?.65:.8)-age*r*(boss?.07:.09);
      const size=r*(.19+noise(seed,i+41)*.14)*(1+ease(age/1.6)*.65);
      this.sprite(c,this.sprites.smoke,px,py,size,smokeBirth*fade*(boss?.76:.62),.88+n*.2,a*.2);
    }

    // Several molten lobes erupt on different timings. The fortress gets
    // delayed secondary detonations distributed across its full silhouette.
    const lobes=boss?13:ground?7:6;
    for(let i=0;i<lobes;i++){
      const n=noise(seed,i+80),delay=i===0?0:boss?.12+(i%4)*.18:n*.16;
      const local=age-delay;if(local<0)continue;
      const localLife=boss?.95:.65;
      const hot=clamp(1-local/localLife);if(!hot)continue;
      const grow=ease(local/.15);
      const a=i*TAU/lobes+noise(seed,i+95)*.4;
      const distance=i===0?0:r*(boss?.28:.2)*(1+grow*.7)*(n*.6+.5);
      const px=Math.cos(a)*distance,py=Math.sin(a)*distance*(ground?.76:1)-local*r*.08;
      const size=r*(i===0?(boss?.52:.5):.22+n*.12)*(.25+grow*.9)*(1-local/localLife*.3);
      this.sprite(c,local<localLife*.48?this.sprites.fire:this.sprites.ember,px,py,size,hot*.92,.93+n*.15);
      // White-hot centers are brief and localized, so bullets remain visible.
      if(local<.12){
        c.save();c.globalAlpha=(1-local/.12)*.55;c.fillStyle='#ffffdf';disc(c,px,py,size*.24);c.restore();
      }
    }

    // A pressure ring and thin refracted edge move far beyond the fireball.
    const ringAge=age/(boss?1.15:.65);
    if(ringAge<1){
      const radius=r*(.13+ease(ringAge)*1.08);
      c.save();c.scale(1,ground?.8:1);c.globalAlpha=(1-ringAge)**2*(this.reducedMotion?.24:.6);
      c.lineWidth=boss?3.5:2;c.strokeStyle='#ffdda5';c.beginPath();c.arc(0,0,radius,0,TAU);c.stroke();
      c.lineWidth=1;c.globalAlpha*=.4;c.strokeStyle='#fff9dd';c.beginPath();c.arc(0,0,radius+3,0,TAU);c.stroke();c.restore();
    }

    // Bright tracers, falling fragments, and individual embers provide scale.
    const sparks=boss?40:ground?22:17;
    const sparkLife=boss?1.55:1;
    const sparkFade=clamp(1-age/sparkLife);
    if(sparkFade>0){
      for(let i=0;i<sparks;i++){
        const a=i*TAU/sparks+noise(seed,i+130)*.18;
        const distance=r*(.23+noise(seed,i+160)*.9)*(1-Math.exp(-age*3.5))*speed;
        const px=Math.cos(a)*distance,py=Math.sin(a)*distance+(ground?age*age*r*.13:age*age*r*.25);
        const tail=r*(.025+noise(seed,i+190)*.025)*sparkFade;
        c.globalAlpha=sparkFade*(.5+noise(seed,i+200)*.5);c.lineWidth=i%4===0?2:1;
        c.strokeStyle=i%3?'#ffc267':'#fff1c2';c.beginPath();c.moveTo(px,py);c.lineTo(px-Math.cos(a)*tail,py-Math.sin(a)*tail);c.stroke();
        if(i%3===0){c.fillStyle='#fff5d0';disc(c,px,py,1.1*sparkFade+.4);}
      }
      c.globalAlpha=1;
    }
    const fragments=boss?16:7;
    for(let i=0;i<fragments;i++){
      const n=noise(seed,i+230),flight=boss?1.65:1.1;
      if(age>flight)continue;
      const a=i*TAU/fragments+n*.8,distance=r*(.35+n*.55)*ease(age/flight)*speed;
      const px=Math.cos(a)*distance,py=Math.sin(a)*distance+age*age*r*.23;
      const size=(boss?3.8:2.5)*(n+.5)*(1-age/flight*.5);
      c.save();c.translate(px,py);c.rotate(a+age*(n-.5)*13);c.globalAlpha=clamp((flight-age)*2);c.fillStyle='#292a28';c.fillRect(-size,-size*.45,size*2,size);
      c.fillStyle=age<.25?'#ffde80':'#b86632';c.fillRect(-size,-size*.45,size*2,.8);c.restore();
    }
    c.restore();
  }
}
