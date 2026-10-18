import { Game, LEVELS } from './core.js';
import { Renderer } from './visuals.js';

const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const overlay = $('gameOverlay');
const content = $('overlayContent');
const STORAGE_KEY = 'skyward-vector-save-v1';
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
const pad = (value, length = 6) => String(Math.max(0, Math.floor(Number(value) || 0))).padStart(length, '0');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let save = {};
try { save = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { /* Private browsing can disable storage. */ }
let difficulty = ['relaxed', 'arcade', 'veteran'].includes(save.difficulty) ? save.difficulty : 'arcade';
let unlocked = clamp(Number(save.unlocked) || 0, 0, LEVELS.length - 1);
let bestScore = Math.max(0, Number(save.bestScore) || 0);
let autoFire = typeof save.autoFire === 'boolean' ? save.autoFire : coarsePointer;
let soundOn = false;
let audioContext;
let selectedSector = 0;
let lastState = '';
let lastLevel = -1;
let toastTimer = 0;
let hudElapsed = 1;
const keys = new Set();
const touch = {fire: false, bomb: false};
const mouse = {fire: false, bomb: false};
let mouseSteering = false;
let pointer = null;
let pointerId = null;

function persist() {
  bestScore = Math.max(bestScore, game.bestScore || 0, game.score || 0);
  unlocked = clamp(Math.max(unlocked, game.unlocked || 0), 0, LEVELS.length - 1);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({bestScore, unlocked, difficulty, autoFire}));
  } catch { /* Play remains available without persistent storage. */ }
}

