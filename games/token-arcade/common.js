const TOKEN_KEY='tokenArcadeTotal';
const SOUND_KEY='tokenArcadeSound';
function getTokens(){return Number(localStorage.getItem(TOKEN_KEY)||500)}
function setTokens(v){localStorage.setItem(TOKEN_KEY,String(Math.max(0,v))); const el=document.getElementById('tokenTotal'); if(el)el.textContent=Math.max(0,v).toFixed(2)}
function spend(v){let t=getTokens(); if(t<v) return false; setTokens(t-v); return true;}
function add(v){setTokens(getTokens()+v)}
function soundOn(){return localStorage.getItem(SOUND_KEY)!=='off'}
function toggleSound(){localStorage.setItem(SOUND_KEY,soundOn()?'off':'on'); const el=document.getElementById('soundBtn'); if(el)el.textContent='Sound: '+(soundOn()?'On':'Off')}
function beep(freq=440,dur=.08){if(!soundOn()) return; const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;o.connect(g);g.connect(ctx.destination);g.gain.value=.03;o.start();o.stop(ctx.currentTime+dur)}
function initWallet(){setTokens(getTokens()); const el=document.getElementById('soundBtn'); if(el)el.textContent='Sound: '+(soundOn()?'On':'Off')}

function celebrateWin(title='BIG WIN!',amount=0,detail='Congratulations!'){let e=document.getElementById('winEvent');if(!e){e=document.createElement('div');e.id='winEvent';e.className='win-event';e.innerHTML="<div class='box'><h2 id='winTitle'></h2><div class='amt' id='winAmt'></div><p id='winDetail'></p></div>";document.body.appendChild(e);}document.getElementById('winTitle').textContent=title;document.getElementById('winAmt').textContent=amount?`+${Number(amount).toFixed(2)} SpendTokens`:'';document.getElementById('winDetail').textContent=detail;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800);if(typeof beep==='function')beep(920,.15);}
