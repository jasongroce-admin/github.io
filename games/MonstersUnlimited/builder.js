(() => {
  const STORAGE_KEY = 'monstersUnlimited.builder.level.v1';
  const RIG_STORAGE_KEY = 'monstersUnlimited.rig.v1';
  const assets = window.MONSTERS_UNLIMITED_ASSETS;
  const canvas = document.getElementById('builderCanvas');
  const ctx = canvas.getContext('2d');
  const els = {
    title: document.getElementById('levelTitle'),
    city: document.getElementById('cityName'),
    monster: document.getElementById('monsterId'),
    health: document.getElementById('health'),
    punch: document.getElementById('punchDamage'),
    speed: document.getElementById('speed'),
    climb: document.getElementById('climbSpeed'),
    buildingAsset: document.getElementById('buildingAsset'),
    humanAsset: document.getElementById('humanAsset'),
    humanKind: document.getElementById('humanKind'),
    vehicleAsset: document.getElementById('vehicleAsset'),
    rows: document.getElementById('rows'),
    cols: document.getElementById('cols'),
    hp: document.getElementById('buildingHp'),
    points: document.getElementById('points'),
    structuralLimit: document.getElementById('structuralLimit'),
    fallBias: document.getElementById('fallBias'),
    rigPanel: document.getElementById('rigPanel'),
    rigRole: document.getElementById('rigRole'),
    rigVariant: document.getElementById('rigVariant'),
    rigX: document.getElementById('rigX'),
    rigY: document.getElementById('rigY'),
    rigScale: document.getElementById('rigScale'),
    rigRotation: document.getElementById('rigRotation'),
    rigAnchorX: document.getElementById('rigAnchorX'),
    rigAnchorY: document.getElementById('rigAnchorY'),
    exportBox: document.getElementById('exportBox'),
    status: document.getElementById('status')
  };
  const rigRoles = [
    { id: 'torso', name: 'Torso / Body', fallbackKey: 'torsoSide', socket: null },
    { id: 'head', name: 'Head', fallbackKey: 'head', socket: 'neck' },
    { id: 'arm', name: 'Arm', fallbackKey: 'armNeutralB', socket: 'arm' },
    { id: 'punchArm', name: 'Punch Arm', fallbackKey: 'armPunchMounted', socket: 'arm' },
    { id: 'climbArm', name: 'Climb Arm', fallbackKey: 'armClimb', socket: 'arm' },
    { id: 'leg', name: 'Leg', fallbackKey: 'legsSide', socket: 'hip' }
  ];
  const defaultRigLayout = {
    baseScale: 0.86,
    facing: -1,
    parts: {
      torso: { key: 'torsoSide', x: 0, y: -42, scale: 1.01, rotation: 0, anchorX: 0.5, anchorY: 0.88 },
      head: { key: 'head', x: -46, y: -198, scale: 0.95, rotation: 0, anchorX: 0.38, anchorY: 0.5 },
      arm: { key: 'armNeutralB', x: -38, y: -85, scale: 0.76, rotation: -2, anchorX: 0.26, anchorY: 0.14 },
      punchArm: { key: 'armPunchMounted', x: -34, y: -134, scale: 0.92, rotation: 0, anchorX: 0.92, anchorY: 0.48 },
      climbArm: { key: 'armClimb', x: -45, y: -137, scale: 0.86, rotation: -22, anchorX: 0.2, anchorY: 0.16 },
      leg: { key: 'legsSide', x: -5, y: -150, scale: 1.48, rotation: 0, anchorX: 0.5, anchorY: 0.76 }
    },
    sockets: {
      neck: { x: -38, y: -170 },
      arm: { x: -38, y: -104 },
      hip: { x: -6, y: -70 }
    }
  };
  const imageCache = new Map();
  const loadedImages = new Map();
  const rigLayouts = loadRigLayouts();
  let level = loadLevel();
  let tool = 'select';
  let selected = null;
  let drag = null;
  let rigDrag = null;

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function loadLevel() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) return normalize(saved);
    } catch {}
    return normalize(clone(window.MONSTERS_UNLIMITED_LEVELS[0]));
  }

  function loadRigLayouts() {
    try {
      return JSON.parse(localStorage.getItem(RIG_STORAGE_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  function selectedMonster() {
    return find(assets.monsters, level.player.monsterId);
  }

  function rigLayoutFor(monsterId = level.player.monsterId) {
    const asset = find(assets.monsters, monsterId);
    const saved = rigLayouts[monsterId];
    return normalizeRigLayout(saved || asset.rig?.layout || defaultRigLayout);
  }

  function normalizeRigLayout(layout) {
    const next = clone(defaultRigLayout);
    if (!layout) return next;
    next.baseScale = number(layout.baseScale, next.baseScale);
    next.facing = Number(layout.facing || next.facing);
    next.sockets = { ...next.sockets, ...(layout.sockets || {}) };
    Object.entries(layout.parts || {}).forEach(([role, part]) => {
      next.parts[role] = { ...(next.parts[role] || {}), ...part };
    });
    return next;
  }

  function normalize(raw) {
    raw.world ||= { width: 1440, height: 760, groundY: 650, sky: '#8fb6d9', dusk: '#f6a15f' };
    raw.player ||= clone(window.MONSTERS_UNLIMITED_LEVELS[0].player);
    raw.player.monster ||= { w: 154, h: 218, speed: 245, climbSpeed: 215, jump: 585, punchDamage: 1 };
    raw.buildings ||= [];
    raw.humans ||= [];
    raw.vehicles ||= [];
    return raw;
  }

  function optionList(select, list) {
    select.innerHTML = list.map((item) => `<option value="${item.id}">${item.name}</option>`).join('');
  }

  function hydrate() {
    optionList(els.monster, assets.monsters);
    optionList(els.buildingAsset, assets.buildings);
    optionList(els.humanAsset, assets.humans);
    optionList(els.vehicleAsset, assets.vehicles);
    optionList(els.rigRole, rigRoles);
    hydrateRigVariants();
    writeForm();
    writeRigForm();
    preload().then(draw);
  }

  function hydrateRigVariants() {
    const asset = selectedMonster();
    const parts = asset.rig?.parts || {};
    els.rigVariant.innerHTML = Object.keys(parts)
      .map((key) => `<option value="${key}">${key}</option>`)
      .join('');
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
      if (r > 105 && g < 130 && b > 75 && r > g + 28 && b > g + 14 && Math.abs(r - b) < 150) {
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

  function readForm() {
    level.title = els.title.value.trim() || 'Untitled Level';
    level.city = els.city.value.trim() || 'Unknown City';
    level.player.monsterId = els.monster.value;
    level.player.health = number(els.health.value, 100);
    level.player.monster.punchDamage = number(els.punch.value, 1);
    level.player.monster.speed = number(els.speed.value, 245);
    level.player.monster.climbSpeed = number(els.climb.value, 215);
  }

  function writeForm() {
    els.title.value = level.title || '';
    els.city.value = level.city || '';
    els.monster.value = level.player.monsterId;
    els.health.value = level.player.health;
    els.punch.value = level.player.monster.punchDamage;
    els.speed.value = level.player.monster.speed;
    els.climb.value = level.player.monster.climbSpeed;
  }

  function draw() {
    readForm();
    if (tool === 'rig') {
      drawRigBuilder();
      requestAnimationFrame(draw);
      return;
    }
    const world = level.world;
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, world.sky);
    grad.addColorStop(0.68, world.dusk);
    grad.addColorStop(1, '#303238');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#303238';
    ctx.fillRect(0, world.groundY, canvas.width, 80);
    drawBuildings();
    drawHumans();
    drawVehicles();
    drawPlayer();
    drawSelection();
    requestAnimationFrame(draw);
  }

  function drawRigBuilder() {
    ctx.fillStyle = '#232832';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#303238';
    ctx.fillRect(0, 610, canvas.width, 110);
    ctx.fillStyle = '#9fb0c0';
    ctx.font = '800 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Monster Rig Builder', 24, 34);
    ctx.font = '13px Arial';
    ctx.fillStyle = '#c9d1dc';
    ctx.fillText('Drag pieces until the head, arm, and leg sit in the sockets. Save Rig, then Play uses these settings.', 24, 58);

    const asset = selectedMonster();
    if (!asset.rig?.parts) {
      ctx.fillStyle = '#f2c14e';
      ctx.fillText('This monster has no separated rig parts yet.', 24, 90);
      return;
    }
    const root = rigRoot();
    drawRigAssembly(asset, root.x, root.y, rigLayoutFor(), true);
  }

  function drawBuildings() {
    level.buildings.forEach((building) => {
      const asset = find(assets.buildings, building.assetId);
      const img = loadedImages.get(asset.src);
      if (!img) {
        ctx.fillStyle = '#6b3e36';
        ctx.fillRect(building.x, building.y, building.w, building.h);
      } else {
        drawBuildingImage(building, img);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      for (let r = 1; r < building.rows; r++) line(building.x, building.y + (r * building.h) / building.rows, building.x + building.w, building.y + (r * building.h) / building.rows);
      for (let c = 1; c < building.cols; c++) line(building.x + (c * building.w) / building.cols, building.y, building.x + (c * building.w) / building.cols, building.y + building.h);
    });
  }

  function drawBuildingImage(building, img) {
    const asset = find(assets.buildings, building.assetId);
    const frame = asset.frame || { x: 0, y: 0, w: img.width, h: img.height };
    ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, building.x, building.y, building.w, building.h);
  }

  function drawHumans() {
    level.humans.forEach((human) => {
      const asset = find(assets.humans, human.assetId);
      drawSprite(asset, human.x, human.y, human.w || 32, human.h || 54, human.dir < 0);
    });
  }

  function drawVehicles() {
    level.vehicles.forEach((vehicle) => {
      const asset = find(assets.vehicles, vehicle.assetId);
      drawSprite(asset, vehicle.x, vehicle.y, 104, 50, vehicle.dir < 0);
    });
  }

  function drawPlayer() {
    const asset = find(assets.monsters, level.player.monsterId);
    if (asset.rig?.parts && drawRiggedPlayer(asset, level.player.x, level.world.groundY - level.player.monster.h, level.player.monster.w, level.player.monster.h)) return;
    drawSprite(asset, level.player.x, level.world.groundY - level.player.monster.h, level.player.monster.w, level.player.monster.h, false);
  }

  function drawRigPart(parts, name, x, y, scale, rotation = 0, anchorX = 0.5, anchorY = 0.5) {
    const img = loadedImages.get(parts[name]);
    if (!img) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(img, -img.width * anchorX * scale, -img.height * anchorY * scale, img.width * scale, img.height * scale);
    ctx.restore();
    return true;
  }

  function drawRiggedPlayer(asset, x, y, w, h) {
    // Generic rigged preview for any monster that defines rig.parts.
    // Uses per-monster saved layouts (from Rig tool "Save Rig") when available,
    // otherwise falls back to the monster's rig.layout or the shared defaultRigLayout.
    // This lets new rigs (e.g. Vorgath) be previewed and adjusted in the builder immediately.
    if (drawRigAssembly(asset, x + w * 0.48, y + h * 0.96, rigLayoutFor(asset.id), false, h / 218)) return true;

    // Legacy hard-coded default only for the original lizork rig (kept for safety during transition).
    if (asset.rig?.type === 'lizork') {
      const parts = asset.rig?.parts;
      if (!parts || !loadedImages.get(parts.torsoSide) || !loadedImages.get(parts.legsSide) || !loadedImages.get(parts.head)) return false;
      const scale = h / 252;
      const rootX = x + w * 0.48;
      const rootY = y + h * 0.96;
      ctx.save();
      ctx.translate(rootX, rootY);
      ctx.scale(-1, 1);
      // +5+ pixels forward on head to cover black neck socket.
      // Legs at clear leg socket under the body bottom.
      drawRigPart(parts, 'legsSide', -5, -150, scale * 1.48, 0, 0.5, 0.76);
      drawRigPart(parts, 'torsoSide', 0, -42, scale * 1.01, 0, 0.5, 0.88);
      drawRigPart(parts, 'head', -46, -198, scale * 0.95, 0, 0.38, 0.50);
      drawRigPart(parts, 'armNeutralB', -38, -85, scale * 0.76, -0.03, 0.26, 0.14);
      ctx.restore();
      return true;
    }

    return false;
  }

  function rigRoot() {
    return { x: canvas.width * 0.58, y: 520 };
  }

  function rigPartImage(asset, role, layout = rigLayoutFor(asset.id)) {
    const roleDef = rigRoles.find((item) => item.id === role);
    const part = layout.parts[role] || {};
    const key = part.key || roleDef?.fallbackKey;
    const src = asset.rig?.parts?.[key];
    return src ? loadedImages.get(src) : null;
  }

  function drawRigAssembly(asset, rootX, rootY, layout, showControls, targetScale = 1) {
    const parts = asset.rig?.parts;
    if (!parts) return false;
    const baseScale = (layout.baseScale || 1) * targetScale;
    const selectedRole = els.rigRole.value || 'torso';
    ctx.save();
    ctx.translate(rootX, rootY);
    ctx.scale(layout.facing || -1, 1);
    ['leg', 'torso', 'head', 'arm'].forEach((role) => drawRigRole(asset, layout, role, baseScale, showControls && selectedRole === role));
    if (showControls) {
      drawSockets(layout, baseScale);
      drawRigRole(asset, layout, selectedRole, baseScale, true);
    }
    ctx.restore();
    return true;
  }

  function drawRigRole(asset, layout, role, baseScale, selectedRole) {
    const part = layout.parts[role];
    if (!part) return false;
    const src = asset.rig?.parts?.[part.key];
    const img = src ? loadedImages.get(src) : null;
    if (!img) return false;
    const scale = baseScale * number(part.scale, 1);
    ctx.save();
    ctx.translate(part.x, part.y);
    ctx.rotate((number(part.rotation, 0) * Math.PI) / 180);
    ctx.drawImage(img, -img.width * number(part.anchorX, 0.5) * scale, -img.height * number(part.anchorY, 0.5) * scale, img.width * scale, img.height * scale);
    if (selectedRole) {
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 2 / baseScale;
      ctx.strokeRect(-img.width * number(part.anchorX, 0.5) * scale, -img.height * number(part.anchorY, 0.5) * scale, img.width * scale, img.height * scale);
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.arc(0, 0, 5 / baseScale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return true;
  }

  function drawSockets(layout, baseScale) {
    Object.entries(layout.sockets || {}).forEach(([name, socket]) => {
      ctx.fillStyle = name === 'neck' ? '#74e48c' : name === 'arm' ? '#f2c14e' : '#6fe7ff';
      ctx.beginPath();
      ctx.arc(socket.x, socket.y, 7 / baseScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.scale(layout.facing || -1, 1);
      ctx.fillStyle = '#e9eef6';
      ctx.font = `${12 / baseScale}px Arial`;
      ctx.fillText(name, -(socket.x * (layout.facing || -1)) + 10, socket.y - 8);
      ctx.restore();
    });
  }

  function drawSprite(asset, x, y, w, h, flip) {
    const img = loadedImages.get(asset.src);
    if (!img) return;
    const f = asset.frame || { x: 0, y: 0, w: img.width, h: img.height };
    ctx.save();
    if (flip) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, w, h);
    } else {
      ctx.drawImage(img, f.x, f.y, f.w, f.h, x, y, w, h);
    }
    ctx.restore();
  }

  function drawSelection() {
    if (!selected) return;
    const rect = getRect(selected);
    ctx.save();
    ctx.setLineDash([8, 5]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f2c14e';
    ctx.strokeRect(rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8);
    ctx.restore();
  }

  function addAt(x, y) {
    if (tool === 'building') {
      const w = 170;
      const h = 410;
      const building = {
        id: `building-${Date.now().toString(36)}`,
        assetId: els.buildingAsset.value,
        x: Math.round(x - w / 2),
        y: Math.round(level.world.groundY - h),
        w,
        h,
        cols: number(els.cols.value, 3),
        rows: number(els.rows.value, 7),
        hp: number(els.hp.value, 2),
        points: number(els.points.value, 80),
        structuralLimit: clamp(number(els.structuralLimit.value, 50) / 100, 0.25, 0.9),
        fallBias: ['auto', 'left', 'right'].includes(els.fallBias.value) ? els.fallBias.value : 'auto'
      };
      level.buildings.push(building);
      selected = { type: 'building', ref: building };
    }
    if (tool === 'human') {
      const kind = els.humanKind.value === 'ground' ? 'ground' : 'window';
      const human = {
        id: `human-${Date.now().toString(36)}`,
        assetId: els.humanAsset.value,
        kind,
        x: Math.round(x),
        y: kind === 'ground' ? level.world.groundY - 54 : Math.round(y),
        w: kind === 'ground' ? 44 : 34,
        h: kind === 'ground' ? 54 : 48,
        dir: 1
      };
      level.humans.push(human);
      selected = { type: 'human', ref: human };
    }
    if (tool === 'vehicle') {
      const vehicle = { id: `vehicle-${Date.now().toString(36)}`, assetId: els.vehicleAsset.value, x: Math.round(x), y: level.world.groundY - 40, dir: -1, speed: 64, health: 2 };
      level.vehicles.push(vehicle);
      selected = { type: 'vehicle', ref: vehicle };
    }
    setStatus(`Added ${tool}.`);
  }

  function pick(x, y) {
    const all = [
      ...level.buildings.map((ref) => ({ type: 'building', ref })),
      ...level.humans.map((ref) => ({ type: 'human', ref })),
      ...level.vehicles.map((ref) => ({ type: 'vehicle', ref }))
    ].reverse();
    selected = all.find((item) => inside({ x, y }, getRect(item))) || null;
    if (selected) setStatus(`Selected ${selected.type}.`);
    writeSelectedForm();
  }

  function getRect(item) {
    if (item.type === 'building') return item.ref;
    if (item.type === 'human') return { x: item.ref.x, y: item.ref.y, w: item.ref.w || 32, h: item.ref.h || 54 };
    return { x: item.ref.x, y: item.ref.y, w: 104, h: 50 };
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = clone(selected.ref);
    copy.id = `${selected.type}-${Date.now().toString(36)}`;
    copy.x += 36;
    if (selected.type === 'building') level.buildings.push(copy);
    if (selected.type === 'human') level.humans.push(copy);
    if (selected.type === 'vehicle') level.vehicles.push(copy);
    selected = { type: selected.type, ref: copy };
    setStatus('Duplicated.');
  }

  function deleteSelected() {
    if (!selected) return;
    const list = selected.type === 'building' ? level.buildings : selected.type === 'human' ? level.humans : level.vehicles;
    const index = list.indexOf(selected.ref);
    if (index >= 0) list.splice(index, 1);
    selected = null;
    setStatus('Deleted.');
  }

  function writeSelectedForm() {
    if (!selected) return;
    if (selected.type === 'human') {
      els.humanAsset.value = selected.ref.assetId || els.humanAsset.value;
      els.humanKind.value = selected.ref.kind === 'ground' ? 'ground' : 'window';
      return;
    }
    if (selected.type !== 'building') return;
    const building = selected.ref;
    els.buildingAsset.value = building.assetId || els.buildingAsset.value;
    els.rows.value = building.rows || 7;
    els.cols.value = building.cols || 3;
    els.hp.value = building.hp || 2;
    els.points.value = building.points || 80;
    els.structuralLimit.value = Math.round(clamp(Number(building.structuralLimit || 0.5), 0.25, 0.9) * 100);
    els.fallBias.value = ['auto', 'left', 'right'].includes(building.fallBias) ? building.fallBias : 'auto';
  }

  function applySelectedForm() {
    if (!selected) return;
    if (selected.type === 'human') {
      selected.ref.assetId = els.humanAsset.value;
      selected.ref.kind = els.humanKind.value === 'ground' ? 'ground' : 'window';
      selected.ref.w = selected.ref.kind === 'ground' ? 44 : 34;
      selected.ref.h = selected.ref.kind === 'ground' ? 54 : 48;
      return;
    }
    if (selected.type !== 'building') return;
    const building = selected.ref;
    building.assetId = els.buildingAsset.value;
    building.rows = clamp(number(els.rows.value, building.rows), 2, 14);
    building.cols = clamp(number(els.cols.value, building.cols), 2, 6);
    building.hp = clamp(number(els.hp.value, building.hp), 1, 8);
    building.points = clamp(number(els.points.value, building.points), 10, 500);
    building.structuralLimit = clamp(number(els.structuralLimit.value, 50) / 100, 0.25, 0.9);
    building.fallBias = ['auto', 'left', 'right'].includes(els.fallBias.value) ? els.fallBias.value : 'auto';
  }

  function exportLevel() {
    readForm();
    const text = `window.MONSTERS_UNLIMITED_LEVELS = ${JSON.stringify([level], null, 2)};`;
    els.exportBox.value = text;
    navigator.clipboard?.writeText(text).catch(() => {});
    setStatus('Level JavaScript exported and copied when clipboard is available.');
  }

  function writeRigForm() {
    const layout = rigLayoutFor();
    const role = els.rigRole.value || rigRoles[0].id;
    const roleDef = rigRoles.find((item) => item.id === role) || rigRoles[0];
    const part = layout.parts[role] || layout.parts[roleDef.id] || {};
    hydrateRigVariants();
    els.rigVariant.value = part.key || roleDef.fallbackKey;
    els.rigX.value = Math.round(number(part.x, 0));
    els.rigY.value = Math.round(number(part.y, 0));
    els.rigScale.value = Number(number(part.scale, 1).toFixed(2));
    els.rigRotation.value = Math.round(number(part.rotation, 0));
    els.rigAnchorX.value = Number(number(part.anchorX, 0.5).toFixed(2));
    els.rigAnchorY.value = Number(number(part.anchorY, 0.5).toFixed(2));
  }

  function applyRigForm() {
    const monsterId = level.player.monsterId;
    const layout = rigLayoutFor(monsterId);
    const role = els.rigRole.value || rigRoles[0].id;
    const roleDef = rigRoles.find((item) => item.id === role) || rigRoles[0];
    layout.parts[role] = {
      ...(layout.parts[role] || {}),
      key: els.rigVariant.value || roleDef.fallbackKey,
      x: number(els.rigX.value, 0),
      y: number(els.rigY.value, 0),
      scale: number(els.rigScale.value, 1),
      rotation: number(els.rigRotation.value, 0),
      anchorX: clamp(number(els.rigAnchorX.value, 0.5), 0, 1),
      anchorY: clamp(number(els.rigAnchorY.value, 0.5), 0, 1)
    };
    rigLayouts[monsterId] = layout;
  }

  function saveRigLocal() {
    applyRigForm();
    localStorage.setItem(RIG_STORAGE_KEY, JSON.stringify(rigLayouts));
    setStatus('Rig saved. The Play page will use these socket settings.');
  }

  function exportRig() {
    applyRigForm();
    const monsterId = level.player.monsterId;
    const text = `"layout": ${JSON.stringify(rigLayouts[monsterId], null, 2)}`;
    els.exportBox.value = text;
    navigator.clipboard?.writeText(text).catch(() => {});
    setStatus('Rig layout exported and copied when clipboard is available.');
  }

  function resetRigPose() {
    rigLayouts[level.player.monsterId] = clone(defaultRigLayout);
    writeRigForm();
    setStatus('Rig pose reset for this monster.');
  }

  function snapRigPartToSocket() {
    applyRigForm();
    const role = els.rigRole.value || 'torso';
    const roleDef = rigRoles.find((item) => item.id === role);
    if (!roleDef?.socket) {
      setStatus('Torso is the base piece. Pick Head, Arm, or Leg to snap.');
      return;
    }
    const monsterId = level.player.monsterId;
    const layout = rigLayoutFor(monsterId);
    const socket = layout.sockets?.[roleDef.socket];
    if (!socket || !layout.parts[role]) return;
    layout.parts[role].x = socket.x;
    layout.parts[role].y = socket.y;
    rigLayouts[monsterId] = layout;
    writeRigForm();
    setStatus(`${roleDef.name} snapped to ${roleDef.socket} socket.`);
  }

  function saveLocal() {
    readForm();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(level));
    setStatus('Saved in this browser.');
  }

  function pointer(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const p = pointer(event);
    if (tool === 'rig') {
      applyRigForm();
      const root = rigRoot();
      const layout = rigLayoutFor();
      const role = els.rigRole.value || 'torso';
      const part = layout.parts[role];
      rigDrag = { role, dx: p.x - (root.x + part.x * (layout.facing || -1)), dy: p.y - (root.y + part.y) };
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (tool === 'select') pick(p.x, p.y);
    else addAt(p.x, p.y);
    if (selected) {
      const r = getRect(selected);
      drag = { dx: p.x - r.x, dy: p.y - r.y };
      canvas.setPointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (rigDrag) {
      const p = pointer(event);
      const root = rigRoot();
      const monsterId = level.player.monsterId;
      const layout = rigLayoutFor(monsterId);
      const part = layout.parts[rigDrag.role];
      part.x = Math.round((p.x - rigDrag.dx - root.x) / (layout.facing || -1));
      part.y = Math.round(p.y - rigDrag.dy - root.y);
      rigLayouts[monsterId] = layout;
      writeRigForm();
      return;
    }
    if (!drag || !selected) return;
    const p = pointer(event);
    selected.ref.x = Math.round(p.x - drag.dx);
    if (selected.type === 'building') selected.ref.y = Math.round(clamp(p.y - drag.dy, 30, level.world.groundY - 80));
    else selected.ref.y = Math.round(p.y - drag.dy);
  });

  canvas.addEventListener('pointerup', () => { drag = null; rigDrag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; rigDrag = null; });

  document.querySelectorAll('[data-tool]').forEach((button) => {
    button.addEventListener('click', () => {
      tool = button.dataset.tool;
      document.querySelectorAll('[data-tool]').forEach((btn) => btn.classList.toggle('active', btn === button));
      els.rigPanel.classList.toggle('hidden', tool !== 'rig');
      if (tool === 'rig') {
        selected = null;
        writeRigForm();
      }
      setStatus(`${button.textContent} tool active.`);
    });
  });
  document.getElementById('duplicateBtn').addEventListener('click', duplicateSelected);
  document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
  document.getElementById('saveBtn').addEventListener('click', saveLocal);
  document.getElementById('exportBtn').addEventListener('click', exportLevel);
  document.getElementById('rigSaveBtn').addEventListener('click', saveRigLocal);
  document.getElementById('rigExportBtn').addEventListener('click', exportRig);
  document.getElementById('rigResetBtn').addEventListener('click', resetRigPose);
  document.getElementById('rigSnapBtn').addEventListener('click', snapRigPartToSocket);
  els.monster.addEventListener('change', () => {
    hydrateRigVariants();
    writeRigForm();
  });
  [els.rigRole, els.rigVariant, els.rigX, els.rigY, els.rigScale, els.rigRotation, els.rigAnchorX, els.rigAnchorY].forEach((el) => {
    el.addEventListener('change', () => {
      if (el === els.rigRole) writeRigForm();
      else applyRigForm();
      setStatus('Rig settings updated.');
    });
  });
  Object.values(els).forEach((el) => el?.addEventListener?.('change', () => {
    if ([els.rigRole, els.rigVariant, els.rigX, els.rigY, els.rigScale, els.rigRotation, els.rigAnchorX, els.rigAnchorY].includes(el)) return;
    readForm();
    applySelectedForm();
    setStatus('Settings updated.');
  }));

  function setStatus(text) {
    els.status.textContent = text;
  }

  function find(list, id) {
    return list.find((item) => item.id === id) || list[0];
  }

  function number(value, fallback) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function inside(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  hydrate();
  if (new URLSearchParams(window.location.search).get('rig') === '1') {
    window.setTimeout(() => document.querySelector('[data-tool="rig"]')?.click(), 0);
  }
})();