function tone(frequency, duration, wave = 'triangle', volume = 0.04, endFrequency = frequency, delay = 0) {
  if (!soundOn || !audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playSound(type, detail = {}) {
  if (!soundOn) return;
  if (type === 'shot') tone(840, .06, 'square', .013, 420);
  else if (type === 'bomb') tone(230, .18, 'sine', .07, 70);
  else if (type === 'explosion') {tone(detail.boss ? 95 : 160, detail.boss ? .7 : .21, 'sawtooth', detail.boss ? .08 : .032, 25);}
  else if (type === 'hit') {tone(180, .36, 'sawtooth', .06, 35);}
  else if (type === 'pickup' || type === 'extraLife') {tone(520,.13,'sine',.06,780);tone(780,.18,'sine',.045,1040,.1);}
  else if (type === 'sectorClear' || type === 'victory') [440,554,659,880].forEach((note,i) => tone(note,.36,'triangle',.065,note,i*.12));
  else if (type === 'gameover') [330,247,165].forEach((note,i) => tone(note,.4,'triangle',.06,note*.9,i*.19));
}

const game = new Game({difficulty, onEvent(type, detail) {
  playSound(type, detail);
  if (['sectorClear', 'victory', 'gameover', 'sectorStart', 'extraLife'].includes(type)) {
    persist();
    hudElapsed = 1;
  }
  if (type === 'sectorStart') {
    toastTimer = 3.3;
    $('sectorToast').innerHTML = `<small>SECTOR ${pad(game.levelIndex + 1, 2)} / ${pad(LEVELS.length, 2)}</small>${escapeHtml(game.level.name.toUpperCase())}`;
    $('sectorToast').classList.add('visible');
  }
}});
game.bestScore = bestScore;
game.unlocked = unlocked;
const renderer = new Renderer(canvas);
window.skyward = Object.freeze({game, renderer});
$('inputHint').textContent = coarsePointer ? 'DRAG TO FLY · HOLD BOMB TO STRIKE' : 'HOLD LEFT: FLY + FIRE · RIGHT: BOMB';

$('autoFire').checked = autoFire;
$('autoFire').addEventListener('change', event => {
  autoFire = event.target.checked;
  persist();
});

const emblem = `<svg class="overlay-emblem" viewBox="0 0 70 80" aria-hidden="true"><path d="M35 2 64 65 43 57 35 70 27 57 6 65Z"/><path class="accent" d="m35 21 9 35-9-6-9 6Z"/><path class="accent" d="m29 66 6 12 6-12-6 5Z"/></svg>`;
function primary(label, action) { return `<button class="primary-button" type="button" data-action="${action}">${label}<span aria-hidden="true">↗</span></button>`; }
function secondary(label, action) { return `<button class="secondary-button" type="button" data-action="${action}">${label}</button>`; }
function resultStats() {
  return `<div class="overlay-stats"><div><strong>${pad(game.stats.airKills, 2)}</strong><span>AIR TARGETS</span></div><div><strong>${pad(game.stats.groundKills, 2)}</strong><span>GROUND TARGETS</span></div><div><strong>${pad(game.lives, 2)}</strong><span>SHIPS LEFT</span></div></div>`;
}

function renderOverlay() {
  const state = game.state;
  const visible = state !== 'playing';
  overlay.hidden = !visible;
  overlay.classList.toggle('title-screen', state === 'title');
  $('pauseButton').disabled = state !== 'playing' && state !== 'paused';
  $('pauseButton').innerHTML = state === 'paused' ? '▶ <span>RESUME</span> <kbd>P</kbd>' : 'Ⅱ <span>PAUSE</span> <kbd>P</kbd>';
  $('mobilePause').hidden = state !== 'playing';
  if (!visible) {
    canvas.focus({preventScroll: true});
    return;
  }
  clearInputs();
  let markup = '';
  if (state === 'title') {
    const sectors = LEVELS.slice(0, unlocked + 1).map((level, index) => `<option value="${index}"${index === selectedSector ? ' selected' : ''}>${pad(index+1,2)} · ${escapeHtml(level.name)}</option>`).join('');
    markup = `<div class="overlay-kicker">ORIGINAL ARCADE CAMPAIGN</div>${emblem}<h2 class="overlay-title" id="overlayTitle">CLEAR THE SKY.<span>STRIKE BELOW.</span></h2><p class="overlay-intro">An original Xevious-inspired flight through ${LEVELS.length} hostile sectors. Fire at aircraft. Bomb the ground. Defeat every fortress.</p><div class="start-settings"><label for="difficultySelect">FLIGHT DIFFICULTY<select id="difficultySelect"><option value="relaxed"${difficulty==='relaxed'?' selected':''}>Relaxed · 6 ships</option><option value="arcade"${difficulty==='arcade'?' selected':''}>Arcade · 4 ships</option><option value="veteran"${difficulty==='veteran'?' selected':''}>Veteran · 3 ships</option></select></label><label for="sectorSelect">STARTING SECTOR<select id="sectorSelect">${sectors}</select></label></div>${primary('BEGIN FLIGHT', 'start')}<p class="overlay-note">${coarsePointer ? 'Drag the field to move. Hold BOMB to strike below.<br>Air autofire is on. Toggle it from the pause menu.' : '<strong>HOLD LEFT MOUSE</strong> to fly + fire<br><strong>RIGHT-CLICK / HOLD RIGHT</strong> to bomb the gold reticle<br>Or WASD / arrows move · Z / Space fire · X bombs'}<br>Unlimited fire and bombs · Checkpoints after each sector</p>`;
  } else if (state === 'paused') {
    markup = `<div class="overlay-kicker">FLIGHT SUSPENDED</div>${emblem}<h2 class="overlay-title" id="overlayTitle">HOLDING<span>POSITION.</span></h2><p class="overlay-intro">Sector ${pad(game.levelIndex + 1,2)} · ${escapeHtml(game.level.name)}<br>Your fleet is waiting for you.</p>${primary('RESUME FLIGHT', 'resume')}${secondary('RETRY THIS SECTOR', 'retry')}<label class="pause-autofire"><input id="pauseAutoFire" type="checkbox"${autoFire ? ' checked' : ''}> Air weapon autofire</label>${document.fullscreenElement?'<button class="text-button" type="button" data-action="exitFullscreen">EXIT FULLSCREEN</button>':''}<button class="text-button" type="button" data-action="menu">RETURN TO FLIGHT MENU</button><p class="overlay-note">${coarsePointer ? 'Drag to fly · FIRE for aircraft · BOMB for ground targets.' : 'Hold LEFT mouse: fly + fire · RIGHT mouse: bombs<br>WASD / arrows move · Z / Space fire · X bombs<br>P / ESC resumes · Bombs are unlimited.'}</p>`;
  } else if (state === 'sectorClear') {
    const next = LEVELS[game.levelIndex + 1];
    markup = `<div class="overlay-kicker">FORTRESS DESTROYED</div><h2 class="overlay-title" id="overlayTitle">SECTOR<span>SECURED.</span></h2><p class="overlay-intro">${escapeHtml(game.level.name)} is clear.<br>Fleet bonus: <strong>+${game.lastBonus.toLocaleString()}</strong></p>${resultStats()}<div class="overlay-brief"><strong>UP NEXT · SECTOR ${pad(game.levelIndex+2,2)}</strong>${escapeHtml(next.name)}<br>${escapeHtml(next.tagline)}</div>${primary('NEXT SECTOR', 'next')}${secondary('RETURN TO FLIGHT MENU', 'menu')}<p class="overlay-note">Sector unlocked. Your progress has been saved.</p>`;
  } else if (state === 'gameover') {
    markup = `<div class="overlay-kicker">SIGNAL LOST</div><h2 class="overlay-title" id="overlayTitle">FLEET<span>DOWN.</span></h2><p class="overlay-intro">Sector ${pad(game.levelIndex+1,2)} · ${escapeHtml(game.level.name)}<br>The mission is still yours to finish.</p><div class="results-score">${pad(game.score)}</div><div class="results-label">FINAL SCORE</div>${resultStats()}${primary('RETRY THIS SECTOR', 'retry')}${secondary('RESTART CAMPAIGN', 'restart')}<button class="text-button" type="button" data-action="menu">RETURN TO FLIGHT MENU</button><p class="overlay-note">Retry restores this sector's starting score and equipment.<br>At least 3 ships on every retry.</p>`;
  } else if (state === 'victory') {
    markup = `<div class="overlay-kicker">CAMPAIGN COMPLETE</div>${emblem}<h2 class="overlay-title" id="overlayTitle">SKIES<span>RECLAIMED.</span></h2><p class="overlay-intro">The Iron Citadel has fallen.<br>All ${LEVELS.length} sectors are clear. Welcome home, pilot.</p><div class="results-score">${pad(game.score)}</div><div class="results-label">CAMPAIGN SCORE</div>${resultStats()}${primary('FLY AGAIN', 'restart')}${secondary('CHOOSE A SECTOR', 'menu')}<p class="overlay-note">Every sector is now available from the flight menu.</p>`;
  }
  content.innerHTML = markup;
  requestAnimationFrame(() => {
    if (!overlay.hidden) content.querySelector('.primary-button')?.focus({preventScroll:true});
  });
}

content.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (audioContext?.state === 'suspended' && soundOn) audioContext.resume().catch(() => {});
  if (action === 'start') {
    difficulty = $('difficultySelect').value;
    selectedSector = clamp(Number($('sectorSelect').value) || 0, 0, unlocked);
    game.difficulty = difficulty;
    game.start(selectedSector);
    persist();
  } else if (action === 'resume') game.resume();
  else if (action === 'retry') game.retrySector();
  else if (action === 'next') game.nextSector();
  else if (action === 'restart') game.start(0);
  else if (action === 'exitFullscreen') document.exitFullscreen?.().catch(() => {});
  else if (action === 'menu') { persist(); game.reset(); }
  synchronize();
});
content.addEventListener('change', event => {
  if (event.target.id === 'pauseAutoFire') {
    autoFire = event.target.checked;
    $('autoFire').checked = autoFire;
    persist();
  } else if (event.target.id === 'difficultySelect') {
    difficulty = event.target.value;
    persist();
  } else if (event.target.id === 'sectorSelect') selectedSector = Number(event.target.value) || 0;
});

