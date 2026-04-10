const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const speedEl = document.getElementById('speed');
const livesEl = document.getElementById('lives');
const modeLabelEl = document.getElementById('modeLabel');
const targetAddressEl = document.getElementById('targetAddress');
const callIdEl = document.getElementById('callId');

const overlay = document.getElementById('overlay');
const overlayStory = document.getElementById('overlayStory');
const startBtn = document.getElementById('startBtn');
const missionBtn = document.getElementById('missionBtn');
const freeRoamBtn = document.getElementById('freeRoamBtn');
const tipsBtn = document.getElementById('tipsBtn');
const tipsPanel = document.getElementById('tipsPanel');
const hintToast = document.getElementById('hintToast');

const W = canvas.width;
const H = canvas.height;
const ROAD_X = 74;
const ROAD_W = 332;
const CURVE_WOBBLE = 46;

const keys = new Set();

const streets = [
  'Pine St', 'Maple Ave', 'Cedar Dr', 'River Rd', 'Oak St',
  'Ash Lane', 'Harbor Ave', 'Elm St', 'Lakeview Rd', 'South Hill Dr',
];

const hazardPool = ['car', 'pothole', 'branch', 'ped', 'cone', 'bin', 'cart', 'oil', 'manhole', 'softspot'];

const game = {
  running: false,
  mode: 'mission',
  timeLeft: 70,
  score: 0,
  hull: 100,
  speed: 8,
  distance: 0,
  level: 1,
  callIndex: 0,
  callETA: 70,
  dispatchId: 'KPD-000',
  targetAddress: '---- ---',
  spawnClock: 0,
  bonusClock: 0,
  tornado: 0,
  stripsOffset: 0,
  objects: [],
  particles: [],
  idleClock: 0,
  roadOffset: 0,
  curveTarget: 0,
  curveTimer: 0,
};

const player = {
  x: W / 2,
  y: H - 120,
  w: 46,
  h: 84,
  boost: 0,
  invuln: 0,
};

function randomAddress() {
  const num = 1000 + Math.floor(Math.random() * 9000);
  const street = streets[Math.floor(Math.random() * streets.length)];
  return `${num} ${street}`;
}

function roadCenterAt(y) {
  return W / 2 + game.roadOffset;
}

function laneBounds(y) {
  const c = roadCenterAt(y);
  return { min: c - ROAD_W / 2 + 6, max: c + ROAD_W / 2 - 6, center: c };
}

function setMode(mode) {
  game.mode = mode;
  missionBtn.classList.toggle('active', mode === 'mission');
  freeRoamBtn.classList.toggle('active', mode === 'freeRoam');
  overlayStory.textContent = mode === 'mission'
    ? 'Dispatch is assigning timed house calls. Reach each target before ETA hits zero.'
    : 'Free Roam practice: no timer pressure. Learn KPD curves, hazard timing, and quick boost control.';
}

function nextDispatch() {
  game.callIndex += 1;
  game.dispatchId = `KPD-${String(100 + game.callIndex).padStart(3, '0')}`;
  game.targetAddress = randomAddress();
  game.callETA = Math.max(36, 74 - game.level * 5);
  if (game.mode === 'mission') game.timeLeft = game.callETA;
}

function resetGame() {
  game.running = true;
  game.score = 0;
  game.hull = 100;
  game.speed = 8;
  game.distance = 0;
  game.level = 1;
  game.callIndex = 0;
  game.spawnClock = 0;
  game.bonusClock = 0;
  game.tornado = 0;
  game.stripsOffset = 0;
  game.objects = [];
  game.particles = [];
  game.idleClock = 0;
  game.roadOffset = 0;
  game.curveTarget = 0;
  game.curveTimer = 0;

  player.x = W / 2;
  player.y = H - 120;
  player.boost = 0;
  player.invuln = 0;

  nextDispatch();
  overlay.classList.add('hidden');
  hideHint();
  updateHud();
}

function updateHud() {
  scoreEl.textContent = Math.floor(game.score);
  timeEl.textContent = game.mode === 'mission' ? Math.max(0, game.timeLeft).toFixed(0) : '∞';
  speedEl.textContent = Math.round(game.speed + player.boost);
  livesEl.textContent = Math.max(0, Math.floor(game.hull));
  modeLabelEl.textContent = game.mode === 'mission' ? 'Mission' : 'Free Roam';
  targetAddressEl.textContent = game.targetAddress;
  callIdEl.textContent = game.dispatchId;
}

