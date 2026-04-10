const SETTINGS = { easy:{colors:8,pieces:24}, medium:{colors:14,pieces:40}, hard:{colors:20,pieces:62} };
const PALETTES = {
  firefighter:["#e74c3c","#f39c12","#f1c40f","#2ecc71","#3498db","#9b59b6","#1abc9c","#e67e22","#d35400","#c0392b","#7f8c8d","#16a085","#8e44ad","#2980b9","#27ae60","#ff6b81","#6c5ce7","#00cec9","#fdcb6e","#e17055"],
  police:["#1e90ff","#2f3542","#70a1ff","#57606f","#ffa502","#2ed573","#3742fa","#ff4757","#7bed9f","#5352ed","#a4b0be","#ff6b81","#2f9cff","#37406b","#00d2d3","#feca57","#5f27cd","#ff9f43","#10ac84","#341f97"]
};
const IMG = {
 firefighter:`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 560'><rect width='420' height='560' fill='#1a2639'/><rect y='420' width='420' height='140' fill='#2f5233'/><rect x='40' y='330' width='150' height='70' fill='#d62828'/><rect x='250' y='220' width='130' height='180' fill='#5f748f'/><rect x='262' y='238' width='30' height='40' fill='#9ec4f2'/><rect x='310' y='238' width='30' height='40' fill='#9ec4f2'/><text x='210' y='48' fill='white' font-size='28' text-anchor='middle'>🚒 Firefighter Action</text></svg>` )}`,
 police:`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 560'><rect width='420' height='560' fill='#1d2434'/><rect y='430' width='420' height='130' fill='#3f5b32'/><rect x='50' y='350' width='170' height='65' fill='#2f3f58'/><rect x='58' y='330' width='55' height='22' fill='#1e90ff'/><rect x='120' y='330' width='55' height='22' fill='#ff4757'/><text x='210' y='48' fill='white' font-size='28' text-anchor='middle'>🚓 Police Action</text></svg>` )}`
};
const STATE={selected:1,scene:'firefighter',difficulty:'easy',pieces:[],colorCount:8};
const svg=document.getElementById('puzzleSvg'), paletteEl=document.getElementById('palette'), statusEl=document.getElementById('status');
sceneSelect.onchange=()=>{STATE.scene=sceneSelect.value;render()}; difficultySelect.onchange=()=>{STATE.difficulty=difficultySelect.value;render()}; resetBtn.onclick=render;
function render(){const cfg=SETTINGS[STATE.difficulty];STATE.selected=1;STATE.colorCount=cfg.colors;STATE.pieces=buildPieces(cfg.pieces,cfg.colors);renderPalette(cfg.colors);renderPuzzle();updateStatus();}
function buildPieces(total,colors){const pieces=[];let id=1;let y=60;while(id<=total&&y<560){let h=rand(34,86), x=0;while(id<=total&&x<420){let w=rand(45,115);if(x+w>420)w=420-x;const jitter=8;const pts=[[x+rand(0,jitter),y+rand(0,jitter)],[x+w-rand(0,jitter),y+rand(0,jitter)],[x+w-rand(0,jitter),y+h-rand(0,jitter)],[x+rand(0,jitter),y+h-rand(0,jitter)]];pieces.push({id,number:((id-1)%colors)+1,pts,filled:false,cx:x+w/2,cy:y+h/2});id++;x+=w;}y+=h;}return pieces.slice(0,total)}
function renderPalette(cnt){paletteEl.innerHTML='';const colors=PALETTES[STATE.scene];for(let i=1;i<=cnt;i++){const b=document.createElement('button');b.className=`swatch ${i===STATE.selected?'active':''}`;b.style.background=colors[i-1];b.textContent=i;b.onclick=()=>{STATE.selected=i;renderPalette(cnt);updateStatus()};paletteEl.appendChild(b)}}
function renderPuzzle(){svg.innerHTML='';const img=document.createElementNS('http://www.w3.org/2000/svg','image');img.setAttribute('href',IMG[STATE.scene]);img.setAttribute('x','0');img.setAttribute('y','0');img.setAttribute('width','420');img.setAttribute('height','560');svg.appendChild(img);
for(const p of STATE.pieces){const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',p.pts.map(([x,y])=>`${x},${y}`).join(' '));poly.setAttribute('class','piece');poly.setAttribute('fill',p.filled?'transparent':'#111');poly.setAttribute('opacity',p.filled?'0':'0.92');poly.onpointerdown=e=>{e.preventDefault();paint(p.id)};svg.appendChild(poly);if(!p.filled){const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',p.cx);t.setAttribute('y',p.cy);t.setAttribute('class','nLabel');t.textContent=p.number;svg.appendChild(t);}}
}
function paint(id){const p=STATE.pieces.find(x=>x.id===id);if(!p||p.filled)return;if(p.number===STATE.selected){p.filled=true;renderPuzzle();updateStatus();}}
function updateStatus(){const d=STATE.pieces.filter(p=>p.filled).length;statusEl.textContent=`Selected ${STATE.selected} • ${d}/${STATE.pieces.length} pieces revealed.`}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
render();
