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

  const RIG_STORAGE_KEY = 'monstersUnlimited.rig.v1';
  const assets = window.MONSTERS_UNLIMITED_ASSETS;
  const sourceLevel = window.MONSTERS_UNLIMITED_LEVELS[0];
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
  let running = false;
  let paused = false;
  let lastTime = 0;
  let punchCooldown = 0;
  let eatCooldown = 0;
  let preloadPromise = null;
  let animTime = 0;
  const rigLayouts = loadRigLayouts();

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

  function loadRigLayouts() {
    try {
      return JSON.parse(localStorage.getItem(RIG_STORAGE_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  function rigLayoutFor(asset) {
    return rigLayouts[asset.id] || asset.rig?.layout || null;
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
      const timer = window.setTimeout(() => finish(img.complete ? img : null), 8000);
      img.onload = () => {
        window.clearTimeout(timer);
        try {
          finish(maskPink(img));
        } catch {
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
    const srcs = new Set();
    Object.values(assets).flat().forEach((item) => {
      srcs.add(item.src);
      if (item.humanSrc) srcs.add(item.humanSrc);
      if (item.climbSrc) srcs.add(item.climbSrc);
      if (item.attackSrc) srcs.add(item.attackSrc);
      (item.morphSrcs || []).forEach((src) => srcs.add(src));
      (item.damageSrcs || []).forEach((src) => srcs.add(src));
      Object.values(item.rig?.parts || {}).forEach((src) => srcs.add(src));
    });
    const loaded = await Promise.all([...srcs].map(async (src) => [src, await loadImage(src)]));
    loaded.forEach(([src, img]) => {
      if (img) loadedImages.set(src, img);
    });
  }

  function reset() {
    level = clone(sourceLevel);
    level.buildings.forEach((building) => {
      building.cells = Array.from({ length: building.rows }, () => Array.from({ length: building.cols }, () => building.hp));
      building.maxCells = building.rows * building.cols;
      building.collapse = null;
      building.rubble = [];
    });
    const spec = level.player;
    player = {
      x: spec.x,
      y: level.world.groundY - spec.human.h,
      vx: 0,
      vy: 0,
      facing: 1,
      punchDir: 1,
      attackTimer: 0,
      aimX: spec.x + 140,
      aimY: level.world.groundY - spec.human.h - 40,
      climbSide: null,
      climbBuildingId: '',
      state: 'human',
      morph: 0,
      health: spec.health,
      maxHealth: spec.health,
      climbing: false,
      onGround: true,
      invulnerable: 0,
      score: spec.score || 0
    };
    particles.length = 0;
    floaters.length = 0;
    cameraX = 0;
    punchCooldown = 0;
    eatCooldown = 0;
    animTime = 0;
    updateHud();
  }

  async function start() {
    startBtn.disabled = false;
    startBtn.textContent = 'Start';
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    reset();
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function completeLevel() {
    running = false;
    endKicker.textContent = 'City Cleared';
    endTitle.textContent = 'Level Complete';
    endText.textContent = `Score ${player.score}. The first skyline is rubble.`;
    endScreen.classList.remove('hidden');
  }

  function gameOver() {
    running = false;
    player.state = 'human';
    endKicker.textContent = 'Transformed Back';
    endTitle.textContent = 'Monster Down';
    endText.textContent = 'The monster ran out of health and changed back into a human.';
    endScreen.classList.remove('hidden');
  }

  function updateHud() {
    healthFill.style.transform = `scaleX(${Math.max(0, player.health / player.maxHealth)})`;
    scoreText.textContent = String(player.score);
    const remaining = level.buildings.reduce((sum, building) => sum + countCells(building), 0);
    objectiveText.textContent = `${remaining} city sections left`;
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    if (!paused) update(dt);
    draw();
    if (paused) drawPaused();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    animTime += dt;
    readKeyboard();
    if (player.state === 'human' && (Math.abs(input.x) > 0.15 || input.jump || input.punch)) {
      player.state = 'morphing';
      player.morph = 0;
      addFloater(player.x, player.y - 20, 'MORPH!', '#f2c14e');
    }
    if (player.state === 'morphing') {
      player.morph += dt / 1.45;
      if (player.morph >= 1) {
        player.state = 'monster';
        player.y = level.world.groundY - monsterSpec().h;
      }
    }
    movePlayer(dt);
    updateHumans(dt);
    updateVehicles(dt);
    updateBuildings(dt);
    updateParticles(dt);
    updateFloaters(dt);
    punchCooldown = Math.max(0, punchCooldown - dt);
    eatCooldown = Math.max(0, eatCooldown - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (input.punch) punch();
    if (input.eat) eat();
    if (input.special) monsterSpecial();
    cameraX += (clamp(player.x - canvas.width * 0.42, 0, level.world.width - canvas.width) - cameraX) * 0.09;
    if (level.buildings.every((building) => building.collapsed || countCells(building) === 0)) completeLevel();
    updateHud();
    input.jump = false;
    input.punch = false;
    input.eat = false;
    input.special = false;
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

  function movePlayer(dt) {
    const spec = currentSize();
    const isMonster = player.state === 'monster';
    if (Math.abs(input.x) > 0.12) player.facing = Math.sign(input.x);

    // Extra safety detach if current climb target vanished (e.g. punched out from under you)
    if (player.climbing && player.climbBuildingId) {
      const b = level.buildings.find(bb => bb.id === player.climbBuildingId);
      if (!b || b.collapsed || b.collapse || countCells(b) === 0) {
        player.climbing = false;
        player.climbSide = null;
        player.climbBuildingId = '';
      }
    }

    const climbTarget = isMonster ? getClimbTarget() : null;
    player.climbing = Boolean(climbTarget && (player.climbing || Math.abs(input.y) > 0.18));
    if (player.climbing) {
      const building = climbTarget.building;
      player.facing = climbTarget.side === 'left' ? 1 : -1;
      player.climbSide = climbTarget.side;
      player.climbBuildingId = building.id;
      if (Math.abs(input.x) > 0.12) player.punchDir = Math.sign(input.x);
      player.vy = input.y * monsterSpec().climbSpeed;
      player.vx = 0;
      player.x += (climbTarget.x - player.x) * Math.min(1, dt * 18);
      player.y += player.vy * dt;
      player.y = clamp(player.y, building.y - spec.h + 10, level.world.groundY - spec.h);
      player.onGround = false;
      if (input.jump) {
        player.climbing = false;
        player.climbSide = null;
        player.climbBuildingId = '';
        player.vy = -monsterSpec().jump * 0.82;
        player.vx = (Math.abs(input.x) > 0.12 ? Math.sign(input.x) : -player.facing) * monsterSpec().speed * 1.35;
      }
    } else {
      if (Math.abs(input.x) > 0.12) player.punchDir = Math.sign(input.x);
      player.vx = input.x * spec.speed;
      if (input.jump && player.onGround) {
        player.vy = -monsterSpec().jump;
        player.onGround = false;
      }
      player.vy += 1450 * dt;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      const ground = level.world.groundY - spec.h;
      if (player.y >= ground) {
        player.y = ground;
        player.vy = 0;
        player.onGround = true;
        player.climbSide = null;
        player.climbBuildingId = '';
      }
    }
    player.x = clamp(player.x, 18, level.world.width - spec.w - 18);
  }

  function getClimbTarget() {
    const spec = currentSize();
    const body = { x: player.x, y: player.y, w: spec.w, h: spec.h };
    let best = null;
    level.buildings.forEach((building) => {
      if (countCells(building) === 0) return false;
      if (building.collapse || building.collapsed) return false;
      const leftDistance = Math.abs(body.x + body.w - building.x);
      const rightDistance = Math.abs(body.x - (building.x + building.w));
      const yOverlap = body.y + body.h > building.y + 20 && body.y < building.y + building.h;
      const holdingCurrent = player.climbing && building.id === player.climbBuildingId;
      const latchRange = holdingCurrent ? 120 : player.onGround ? 42 : 72;
      if (!yOverlap || (leftDistance > latchRange && rightDistance > latchRange)) return;
      const side = holdingCurrent && player.climbSide ? player.climbSide : leftDistance <= rightDistance ? 'left' : 'right';
      const distance = Math.min(leftDistance, rightDistance);
      const handOverlap = clamp(spec.w * 0.22, 28, 42);
      const x = side === 'left' ? building.x - spec.w + handOverlap : building.x + building.w - handOverlap;
      if (!best || distance < best.distance) best = { building, side, distance, x };
    });
    return best;
  }

  function punch() {
    if (player.state !== 'monster' || punchCooldown > 0) return;
    punchCooldown = 0.26;
    player.attackTimer = 0.75;
    const spec = monsterSpec();
    const origin = punchOrigin();
    const target = { x: Number(player.aimX || origin.x + player.facing * 90), y: Number(player.aimY || origin.y) };
    const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
    const reach = player.climbing ? 112 : 96;
    const end = { x: origin.x + Math.cos(angle) * reach, y: origin.y + Math.sin(angle) * reach };
    const hit = { x: end.x - 34, y: end.y - 34, w: 68, h: 68 };
    let didHit = false;
    level.buildings.forEach((building) => {
      const cell = getHitCell(building, hit);
      if (!cell) return;
      damageCell(building, cell.row, cell.col, monsterSpec().punchDamage);
      didHit = true;
    });
    level.vehicles.forEach((vehicle) => {
      if (vehicle.health > 0 && rects(hit, vehicleRect(vehicle))) {
        vehicle.damage = Math.min(3, Number(vehicle.damage || 0) + 1);
        vehicle.health = Math.max(1, vehicle.health - 1);
        if (vehicle.damage >= 3) vehicle.disabled = true;
        didHit = true;
        score(90, vehicle.x, vehicle.y, '#f2c14e');
        burst(vehicle.x + 40, vehicle.y + 22, '#d66442', 8);
      }
    });
    level.humans.forEach((human) => {
      if (human.eaten || !rects(hit, humanRect(human))) return;
      human.eaten = true;
      didHit = true;
      player.health = Math.min(player.maxHealth, player.health + (human.kind === 'window' ? 12 : 18));
      score(human.kind === 'window' ? 100 : 150, human.x, human.y - 20, '#74e48c');
      burst(human.x + (human.w || 32) / 2, human.y + (human.h || 54) / 2, '#74e48c', 6);
    });
    if (!didHit) burst(hit.x + hit.w / 2, hit.y + hit.h / 2, '#f2c14e', 4);
  }

  function eat() {
    if (player.state !== 'monster' || eatCooldown > 0) return;
    eatCooldown = 0.45;
    const spec = monsterSpec();
    const mouth = { x: player.x + (player.facing > 0 ? spec.w * 0.58 : -18), y: player.y + spec.h * 0.28, w: 62, h: 68 };
    const human = level.humans.find((item) => !item.eaten && rects(mouth, humanRect(item)));
    if (!human) return;
    human.eaten = true;
    player.health = Math.min(player.maxHealth, player.health + 18);
    score(150, human.x, human.y - 30, '#74e48c');
  }

  function monsterSpecial() {
    if (player.state !== 'monster') return;
    const origin = punchOrigin();
    burst(origin.x + player.facing * 60, origin.y, '#6fe7ff', 18);
    addFloater(origin.x, origin.y - 30, 'SPECIAL', '#6fe7ff');
  }

  function getHitCell(building, hit) {
    if (!rects(hit, building)) return null;
    if (building.collapse || building.collapsed) return null;
    const cellW = building.w / building.cols;
    const cellH = building.h / building.rows;
    const cx = clamp(Math.floor((hit.x + hit.w / 2 - building.x) / cellW), 0, building.cols - 1);
    const cy = clamp(Math.floor((hit.y + hit.h / 2 - building.y) / cellH), 0, building.rows - 1);
    for (let radius = 0; radius < 3; radius++) {
      for (let row = cy - radius; row <= cy + radius; row++) {
        for (let col = cx - radius; col <= cx + radius; col++) {
          if (building.cells[row]?.[col] > 0) return { row, col };
        }
      }
    }
    return null;
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
      cascade(building, row, col);
    }
    dropUnsupportedCells(building);
    maybeCollapse(building);
  }

  function cascade(building, row, col) {
    if (row <= 0) return;
    for (let above = row - 1; above >= 0; above--) {
      if (building.cells[above][col] <= 0) continue;
      if (Math.random() < 0.42) {
        building.cells[above][col] = 0;
        score(Math.round(building.points * 0.5), building.x + (col + 0.5) * (building.w / building.cols), building.y + (above + 0.5) * (building.h / building.rows), '#fff1a8');
      }
      break;
    }
  }

  function dropUnsupportedCells(building) {
    let changed = false;
    for (let row = building.rows - 2; row >= 0; row--) {
      for (let col = 0; col < building.cols; col++) {
        if (building.cells[row][col] <= 0) continue;
        if (building.cells[row + 1][col] > 0) continue;
        building.cells[row][col] = 0;
        changed = true;
        score(Math.round(building.points * 0.4), building.x + (col + 0.5) * (building.w / building.cols), building.y + (row + 0.5) * (building.h / building.rows), '#fff1a8');
      }
    }
    if (changed) burst(building.x + building.w / 2, building.y + building.h * 0.65, '#b8a68d', 20);
  }

  function maybeCollapse(building) {
    if (building.collapse || building.collapsed) return;
    const destroyed = building.maxCells - countCells(building);
    const structuralLimit = clamp(Number(building.structuralLimit || 0.5), 0.25, 0.9);
    const bottomGone = building.cells[building.rows - 1].filter(Boolean).length <= Math.max(1, Math.floor(building.cols / 2));
    const damageReached = destroyed / building.maxCells >= structuralLimit;
    if (!bottomGone && !damageReached) return;
    const bias = building.fallBias || 'auto';
    const dir = bias === 'left' ? -1 : bias === 'right' ? 1 : (Math.random() < 0.5 ? -1 : 1);
    building.collapse = { time: 0, dir, scored: false };
    burst(building.x + building.w / 2, building.y + building.h - 30, '#b8a68d', 58);
    addFloater(building.x + building.w / 2, building.y + 38, 'CRASH!', '#fff1a8');
  }

  function updateBuildings(dt) {
    level.buildings.forEach((building) => {
      if (!building.collapse) return;
      building.collapse.time += dt;
      if (!building.collapse.scored) {
        building.collapse.scored = true;
        for (let row = 0; row < building.rows; row++) {
          for (let col = 0; col < building.cols; col++) {
            if (building.cells[row][col] > 0) score(25, building.x + col * 20, building.y + row * 18, '#d9c4a2');
          }
        }
      }
      if (building.collapse.time >= 1.25) {
        building.collapsed = true;
        building.collapse = null;
        building.cells.forEach((row) => row.fill(0));
        building.rubble = makeRubble(building);
      }
    });

    // Safety: if the building the player is latched to just disappeared, force detach
    if (player && player.climbing && player.climbBuildingId) {
      const b = level.buildings.find(bb => bb.id === player.climbBuildingId);
      if (!b || b.collapsed || b.collapse || countCells(b) === 0) {
        player.climbing = false;
        player.climbSide = null;
        player.climbBuildingId = '';
      }
    }
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

  function updateHumans(dt) {
    level.humans.forEach((human) => {
      if (human.eaten) return;
      if (human.kind === 'window') return;
      human.x += (human.dir || 1) * 44 * dt;
      if (human.x < 20 || human.x > level.world.width - 45) human.dir *= -1;
    });
  }

  function updateVehicles(dt) {
    level.vehicles.forEach((vehicle) => {
      if (vehicle.health <= 0) return;
      if (vehicle.disabled) return;
      vehicle.x += vehicle.dir * vehicle.speed * dt;
      if (vehicle.x < -140) vehicle.x = level.world.width + 80;
      if (vehicle.x > level.world.width + 140) vehicle.x = -100;
      if (player.state === 'monster' && player.invulnerable <= 0 && rects(vehicleRect(vehicle), playerRect())) {
        player.health -= 8;
        player.invulnerable = 0.7;
        burst(player.x + 70, player.y + 120, '#e45b47', 10);
        if (player.health <= 0) gameOver();
      }
    });
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
    ctx.translate(-cameraX, 0);
    drawBackdrop();
    drawBuildings();
    drawStreet();
    drawHumans();
    drawVehicles();
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
    const f = asset.frame || { x: 0, y: 0, w: img.width, h: img.height };
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

  function drawRigPart(parts, name, x, y, scale, rotation = 0, anchorX = 0.5, anchorY = 0.5) {
    const src = parts[name];
    const img = loadedImages.get(src);
    if (!img) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(img, -img.width * anchorX * scale, -img.height * anchorY * scale, img.width * scale, img.height * scale);
    ctx.restore();
    return true;
  }

  function drawCounterFlippedRigPart(parts, name, x, y, scale, rotation = 0, anchorX = 0.5, anchorY = 0.5) {
    ctx.save();
    ctx.scale(-1, 1);
    const drawn = drawRigPart(parts, name, x, y, scale, rotation, anchorX, anchorY);
    ctx.restore();
    return drawn;
  }

  function drawWorldRigPart(parts, name, x, y, scale, rotation = 0, anchorX = 0.5, anchorY = 0.5, flip = false) {
    const src = parts[name];
    const img = loadedImages.get(src);
    if (!img) return false;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.rotate(flip ? -rotation : rotation);
    ctx.drawImage(img, -img.width * anchorX * scale, -img.height * anchorY * scale, img.width * scale, img.height * scale);
    ctx.restore();
    return true;
  }

  function drawRiggedLizork(asset, spec, pulse) {
    const parts = asset.rig?.parts;
    if (!parts || !loadedImages.get(parts.torsoSide) || !loadedImages.get(parts.legsSide) || !loadedImages.get(parts.head)) return false;
    const layout = rigLayoutFor(asset);
    const facing = player.facing < 0 ? -1 : 1;
    const moving = Math.abs(player.vx) > 12 && player.onGround;
    const stride = Math.sin(animTime * (moving ? 11 : 4));
    const bob = moving ? Math.abs(stride) * 4 : Math.sin(animTime * 3) * 1.8;
    const climbBob = player.climbing ? Math.sin(animTime * 8) * 3 : 0;
    const attacking = player.attackTimer > 0;
    const jumping = !player.onGround && !player.climbing;
    const scale = (spec.h + pulse) / 252;
    const rootX = player.x + spec.w * 0.48 + facing * (player.climbing ? 6 : 0);
    const rootY = player.y + spec.h * 0.96 + bob + climbBob - pulse;
    const visualDir = -facing;
    const armPart = layout?.parts?.arm;
    const shoulderWorld = armPart ? {
      x: rootX - (layout.facing || -1) * facing * number(armPart.x, 0) * scale,
      y: rootY + number(armPart.y, -75) * scale
    } : {
      x: rootX + facing * 48 * scale,
      y: rootY - 75 * scale
    };
    const aimDx = (Number(player.aimX || shoulderWorld.x + facing * 110) - shoulderWorld.x) * facing;
    const aimDy = Number(player.aimY || shoulderWorld.y) - shoulderWorld.y;
    const punchAngle = clamp(Math.atan2(aimDy, aimDx), -1.35, 1.2);

    ctx.save();
    ctx.translate(rootX, rootY);
    ctx.scale(visualDir, 1);
    if (player.climbing) ctx.rotate(-0.08);

    const legSwing = player.climbing ? 12 : moving ? stride * 7 : jumping ? -11 : 0;
    drawRigLayoutPart(parts, layout, 'leg', 'legsSide', scale, { x: moving ? stride * 4 : 0, rotation: legSwing });
    drawRigLayoutPart(parts, layout, 'torso', 'torsoSide', scale, { rotation: player.climbing ? -1 : 0 });
    drawRigLayoutPart(parts, layout, 'head', attacking ? 'headOpen' : 'head', scale, { y: attacking ? -2 : 0, rotation: player.climbing ? -9 : stride * 1.5 });

    if (attacking) {
      drawRigLayoutPart(parts, layout, 'punchArm', 'armPunchMounted', scale, { rotation: (-punchAngle * 0.55 * 180) / Math.PI });
    } else if (player.climbing) {
      drawRigLayoutPart(parts, layout, 'climbArm', 'armClimb', scale, { y: climbBob, rotation: -4 });
    } else {
      drawRigLayoutPart(parts, layout, 'arm', 'armNeutralB', scale, { rotation: stride * 11 });
    }
    ctx.restore();
    return true;
  }

  function drawRigLayoutPart(parts, layout, role, fallbackKey, baseScale, motion = {}) {
    const part = layout?.parts?.[role];
    if (!part) {
      if (role === 'leg') return drawRigPart(parts, fallbackKey, -5 + (motion.x || 0), -150 + (motion.y || 0), baseScale * 1.48, ((motion.rotation || 0) * Math.PI) / 180, 0.5, 0.76);
      if (role === 'torso') return drawRigPart(parts, fallbackKey, 0, -42, baseScale * 1.01, ((motion.rotation || 0) * Math.PI) / 180, 0.5, 0.88);
      if (role === 'head') return drawRigPart(parts, fallbackKey, -46 + (motion.x || 0), -198 + (motion.y || 0), baseScale * 0.95, ((motion.rotation || 0) * Math.PI) / 180, 0.38, 0.5);
      return drawRigPart(parts, fallbackKey, -38 + (motion.x || 0), -85 + (motion.y || 0), baseScale * 0.76, ((motion.rotation || 0) * Math.PI) / 180, 0.26, 0.14);
    }
    const key = parts[part.key] ? part.key : fallbackKey;
    return drawRigPart(
      parts,
      key,
      number(part.x, 0) + (motion.x || 0),
      number(part.y, 0) + (motion.y || 0),
      baseScale * number(part.scale, 1),
      (((number(part.rotation, 0) + (motion.rotation || 0)) * Math.PI) / 180),
      number(part.anchorX, 0.5),
      number(part.anchorY, 0.5)
    );
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
          const frame = asset.frame || { x: 0, y: 0, w: img?.width || 1, h: img?.height || 1 };
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
    const dir = building.collapse.dir;
    const pivotX = dir > 0 ? building.x + building.w : building.x;
    const pivotY = level.world.groundY;
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(dir * ease(t) * 0.78);
    ctx.translate(-pivotX, -pivotY + t * 45);
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
          const frame = asset.frame || { x: 0, y: 0, w: img.width, h: img.height };
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
    if (player.state === 'monster' && asset.rig?.type === 'lizork' && drawRiggedLizork(asset, spec, pulse)) return;
    // Other rigs (e.g. Vorgath) currently fall back to the static sprite until a generic animated rigged drawer is added.
    // The builder already supports posing them via the generic rig system.
    drawSprite({ ...asset, src: src || asset.src }, player.x - pulse / 2, player.y - pulse, spec.w + pulse, spec.h + pulse, player.facing < 0);
    if (!loadedImages.get(asset.src)) {
      ctx.fillStyle = '#4e6f84';
      ctx.fillRect(player.x - pulse / 2, player.y - pulse, spec.w + pulse, spec.h + pulse);
    }
  }

  function punchOrigin() {
    const spec = currentSize();
    const facing = player.climbing ? player.facing : player.facing || 1;
    return {
      x: player.x + spec.w * (facing > 0 ? 0.68 : 0.32),
      y: player.y + spec.h * 0.34
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
    const spec = currentSize();
    return { x: player.x, y: player.y, w: spec.w, h: spec.h };
  }

  function humanRect(human) {
    return { x: human.x, y: human.y, w: 32, h: 54 };
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
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
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

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    keys.add(key);
    if (key === ' ' || key === 'spacebar') input.jump = true;
    if (key === 'control' || key === 'j') { setDefaultAim(); input.punch = true; }
    if (key === 'q' || key === 'e') input.special = true;
    if (key === 'escape') paused = !paused;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

  startBtn.addEventListener('click', start);
  document.getElementById('restartBtn').addEventListener('click', start);
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const point = pointerWorld(event);
    if (event.button === 2) {
      input.eat = true;
    } else {
      player.aimX = point.x;
      player.aimY = point.y;
      input.punch = true;
    }
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  document.getElementById('jumpBtn').addEventListener('pointerdown', () => { input.jump = true; });
  document.getElementById('punchBtn').addEventListener('pointerdown', () => { setDefaultAim(); input.punch = true; });
  document.getElementById('eatBtn').addEventListener('pointerdown', () => { input.eat = true; });

  const stick = document.getElementById('mobileStick');
  const knob = document.getElementById('stickKnob');
  let stickId = null;
  function moveStick(event) {
    if (stickId !== event.pointerId) return;
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clamp((event.clientX - cx) / (rect.width / 2), -1, 1);
    const dy = clamp((event.clientY - cy) / (rect.height / 2), -1, 1);
    stickInput.x = Math.abs(dx) > 0.12 ? dx : 0;
    stickInput.y = Math.abs(dy) > 0.12 ? dy : 0;
    knob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
  }
  stick.addEventListener('pointerdown', (event) => {
    stickId = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    moveStick(event);
  });
  stick.addEventListener('pointermove', moveStick);
  function releaseStick() {
    stickId = null;
    stickInput.x = 0;
    stickInput.y = 0;
    knob.style.transform = 'translate(0, 0)';
  }
  stick.addEventListener('pointerup', releaseStick);
  stick.addEventListener('pointercancel', releaseStick);

  reset();
  draw();
  preloadPromise = preload().then(() => {
    if (!running) draw();
  }).catch(() => {});
  if (new URLSearchParams(window.location.search).has('autostart')) start();
})();
