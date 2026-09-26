(() => {
  "use strict";

  const W = 1400;
  const H = 760;
  // Pull back to 62% for a wider battlefield while retaining readable tanks.
  const WORLD_ZOOM = .62;
  const TERRAIN_OVERDRAW = 520;
  const TERRAIN_BOTTOM_OVERDRAW = 220;
  const SURFACE_BASE = 640;
  const STEP = 8;
  // Authored composition rules: maps keep a low near-side entry deck, a raised
  // far-side firing shelf, and a tall center ridge. Seeded detail varies around
  // these anchors, never through spawn pads or named object placements.
  const FIELD_LAYOUT = {
    leftStart: 92, rightStart: W - 92, moveMin: -250, moveMax: 1650,
    leftLandmark: 310, rightLandmark: W - 310, benchFlatRadius: 92, benchFadeRadius: 62,
    nearDeckY: 622, farDeckY: 516, farScale: .74, nearScale: 1.08,
  };
  const FIELD_SCENES = [
    { name: "DUSK FRONT", depth: { nearY: 622, farY: 516, ridgeX: .50, ridgeWidth: 320, ridgeHeight: 354 }, placements: [
      { id: 0, type: "bunker", side: "left", width: 116, height: 78, hp: 150, variant: 1 },
      { id: 1, type: "wall", side: "right", width: 148, height: 56, hp: 135, variant: 0 }
    ] },
    { name: "ASHEN RIDGE", depth: { nearY: 630, farY: 526, ridgeX: .48, ridgeWidth: 304, ridgeHeight: 330 }, placements: [
      { id: 0, type: "jeep", side: "left", width: 150, height: 104, hp: 115, variant: 0 },
      { id: 1, type: "tree", side: "right", width: 142, height: 166, hp: 85, variant: 1, visualScale: 1.24 }
    ] },
    { name: "BROKEN PASS", depth: { nearY: 614, farY: 508, ridgeX: .52, ridgeWidth: 340, ridgeHeight: 366 }, placements: [
      { id: 0, type: "wall", side: "left", width: 148, height: 56, hp: 135, variant: 0 },
      { id: 1, type: "bunker", side: "right", width: 116, height: 78, hp: 150, variant: 0 }
    ] },
    { name: "IRON VALLEY", depth: { nearY: 626, farY: 532, ridgeX: .49, ridgeWidth: 298, ridgeHeight: 342 }, placements: [
      { id: 0, type: "tree", side: "left", width: 142, height: 166, hp: 85, variant: 0, visualScale: 1.24 },
      { id: 1, type: "jeep", side: "right", width: 150, height: 104, hp: 115, variant: 1 }
    ] },
    { name: "CINDER LINE", depth: { nearY: 618, farY: 512, ridgeX: .51, ridgeWidth: 326, ridgeHeight: 358 }, placements: [
      { id: 0, type: "bunker", side: "left", width: 116, height: 78, hp: 150, variant: 1 },
      { id: 1, type: "jeep", side: "right", width: 150, height: 104, hp: 115, variant: 1 }
    ] }
  ];
  const canvas = document.querySelector("#battlefield");
  const ctx = canvas.getContext("2d", { alpha: false });
  const $ = (id) => document.getElementById(id);
  const angleInput = $("angle");
  const powerInput = $("power");
  const weaponSelect = $("weapon");
  const fireButton = $("fire");
  const background = new Image();
  background.src = "assets/battlefield-dusk.jpg";
  const tankImage = new Image();
  tankImage.src = "assets/tank-realistic-base-v2-2x.png";

  const weapons = [
    { key: "shell", name: "120mm Shell", unlock: 1, speed: 11, radius: 45, damage: 34, color: "#ffc66d", trail: "#ffe7ba", class: "KINETIC / HE", desc: "Standard high-explosive shell", effect: "blast" },
    { key: "heavy", name: "Heavy Buster", unlock: 3, speed: 8.8, radius: 63, damage: 58, color: "#ff8b4d", trail: "#ffc078", class: "SIEGE / BREACH", desc: "Slow, heavy bunker-buster", effect: "heavy" },
    { key: "ice", name: "Freeze Bomb", unlock: 4, speed: 9.3, radius: 52, damage: 23, color: "#84e7ff", trail: "#c7fbff", class: "CRYO / SHATTER", desc: "Cryogenic burst; disrupts armor", effect: "ice" },
    { key: "cluster", name: "Cluster Storm", unlock: 6, speed: 10.2, radius: 22, damage: 18, color: "#ffcf66", trail: "#ffe8a3", class: "MULTI / FRAG", desc: "Splits into four bomblets in flight", effect: "cluster" },
    { key: "emp", name: "EMP Bomb", unlock: 8, speed: 9.4, radius: 69, damage: 19, color: "#61e4df", trail: "#c0ffff", class: "ELECTRIC / EMP", desc: "Wide, low-damage electrical pulse", effect: "emp" },
    { key: "napalm", name: "Napalm Bloom", unlock: 10, speed: 9, radius: 50, damage: 22, color: "#ff692f", trail: "#ffbd60", class: "INCENDIARY / DOT", desc: "Scatters burning fuel across the ground", effect: "fire" },
    { key: "lava", name: "Lava Spill", unlock: 12, speed: 8.2, radius: 42, damage: 29, color: "#ff5229", trail: "#ffbc52", class: "THERMAL / HAZARD", desc: "Molten splash leaves a hot ground hazard", effect: "lava" },
    { key: "acid", name: "Acid Splash", unlock: 14, speed: 9.6, radius: 47, damage: 28, color: "#b5f15d", trail: "#e7ff91", class: "CORROSIVE / AREA", desc: "Caustic spray clouds the impact zone", effect: "acid" },
    { key: "plasma", name: "Plasma Flash", unlock: 16, speed: 12, radius: 58, damage: 42, color: "#d279ff", trail: "#f5c7ff", class: "ENERGY / THERMO", desc: "Fast, bright pulse of superheated plasma", effect: "plasma" },
    { key: "lightning", name: "Lightning Shot", unlock: 18, speed: 12.5, radius: 55, damage: 38, color: "#fff27a", trail: "#ffffd4", class: "ARC / CONDUCTIVE", desc: "Electrical fork chains toward nearby armor", effect: "lightning" },
    { key: "rail", name: "Rail Lance", unlock: 20, speed: 21, radius: 24, damage: 50, color: "#69d9ff", trail: "#e9ffff", class: "KINETIC / PIERCE", desc: "Flat, fast penetrator with a narrow crater", effect: "rail" },
    { key: "quantum", name: "Quantum Obliterator", unlock: 24, speed: 8.1, radius: 78, damage: 68, color: "#f179dc", trail: "#ffd6fa", class: "EXOTIC / SINGULARITY", desc: "Slow implosion followed by a wide rupture", effect: "quantum" }
  ];
  // CPU solutions deliberately carry range and gun-laying error. Recruit fires
  // broad ranging shots; Elite is sharper, but none has perfect aim.
  const CPU_SKILL = {
    recruit: { impactError: 245, angleError: 2.4, chargeError: 8 },
    veteran: { impactError: 165, angleError: 1.5, chargeError: 5 },
    elite: { impactError: 105, angleError: .8, chargeError: 3 },
  };
  const terrain = [];
  const obstacles = [];
  const terrainLayer = document.createElement("canvas");
  terrainLayer.width = W + TERRAIN_OVERDRAW * 2; terrainLayer.height = H + TERRAIN_BOTTOM_OVERDRAW;
  const terrainCtx = terrainLayer.getContext("2d");
  let terrainSkyMask = null;
  let soilNoisePattern = null;
  let terrainDirty = true;
  const groundTexture = new Image();
  groundTexture.onload = () => { terrainDirty = true; };
  groundTexture.src = "assets/ground-grit-640.jpg";
  let groundTexturePattern = null;
  const structureAtlases = {
    bunker: new Image(), wall: new Image(), jeep: new Image(), tree: new Image()
  };
  const structureAtlasPaths = {
    bunker: "assets/field/bunker-45-damage-atlas.png", wall: "assets/field/stone-wall-damage-atlas.png",
    jeep: "assets/field/scout-jeep-45-damage-atlas.png", tree: "assets/field/alien-tree-damage-atlas.png"
  };
  function getStructureAtlas(type) {
    const atlas = structureAtlases[type];
    if (atlas && !atlas.src) atlas.src = structureAtlasPaths[type];
    return atlas;
  }
  const bunkerImage = structureAtlases.bunker; // Keep the procedural fallback safe while the atlas is still loading.
  const particles = [];
  const MAX_PARTICLES = 560;
  function addParticle(particle) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(particle);
  }
  const projectiles = [];
  const effects = [];
  const hazards = [];
  const ambientSmoke = [];
  const colors = { left: ["#9a6a48", "#c79a63"], right: ["#526e70", "#8eb1a6"] };
  const modeNames = { skirmish: "SKIRMISH / FIELD TEST", campaign: "CAMPAIGN / OPERATION", night: "NIGHT CAMPAIGN / OPERATION", endless: "ENDLESS WAR / SECTOR", custom: "CUSTOM / BATTLEFIELD" };
  const state = {
    tanks: [], turnIndex: 0, turn: 1, level: 1, seed: 7821, mode: "skirmish", opponent: "cpu", formation: 2, sceneIndex: 0,
    difficulty: "recruit", weather: "clear", smoke: "thin", support: "off", supportUsed: { left: false, right: false },
    angle: 12, power: 63, weapon: "shell", moving: false, aiMove: null, night: false, assist: false,
    winner: "", toastTimer: 0, mapName: "DUSK FRONT", rain: [], shake: 0, lastTime: 0
  };

  function rand(seed) {
    let x = seed >>> 0;
    return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function smoothstep(value) { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); }
  // A lightweight side-view perspective cheat: the ground and tank silhouettes
  // recede together from the near-left camera lane toward the far-right shelf.
  function battlefieldScale(x) {
    const depth = (x - FIELD_LAYOUT.leftStart) / (FIELD_LAYOUT.rightStart - FIELD_LAYOUT.leftStart);
    return FIELD_LAYOUT.nearScale + (FIELD_LAYOUT.farScale - FIELD_LAYOUT.nearScale) * smoothstep(depth);
  }
  function activeTank() { return state.tanks[state.turnIndex] || state.tanks[0]; }
  function living(team) { return state.tanks.filter((tank) => tank.alive && (!team || tank.team === team)); }
  function weaponData(key = state.weapon) { return weapons.find((item) => item.key === key) || weapons[0]; }
  function announce(message) {
    const box = $("toast"); box.textContent = message; box.classList.add("visible");
    clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => box.classList.remove("visible"), 1850);
  }
  function surfaceY(x) {
    const i = Math.max(0, Math.min(terrain.length - 1, Math.round(x / STEP)));
    return terrain[i] ?? 570;
  }
  function terrainSlope(x) {
    return Math.max(-.24, Math.min(.24, Math.atan2(surfaceY(x + 22) - surfaceY(x - 22), 44)));
  }
  function terrainOverdrawY(x) {
    const ext = TERRAIN_OVERDRAW;
    const hermite = (t, y0, y1, tangent0, tangent1) => {
      const t2 = t * t, t3 = t2 * t;
      return (2*t3 - 3*t2 + 1) * y0 + (t3 - 2*t2 + t) * tangent0 + (-2*t3 + 3*t2) * y1 + (t3 - t2) * tangent1;
    };
    if (x < 0) return hermite((x + ext) / ext, SURFACE_BASE, surfaceY(0), 0, Math.tan(terrainSlope(0)) * ext);
    if (x > W) return hermite((x - W) / ext, surfaceY(W), SURFACE_BASE, Math.tan(terrainSlope(W)) * ext, 0);
    return surfaceY(x);
  }
  function createTerrain() {
    const r = rand(state.seed);
    const scene = FIELD_SCENES[state.sceneIndex];
    const profile = scene.depth;
    terrain.length = 0;
    const count = Math.ceil(W / STEP) + 1;
    const hillCenters = [0.25, 0.38, 0.64, 0.76].map((p) => p * W + (r() - 0.5) * 70);
    const hills = hillCenters.map((x) => ({ x, width: 80 + r() * 95, height: 34 + r() * 68 }));
    // This authored ridge is deliberately taller than the flanks. It creates a
    // broad, uneven mountain chain rather than a centered triangular mound.
    const ridgeCenter = W * profile.ridgeX + (r() - 0.5) * 28;
    const ridgeWidth = profile.ridgeWidth * (0.96 + r() * 0.08);
    hills.push({ x: ridgeCenter - ridgeWidth * .52, width: ridgeWidth * .55, height: profile.ridgeHeight * .07 });
    hills.push({ x: ridgeCenter, width: ridgeWidth, height: profile.ridgeHeight * .78 });
    hills.push({ x: ridgeCenter + ridgeWidth * .48, width: ridgeWidth * .48, height: profile.ridgeHeight * .1 });
    let drift = 0;
    for (let i = 0; i < count; i++) {
      const x = i * STEP;
      const depth = smoothstep(x / W);
      const deck = profile.nearY + (profile.farY - profile.nearY) * depth;
      drift = drift * 0.78 + (r() - 0.5) * 9;
      let y = deck + drift + Math.sin(x * 0.007 + state.seed) * 11 + Math.sin(x * 0.018) * 4;
      for (const hill of hills) {
        const d = Math.abs(x - hill.x) / hill.width;
        if (d < 1) {
          const shape = hill.width > 200 ? Math.pow(Math.max(0, 1 - d * d), 1.55) : Math.cos(d * Math.PI / 2) ** 2;
          const roughness = hill.width > 200 ? Math.sin(x * .034 + state.seed * .001) * 5 : 0;
          y -= shape * (hill.height + roughness);
        }
      }
      terrain.push(clamp(y, 235, H - 25));
    }
    for (let pass = 0; pass < 2; pass++) {
      const copy = terrain.slice();
      for (let i = 1; i < terrain.length - 1; i++) terrain[i] = (copy[i - 1] + copy[i] * 2 + copy[i + 1]) / 4;
    }
    // Level tank decks and prop pads are part of the map recipe, not random
    // placement fixes. Each pad blends out beyond its footprint so props and
    // tracks sit on the ground without an obvious cut line.
    const pads = [
      { x: FIELD_LAYOUT.leftStart, y: profile.nearY, flat: 124, fade: 66 },
      { x: FIELD_LAYOUT.rightStart, y: profile.farY, flat: 106, fade: 58 },
    ];
    for (const placement of FIELD_SCENES[state.sceneIndex].placements) {
      const center = placement.side === "left" ? FIELD_LAYOUT.leftLandmark : FIELD_LAYOUT.rightLandmark;
      pads.push({ x: center, y: terrain[Math.round(center / STEP)], flat: FIELD_LAYOUT.benchFlatRadius, fade: FIELD_LAYOUT.benchFadeRadius });
    }
    for (const pad of pads) {
      const natural = terrain.slice();
      for (let i = 0; i < terrain.length; i++) {
        const x = i * STEP, distance = Math.abs(x - pad.x);
        const fadeStart = pad.flat, fadeEnd = fadeStart + pad.fade;
        if (distance >= fadeEnd) continue;
        const t = Math.max(0, (distance - fadeStart) / pad.fade);
        const blend = 1 - t * t * (3 - 2 * t);
        terrain[i] = natural[i] * (1 - blend) + pad.y * blend;
      }
    }
    ambientSmoke.length = 0;
    const smokeRandom = rand(state.seed + 9077);
    for (let i = 0; i < 34; i++) {
      const direction = smokeRandom() < .5 ? -1 : 1;
      const life = 460 + smokeRandom() * 560;
      ambientSmoke.push({ x: smokeRandom() * W, y: 285 + smokeRandom() * 255,
        vx: direction * (.035 + smokeRandom() * .07), vy: -.012 - smokeRandom() * .022,
        size: 26 + smokeRandom() * 40, life, maxLife: life, phase: smokeRandom() * Math.PI * 2 });
    }
    terrainDirty = true;
  }
  function generateObstacles() {
    obstacles.length = 0;
    for (const placement of FIELD_SCENES[state.sceneIndex].placements) {
      const x = placement.side === "left" ? FIELD_LAYOUT.leftLandmark : FIELD_LAYOUT.rightLandmark;
      obstacles.push({ ...placement, x, maxHp: placement.hp, active: true });
    }
  }
  function setFormation(count = 2) {
    state.formation = count;
    // The hero begins on the near shelf; hostiles begin on the raised far shelf.
    // Four-tank formations use authored shoulders between spawn pads and ridge.
    const leftXs = count === 4 ? [FIELD_LAYOUT.leftStart, 490] : [FIELD_LAYOUT.leftStart];
    const rightXs = count === 4 ? [910, FIELD_LAYOUT.rightStart] : [FIELD_LAYOUT.rightStart];
    const left = leftXs.map((x, i) => ({ id: `L${i + 1}`, team: "left", x, hp: 100, maxHp: 100, damageStage: 0, alive: true, dir: 1, name: `HERO-0${i + 1}`, angle: state.angle, move: 0 }));
    const right = rightXs.map((x, i) => ({ id: `R${i + 1}`, team: "right", x, hp: 100, maxHp: 100, damageStage: 0, alive: true, dir: -1, name: state.opponent === "local" ? `PLAYER-02-${i + 1}` : `HOSTILE-0${i + 1}`, angle: state.angle, move: 0 }));
    state.tanks = [];
    const n = Math.max(left.length, right.length);
    for (let i = 0; i < n; i++) { if (left[i]) state.tanks.push(left[i]); if (right[i]) state.tanks.push(right[i]); }
    state.turnIndex = 0; state.turn = 1; state.winner = ""; state.supportUsed = { left: false, right: false };
    projectiles.length = 0; particles.length = 0; effects.length = 0; hazards.length = 0;
  }
  function newMap(announceChange = true) {
    if (state.winner === "left" && (state.mode === "campaign" || state.mode === "night")) state.level = Math.min(30, state.level + 1);
    state.sceneIndex = (state.sceneIndex + 1) % FIELD_SCENES.length;
    state.mapName = FIELD_SCENES[state.sceneIndex].name;
    state.seed = (Math.random() * 0xffffffff) >>> 0;
    createTerrain(); generateObstacles(); setFormation(state.formation);
    $("mapReadout").textContent = `SECTOR ${String(state.level).padStart(2, "0")} // GRID ${state.seed.toString(16).slice(-4).toUpperCase()}`;
    if (announceChange) announce("NEW SECTOR GENERATED // ARMOR READY");
    refreshHud();
  }
  function applyModeSettings() {
    if (projectiles.length || state.moving) { announce("WAIT FOR THE ROUND TO CLEAR BEFORE RECONFIGURING"); return; }
    state.mode = $("mode").value; state.opponent = $("opponent").value; state.formation = Number($("formation").value);
    state.difficulty = $("difficulty").value; state.weather = $("weather").value; state.smoke = $("smoke").value; state.support = $("support").value;
    state.level = 1;
    state.night = state.mode === "night";
    if (state.mode === "campaign" || state.mode === "night") state.formation = 2;
    $("formation").value = String(state.formation);
    newMap(false); $("modeLabel").textContent = modeNames[state.mode] || modeNames.skirmish;
    $("weatherReadout").textContent = `${state.weather === "rain" ? "RAIN SQUALL" : state.weather === "wind" ? "CROSSWIND" : "OVERCAST"} // ${state.smoke === "clear" ? "CLEAR AIR" : state.smoke === "dense" ? "DENSE SMOKE" : "DRIFTING SMOKE"}`;
    $("nightToggle").classList.toggle("is-on", state.night); $("nightToggle").setAttribute("aria-pressed", String(state.night)); $("nightToggle").querySelector("span").textContent = state.night ? "ON" : "OFF";
    refreshWeaponChoices(); refreshHud(); announce("CONFIGURATION DEPLOYED // FIRE CONTROL READY");
  }
  function refreshWeaponChoices() {
    const previous = state.weapon;
    const savedProgress = Number(localStorage.getItem("tam-v2-unlock") || 1);
    const available = state.mode === "campaign" || state.mode === "night" ? weapons.filter((item) => item.unlock <= Math.max(1, state.level, savedProgress) + 1) : weapons;
    weaponSelect.replaceChildren(...available.map((weapon) => {
      const option = document.createElement("option"); option.value = weapon.key;
      option.textContent = weapon.unlock > 1 && (state.mode === "campaign" || state.mode === "night") ? `${weapon.name}  //  OP ${weapon.unlock}` : weapon.name;
      return option;
    }));
    state.weapon = available.some((item) => item.key === previous) ? previous : "shell";
    weaponSelect.value = state.weapon; updateWeaponReadout();
  }
  function updateWeaponReadout() {
    const weapon = weaponData(); $("weaponClass").textContent = weapon.class; $("weaponDescription").textContent = weapon.desc;
  }
  function selectTurn(index, increment = true) {
    const tank = state.tanks[index]; if (!tank?.alive) return;
    state.turnIndex = index; if (increment) state.turn++;
    state.angle = Math.round(tank.angle); angleInput.value = state.angle;
    $("angleValue").textContent = state.angle; $("activeTankName").textContent = tank.name;
    const isCpu = state.opponent === "cpu" && tank.team === "right";
    $("turnLabel").textContent = isCpu ? "ENEMY TURN" : tank.team === "left" ? "PLAYER 1 TURN" : "PLAYER 2 TURN";
    $("consoleTurn").textContent = isCpu ? "HOSTILE GUNNER" : tank.team === "left" ? "YOUR TURN" : "PLAYER 2 TURN";
    $("consoleTurn").parentElement.style.borderColor = isCpu ? "#bd6655" : "#4a5a5a";
    fireButton.disabled = !!state.winner || isCpu || projectiles.length > 0 || state.moving;
    refreshTargetCard(); refreshSupportButton();
    if (isCpu && !state.winner) { fireButton.disabled = true; setTimeout(cpuTurn, 800); }
  }
  function nextTurn() {
    const leftAlive = living("left").length; const rightAlive = living("right").length;
    if (!leftAlive || !rightAlive) {
      state.winner = leftAlive ? "left" : "right";
      $("turnLabel").textContent = state.winner === "left" ? "VICTORY // SECTOR SECURED" : "DEFEAT // ARMOR LOST";
      $("consoleTurn").textContent = state.winner === "left" ? "MISSION SUCCESS" : "MISSION FAILED";
      fireButton.disabled = true; announce(state.winner === "left" ? "HOSTILE BATTERY SILENCED // VICTORY" : "ALL FRIENDLY ARMOR LOST // RETRY SECTOR");
      if (state.winner === "left" && (state.mode === "campaign" || state.mode === "night")) {
        const unlock = Number(localStorage.getItem("tam-v2-unlock") || 1);
        localStorage.setItem("tam-v2-unlock", String(Math.max(unlock, Math.min(30, state.level + 1))));
      }
      refreshHud(); return;
    }
    const current = activeTank();
    let next = (state.turnIndex + 1) % state.tanks.length;
    for (let i = 0; i < state.tanks.length; i++) {
      const candidate = state.tanks[next];
      if (candidate.alive && candidate.team !== current.team) break;
      next = (next + 1) % state.tanks.length;
    }
    if (!state.tanks[next].alive) next = state.tanks.findIndex((tank) => tank.alive && tank.team !== current.team);
    selectTurn(next);
  }
  function refreshTargetCard() {
    const current = activeTank(); const opponent = living(current?.team === "left" ? "right" : "left").sort((a, b) => Math.abs(a.x - current.x) - Math.abs(b.x - current.x))[0];
    $("targetCard").style.display = opponent ? "block" : "none";
    if (opponent) { $("targetHealth").textContent = `ARMOR ${Math.ceil(opponent.hp)}%`; $("targetHealthFill").style.width = `${Math.max(0, opponent.hp)}%`; }
  }
  function refreshHud() {
    const tank = activeTank(); if (!tank) return;
    $("missionTitle").textContent = state.mode === "campaign" || state.mode === "night" ? `${state.mapName} // OP ${String(state.level).padStart(2, "0")}` : state.mapName;
    $("modeLabel").textContent = modeNames[state.mode] || modeNames.skirmish;
    $("windReadout").textContent = state.weather === "wind" ? "09 ⇢" : state.weather === "clear" ? "02 →" : "05 ←";
    $("rangeReadout").textContent = `${Math.round(Math.abs((living(tank.team === "left" ? "right" : "left")[0]?.x || tank.x) - tank.x) * 1.25)} m`;
    refreshTargetCard(); refreshSupportButton();
  }
  function refreshSupportButton() {
    const button = document.querySelector(".support-button"); if (!button) return;
    const used = state.supportUsed[activeTank()?.team] || false;
    const labels = { off: "NO SUPPORT", air: "AIR STRIKE", repair: "FIELD REPAIR", laser: "LASER STRIKE", rod: "ORBITAL ROD", meteor: "METEOR DROP", scanner: "RECON SCAN" };
    button.querySelector("span").textContent = used ? "SPENT" : (labels[state.support] || "SUPPORT");
    button.disabled = state.support === "off" || used || !!state.winner || projectiles.length > 0 || state.moving;
    button.title = state.support === "off" ? "Select a support option in Mission Configuration" : used ? "Support already expended this side" : `Use ${labels[state.support]} support`;
  }

  function drawBackground(time) {
    if (background.complete && background.naturalWidth) ctx.drawImage(background, 0, 0, W, H);
    else { const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#303a43"); sky.addColorStop(.55, "#8a7060"); sky.addColorStop(1, "#24292a"); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = "#11192044"; ctx.fillRect(0, 0, W, H);
    const haze = ctx.createLinearGradient(0, 180, 0, 550); haze.addColorStop(0, "#c4c7be00"); haze.addColorStop(.72, "#a9aaa612"); haze.addColorStop(1, "#151b1dcc"); ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const x = ((i * 497 + time * (i % 2 ? -0.008 : 0.012)) % (W + 220) + W + 220) % (W + 220) - 110;
      ctx.fillStyle = `rgba(39,45,47,${0.06 + i * .012})`; ctx.beginPath(); ctx.ellipse(x, 215 + i * 45, 125 + i * 34, 21 + i * 5, -.05, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawTerrain() {
    if (terrainDirty) rebuildTerrainLayer();
    ctx.drawImage(terrainLayer, -TERRAIN_OVERDRAW, 0);
  }
  function structureFrame(object) {
    if (!object.active || object.hp <= 0) return 3;
    const health = object.hp / object.maxHp;
    return health <= .3 ? 2 : health <= .68 ? 1 : 0;
  }
  function drawStructureAtlas(object, base, frame) {
    const atlas = getStructureAtlas(object.type);
    if (!atlas) return false;
    if (!atlas.complete || !atlas.naturalWidth) return object.type === "jeep" || object.type === "tree";
    const cellW = atlas.naturalWidth / 2, cellH = atlas.naturalHeight / 2;
    const cellX = (frame % 2) * cellW, cellY = Math.floor(frame / 2) * cellH;
    const size = object.width * (object.visualScale || 1) * battlefieldScale(object.x);
    const baseline = object.type === "tree" ? .95 : object.type === "jeep" ? .83 : .8;
    ctx.save(); if (terrainSkyMask) ctx.clip(terrainSkyMask);
    ctx.translate(object.x, base); ctx.rotate(terrainSlope(object.x));
    if (object.variant > .5) ctx.scale(-1, 1);
    ctx.drawImage(atlas, cellX, cellY, cellW, cellH, -size * .5, -size * baseline, size, size);
    ctx.restore();
    return true;
  }
  function drawObstacles(time) {
    for (const object of obstacles) {
      const base = surfaceY(object.x); const w = object.width; const h = object.height;
      if (!object.active) {
        if (object.destroyed && !drawStructureAtlas(object, base, 3)) drawDestroyedBunker(object, base, time);
        continue;
      }
      if (drawStructureAtlas(object, base, structureFrame(object))) continue;
      ctx.save(); ctx.translate(object.x, base);
      ctx.fillStyle = "#0a0e0e65"; ctx.beginPath(); ctx.ellipse(0, -2, w * .7, 7, 0, 0, Math.PI * 2); ctx.fill();
      if (object.type === "wall") {
        ctx.restore(); ctx.save(); if (terrainSkyMask) ctx.clip(terrainSkyMask);
        ctx.translate(object.x, base); ctx.rotate(terrainSlope(object.x));
        ctx.fillStyle = "#090d0d75"; ctx.beginPath(); ctx.ellipse(0, -1, w * .62, 8, 0, 0, Math.PI * 2); ctx.fill();
        const stoneRand = rand((object.id + 7) * 1471 + Math.floor(object.variant * 9000));
        const rows = 3, blockW = w / 5, blockH = h / rows;
        const stonePalette = ["#716956", "#625d50", "#81745e", "#56564e", "#77705f"];
        for (let row = 0; row < rows; row++) {
          const offset = row % 2 ? -blockW * .48 : 0;
          for (let col = -1; col < 6; col++) {
            const x = col * blockW + offset;
            const top = -h + row * blockH + (stoneRand() - .5) * 3;
            const width = blockW * (.9 + stoneRand() * .08), height = blockH * (.86 + stoneRand() * .1);
            const face = ctx.createLinearGradient(x, top, x + width, top + height);
            const tone = stonePalette[Math.floor(stoneRand() * stonePalette.length)];
            face.addColorStop(0, "#9b8d70"); face.addColorStop(.12, tone); face.addColorStop(1, "#373a37");
            ctx.beginPath(); ctx.moveTo(x, top + 2); ctx.lineTo(x + width * .12, top); ctx.lineTo(x + width, top + 1 + stoneRand() * 2);
            ctx.lineTo(x + width - 1, top + height); ctx.lineTo(x + 2, top + height - 1); ctx.closePath();
            ctx.fillStyle = face; ctx.fill(); ctx.strokeStyle = "#211f1b"; ctx.lineWidth = 2; ctx.stroke();
            ctx.strokeStyle = "#d4c19b44"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 3, top + 3); ctx.lineTo(x + width * .72, top + 3); ctx.stroke();
          }
        }
        if (object.hp < object.maxHp * .78) {
          const damage = 1 - object.hp / object.maxHp;
          ctx.strokeStyle = `rgba(19,20,18,${.48 + damage * .35})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-w * .13, -h * .88); ctx.lineTo(-w * .02, -h * .66); ctx.lineTo(-w * .19, -h * .46); ctx.lineTo(-w * .08, -h * .22); ctx.stroke();
          ctx.strokeStyle = "#b9a88966"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w * .11, -h * .86); ctx.lineTo(-w * .005, -h * .65); ctx.stroke();
        }
        ctx.restore(); continue;
      } else if (object.type === "boulder") {
        const rock = ctx.createLinearGradient(-w / 2, -h, w / 2, 0); rock.addColorStop(0, "#77756c"); rock.addColorStop(.28, "#565650"); rock.addColorStop(1, "#2d3030");
        ctx.beginPath(); ctx.moveTo(-w * .55, -2); ctx.lineTo(-w * .48, -h * .44); ctx.lineTo(-w * .22, -h * .82); ctx.lineTo(w * .09, -h); ctx.lineTo(w * .4, -h * .72); ctx.lineTo(w * .57, -h * .28); ctx.lineTo(w * .53, 0); ctx.closePath(); ctx.fillStyle = rock; ctx.fill(); ctx.strokeStyle = "#a79a8060"; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = "#d1c4a433"; ctx.beginPath(); ctx.moveTo(-w * .18, -h * .67); ctx.lineTo(0, -h * .47); ctx.lineTo(-w * .03, -h * .25); ctx.stroke();
      } else if (object.type === "bunker" && bunkerImage.complete && bunkerImage.naturalWidth) {
        // Restore the obstacle-local transform first. Clip in world space so the
        // terrain itself occludes the bunker foot and embeds it into ridges/slopes.
        ctx.restore(); ctx.save(); if (terrainSkyMask) ctx.clip(terrainSkyMask); ctx.translate(object.x, base);
        ctx.rotate(terrainSlope(object.x)); if (object.variant > .5) ctx.scale(-1, 1); ctx.drawImage(bunkerImage, -w * .62, -h, w * 1.24, h);
        if (object.hp < object.maxHp) {
          ctx.save(); ctx.globalAlpha = Math.min(.8, .25 + (1 - object.hp / object.maxHp) * .7);
          ctx.strokeStyle = "#171715"; ctx.lineWidth = 2.1; ctx.beginPath(); ctx.moveTo(-w * .12, -h * .82); ctx.lineTo(-w * .03, -h * .63); ctx.lineTo(-w * .19, -h * .48); ctx.lineTo(-w * .1, -h * .27); ctx.stroke();
          ctx.strokeStyle = "#d4c4a0"; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(-w * .11, -h * .82); ctx.lineTo(-w * .025, -h * .63); ctx.lineTo(-w * .18, -h * .48); ctx.stroke(); ctx.restore();
        }
        ctx.restore(); continue;
      } else if (object.type === "bunker") {
        ctx.rotate(terrainSlope(object.x));
        const concrete = ctx.createLinearGradient(0, -h, 0, 0); concrete.addColorStop(0, "#77756c"); concrete.addColorStop(.33, "#575650"); concrete.addColorStop(1, "#282d2c");
        ctx.beginPath(); ctx.moveTo(-w * .55, 0); ctx.lineTo(-w * .48, -h * .72); ctx.lineTo(-w * .28, -h); ctx.lineTo(w * .42, -h * .94); ctx.lineTo(w * .56, -h * .58); ctx.lineTo(w * .56, 0); ctx.closePath(); ctx.fillStyle = concrete; ctx.fill(); ctx.strokeStyle = "#b0a58e88"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.moveTo(-w * .55, 0); ctx.lineTo(-w * .48, -h * .72); ctx.lineTo(-w * .28, -h); ctx.lineTo(w * .42, -h * .94); ctx.lineTo(w * .56, -h * .58); ctx.lineTo(w * .56, 0); ctx.closePath(); ctx.clip();
        const pock = rand((object.id + 1) * 9187 + Math.floor(object.variant * 10000));
        for (let i = 0; i < 30; i++) { const px = (pock() - .5) * w, py = -h * (.12 + pock() * .75), r = 1 + pock() * 2.3; ctx.fillStyle = i % 3 ? "#171b1a38" : "#d0c2a044"; ctx.beginPath(); ctx.ellipse(px, py, r * 1.4, r * .65, pock(), 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = "#393a34"; ctx.beginPath(); ctx.moveTo(w * .42, -h * .94); ctx.lineTo(w * .56, -h * .58); ctx.lineTo(w * .56, 0); ctx.lineTo(w * .42, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#d3c3a05c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w * .28, -h + 2); ctx.lineTo(w * .4, -h * .94); ctx.lineTo(w * .52, -h * .59); ctx.stroke();
        ctx.fillStyle = "#101515"; ctx.fillRect(-w * .24, -h * .71, w * .49, 11);
        ctx.strokeStyle = "#a89d85"; ctx.lineWidth = 1.2; ctx.strokeRect(-w * .23, -h * .7, w * .47, 8);
        const embrasure = ctx.createLinearGradient(0, -h * .69, 0, -h * .58); embrasure.addColorStop(0, "#080d0e"); embrasure.addColorStop(.7, "#1a201f"); embrasure.addColorStop(1, "#383a34"); ctx.fillStyle = embrasure; ctx.fillRect(-w * .21, -h * .67, w * .43, 5);
        ctx.fillStyle = "#c7b99c3d"; ctx.fillRect(-w * .47, -h * .38, w * .94, 2);
        ctx.strokeStyle = "#252b2a88"; ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) { const seamX = -w * .46 + i * w * .19; ctx.beginPath(); ctx.moveTo(seamX, -h * .58); ctx.lineTo(seamX + (i % 2 ? 2 : -2), -h * .4); ctx.stroke(); }
        for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? "#494940" : "#625c4e"; ctx.fillRect(-w * .48 + i * w * .21, -h * .18 - (i % 2) * 2, w * .18, 5); ctx.fillStyle = "#b9a98a55"; ctx.fillRect(-w * .47 + i * w * .21, -h * .19 - (i % 2) * 2, w * .15, 1); }
        ctx.fillStyle = "#c8ba9a36"; ctx.beginPath(); ctx.ellipse(-w * .26, -h * .96, w * .11, 2, -.08, 0, Math.PI * 2); ctx.fill();
      } else if (object.type === "wreck") {
        const metal = ctx.createLinearGradient(0, -h, 0, 0); metal.addColorStop(0, "#655c4d"); metal.addColorStop(.42, "#38403d"); metal.addColorStop(1, "#202728");
        ctx.fillStyle = "#151a1a"; ctx.beginPath(); ctx.roundRect(-w * .58, -15, w * 1.16, 19, 7); ctx.fill();
        for (let i = 0; i < 5; i++) { ctx.fillStyle = "#777362"; ctx.beginPath(); ctx.arc(-w * .38 + i * w * .19, -6, 5, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(-w * .5, -17); ctx.lineTo(-w * .4, -h * .52); ctx.lineTo(-w * .08, -h * .67); ctx.lineTo(w * .3, -h * .56); ctx.lineTo(w * .52, -h * .28); ctx.lineTo(w * .55, -17); ctx.closePath(); ctx.fillStyle = metal; ctx.fill(); ctx.strokeStyle = "#92887370"; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.strokeStyle = "#d26e3b99"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w * .2, -h * .48); ctx.lineTo(-w * .08, -h * .34); ctx.lineTo(w * .1, -h * .41); ctx.stroke();
      } else {
        const concrete = ctx.createLinearGradient(-w / 2, -h, w / 2, 0); concrete.addColorStop(0, "#726e62"); concrete.addColorStop(.5, "#55544d"); concrete.addColorStop(1, "#292d2d");
        ctx.beginPath(); ctx.moveTo(-w * .45, 0); ctx.lineTo(-w * .49, -h * .75); ctx.lineTo(-w * .26, -h * .73); ctx.lineTo(-w * .21, -h); ctx.lineTo(w * .15, -h * .84); ctx.lineTo(w * .23, -h * .98); ctx.lineTo(w * .5, -h * .7); ctx.lineTo(w * .42, 0); ctx.closePath(); ctx.fillStyle = concrete; ctx.fill(); ctx.strokeStyle = "#b5a68d70"; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.strokeStyle = "#242a29"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w * .12, -h * .7); ctx.lineTo(w * .02, -h * .54); ctx.lineTo(-w * .09, -h * .35); ctx.lineTo(w * .1, -h * .2); ctx.stroke();
        for (let i = 1; i < 4; i++) { ctx.strokeStyle = "#171c1c55"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w * .42, -h * (.18 + i * .12)); ctx.lineTo(w * .4, -h * (.14 + i * .12)); ctx.stroke(); }
      }
      if (object.type === "bunker") {
        const damage = 1 - object.hp / object.maxHp;
        // Damage is layered over the photoreal asset so the battle state reads at game scale.
        if (damage > .16) {
          ctx.save(); ctx.globalAlpha = Math.min(.82, .24 + damage * .72);
          ctx.strokeStyle = "#171a18"; ctx.lineWidth = 1.6; ctx.beginPath();
          ctx.moveTo(-w * .12, -h * .78); ctx.lineTo(-w * .03, -h * .62); ctx.lineTo(-w * .1, -h * .47); ctx.lineTo(w * .02, -h * .34);
          ctx.moveTo(w * .24, -h * .91); ctx.lineTo(w * .16, -h * .73); ctx.lineTo(w * .27, -h * .59); ctx.stroke();
          ctx.restore();
        }
        if (damage > .46) {
          ctx.save(); ctx.globalAlpha = Math.min(.66, damage); ctx.fillStyle = "#161919";
          ctx.beginPath(); ctx.ellipse(-w * .16, -h * .62, w * .22, h * .12, -.12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#b9a98a88"; ctx.beginPath(); ctx.moveTo(w * .35, -h * .82); ctx.lineTo(w * .48, -h * .72); ctx.lineTo(w * .38, -h * .64); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        if (damage > .72) {
          ctx.save(); ctx.globalAlpha = .72 + Math.sin(time / 90 + object.id) * .14; ctx.fillStyle = "#e77a38"; ctx.shadowBlur = 8; ctx.shadowColor = "#e65b2f";
          ctx.beginPath(); ctx.ellipse(-w * .1, -h * .57, 3.2, 2.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          drawSmokePuffs(time, -w * .12, -h * .65, .42, object.id * 7 + object.x * .03);
        }
      } else if (object.hp < object.maxHp * .7) { ctx.strokeStyle = "#171b1b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w * .15, -h * .54); ctx.lineTo(0, -h * .44); ctx.lineTo(-w * .1, -h * .28); ctx.lineTo(w * .06, -h * .17); ctx.stroke(); }
      if (object.type !== "bunker" && object.hp < object.maxHp * .4) drawSmokePuffs(time, -w * .2, -h * .65, .26, object.id * 7 + object.x * .03);
      ctx.restore();
    }
  }
  function drawDestroyedBunker(object, base, time) {
    if (drawStructureAtlas(object, base, 3)) return;
    const w = object.width, h = object.height;
    ctx.save(); if (terrainSkyMask) ctx.clip(terrainSkyMask); ctx.translate(object.x, base); ctx.rotate(terrainSlope(object.x));
    ctx.fillStyle = "#0b1010a6"; ctx.beginPath(); ctx.ellipse(0, -2, w * .72, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (object.type === "wall") {
      const rubble = [[-.44,.17,.22,.27],[-.19,.08,.27,.22],[.12,.19,.31,.29],[.4,.13,.17,.2],[-.02,.02,.18,.13]];
      for (let i = 0; i < rubble.length; i++) {
        const [x,y,sx,sy] = rubble[i]; ctx.save(); ctx.translate(x*w, -y*h); ctx.rotate((i-2)*.19);
        const rock = ctx.createLinearGradient(0,-sy*h,0,0); rock.addColorStop(0,"#857960"); rock.addColorStop(.36,"#5a574c"); rock.addColorStop(1,"#292d2c");
        ctx.fillStyle=rock; ctx.beginPath(); ctx.moveTo(-sx*w/2,0); ctx.lineTo(-sx*w*.42,-sy*h*.68); ctx.lineTo(-sx*w*.06,-sy*h); ctx.lineTo(sx*w*.44,-sy*h*.62); ctx.lineTo(sx*w/2,0); ctx.closePath(); ctx.fill(); ctx.strokeStyle="#1b201f"; ctx.lineWidth=1.4; ctx.stroke(); ctx.restore();
      }
      drawSmokePuffs(time, -w * .03, -h * .18, .24, object.id * 19 + object.x * .01);
      ctx.restore(); return;
    }
    const rubble = [ [-.46,-.08,.22,.16], [-.18,-.14,.28,.22], [.14,-.09,.32,.13], [.39,-.06,.16,.11] ];
    for (let i = 0; i < rubble.length; i++) { const [x,y,sx,sy] = rubble[i]; ctx.save(); ctx.translate(x * w, y * h); ctx.rotate((i - 1.5) * .16); const g = ctx.createLinearGradient(0, -sy * h, 0, 2); g.addColorStop(0, "#746e62"); g.addColorStop(1, "#282d2c"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-sx*w/2,0); ctx.lineTo(-sx*w*.34,-sy*h); ctx.lineTo(sx*w*.34,-sy*h*.78); ctx.lineTo(sx*w/2,0); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = "#a99b7d44"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w * .5, -h * .05); ctx.lineTo(-w * .12, -h * .2); ctx.lineTo(w * .2, -h * .09); ctx.lineTo(w * .48, -h * .04); ctx.stroke();
    drawSmokePuffs(time, -w * .05, -h * .2, .38, object.id * 13 + object.x * .02);
    ctx.restore();
  }
  function rebuildTerrainLayer() {
    const c = terrainCtx; c.clearRect(0, 0, W + TERRAIN_OVERDRAW * 2, H + TERRAIN_BOTTOM_OVERDRAW); c.save(); c.translate(TERRAIN_OVERDRAW, 0);
    const ground = c.createLinearGradient(0, 420, 0, H); ground.addColorStop(0, "#806e58"); ground.addColorStop(.035, "#6a5846"); ground.addColorStop(.18, "#514439"); ground.addColorStop(.53, "#383334"); ground.addColorStop(1, "#242a2b");
    c.beginPath(); c.moveTo(-TERRAIN_OVERDRAW, terrainOverdrawY(-TERRAIN_OVERDRAW));
    for (let i = 1; i < terrain.length; i++) c.lineTo(i * STEP, terrain[i]);
    c.lineTo(W + TERRAIN_OVERDRAW, terrainOverdrawY(W + TERRAIN_OVERDRAW));
    c.lineTo(W + TERRAIN_OVERDRAW, H + TERRAIN_BOTTOM_OVERDRAW); c.lineTo(-TERRAIN_OVERDRAW, H + TERRAIN_BOTTOM_OVERDRAW); c.closePath(); c.fillStyle = ground; c.fill();
    c.save(); c.beginPath(); c.moveTo(-TERRAIN_OVERDRAW, terrainOverdrawY(-TERRAIN_OVERDRAW));
    for (let i = 1; i < terrain.length; i++) c.lineTo(i * STEP, terrain[i]);
    c.lineTo(W + TERRAIN_OVERDRAW, terrainOverdrawY(W + TERRAIN_OVERDRAW));
    c.lineTo(W + TERRAIN_OVERDRAW, H + TERRAIN_BOTTOM_OVERDRAW); c.lineTo(-TERRAIN_OVERDRAW, H + TERRAIN_BOTTOM_OVERDRAW); c.closePath(); c.clip();
    if (!groundTexturePattern && groundTexture.complete && groundTexture.naturalWidth) groundTexturePattern = c.createPattern(groundTexture, "repeat");
    if (groundTexturePattern) { c.globalAlpha = .36; c.fillStyle = groundTexturePattern; c.fillRect(-TERRAIN_OVERDRAW, 0, W + TERRAIN_OVERDRAW * 2, H + TERRAIN_BOTTOM_OVERDRAW); c.globalAlpha = 1; }
    if (!soilNoisePattern) {
      const noiseTile = document.createElement("canvas"); noiseTile.width = 256; noiseTile.height = 256;
      const noiseCtx = noiseTile.getContext("2d"); const pixels = noiseCtx.createImageData(256, 256); const grain = rand(0x51A7);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const tone = grain(); const warm = grain() > .48;
        pixels.data[i] = warm ? 125 + tone * 72 : 38 + tone * 58;
        pixels.data[i + 1] = warm ? 95 + tone * 59 : 44 + tone * 51;
        pixels.data[i + 2] = warm ? 67 + tone * 42 : 43 + tone * 45;
        pixels.data[i + 3] = 10 + Math.floor(grain() * 29);
      }
      noiseCtx.putImageData(pixels, 0, 0); soilNoisePattern = c.createPattern(noiseTile, "repeat");
    }
    c.globalAlpha = .9; c.fillStyle = soilNoisePattern; c.fillRect(-TERRAIN_OVERDRAW, 0, W + TERRAIN_OVERDRAW * 2, H + TERRAIN_BOTTOM_OVERDRAW); c.globalAlpha = 1;
    const r = rand(state.seed + 88);
    // Broad, soft mineral stains prevent the exposed face from reading as a flat vector fill.
    for (let i = 0; i < 76; i++) {
      const x = r() * W, y = surfaceY(x) + r() * Math.max(1, H - surfaceY(x));
      const radius = 28 + r() * 112;
      const stain = c.createRadialGradient(x, y, 2, x, y, radius);
      const warm = r() > .55;
      stain.addColorStop(0, warm ? "rgba(155,117,76,.15)" : "rgba(9,13,14,.2)");
      stain.addColorStop(.62, warm ? "rgba(128,97,67,.07)" : "rgba(16,19,20,.1)");
      stain.addColorStop(1, "rgba(15,17,18,0)"); c.fillStyle = stain;
      c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    for (let i = 0; i < 2300; i++) {
      const x = r() * W; const y = surfaceY(x) + r() * Math.max(1, H - surfaceY(x));
      const depth = y - surfaceY(x); const size = .55 + r() * (depth < 18 ? 2.8 : 4.2);
      c.fillStyle = r() > .52 ? `rgba(189,158,116,${.06 + r() * .12})` : `rgba(7,11,12,${.1 + r() * .16})`;
      c.beginPath(); c.ellipse(x, y, size * (1.1 + r()), size * (.5 + r() * .5), r() * .7, 0, Math.PI * 2); c.fill();
      if (size > 3.5 && r() > .7) { c.strokeStyle = "#c9ad7b2a"; c.lineWidth = .8; c.beginPath(); c.moveTo(x - size, y - size * .4); c.lineTo(x + size, y - size * .55); c.stroke(); }
    }
    c.restore();
    // Exposed geology reads as broken sediment seams, not repeated contour bands.
    const seamRand = rand(state.seed + 208);
    for (let seam = 0; seam < 18; seam++) {
      const startX = seamRand() * W;
      const length = 22 + seamRand() * 104;
      const depth = 30 + seamRand() * 160;
      const tint = seamRand() > .48 ? "rgba(181,145,101,.16)" : "rgba(9,13,14,.24)";
      c.beginPath();
      for (let x = startX, end = Math.min(W, startX + length); x <= end; x += 9) {
        const yy = surfaceY(x) + depth + Math.sin(x * .021 + seam) * 3;
        if (x === startX) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.strokeStyle = tint; c.lineWidth = 1 + seamRand() * 1.2; c.stroke();
    }
    drawSurfaceDebris(c); c.restore();
    terrainSkyMask = new Path2D(); terrainSkyMask.moveTo(0, 0); terrainSkyMask.lineTo(W, 0);
    for (let i = terrain.length - 1; i >= 0; i--) terrainSkyMask.lineTo(i * STEP, terrain[i]);
    terrainSkyMask.closePath();
    terrainDirty = false;
  }
  function drawSurfaceDebris(c) {
    const r = rand(state.seed + 108);
    const rockTones = ["#4b443d", "#615549", "#343638", "#796a57", "#948068", "#514d48"];
    // Loose gravel and small broken clods soften the gameplay edge without drawing a contour line.
    for (let i = 0; i < 190; i++) {
      const x = r() * W, y = surfaceY(x) - 4 + r() * 19, size = 1.5 + r() * 8.5;
      const height = .7 + r() * Math.min(5, size * .5);
      c.fillStyle = rockTones[Math.floor(r() * rockTones.length)];
      c.globalAlpha = .48 + r() * .38;
      c.beginPath(); c.moveTo(x - size, y + height * .25); c.lineTo(x - size * .55, y - height * .55); c.lineTo(x + size * .18, y - height * .72); c.lineTo(x + size, y + height * .15); c.lineTo(x + size * .42, y + height * .62); c.closePath(); c.fill();
      c.globalAlpha = .14; c.strokeStyle = "#c6b295"; c.lineWidth = .7; c.beginPath(); c.moveTo(x - size * .25, y - height * .38); c.lineTo(x + size * .25, y - height * .42); c.stroke();
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 210; i++) {
      const x = r() * W, y = surfaceY(x) + 4 + r() * 34;
      c.fillStyle = r() > .55 ? "#c1a47b" : "#111516"; c.globalAlpha = .08 + r() * .12;
      c.beginPath(); c.ellipse(x, y, .7 + r() * 2.2, .45 + r() * 1.1, r() * Math.PI, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  }
  function obstacleAt(x, y) {
    for (const object of obstacles) {
      if (!object.active) continue;
      const base = surfaceY(object.x);
      if (object.type === "bunker" || object.type === "wall") {
        // Invert the exact terrain rotation and optional mirroring used to draw the sprite.
        const angle = terrainSlope(object.x), dx = x - object.x, dy = y - base;
        let localX = dx * Math.cos(angle) + dy * Math.sin(angle);
        const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
        if (object.variant > .5) localX = -localX;
        const depthScale = battlefieldScale(object.x);
        const halfWidth = (object.type === "bunker" ? object.width * .62 : object.width * .58) * depthScale;
        if (Math.abs(localX) <= halfWidth && localY >= -object.height * depthScale && localY <= 4 * depthScale) return object;
      } else {
        const depthScale = battlefieldScale(object.x);
        if (Math.abs(x - object.x) <= object.width * .5 * depthScale && y >= base - object.height * depthScale && y <= base + 4 * depthScale) return object;
      }
    }
    return null;
  }
  function drawTank(tank, time) {
    if (!tankImage.complete || !tankImage.naturalWidth) { drawTankFallback(tank, time); return; }
    const wrecked = !tank.alive;
    const groundY = surfaceY(tank.x);
    const depthScale = battlefieldScale(tank.x);
    const slope = terrainSlope(tank.x);
    const lightColor = tank.team === "left" ? "#75dce0" : "#ff9d69";
    const shadow = ctx.createRadialGradient(tank.x, groundY - 2, 4 * depthScale, tank.x, groundY - 2, 118 * depthScale);
    shadow.addColorStop(0, "rgba(7,9,10,.72)"); shadow.addColorStop(.68, "rgba(7,9,10,.32)"); shadow.addColorStop(1, "rgba(7,9,10,0)");
    ctx.fillStyle = shadow; ctx.beginPath(); ctx.ellipse(tank.x, groundY - 2, 118 * depthScale, 10 * depthScale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(tank.x, groundY); ctx.rotate(slope); ctx.scale(depthScale, depthScale); if (tank.dir < 0) ctx.scale(-1, 1);
    ctx.filter = wrecked ? "grayscale(.82) brightness(.58) sepia(.24)" : "none";
    ctx.drawImage(tankImage, -127, -127, 254, 127);
    ctx.filter = "none";
    // The weapon stays independently aimable, aligned to the realistic sprite's trunnion.
    ctx.save(); ctx.translate(63, -76); ctx.rotate(-Math.max(-20, Math.min(85, tank.angle - slope * 180 / Math.PI - (wrecked ? 19 : 0))) * Math.PI / 180);
    const barrel = ctx.createLinearGradient(0, -5, 0, 5); barrel.addColorStop(0, "#c0c2ba"); barrel.addColorStop(.24, "#68716f"); barrel.addColorStop(.72, "#303736"); barrel.addColorStop(1, "#93968e");
    ctx.fillStyle = "#1c2221"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = barrel; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(68, -3); ctx.lineTo(80, -5); ctx.lineTo(84, -4); ctx.lineTo(84, 4); ctx.lineTo(76, 5); ctx.lineTo(68, 3); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#c3c5bb"; ctx.lineWidth = .8; ctx.stroke();
    ctx.strokeStyle = "#151a19"; ctx.beginPath(); ctx.moveTo(80, -3); ctx.lineTo(80, 3); ctx.stroke();
    ctx.fillStyle = lightColor; ctx.shadowBlur = 7; ctx.shadowColor = lightColor; ctx.fillRect(3, -2, 3, 3); ctx.shadowBlur = 0;
    ctx.restore();
    const smokeStrength = wrecked ? .98 : tank.hp <= 25 ? .72 : tank.hp <= 55 ? .46 : tank.hp <= 80 ? .28 : .025;
    if ((tank.damageStage || 0) > 0 || wrecked) drawTankDamage(tank, time, wrecked);
    drawSmokePuffs(time, -48, -73, smokeStrength, tank.x * .1 + (tank.team === "right" ? 4 : 0));
    if (wrecked) {
      ctx.save(); ctx.globalAlpha = .8; ctx.fillStyle = "#fb7434"; ctx.shadowBlur = 14; ctx.shadowColor = "#ff542a";
      for (let i = 0; i < 4; i++) { const h = 9 + Math.sin(time / 62 + i * 2.6) * 4; ctx.beginPath(); ctx.ellipse(-46 + i * 29, -27 - h / 2, 5, h, (i - 1) * .2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
    if (!wrecked) {
      const barWidth = 72 * depthScale, barHeight = Math.max(3, 6 * depthScale), barY = groundY - 140 * depthScale;
      ctx.fillStyle = "#141a19bb"; ctx.fillRect(tank.x - barWidth / 2, barY, barWidth, barHeight);
      ctx.fillStyle = tank.team === "left" ? "#83d38e" : "#db7661";
      ctx.fillRect(tank.x - barWidth / 2 + 1, barY + 1, (barWidth - 2) * tank.hp / tank.maxHp, Math.max(2, barHeight - 2));
    }
    if (state.scanUntil > time && tank.team !== activeTank()?.team && tank.alive) {
      const pulse = (time % 1400) / 1400; ctx.save(); ctx.strokeStyle = `rgba(226,163,87,${.18 + pulse * .28})`; ctx.lineWidth = 1.2; ctx.setLineDash([2, 7]); ctx.beginPath(); ctx.arc(tank.x, groundY - 70, 28 + pulse * 30, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }
  function drawTankFallback(tank, time) {
    const wrecked = !tank.alive;
    const y = surfaceY(tank.x); const palette = colors[tank.team]; const depthScale = battlefieldScale(tank.x);
    const slope = terrainSlope(tank.x); ctx.save(); ctx.translate(tank.x, y); ctx.rotate(slope); ctx.scale(depthScale, depthScale); if (tank.dir < 0) ctx.scale(-1, 1); if (wrecked) ctx.filter = "grayscale(.8) brightness(.64) sepia(.22)";
    // Track assembly and alternating steel road wheels.
    const track = ctx.createLinearGradient(0, -30, 0, -3); track.addColorStop(0, "#444b4a"); track.addColorStop(.4, "#171d1d"); track.addColorStop(1, "#313738");
    ctx.beginPath(); ctx.roundRect(-72, -31, 144, 29, 12); ctx.fillStyle = track; ctx.fill(); ctx.strokeStyle = "#89908a"; ctx.lineWidth = 1.4; ctx.stroke();
    for (let link = -68; link <= 66; link += 8) { ctx.strokeStyle = "#92968b66"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(link, -29); ctx.lineTo(link + 3, -25); ctx.lineTo(link + 7, -29); ctx.stroke(); ctx.beginPath(); ctx.moveTo(link, -8); ctx.lineTo(link + 3, -12); ctx.lineTo(link + 7, -8); ctx.stroke(); }
    for (let i = 0; i < 7; i++) {
      const x = -52 + i * 17; const g = ctx.createRadialGradient(x - 2, -20, 1, x, -18, 9); g.addColorStop(0, "#a2a49a"); g.addColorStop(.28, "#535b59"); g.addColorStop(.72, "#242b2b"); g.addColorStop(1, "#111617");
      ctx.beginPath(); ctx.arc(x, -17, 8, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "#9d9e9466"; ctx.stroke();
      ctx.fillStyle = "#b2a991"; ctx.beginPath(); ctx.arc(x, -17, 2, 0, Math.PI * 2); ctx.fill();
    }
    const hull = ctx.createLinearGradient(0, -61, 0, -24); hull.addColorStop(0, "#77756a"); hull.addColorStop(.18, palette[1]); hull.addColorStop(.52, palette[0]); hull.addColorStop(1, "#292f2d");
    ctx.beginPath(); ctx.moveTo(-61, -28); ctx.lineTo(-54, -50); ctx.lineTo(-35, -59); ctx.lineTo(43, -58); ctx.lineTo(65, -47); ctx.lineTo(70, -30); ctx.closePath(); ctx.fillStyle = hull; ctx.fill(); ctx.strokeStyle = "#c4b692"; ctx.lineWidth = 1.2; ctx.stroke();
    // Sloped armor, service panels, vents and fasteners.
    ctx.fillStyle = "#10171850"; ctx.fillRect(-44, -48, 32, 15); ctx.fillRect(0, -50, 36, 18);
    ctx.fillStyle = "#d4c49b38"; ctx.fillRect(-42, -48, 30, 2); ctx.fillRect(2, -50, 33, 2);
    for (let x = -35; x < 41; x += 15) { ctx.fillStyle = "#202727"; ctx.fillRect(x, -45, 1.5, 9); ctx.fillStyle = "#d6c9a5"; ctx.beginPath(); ctx.arc(x + 5, -39, 1.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = tank.team === "left" ? "#7b4229" : "#315c5a"; ctx.fillRect(48, -48, 7, 8); ctx.fillStyle = "#ffc06b"; ctx.fillRect(50, -46, 3, 3);
    // Low rotating turret with the gun raised from its own trunnion.
    ctx.fillStyle = "#121819"; ctx.beginPath(); ctx.ellipse(3, -58, 38, 9, 0, 0, Math.PI * 2); ctx.fill();
    const turret = ctx.createLinearGradient(0, -83, 0, -57); turret.addColorStop(0, "#878278"); turret.addColorStop(.26, palette[1]); turret.addColorStop(1, palette[0]);
    ctx.beginPath(); ctx.moveTo(-31, -60); ctx.lineTo(-25, -76); ctx.lineTo(-13, -83); ctx.lineTo(32, -82); ctx.lineTo(41, -73); ctx.lineTo(39, -61); ctx.closePath(); ctx.fillStyle = turret; ctx.fill(); ctx.strokeStyle = "#c3b89b"; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.translate(18, -76); ctx.rotate(-Math.min(85, Math.max(-20, tank.angle - slope * 180 / Math.PI - (wrecked ? 14 : 0))) * Math.PI / 180);
    const barrel = ctx.createLinearGradient(0, -4, 0, 4); barrel.addColorStop(0, "#99988e"); barrel.addColorStop(.3, "#555d5b"); barrel.addColorStop(1, "#262e2f");
    ctx.fillStyle = barrel; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(59, -3); ctx.lineTo(67, -5); ctx.lineTo(70, -4); ctx.lineTo(70, 4); ctx.lineTo(64, 5); ctx.lineTo(57, 3); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#c3c2b2"; ctx.lineWidth = .8; ctx.stroke();
    ctx.strokeStyle = "#101719"; ctx.beginPath(); ctx.moveTo(66, -3); ctx.lineTo(66, 3); ctx.stroke();
    if (activeTank() === tank && !wrecked) { ctx.shadowBlur = 9; ctx.shadowColor = "#eab46b"; ctx.strokeStyle = "#e6ba77"; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
    ctx.restore();
    // Optical glass and antenna.
    ctx.fillStyle = "#78d2d0"; ctx.shadowBlur = 5; ctx.shadowColor = "#70d4d1"; ctx.fillRect(26, -78, 5, 3); ctx.shadowBlur = 0;
    ctx.strokeStyle = "#454c48"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-24, -75); ctx.lineTo(-28, -92); ctx.stroke(); ctx.fillStyle = "#df8753"; ctx.fillRect(-29, -94, 3, 3);
    ctx.fillStyle = "#161b1b"; ctx.fillRect(-11, -35, 49, 2); ctx.fillStyle = "#d3c8ac"; ctx.font = "bold 7px Arial"; ctx.textAlign = "center"; ctx.fillText(tank.name, 13, -36);
    // Heat shimmer and exhaust after firing.
    const damageSmoke = wrecked ? .72 : tank.hp < 25 ? .4 : tank.hp < 52 ? .24 : tank.hp < 76 ? .12 : .035;
    drawSmokePuffs(time, -53, -61, damageSmoke, tank.x * .1 + (tank.team === "right" ? 4 : 0));
    if (tank.damageStage > 0 || wrecked) drawTankDamage(tank, time, wrecked);
    ctx.restore();
    // Minimal tactical health indicator; no colored target boxes.
    if (!wrecked) { ctx.fillStyle = "#141a19bb"; ctx.fillRect(tank.x - 31, y - 106, 62, 6); ctx.fillStyle = tank.team === "left" ? "#83d38e" : "#db7661"; ctx.fillRect(tank.x - 30, y - 105, 60 * tank.hp / tank.maxHp, 4); }
  }
  function drawTankDamage(tank, time, wrecked) {
    const stage = wrecked ? 4 : Math.min(3, tank.damageStage || 0);
    ctx.save(); ctx.globalAlpha = wrecked ? .88 : .48 + stage * .1;
    // The wreck's grayscale/soot treatment is applied to the tank sprite itself.
    // A source-atop rectangle here affected the already-painted battlefield and
    // left a visible box around the wreck; keep damage marks confined to the hull.
    ctx.fillStyle = "#101513";
    for (let i = 0; i < Math.min(stage, 3); i++) {
      const x = [-61, 4, 76][i]; const y = [-44, -53, -43][i];
      ctx.beginPath(); ctx.ellipse(x, y, 12 + i * 2, 5 + i, -.35, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#171a18"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, y - 2); ctx.lineTo(x - 1, y + 3); ctx.lineTo(x + 7, y - 3); ctx.stroke();
      ctx.strokeStyle = "#a3957a55"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 2, y - 6); ctx.stroke();
    }
    if (stage >= 2) { ctx.fillStyle = "#161b1a"; ctx.beginPath(); ctx.moveTo(18, -50); ctx.lineTo(38, -54); ctx.lineTo(47, -39); ctx.lineTo(24, -37); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#b04c2b66"; ctx.stroke(); }
    if (stage >= 3 && !wrecked) { ctx.fillStyle = "#e58136"; ctx.shadowBlur = 12; ctx.shadowColor = "#e05b2c"; ctx.globalAlpha = .55 + Math.sin(time / 75) * .2; ctx.beginPath(); ctx.ellipse(-52, -48, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    if (wrecked) {
      ctx.fillStyle = "#ed6f34"; ctx.shadowBlur = 12; ctx.shadowColor = "#f36a35";
      for (let i = 0; i < 4; i++) { const flicker = 9 + Math.sin(time / 60 + i * 3) * 4; ctx.beginPath(); ctx.ellipse(-54 + i * 34, -33 - flicker / 2, 5, flicker, (i - 1) * .12, 0, Math.PI * 2); ctx.fill(); }
    } else if (tank.hp < 45 && Math.floor(time / 400) % 3 === 0) {
      ctx.fillStyle = "#ffc46d"; ctx.shadowBlur = 6; ctx.shadowColor = "#ff9a43"; ctx.beginPath(); ctx.arc(-43, -56, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawSmokePuffs(time, originX, originY, strength, seed) {
    const puffCount = strength > .5 ? 9 : 7;
    for (let i = 0; i < puffCount; i++) {
      const cycle = (time * .006 + seed * 19 + i * 31) % 230;
      const progress = cycle / 230;
      const drift = cycle * (i % 2 ? -1 : 1);
      const x = originX + drift * .28 + Math.sin(time * .00025 + seed + i) * 3;
      const y = originY - cycle * .44;
      const size = 5 + i * 2 + cycle * .055;
      const fadeIn = Math.min(1, progress * 5);
      const fadeOut = Math.min(1, (1 - progress) * 5);
      const alpha = strength * (.25 - i * .017) * fadeIn * fadeOut;
      if (alpha <= 0) continue;
      const cloud = ctx.createRadialGradient(x, y, 1, x, y, size * 1.5);
      cloud.addColorStop(0, `rgba(29,34,34,${alpha})`); cloud.addColorStop(.58, `rgba(37,43,42,${alpha * .73})`); cloud.addColorStop(1, "rgba(49,55,53,0)");
      ctx.fillStyle = cloud; ctx.beginPath(); ctx.arc(x, y, size * 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  function updateAmbientSmoke(dt) {
    for (const puff of ambientSmoke) {
      puff.x += (puff.vx + (state.weather === "wind" ? .12 : .015)) * dt;
      puff.y += puff.vy * dt;
      puff.life -= dt;
      if (puff.life <= 0 || puff.x < -150 || puff.x > W + 150 || puff.y < 210) {
        const direction = Math.random() < .5 ? -1 : 1;
        const life = 460 + Math.random() * 560;
        puff.x = direction > 0 ? -120 : W + 120;
        puff.y = 320 + Math.random() * 220;
        puff.vx = direction * (.1 + Math.random() * .17);
        puff.vy = -.045 - Math.random() * .075;
        puff.size = 28 + Math.random() * 40;
        puff.life = puff.maxLife = life;
        puff.phase = Math.random() * Math.PI * 2;
      }
    }
  }
  function drawAtmosphericSmoke() {
    const density = state.smoke === "dense" ? 1 : state.smoke === "thin" ? .62 : 0;
    if (!density) return;
    const count = state.smoke === "dense" ? ambientSmoke.length : Math.floor(ambientSmoke.length * .56);
    for (let i = 0; i < count; i++) {
      const puff = ambientSmoke[i];
      const lifeFade = Math.min(1, puff.life / 100, (puff.maxLife - puff.life) / 75);
      const alpha = density * .19 * Math.max(0, lifeFade);
      if (alpha < .005) continue;
      const age = 1 - puff.life / puff.maxLife;
      const size = puff.size * (.72 + age * .58);
      const x = puff.x + Math.sin(puff.phase + age * 3) * 5;
      const cloud = ctx.createRadialGradient(x - size * .18, puff.y - size * .12, 2, x, puff.y, size * 1.7);
      cloud.addColorStop(0, `rgba(96,98,94,${alpha})`); cloud.addColorStop(.62, `rgba(88,91,87,${alpha * .68})`); cloud.addColorStop(1, "rgba(90,94,91,0)"); ctx.fillStyle = cloud;
      ctx.beginPath(); ctx.ellipse(x, puff.y, size * 1.42, size * .58, -.08 + Math.sin(puff.phase + age) * .025, 0, Math.PI * 2); ctx.fill();
    }
  }
  function aimVector(tank) {
    const a = tank.angle * Math.PI / 180; const weapon = weaponData(); const speed = weapon.speed * (.45 + state.power / 100 * .75);
    return { x: Math.cos(a) * speed * tank.dir, y: -Math.sin(a) * speed };
  }
  function muzzle(tank, angle = tank.angle) {
    const slope = terrainSlope(tank.x); const a = Math.max(0, Math.min(85, angle)) * Math.PI / 180;
    const scale = battlefieldScale(tank.x);
    const localX = tank.dir * (63 + 84 * Math.cos(a - slope)) * scale; const localY = (-76 - 84 * Math.sin(a - slope)) * scale;
    return { x: tank.x + localX * Math.cos(slope) - localY * Math.sin(slope), y: surfaceY(tank.x) + localX * Math.sin(slope) + localY * Math.cos(slope) };
  }
  function drawAimGuide(time) {
    const tank = activeTank(); if (!state.assist || !tank?.alive || state.winner || (state.opponent === "cpu" && tank.team === "right")) return;
    const origin = muzzle(tank);
    const v = aimVector(tank); const gravity = weaponData().effect === "rail" ? .05 : .16;
    ctx.save(); ctx.setLineDash([3, 9]); ctx.lineWidth = 1.2; ctx.strokeStyle = "#dfc18d88"; ctx.beginPath();
    let x = origin.x, y = origin.y, started = false;
    const wind = state.weather === "wind" ? .018 : state.weather === "rain" ? -.008 : .002;
    for (let i = 0; i < 170; i++) { v.x += wind; x += v.x; y += v.y; v.y += gravity; if (!started) { ctx.moveTo(origin.x, origin.y); started = true; } ctx.lineTo(x, y); if (x < -TERRAIN_OVERDRAW || x > W + TERRAIN_OVERDRAW || y > surfaceY(x) || obstacleAt(x, y)) break; }
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
  function drawProjectile(projectile) {
    const weapon = weaponData(projectile.weapon); const angle = Math.atan2(projectile.vy, projectile.vx);
    ctx.save(); ctx.translate(projectile.x, projectile.y); ctx.rotate(angle);
    if (["heavy", "cluster", "fire", "lava", "blast"].includes(weapon.effect)) {
      ctx.globalAlpha = .22; ctx.fillStyle = "#565450";
      for (let i = 0; i < 3; i++) { const d = 10 + i * 11; ctx.beginPath(); ctx.ellipse(-d, Math.sin(d + projectile.age) * 1.8, 8 + i * 2, 4 + i, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = .52; ctx.fillStyle = weapon.trail; ctx.shadowBlur = 8; ctx.shadowColor = weapon.color; ctx.beginPath(); ctx.arc(-4, 0, projectile.isSub ? 2 : 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    } else if (weapon.effect === "emp" || weapon.effect === "lightning") {
      ctx.strokeStyle = weapon.trail; ctx.lineWidth = 1.7; ctx.shadowBlur = 10; ctx.shadowColor = weapon.color;
      ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-16, -4); ctx.lineTo(-10, 3); ctx.lineTo(-3, -2); ctx.stroke(); ctx.shadowBlur = 0;
    } else if (weapon.effect === "ice") {
      ctx.globalAlpha = .55; ctx.strokeStyle = weapon.trail; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-27, 0); ctx.lineTo(-4, 0); ctx.moveTo(-18, -4); ctx.lineTo(-18, 4); ctx.stroke(); ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = .26; ctx.fillStyle = weapon.trail; ctx.beginPath(); ctx.ellipse(-11, 0, projectile.isSub ? 10 : weapon.effect === "rail" ? 30 : 24, projectile.isSub ? 3 : weapon.effect === "rail" ? 2.4 : 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    const trailCount = projectile.isSub ? 1 : weapon.effect === "rail" ? 7 : ["heavy", "cluster", "fire", "lava", "blast"].includes(weapon.effect) ? 2 : 3;
    const particleKind = ["heavy", "cluster", "fire", "lava", "blast"].includes(weapon.effect) ? "smoke"
      : weapon.effect === "ice" ? "frost" : weapon.effect === "acid" ? "bubble"
        : ["emp", "lightning"].includes(weapon.effect) ? "arc" : "streak";
    const smokeTints = { heavy: "#393735", cluster: "#484039", fire: "#47392f", lava: "#49352c", blast: "#424441" };
    for (let i = 0; i < trailCount; i++) {
      const p = {};
      const trailBack = particleKind === "smoke" ? .2 + Math.random() * .5 : Math.random() * .42;
      const crosswind = state.weather === "wind" ? .11 : state.weather === "rain" ? -.035 : .012;
      p.x = projectile.x - projectile.vx * trailBack; p.y = projectile.y - projectile.vy * trailBack;
      p.vx = -projectile.vx * (particleKind === "smoke" ? .025 : .018) + crosswind + (Math.random() - .5) * .42;
      p.vy = -projectile.vy * .018 - (particleKind === "smoke" ? .12 : 0) + (Math.random() - .5) * .3;
      p.life = particleKind === "smoke" ? 64 + Math.random() * 36 : 16 + Math.random() * 16; p.maxLife = p.life;
      p.size = particleKind === "smoke" ? 5.5 + Math.random() * 6 : 1 + Math.random() * (weapon.effect === "rail" ? 2 : 3);
      p.kind = particleKind; p.color = smokeTints[weapon.effect] || (Math.random() > .4 ? weapon.trail : weapon.color);
      p.angle = angle; p.age = 0; p.phase = Math.random() * Math.PI * 2; addParticle(p);
    }
    ctx.shadowBlur = weapon.effect === "rail" ? 16 : 9; ctx.shadowColor = weapon.color; ctx.fillStyle = weapon.color;
    ctx.beginPath(); ctx.ellipse(0, 0, projectile.isSub ? 4 : weapon.effect === "rail" ? 10 : 6, projectile.isSub ? 3 : 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawEffects() {
    for (const fx of effects) {
      const t = fx.age / fx.life; const remain = 1 - t; const w = weaponData(fx.weapon); const radius = fx.radius * (1 - remain * remain);
      ctx.save(); ctx.globalAlpha = Math.max(0, remain);
      if (fx.stage === "split") {
        ctx.strokeStyle = "#ffe59a"; ctx.lineWidth = 2.2; ctx.shadowBlur = 14; ctx.shadowColor = "#ff9e42";
        ctx.beginPath(); ctx.ellipse(fx.x, fx.y, radius * (1.1 + t), radius * (.34 + t * .2), 0, 0, Math.PI * 2); ctx.stroke();
        for (let pellet = 0; pellet < 5; pellet++) { const spread = pellet - 2, x = fx.x + spread * radius * .19; const y = fx.y - Math.max(0, 2 - Math.abs(spread)) * radius * .08;
          ctx.fillStyle = pellet % 2 ? "#ffd787" : "#fff2c1"; ctx.beginPath(); ctx.ellipse(x, y, 3 * remain, 2 * remain, spread * .18, 0, Math.PI * 2); ctx.fill(); }
      } else if (fx.stage === "subimpact") {
        const burst = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, radius * 1.9);
        burst.addColorStop(0, "#fff6cb"); burst.addColorStop(.28, "#ffc06a"); burst.addColorStop(.72, "#ed7134aa"); burst.addColorStop(1, "#a83b1a00");
        ctx.fillStyle = burst; ctx.beginPath(); ctx.arc(fx.x, fx.y, radius * 1.9, 0, Math.PI * 2); ctx.fill();
      } else if (w.effect === "emp") {
        for (let ring = 0; ring < 3; ring++) { ctx.beginPath(); ctx.ellipse(fx.x, fx.y, radius * (1 + ring * .24), radius * (.42 + ring * .12), 0, 0, Math.PI * 2); ctx.strokeStyle = ring % 2 ? "#8ffcff" : w.color; ctx.lineWidth = 3 - ring * .5; ctx.shadowBlur = 14; ctx.shadowColor = w.color; ctx.stroke(); }
      } else if (w.effect === "ice") {
        ctx.fillStyle = "#70deff38"; ctx.beginPath(); ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 10; i++) { const a = i * Math.PI * 2 / 10 + .4; ctx.strokeStyle = "#d2faff"; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(fx.x + Math.cos(a) * radius * .2, fx.y + Math.sin(a) * radius * .2); ctx.lineTo(fx.x + Math.cos(a) * radius * .95, fx.y + Math.sin(a) * radius * .95); ctx.stroke(); }
      } else if (w.effect === "lightning") {
        ctx.strokeStyle = "#fff9a1"; ctx.lineWidth = 3; ctx.shadowBlur = 13; ctx.shadowColor = "#fff6a0";
        for (let fork = 0; fork < 5; fork++) { const a = fork * Math.PI * .4 + .1; let px = fx.x, py = fx.y; ctx.beginPath(); ctx.moveTo(px, py); for (let i = 1; i <= 5; i++) { px = fx.x + Math.cos(a) * radius * i / 5 + Math.sin(i * 10 + fx.age) * 8; py = fx.y + Math.sin(a) * radius * i / 5; ctx.lineTo(px, py); } ctx.stroke(); }
      } else if (w.effect === "quantum") {
        ctx.fillStyle = "#1b1029aa"; ctx.beginPath(); ctx.arc(fx.x, fx.y, radius * .68, 0, Math.PI * 2); ctx.fill();
        for (let ring = 0; ring < 5; ring++) { ctx.beginPath(); ctx.ellipse(fx.x, fx.y, radius * (.25 + ring * .18), radius * (.18 + ring * .13), t * 4 + ring, 0, Math.PI * 2); ctx.strokeStyle = ring % 2 ? "#f4a0ff" : "#9ecaff"; ctx.lineWidth = 2; ctx.shadowBlur = 13; ctx.shadowColor = w.color; ctx.stroke(); }
      } else if (w.effect === "rail") {
        ctx.fillStyle = "#d8faff"; ctx.shadowBlur = 20; ctx.shadowColor = w.color; ctx.beginPath(); ctx.ellipse(fx.x, fx.y, radius * 1.9, radius * .18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = w.color; ctx.beginPath(); ctx.arc(fx.x, fx.y, radius * .35, 0, Math.PI * 2); ctx.fill();
      } else if (w.effect === "heavy") {
        const blast = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, radius * 1.35);
        blast.addColorStop(0, "#fff9df"); blast.addColorStop(.13, "#ffe3a0"); blast.addColorStop(.38, "#ff9b47e8"); blast.addColorStop(.74, "#a84827a8"); blast.addColorStop(1, "#34251c00");
        ctx.fillStyle = blast; ctx.beginPath(); ctx.arc(fx.x, fx.y, radius * 1.35, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ffd8a1"; ctx.lineWidth = 3 * remain; ctx.beginPath(); ctx.ellipse(fx.x, fx.y, radius * (1.45 + t), radius * (.38 + t * .4), 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        const glow = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, radius);
        if (w.effect === "plasma") { glow.addColorStop(0, "#ffffff"); glow.addColorStop(.18, "#edbbff"); glow.addColorStop(.52, "#a656ef99"); glow.addColorStop(1, "#652cba00"); }
        else if (w.effect === "acid") { glow.addColorStop(0, "#e6ff9c"); glow.addColorStop(.3, "#a2dc46c9"); glow.addColorStop(1, "#66a82100"); }
        else if (w.effect === "fire" || w.effect === "lava") { glow.addColorStop(0, "#fff4c4"); glow.addColorStop(.2, "#ffc243"); glow.addColorStop(.62, "#ec4a1ecc"); glow.addColorStop(1, "#a41d0b00"); }
        else { glow.addColorStop(0, "#fff9da"); glow.addColorStop(.19, "#ffca70"); glow.addColorStop(.55, "#f06e37bd"); glow.addColorStop(1, "#bc392000"); }
        ctx.fillStyle = glow; ctx.shadowBlur = 16; ctx.shadowColor = w.color; ctx.beginPath(); ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2); ctx.fill();
        if (w.effect === "heavy" || w.effect === "cluster") { ctx.fillStyle = "#ffd27b"; for (let i = 0; i < 12; i++) { const a = i * 2.4 + .3; const d = radius * (.65 + .3 * Math.sin(i)); ctx.beginPath(); ctx.arc(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d, 2.5 * remain, 0, Math.PI * 2); ctx.fill(); } }
      }
      ctx.restore();
    }
    for (const hazard of hazards) {
      ctx.save(); ctx.globalAlpha = .55 + Math.sin(hazard.life * .1) * .15; const color = hazard.kind === "fire" ? "#ff8239" : hazard.kind === "lava" ? "#fd4226" : "#b8ef62";
      ctx.fillStyle = color; ctx.shadowBlur = 13; ctx.shadowColor = color;
      for (let i = 0; i < 4; i++) { const x = hazard.x - hazard.radius + i * hazard.radius * .62; const h = 8 + Math.sin(hazard.life * .16 + i * 2) * 5; ctx.beginPath(); ctx.ellipse(x, hazard.y - h / 2, 5 + i % 2, h, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }
  function drawParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === "smoke") {
        p.age = (p.age || 0) + dt; p.vx += Math.sin(p.phase + p.age * .075) * .009 * dt;
        p.vx += (state.weather === "wind" ? .0016 : state.weather === "rain" ? -.0006 : .00025) * dt;
        p.vy -= .028 * dt;
      } else p.vy += .018 * dt;
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      const remain = Math.min(1, p.life / p.maxLife); const size = Math.max(.3, p.size * remain);
      ctx.save(); ctx.globalAlpha = remain;
      if (p.kind === "smoke") {
        p.size += .025 * dt; ctx.globalAlpha *= .66;
        const haze = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.25);
        haze.addColorStop(0, p.color || "#5a5550"); haze.addColorStop(1, "#36343200");
        ctx.fillStyle = haze; ctx.beginPath(); ctx.ellipse(p.x, p.y, size * 1.65, size * 1.12, (p.angle || 0) * .16 + Math.sin(p.phase + p.age * .06) * .08, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === "frost") {
        ctx.translate(p.x, p.y); ctx.rotate((p.angle || 0) + (1 - remain) * .7); ctx.strokeStyle = p.color || "#c7fbff"; ctx.lineWidth = Math.max(.6, size * .36);
        ctx.beginPath(); ctx.moveTo(-size * 1.4, 0); ctx.lineTo(size * 1.4, 0); ctx.moveTo(0, -size * 1.4); ctx.lineTo(0, size * 1.4); ctx.stroke();
      } else if (p.kind === "arc") {
        ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0); ctx.strokeStyle = p.color || "#c0ffff"; ctx.lineWidth = Math.max(.7, size * .42); ctx.shadowBlur = 6; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.moveTo(-size * 1.5, 0); ctx.lineTo(-size * .55, -size * .65); ctx.lineTo(size * .05, size * .5); ctx.lineTo(size * 1.2, -size * .4); ctx.stroke();
      } else if (p.kind === "bubble") {
        ctx.strokeStyle = p.color || "#e7ff91"; ctx.lineWidth = Math.max(.7, size * .28); ctx.beginPath(); ctx.arc(p.x, p.y, size * .8, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === "streak") {
        ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0); ctx.fillStyle = p.color || "#ffd489"; ctx.beginPath(); ctx.ellipse(0, 0, size * 1.8, Math.max(.45, size * .22), 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = p.color || "#ffd489"; ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function render(time = 0, dt = 1) {
    ctx.save(); if (state.shake > 0) { ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake); state.shake *= .82; }
    drawBackground(time);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(WORLD_ZOOM, WORLD_ZOOM); ctx.translate(-W / 2, -H / 2);
    drawTerrain(); drawAtmosphericSmoke(); drawObstacles(time);
    for (const tank of state.tanks) drawTank(tank, time);
    drawAimGuide(time);
    for (const projectile of projectiles) drawProjectile(projectile);
    drawEffects(); drawParticles(dt);
    if (state.weather === "rain") drawRain(time);
    ctx.restore();
    if (state.night) drawNightVision(time);
    ctx.restore();
  }
  function drawRain(time) {
    ctx.save(); ctx.strokeStyle = "#a8c7db42"; ctx.lineWidth = 1; for (let i = 0; i < 75; i++) { const x = (i * 79 + time * .18) % W; const y = (i * 67 + time * .58) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13); ctx.stroke(); } ctx.restore();
  }
  function drawNightVision(time) {
    ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "#06120d"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(W * .52, H * .58, 20, W * .52, H * .58, W * .56); glow.addColorStop(0, "#b5ffad45"); glow.addColorStop(1, "#00e67600"); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = "#9cffaf36"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(W / 2, H / 2, 240 + Math.sin(time / 500) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#c9ffd080"; ctx.font = "10px monospace"; ctx.fillText("NVG // GEN III", 30, H - 24); ctx.restore();
  }
  function resize() {
    const box = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round((box.width || W) * ratio); canvas.height = Math.round((box.height || (box.width || W) * H / W) * ratio);
  }
  function frame(time) {
    const dt = Math.min(2, state.lastTime ? (time - state.lastTime) / 16.67 : 1); state.lastTime = time;
    update(dt); ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); render(time, dt); requestAnimationFrame(frame);
  }
  function update(dt) {
    updateAmbientSmoke(dt);
    if (state.aiMove) {
      const move = state.aiMove;
      move.elapsed += dt;
      const progress = Math.min(1, move.elapsed / move.duration);
      const eased = progress * progress * (3 - 2 * progress);
      move.tank.x = move.startX + (move.targetX - move.startX) * eased;
      if (progress >= 1) {
        move.tank.x = move.targetX; state.aiMove = null; state.moving = false; refreshHud();
        setTimeout(() => cpuTakeShot(move.tank, move.target, move.aimPoint), 280);
      }
    } else if (state.moving) {
      const tank = activeTank(); if (tank) { tank.x += tank.move * 2.2 * dt; tank.x = Math.max(FIELD_LAYOUT.moveMin, Math.min(FIELD_LAYOUT.moveMax, tank.x)); }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]; const w = weaponData(p.weapon); const wind = state.weather === "wind" ? .018 : state.weather === "rain" ? -.008 : .002; p.vx += wind * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (w.effect === "rail" ? .05 : .16) * dt; p.age += dt;
      const clearance = surfaceY(p.x) - p.y;
      if (w.effect === "cluster" && !p.isSub && p.vy > 0 && clearance < 96) {
        effects.push({ x: p.x, y: p.y, weapon: w.key, age: 0, life: 18, radius: 34, stage: "split" });
        for (let j = 0; j < 5; j++) {
          const spread = j - 2;
          projectiles.push({ x: p.x + spread * 2, y: p.y, vx: p.vx * .72 + spread * 1.05,
            vy: p.vy * .72 - (2 - Math.abs(spread)) * .7, weapon: p.weapon, team: p.team, age: 0, isSub: true });
        }
        projectiles.splice(i, 1); continue;
      }
      const hit = state.tanks.find((tank) => {
        if (!tank.alive || tank.team === p.team) return false;
        const scale = battlefieldScale(tank.x);
        return Math.abs(tank.x - p.x) < 37 * scale && Math.abs((surfaceY(tank.x) - 44 * scale) - p.y) < 29 * scale;
      });
      const groundHit = p.x < -TERRAIN_OVERDRAW + 4 || p.x > W + TERRAIN_OVERDRAW - 4 || p.y > surfaceY(Math.max(-TERRAIN_OVERDRAW, Math.min(W + TERRAIN_OVERDRAW, p.x))) || p.y > H - 8;
      const coverHit = obstacleAt(p.x, p.y);
      if (hit || coverHit || groundHit || p.age > 180) { impact(p.x, p.y, w, p.team, hit, p.isSub); projectiles.splice(i, 1); if (projectiles.length === 0) setTimeout(nextTurn, 850); }
    }
    for (let i = effects.length - 1; i >= 0; i--) { effects[i].age += dt; if (effects[i].age > effects[i].life) effects.splice(i, 1); }
    for (let i = hazards.length - 1; i >= 0; i--) {
      const hazard = hazards[i]; hazard.life -= dt;
      for (const tank of state.tanks) if (tank.alive && Math.abs(tank.x - hazard.x) < hazard.radius * .7 && hazard.life % 15 < dt) damageTank(tank, hazard.kind === "lava" ? 3 : 2);
      if (hazard.life <= 0) hazards.splice(i, 1);
    }
    if (state.weather === "wind") { $("windReadout").textContent = "09 ⇢"; }
    refreshTargetCard();
  }
  function damageTank(tank, amount) {
    if (amount <= 0 || !tank.alive) return;
    tank.damageStage = Math.min(3, (tank.damageStage || 0) + 1);
    tank.hp = Math.max(0, tank.hp - amount);
    if (tank.hp === 0) { tank.alive = false; tank.smokeUntil = performance.now() + 9000; }
  }
  function impact(x, y, weapon, team, directHit, isSub = false) {
    const w = weapon; let radius = w.radius;
    const damage = w.damage * (isSub ? .62 : 1);
    if (isSub && w.effect === "cluster") radius = 14;
    if (w.effect === "rail") radius = 21;
    if (w.effect === "quantum") state.shake = 12;
    if (w.effect === "emp") radius *= .84;
    deformTerrain(x, y, radius * (w.effect === "rail" ? .4 : 1), isSub ? 5 : w.effect === "rail" ? 8 : Math.min(70, radius * .62));
    effects.push({ x, y, weapon: w.key, age: 0, life: isSub ? 22 : w.effect === "quantum" ? 60 : w.effect === "emp" ? 44 : 35, radius, stage: isSub ? "subimpact" : "impact" });
    // Armor only drops on a direct shell/pellet collision. Blast radius still
    // deforms terrain and damages placed scenery, but near-misses do not hurt tanks.
    if (directHit?.alive && directHit.team !== team) {
      const multiplier = w.effect === "emp" ? .55 : w.effect === "ice" ? .78 : 1;
      damageTank(directHit, Math.max(1, Math.round(damage * multiplier)));
    }
    for (const object of obstacles) {
      if (!object.active) continue;
      const distance = Math.hypot(object.x - x, surfaceY(object.x) - object.height * .48 - y);
      const reach = radius + object.width * .48 * battlefieldScale(object.x);
      if (distance < reach) {
        object.hp = Math.max(0, object.hp - damage * Math.max(.22, 1 - distance / reach));
        if (object.hp === 0) {
          object.active = false;
          object.destroyed = true;
          for (let i = 0; i < (object.type === "bunker" ? 34 : 24); i++) { const a = Math.random() * Math.PI * 2; const speed = 1 + Math.random() * 6; const concreteChip = object.type === "bunker" && Math.random() > .45; addParticle({ x: object.x + (Math.random() - .5) * object.width, y: surfaceY(object.x) - object.height * .45, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 1.5, life: 28 + Math.random() * 25, maxLife: 55, size: 2 + Math.random() * (object.type === "bunker" ? 7 : 5), color: object.type === "wreck" ? "#766653" : concreteChip ? "#625f58" : object.type === "bunker" ? "#b4a78d" : "#9b9077" }); }
          announce("OBSTACLE BREACHED // FIRING LANE OPEN");
        }
      }
    }
    if (w.effect === "fire" || w.effect === "lava" || w.effect === "acid") hazards.push({ x, y: surfaceY(x) - 5, radius: radius * .85, kind: w.effect, life: w.effect === "lava" ? 260 : 200 });
    const count = isSub ? 22 : w.effect === "rail" ? 25 : w.effect === "heavy" ? 115 : 80;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2; const v = 1 + Math.random() * (w.effect === "heavy" ? 8 : 5); const p = { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 18 + Math.random() * 35, maxLife: 50, size: 1 + Math.random() * 3, color: Math.random() > .45 ? w.color : w.trail }; addParticle(p);
    }
    state.shake = Math.max(state.shake, Math.min(9, radius / 10));
    const current = state.tanks.find((tank) => tank.team === team && tank.alive); if (current) current.smokeUntil = performance.now() + 1200;
    if (!isSub) announce(`${w.name.toUpperCase()} IMPACT // ${w.effect === "emp" ? "ELECTROMAGNETIC PULSE" : w.effect === "ice" ? "CRYO FRACTURE" : w.effect === "fire" ? "INCENDIARY SPREAD" : w.effect === "rail" ? "KINETIC PENETRATION" : "TERRAIN BREACH"}`);
  }
  function deformTerrain(x, y, radius, depth) {
    for (let i = 0; i < terrain.length; i++) {
      const tx = i * STEP; const d = Math.abs(tx - x);
      if (d < radius) { const influence = Math.sqrt(Math.max(0, 1 - (d / radius) ** 2)); terrain[i] = Math.min(H - 25, terrain[i] + depth * influence); }
    }
    terrainDirty = true;
  }
  function fire(fromCpu = false) {
    const tank = activeTank(); if (!tank?.alive || state.winner || projectiles.length || state.moving || (!fromCpu && state.opponent === "cpu" && tank.team === "right")) return;
    tank.angle = state.angle; const v = aimVector(tank); const start = muzzle(tank);
    projectiles.push({ x: start.x, y: start.y, vx: v.x, vy: v.y, weapon: state.weapon, team: tank.team, age: 0, isSub: false });
    tank.angle = state.angle; fireButton.disabled = true;
  }
  function cpuShotSolution(tank, target) {
    let best = { score: Infinity, angle: 25, power: 65, blocked: true };
    const weapon = weaponData(); const originalX = tank.x;
    for (let angle = 1; angle <= 85; angle += 3) for (let power = 40; power <= 100; power += 6) {
      const radians = angle * Math.PI / 180; const speed = weapon.speed * (.45 + power / 100 * .75);
      const start = muzzle(tank, angle); const vx = Math.cos(radians) * speed * tank.dir; const vy = -Math.sin(radians) * speed;
      const flight = (target.x - start.x) / vx; const gravity = weapon.effect === "rail" ? .05 : .16;
      let blocked = flight <= 0 || flight > 210;
      if (!blocked) for (let sample = 1; sample <= 16; sample++) {
        const t = flight * sample / 17; const sx = start.x + vx * t; const sy = start.y + vy * t + .5 * gravity * t * t;
        if (sy > surfaceY(sx) - 4 || obstacleAt(sx, sy)) { blocked = true; break; }
      }
      const landingY = start.y + vy * flight + .5 * gravity * flight * flight;
      const targetHeight = 42 * battlefieldScale(target.x);
      const miss = Math.abs(landingY - (surfaceY(target.x) - targetHeight));
      const score = miss + (blocked ? 390 : 0) + angle * .025 + power * .01;
      if (score < best.score) best = { score, angle, power, blocked };
    }
    tank.x = originalX;
    return best;
  }
  function cpuHasCover(x, target) {
    const protectiveCover = obstacles.some((item) => item.active && ["bunker", "wall", "ruin", "jeep", "tree"].includes(item.type)
      && item.x > Math.min(target.x, x) && item.x < Math.max(target.x, x) && Math.abs(x - item.x) < 210);
    if (protectiveCover) return true;
    const fromY = surfaceY(target.x) - 44 * battlefieldScale(target.x), toY = surfaceY(x) - 44 * battlefieldScale(x);
    for (let sample = 1; sample < 12; sample++) {
      const t = sample / 12, sx = target.x + (x - target.x) * t, lineY = fromY + (toY - fromY) * t;
      if (surfaceY(sx) < lineY - 14) return true;
      const object = obstacles.find((item) => item.active && Math.abs(item.x - sx) < 20 * battlefieldScale(item.x)
        && lineY >= surfaceY(item.x) - item.height * battlefieldScale(item.x) && lineY <= surfaceY(item.x));
      if (object) return true;
    }
    return false;
  }
  function cpuPathClear(fromX, toX) {
    const direction = Math.sign(toX - fromX);
    for (let x = fromX + direction * 24; direction && Math.abs(x - fromX) < Math.abs(toX - fromX); x += direction * 24) {
      if (obstacleAt(x, surfaceY(x) - 35)) return false;
    }
    return true;
  }
  function cpuTakeShot(tank, target, aimPoint = target) {
    if (!tank?.alive || state.winner || state.opponent !== "cpu" || !target?.alive) return;
    const best = cpuShotSolution(tank, aimPoint);
    const skill = CPU_SKILL[state.difficulty] || CPU_SKILL.recruit;
    const angleError = (Math.random() - .5) * skill.angleError;
    const chargeError = (Math.random() - .5) * skill.chargeError;
    state.angle = clamp(Math.round(best.angle + angleError), 0, 85);
    state.power = clamp(Math.round(best.power + chargeError), 35, 100); tank.angle = state.angle;
    angleInput.value = state.angle; powerInput.value = state.power; $("angleValue").textContent = state.angle; $("powerValue").textContent = state.power;
    fireButton.disabled = false; fire(true);
  }
  function cpuTurn() {
    const tank = activeTank(); if (!tank?.alive || state.winner || state.opponent !== "cpu" || tank.team !== "right") return;
    const targets = living("left"); if (!targets.length) return;
    const target = targets.sort((a, b) => Math.abs(a.x - tank.x) - Math.abs(b.x - tank.x))[0];
    const skill = CPU_SKILL[state.difficulty] || CPU_SKILL.recruit;
    const range = Math.abs(tank.x - target.x);
    const scatter = skill.impactError * (.7 + .3 * Math.min(1, range / 1000));
    const aimPoint = { ...target, x: clamp(target.x + (Math.random() - .5) * scatter * 2, 35, W - 35) };
    const currentX = tank.x, currentShot = cpuShotSolution(tank, aimPoint);
    const currentCover = cpuHasCover(currentX, target);
    const allies = state.tanks.filter((other) => other.alive && other.team === tank.team && other !== tank);
    const candidates = [-180, 180].map((offset) => Math.max(FIELD_LAYOUT.moveMin, Math.min(FIELD_LAYOUT.moveMax, currentX + offset)))
      .filter((x, i, list) => Math.abs(x - currentX) > 55 && list.indexOf(x) === i)
      .filter((x) => !allies.some((ally) => Math.abs(ally.x - x) < 115))
      .filter((x) => cpuPathClear(currentX, x))
      .filter((x) => !obstacleAt(x, surfaceY(x) - 35));
    let moveChoice = null;
    for (const x of candidates) {
      tank.x = x; const shot = cpuShotSolution(tank, aimPoint); tank.x = currentX;
      const covered = cpuHasCover(x, target);
      const defensiveCredit = covered && tank.hp <= 62 ? 210 : covered && tank.hp <= 82 ? 85 : 0;
      const utility = shot.score - defensiveCredit;
      const currentUtility = currentShot.score - (currentCover && tank.hp <= 62 ? 210 : currentCover && tank.hp <= 82 ? 85 : 0);
      const betterFiringLane = shot.score < currentShot.score - 24;
      const defensiveReposition = tank.hp <= 62 && covered && !currentCover && shot.score < currentShot.score + 500;
      if ((betterFiringLane || defensiveReposition) && (!moveChoice || utility < moveChoice.utility)) moveChoice = { x, utility, covered, shot };
    }
    if (moveChoice) {
      state.moving = true; fireButton.disabled = true;
      state.aiMove = { tank, target, aimPoint, startX: currentX, targetX: moveChoice.x, elapsed: 0, duration: Math.max(32, Math.abs(moveChoice.x - currentX) / 2.2) };
      refreshHud();
      announce(moveChoice.covered && tank.hp <= 62 ? "HOSTILE REPOSITIONING // SEEKING COVER" : "HOSTILE REPOSITIONING // CLEARING FIRING LANE");
      return;
    }
    cpuTakeShot(tank, target, aimPoint);
  }
  function moveTank(delta) {
    const tank = activeTank(); if (!tank?.alive || projectiles.length || state.winner || (state.opponent === "cpu" && tank.team === "right")) return;
    const sameSide = state.tanks.filter((other) => other.alive && other.team === tank.team && other !== tank);
    const next = Math.max(FIELD_LAYOUT.moveMin, Math.min(FIELD_LAYOUT.moveMax, tank.x + delta * 24));
    if (sameSide.some((other) => Math.abs(other.x - next) < 115)) { announce("TRACKS BLOCKED BY FRIENDLY UNIT"); return; }
    tank.x = next; tank.move = 0; refreshHud();
  }
  function useSupport() {
    const tank = activeTank(); if (!tank || state.support === "off" || state.supportUsed[tank.team] || projectiles.length || state.winner || (state.opponent === "cpu" && tank.team === "right")) { announce("NO SUPPORT AVAILABLE"); return; }
    state.supportUsed[tank.team] = true;
    let delay = 350;
    if (state.support === "repair") { tank.hp = Math.min(100, tank.hp + 30); announce("FIELD CREW // ARMOR PATCHED +30"); }
    else if (state.support === "scanner") {
      state.scanUntil = performance.now() + 7000; announce("RECON SCAN // CONTACTS PAINTED FOR 7 SECONDS");
    } else {
      const target = living(tank.team === "left" ? "right" : "left").sort((a, b) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2))[0];
      const supportWeapon = { air: "heavy", laser: "rail", rod: "lightning", meteor: "quantum" }[state.support];
      if (target) {
        if (state.support === "air" || state.support === "meteor") {
          delay = state.support === "air" ? 1450 : 950;
          const weapon = weapons.find((w) => w.key === supportWeapon);
          for (let i = 0; i < (state.support === "air" ? 3 : 1); i++) setTimeout(() => { if (!state.winner) impact(target.x + (Math.random() - .5) * 90, surfaceY(target.x), weapon, tank.team, target); }, i * 330);
        } else {
          const weapon = weapons.find((w) => w.key === supportWeapon); impact(target.x, surfaceY(target.x) - 45, weapon, tank.team, target);
        }
      }
      announce(`${({ air: "AIR SUPPORT INBOUND", laser: "ORBITAL LASER LOCK", rod: "LIGHTNING ROD CHARGING", meteor: "METEOR DROP INBOUND" })[state.support]} // TARGET MARKED`);
    }
    refreshHud(); setTimeout(() => { if (!state.winner) nextTurn(); }, delay);
  }
  function saveGame() {
    const saved = { ...state, tanks: state.tanks, terrain, obstacles, projectiles: [], effects: [], particles: [], hazards: [] };
    try { localStorage.setItem("tam-v2-save", JSON.stringify(saved)); announce("BATTLE STATE SAVED TO THIS BROWSER"); } catch { announce("SAVE FAILED // STORAGE UNAVAILABLE"); }
  }
  function loadGame() {
    try {
      const saved = JSON.parse(localStorage.getItem("tam-v2-save") || "null"); if (!saved || !Array.isArray(saved.terrain) || !Array.isArray(saved.tanks)) throw new Error("No save");
      Object.assign(state, saved); terrain.splice(0, terrain.length, ...saved.terrain); obstacles.splice(0, obstacles.length, ...(Array.isArray(saved.obstacles) ? saved.obstacles : [])); terrainDirty = true; state.tanks = saved.tanks; projectiles.length = 0; effects.length = 0; particles.length = 0; hazards.length = 0;
      $("mode").value = state.mode; $("opponent").value = state.opponent; $("formation").value = String(state.formation); $("difficulty").value = state.difficulty; $("weather").value = state.weather; $("smoke").value = state.smoke || "thin"; $("support").value = state.support;
      angleInput.value = state.angle; powerInput.value = state.power; $("angleValue").textContent = state.angle; $("powerValue").textContent = state.power; refreshWeaponChoices(); selectTurn(state.turnIndex, false); announce("BATTLE STATE RESTORED");
    } catch { announce("NO VALID FIELD SAVE FOUND"); }
  }
  function aimChange() {
    state.angle = Number(angleInput.value); const tank = activeTank(); if (tank) tank.angle = state.angle; $("angleValue").textContent = state.angle;
  }
  angleInput.addEventListener("input", aimChange);
  powerInput.addEventListener("input", () => { state.power = Number(powerInput.value); $("powerValue").textContent = state.power; });
  weaponSelect.addEventListener("change", () => { state.weapon = weaponSelect.value; updateWeaponReadout(); });
  fireButton.addEventListener("click", fire);
  $("moveLeft").addEventListener("click", () => moveTank(-1)); $("moveRight").addEventListener("click", () => moveTank(1));
  $("newMap").addEventListener("click", () => { if (projectiles.length || state.moving) { announce("WAIT FOR THE ROUND TO CLEAR"); return; } newMap(); });
  $("saveGame").addEventListener("click", saveGame); $("loadGame").addEventListener("click", loadGame);
  $("helpButton").addEventListener("click", () => $("manualDialog").showModal());
  $("nightToggle").addEventListener("click", (event) => { state.night = !state.night; const btn = event.currentTarget; btn.classList.toggle("is-on", state.night); btn.setAttribute("aria-pressed", String(state.night)); btn.querySelector("span").textContent = state.night ? "ON" : "OFF"; });
  $("assistToggle").addEventListener("click", (event) => { state.assist = !state.assist; const btn = event.currentTarget; btn.classList.toggle("is-on", state.assist); btn.setAttribute("aria-pressed", String(state.assist)); btn.querySelector("span").textContent = state.assist ? "ON" : "OFF"; });
  $("applySettings").addEventListener("click", applyModeSettings);
  $("formation").addEventListener("change", (event) => { if (state.mode !== "campaign" && state.mode !== "night") { state.formation = Number(event.target.value); } });
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    if (event.repeat || $("manualDialog").open || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const tank = activeTank(); if (!tank) return;
    const key = event.key.toLowerCase();
    if (["w", "s", "q", "e", "a", "d", " "].includes(key) || event.key === "Enter") event.preventDefault();
    if (key === "w") { state.angle = Math.min(85, state.angle + 1); angleInput.value = state.angle; aimChange(); }
    if (key === "s") { state.angle = Math.max(0, state.angle - 1); angleInput.value = state.angle; aimChange(); }
    if (key === "q") { state.power = Math.max(20, state.power - 1); powerInput.value = state.power; $("powerValue").textContent = state.power; }
    if (key === "e") { state.power = Math.min(100, state.power + 1); powerInput.value = state.power; $("powerValue").textContent = state.power; }
    if (key === "a") moveTank(-1); if (key === "d") moveTank(1);
    if (key === " " || event.key === "Enter") fire();
  });
  const supportButton = document.createElement("button"); supportButton.className = "control-button slim support-button"; supportButton.type = "button"; supportButton.innerHTML = "✦ <span>NO SUPPORT</span>"; supportButton.title = "Select a support option in Mission Configuration"; supportButton.addEventListener("click", useSupport);
  document.querySelector(".utility-actions").append(supportButton);
  createTerrain(); generateObstacles(); setFormation(2); refreshWeaponChoices(); resize(); selectTurn(0, false); refreshHud();
  requestAnimationFrame(frame);
})();
