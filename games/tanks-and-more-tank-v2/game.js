(() => {
  "use strict";

  const W = 1400;
  const H = 760;
  const BALLISTIC_GRAVITY = .16;
  // Keep the calibrated high arc/range, but play it at artillery-shot pace.
  // Gravity naturally reduces speed on ascent and increases it on descent.
  const FLIGHT_TIME_SCALE = 1.65;
  const MAX_BALLISTIC_STEP = .5;
  const MAX_FLIGHT_FRAMES = 420;
  const MAX_FULL_CHARGE_SPEED = 20;
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
  const playerChassisSelect = $("playerChassis");
  const cockpitViewSelect = $("cockpitView");
  const fireButton = $("fire");
  const cockpitSkin = $("cockpitSkin");
  const gaugeLayer = document.createElement("div");
  gaugeLayer.className = "gauge-layer";
  for (const [kind, selector] of [["elevation", ".angle-instrument"], ["charge", ".power-instrument"]]) {
    const instrument = document.querySelector(selector), dial = document.createElement("div");
    dial.className = `live-dial live-${kind}`;
    for (const node of instrument.querySelectorAll(".dial-face, .dial-label, .wheel-handle")) dial.append(node);
    gaugeLayer.append(dial);
  }
  cockpitSkin.before(gaugeLayer);
  // Photo hardware is a real moving layer behind the fixed steel shell. The
  // accessible controls above it supply input; sockets and guard rails stay put.
  const hardwareLayer = document.createElement("div");
  hardwareLayer.className = "hardware-layer";
  const hardwareParts = {};
  for (const part of ["fire", "night", "assist"]) {
    const mount = document.createElement("div"), face = document.createElement("div"), photo = new Image();
    mount.className = `hardware-mount hardware-${part}`; face.className = "hardware-face";
    photo.alt = ""; photo.draggable = false; photo.setAttribute("aria-hidden", "true");
    face.append(photo); mount.append(face); hardwareLayer.append(mount);
    hardwareParts[part] = { mount, face, photo };
  }
  for (const node of fireButton.querySelectorAll("strong, small")) hardwareParts.fire.face.append(node);
  fireButton.setAttribute("aria-label", "Fire main gun");
  fireButton.title = "Fire main gun · Enter / Space";
  cockpitSkin.before(hardwareLayer);
  const HARDWARE_GEOMETRY = {
    m40: { fire: [900,640,207,203,1003,741], night: [1291,700,80,168,1314,720], assist: [1483,706,89,162,1506,727] },
    r12: { fire: [1107,614,70,272,1137,649], night: [1316,677,88,171,1341,703], assist: [1516,677,94,171,1542,707] },
    b76: { fire: [894,640,207,203,997,741], night: [1284,694,82,182,1308,730], assist: [1482,694,86,182,1505,730] },
    s90: { fire: [900,640,207,203,1003,741], night: [1291,700,80,168,1314,720], assist: [1483,706,89,162,1506,727] },
  };
  // Dial positions are calibrated to each photographed fascia. R12 has a
  // right-shifted pair; M40, B76 and S90 share the left-row apertures.
  const GAUGE_GEOMETRY = {
    // [center x/y, live face width/height, mask radius x/y], in photo pixels.
    // Oversized live faces extend under the steel; the mask defines the aperture.
    m40: { angle: [281, 724, 330, 330, 134, 132], power: [647, 736, 280, 280, 114, 110], guard: "M62 641 Q135 649 213 678 L200 697 Q193 720 190 746 L205 783 Q172 800 151 782 L115 731 L62 712 Z M205 875 L215 851 Q233 829 263 836 Q280 821 298 835 L331 824 Q333 810 354 802 Q376 796 393 815 L411 841 L383 895 L236 921 Z" },
    r12: { angle: [582, 724, 280, 280, 106, 110], power: [854, 727, 280, 280, 109, 112], guard: "M447 684 Q478 682 487 697 L485 720 Q474 731 460 725 L447 713 Z" },
    b76: { angle: [280, 720, 330, 330, 133, 129], power: [644, 732, 280, 280, 112, 109], guard: "M62 641 Q135 649 213 678 L200 697 Q193 720 190 746 L205 783 Q172 800 151 782 L115 731 L62 712 Z M205 875 L215 851 Q233 829 263 836 Q280 821 298 835 L331 824 Q333 810 354 802 Q376 796 393 815 L411 841 L383 895 L236 921 Z" },
    s90: { angle: [279, 723, 330, 330, 134, 131], power: [647, 738, 280, 280, 114, 111], guard: "M62 641 Q135 649 213 678 L200 697 Q193 720 190 746 L205 783 Q172 800 151 782 L115 731 L62 712 Z M205 875 L215 851 Q233 829 263 836 Q280 821 298 835 L331 824 Q333 810 354 802 Q376 796 393 815 L411 841 L383 895 L236 921 Z" },
  };
  const hardwarePath = (chassis, part) => `assets/hardware/${chassis}-${part}.webp?v=20261002-moving-hardware`;
  // Keep the battlefield aperture wide, while the tank-specific lower fascia
  // stays in its own undistorted 1672:941 frame. Scaling one full dashboard
  // over the whole stage made the controls consume almost half the screen.
  const instrumentFrame = document.createElement("div"); instrumentFrame.className = "instrument-frame";
  const dashboardFrame = document.createElement("div"); dashboardFrame.className = "dashboard-frame";
  const windowArmor = new Image(); windowArmor.className = "window-armor"; windowArmor.alt = ""; windowArmor.setAttribute("aria-hidden","true");
  const stage = document.querySelector(".canvas-wrap");
  dashboardFrame.append(gaugeLayer, hardwareLayer, cockpitSkin, document.querySelector(".console"));
  instrumentFrame.append(windowArmor, dashboardFrame);
  stage.append(instrumentFrame);
  document.body.dataset.inputMode = "pointer";
  window.addEventListener("pointerdown", () => { document.body.dataset.inputMode = "pointer"; }, true);
  window.addEventListener("keydown", () => { document.body.dataset.inputMode = "keyboard"; }, true);
  const CHASSIS = Object.freeze({
    m40: { name: "M40 LINE", hp: 100, travel: 180, scenery: 1.15, direct: 1, mitigation: 1, skin: "cockpit-m40-line.webp", specialty: "BREACH CREW · +15% scenery damage" },
    r12: { name: "R12 SCOUT", hp: 90, travel: 240, scenery: 1, direct: 1, mitigation: 1, skin: "cockpit-r12-scout.webp", specialty: "RECON DRIVE · 240 m reposition allowance" },
    b76: { name: "B76 BULWARK", hp: 115, travel: 120, scenery: 1, direct: 1, mitigation: .9, skin: "cockpit-b76-bulwark.webp", specialty: "REINFORCED ARMOR · 10% less direct hit damage" },
    s90: { name: "S90 SIEGE", hp: 95, travel: 144, scenery: 1.2, direct: 1.1, mitigation: 1, skin: "cockpit-s90-siege.webp", specialty: "SIEGE GUN · +10% shell damage / +20% scenery" },
  });
  const defaultChassis = (id) => ({ L1: "m40", R1: "r12", L2: "b76", R2: "s90" })[id] || "m40";
  const chassisData = (tank) => CHASSIS[tank?.chassis] || CHASSIS[defaultChassis(tank?.id)];
  const skinPath = (chassis) => `assets/${chassis.skin}?v=20261002-moving-hardware`;
  // Decode all four lightweight fascias once; turn changes never wait for art.
  for (const chassis of Object.values(CHASSIS)) { const skin = new Image(); skin.src = skinPath(chassis); }
  for (const chassis of Object.keys(CHASSIS)) for (const part of Object.keys(hardwareParts)) { const photo = new Image(); photo.src = hardwarePath(chassis, part); }
  const missionMenu = document.querySelector(".mission-settings");
  missionMenu.querySelector("summary").innerHTML = '<span>MISSION MENU</span>';
  document.querySelector(".topbar").append(missionMenu);
  // Chassis/crew details are HUD information, not a label floating over the
  // lower fascia. Keep the same live text, but put it beside the field-test stamp.
  const topbar = document.querySelector(".topbar");
  const crewPlate = document.querySelector(".crew-plate");
  topbar.insertBefore(crewPlate, topbar.querySelector("nav"));
  const crewReadouts = document.querySelector(".keyline");
  topbar.insertBefore(crewReadouts, topbar.querySelector("nav"));
  // Keep the small battlefield telemetry on the top rail instead of floating
  // over the enlarged terrain and hiding sightlines.
  const sceneReadouts = document.querySelector(".readouts");
  topbar.insertBefore(sceneReadouts, topbar.querySelector("nav"));
  topbar.insertBefore($("mapReadout"), topbar.querySelector("nav"));
  const viewControl = document.querySelector(".cockpit-selector");
  topbar.insertBefore(viewControl, topbar.querySelector("nav"));
  const trackSteering = document.createElement("div");
  trackSteering.className = "track-steering";
  trackSteering.setAttribute("aria-label", "Tank movement controls");
  for (const id of ["moveLeft", "moveRight"]) trackSteering.append($(id));
  topbar.insertBefore(trackSteering, topbar.querySelector("nav"));
  const loadedRound = document.createElement("div");
  loadedRound.className = "loaded-round";
  loadedRound.setAttribute("aria-live", "polite");
  loadedRound.innerHTML = '<span class="loaded-round-icon" aria-hidden="true">●</span><span><b id="loadedWeaponName">120mm Shell</b></span>';
  topbar.insertBefore(loadedRound, topbar.querySelector("nav"));
  const menuActions = document.createElement("div");
  menuActions.className = "menu-actions";
  for (const id of ["newMap", "saveGame", "loadGame", "helpButton"]) menuActions.append($(id));
  const missionPanel = document.createElement("div");
  missionPanel.className = "mission-panel";
  missionPanel.append($("missionRecords"), missionMenu.querySelector(".settings-grid"), menuActions);
  missionMenu.append(missionPanel);
  weaponSelect.setAttribute("aria-hidden", "true");
  weaponSelect.tabIndex = -1;
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
  const ordnanceRack = $("ordnanceRack");
  const ordnanceConsole = document.createElement("aside");
  ordnanceConsole.className = "side-console ordnance-console";
  ordnanceConsole.setAttribute("aria-label", "Ammunition side console");
  const consoleTitle = document.createElement("span"); consoleTitle.className = "console-stencil"; consoleTitle.textContent = "AMMUNITION";
  const selectedShellArt = document.createElement("span"); selectedShellArt.className = "selected-shell-art"; selectedShellArt.setAttribute("aria-hidden", "true");
  loadedRound.prepend(selectedShellArt);
  ordnanceConsole.append(consoleTitle, ordnanceRack, loadedRound);
  const statusConsole = document.createElement("aside"); statusConsole.className = "side-console status-console";
  statusConsole.setAttribute("aria-label", "Battle information and driving controls");
  const battleStrip = document.createElement("div"); battleStrip.className = "battle-strip";
  battleStrip.setAttribute("aria-label", "Sector and armor status");
  battleStrip.append(document.querySelector(".mission-card"), $("mapReadout"), $("targetCard"));
  topbar.insertBefore(battleStrip, topbar.querySelector("nav"));
  statusConsole.append(crewPlate, crewReadouts, sceneReadouts, viewControl, trackSteering);
  instrumentFrame.append(ordnanceConsole, statusConsole);
  let switchHintTimer = 0;
  function showSwitchHints() {
    clearTimeout(switchHintTimer);
    for (const hardware of [hardwareParts.night, hardwareParts.assist]) hardware.mount.classList.remove("is-hinting");
    if (state.level !== 1 && state.atmosphere !== "NIGHTFALL") return;
    hardwareParts.night.mount.classList.add("is-hinting");
    if (state.level === 1) hardwareParts.assist.mount.classList.add("is-hinting");
    switchHintTimer = window.setTimeout(() => {
      hardwareParts.night.mount.classList.remove("is-hinting"); hardwareParts.assist.mount.classList.remove("is-hinting");
    }, 2800);
  }
  const weaponGlyphs = {
    blast: '<path d="M5 10h15l8 5-8 5H5l-3-5z"/><path d="M8 10v10m4-10v10"/>',
    heavy: '<path d="M4 8h17l5 7-5 7H4l-2-7z"/><path d="M8 8v14m5-14v14m5-14v14"/>',
    ice: '<path d="M4 11h19l5 4-5 4H4l-2-4z"/><path d="M12 8v12m-4-9 8 6m0-6-8 6"/>',
    cluster: '<path d="M4 11h17l6 4-6 4H4l-2-4z"/><circle cx="10" cy="15" r="1.7"/><circle cx="15" cy="15" r="1.7"/><circle cx="20" cy="15" r="1.7"/>',
    emp: '<path d="M4 11h18l6 4-6 4H4l-2-4z"/><path d="m14 8-3 5h4l-3 6 7-8h-4l3-3z"/>',
    fire: '<path d="M4 11h18l6 4-6 4H4l-2-4z"/><path d="M13 18c-3-3 2-4 1-8 4 3 5 6 2 9z"/>',
    lava: '<path d="M4 11h18l6 4-6 4H4l-2-4z"/><path d="M10 12h8m-6 3h7m-9 3h5"/>',
    acid: '<path d="M4 11h18l6 4-6 4H4l-2-4z"/><circle cx="12" cy="14" r="2"/><circle cx="19" cy="17" r="1.5"/>',
    plasma: '<path d="M4 11h18l6 4-6 4H4l-2-4z"/><circle cx="17" cy="15" r="4"/><path d="M17 8v2m0 10v2m-7-7h2m10 0h2"/>',
    lightning: '<path d="M4 11h18l6 4-6 4H4l-2-4z"/><path d="m17 9-5 6h4l-2 5 6-7h-4z"/>',
    rail: '<path d="M1 13h27v4H1z"/><path d="m21 10 7 5-7 5z"/><path d="M4 10v10"/>',
    quantum: '<path d="M4 11h18l6 4-6 4H4l-2-4z"/><circle cx="16" cy="15" r="4"/><circle cx="16" cy="15" r="1.5"/>'
  };
  function drawWeaponRack(available) {
    const fragment = document.createDocumentFragment();
    for (const weapon of available) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "ordnance-choice"; button.dataset.weapon = weapon.key;
      button.style.setProperty("--shell-color", weapon.color);
      button.setAttribute("aria-label", `${weapon.name}. ${weapon.class}. ${weapon.desc}`);
      button.title = `${weapon.name} · ${weapon.class} — ${weapon.desc}`;
      const icon = document.createElement("span"); icon.className = `shell-icon shell-${weapon.effect}`; icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = `<svg viewBox="0 0 30 30" focusable="false">${weaponGlyphs[weapon.effect] || weaponGlyphs.blast}</svg>`;
      const name = document.createElement("span"); name.className = "ordnance-name"; name.textContent = weapon.name;
      button.append(icon, name); fragment.append(button);
    }
    ordnanceRack.replaceChildren(fragment);
    syncWeaponRack();
  }
  function syncWeaponRack() {
    for (const button of ordnanceRack.querySelectorAll(".ordnance-choice")) {
      const selected = button.dataset.weapon === weaponSelect.value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = !canControlTank();
    }
  }
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
  const muzzleFlashes = [];
  const MAX_MUZZLE_FLASHES = 8;
  const colors = { left: ["#9a6a48", "#c79a63"], right: ["#526e70", "#8eb1a6"] };
  const modeNames = { skirmish: "SKIRMISH / FIELD TEST", campaign: "CAMPAIGN / OPERATION", night: "NIGHT CAMPAIGN / OPERATION", endless: "ENDLESS WAR / SECTOR", custom: "CUSTOM / BATTLEFIELD" };
  const state = {
    tanks: [], turnIndex: 0, turn: 1, level: 1, seed: 7821, mode: "skirmish", opponent: "cpu", formation: 2, sceneIndex: 0, atmosphere: "DUSK",
    playerChassis: "m40",
    difficulty: "recruit", weather: "clear", smoke: "thin", support: "off", supportUsed: { left: false, right: false },
    angle: 12, power: 63, weapon: "shell", moving: false, resolving: false, aiMove: null, night: false, assist: false,
    winner: "", recorded: false, toastTimer: 0, mapName: "DUSK FRONT", rain: [], shake: 0, lastTime: 0
  };
  const RECORDS_KEY = "tam-v2-battle-records-v1";
  function readBattleRecords() {
    const empty = { battles: 0, wins: 0, fastestWin: 0, bestOperation: 0, recentGrid: "" };
    try {
      const saved = JSON.parse(localStorage.getItem(RECORDS_KEY) || "null");
      if (!saved || typeof saved !== "object") return empty;
      return {
        battles: Math.max(0, Number(saved.battles) || 0), wins: Math.max(0, Number(saved.wins) || 0),
        fastestWin: Math.max(0, Number(saved.fastestWin) || 0), bestOperation: Math.max(0, Number(saved.bestOperation) || 0),
        recentGrid: /^[0-9A-F]{8}$/.test(saved.recentGrid) ? saved.recentGrid : ""
      };
    } catch { return empty; }
  }
  let battleRecords = readBattleRecords();
  function renderBattleRecords() {
    $("recordBattles").textContent = String(battleRecords.battles);
    $("recordWins").textContent = String(battleRecords.wins);
    $("recordFastest").textContent = battleRecords.fastestWin ? `${battleRecords.fastestWin} turns` : "—";
    $("recordOperation").textContent = battleRecords.bestOperation ? `OP ${String(battleRecords.bestOperation).padStart(2, "0")}` : "—";
    $("recordGrid").textContent = battleRecords.recentGrid || "—";
  }
  function recordBattleResult() {
    if (state.recorded) return;
    state.recorded = true;
    const won = state.winner === "left";
    battleRecords.battles++;
    if (won) {
      battleRecords.wins++;
      battleRecords.fastestWin = battleRecords.fastestWin ? Math.min(battleRecords.fastestWin, state.turn) : state.turn;
      if (state.mode === "campaign" || state.mode === "night") battleRecords.bestOperation = Math.max(battleRecords.bestOperation, state.level);
    }
    battleRecords.recentGrid = state.seed.toString(16).padStart(8, "0").slice(-8).toUpperCase();
    try { localStorage.setItem(RECORDS_KEY, JSON.stringify(battleRecords)); } catch { /* The current session still shows its result if storage is unavailable. */ }
    renderBattleRecords();
  }
  let battleEpoch = 0;
  function deferBattle(callback, delay, tank = activeTank()) {
    const epoch = battleEpoch;
    setTimeout(() => { if (epoch === battleEpoch && tank === activeTank()) callback(); }, delay);
  }

  function rand(seed) {
    let x = seed >>> 0;
    return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
  }
  function randomSeed() {
    try {
      if (window.crypto?.getRandomValues) {
        const value = new Uint32Array(1); window.crypto.getRandomValues(value);
        return value[0] || 1;
      }
    } catch { /* Fall back for restricted or older browser contexts. */ }
    return ((Math.random() * 0xffffffff) >>> 0) || 1;
  }
  function gridCode() { return state.seed.toString(16).padStart(8, "0").slice(-8).toUpperCase(); }
  function generateBattlefield(seed = randomSeed()) {
    state.seed = Number(seed) >>> 0;
    const sceneRoll = rand(state.seed ^ 0x9e3779b9);
    state.sceneIndex = Math.floor(sceneRoll() * FIELD_SCENES.length);
    state.mapName = FIELD_SCENES[state.sceneIndex].name;
    const layoutRoll = rand(state.seed ^ 0x51ed270b);
    state.spawnOffset = (layoutRoll() - .5) * 52;
    state.landmarkOffsets = { left: (layoutRoll() - .5) * 112, right: (layoutRoll() - .5) * 112 };
    state.atmosphere = ["DAWN", "DAYLIGHT", "DUSK", "NIGHTFALL"][Math.floor(layoutRoll() * 4)];
    createTerrain();
    generateObstacles();
    $("mapReadout").textContent = `SECTOR ${String(state.level).padStart(2, "0")} // GRID ${gridCode()}`;
  }
  function requestedGridSeed() {
    const value = $("mapSeed").value.trim();
    if (!value) return randomSeed();
    if (!/^[0-9a-f]{8}$/i.test(value)) {
      announce("GRID CODE MUST BE 8 HEX DIGITS"); $("mapSeed").focus(); return null;
    }
    return Number.parseInt(value, 16) >>> 0;
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function spawnX(side) { return FIELD_LAYOUT[side === "left" ? "leftStart" : "rightStart"] + (side === "left" ? 1 : -1) * (state.spawnOffset || 0); }
  function landmarkX(side) { return FIELD_LAYOUT[side === "left" ? "leftLandmark" : "rightLandmark"] + (state.landmarkOffsets?.[side] || 0); }
  function formatAngle(value) { const angle = Number(value); return Number.isInteger(angle) ? String(angle) : angle.toFixed(1); }
  function smoothstep(value) { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); }
  // A lightweight side-view perspective cheat: the ground and tank silhouettes
  // recede together from the near-left camera lane toward the far-right shelf.
  function battlefieldScale(x) {
    const depth = (x - FIELD_LAYOUT.leftStart) / (FIELD_LAYOUT.rightStart - FIELD_LAYOUT.leftStart);
    return FIELD_LAYOUT.nearScale + (FIELD_LAYOUT.farScale - FIELD_LAYOUT.nearScale) * smoothstep(depth);
  }
  function activeTank() { return state.tanks[state.turnIndex] || state.tanks[0]; }
  function canControlTank(tank = activeTank()) { return !!tank?.alive && !state.winner && !(state.opponent === "cpu" && tank.team === "right"); }
  function living(team) { return state.tanks.filter((tank) => tank.alive && (!team || tank.team === team)); }
  function weaponData(key = activeTank()?.weapon || state.weapon) { return weapons.find((item) => item.key === key) || weapons[0]; }
  // A full charge must clear the authored ridge even if a crew has driven to
  // the far edges of the playable overdraw. Keep ordnance speed differences,
  // guarantee a 17.7-unit/frame floor, and cap extreme speeds so a high arc
  // still has a valid firing angle instead of sailing past the target.
  function launchSpeed(weapon, power) {
    const charge = clamp(Number(power) || 20, 20, 100) / 100;
    return Math.min(MAX_FULL_CHARGE_SPEED, weapon.speed * (.45 + charge * .75) + 8 * charge);
  }
  const COCKPIT_VIEWS = ["battlefield", "periscope", "commander"];
  function syncCockpitView() {
    const tank = activeTank();
    const view = COCKPIT_VIEWS.includes(tank?.view) ? tank.view : "battlefield";
    document.body.dataset.cockpitView = view;
    document.body.dataset.chassis = tank?.chassis || "m40";
    cockpitSkin.src = skinPath(chassisData(tank));
    windowArmor.src = cockpitSkin.src;
    const chassis = tank?.chassis || "m40";
    const gauge = GAUGE_GEOMETRY[chassis] || GAUGE_GEOMETRY.m40;
    for (const [kind, selector] of [["angle", ".live-elevation"], ["power", ".live-charge"]]) {
      const [, , w, h, rx, ry] = gauge[kind];
      const face = gaugeLayer.querySelector(selector);
      // Tick arcs follow the aperture ellipse, not the larger overscan box.
      face.style.setProperty("--tick-w", `${rx * 2 / .83 / w * 100}%`);
      face.style.setProperty("--tick-h", `${ry * 2 / .83 / h * 100}%`);
      face.style.setProperty("--needle-length", `${ry * .82 / h * 100}%`);
      face.style.setProperty("--opening-rx", `${rx / w * 100}%`);
      face.style.setProperty("--opening-ry", `${ry / h * 100}%`);
    }
    gaugeLayer.style.setProperty("--gauge-metal", `url("assets/hardware/${chassis}-plate.webp?v=20261002-moving-hardware")`);
    for (const target of [gaugeLayer, document.querySelector(".console")]) {
      for (const kind of ["angle", "power"]) {
        const [x, y, w, h] = gauge[kind];
        target.style.setProperty(`--${kind}-x`, `${x / 1672 * 100}%`);
        target.style.setProperty(`--${kind}-y`, `${y / 941 * 100}%`);
        target.style.setProperty(`--${kind}-w`, `${w / 1672 * 100}%`);
        target.style.setProperty(`--${kind}-h`, `${h / 941 * 100}%`);
      }
    }
    const hole = ([x, y, , , rx, ry]) => `M${x-rx} ${y}a${rx} ${ry} 0 1 0 ${rx*2} 0a${rx} ${ry} 0 1 0 ${-rx*2} 0Z`;
    const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1672 941"><path fill="white" fill-rule="evenodd" d="M0 0H1672V941H0Z ${hole(gauge.angle)} ${hole(gauge.power)}"/><path fill="white" d="${gauge.guard}"/></svg>`;
    cockpitSkin.style.setProperty("--gauge-mask", `url("data:image/svg+xml,${encodeURIComponent(mask)}")`);
    hardwareLayer.style.setProperty("--socket-plate", `url("assets/hardware/${chassis}-plate.webp?v=20261002-moving-hardware")`);
    stage.style.setProperty("--deck-plate", `url("assets/hardware/${chassis}-plate.webp?v=20261002-moving-hardware")`);
    for (const [part, hardware] of Object.entries(hardwareParts)) {
      const [x,y,w,h,px,py] = HARDWARE_GEOMETRY[chassis][part];
      hardware.photo.src = hardwarePath(chassis, part);
      hardware.mount.style.setProperty("--part-x", `${x / 1672 * 100}%`);
      hardware.mount.style.setProperty("--part-y", `${y / 941 * 100}%`);
      hardware.mount.style.setProperty("--part-w", `${w / 1672 * 100}%`);
      hardware.mount.style.setProperty("--part-h", `${h / 941 * 100}%`);
      hardware.mount.style.setProperty("--part-aspect", String(w / h));
      hardware.face.style.transformOrigin = `${(px-x)/w*100}% ${(py-y)/h*100}%`;
    }
    $("chassisName").textContent = chassisData(tank).name;
    $("chassisSpecialty").textContent = chassisData(tank).specialty;
    cockpitViewSelect.value = view;
    canvas.setAttribute("aria-label", `${view === "periscope" ? "Magnified periscope" : view === "commander" ? "Turret station" : "Wide battlefield"} view, ${tank?.name || "tank"}`);
  }
  function syncInstruments() {
    const deck = document.querySelector(".console");
    deck.style.setProperty("--barrel-angle", `${state.angle * 2.3 - 90}deg`);
    deck.style.setProperty("--dial-elevation", `${-120 + state.angle / 85 * 240}deg`);
    deck.style.setProperty("--power-angle", `${-120 + (state.power - 20) / 80 * 240}deg`);
    deck.style.setProperty("--wheel-angle", `${state.angle * 4}deg`);
    deck.style.setProperty("--angle-position", `${state.angle / 85 * 100}%`);
    deck.style.setProperty("--power-position", `${(state.power - 20) / 80 * 100}%`);
    deck.style.setProperty("--charge-lever-position", `${(100 - state.power) / 80 * 81}%`);
    // Gauges sit behind the armored fascia; hit targets stay above it. Share
    // live instrument variables across those sibling layers without duplicating values.
    for (const property of ["--dial-elevation", "--power-angle", "--wheel-angle"]) gaugeLayer.style.setProperty(property, deck.style.getPropertyValue(property));
    const tank = activeTank();
    $("moveBudget").textContent = `${Math.round(tank?.moveRemaining || 0)} / ${chassisData(tank).travel} m`;
    $("crewArmor").textContent = `${Math.ceil((tank?.hp || 0) / (tank?.maxHp || 100) * 100)}%`;
  }
  function syncCombatSwitches() {
    for (const [id, enabled] of [["nightToggle", !!state.night], ["assistToggle", !!state.assist]]) {
      const button = $(id);
      button.classList.toggle("is-on", enabled);
      button.classList.remove("is-suggested");
      button.setAttribute("aria-pressed", String(enabled));
      button.querySelector("span").textContent = enabled ? "ON" : "OFF";
      const label = id === "nightToggle" ? "Night optics" : "Trajectory assistance";
      button.setAttribute("aria-label", `${label}, ${enabled ? "on" : "off"}`);
      button.title = `${label} · ${enabled ? "on" : "off"}`;
      hardwareParts[id === "nightToggle" ? "night" : "assist"].mount.classList.toggle("is-on", enabled);
    }
  }
  function announce(message) {
    const box = $("toast"); box.textContent = message; box.classList.add("visible");
    clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => box.classList.remove("visible"), 1850);
  }
  function terrainSampleY(x) {
    const i = Math.max(0, Math.min(terrain.length - 1, Math.round(x / STEP)));
    return terrain[i] ?? 570;
  }
  function surfaceY(x) {
    return x < 0 || x > W ? terrainOverdrawY(x) : terrainSampleY(x);
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
    // Visual overdraw is playable ground. Use the same contour for tanks,
    // shell collisions and terrain pixels rather than clamping tank height at W.
    const edgeSlope = edge => clamp((terrainSampleY(edge + 22) - terrainSampleY(edge - 22)) / 44, -Math.tan(.24), Math.tan(.24));
    if (x < 0) return hermite(clamp((x + ext) / ext, 0, 1), SURFACE_BASE, terrainSampleY(0), 0, edgeSlope(0) * ext);
    if (x > W) return hermite(clamp((x - W) / ext, 0, 1), terrainSampleY(W), SURFACE_BASE, edgeSlope(W) * ext, 0);
    return terrainSampleY(x);
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
    const ridgeCenter = W * profile.ridgeX + (r() - 0.5) * 56;
    const ridgeWidth = profile.ridgeWidth * (0.86 + r() * 0.28);
    hills.push({ x: ridgeCenter - ridgeWidth * .52, width: ridgeWidth * .55, height: profile.ridgeHeight * .07 });
    hills.push({ x: ridgeCenter, width: ridgeWidth, height: profile.ridgeHeight * (.68 + r() * .2) });
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
      { x: spawnX("left"), y: profile.nearY, flat: 124, fade: 66 },
      { x: spawnX("right"), y: profile.farY, flat: 106, fade: 58 },
    ];
    for (const placement of FIELD_SCENES[state.sceneIndex].placements) {
      const center = landmarkX(placement.side);
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
      const x = landmarkX(placement.side);
      obstacles.push({ ...placement, x, maxHp: placement.hp, active: true });
    }
  }
  function setFormation(count = 2) {
    const previous = new Map(state.tanks.map((tank) => [tank.id, tank]));
    state.formation = count;
    // The hero begins on the near shelf; hostiles begin on the raised far shelf.
    // Four-tank formations use authored shoulders between spawn pads and ridge.
    const leftXs = count === 4 ? [spawnX("left"), Math.max(490, landmarkX("left") + 165)] : [spawnX("left")];
    const rightXs = count === 4 ? [Math.min(910, landmarkX("right") - 165), spawnX("right")] : [spawnX("right")];
    const loadout = (id) => ({ weapon: previous.get(id)?.weapon || "shell", power: previous.get(id)?.power || 63, view: previous.get(id)?.view || "battlefield" });
    const crew = (id) => {
      const chassis = id.startsWith("L") && CHASSIS[state.playerChassis] ? state.playerChassis : defaultChassis(id);
      const spec = CHASSIS[chassis]; return { chassis, hp: spec.hp, maxHp: spec.hp, moveRemaining: spec.travel };
    };
    const left = leftXs.map((x, i) => ({ id: `L${i + 1}`, team: "left", x, ...crew(`L${i + 1}`), damageStage: 0, alive: true, dir: 1, name: `HERO-0${i + 1}`, angle: 12, move: 0, ...loadout(`L${i + 1}`) }));
    const right = rightXs.map((x, i) => ({ id: `R${i + 1}`, team: "right", x, ...crew(`R${i + 1}`), damageStage: 0, alive: true, dir: -1, name: state.opponent === "local" ? `PLAYER-02-${i + 1}` : `HOSTILE-0${i + 1}`, angle: 12, move: 0, ...loadout(`R${i + 1}`) }));
    state.tanks = [];
    const n = Math.max(left.length, right.length);
    for (let i = 0; i < n; i++) { if (left[i]) state.tanks.push(left[i]); if (right[i]) state.tanks.push(right[i]); }
    state.turnIndex = 0; state.turn = 1; state.winner = ""; state.recorded = false; state.supportUsed = { left: false, right: false };
    projectiles.length = 0; particles.length = 0; effects.length = 0; hazards.length = 0; muzzleFlashes.length = 0;
  }
  function newMap(announceChange = true, explicitSeed = undefined) {
    const seed = explicitSeed === undefined ? requestedGridSeed() : explicitSeed;
    if (seed === null) return false;
    battleEpoch++; state.resolving = false; state.moving = false; state.aiMove = null;
    if (announceChange && state.winner === "left" && state.opponent === "cpu") state.level = (state.mode === "campaign" || state.mode === "night") ? Math.min(30, state.level + 1) : state.level + 1;
    generateBattlefield(seed); setFormation(state.formation);
    $("weatherReadout").textContent = `${state.atmosphere} // ${state.weather === "rain" ? "RAIN SQUALL" : state.weather === "wind" ? "CROSSWIND" : "OVERCAST"} // ${state.smoke === "clear" ? "CLEAR AIR" : state.smoke === "dense" ? "DENSE SMOKE" : "DRIFTING SMOKE"}`;
    if (announceChange) announce("NEW SECTOR GENERATED // ARMOR READY");
    selectTurn(0, false); refreshHud(); showSwitchHints(); return true;
  }
  function applyModeSettings() {
    if (projectiles.length || state.moving || state.resolving) { announce("WAIT FOR THE ROUND TO CLEAR BEFORE RECONFIGURING"); return; }
    const seed = requestedGridSeed(); if (seed === null) return;
    state.mode = $("mode").value; state.opponent = $("opponent").value; state.formation = Number($("formation").value);
    state.playerChassis = CHASSIS[playerChassisSelect.value] ? playerChassisSelect.value : "m40";
    state.difficulty = $("difficulty").value; state.weather = $("weather").value; state.smoke = $("smoke").value; state.support = $("support").value;
    state.level = 1;
    state.night = state.mode === "night";
    if (state.mode === "campaign" || state.mode === "night") state.formation = 2;
    $("formation").value = String(state.formation);
    newMap(false, seed); $("modeLabel").textContent = modeNames[state.mode] || modeNames.skirmish;
    $("weatherReadout").textContent = `${state.atmosphere} // ${state.weather === "rain" ? "RAIN SQUALL" : state.weather === "wind" ? "CROSSWIND" : "OVERCAST"} // ${state.smoke === "clear" ? "CLEAR AIR" : state.smoke === "dense" ? "DENSE SMOKE" : "DRIFTING SMOKE"}`;
    syncCombatSwitches();
    refreshWeaponChoices(); refreshHud(); announce("CONFIGURATION DEPLOYED // FIRE CONTROL READY");
  }
  function refreshWeaponChoices() {
    const tank = activeTank();
    const previous = tank?.weapon || "shell";
    let savedProgress = 1;
    try { savedProgress = Number(localStorage.getItem("tam-v2-unlock") || 1); } catch { /* Playing without browser storage remains supported. */ }
    const available = state.mode === "campaign" || state.mode === "night" ? weapons.filter((item) => item.unlock <= Math.max(1, state.level, savedProgress) + 1) : weapons;
    weaponSelect.replaceChildren(...available.map((weapon) => {
      const option = document.createElement("option"); option.value = weapon.key;
      option.textContent = weapon.unlock > 1 && (state.mode === "campaign" || state.mode === "night") ? `${weapon.name}  //  OP ${weapon.unlock}` : weapon.name;
      return option;
    }));
    state.weapon = available.some((item) => item.key === previous) ? previous : "shell";
    if (tank) tank.weapon = state.weapon;
    weaponSelect.value = state.weapon; drawWeaponRack(available); updateWeaponReadout();
  }
  function updateWeaponReadout() {
    const weapon = weaponData(); $("weaponClass").textContent = weapon.class; $("weaponDescription").textContent = weapon.desc;
    $("loadedWeaponName").textContent = weapon.name;
    selectedShellArt.innerHTML = `<svg viewBox="0 6 30 18" focusable="false">${weaponGlyphs[weapon.effect] || weaponGlyphs.blast}</svg>`;
    loadedRound.style.setProperty("--shell-color", weapon.color);
    loadedRound.title = `${weapon.class} — ${weapon.desc}`;
    ordnanceRack.querySelectorAll(".ordnance-choice").forEach((button) => {
      const selected = button.dataset.weapon === weapon.key;
      button.classList.toggle("is-selected", selected); button.setAttribute("aria-pressed", String(selected));
    });
  }
  function selectTurn(index, increment = true) {
    const tank = state.tanks[index]; if (!tank?.alive) return;
    state.turnIndex = index; if (increment) state.turn++;
    state.resolving = false;
    if (increment) tank.moveRemaining = chassisData(tank).travel;
    state.angle = Number(tank.angle); angleInput.value = state.angle;
    state.power = clamp(tank.power || 63, 20, 100); powerInput.value = state.power; $("powerValue").textContent = state.power;
    refreshWeaponChoices(); syncCockpitView(); syncInstruments();
    $("angleValue").textContent = formatAngle(state.angle); $("activeTankName").textContent = tank.name;
    const isCpu = state.opponent === "cpu" && tank.team === "right";
    $("turnLabel").textContent = isCpu ? "ENEMY TURN" : tank.team === "left" ? "PLAYER 1 TURN" : "PLAYER 2 TURN";
    $("consoleTurn").textContent = isCpu ? "HOSTILE GUNNER" : tank.team === "left" ? "YOUR TURN" : "PLAYER 2 TURN";
    $("consoleTurn").parentElement.style.borderColor = isCpu ? "#bd6655" : "#4a5a5a";
    fireButton.disabled = !!state.winner || isCpu || projectiles.length > 0 || state.moving;
    for (const control of [angleInput, powerInput, weaponSelect, $("moveLeft"), $("moveRight")]) control.disabled = !canControlTank(tank);
    refreshTargetCard(); refreshSupportButton();
    if (isCpu && !state.winner) { fireButton.disabled = true; deferBattle(cpuTurn, 800, tank); }
  }
  function nextTurn() {
    state.resolving = false;
    const leftAlive = living("left").length; const rightAlive = living("right").length;
    if (!leftAlive || !rightAlive) {
      state.winner = leftAlive ? "left" : "right";
      recordBattleResult();
      $("turnLabel").textContent = state.winner === "left" ? "VICTORY // SECTOR SECURED" : "DEFEAT // ARMOR LOST";
      $("consoleTurn").textContent = state.winner === "left" ? "MISSION SUCCESS" : "MISSION FAILED";
      fireButton.disabled = true; announce(state.winner === "left" ? "HOSTILE BATTERY SILENCED // VICTORY" : "ALL FRIENDLY ARMOR LOST // RETRY SECTOR");
      if (state.winner === "left" && (state.mode === "campaign" || state.mode === "night")) {
        const unlock = Number(localStorage.getItem("tam-v2-unlock") || 1);
        localStorage.setItem("tam-v2-unlock", String(Math.max(unlock, Math.min(30, state.level + 1))));
      }
      refreshHud();
      const canAutoDeploy = state.winner === "left" && state.opponent === "cpu" && !((state.mode === "campaign" || state.mode === "night") && state.level >= 30);
      if (canAutoDeploy) {
        const completedEpoch = battleEpoch;
        announce("SECTOR SECURED // NEXT GRID DEPLOYING IN 3 SECONDS");
        window.setTimeout(() => {
          if (battleEpoch !== completedEpoch || state.winner !== "left") return;
          newMap(true, randomSeed());
        }, 3000);
      } else if (state.winner === "left" && (state.mode === "campaign" || state.mode === "night")) announce("CAMPAIGN COMPLETE // ALL 30 OPERATIONS SECURED");
      return;
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
    if (opponent) { const health = clamp(opponent.hp / opponent.maxHp * 100, 0, 100); $("targetHealth").textContent = `ARMOR ${Math.ceil(health)}%`; $("targetHealthFill").style.width = `${health}%`; }
  }
  function refreshHud() {
    const tank = activeTank(); if (!tank) return;
    $("missionTitle").textContent = state.mode === "campaign" || state.mode === "night" ? `${state.mapName} // OP ${String(state.level).padStart(2, "0")}` : state.mapName;
    $("mapReadout").textContent = `SECTOR ${String(state.level).padStart(2, "0")} // GRID ${gridCode()}`;
    $("modeLabel").textContent = modeNames[state.mode] || modeNames.skirmish;
    $("windReadout").textContent = state.weather === "wind" ? "09 ⇢" : state.weather === "clear" ? "02 →" : "05 ←";
    $("rangeReadout").textContent = `${Math.round(Math.abs((living(tank.team === "left" ? "right" : "left")[0]?.x || tank.x) - tank.x) * 1.25)} m`;
    refreshTargetCard(); refreshSupportButton(); syncInstruments();
    syncWeaponRack();
  }
  function refreshSupportButton() {
    const button = document.querySelector(".support-button"); if (!button) return;
    const used = state.supportUsed[activeTank()?.team] || false;
    const labels = { off: "NO SUPPORT", air: "AIR STRIKE", repair: "FIELD REPAIR", laser: "LASER STRIKE", rod: "ORBITAL ROD", meteor: "METEOR DROP", scanner: "RECON SCAN" };
    button.querySelector("span").textContent = used ? "SPENT" : (labels[state.support] || "SUPPORT");
    button.disabled = state.support === "off" || used || !!state.winner || projectiles.length > 0 || state.moving || state.resolving || !canControlTank();
    button.title = state.support === "off" ? "Select a support option in Mission Configuration" : used ? "Support already expended this side" : `Use ${labels[state.support]} support`;
  }

  function drawBackground(time) {
    const grade = { DAWN: "sepia(.28) saturate(1.18) brightness(1.06)", DAYLIGHT: "saturate(.82) brightness(1.2)", DUSK: "saturate(.92) brightness(.98)", NIGHTFALL: "saturate(.72) brightness(.62) hue-rotate(12deg)" }[state.atmosphere] || "none";
    if (background.complete && background.naturalWidth) { ctx.save(); ctx.filter = grade; ctx.drawImage(background, 0, 0, W, H); ctx.restore(); }
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
    // The cached detailed face stays small. Continue its existing material to
    // the viewport edges when portrait framing sees below that cache or a wide
    // screen sees beyond its sides. Surface geometry and collisions stay fixed.
    const transform = ctx.getTransform();
    const left = -transform.e / transform.a - 2, right = (canvas.width - transform.e) / transform.a + 2;
    const bottom = (canvas.height - transform.f) / transform.d + 2;
    if (bottom > terrainLayer.height || left < -TERRAIN_OVERDRAW || right > W + TERRAIN_OVERDRAW) {
      ctx.save(); ctx.beginPath();
      ctx.moveTo(left, terrainOverdrawY(clamp(left, -TERRAIN_OVERDRAW, W + TERRAIN_OVERDRAW)));
      for (let x = Math.max(left, -TERRAIN_OVERDRAW); x < Math.min(right, W + TERRAIN_OVERDRAW); x += STEP) ctx.lineTo(x, terrainOverdrawY(x));
      ctx.lineTo(right, terrainOverdrawY(clamp(right, -TERRAIN_OVERDRAW, W + TERRAIN_OVERDRAW)));
      ctx.lineTo(right, bottom); ctx.lineTo(left, bottom); ctx.closePath(); ctx.clip();
      ctx.fillStyle = soilGradient(ctx); ctx.fillRect(left, 0, right - left, bottom);
      if (groundTexturePattern) { ctx.globalAlpha = .36; ctx.fillStyle = groundTexturePattern; ctx.fillRect(left, 0, right - left, bottom); }
      if (soilNoisePattern) { ctx.globalAlpha = .9; ctx.fillStyle = soilNoisePattern; ctx.fillRect(left, 0, right - left, bottom); }
      ctx.restore();
    }
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
  function soilGradient(context) {
    const ground = context.createLinearGradient(0, 420, 0, H);
    ground.addColorStop(0, "#806e58"); ground.addColorStop(.035, "#6a5846"); ground.addColorStop(.18, "#514439"); ground.addColorStop(.53, "#383334"); ground.addColorStop(1, "#242a2b");
    return ground;
  }
  function rebuildTerrainLayer() {
    const c = terrainCtx; c.clearRect(0, 0, W + TERRAIN_OVERDRAW * 2, H + TERRAIN_BOTTOM_OVERDRAW); c.save(); c.translate(TERRAIN_OVERDRAW, 0);
    const ground = soilGradient(c);
    const traceGround = () => {
      c.beginPath(); c.moveTo(-TERRAIN_OVERDRAW, surfaceY(-TERRAIN_OVERDRAW));
      for (let x = -TERRAIN_OVERDRAW + STEP; x <= W + TERRAIN_OVERDRAW; x += STEP) c.lineTo(x, surfaceY(x));
      c.lineTo(W + TERRAIN_OVERDRAW, H + TERRAIN_BOTTOM_OVERDRAW); c.lineTo(-TERRAIN_OVERDRAW, H + TERRAIN_BOTTOM_OVERDRAW); c.closePath();
    };
    traceGround(); c.fillStyle = ground; c.fill();
    c.save(); traceGround(); c.clip();
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
    terrainSkyMask = new Path2D(); terrainSkyMask.moveTo(-TERRAIN_OVERDRAW, 0); terrainSkyMask.lineTo(W + TERRAIN_OVERDRAW, 0);
    for (let x = W + TERRAIN_OVERDRAW; x >= -TERRAIN_OVERDRAW; x -= STEP) terrainSkyMask.lineTo(x, surfaceY(x));
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
    // Opaque tracks end at row 405 of 444; place the blank lower margin below soil.
    ctx.translate(0, 11);
    ctx.filter = wrecked ? "grayscale(.82) brightness(.58) sepia(.24)" : "none";
    ctx.drawImage(tankImage, -127, -127, 254, 127);
    ctx.filter = "none";
    // The weapon stays independently aimable, aligned to the realistic sprite's trunnion.
    ctx.save(); ctx.translate(63, -76); ctx.rotate(-Math.max(-20, Math.min(85, tank.angle - slope * 180 / Math.PI - (wrecked ? 19 : 0))) * Math.PI / 180);
    const barrel = ctx.createLinearGradient(0, -5, 0, 5); barrel.addColorStop(0, "#c0c2ba"); barrel.addColorStop(.24, "#68716f"); barrel.addColorStop(.72, "#303736"); barrel.addColorStop(1, "#93968e");
    ctx.fillStyle = "#1c2221"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = barrel; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(68, -3); ctx.lineTo(80, -5); ctx.lineTo(84, -4); ctx.lineTo(84, 4); ctx.lineTo(76, 5); ctx.lineTo(68, 3); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#151a19"; ctx.beginPath(); ctx.moveTo(80, -3); ctx.lineTo(80, 3); ctx.stroke();
    ctx.restore();
    const health = tank.hp / tank.maxHp * 100;
    const smokeStrength = wrecked ? .98 : health <= 25 ? .72 : health <= 55 ? .46 : health <= 80 ? .28 : .025;
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
    ctx.fillStyle = barrel; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(59, -3); ctx.lineTo(67, -5); ctx.lineTo(70, -4); ctx.lineTo(70, 4); ctx.lineTo(64, 5); ctx.lineTo(57, 3); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#101719"; ctx.beginPath(); ctx.moveTo(66, -3); ctx.lineTo(66, 3); ctx.stroke();
    ctx.restore();
    // Optical glass and antenna.
    ctx.fillStyle = "#78d2d0"; ctx.shadowBlur = 5; ctx.shadowColor = "#70d4d1"; ctx.fillRect(26, -78, 5, 3); ctx.shadowBlur = 0;
    ctx.strokeStyle = "#454c48"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-24, -75); ctx.lineTo(-28, -92); ctx.stroke(); ctx.fillStyle = "#df8753"; ctx.fillRect(-29, -94, 3, 3);
    ctx.fillStyle = "#161b1b"; ctx.fillRect(-11, -35, 49, 2); ctx.fillStyle = "#d3c8ac"; ctx.font = "bold 7px Arial"; ctx.textAlign = "center"; ctx.fillText(tank.name, 13, -36);
    // Heat shimmer and exhaust after firing.
    const health = tank.hp / tank.maxHp * 100;
    const damageSmoke = wrecked ? .72 : health < 25 ? .4 : health < 52 ? .24 : health < 76 ? .12 : .035;
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
    } else if (tank.hp / tank.maxHp < .45 && Math.floor(time / 400) % 3 === 0) {
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
    const a = tank.angle * Math.PI / 180; const weapon = weaponData(tank.weapon); const speed = launchSpeed(weapon, tank.power);
    return { x: Math.cos(a) * speed * tank.dir, y: -Math.sin(a) * speed };
  }
  function ballisticWind() { return state.weather === "wind" ? .018 : state.weather === "rain" ? -.008 : .002; }
  function advanceBallistic(p, dt, wind = ballisticWind()) {
    // Exact constant-acceleration step: independent of display frame rate.
    p.x += p.vx * dt + .5 * wind * dt * dt;
    p.y += p.vy * dt + .5 * BALLISTIC_GRAVITY * dt * dt;
    p.vx += wind * dt; p.vy += BALLISTIC_GRAVITY * dt; p.age += dt;
  }
  function muzzle(tank, angle = tank.angle) {
    const slope = terrainSlope(tank.x); const a = Math.max(0, Math.min(85, angle)) * Math.PI / 180;
    const scale = battlefieldScale(tank.x);
    const localX = tank.dir * (63 + 84 * Math.cos(a - slope)) * scale; const localY = (-65 - 84 * Math.sin(a - slope)) * scale;
    return { x: tank.x + localX * Math.cos(slope) - localY * Math.sin(slope), y: surfaceY(tank.x) + localX * Math.sin(slope) + localY * Math.cos(slope) };
  }
  function drawAimGuide(time) {
    const tank = activeTank(); if (!state.assist || !tank?.alive || state.winner || (state.opponent === "cpu" && tank.team === "right")) return;
    const origin = muzzle(tank);
    const v = aimVector(tank);
    ctx.save(); ctx.setLineDash([3, 9]); ctx.lineWidth = 1.2; ctx.strokeStyle = "#dfc18d88"; ctx.beginPath();
    const preview = { x: origin.x, y: origin.y, vx: v.x, vy: v.y, age: 0 };
    ctx.moveTo(origin.x, origin.y);
    for (let i = 0; i < MAX_FLIGHT_FRAMES; i++) { advanceBallistic(preview, 1); ctx.lineTo(preview.x, preview.y); if (preview.x < -TERRAIN_OVERDRAW || preview.x > W + TERRAIN_OVERDRAW || preview.y > surfaceY(preview.x) || obstacleAt(preview.x, preview.y)) break; }
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
  function drawProjectile(projectile) {
    const weapon = weaponData(projectile.weapon);
    const angle = projectile.age < 3 && Number.isFinite(projectile.launchVX)
      ? Math.atan2(projectile.launchVY, projectile.launchVX) : Math.atan2(projectile.vy, projectile.vx);
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
  function drawMuzzleFlashes() {
    for (const flash of muzzleFlashes) {
      const t = clamp(flash.age / flash.life, 0, 1), smokeFade = (1 - t) ** 1.35;
      const flareFade = clamp(1 - flash.age / 8, 0, 1) ** 1.25;
      const size = 1 + t * 1.7, color = weaponData(flash.weapon).color;
      ctx.save(); ctx.translate(flash.x, flash.y); ctx.scale(flash.dir, 1);
      ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = flareFade;
      const glow = ctx.createRadialGradient(5 * size, 0, 1, 5 * size, 0, 26 * size);
      glow.addColorStop(0, "#fff6dc"); glow.addColorStop(.2, color); glow.addColorStop(.58, "#ff9b45a8"); glow.addColorStop(1, "#ff6e2800");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(7 * size, 0, 29 * size, 11 * size, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff5d9"; ctx.shadowBlur = 18 * flareFade; ctx.shadowColor = color;
      ctx.beginPath(); ctx.ellipse(4, 0, 8 * (1 - t * .65), 4.5 * (1 - t * .55), 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
      ctx.globalAlpha = smokeFade * .5; ctx.fillStyle = "#54534d";
      for (let i = 0; i < 3; i++) {
        const puff = t * (10 + i * 3), back = 7 + puff + i * 5;
        ctx.beginPath(); ctx.ellipse(-back, -puff * .22 + Math.sin(t * 7 + i) * 2, (4 + t * 10) * (1 + i * .08), (3 + t * 6) * (1 + i * .08), -.18, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
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
  function combatCamera() {
    const crews = living().length ? living() : state.tanks;
    const view = activeTank()?.view || "battlefield", inset = view === "periscope" ? 48 : view === "commander" ? 65 : 85;
    let left = W / 2, right = W / 2, top = Math.min(...terrain) - inset, bottom = 0;
    for (const crew of crews) {
      const scale = battlefieldScale(crew.x), ground = surfaceY(crew.x);
      left = Math.min(left, crew.x - 145 * scale); right = Math.max(right, crew.x + 145 * scale);
      top = Math.min(top, ground - 155 * scale); bottom = Math.max(bottom, ground + 26);
    }
    for (const object of obstacles.filter(item => item.active)) {
      left = Math.min(left, object.x - object.width * .55); right = Math.max(right, object.x + object.width * .55);
      top = Math.min(top, surfaceY(object.x) - object.height * (object.visualScale || 1) - 18);
    }
    // Anticipate ascending ordnance a few frames so high lobs ease into view.
    // Crew bounds remain included even when following a shell toward an edge.
    for (const shot of projectiles) {
      left = Math.min(left, clamp(shot.x - 30, FIELD_LAYOUT.moveMin - 350, FIELD_LAYOUT.moveMax + 350));
      right = Math.max(right, clamp(shot.x + 30, FIELD_LAYOUT.moveMin - 350, FIELD_LAYOUT.moveMax + 350));
      top = Math.min(top, shot.y + Math.min(0, shot.vy) * 14 - 36);
    }
    left -= 55; right += 55;
    const scale = Math.min(opticalFrame.w / (right-left), opticalFrame.h / Math.max(280,bottom-top));
    return { scale, x: opticalFrame.x + opticalFrame.w / 2 - (left+right) / 2 * scale, y: opticalFrame.y + opticalFrame.h / 2 - (top+bottom) / 2 * scale };
  }
  function render(time = 0, dt = 1) {
    const desired = combatCamera(), stamp = `${battleEpoch}/${activeTank()?.view}`;
    if (!cameraPose || cameraStamp !== stamp) { cameraPose = desired; cameraStamp = stamp; }
    const blend = 1 - Math.exp(-dt * .13);
    for (const key of ["scale","x","y"]) cameraPose[key] += (desired[key] - cameraPose[key]) * blend;
    ctx.save(); ctx.beginPath(); ctx.rect(opticalFrame.x,opticalFrame.y,opticalFrame.w,opticalFrame.h); ctx.clip();
    ctx.setTransform(cameraPose.scale,0,0,cameraPose.scale,cameraPose.x,cameraPose.y);
    if (state.shake > 0) { ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake); state.shake *= .82; }
    ctx.save();
    drawTerrain(); drawAtmosphericSmoke(); drawObstacles(time);
    for (const tank of state.tanks) drawTank(tank, time);
    drawAimGuide(time);
    drawMuzzleFlashes();
    for (const projectile of projectiles) drawProjectile(projectile);
    drawEffects(); drawParticles(dt);
    if (state.weather === "rain") drawRain(time);
    ctx.restore();
    const gradeWash = { DAWN: "#c7793b12", DAYLIGHT: "#e8d9b10e", DUSK: "#34394408", NIGHTFALL: "#101c3828" }[state.atmosphere];
    if (gradeWash) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = gradeWash; ctx.fillRect(opticalFrame.x, opticalFrame.y, opticalFrame.w, opticalFrame.h); ctx.restore(); }
    ctx.restore();
  }
  function drawRain(time) {
    ctx.save(); ctx.strokeStyle = "#a8c7db42"; ctx.lineWidth = 1; for (let i = 0; i < 75; i++) { const x = (i * 79 + time * .18) % W; const y = (i * 67 + time * .58) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13); ctx.stroke(); } ctx.restore();
  }
  function drawNightVision(time) {
    const width = canvas.width, height = canvas.height;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Intensifier hue preserves the scene's luminance. Multiplying by nearly
    // black green crushed terrain/tank detail into an unreadable blank scope.
    ctx.globalCompositeOperation = "color"; ctx.fillStyle = "#72ac68"; ctx.fillRect(0, 0, width, height); ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(width * .52, viewportFieldHeight * .58, 20 * scale, width * .52, viewportFieldHeight * .58, Math.max(width, viewportFieldHeight) * .56);
    glow.addColorStop(0, "#a7e59620"); glow.addColorStop(1, "#6abc5700"); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = "#9cffaf36"; ctx.lineWidth = scale; ctx.beginPath(); ctx.arc(width / 2, viewportFieldHeight / 2, Math.min(width, viewportFieldHeight) * .36 + Math.sin(time / 500) * 3 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#c9ffd080"; ctx.font = `${10 * scale}px monospace`; ctx.fillText("NVG // GEN III", 30 * scale, Math.max(30 * scale, viewportFieldHeight - 20 * scale)); ctx.restore();
  }
  let opticalFrame = {x:0,y:0,w:W,h:560}, cameraPose = null, cameraStamp = "", viewportFieldHeight = 560;
  function resize() {
    const box = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round((box.width || W) * ratio); canvas.height = Math.round((box.height || (box.width || W) * H / W) * ratio);
    const portrait = box.width < 601 && box.height > box.width;
    const sideLayout = !portrait && box.width >= 820;
    instrumentFrame.classList.toggle("has-side-consoles", sideLayout);
    const statusHost = sideLayout ? instrumentFrame : missionPanel;
    if (statusConsole.parentElement !== statusHost) statusHost.append(statusConsole);
    instrumentFrame.style.cssText = `left:0;top:0;width:${box.width}px;height:${box.height}px`;
    cameraPose = null;
    // Move the actual support action, not a disconnected duplicate, into the
    // phone mission menu when the compact dashboard has no safe spare slot.
    const supportAction = document.querySelector(".support-button");
    const supportHost = missionPanel;
    if (supportAction && supportAction.parentElement !== supportHost) supportHost.append(supportAction);
    // Compact controls reuse the same photographs, but sit above their cropped
    // steel backing and below the real hit targets/labels. Desktop hardware is
    // restored below the full fascia when the phone rotates.
    const compactDeck = document.querySelector(".console");
    if (portrait && hardwareLayer.parentElement !== compactDeck) compactDeck.prepend(hardwareLayer);
    else if (!portrait && hardwareLayer.parentElement !== cockpitSkin.parentElement) cockpitSkin.before(hardwareLayer);
    if (portrait) {
      dashboardFrame.classList.remove("rack-side-layout");
      dashboardFrame.style.cssText = `left:0;top:0;width:${box.width}px;height:${box.height}px`;
      const aperture = { x: .025, y: .035, w: .95, h: .44 };
      opticalFrame = {x:canvas.width*aperture.x,y:canvas.height*aperture.y,w:canvas.width*aperture.w,h:canvas.height*aperture.h};
    } else {
      // The viewing port occupies the upper ~54% of the stage; its shell ends
      // at the exact seam where the lower 32% dashboard artwork begins.
      const viewShellHeight = box.height * (0.67 / 0.54);
      windowArmor.style.cssText = `left:0;top:0;width:${box.width}px;height:${viewShellHeight}px`;
      const dashboardHeight = Math.min(box.height * (0.33 / 0.46), (sideLayout ? box.width * .64 : box.width) * 941 / 1672);
      const dashboardWidth = dashboardHeight * 1672 / 941;
      const dashboardTop = box.height - dashboardHeight;
      dashboardFrame.style.cssText = `left:${(box.width - dashboardWidth) / 2}px;top:${dashboardTop}px;width:${dashboardWidth}px;height:${dashboardHeight}px`;
      const sideWidth = (box.width - dashboardWidth) / 2;
      instrumentFrame.style.setProperty("--side-width", `${Math.max(0, sideWidth - 16)}px`);
      const left = box.width * .094 * ratio;
      const top = viewShellHeight * .088 * ratio;
      const right = box.width * .906 * ratio;
      const bottom = viewShellHeight * .522 * ratio;
      opticalFrame = {
        x: Math.max(0, left), y: Math.max(0, top),
        w: Math.max(1, Math.min(canvas.width, right) - Math.max(0, left)),
        h: Math.max(1, Math.min(canvas.height, bottom) - Math.max(0, top))
      };
    }
    viewportFieldHeight = opticalFrame.y + opticalFrame.h;
  }
  // Support activation can reveal an extra dashboard row and shrink the clean
  // firing lane; keep the camera fit in sync without polling every frame.
  new ResizeObserver(resize).observe(document.querySelector(".console"));
  function frame(time) {
    const dt = Math.min(2, state.lastTime ? (time - state.lastTime) / 16.67 : 1); state.lastTime = time;
    update(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#242a2b"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (background.complete && background.naturalWidth) {
      const backdropScale = Math.max(canvas.width / background.naturalWidth, canvas.height / background.naturalHeight);
      const bw = background.naturalWidth * backdropScale, bh = background.naturalHeight * backdropScale;
      const grade = { DAWN: "sepia(.28) saturate(1.18) brightness(1.06)", DAYLIGHT: "saturate(.82) brightness(1.2)", DUSK: "saturate(.92) brightness(.98)", NIGHTFALL: "saturate(.72) brightness(.62) hue-rotate(12deg)" }[state.atmosphere] || "none";
      ctx.save(); ctx.filter = grade;
      ctx.drawImage(background, (canvas.width - bw) / 2, (canvas.height - bh) / 2, bw, bh);
      ctx.restore();
    }
    render(time, dt);
    if (state.night) drawNightVision(time);
    requestAnimationFrame(frame);
  }
  function update(dt) {
    updateAmbientSmoke(dt);
    for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
      muzzleFlashes[i].age += dt;
      if (muzzleFlashes[i].age >= muzzleFlashes[i].life) muzzleFlashes.splice(i, 1);
    }
    if (state.aiMove) {
      const move = state.aiMove;
      move.elapsed += dt;
      const progress = Math.min(1, move.elapsed / move.duration);
      const eased = progress * progress * (3 - 2 * progress);
      move.tank.x = move.startX + (move.targetX - move.startX) * eased;
      if (progress >= 1) {
        move.tank.x = move.targetX; state.aiMove = null; state.moving = false; refreshHud();
        deferBattle(() => cpuTakeShot(move.tank, move.target, move.aimPoint), 280, move.tank);
      }
    } else if (state.moving) {
      const tank = activeTank(); if (tank) { tank.x += tank.move * 2.2 * dt; tank.x = Math.max(FIELD_LAYOUT.moveMin, Math.min(FIELD_LAYOUT.moveMax, tank.x)); }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]; const w = weaponData(p.weapon);
      const flightDt = dt * FLIGHT_TIME_SCALE;
      // Cap both time and traveled distance per collision check. Fast rounds
      // still contact narrow cover/tanks instead of jumping over them.
      const collisionStride = obstacles.reduce((stride, object) => object.active
        ? Math.min(stride, Math.max(.5, object.width * battlefieldScale(object.x) * .5)) : stride, 8);
      const steps = Math.max(1, Math.ceil(flightDt / MAX_BALLISTIC_STEP), Math.ceil(Math.hypot(p.vx, p.vy) * flightDt / collisionStride));
      const stepDt = flightDt / steps;
      for (let substep = 0; substep < steps; substep++) {
      advanceBallistic(p, stepDt);
      const clearance = surfaceY(p.x) - p.y;
      if (w.effect === "cluster" && !p.isSub && p.vy > 0 && clearance > 8 && clearance < 96) {
        effects.push({ x: p.x, y: p.y, weapon: w.key, age: 0, life: 18, radius: 34, stage: "split" });
        for (let j = 0; j < 5; j++) {
          const spread = j - 2;
          projectiles.push({ x: p.x + spread * 2, y: p.y, vx: p.vx * .72 + spread * 1.05,
            vy: p.vy * .72 - (2 - Math.abs(spread)) * .7, weapon: p.weapon, team: p.team, age: 0, isSub: true, perks: p.perks });
        }
        projectiles.splice(i, 1); break;
      }
      const hit = state.tanks.find((tank) => {
        if (!tank.alive || tank.team === p.team) return false;
        const scale = battlefieldScale(tank.x);
        return Math.abs(tank.x - p.x) < 37 * scale && Math.abs((surfaceY(tank.x) - 44 * scale) - p.y) < 29 * scale;
      });
      const groundHit = p.x < -TERRAIN_OVERDRAW + 4 || p.x > W + TERRAIN_OVERDRAW - 4 || p.y > surfaceY(Math.max(-TERRAIN_OVERDRAW, Math.min(W + TERRAIN_OVERDRAW, p.x))) || p.y > H - 8;
      const coverHit = obstacleAt(p.x, p.y);
      if (hit || coverHit || groundHit || p.age > MAX_FLIGHT_FRAMES) { impact(p.x, p.y, w, p.team, hit, p.isSub, p.perks); projectiles.splice(i, 1); if (projectiles.length === 0) deferBattle(nextTurn, 850); break; }
      }
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
    if (tank === activeTank()) syncInstruments();
    // Ground hazards can finish a crew while its gun is idle. Resolve that
    // death once; shots/support already own their delayed turn completion.
    if (!tank.alive && !state.resolving && !projectiles.length && (tank === activeTank() || !living("left").length || !living("right").length)) {
      state.aiMove = null; state.moving = false; state.resolving = true;
      fireButton.disabled = true; refreshSupportButton(); deferBattle(nextTurn, 500);
    }
  }
  function impact(x, y, weapon, team, directHit, isSub = false, perks = { direct: 1, scenery: 1 }) {
    const w = weapon; let radius = w.radius;
    const damage = w.damage * (isSub ? .62 : 1);
    if (isSub && w.effect === "cluster") radius = 14;
    if (w.effect === "rail") radius = 21;
    if (w.effect === "quantum") state.shake = 12;
    if (w.effect === "emp") radius *= .84;
    deformTerrain(x, y, radius * (w.effect === "rail" ? .4 : 1), (isSub ? 5 : w.effect === "rail" ? 8 : Math.min(70, radius * .62)) * perks.scenery);
    effects.push({ x, y, weapon: w.key, age: 0, life: isSub ? 22 : w.effect === "quantum" ? 60 : w.effect === "emp" ? 44 : 35, radius, stage: isSub ? "subimpact" : "impact" });
    // Armor only drops on a direct shell/pellet collision. Blast radius still
    // deforms terrain and damages placed scenery, but near-misses do not hurt tanks.
    if (directHit?.alive && directHit.team !== team) {
      const multiplier = w.effect === "emp" ? .55 : w.effect === "ice" ? .78 : 1;
      damageTank(directHit, Math.max(1, Math.round(damage * multiplier * perks.direct * chassisData(directHit).mitigation)));
    }
    for (const object of obstacles) {
      if (!object.active) continue;
      const distance = Math.hypot(object.x - x, surfaceY(object.x) - object.height * .48 - y);
      const reach = radius + object.width * .48 * battlefieldScale(object.x);
      if (distance < reach) {
        object.hp = Math.max(0, object.hp - damage * perks.scenery * Math.max(.22, 1 - distance / reach));
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
    const tank = activeTank(); if (!tank?.alive || state.winner || state.resolving || projectiles.length || state.moving || (!fromCpu && state.opponent === "cpu" && tank.team === "right")) return;
    state.resolving = true;
    tank.angle = state.angle; tank.power = state.power; const v = aimVector(tank); const start = muzzle(tank);
    const chassis = chassisData(tank);
    const perks = { direct: ["shell", "heavy"].includes(tank.weapon) ? chassis.direct : 1, scenery: chassis.scenery };
    if (muzzleFlashes.length >= MAX_MUZZLE_FLASHES) muzzleFlashes.shift();
    muzzleFlashes.push({ x: start.x, y: start.y, dir: tank.dir, weapon: tank.weapon, age: 0, life: 32 });
    projectiles.push({ x: start.x, y: start.y, vx: v.x, vy: v.y, launchVX: v.x, launchVY: v.y, weapon: tank.weapon, team: tank.team, age: 0, isSub: false, perks });
    fireButton.classList.remove("is-firing");
    hardwareParts.fire.mount.classList.remove("is-firing");
    void fireButton.offsetWidth;
    fireButton.classList.add("is-firing");
    hardwareParts.fire.mount.classList.add("is-firing");
    setTimeout(() => { fireButton.classList.remove("is-firing"); hardwareParts.fire.mount.classList.remove("is-firing"); }, 480);
    tank.angle = state.angle; fireButton.disabled = true;
    refreshSupportButton();
  }
  function cpuShotSolution(tank, target) {
    let best = { score: Infinity, angle: 25, power: 65, blocked: true };
    const weapon = weaponData(tank.weapon); const originalX = tank.x;
    for (let angle = 1; angle <= 85; angle += 3) for (let power = 40; power <= 100; power += 6) {
      const radians = angle * Math.PI / 180; const speed = launchSpeed(weapon, power);
      const start = muzzle(tank, angle); const vx = Math.cos(radians) * speed * tank.dir; const vy = -Math.sin(radians) * speed;
      const flight = (target.x - start.x) / vx; const gravity = BALLISTIC_GRAVITY;
      let blocked = flight <= 0 || flight > MAX_FLIGHT_FRAMES;
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
    if (tank !== activeTank() || !tank?.alive || state.winner || state.resolving || state.opponent !== "cpu") return;
    if (!target?.alive) {
      target = living(tank.team === "right" ? "left" : "right").sort((a, b) => Math.abs(a.x - tank.x) - Math.abs(b.x - tank.x))[0];
      if (!target) { nextTurn(); return; }
      const skill = CPU_SKILL[state.difficulty] || CPU_SKILL.recruit;
      aimPoint = { ...target, x: clamp(target.x + (Math.random() - .5) * skill.impactError * 2, 35, W - 35) };
    }
    const best = cpuShotSolution(tank, aimPoint);
    const skill = CPU_SKILL[state.difficulty] || CPU_SKILL.recruit;
    const angleError = (Math.random() - .5) * skill.angleError;
    const chargeError = (Math.random() - .5) * skill.chargeError;
    state.angle = clamp(Math.round(best.angle + angleError), 0, 85);
    state.power = clamp(Math.round(best.power + chargeError), 35, 100); tank.angle = state.angle; tank.power = state.power;
    angleInput.value = state.angle; powerInput.value = state.power; $("angleValue").textContent = formatAngle(state.angle); $("powerValue").textContent = state.power;
    syncInstruments(); fireButton.disabled = false; fire(true);
  }
  function cpuTurn() {
    const tank = activeTank(); if (!tank?.alive || state.winner || state.resolving || state.moving || projectiles.length || state.opponent !== "cpu" || tank.team !== "right") return;
    const targets = living("left"); if (!targets.length) return;
    const target = targets.sort((a, b) => Math.abs(a.x - tank.x) - Math.abs(b.x - tank.x))[0];
    const skill = CPU_SKILL[state.difficulty] || CPU_SKILL.recruit;
    const range = Math.abs(tank.x - target.x);
    const scatter = skill.impactError * (.7 + .3 * Math.min(1, range / 1000));
    const aimPoint = { ...target, x: clamp(target.x + (Math.random() - .5) * scatter * 2, 35, W - 35) };
    const currentX = tank.x, currentShot = cpuShotSolution(tank, aimPoint);
    const currentCover = cpuHasCover(currentX, target);
    const allies = state.tanks.filter((other) => other.alive && other.team === tank.team && other !== tank);
    const allowance = Math.min(180, Math.max(0, tank.moveRemaining));
    const candidates = [-allowance, allowance].map((offset) => Math.max(FIELD_LAYOUT.moveMin, Math.min(FIELD_LAYOUT.moveMax, currentX + offset)))
      .filter((x, i, list) => Math.abs(x - currentX) > 55 && list.indexOf(x) === i)
      .filter((x) => !allies.some((ally) => Math.abs(ally.x - x) < 115))
      .filter((x) => cpuPathClear(currentX, x))
      .filter((x) => !obstacleAt(x, surfaceY(x) - 35));
    let moveChoice = null;
    for (const x of candidates) {
      tank.x = x; const shot = cpuShotSolution(tank, aimPoint); tank.x = currentX;
      const covered = cpuHasCover(x, target);
      const health = tank.hp / tank.maxHp * 100;
      const defensiveCredit = covered && health <= 62 ? 210 : covered && health <= 82 ? 85 : 0;
      const utility = shot.score - defensiveCredit;
      const betterFiringLane = shot.score < currentShot.score - 24;
      const defensiveReposition = health <= 62 && covered && !currentCover && shot.score < currentShot.score + 500;
      if ((betterFiringLane || defensiveReposition) && (!moveChoice || utility < moveChoice.utility)) moveChoice = { x, utility, covered, shot };
    }
    if (moveChoice) {
      tank.moveRemaining = Math.max(0, tank.moveRemaining - Math.abs(moveChoice.x - currentX));
      state.moving = true; fireButton.disabled = true;
      state.aiMove = { tank, target, aimPoint, startX: currentX, targetX: moveChoice.x, elapsed: 0, duration: Math.max(32, Math.abs(moveChoice.x - currentX) / 2.2) };
      refreshHud();
      announce(moveChoice.covered && tank.hp / tank.maxHp <= .62 ? "HOSTILE REPOSITIONING // SEEKING COVER" : "HOSTILE REPOSITIONING // CLEARING FIRING LANE");
      return;
    }
    cpuTakeShot(tank, target, aimPoint);
  }
  function moveTank(delta) {
    const tank = activeTank(); if (!tank?.alive || projectiles.length || state.resolving || state.moving || state.winner || (state.opponent === "cpu" && tank.team === "right")) return;
    if (tank.moveRemaining <= 0) { announce("TRACK ALLOWANCE SPENT // FIRE TO END THIS TURN"); return; }
    const sameSide = state.tanks.filter((other) => other.alive && other.team === tank.team && other !== tank);
    const next = Math.max(FIELD_LAYOUT.moveMin, Math.min(FIELD_LAYOUT.moveMax, tank.x + delta * Math.min(24, tank.moveRemaining)));
    if (sameSide.some((other) => Math.abs(other.x - next) < 115)) { announce("TRACKS BLOCKED BY FRIENDLY UNIT"); return; }
    if (!cpuPathClear(tank.x, next) || obstacleAt(next, surfaceY(next) - 35)) { announce("TRACKS BLOCKED BY INTACT COVER // BREACH OR REPOSITION"); return; }
    tank.moveRemaining = Math.max(0, tank.moveRemaining - Math.abs(next - tank.x));
    tank.x = next; tank.move = 0; refreshHud();
  }
  function useSupport() {
    const tank = activeTank(); if (!tank || state.support === "off" || state.supportUsed[tank.team] || projectiles.length || state.resolving || state.moving || state.winner || (state.opponent === "cpu" && tank.team === "right")) { announce("NO SUPPORT AVAILABLE"); return; }
    state.resolving = true;
    state.supportUsed[tank.team] = true;
    let delay = 350;
    if (state.support === "repair") { tank.hp = Math.min(tank.maxHp, tank.hp + 30); announce("FIELD CREW // ARMOR PATCHED +30"); }
    else if (state.support === "scanner") {
      state.scanUntil = performance.now() + 7000; announce("RECON SCAN // CONTACTS PAINTED FOR 7 SECONDS");
    } else {
      const target = living(tank.team === "left" ? "right" : "left").sort((a, b) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2))[0];
      const supportWeapon = { air: "heavy", laser: "rail", rod: "lightning", meteor: "quantum" }[state.support];
      if (target) {
        if (state.support === "air" || state.support === "meteor") {
          delay = state.support === "air" ? 1450 : 950;
          const weapon = weapons.find((w) => w.key === supportWeapon);
          for (let i = 0; i < (state.support === "air" ? 3 : 1); i++) deferBattle(() => { if (!state.winner) impact(target.x + (Math.random() - .5) * 90, surfaceY(target.x), weapon, tank.team, target); }, i * 330, tank);
        } else {
          const weapon = weapons.find((w) => w.key === supportWeapon); impact(target.x, surfaceY(target.x) - 45, weapon, tank.team, target);
        }
      }
      announce(`${({ air: "AIR SUPPORT INBOUND", laser: "ORBITAL LASER LOCK", rod: "LIGHTNING ROD CHARGING", meteor: "METEOR DROP INBOUND" })[state.support]} // TARGET MARKED`);
    }
    refreshHud(); deferBattle(() => { if (!state.winner) nextTurn(); }, delay, tank);
  }
  function saveGame() {
    if (state.resolving || state.moving || projectiles.length) { announce("WAIT FOR THE ROUND TO CLEAR BEFORE SAVING"); return; }
    const saved = { ...state, tanks: state.tanks, terrain, obstacles, projectiles: [], effects: [], particles: [], hazards: [] };
    try { localStorage.setItem("tam-v2-save", JSON.stringify(saved)); announce("BATTLE STATE SAVED TO THIS BROWSER"); } catch { announce("SAVE FAILED // STORAGE UNAVAILABLE"); }
  }
  function loadGame() {
    try {
      const saved = JSON.parse(localStorage.getItem("tam-v2-save") || "null"); if (!saved || !Array.isArray(saved.terrain) || !Array.isArray(saved.tanks)) throw new Error("No save");
      battleEpoch++;
      Object.assign(state, saved); state.recorded = !!saved.recorded;
      terrain.splice(0, terrain.length, ...saved.terrain); obstacles.splice(0, obstacles.length, ...(Array.isArray(saved.obstacles) ? saved.obstacles : [])); terrainDirty = true;
      if (!Number.isFinite(state.seed)) state.seed = randomSeed();
      if (!FIELD_SCENES[state.sceneIndex]) state.sceneIndex = 0;
      state.mapName = FIELD_SCENES[state.sceneIndex].name;
      if (!state.atmosphere) state.atmosphere = "DUSK";
      // Old saves had one shared weapon. Migrate it only to the saved active
      // tank; other crews start with their own standard shell and charge.
      state.tanks = saved.tanks.map((tank, index) => {
        const chassis = CHASSIS[tank.chassis] ? tank.chassis : defaultChassis(tank.id);
        const spec = CHASSIS[chassis];
        // Preserve existing health on legacy saves, including old 100 HP crews.
        // Missing current-turn travel is zero so loading never grants extra moves.
        const maxHp = Number.isFinite(tank.maxHp) && tank.maxHp > 0 ? tank.maxHp : Math.max(spec.hp, tank.hp || 0);
        return { ...tank, chassis, maxHp, hp: clamp(tank.hp, 0, maxHp), moveRemaining: Number.isFinite(tank.moveRemaining) ? clamp(tank.moveRemaining, 0, spec.travel) : index === saved.turnIndex ? 0 : spec.travel,
          weapon: weaponData(tank.weapon || (index === saved.turnIndex ? saved.weapon : "shell")).key, power: clamp(tank.power || (index === saved.turnIndex ? saved.power : 63) || 63, 20, 100), view: COCKPIT_VIEWS.includes(tank.view) ? tank.view : "battlefield" };
      });
      state.moving = false; state.resolving = false; state.aiMove = null; state.lastTime = 0;
      projectiles.length = 0; effects.length = 0; particles.length = 0; hazards.length = 0; muzzleFlashes.length = 0;
      state.playerChassis = CHASSIS[saved.playerChassis] ? saved.playerChassis : state.tanks.find((tank) => tank.team === "left")?.chassis || "m40";
      $("mode").value = state.mode; $("opponent").value = state.opponent; $("formation").value = String(state.formation); playerChassisSelect.value = state.playerChassis; $("difficulty").value = state.difficulty; $("weather").value = state.weather; $("smoke").value = state.smoke || "thin"; $("support").value = state.support;
      angleInput.value = state.angle; powerInput.value = state.power; $("angleValue").textContent = formatAngle(state.angle); $("powerValue").textContent = state.power; refreshWeaponChoices(); selectTurn(state.turnIndex, false); syncCombatSwitches(); refreshHud(); announce("BATTLE STATE RESTORED");
    } catch { announce("NO VALID FIELD SAVE FOUND"); }
  }
  function aimChange() {
    if (!canControlTank()) return;
    state.angle = Number(angleInput.value); const tank = activeTank(); if (tank) tank.angle = state.angle; $("angleValue").textContent = formatAngle(state.angle);
    syncInstruments();
  }
  angleInput.addEventListener("input", aimChange);
  powerInput.addEventListener("input", () => { if (!canControlTank()) return; state.power = Number(powerInput.value); activeTank().power = state.power; $("powerValue").textContent = state.power; syncInstruments(); });
  // Native ranges remain focusable and keyboard-readable, while the full dial
  // is the pointer/touch target. Dragging either gauge never arms the gun.
  for (const input of [angleInput, powerInput]) {
    let pointer = null;
    let leverDrag = false;
    const lever = input.closest(".instrument").querySelector(".charge-lever");
    const setFromPointer = (event) => {
      if (input.disabled || !canControlTank()) return;
      const box = input.getBoundingClientRect();
      const degrees = Math.atan2(event.clientX - box.left - box.width / 2, -(event.clientY - box.top - box.height / 2)) * 180 / Math.PI;
      const leverBox = leverDrag ? lever.getBoundingClientRect() : null;
      const fraction = leverDrag ? clamp(1 - (event.clientY - leverBox.top) / leverBox.height, 0, 1) : (clamp(degrees, -120, 120) + 120) / 240;
      const selected = Number(input.min) + fraction * (Number(input.max) - Number(input.min));
      input.value = input === angleInput ? (Math.round(selected * 10) / 10).toFixed(1) : Math.round(selected);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const startDrag = (event) => {
      if (input.disabled || !canControlTank() || (event.pointerType === "mouse" && event.button !== 0)) return;
      leverDrag = event.currentTarget === lever;
      event.preventDefault(); pointer = event.pointerId; input.setPointerCapture(pointer); input.focus({ preventScroll: true }); setFromPointer(event);
    };
    input.addEventListener("pointerdown", startDrag);
    lever?.addEventListener("pointerdown", startDrag);
    input.addEventListener("pointermove", (event) => { if (pointer === event.pointerId) setFromPointer(event); });
    const endDrag = () => { pointer = null; };
    input.addEventListener("pointerup", endDrag); input.addEventListener("pointercancel", endDrag); input.addEventListener("lostpointercapture", endDrag);
  }
  weaponSelect.addEventListener("change", () => { if (!canControlTank()) return; state.weapon = weaponSelect.value; activeTank().weapon = state.weapon; updateWeaponReadout(); });
  ordnanceRack.addEventListener("click", (event) => {
    const choice = event.target.closest(".ordnance-choice");
    if (!choice || choice.disabled || !canControlTank()) return;
    weaponSelect.value = choice.dataset.weapon;
    weaponSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });
  cockpitViewSelect.addEventListener("change", () => { const tank = activeTank(); if (tank && COCKPIT_VIEWS.includes(cockpitViewSelect.value)) { tank.view = cockpitViewSelect.value; syncCockpitView(); resize(); } });
  fireButton.addEventListener("click", () => fire());
  $("moveLeft").addEventListener("click", () => moveTank(-1)); $("moveRight").addEventListener("click", () => moveTank(1));
  $("newMap").addEventListener("click", () => { if (projectiles.length || state.moving || state.resolving) { announce("WAIT FOR THE ROUND TO CLEAR"); return; } newMap(); });
  $("saveGame").addEventListener("click", saveGame); $("loadGame").addEventListener("click", loadGame);
  $("helpButton").addEventListener("click", () => $("manualDialog").showModal());
  $("nightToggle").addEventListener("click", () => { hardwareParts.night.mount.classList.remove("is-hinting"); state.night = !state.night; syncCombatSwitches(); });
  $("assistToggle").addEventListener("click", () => { hardwareParts.assist.mount.classList.remove("is-hinting"); state.assist = !state.assist; syncCombatSwitches(); });
  fireButton.addEventListener("pointerdown", () => { if (!fireButton.disabled) hardwareParts.fire.mount.classList.add("is-pressed"); });
  const releaseFireFace = () => hardwareParts.fire.mount.classList.remove("is-pressed");
  for (const event of ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"]) fireButton.addEventListener(event, releaseFireFace);
  window.addEventListener("blur", releaseFireFace);
  $("applySettings").addEventListener("click", () => { applyModeSettings(); missionMenu.open = false; $("applySettings").blur(); });
  $("formation").addEventListener("change", (event) => { if (state.mode !== "campaign" && state.mode !== "night") { state.formation = Number(event.target.value); } });
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    const focused = document.activeElement;
    const focusedGauge = focused === angleInput || focused === powerInput;
    if ($("manualDialog").open || missionMenu.open || /SELECT|TEXTAREA/.test(focused.tagName) || (focused.tagName === "INPUT" && !focusedGauge) || focused.isContentEditable) return;
    const tank = activeTank(); if (!canControlTank(tank)) return;
    const key = event.key.toLowerCase();
    // Focused native ranges keep their standard arrow/Home/End semantics while
    // labeled game keys still work immediately after dragging a dial.
    if (focusedGauge && ["arrowleft", "arrowright", "arrowup", "arrowdown", "home", "end", "pageup", "pagedown"].includes(key)) return;
    // Space and Enter activate a focused native button exactly once.
    if ((key === " " || key === "enter") && /BUTTON|SUMMARY|A/.test(focused.tagName)) return;
    if (["w", "s", "q", "e", "a", "d", "arrowleft", "arrowright", " "].includes(key) || event.key === "Enter") event.preventDefault();
    if (event.repeat && ["a", "d", "arrowleft", "arrowright", " ", "enter"].includes(key)) return;
    if (key === "w") { state.angle = Math.min(85, state.angle + 1); angleInput.value = state.angle; aimChange(); }
    if (key === "s") { state.angle = Math.max(0, state.angle - 1); angleInput.value = state.angle; aimChange(); }
    if (key === "q") { state.power = Math.max(20, state.power - 1); tank.power = state.power; powerInput.value = state.power; $("powerValue").textContent = state.power; syncInstruments(); }
    if (key === "e") { state.power = Math.min(100, state.power + 1); tank.power = state.power; powerInput.value = state.power; $("powerValue").textContent = state.power; syncInstruments(); }
    if (key === "a" || key === "arrowleft") moveTank(-1); if (key === "d" || key === "arrowright") moveTank(1);
    if (key === " " || event.key === "Enter") fire();
  });
  const supportButton = document.createElement("button"); supportButton.className = "control-button slim support-button"; supportButton.type = "button"; supportButton.innerHTML = "✦ <span>NO SUPPORT</span>"; supportButton.title = "Select a support option in Mission Configuration"; supportButton.addEventListener("click", useSupport);
  menuActions.append(supportButton);
  playerChassisSelect.value = state.playerChassis;
  generateBattlefield(randomSeed()); setFormation(2); refreshWeaponChoices(); resize(); selectTurn(0, false); refreshHud(); syncCombatSwitches(); renderBattleRecords(); showSwitchHints();
  requestAnimationFrame(frame);
})();