function spawn(type) {
  const b = laneBounds(-90);
  const laneX = b.min + 34 + Math.random() * (ROAD_W - 68);
  const obj = { type, x: laneX, y: -90, hit: false };

  if (type === 'car') Object.assign(obj, { w: 40, h: 78, vx: (Math.random() - 0.5) * 1.2 });
  if (type === 'pothole') Object.assign(obj, { w: 56, h: 44, rot: Math.random() * Math.PI });
  if (type === 'branch') Object.assign(obj, { w: 84, h: 18, rot: Math.random() * Math.PI });
  if (type === 'ped') Object.assign(obj, { w: 16, h: 20, vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random()) });
  if (type === 'cone') Object.assign(obj, { w: 20, h: 22 });
  if (type === 'bin') Object.assign(obj, { w: 24, h: 28 });
  if (type === 'cart') Object.assign(obj, { w: 34, h: 24, vx: (Math.random() - 0.5) * 1.8 });
  if (type === 'oil') Object.assign(obj, { w: 54, h: 28 });
  if (type === 'manhole') Object.assign(obj, { w: 40, h: 40 });
  if (type === 'softspot') Object.assign(obj, { w: 62, h: 38, wobble: Math.random() * Math.PI });
  if (type === 'clock') Object.assign(obj, { w: 24, h: 24 });
  if (type === 'shield') Object.assign(obj, { w: 24, h: 24 });

  if (type === 'ped') obj.x = b.min - 8 + Math.random() * (ROAD_W + 16);
  game.objects.push(obj);
}

function addParticles(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    game.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 0.5 + Math.random() * 0.6,
      color,
    });
  }
}

