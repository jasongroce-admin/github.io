(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const healthFill = document.getElementById('healthFill');
  const scoreText = document.getElementById('scoreText');
  const objectiveText = document.getElementById('objectiveText');
  const startScreen = document.getElementById('startScreen');
  const endScreen = document.getElementById('endScreen');
  const endKicker = document.getElementById('endKicker');
  const endTitle = document.getElementById('endTitle');
  const endText = document.getElementById('endText');
  const startBtn = document.getElementById('startBtn');

  const assets = window.MONSTERS_UNLIMITED_ASSETS;
  const levels = window.MONSTERS_UNLIMITED_LEVELS;
  const keys = new Set();
  const input = { x: 0, y: 0, jump: false, punch: false, eat: false, special: false };
  const stickInput = { x: 0, y: 0 };
  const imageCache = new Map();
  const loadedImages = new Map();
  const particles = [];
  const floaters = [];
  let level;
  let player;
  let cameraX = 0;
  let cameraY = 0;
  let running = false;
  let paused = false;
  let lastTime = 0;
  let punchCooldown = 0;
  let eatCooldown = 0;
  let preloadPromise = null;
  let animTime = 0;
  let campaignIndex = 0;
  let selectedMonsterId = levels[0].player.monsterId;
  let cleared = false;
  let rafId = 0;
  let hitStop = 0;
  let shake = 0;
  let heliTimer = 6;
  let audioContext;
  let soundEnabled = true;
  let pointerAim = null;
  const held = { punch: false, eat: false };
  const projectiles = [];
  const helicopters = [];
  const pickups = [];
  const helicopterAsset = { src: 'MUimages/generated/attack-helicopter.png' };
  const qaMode = new URLSearchParams(window.location.search).has('qa');

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function byId(list, id) {
    return list.find((item) => item.id === id) || list[0];
  }

  function number(value, fallback) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }



  function loadImage(src) {
    if (imageCache.has(src)) return imageCache.get(src);
    const img = new Image();
    const promise = new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const timer = window.setTimeout(() => finish(img.complete && img.naturalWidth > 0 ? img : null), 15000);
      img.onload = () => {
        window.clearTimeout(timer);
        try {
          const decoded = maskPink(img);
          loadedImages.set(src, decoded);
          finish(decoded);
        } catch {
          loadedImages.set(src, img);
          finish(img);
        }
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        finish(null);
      };
    });
    img.src = src;
    imageCache.set(src, promise);
    return promise;
  }

  function maskPink(img) {
    const off = document.createElement('canvas');
    off.width = img.naturalWidth || img.width;
    off.height = img.naturalHeight || img.height;
    if (!off.width || !off.height) return img;
    const offCtx = off.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(img, 0, 0);
    const data = offCtx.getImageData(0, 0, off.width, off.height);
    for (let i = 0; i < data.data.length; i += 4) {
      const r = data.data[i];
      const g = data.data[i + 1];
      const b = data.data[i + 2];
      if (isPinkPixel(r, g, b)) {
        data.data[i] = 0;
        data.data[i + 1] = 0;
        data.data[i + 2] = 0;
        data.data[i + 3] = 0;
      }
    }
    scrubPinkHalo(data);
    offCtx.putImageData(data, 0, 0);
    return off;
  }

  function isPinkPixel(r, g, b) {
    return r > 105 && g < 130 && b > 75 && r > g + 28 && b > g + 14 && Math.abs(r - b) < 150;
  }

  function scrubPinkHalo(imageData) {
    const { data, width, height } = imageData;
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        if (!alpha[p]) continue;
        const touchesTransparent = !alpha[p - 1] || !alpha[p + 1] || !alpha[p - width] || !alpha[p + width];
        if (!touchesTransparent) continue;
        const i = p * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 80 && g < 160 && b > 55 && r > g + 8 && b > g - 3) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        }
      }
    }
  }

  async function preload() {
    const srcs = new Set([helicopterAsset.src]);
    const used = Object.fromEntries(['buildings', 'humans', 'vehicles'].map(category => [category, new Set(levels.flatMap(city => city[category].map(item => item.assetId)))]));
    Object.entries(assets).flatMap(([category, items]) => items.filter(item => category === 'monsters' ? item.playable !== false : used[category]?.has(item.id))).forEach((item) => {
      srcs.add(item.src);
      if (item.humanSrc) srcs.add(item.humanSrc);
      if (item.climbSrc) srcs.add(item.climbSrc);
      if (item.attackSrc) srcs.add(item.attackSrc);
      (item.damageSrcs || []).forEach((src) => srcs.add(src));
      Object.values(item.rig?.parts || {}).forEach((src) => srcs.add(src));
    });
    // Bound parallel loading so queued artwork cannot expire before its request starts.
    const queue = [...srcs];
    let cursor = 0;
    await Promise.all(Array.from({length: 4}, async () => {
      while (cursor < queue.length) {
        const src = queue[cursor++];
        const img = await loadImage(src);
        if (img) loadedImages.set(src, img);
      }
    }));
  }

  function reset(newRun = true) {
    if (newRun) player = null;
    loadLevel(0);
  }

  function loadLevel(index) {
    const previous = player;
    campaignIndex = index;
    level = clone(levels[index % levels.length]);
    level.buildings.forEach((building) => {
      building.cells = Array.from({ length: building.rows }, () => Array(building.cols).fill(building.hp));
      building.maxCells = building.rows * building.cols;
      building.collapse = null;
      building.collapsed = false;
      building.rubble = [];
    });
    level.humans.forEach(human => {
      if (human.kind !== 'window') return;
      const center = { x: human.x + (human.w || 22) / 2, y: human.y + (human.h || 30) / 2 };
      const host = level.buildings.find(b => center.x >= b.x && center.x < b.x + b.w && center.y >= b.y && center.y < b.y + b.h);
      if (!host) return;
      human.buildingId = host.id;
      human.cellCol = Math.floor((center.x - host.x) / (host.w / host.cols));
      human.cellRow = Math.floor((center.y - host.y) / (host.h / host.rows));
    });
    const spec = level.player;
    spec.monsterId = selectedMonsterId;
    player = {
      x: spec.x, y: level.world.groundY - spec.monster.h, vx: 0, vy: 0,
      facing: 1, punchDir: 1, attackTimer: 0, attackAim: { x: 1, y: 0 },
      aimX: spec.x + 140, aimY: level.world.groundY - spec.monster.h * .66,
      climbSide: null, climbBuildingId: '', state: 'monster', morph: 0,
      health: previous ? Math.min(spec.health, previous.health + 15) : spec.health,
      maxHealth: spec.health, lives: previous?.lives ?? spec.lives ?? 3,
      climbing: false, onGround: true, onRoof: '', invulnerable: 1.5,
      score: previous?.score ?? spec.score ?? 0,
      jumpBuffer: 0, coyote: .1, grabCooldown: 0, wallKick: 0, respawning: 0
    };
    level.soldiers = [];
    level.buildings.forEach((building, i) => {
      const side = i % 2 ? 1 : -1;
      level.soldiers.push({ buildingId: building.id, side, x: side < 0 ? building.x - 12 : building.x + building.w - 4,
        y: building.y + building.h * .45, w: 16, h: 28, health: 1, fire: 3 + i });
    });
    particles.length = floaters.length = projectiles.length = helicopters.length = pickups.length = 0;
    cameraX = clamp(player.x - canvas.width * .42, 0, Math.max(0, level.world.width - canvas.width));
    cameraY = 0;
    punchCooldown = eatCooldown = animTime = hitStop = shake = 0;
    heliTimer = 6;
    cleared = paused = false;
    clearInput();
    updateHud();
  }

  async function start() {
    if (startBtn.disabled) return;
    startBtn.disabled = true;
    startBtn.textContent = 'Loading city…';
    await preloadPromise;
    selectedMonsterId = document.getElementById('monsterSelect')?.value || levels[0].player.monsterId;
    player = null;
    loadLevel(Number(document.getElementById('levelSelect')?.value || 0));
    startBtn.disabled = false;
    startBtn.textContent = 'Start';
    resumeRun();
  }

  function resumeRun() {
    cancelAnimationFrame(rafId);
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    running = true;
    paused = false;
    document.getElementById('pauseBtn').textContent = 'Pause';
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function completeLevel() {
    running = false;
    cleared = true;
    player.score += 1000;
    updateHud();
    tone(660, .18, 'triangle');
    endKicker.textContent = 'City Cleared';
    endTitle.textContent = `${level.city} is rubble!`;
    endText.textContent = `Score ${player.score} · +1,000 city bonus. Next: ${levels[(campaignIndex + 1) % levels.length].city}.`;
    document.getElementById('restartBtn').textContent = 'Next City';
    endScreen.classList.remove('hidden');
    clearInput();
  }

  function gameOver() {
    running = false;
    cleared = false;
    const feet = player.y + currentSize().h;
    player.state = 'human';
    player.y = feet - humanSpec().h;
    endKicker.textContent = 'Transformed Back';
    endTitle.textContent = 'Game Over';
    endText.textContent = `Score ${player.score}. Day ${campaignIndex + 1} · ${level.city}.`;
    document.getElementById('restartBtn').textContent = 'Play Again';
    endScreen.classList.remove('hidden');
    clearInput();
  }

  function damagePlayer(amount) {
    if (!running || player.state !== 'monster' || player.invulnerable > 0 || player.respawning > 0) return false;
    player.health = Math.max(0, player.health - amount);
    player.invulnerable = .75;
    shake = Math.max(shake, 6);
    burst(player.x + monsterSpec().w * .5, player.y + monsterSpec().h * .5, '#e45b47', 10);
    tone(90, .12, 'sawtooth');
    if (player.health <= 0) {
      player.lives--;
      if (player.lives <= 0) gameOver();
      else {
        player.state = 'human';
        player.y = level.world.groundY - humanSpec().h;
        player.respawning = 1.2;
        player.climbing = false; player.onRoof = ''; player.climbBuildingId = '';
        player.vx = player.vy = 0;
        addFloater(player.x, player.y - 30, 'MONSTER DOWN', '#f2c14e');
        clearInput();
      }
    }
    return true;
  }

  function respawnPlayer() {
    player.state = 'monster';
    player.x = level.player.x;
    player.y = level.world.groundY - monsterSpec().h;
    player.health = player.maxHealth;
    player.invulnerable = 2;
    player.onGround = true; player.coyote = .1; player.jumpBuffer = 0;
    player.grabCooldown = .3; player.wallKick = 0; player.climbSide = null;
    addFloater(player.x + 50, player.y - 20, 'BACK FOR MORE!', '#74e48c');
  }

  function updateHud() {
    healthFill.style.transform = `scaleX(${Math.max(0, player.health / player.maxHealth)})`;
    scoreText.textContent = String(player.score);
    const remaining = level.buildings.filter((b) => !b.collapsed).length;
    objectiveText.textContent = `${remaining} buildings left`;
    document.getElementById('livesText').textContent = `${player.lives} lives`;
    document.getElementById('dayText').textContent = `Day ${campaignIndex + 1} · ${level.city}`;
    if (qaMode) canvas.dataset.state = JSON.stringify({ x: player.x, y: player.y, vx: player.vx, vy: player.vy,
      onGround: player.onGround, climbing: player.climbing, onRoof: player.onRoof, health: player.health,
      climbSide: player.climbSide, climbBuildingId: player.climbBuildingId,
      lives: player.lives, score: player.score, cameraX, day: campaignIndex + 1, paused, running,
      buildings: level.buildings.map(b => ({id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, rows: b.rows, cols: b.cols,
        cells: countCells(b), grid: b.cells, collapsed: b.collapsed, collapsing: !!b.collapse})),
      humans: level.humans.map(h => ({id: h.id, kind: h.kind, assetId: h.assetId, x: h.x, y: h.y, eaten: !!h.eaten,
        buildingId: h.buildingId, cellRow: h.cellRow, cellCol: h.cellCol})),
      projectiles: projectiles.length, helicopters: helicopters.length });
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(.033, Math.max(0, (now - lastTime) / 1000 || .016));
    lastTime = now;
    if (!paused) {
      shake = Math.max(0, shake - dt * 30);
      if (hitStop > 0) hitStop -= dt;
      else update(dt);
    }
    draw();
    if (paused) drawPaused();
    if (running) rafId = requestAnimationFrame(loop);
  }

  function update(dt) {
    animTime += dt;
    readKeyboard();
    if (player.respawning > 0) {
      player.respawning = Math.max(0, player.respawning - dt);
      if (!player.respawning) respawnPlayer();
      updateParticles(dt); updateFloaters(dt); updateHud();
      input.jump = input.punch = input.eat = false;
      return;
    }
    if (input.jump) player.jumpBuffer = .14;
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.grabCooldown = Math.max(0, player.grabCooldown - dt);
    player.wallKick = Math.max(0, player.wallKick - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    punchCooldown = Math.max(0, punchCooldown - dt);
    eatCooldown = Math.max(0, eatCooldown - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    movePlayer(dt);
    updateHumans(dt);
    updateVehicles(dt);
    updateEnemies(dt);
    updateBuildings(dt);
    updateParticles(dt); updateFloaters(dt);
    if (running && player.state === 'monster') {
      if (input.punch || held.punch || keys.has('j') || keys.has('control')) punch();
      if (input.eat || held.eat || keys.has('e')) eat();
    }
    const cameraTarget = clamp(player.x + monsterSpec().w * .5 - canvas.width * .42, 0, Math.max(0, level.world.width - canvas.width));
    cameraX += (cameraTarget - cameraX) * (1 - Math.exp(-8 * dt));
    const verticalTarget = Math.min(0, player.y - 75);
    cameraY += (verticalTarget - cameraY) * (1 - Math.exp(-7 * dt));
    if (running && level.buildings.every(b => b.collapsed)) completeLevel();
    updateHud();
    input.jump = input.punch = input.eat = input.special = false;
  }

  function monsterSpec() {
    return level.player.monster;
  }

  function humanSpec() {
    return level.player.human;
  }

  function currentSize() {
    if (player.state === 'human') return humanSpec();
    if (player.state === 'morphing') {
      const t = ease(player.morph);
      return {
        w: lerp(humanSpec().w, monsterSpec().w, t),
        h: lerp(humanSpec().h, monsterSpec().h, t),
        speed: lerp(humanSpec().speed, monsterSpec().speed, t)
      };
    }
    return monsterSpec();
  }

  function solid(building) {
    return !building.collapsed && !building.collapse && countCells(building) > 0;
  }

  function bodyRect(x = player.x, y = player.y) {
    const spec = currentSize();
    return { x: x + spec.w * .34, y: y + spec.h * .12, w: spec.w * .32, h: spec.h * .88 };
  }

  function detach() {
    player.climbing = false; player.climbSide = null; player.climbBuildingId = '';
  }

  function roofAt(building, x, minimumY = -Infinity) {
    if (!solid(building) || x < building.x || x >= building.x + building.w) return null;
    const col = Math.floor((x - building.x) / (building.w / building.cols));
    const cellH = building.h / building.rows;
    for (let row = 0; row < building.rows; row++) {
      const top = building.y + row * cellH;
      // Facades sit behind the street. Only exposed surviving tile tops are platforms.
      if (building.cells[row][col] > 0 && (row === 0 || building.cells[row - 1][col] <= 0) && top >= minimumY - 2) return top;
    }
    return null;
  }

  function climbGrip(building, side, y = player.y) {
    if (!solid(building)) return null;
    const spec = monsterSpec();
    const col = side === 'left' ? 0 : building.cols - 1;
    const cellH = building.h / building.rows;
    const handTop = y + spec.h * .18, handBottom = y + spec.h * .30;
    for (let row = 0; row < building.rows; row++) {
      const top = building.y + row * cellH;
      if (building.cells[row][col] > 0 && handBottom >= top && handTop < top + cellH) return { row, col, top };
    }
    return null;
  }

  function hasRoofSupport(building) {
    if (!building) return false;
    const spec = monsterSpec(), feet = player.y + spec.h;
    const top = roofAt(building, player.x + spec.w * .5, feet);
    return top !== null && Math.abs(top - feet) <= 2;
  }

  function movePlayer(dt) {
    if (player.state !== 'monster') return;
    const spec = monsterSpec();
    const beforeY = player.y;
    const oldFeet = beforeY + spec.h;
    if (!player.climbing && Math.abs(input.x) > .12) player.facing = Math.sign(input.x);
    const currentWall = level.buildings.find(b => b.id === player.climbBuildingId);
    if (player.climbing && (!currentWall || !climbGrip(currentWall, player.climbSide))) {
      detach(); player.grabCooldown = .35;
    }
    const target = player.grabCooldown <= 0 ? getClimbTarget() : null;
    const toward = target && (target.side === 'left' ? input.x > .18 : input.x < -.18);
    if (!player.climbing && target && (input.y < -.18 || (!player.onGround && toward))) {
      player.climbing = true; player.climbSide = target.side; player.climbBuildingId = target.building.id;
      player.onGround = false; player.onRoof = ''; player.coyote = 0;
    }
    if (player.climbing) {
      const b = level.buildings.find(item => item.id === player.climbBuildingId);
      player.facing = player.climbSide === 'left' ? 1 : -1;
      player.x = player.climbSide === 'left' ? b.x - spec.w * .68 : b.x + b.w - spec.w * .32;
      player.vx = 0; player.vy = input.y * spec.climbSpeed;
      const grip = climbGrip(b, player.climbSide);
      player.y = Math.min(player.y + player.vy * dt, level.world.groundY - spec.h);
      if (player.jumpBuffer > 0) {
        const direction = Math.abs(input.x) > .18 ? Math.sign(input.x) : -player.facing;
        detach(); player.grabCooldown = .32; player.wallKick = .24;
        player.vx = direction * spec.speed * 1.35; player.vy = -spec.jump * .92;
        player.jumpBuffer = 0; player.onGround = false;
        tone(350, .07);
      } else if (input.y < -.18 && grip && (grip.row === 0 || b.cells[grip.row - 1][grip.col] <= 0) && player.y + spec.h * .23 <= grip.top + 8) {
        // Pull onto the ledge actually held, including a lowered, damaged roof edge.
        const footX = b.x + (grip.col + .5) * b.w / b.cols;
        player.x = footX - spec.w * .5;
        player.y = grip.top - spec.h;
        detach(); player.onGround = true; player.onRoof = b.id; player.vy = 0; player.grabCooldown = .18;
        return;
      } else if (input.y > .18 && player.y >= level.world.groundY - spec.h - 1) {
        detach(); player.onGround = true; player.grabCooldown = .18;
      } else if (!climbGrip(b, player.climbSide)) {
        detach(); player.grabCooldown = .35;
      } else return;
    }
    const roof = level.buildings.find(b => b.id === player.onRoof);
    if (player.onRoof && !hasRoofSupport(roof)) {
      player.onGround = false; player.onRoof = '';
    }
    player.coyote = player.onGround ? .1 : Math.max(0, player.coyote - dt);
    if (player.jumpBuffer > 0 && player.coyote > 0) {
      player.vy = -spec.jump; player.onGround = false; player.onRoof = ''; player.coyote = 0; player.jumpBuffer = 0;
      tone(350, .07);
    }
    if (player.wallKick <= 0) {
      const targetVx = Math.abs(input.x) > .12 ? input.x * spec.speed : 0;
      const acceleration = player.onGround ? 2500 : 1200;
      player.vx += clamp(targetVx - player.vx, -acceleration * dt, acceleration * dt);
    }
    player.x += player.vx * dt;
    const fallSpeed = player.vy;
    player.vy = Math.min(1050, player.vy + 1450 * dt);
    player.y += player.vy * dt;
    player.onGround = false; player.onRoof = '';
    const body = bodyRect();
    let landingY = level.world.groundY;
    let landingBuilding = null;
    if (player.vy >= 0) level.buildings.forEach(b => {
      const top = roofAt(b, player.x + spec.w * .5, oldFeet);
      if (top === null || body.x + body.w <= b.x || body.x >= b.x + b.w) return;
      if (oldFeet <= top + 2 && player.y + spec.h >= top && top < landingY) { landingY = top; landingBuilding = b; }
    });
    if (player.y + spec.h >= landingY && player.vy >= 0) {
      player.y = landingY - spec.h; player.vy = 0; player.onGround = true;
      player.onRoof = landingBuilding?.id || '';
      if (fallSpeed > 780) damagePlayer(10);
      if (landingBuilding && fallSpeed > 220) {
        const col = clamp(Math.floor((player.x + spec.w * .5 - landingBuilding.x) / (landingBuilding.w / landingBuilding.cols)), 0, landingBuilding.cols - 1);
        const row = clamp(Math.floor((landingY - landingBuilding.y) / (landingBuilding.h / landingBuilding.rows)), 0, landingBuilding.rows - 1);
        damageCell(landingBuilding, row, col, 1);
        shake = Math.max(shake, 4);
      }
    }
    player.x = clamp(player.x, 0, Math.max(0, level.world.width - spec.w));
  }

  function getClimbTarget() {
    const body = bodyRect();
    let best = null;
    level.buildings.forEach(building => {
      if (!solid(building)) return;
      if (player.climbing && building.id !== player.climbBuildingId) return;
      const leftDistance = Math.abs(body.x + body.w - building.x);
      const rightDistance = Math.abs(body.x - building.x - building.w);
      if (body.y + body.h <= building.y + 12 || body.y >= building.y + building.h) return;
      const side = player.climbing ? player.climbSide : leftDistance < rightDistance ? 'left' : 'right';
      const distance = side === 'left' ? leftDistance : rightDistance;
      if (distance <= (player.climbing ? 24 : 20) && climbGrip(building, side) && (!best || distance < best.distance)) best = { building, side, distance };
    });
    return best;
  }

  function punch() {
    if (player.state !== 'monster' || punchCooldown > 0) return;
    punchCooldown = .24; player.attackTimer = .22;
    const origin = punchOrigin();
    let dx = Math.abs(input.x) > .2 ? Math.sign(input.x) : player.facing;
    let dy = Math.abs(input.y) > .2 ? Math.sign(input.y) : 0;
    if (dy) dx *= .25;
    if (pointerAim) { dx = pointerAim.x - origin.x; dy = pointerAim.y - origin.y; }
    const length = Math.hypot(dx, dy) || 1;
    player.attackAim = { x: dx / length, y: dy / length };
    player.punchDir = dx < 0 ? -1 : 1;
    const spec = monsterSpec();
    const reach = window.MonstersUnlimitedRenderer?.attackReach?.({player, spec}) ?? (player.onRoof && player.attackAim.y > .5 ? spec.h * .64 : spec.w * .55);
    const end = { x: origin.x + player.attackAim.x * reach, y: origin.y + player.attackAim.y * reach };
    const hit = { x: end.x - 30, y: end.y - 30, w: 60, h: 60 };
    let didHit = false;
    level.buildings.forEach(b => {
      const cell = getHitCell(b, hit);
      if (!cell) return;
      damageCell(b, cell.row, cell.col, monsterSpec().punchDamage); didHit = true;
    });
    level.vehicles.forEach(v => {
      if (v.health <= 0 || !rects(hit, vehicleRect(v))) return;
      v.damage = Math.min(3, (v.damage || 0) + 1); v.health = Math.max(0, v.health - 1);
      score(v.health ? 50 : 250, v.x, v.y, '#f2c14e');
      burst(v.x + 40, v.y + 22, '#d66442', v.health ? 8 : 22); didHit = true;
    });
    helicopters.forEach(h => {
      if (h.health <= 0 || !rects(hit, h)) return;
      h.health--; score(h.health ? 75 : 500, h.x, h.y, '#f2c14e');
      burst(h.x + 40, h.y + 20, '#d66442', 18); didHit = true;
    });
    level.soldiers.forEach(soldier => {
      if (soldier.health <= 0 || !rects(hit, soldier)) return;
      soldier.health = 0; player.health = Math.min(player.maxHealth, player.health + 6);
      score(150, soldier.x, soldier.y, '#74e48c'); didHit = true;
    });
    level.humans.forEach(human => {
      if (human.eaten || !rects(hit, humanRect(human))) return;
      human.eaten = true;
      player.health = Math.min(player.maxHealth, player.health + (human.kind === 'window' ? 12 : 18));
      score(human.kind === 'window' ? 100 : 150, human.x, human.y - 20, '#74e48c'); didHit = true;
    });
    pickups.forEach(item => { if (!item.used && rects(hit, item)) { consume(item); didHit = true; } });
    if (didHit) { hitStop = .035; shake = Math.max(shake, 3); tone(110, .07, 'square'); }
    else tone(200, .025, 'triangle');
    if (!held.punch) pointerAim = null;
  }

  function consume(item) {
    item.used = true;
    if (item.kind === 'bomb') { damagePlayer(12); addFloater(item.x, item.y, 'BAD BITE!', '#e45b47'); }
    else { player.health = Math.min(player.maxHealth, player.health + 12); score(100, item.x, item.y, '#74e48c'); tone(720, .06); }
  }

  function eat() {
    if (player.state !== 'monster' || eatCooldown > 0) return;
    eatCooldown = .35;
    const origin = punchOrigin();
    const mouth = { x: origin.x - 55, y: origin.y - 45, w: 110, h: 90 };
    const human = level.humans.find(item => !item.eaten && rects(mouth, humanRect(item)));
    if (human) { human.eaten = true; player.health = Math.min(player.maxHealth, player.health + 18); score(150, human.x, human.y, '#74e48c'); }
    const item = pickups.find(item => !item.used && rects(mouth, item));
    if (item) consume(item);
  }

  function getHitCell(building, hit) {
    if (!solid(building) || !rects(hit, building)) return null;
    const cellW = building.w / building.cols, cellH = building.h / building.rows;
    let best = null;
    for (let row = 0; row < building.rows; row++) for (let col = 0; col < building.cols; col++) {
      if (building.cells[row][col] <= 0) continue;
      const cell = { x: building.x + col * cellW, y: building.y + row * cellH, w: cellW, h: cellH };
      if (!rects(hit, cell)) continue;
      const distance = Math.hypot(cell.x + cellW / 2 - hit.x - hit.w / 2, cell.y + cellH / 2 - hit.y - hit.h / 2);
      if (!best || distance < best.distance) best = { row, col, distance };
    }
    return best;
  }

  function damageCell(building, row, col, amount) {
    if (building.collapse || building.collapsed || !building.cells[row] || building.cells[row][col] <= 0) return;
    building.cells[row][col] -= amount;
    const x = building.x + (col + 0.5) * (building.w / building.cols);
    const y = building.y + (row + 0.5) * (building.h / building.rows);
    burst(x, y, '#d9c4a2', 9);
    if (building.cells[row][col] <= 0) {
      building.cells[row][col] = 0;
      score(building.points, x, y, '#f2c14e');
      if ((row * 3 + col + level.buildings.indexOf(building)) % 7 === 0) {
        pickups.push({x: x - 12, y: y - 12, w: 24, h: 24, kind: row % 3 === 0 ? 'bomb' : 'food', used: false, buildingId: building.id});
      }
    }
    maybeCollapse(building);
  }



  function maybeCollapse(building) {
    if (building.collapse || building.collapsed) return;
    const destroyed = building.maxCells - countCells(building);
    const structuralLimit = clamp(Number(building.structuralLimit || 0.6), 0.25, 0.9);
    const bottomGone = building.cells[building.rows - 1].every(hp => hp <= 0);
    const damageReached = destroyed / building.maxCells >= structuralLimit;
    if (!bottomGone && !damageReached) return;
    const bias = building.fallBias || 'auto';
    const dir = bias === 'left' ? -1 : bias === 'right' ? 1 : (Math.random() < 0.5 ? -1 : 1);
    building.collapse = { time: 0, dir, scored: false };
    burst(building.x + building.w / 2, building.y + building.h - 30, '#b8a68d', 58);
    addFloater(building.x + building.w / 2, building.y + 38, 'JUMP CLEAR!', '#fff1a8');
    tone(65, .25, 'sawtooth');
  }

  function updateBuildings(dt) {
    level.buildings.forEach(building => {
      if (!building.collapse) return;
      building.collapse.time += dt;
      if (building.collapse.time > .45 && !building.collapse.hitPlayer) {
        const height = building.h * (1 - ease(building.collapse.time / 1.25) * .92);
        const danger = { x: building.x - 20, y: level.world.groundY - height, w: building.w + 40, h: height };
        if (rects(danger, bodyRect())) { damagePlayer(15); building.collapse.hitPlayer = true; }
      }
      if (!building.collapse.scored) {
        building.collapse.scored = true;
        score(500, building.x + building.w / 2, building.y + 80, '#fff1a8');
      }
      if (building.collapse.time >= 1.25) {
        building.collapsed = true; building.collapse = null;
        building.cells.forEach(row => row.fill(0)); building.rubble = makeRubble(building);
        level.soldiers.filter(s => s.buildingId === building.id).forEach(s => s.health = 0);
        pickups.filter(item => item.buildingId === building.id).forEach(item => item.y = level.world.groundY - item.h);
        level.humans.filter(h => h.kind === 'window' && h.buildingId === building.id).forEach(releaseHuman);
        shake = Math.max(shake, 10);
      }
    });
    const wall = level.buildings.find(b => b.id === player.climbBuildingId);
    if (player.climbing && (!wall || !climbGrip(wall, player.climbSide))) { detach(); player.grabCooldown = .3; }
    const roof = level.buildings.find(b => b.id === player.onRoof);
    if (player.onRoof && !hasRoofSupport(roof)) { player.onGround = false; player.onRoof = ''; }
  }

  function makeRubble(building) {
    const pieces = [];
    for (let i = 0; i < 16; i++) {
      pieces.push({
        x: building.x + Math.random() * building.w,
        y: level.world.groundY - 10 - Math.random() * 28,
        w: 12 + Math.random() * 36,
        h: 6 + Math.random() * 18,
        color: i % 3 === 0 ? '#6f665c' : i % 3 === 1 ? '#4e4a47' : '#8a7b68'
      });
    }
    return pieces;
  }

  function releaseHuman(human) {
    if (human.eaten || human.kind !== 'window') return;
    const centerX = human.x + (human.w || 22) / 2;
    const feetY = human.y + (human.h || 30);
    const runners = assets.humans.filter(asset => asset.kind === 'ground');
    const index = Math.max(0, assets.humans.findIndex(asset => asset.id === human.assetId));
    human.assetId = runners[index % runners.length]?.id || human.assetId;
    human.kind = 'falling'; human.w = 40; human.h = 54;
    human.x = centerX - human.w / 2; human.y = feetY - human.h;
    human.dir = centerX < player.x + monsterSpec().w / 2 ? -1 : 1;
    human.vy = 0;
  }

  function updateHumans(dt) {
    level.humans.forEach((human) => {
      if (human.eaten) return;
      if (human.kind === 'window') {
        const host = level.buildings.find(b => b.id === human.buildingId);
        if (!host || !solid(host) || host.cells[human.cellRow]?.[human.cellCol] <= 0) releaseHuman(human);
        else return;
      }
      if (human.kind === 'falling') {
        human.vy = Math.min(700, human.vy + 1000 * dt);
        human.y += human.vy * dt;
        if (human.y + human.h < level.world.groundY) return;
        human.y = level.world.groundY - human.h; human.vy = 0; human.kind = 'ground';
      }
      human.x += (human.dir || 1) * 44 * dt;
      if (human.x < 20) { human.x = 20; human.dir = 1; }
      if (human.x > level.world.width - (human.w || 40) - 20) { human.x = level.world.width - (human.w || 40) - 20; human.dir = -1; }
    });
  }

  function updateVehicles(dt) {
    level.vehicles.forEach(vehicle => {
      if (vehicle.health <= 0) return;
      vehicle.x += vehicle.dir * vehicle.speed * dt;
      if (vehicle.x < -140) vehicle.x = level.world.width + 80;
      if (vehicle.x > level.world.width + 140) vehicle.x = -100;
      if (player.state === 'monster' && rects(vehicleRect(vehicle), bodyRect())) damagePlayer(8);
      if (vehicle.assetId !== 'vehicle-a') {
        vehicle.fire = (vehicle.fire ?? 2) - dt;
        if (vehicle.fire <= 0 && Math.abs(player.x - vehicle.x) < 900) {
          fireShot(vehicle.x + 52, vehicle.y + 4, 260, 8);
          vehicle.fire = Math.max(1.5, 3.6 - campaignIndex * .18);
        }
      }
    });
  }

  function fireShot(x, y, speed, damage) {
    const target = bodyRect();
    const dx = target.x + target.w / 2 - x, dy = target.y + target.h * .45 - y;
    const distance = Math.hypot(dx, dy) || 1;
    projectiles.push({ x, y, vx: dx / distance * speed, vy: dy / distance * speed, damage, life: 5 });
  }

  function updateEnemies(dt) {
    if (player.state !== 'monster') return;
    heliTimer -= dt;
    if (heliTimer <= 0) {
      const dir = Math.random() < .5 ? 1 : -1;
      helicopters.push({x: dir > 0 ? cameraX - 110 : cameraX + canvas.width + 20, y: 175 + Math.random() * 130,
        w: 124, h: 54, dir, health: 2, fire: 1.5, speed: 85 + Math.min(70, campaignIndex * 8)});
      heliTimer = Math.max(5, (level.enemies?.helicopterInterval || 10) - campaignIndex * .3);
    }
    level.soldiers.forEach(soldier => {
      const building = level.buildings.find(b => b.id === soldier.buildingId);
      if (!building || !solid(building)) soldier.health = 0;
      else {
        const col = soldier.side < 0 ? 0 : building.cols - 1;
        const row = Math.floor((soldier.y + soldier.h / 2 - building.y) / (building.h / building.rows));
        if (!building.cells[row]?.[col]) soldier.health = 0;
      }
      if (soldier.health <= 0) return;
      soldier.fire -= dt;
      if (soldier.fire <= 0) {
        // Soldiers fire out from the side facing the monster.
        const outward = soldier.side < 0 ? player.x < building.x : player.x > building.x + building.w - monsterSpec().w;
        if (outward && Math.abs(player.x - soldier.x) < 700) fireShot(soldier.x + 8, soldier.y + 12, 210, 5);
        soldier.fire = Math.max(1.5, (level.enemies?.soldierInterval || 4) - campaignIndex * .15);
      }
    });
    for (let i = helicopters.length - 1; i >= 0; i--) {
      const h = helicopters[i]; h.x += h.dir * h.speed * dt; h.fire -= dt;
      if (h.health <= 0 || h.x < -220 || h.x > level.world.width + 220) { helicopters.splice(i, 1); continue; }
      if (h.fire <= 0) { fireShot(h.x + h.w * .5, h.y + h.h, 240, 6); h.fire = Math.max(1.2, 2.7 - campaignIndex * .12); }
      if (rects(h, bodyRect())) damagePlayer(8);
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const shot = projectiles[i]; shot.life -= dt; shot.x += shot.vx * dt; shot.y += shot.vy * dt;
      if (rects({ x: shot.x - 3, y: shot.y - 3, w: 6, h: 6 }, bodyRect())) { damagePlayer(shot.damage); projectiles.splice(i, 1); }
      else if (shot.life <= 0 || shot.y > level.world.groundY || shot.x < -200 || shot.x > level.world.width + 200) projectiles.splice(i, 1);
    }
  }

  function drawEnemies() {
    level.soldiers.forEach(s => {
      if (s.health <= 0) return;
      ctx.fillStyle = '#e1c895'; ctx.fillRect(s.x + 5, s.y, 8, 8);
      ctx.fillStyle = '#3f5133'; ctx.fillRect(s.x + 3, s.y + 8, 12, 15);
      ctx.fillStyle = '#1d2324'; ctx.fillRect(s.x + (s.side < 0 ? -8 : 10), s.y + 12, 14, 4);
    });
    helicopters.forEach(h => {
      drawSprite(helicopterAsset, h.x, h.y + Math.sin(animTime * 5 + h.x * .01) * 1.5, h.w, h.h, h.dir < 0);
    });
    ctx.fillStyle = '#ffe48d'; projectiles.forEach(s => ctx.fillRect(s.x - 3, s.y - 3, 6, 6));
    pickups.forEach(item => {
      if (item.used) return;
      ctx.fillStyle = item.kind === 'bomb' ? '#232629' : '#e65737';
      ctx.beginPath(); ctx.arc(item.x + 12, item.y + 12, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = item.kind === 'bomb' ? '#ffcc45' : '#7cc75b'; ctx.fillRect(item.x + 10, item.y - 1, 5, 7);
    });
  }

  function tone(frequency, duration, type = 'sine') {
    if (!soundEnabled || !audioContext) return;
    try {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * .55), audioContext.currentTime + duration);
      gain.gain.setValueAtTime(.04, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
    } catch { /* Audio is optional when browser policy blocks it. */ }
  }

  function draw() {
    const world = level.world;
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, world.sky);
    grad.addColorStop(0.64, world.dusk);
    grad.addColorStop(1, '#31333b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX + (Math.random() - .5) * shake, -cameraY + (Math.random() - .5) * shake);
    drawBackdrop();
    drawBuildings();
    drawStreet();
    drawHumans();
    drawVehicles();
    drawEnemies();
    drawPlayer();
    drawParticles();
    drawFloaters();
    ctx.restore();
  }

  function drawPaused() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff1a8';
    ctx.font = '800 46px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }

  function drawBackdrop() {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = 70; x < level.world.width; x += 210) {
      ctx.beginPath();
      ctx.arc(x, 92 + Math.sin(x) * 20, 34, 0, Math.PI * 2);
      ctx.arc(x + 34, 88, 25, 0, Math.PI * 2);
      ctx.arc(x + 67, 96, 28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStreet() {
    ctx.fillStyle = '#303238';
    ctx.fillRect(0, level.world.groundY, level.world.width, 110);
    ctx.fillStyle = '#c9b76a';
    for (let x = -80; x < level.world.width; x += 130) ctx.fillRect(x, level.world.groundY + 46, 62, 6);
  }

  function safeDrawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {
    try {
      if (!img || !sw || !sh) return false;
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      return true;
    } catch {
      return false;
    }
  }

  function drawSprite(asset, x, y, w, h, flip) {
    const img = loadedImages.get(asset.src);
    if (!img) return;
    const f = spriteFrame(asset, img);
    ctx.save();
    if (flip) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      safeDrawImage(img, f.x, f.y, f.w, f.h, 0, 0, w, h);
    } else {
      safeDrawImage(img, f.x, f.y, f.w, f.h, x, y, w, h);
    }
    ctx.restore();
  }

  function spriteFrame(asset, img) {
    if (asset.frame) return asset.frame;
    if (img) return window.MonstersUnlimitedRenderer?.frame?.(img) || {x: 0, y: 0, w: img.width, h: img.height};
    return {x: 0, y: 0, w: 1, h: 1};
  }



  function drawBuildings() {
    level.buildings.forEach((building) => {
      const asset = byId(assets.buildings, building.assetId);
      const img = loadedImages.get(asset.src);
      if (building.collapsed) {
        drawRubble(building);
        return;
      }
      if (building.collapse) {
        drawCollapsingBuilding(building, asset, img);
        return;
      }
      const cellW = building.w / building.cols;
      const cellH = building.h / building.rows;
      for (let row = 0; row < building.rows; row++) {
        for (let col = 0; col < building.cols; col++) {
          const hp = building.cells[row][col];
          if (hp <= 0) continue;
          const frame = spriteFrame(asset, img);
          const sx = frame.x + (col / building.cols) * frame.w;
          const sy = frame.y + (row / building.rows) * frame.h;
          const sw = frame.w / building.cols;
          const sh = frame.h / building.rows;
          const dx = building.x + col * cellW;
          const dy = building.y + row * cellH;
          if (img) {
            safeDrawImage(img, sx, sy, sw, sh, dx, dy, cellW + 0.5, cellH + 0.5);
          } else {
            ctx.fillStyle = '#6f665c';
            ctx.fillRect(dx, dy, cellW + 0.5, cellH + 0.5);
            ctx.strokeStyle = 'rgba(20, 24, 30, 0.65)';
            ctx.strokeRect(dx, dy, cellW, cellH);
          }
          if (hp < building.hp) {
            ctx.fillStyle = 'rgba(41, 31, 25, 0.34)';
            ctx.fillRect(dx + 2, dy + 2, cellW - 4, cellH - 4);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
            ctx.fillRect(dx + cellW * 0.15, dy + cellH * 0.58, cellW * 0.7, cellH * 0.24);
            ctx.strokeStyle = 'rgba(255, 238, 190, 0.7)';
            ctx.beginPath();
            ctx.moveTo(dx + cellW * 0.22, dy + cellH * 0.2);
            ctx.lineTo(dx + cellW * 0.54, dy + cellH * 0.55);
            ctx.lineTo(dx + cellW * 0.38, dy + cellH * 0.82);
            ctx.stroke();
          }
        }
      }
    });
  }

  function drawCollapsingBuilding(building, asset, img) {
    const t = clamp(building.collapse.time / 1.25, 0, 1);
    ctx.save();
    ctx.translate((Math.random() - .5) * 8, level.world.groundY);
    ctx.scale(1, 1 - ease(t) * .92);
    ctx.translate(0, -level.world.groundY);
    drawBuildingCells(building, asset, img, 1 - t * 0.38);
    ctx.restore();
    for (let i = 0; i < 3; i++) burst(building.x + Math.random() * building.w, building.y + building.h * (0.45 + Math.random() * 0.45), '#b8a68d', 1);
  }

  function drawBuildingCells(building, asset, img, alpha) {
    const cellW = building.w / building.cols;
    const cellH = building.h / building.rows;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let row = 0; row < building.rows; row++) {
      for (let col = 0; col < building.cols; col++) {
        if (building.cells[row][col] <= 0) continue;
        const dx = building.x + col * cellW;
        const dy = building.y + row * cellH;
        if (img) {
          const frame = spriteFrame(asset, img);
          safeDrawImage(img, frame.x + (col / building.cols) * frame.w, frame.y + (row / building.rows) * frame.h, frame.w / building.cols, frame.h / building.rows, dx, dy, cellW + 0.5, cellH + 0.5);
        } else {
          ctx.fillStyle = '#6f665c';
          ctx.fillRect(dx, dy, cellW + 0.5, cellH + 0.5);
        }
      }
    }
    ctx.restore();
  }

  function drawRubble(building) {
    building.rubble.forEach((piece) => {
      ctx.fillStyle = piece.color;
      ctx.fillRect(piece.x, piece.y, piece.w, piece.h);
    });
    ctx.fillStyle = 'rgba(184, 166, 141, 0.28)';
    ctx.fillRect(building.x - 8, level.world.groundY - 18, building.w + 16, 18);
  }

  function drawHumans() {
    level.humans.forEach((human) => {
      if (human.eaten) return;
      const asset = byId(assets.humans, human.assetId);
      drawSprite(asset, human.x, human.y, human.w || 32, human.h || 54, human.dir < 0);
    });
  }

  function drawVehicles() {
    level.vehicles.forEach((vehicle) => {
      if (vehicle.health <= 0) return;
      const asset = byId(assets.vehicles, vehicle.assetId);
      const damageIndex = Math.min((asset.damageSrcs?.length || 0) - 1, Math.max(-1, Number(vehicle.damage || 0) - 1));
      drawSprite({ ...asset, src: damageIndex >= 0 ? asset.damageSrcs[damageIndex] : asset.src }, vehicle.x, vehicle.y, 104, 50, vehicle.dir < 0);
      if (vehicle.damage && damageIndex < 0) drawVehicleDamage(vehicle);
    });
  }

  function drawVehicleDamage(vehicle) {
    const level = clamp(vehicle.damage / 3, 0, 1);
    ctx.fillStyle = `rgba(34, 25, 24, ${0.25 + level * 0.35})`;
    ctx.fillRect(vehicle.x + 10, vehicle.y + 8, 84, 30);
    ctx.strokeStyle = 'rgba(255, 199, 92, 0.75)';
    ctx.beginPath();
    ctx.moveTo(vehicle.x + 28, vehicle.y + 12);
    ctx.lineTo(vehicle.x + 44, vehicle.y + 31);
    ctx.lineTo(vehicle.x + 62, vehicle.y + 15);
    ctx.stroke();
  }

  function drawPlayer() {
    const spec = currentSize();
    if (player.state === 'human') {
      const asset = byId(assets.monsters, level.player.monsterId);
      drawSprite({ ...asset, src: asset.humanSrc || asset.src }, player.x, player.y, spec.w, spec.h, player.facing < 0);
      if (!loadedImages.get(asset.humanSrc || asset.src)) {
        ctx.fillStyle = '#f2c14e';
        ctx.fillRect(player.x, player.y, spec.w, spec.h);
      }
      return;
    }
    const asset = byId(assets.monsters, level.player.monsterId);
    const pulse = player.state === 'morphing' ? Math.sin(player.morph * Math.PI * 8) * 6 : 0;
    let src = player.attackTimer > 0 ? asset.attackSrc : player.climbing ? asset.climbSrc : asset.src;
    if (player.state === 'morphing') {
      const morphs = asset.morphSrcs || [];
      src = player.morph < 0.34 ? asset.humanSrc : player.morph < 0.67 ? morphs[0] : morphs[1] || asset.src;
    }
    if (!paused && player.invulnerable > 0 && Math.floor(animTime * 12) % 2) return;
    if (player.state === 'monster' && window.MonstersUnlimitedRenderer?.draw(ctx, {asset, spec, player, time: animTime, images: loadedImages, pulse, paused})) return;
    drawSprite({ ...asset, src: src || asset.src }, player.x - pulse / 2, player.y - pulse, spec.w + pulse, spec.h + pulse, player.facing < 0);
    if (!loadedImages.get(asset.src)) {
      ctx.fillStyle = '#4e6f84';
      ctx.fillRect(player.x - pulse / 2, player.y - pulse, spec.w + pulse, spec.h + pulse);
    }
  }

  function punchOrigin() {
    const spec = currentSize();
    if (window.MonstersUnlimitedRenderer?.punchOrigin) return window.MonstersUnlimitedRenderer.punchOrigin({player, spec});
    const facing = player.climbing ? player.facing : player.facing || 1;
    return {
      x: player.x + spec.w * (facing > 0 ? 0.57 : 0.43),
      y: player.y + spec.h * 0.43
    };
  }


  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 210, life: 0.55 + Math.random() * 0.35, color, size: 3 + Math.random() * 6 });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    particles.forEach((p) => {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    });
  }

  function score(amount, x, y, color) {
    player.score += amount;
    addFloater(x, y, `+${amount}`, color);
  }

  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 0.9 });
  }

  function updateFloaters(dt) {
    for (let i = floaters.length - 1; i >= 0; i--) {
      floaters[i].life -= dt;
      floaters[i].y -= 34 * dt;
      if (floaters[i].life <= 0) floaters.splice(i, 1);
    }
  }

  function drawFloaters() {
    ctx.font = '800 18px Arial';
    ctx.textAlign = 'center';
    floaters.forEach((f) => {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    });
  }

  function countCells(building) {
    return building.cells.flat().filter(Boolean).length;
  }

  function playerRect() {
    return bodyRect();
  }

  function humanRect(human) {
    return { x: human.x, y: human.y, w: human.w || 32, h: human.h || 54 };
  }

  function vehicleRect(vehicle) {
    return { x: vehicle.x, y: vehicle.y, w: 104, h: 50 };
  }

  function rects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function pointerWorld(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width + cameraX,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height + cameraY
    };
  }

  function setDefaultAim() {
    const origin = punchOrigin();
    const dir = player?.facing || 1;
    player.aimX = origin.x + dir * 110;
    player.aimY = origin.y;
  }

  function readKeyboard() {
    const left = keys.has('arrowleft') || keys.has('a');
    const right = keys.has('arrowright') || keys.has('d');
    const up = keys.has('arrowup') || keys.has('w');
    const down = keys.has('arrowdown') || keys.has('s');
    const keyX = right ? 1 : left ? -1 : 0;
    const keyY = down ? 1 : up ? -1 : 0;
    input.x = Math.abs(stickInput.x) > 0.12 ? stickInput.x : keyX;
    input.y = Math.abs(stickInput.y) > 0.12 ? stickInput.y : keyY;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  function ease(t) {
    return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  }

  function clearInput() {
    keys.clear();
    input.x = input.y = stickInput.x = stickInput.y = 0;
    input.jump = input.punch = input.eat = input.special = false;
    held.punch = held.eat = false;
    pointerAim = null;
    const knob = document.getElementById('stickKnob');
    if (knob) knob.style.transform = 'translate(0, 0)';
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    clearInput();
    document.getElementById('pauseBtn').textContent = paused ? 'Resume' : 'Pause';
    document.getElementById('pauseBtn').setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
    updateHud();
  }

  function unlockAudio() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!audioContext && Audio) audioContext = new Audio();
      if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
    } catch { /* Keep playing without audio. */ }
  }

  window.addEventListener('keydown', event => {
    if (event.target?.tagName === 'SELECT' || event.target?.tagName === 'INPUT') return;
    const key = event.key.toLowerCase();
    if (['arrowleft','arrowright','arrowup','arrowdown',' ','control','j','e','w','a','s','d'].includes(key) && running) event.preventDefault();
    if (key === 'escape' && !event.repeat) { togglePause(); return; }
    if (!running || paused) return;
    keys.add(key);
    if ((key === ' ' || key === 'spacebar') && !event.repeat) input.jump = true;
    if (key === 'j' || key === 'control') { pointerAim = null; input.punch = true; }
    if (key === 'e') input.eat = true;
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => { if (running && !paused) togglePause(); else clearInput(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) togglePause(); });
  startBtn.addEventListener('click', () => { unlockAudio(); start(); });
  document.getElementById('restartBtn').addEventListener('click', () => {
    unlockAudio();
    if (cleared) { loadLevel(campaignIndex + 1); resumeRun(); }
    else start();
  });
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('soundBtn').addEventListener('click', () => {
    unlockAudio(); soundEnabled = !soundEnabled;
    document.getElementById('soundBtn').textContent = soundEnabled ? 'Sound On' : 'Sound Off';
    document.getElementById('soundBtn').setAttribute('aria-pressed', String(soundEnabled));
  });
  canvas.addEventListener('pointerdown', event => {
    if (!running || paused) return;
    event.preventDefault(); unlockAudio();
    if (event.button === 2) { held.eat = true; input.eat = true; }
    else { pointerAim = pointerWorld(event); held.punch = true; input.punch = true; }
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => { if (held.punch) pointerAim = pointerWorld(event); });
  const releaseCanvas = () => { held.punch = held.eat = false; pointerAim = null; };
  canvas.addEventListener('pointerup', releaseCanvas);
  canvas.addEventListener('pointercancel', releaseCanvas);
  canvas.addEventListener('lostpointercapture', releaseCanvas);
  canvas.addEventListener('contextmenu', event => event.preventDefault());

  function bindAction(id, action) {
    const button = document.getElementById(id);
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (!running || paused) return;
      unlockAudio(); button.setPointerCapture(event.pointerId);
      if (action === 'jump') input.jump = true;
      else { held[action] = true; input[action] = true; pointerAim = null; }
    });
    const release = () => { if (action !== 'jump') held[action] = false; };
    ['pointerup','pointercancel','lostpointercapture'].forEach(name => button.addEventListener(name, release));
  }
  bindAction('jumpBtn', 'jump'); bindAction('punchBtn', 'punch'); bindAction('eatBtn', 'eat');
  const stick = document.getElementById('mobileStick'), knob = document.getElementById('stickKnob');
  let stickId = null;
  function moveStick(event) {
    if (stickId !== event.pointerId || paused || !running) return;
    const rect = stick.getBoundingClientRect();
    const dx = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width / 2), -1, 1);
    const dy = clamp((event.clientY - rect.top - rect.height / 2) / (rect.height / 2), -1, 1);
    stickInput.x = Math.abs(dx) > .15 ? dx : 0; stickInput.y = Math.abs(dy) > .15 ? dy : 0;
    knob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
  }
  stick.addEventListener('pointerdown', event => { event.preventDefault(); stickId = event.pointerId; stick.setPointerCapture(event.pointerId); moveStick(event); });
  stick.addEventListener('pointermove', moveStick);
  function releaseStick() { stickId = null; stickInput.x = stickInput.y = 0; knob.style.transform = 'translate(0, 0)'; }
  ['pointerup','pointercancel','lostpointercapture'].forEach(name => stick.addEventListener(name, releaseStick));

  const monsterSelect = document.getElementById('monsterSelect');
  monsterSelect.innerHTML = assets.monsters.filter(asset => asset.playable !== false).map(asset => `<option value="${asset.id}">${asset.name}</option>`).join('');
  monsterSelect.value = selectedMonsterId;
  const levelSelect = document.getElementById('levelSelect');
  levelSelect.innerHTML = levels.map((city, index) => `<option value="${index}">${city.city}</option>`).join('');
  levelSelect.value = '0';
  document.getElementById('soundBtn').setAttribute('aria-pressed', 'true');
  reset();
  draw();
  preloadPromise = preload().then(() => {
    if (!running) draw();
  }).catch(() => { startBtn.textContent = 'Start (art unavailable)'; });
  if (new URLSearchParams(window.location.search).has('autostart')) start();
})();
