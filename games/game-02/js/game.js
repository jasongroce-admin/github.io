const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const speedEl = document.getElementById('speed');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = canvas.width;
const H = canvas.height;
const ROAD_X = 90;
const ROAD_W = 300;

const keys = new Set();

const game = {
  running: false,
  timeLeft: 60,
  score: 0,
  level: 1,
  lives: 3,
  speed: 8,
  distance: 0,
  spawnClock: 0,
  pedClock: 0,
  branchClock: 0,
  bonusClock: 0,
  particles: [],
  objects: [],
  stripsOffset: 0,
  tornadoPhase: 0,
};

const player = {
  x: W / 2,
  y: H - 120,
  w: 44,
  h: 84,
  color: '#2b7bff',
  boost: 0,
  invuln: 0,
};

function resetGame() {
  game.running = true;
  game.timeLeft = 75;
  game.score = 0;
  game.level = 1;
  game.lives = 3;
  game.speed = 8;
  game.distance = 0;
  game.spawnClock = 0;
  game.pedClock = 0;
  game.branchClock = 0;
  game.bonusClock = 0;
  game.particles = [];
  game.objects = [];
  game.stripsOffset = 0;
  game.tornadoPhase = 0;

  player.x = W / 2;
  player.y = H - 120;
  player.boost = 0;
  player.invuln = 0;

  overlay.classList.add('hidden');
  updateHud();
}

function updateHud() {
  scoreEl.textContent = Math.floor(game.score);
  timeEl.textContent = Math.max(0, game.timeLeft).toFixed(0);
  speedEl.textContent = Math.round(game.speed + player.boost);
  levelEl.textContent = game.level;
  livesEl.textContent = game.lives;
}

function spawn(type) {
  const lane = ROAD_X + 45 + Math.random() * (ROAD_W - 90);
  const x = type === 'ped' ? ROAD_X - 20 + Math.random() * (ROAD_W + 40) : lane;
  const y = -100;
  const obj = { type, x, y, hit: false };

  if (type === 'car') Object.assign(obj, { w: 40, h: 80, vx: (Math.random() - 0.5) * 1.3 });
  if (type === 'pothole') Object.assign(obj, { w: 48, h: 48 });
  if (type === 'branch') Object.assign(obj, { w: 72, h: 28, rot: Math.random() * Math.PI });
  if (type === 'ped') Object.assign(obj, { w: 20, h: 20, vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random()) });
  if (type === 'star') Object.assign(obj, { w: 22, h: 22 });
  if (type === 'time') Object.assign(obj, { w: 24, h: 24 });

  game.objects.push(obj);
}

function addParticles(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    game.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 0.5 + Math.random() * 0.8,
      color,
    });
  }
}