function clearInputs() {
  keys.clear();
  pointer = null;
  pointerId = null;
  touch.fire = false;
  touch.bomb = false;
  mouse.fire = false;
  mouse.bomb = false;
  mouseSteering = false;
  $('touchFire').classList.remove('held');
  $('touchBomb').classList.remove('held');
}

function togglePause() {
  if (game.state === 'playing') game.pause();
  else if (game.state === 'paused') game.resume();
  synchronize();
}
$('pauseButton').addEventListener('click', togglePause);
$('mobilePause').addEventListener('click', togglePause);
const interactive = element => element?.closest?.('button, a, input, select, textarea, [contenteditable="true"]');
window.addEventListener('keydown', event => {
  if (!overlay.hidden && event.key === 'Tab') {
    const focusable = [...content.querySelectorAll('button,select,input')].filter(el => !el.disabled);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
    return;
  }
  const key = event.key.toLowerCase();
  if (game.state === 'paused' && ['p','escape'].includes(key) && !event.target?.closest?.('select,input,textarea')) {
    event.preventDefault();if(!event.repeat) togglePause();return;
  }
  if (interactive(event.target)) return;
  if (['p','escape'].includes(key)) {event.preventDefault();if (!event.repeat) togglePause();return;}
  if (game.state !== 'playing') return;
  if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','z','x',' '].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => {clearInputs();if(game.state === 'playing'){game.pause();synchronize();}});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {clearInputs();if(game.state === 'playing'){game.pause();synchronize();}}
});

function canvasPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {x:clamp((event.clientX-rect.left)/rect.width*480,12,468),y:clamp((event.clientY-rect.top)/rect.height*720,48,700)};
}
canvas.addEventListener('pointerdown', event => {
  // Mouse buttons use mouse events below: pointerdown/up only report the first/last
  // pressed button, so they cannot reliably detect right-click while dragging left.
  if (game.state !== 'playing' || event.pointerType === 'mouse') return;
  event.preventDefault();
  canvas.focus({preventScroll:true});
  canvas.setPointerCapture(event.pointerId);
  pointerId = event.pointerId;
  pointer = canvasPosition(event);
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId !== pointerId) return;
  event.preventDefault();pointer = canvasPosition(event);
});
const endPointer = event => {if(event.pointerId === pointerId){pointerId=null;pointer=null;}};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('lostpointercapture', endPointer);
canvas.addEventListener('contextmenu', event => event.preventDefault());

canvas.addEventListener('mousedown', event => {
  if(game.state !== 'playing' || ![0,2].includes(event.button)) return;
  event.preventDefault();
  canvas.focus({preventScroll:true});
  if(event.button === 0){
    mouse.fire = true;
    mouseSteering = true;
    pointer = canvasPosition(event);
    game.fireAir();
  }else{
    mouse.bomb = true;
    game.dropBomb(); // A quick right-click still drops a bomb between animation frames.
  }
});
function releaseMouseButtons(event){
  mouse.fire = mouse.fire && !!(event.buttons & 1);
  mouse.bomb = mouse.bomb && !!(event.buttons & 2);
  if(mouseSteering && !mouse.fire){mouseSteering=false;pointer=null;}
}
window.addEventListener('mousemove', event => {
  releaseMouseButtons(event);
  if(game.state === 'playing' && mouseSteering) pointer = canvasPosition(event);
});
window.addEventListener('mouseup', releaseMouseButtons);

for (const [id, type] of [['touchFire','fire'],['touchBomb','bomb']]) {
  const button = $(id);
  button.addEventListener('pointerdown', event => {
    if(game.state !== 'playing') return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touch[type] = true;
    button.classList.add('held');
  });
  const release = () => {touch[type]=false;button.classList.remove('held');};
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', event => event.preventDefault());
}

$('soundButton').addEventListener('click', async () => {
  soundOn = !soundOn;
  if (soundOn) {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio unavailable');
      if (!audioContext) audioContext = new Audio();
      await audioContext.resume();
      tone(660,.13,'sine',.04,880);
    } catch {soundOn = false;}
  }
  $('soundButton').setAttribute('aria-pressed', String(soundOn));
  $('soundButton').title = soundOn ? 'Turn sound off' : 'Turn sound on';
  $('soundLabel').textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';
  if (game.state === 'playing') canvas.focus({preventScroll:true});
});
$('fullscreenButton').addEventListener('click', async () => {
  try {
    if(document.fullscreenElement) await document.exitFullscreen();
    else if($('flightDeck').requestFullscreen) await $('flightDeck').requestFullscreen();
  } catch { /* Some browsers restrict fullscreen; normal play remains available. */ }
  if (game.state === 'playing') canvas.focus({preventScroll:true});
});
if (!document.fullscreenEnabled) $('fullscreenButton').hidden = true;
document.addEventListener('fullscreenchange', () => {
  $('fullscreenButton').title = document.fullscreenElement ? 'Exit fullscreen' : 'Toggle fullscreen';
  if(game.state==='paused') renderOverlay();
});