function intersects(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function applyDamage(type) {
  if (player.invuln > 0) return;
  const amountByType = {
    car: 25,
    ped: 20,
    pothole: 14,
    branch: 11,
    cone: 6,
    bin: 10,
    cart: 13,
    oil: 8,
    manhole: 18,
    softspot: 16,
  };

  game.hull -= amountByType[type] || 12;
  player.invuln = 0.75;
  addParticles(player.x, player.y, 18, '#ff5e5e');

  if (type === 'oil') {
    player.x += (Math.random() > 0.5 ? 1 : -1) * 28;
  }
  if (game.hull <= 0) {
    endGame(false, 'Unit disabled. Too much collision damage.');
  }
}

function showHint(message) {
  hintToast.textContent = message;
  hintToast.classList.remove('hidden');
}

function hideHint() {
  hintToast.classList.add('hidden');
}

function completeCall() {
  game.score += 400 + Math.floor(game.timeLeft * 8);
  addParticles(player.x, player.y - 40, 34, '#8df7a9');
  game.level = Math.min(6, game.level + 1);
  nextDispatch();
  showHint(`KPD Dispatch: Call complete. New target: ${game.targetAddress}`);
  setTimeout(hideHint, 2200);
}

function endGame(success, reason) {
  game.running = false;
  overlay.classList.remove('hidden');
  startBtn.textContent = 'Start New Shift';
  overlay.querySelector('h2').textContent = success ? 'Shift Complete' : 'Shift Ended';
  overlay.querySelector('p').textContent = `${reason} Final score: ${Math.floor(game.score)}.`;
}

function update(dt) {
  if (!game.running) return;

  const steering = (keys.has('ArrowLeft') || keys.has('a') ? -1 : 0) + (keys.has('ArrowRight') || keys.has('d') ? 1 : 0);
  const throttle = (keys.has('ArrowUp') || keys.has('w') ? 1 : 0) + (keys.has('ArrowDown') || keys.has('s') ? -0.75 : 0);
  const accelerating = throttle > 0 || steering !== 0;

  game.idleClock = accelerating ? 0 : game.idleClock + dt;
  if (game.idleClock > 5) {
    showHint('Tip: Hold SIREN for bursts, and steer around discolored bubbling soft spots.');
  }

  if (keys.has(' ') || keys.has('Space')) player.boost = Math.min(8.8, player.boost + 24 * dt);
  else player.boost = Math.max(0, player.boost - 36 * dt);

  game.tornado += dt * (1.2 + game.level * 0.28);
  const wind = game.level >= 5 ? Math.sin(game.tornado) * 1.3 : 0;

  game.curveTimer -= dt;
  if (game.curveTimer <= 0) {
    const chooseCorner = Math.random() < 0.24 + game.level * 0.03;
    game.curveTarget = chooseCorner ? (Math.random() > 0.5 ? 1 : -1) * (16 + Math.random() * CURVE_WOBBLE) : 0;
    game.curveTimer = chooseCorner ? 1.4 + Math.random() * 1.2 : 2.6 + Math.random() * 2.2;
  }
  game.roadOffset += (game.curveTarget - game.roadOffset) * Math.min(1, dt * 1.9);

  game.speed = Math.max(2.6, Math.min(24, game.speed + throttle * 8.6 * dt));
  const accelFeel = 170 + game.speed * 4.5;
  player.y += (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) * accelFeel * dt;
  player.y -= (keys.has('ArrowUp') || keys.has('w') ? 1 : 0) * accelFeel * dt;
  player.y = Math.max(H * 0.36, Math.min(H - 96, player.y));

  const bounds = laneBounds(player.y);
  player.x += steering * 290 * dt + wind;
  player.x = Math.max(bounds.min + player.w / 2, Math.min(bounds.max - player.w / 2, player.x));

  game.distance += (game.speed + player.boost) * dt;
  game.score += (game.speed + player.boost) * dt * 2.7;

  if (game.mode === 'mission') {
    game.timeLeft -= dt;
    if (game.timeLeft <= 0) endGame(false, 'Dispatch timeout.');
    if (game.distance > game.level * 150) completeCall();
  }

  game.spawnClock += dt;
  game.bonusClock += dt;

  const spawnRate = Math.max(0.56, 1.3 - game.level * 0.09);
  if (game.spawnClock > spawnRate) {
    game.spawnClock = 0;
    const type = hazardPool[Math.floor(Math.random() * hazardPool.length)];
    spawn(type);
  }

  if (game.bonusClock > 6.6) {
    game.bonusClock = 0;
    spawn(Math.random() > 0.4 ? 'clock' : 'shield');
  }

  const flow = (game.speed + player.boost) * 8.9;

  for (const o of game.objects) {
    o.y += flow * dt;
    if (o.type === 'car' || o.type === 'cart') o.x += o.vx;
    if (o.type === 'ped') {
      o.x += o.vx * 2;
      const pb = laneBounds(o.y);
      if (o.x < pb.min + 8 || o.x > pb.max - 8) o.vx *= -1;
    }
    if (o.type === 'softspot') o.wobble += dt * 8;

    if (!o.hit && intersects(player, o)) {
      o.hit = true;
      if (o.type === 'clock') {
        if (game.mode === 'mission') game.timeLeft += 10;
        game.score += 120;
        addParticles(o.x, o.y, 10, '#9eefff');
      } else if (o.type === 'shield') {
        game.hull = Math.min(100, game.hull + 16);
        addParticles(o.x, o.y, 10, '#99ffaa');
      } else {
        applyDamage(o.type);
      }
    }
  }

  game.objects = game.objects.filter((o) => o.y < H + 120 && !(o.hit && (o.type === 'clock' || o.type === 'shield')));
  player.invuln = Math.max(0, player.invuln - dt);

  for (const p of game.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);

  updateHud();
}

function drawRoad() {
  ctx.fillStyle = '#8795a2';
  ctx.fillRect(0, 0, W, H);

  const topCenter = roadCenterAt(0);
  const bottomCenter = roadCenterAt(H);
  const topLeft = topCenter - ROAD_W / 2;
  const topRight = topCenter + ROAD_W / 2;
  const bottomLeft = bottomCenter - ROAD_W / 2;
  const bottomRight = bottomCenter + ROAD_W / 2;

  ctx.fillStyle = '#2a3037';
  ctx.beginPath();
  ctx.moveTo(topLeft, 0);
  ctx.lineTo(topRight, 0);
  ctx.lineTo(bottomRight, H);
  ctx.lineTo(bottomLeft, H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#f2d04f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(topLeft + 3, 0);
  ctx.lineTo(bottomLeft + 3, H);
  ctx.moveTo(topRight - 3, 0);
  ctx.lineTo(bottomRight - 3, H);
  ctx.stroke();

  game.stripsOffset = (game.stripsOffset + (game.speed + player.boost) * 0.19) % 74;
  ctx.strokeStyle = '#d8e1e7';
  ctx.lineWidth = 4;
  for (let i = -1; i < 14; i++) {
    const y = i * 74 + game.stripsOffset;
    const t = Math.max(0, Math.min(1, y / H));
    const c = topCenter + (bottomCenter - topCenter) * t;
    ctx.beginPath();
    ctx.moveTo(c, y);
    ctx.lineTo(c, y + 38);
    ctx.stroke();
  }

  if (game.level >= 5) {
    ctx.fillStyle = 'rgba(167, 180, 194, 0.12)';
    for (let i = 0; i < 20; i++) {
      const x = (i * 43 + game.tornado * 65) % W;
      const y = (i * 61 + game.tornado * 120) % H;
      ctx.fillRect(x, y, 9, 2);
    }
  }
}

function drawObject(o) {
  ctx.save();
  ctx.translate(o.x, o.y);

  if (o.type === 'car') {
    ctx.fillStyle = '#cb9f50';
    ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.fillStyle = '#1f2531';
    ctx.fillRect(-o.w / 2 + 5, -o.h / 2 + 8, o.w - 10, 20);
  } else if (o.type === 'pothole') {
    ctx.rotate(o.rot);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (o.type === 'branch') {
    ctx.rotate(o.rot);
    ctx.fillStyle = '#6b3f17';
    ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.strokeStyle = '#2f7433';
    ctx.beginPath();
    ctx.moveTo(-22, 0); ctx.lineTo(-32, -8);
    ctx.moveTo(8, 0); ctx.lineTo(22, -8);
    ctx.stroke();
  } else if (o.type === 'ped') {
    ctx.fillStyle = '#ffd97f';
    ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#24a15f';
    ctx.fillRect(-5, -2, 10, 13);
  } else if (o.type === 'cone') {
    ctx.fillStyle = '#ff932e';
    ctx.beginPath();
    ctx.moveTo(0, -o.h / 2); ctx.lineTo(-o.w / 2, o.h / 2); ctx.lineTo(o.w / 2, o.h / 2);
    ctx.closePath();
    ctx.fill();
  } else if (o.type === 'bin') {
    ctx.fillStyle = '#3f5f73';
    ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.fillStyle = '#263b48';
    ctx.fillRect(-o.w / 2 - 1, -o.h / 2 - 4, o.w + 2, 5);
  } else if (o.type === 'cart') {
    ctx.strokeStyle = '#9db2c4';
    ctx.lineWidth = 2;
    ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.beginPath();
    ctx.arc(-8, 11, 3, 0, Math.PI * 2);
    ctx.arc(8, 11, 3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (o.type === 'oil') {
    ctx.fillStyle = '#090909';
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(136, 102, 176, .22)';
    ctx.beginPath();
    ctx.ellipse(-8, -2, o.w / 3, o.h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.type === 'manhole') {
    ctx.fillStyle = '#505761';
    ctx.beginPath();
    ctx.arc(0, 0, o.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a2f35';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (o.type === 'softspot') {
    ctx.fillStyle = '#4b412f';
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    const bubble = Math.sin(o.wobble) * 3;
    ctx.fillStyle = 'rgba(138, 88, 38, .8)';
    ctx.beginPath();
    ctx.arc(-10, -3, 3 + bubble * 0.2, 0, Math.PI * 2);
    ctx.arc(4, 4, 2 + bubble * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.type === 'clock' || o.type === 'shield') {
    ctx.fillStyle = o.type === 'clock' ? '#9eefff' : '#99ffaa';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f2748';
    if (o.type === 'clock') {
      ctx.fillRect(-1, -7, 2, 8);
      ctx.fillRect(-1, 0, 6, 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(8, -3); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.lineTo(-8, -3);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.invuln > 0) ctx.globalAlpha = 0.44 + Math.sin(performance.now() / 60) * 0.22;

  ctx.fillStyle = '#2f7cfe';
  ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
  ctx.fillStyle = '#0d1935';
  ctx.fillRect(-player.w / 2 + 6, -player.h / 2 + 10, player.w - 12, 20);
  ctx.fillStyle = '#fcfcfc';
  ctx.fillRect(-player.w / 2 + 5, -player.h / 2 + 4, 10, 6);
  ctx.fillRect(player.w / 2 - 15, -player.h / 2 + 4, 10, 6);
  ctx.fillStyle = '#f34a4a';
  ctx.fillRect(-player.w / 2 + 5, player.h / 2 - 9, 10, 6);
  ctx.fillRect(player.w / 2 - 15, player.h / 2 - 9, 10, 6);

  if (player.boost > 0.25) {
    ctx.fillStyle = '#ffbc61';
    ctx.beginPath();
    ctx.moveTo(-10, player.h / 2);
    ctx.lineTo(0, player.h / 2 + 16 + Math.random() * 8);
    ctx.lineTo(10, player.h / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  drawRoad();
  for (const o of game.objects) drawObject(o);
  drawPlayer();
  drawParticles();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
startBtn.addEventListener('click', resetGame);
missionBtn.addEventListener('click', () => setMode('mission'));
freeRoamBtn.addEventListener('click', () => setMode('freeRoam'));
tipsBtn.addEventListener('click', () => tipsPanel.classList.toggle('open'));

window.addEventListener('keydown', (e) => {
  const key = e.key === ' ' ? 'Space' : e.key;
  keys.add(key);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key === ' ' ? 'Space' : e.key));

for (const btn of document.querySelectorAll('.controls button')) {
  const key = btn.dataset.key;
  const down = () => keys.add(key === 'Space' ? 'Space' : key);
  const up = () => keys.delete(key === 'Space' ? 'Space' : key);
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); down(); }, { passive: false });
  btn.addEventListener('touchend', up);
  btn.addEventListener('mousedown', down);
  btn.addEventListener('mouseup', up);
  btn.addEventListener('mouseleave', up);
}

setMode('mission');
updateHud();
