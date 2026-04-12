const TOKEN_KEY='tokenArcadeTotal';
const SOUND_KEY='tokenArcadeSound';
function getTokens(){return Number(localStorage.getItem(TOKEN_KEY)||500)}
function setTokens(v){localStorage.setItem(TOKEN_KEY,String(Math.max(0,v))); const el=document.getElementById('tokenTotal'); if(el)el.textContent=Math.max(0,v).toFixed(2)}
function spend(v){let t=getTokens(); if(t<v) return false; setTokens(t-v); return true;}
function add(v){setTokens(getTokens()+v)}
function soundOn(){return localStorage.getItem(SOUND_KEY)!=='off'}
function toggleSound(){localStorage.setItem(SOUND_KEY,soundOn()?'off':'on'); const el=document.getElementById('soundBtn'); if(el)el.textContent='Sound: '+(soundOn()?'On':'Off')}
function beep(freq=440,dur=.08){if(!soundOn()) return; const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;o.connect(g);g.connect(ctx.destination);g.gain.value=.03;o.start();o.stop(ctx.currentTime+dur)}
function initWallet(){setTokens(getTokens()); const el=document.getElementById('soundBtn'); if(el)el.textContent='Sound: '+(soundOn()?'On':'Off'); ensureTopControls();}

function celebrateWin(title='BIG WIN!',amount=0,detail='Congratulations!'){let e=document.getElementById('winEvent');if(!e){e=document.createElement('div');e.id='winEvent';e.className='win-event';e.innerHTML="<div class='box'><h2 id='winTitle'></h2><div class='amt' id='winAmt'></div><p id='winDetail'></p></div>";document.body.appendChild(e);}document.getElementById('winTitle').textContent=title;document.getElementById('winAmt').textContent=amount?`+${Number(amount).toFixed(2)} SpendTokens`:'';document.getElementById('winDetail').textContent=detail;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800);if(typeof beep==='function')beep(920,.15);}


function ensureTopControls(){const top=document.querySelector('.top');if(!top)return;if(!document.getElementById('adviceTopBtn')){const a=document.createElement('a');a.id='adviceTopBtn';a.className='btn btn-gold';a.href='golden-advice.html';a.textContent='Golden Advice';top.appendChild(a);}if(!document.getElementById('atmTopBtn')){const b=document.createElement('button');b.id='atmTopBtn';b.className='btn';b.type='button';b.textContent='ATM';b.onclick=openAtm;top.appendChild(b);}}

function openAdvicePanel(){let panel=document.getElementById('adviceDrawer');if(!panel){panel=document.createElement('div');panel.id='adviceDrawer';panel.className='advice-drawer';panel.innerHTML="<h4>Golden Advice (Quick)</h4><p>Open the full Golden Advice page for the deeper calculators and saved history.</p><ul><li>Roulette: track color streaks and table tempo.</li><li>Blackjack: compare totals against the up-card.</li><li>Craps: review point pressure, field swings, and prop pacing.</li></ul><a class='btn btn-gold' href='golden-advice.html'>Open Golden Advice</a><button class='btn' id='closeAdvice' style='margin-left:8px'>Close</button>";document.body.appendChild(panel);document.getElementById('closeAdvice').onclick=()=>panel.classList.remove('open');}panel.classList.add('open');}

function ensureArcadeDock(){if(document.getElementById('arcadeDock'))return;const d=document.createElement('div');d.id='arcadeDock';d.className='arcade-dock';d.style.display='none';d.innerHTML="";document.body.appendChild(d);const panel=document.createElement('div');panel.id='adviceDrawer';panel.className='advice-drawer';panel.innerHTML="<h4>Golden Advice (Quick)</h4><p>Open the full Golden Advice page for the deeper calculators and saved history.</p><ul><li>Roulette: track color streaks and table tempo.</li><li>Blackjack: compare totals against the up-card.</li><li>Craps: review point pressure, field swings, and prop pacing.</li></ul><a class='btn btn-gold' href='golden-advice.html'>Open Golden Advice</a><button class='btn' id='closeAdvice' style='margin-left:8px'>Close</button>";document.body.appendChild(panel);}

function openAtm(){const v=prompt('ATM: Add testing SpendTokens amount (e.g. 500)','500');if(v===null)return;const n=Number(v);if(!Number.isFinite(n)||n<=0)return alert('Enter a positive number.');add(n);alert(`ATM added ${n.toFixed(2)} SpendTokens.`);}
