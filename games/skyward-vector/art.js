// Original generated production artwork, loaded locally from this game folder.
const CROPS={
  player:[30,0,385,422],scout:[444,64,370,337],swoop:[879,42,327,375],
  interceptor:[10,422,424,412],disc:[437,423,389,382],turret:[896,452,303,360],
  battery:[60,855,324,367],bunker:[435,837,360,366],boss:[813,805,432,420],
};
const BIOMES=['forest','delta','desert','glacier','storm','citadel'];
function loadImage(name){
  return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=new URL(`./assets/${name}`,import.meta.url).href;});
}
function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export class ArtLibrary{
  constructor(){
    this.sprites=new Map();this.terrainTiles=new Map();this.combat=null;this.terrain=null;
    this.ready=Promise.all([loadImage('combat-atlas.png'),loadImage('terrain-atlas.png')]).then(([combat,terrain])=>{
      this.combat=combat;this.terrain=terrain;
      if(combat)for(const [name,[x,y,w,h]] of Object.entries(CROPS)){
        const tile=surface(w+8,h+8),c=tile.getContext('2d');
        c.drawImage(combat,x,y,w,h,4,4,w,h);
        const shadow=surface(w+8,h+8),s=shadow.getContext('2d');s.drawImage(tile,0,0);s.globalCompositeOperation='source-in';s.fillStyle='#020d16';s.fillRect(0,0,shadow.width,shadow.height);
        this.sprites.set(name,{image:tile,shadow,ratio:tile.width/tile.height});
      }
      return !!(combat&&terrain);
    });
  }
  sprite(c,name,x,y,width,{angle=0,alpha=1,shadow=false}={}){
    const s=this.sprites.get(name);if(!s)return false;
    const height=width/s.ratio;
    c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=alpha;
    c.drawImage(shadow?s.shadow:s.image,-width/2,-height/2,width,height);c.restore();return true;
  }
  terrainTile(biome,variant){
    if(!this.terrain)return null;
    const index=Math.max(0,BIOMES.indexOf(biome)),key=`${index}:${variant%4}`;
    if(this.terrainTiles.has(key))return this.terrainTiles.get(key);
    const tile=surface(480,400),c=tile.getContext('2d'),cw=this.terrain.width/2,ch=this.terrain.height/3;
    c.save();if(variant%2){c.translate(480,0);c.scale(-1,1);}
    // A slightly wider source creates a natural aerial scale; every tile has a
    // soft top overlap, so generated panel edges never make a hard scrolling seam.
    c.drawImage(this.terrain,(index%2)*cw,Math.floor(index/2)*ch,cw,ch,-60,0,600,400);c.restore();
    c.fillStyle=biome==='glacier'?'rgba(8,29,43,.30)':biome==='desert'?'rgba(28,22,19,.23)':'rgba(5,20,29,.16)';c.fillRect(0,0,480,400);
    c.globalCompositeOperation='destination-in';const fade=c.createLinearGradient(0,0,0,70);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'#000');c.fillStyle=fade;c.fillRect(0,0,480,400);
    this.terrainTiles.set(key,tile);return tile;
  }
  drawTerrain(c,biome,scroll){
    if(!this.terrain)return false;
    c.fillStyle='#142c32';c.fillRect(0,0,480,720);
    const stride=330,first=Math.floor(-scroll/stride)-1;
    // Bottom tiles first: the upper tile's feathered start blends into the old
    // panel, while its opaque body fills every pixel of the field.
    for(let i=first;i<first+5;i++){
      const variant=((i%4)+4)%4;const tile=this.terrainTile(biome,variant);
      c.drawImage(tile,0,i*stride+scroll);
    }
    return true;
  }
}