function updateHud() {
  $('scoreValue').textContent = pad(game.score);
  $('mobileScore').textContent = pad(game.score);
  $('bestValue').textContent = pad(Math.max(bestScore, game.bestScore));
  const ships = Math.max(0, game.lives || 0);
  $('livesValue').textContent = ships > 5 ? `▰ × ${ships}` : (Array(ships).fill('▰').join(' ') || '—');
  $('livesValue').setAttribute('aria-label', `${ships} ships remaining`);
  $('mobileLives').textContent = `▰ × ${ships}`;
  $('mobileLives').setAttribute('aria-label', `${ships} ships remaining`);
  $('weaponValue').textContent = ['MK I','MK II','MK III'][clamp((game.player.weapon || 1)-1,0,2)];
  $('mobileWeapon').textContent = $('weaponValue').textContent;
  $('mobileHud').hidden = !['playing','paused'].includes(game.state);
  const shielded = !!game.player.shield;
  $('shieldIndicator').classList.toggle('active',shielded);
  $('shieldIndicator').lastElementChild.textContent = shielded ? 'SHIELD ONLINE' : 'FLIGHT SYSTEMS READY';
  const progress = clamp(game.time / game.level.duration, 0, 1) * 100;
  $('progressValue').textContent = `${pad(progress,2)}%`;
  $('progressFill').style.width = `${progress}%`;
  const boss = game.boss;
  $('bossStrip').hidden = !boss || game.state !== 'playing';
  if (boss) {
    $('bossName').textContent = 'MOVE UP · ALIGN GOLD RETICLE · BOMB REACTOR';
    $('bossFill').style.width = `${clamp(boss.hp / boss.maxHp,0,1)*100}%`;
  }
}

function updateSector() {
  const level = game.level;
  $('sectorCounter').textContent = `SECTOR ${pad(game.levelIndex+1,2)} / ${pad(LEVELS.length,2)}`;
  $('sectorLabel').textContent = `SECTOR ${pad(game.levelIndex+1,2)}`;
  $('sectorName').textContent = level.name;
  $('sectorTagline').textContent = level.tagline;
  $('sectorList').innerHTML = LEVELS.map((item,index) => `<li class="${index===game.levelIndex?'current':index<game.levelIndex?'complete':index>unlocked?'locked':''}"${index===game.levelIndex?' aria-current="step"':''}><span>${pad(index+1,2)}</span>${escapeHtml(item.name)}${index<game.levelIndex?'<i aria-label="Complete">✓</i>':''}</li>`).join('');
}

function synchronize() {
  if (game.levelIndex !== lastLevel) {lastLevel=game.levelIndex;updateSector();}
  if (game.state !== lastState) {
    lastState=game.state;
    renderOverlay();
    const status = {title:'STANDBY',playing:'FLIGHT ACTIVE',paused:'HOLDING POSITION',sectorClear:'SECTOR SECURED',gameover:'SIGNAL LOST',victory:'CAMPAIGN COMPLETE'}[game.state] || 'STANDBY';
    $('screenStatus').textContent = status;
    document.querySelector('.screen-telemetry').classList.toggle('playing', game.state==='playing');
    updateSector();
    updateHud();
  }
}

let lastTime = 0;
function frame(now) {
  const dt = lastTime ? Math.min(.05,Math.max(0,(now-lastTime)/1000)) : 0;
  lastTime = now;
  if (game.state === 'playing') {
    game.update(dt, {
      dx: Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a')),
      dy: Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w')),
      fire: autoFire || touch.fire || mouse.fire || keys.has('z') || keys.has(' '),
      bomb: touch.bomb || mouse.bomb || keys.has('x'),
      pointer,
    });
    if (toastTimer > 0) {toastTimer-=dt;if(toastTimer<=0)$('sectorToast').classList.remove('visible');}
  }
  renderer.draw(game, now / 1000);
  synchronize();
  hudElapsed += dt;
  if (hudElapsed >= .08) {updateHud();hudElapsed=0;}
  requestAnimationFrame(frame);
}
synchronize();
requestAnimationFrame(frame);
window.addEventListener('pagehide', persist);