function intersects(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function damage(amount = 1) {
  if (player.invuln > 0) return;
  game.lives -= amount;
  player.invuln = 1.1;
  game.speed = Math.max(6, game.speed - 0.6);
  addParticles(player.x, player.y, 24, '#ff4b4b');
  if (game.lives <= 0) endGame(false);
}

function endGame(win) {
  game.running = false;
  overlay.classList.remove('hidden');
  overlay.querySelector('h2').textContent = win ? 'Scene Secured!' : 'Shift Ended';
  overlay.querySelector('p').textContent = win
    ? `Excellent response. Final score: ${Math.floor(game.score)}.`
    : `You ran out of lives or time. Score: ${Math.floor(game.score)}.`;
  startBtn.textContent = 'Restart Shift';
}

function update(dt) {
  if (!game.running) return;

  const steer = (keys.has('ArrowLeft') || keys.has('a') ? -1 : 0) + (keys.has('ArrowRight') || keys.has('d') ? 1 : 0);
  const throttle = (keys.has('ArrowUp') || keys.has('w') ? 1 : 0) + (keys.has('ArrowDown') || keys.has('s') ? -0.6 : 0);

  if (keys.has(' ') || keys.has('Space')) player.boost = Math.min(5, player.boost + 8 * dt);
  else player.boost = Math.max(0, player.boost - 10 * dt);

  const tornado = game.level >= 4 ? Math.sin(game.tornadoPhase) * 1.1 : 0;
  player.x += (steer * 260 * dt) + tornado;
  game.speed = Math.max(6, Math.min(22, game.speed + throttle * 3.2 * dt));

  player.x = Math.max(ROAD_X + player.w / 2, Math.min(ROAD_X + ROAD_W - player.w / 2, player.x));

  game.timeLeft -= dt;
  game.distance += (game.speed + player.boost) * dt;
  game.score += (game.speed + player.boost * 1.5) * dt * 3;

  const newLevel = Math.min(6, 1 + Math.floor(game.distance / 110));
  if (newLevel > game.level) {
    game.level = newLevel;
    game.speed += 0.7;
    addParticles(player.x, player.y - 50, 36, '#8dff7a');
  }

  game.spawnClock += dt;
  game.pedClock += dt;
  game.branchClock += dt;
  game.bonusClock += dt;
  game.tornadoPhase += dt * (1.5 + game.level * 0.3);

  const trafficRate = Math.max(0.25, 0.9 - game.level * 0.1);
  if (game.spawnClock > trafficRate) {
    game.spawnClock = 0;
    spawn(Math.random() > 0.25 ? 'car' : 'pothole');
  }
  if (game.pedClock > Math.max(1.3, 2.2 - game.level * 0.18)) {
    game.pedClock = 0;
    spawn('ped');
  }
  if (game.branchClock > Math.max(1.8, 3.4 - game.level * 0.2)) {
    game.branchClock = 0;
    spawn('branch');
  }
  if (game.bonusClock > 2.8) {
    game.bonusClock = 0;
    spawn(Math.random() > 0.35 ? 'star' : 'time');
  }

  const flow = (game.speed + player.boost) * 10;
  for (const o of game.objects) {
    o.y += flow * dt;
    if (o.type === 'car') o.x += o.vx;
    if (o.type === 'ped') {
      o.x += o.vx * 2;
      if (o.x < ROAD_X + 8 || o.x > ROAD_X + ROAD_W - 8) o.vx *= -1;
    }

    if (!o.hit && intersects(player, o)) {
      o.hit = true;
      if (o.type === 'star') {
        game.score += 180;
        addParticles(o.x, o.y, 16, '#fff08a');
      } else if (o.type === 'time') {
        game.timeLeft += 8;
        addParticles(o.x, o.y, 16, '#9bf3ff');
      } else {
        damage(o.type === 'car' ? 1 : 0.5);
      }
    }
  }

  game.objects = game.objects.filter(o => o.y < H + 120 && !(o.hit && (o.type === 'star' || o.type === 'time')));

  player.invuln = Math.max(0, player.invuln - dt);

  for (const p of game.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
  }
  game.particles = game.particles.filter(p => p.life > 0);

  if (game.timeLeft <= 0) endGame(true);
  updateHud();
}

function drawRoad() {
  ctx.fillStyle = '#505866';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#87939e';
  ctx.fillRect(0, 0, ROAD_X, H);
  ctx.fillRect(ROAD_X + ROAD_W, 0, W - (ROAD_X + ROAD_W), H);

  ctx.fillStyle = '#252a33';
  ctx.fillRect(ROAD_X, 0, ROAD_W, H);

  ctx.strokeStyle = '#f4d620';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(ROAD_X + 3, 0); ctx.lineTo(ROAD_X + 3, H);
  ctx.moveTo(ROAD_X + ROAD_W - 3, 0); ctx.lineTo(ROAD_X + ROAD_W - 3, H);
  ctx.stroke();

  game.stripsOffset = (game.stripsOffset + (game.speed + player.boost) * 14 * 0.016) % 80;
  ctx.strokeStyle = '#d6d6d6';
  ctx.lineWidth = 4;
  for (let i = -1; i < 12; i++) {
    const y = i * 80 + game.stripsOffset;
    ctx.beginPath();
    ctx.moveTo(W / 2, y);
    ctx.lineTo(W / 2, y + 42);
    ctx.stroke();
  }

  if (game.level >= 4) {
    ctx.fillStyle = 'rgba(150, 170, 190, 0.10)';
    for (let i = 0; i < 26; i++) {
      const x = (i * 37 + game.tornadoPhase * 80) % W;
      const y = (i * 61 + game.tornadoPhase * 140) % H;
      ctx.fillRect(x, y, 12, 3);
    }
    const twX = ROAD_X + ROAD_W / 2 + Math.sin(game.tornadoPhase * 0.7) * 120;
    const twY = 120 + Math.cos(game.tornadoPhase) * 20;
    const grad = ctx.createRadialGradient(twX, twY, 10, twX, twY, 56);
    grad.addColorStop(0, 'rgba(190,190,190,.55)');
    grad.addColorStop(1, 'rgba(90,90,90,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(twX, twY, 28, 56, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawObject(o) {
  ctx.save();
  ctx.translate(o.x, o.y);

  if (o.type === 'car') {
    ctx.fillStyle = '#c5a347';
    ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.fillStyle = '#222';
    ctx.fillRect(-o.w / 2 + 5, -o.h / 2 + 8, o.w - 10, 18);
    ctx.fillStyle = '#de6c6c';
    ctx.fillRect(-o.w / 2 + 5, o.h / 2 - 8, o.w - 10, 6);
  } else if (o.type === 'pothole') {
    ctx.fillStyle = '#171717';
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.type === 'branch') {
    ctx.rotate(o.rot);
    ctx.fillStyle = '#6a3e18';
    ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.strokeStyle = '#345f2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(-25, -10);
    ctx.moveTo(8, 2); ctx.lineTo(20, -11);
    ctx.stroke();
  } else if (o.type === 'ped') {
    ctx.fillStyle = '#ffde7a';
    ctx.beginPath();
    ctx.arc(0, -8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2cbf71';
    ctx.fillRect(-6, -2, 12, 14);
  } else if (o.type === 'star' || o.type === 'time') {
    ctx.fillStyle = o.type === 'star' ? '#fff08a' : '#9bf3ff';
    ctx.beginPath();
    const r = 12;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      ctx.lineTo(x, y);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
    }
    ctx.closePath();
    ctx.fill();
    if (o.type === 'time') {
      ctx.fillStyle = '#0b4562';
      ctx.fillRect(-2, -7, 4, 10);
      ctx.fillRect(-2, 3, 8, 4);
    }
  }

  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.invuln > 0) {
    ctx.globalAlpha = 0.35 + Math.sin(performance.now() / 70) * 0.25;
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
  ctx.fillStyle = '#041435';
  ctx.fillRect(-player.w / 2 + 6, -player.h / 2 + 10, player.w - 12, 22);
  ctx.fillStyle = '#fefefe';
  ctx.fillRect(-player.w / 2 + 5, -player.h / 2 + 4, 10, 6);
  ctx.fillRect(player.w / 2 - 15, -player.h / 2 + 4, 10, 6);
  ctx.fillStyle = '#ef3535';
  ctx.fillRect(-player.w / 2 + 5, player.h / 2 - 9, 10, 6);
  ctx.fillRect(player.w / 2 - 15, player.h / 2 - 9, 10, 6);

  if (player.boost > 0.3) {
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(-10, player.h / 2);
    ctx.lineTo(0, player.h / 2 + 18 + Math.random() * 8);
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
    ctx.fillRect(p.x, p.y, 4, 4);
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
