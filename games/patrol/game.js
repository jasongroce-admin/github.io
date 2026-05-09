(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const statusLine = document.getElementById('statusLine');
  const callsClearedEl = document.getElementById('callsCleared');
  const dispatchPanel = document.getElementById('dispatchPanel');
  const dispatchTimer = document.getElementById('dispatchTimer');
  const dispatchTitle = document.getElementById('dispatchTitle');
  const dispatchBody = document.getElementById('dispatchBody');
  const acceptCallBtn = document.getElementById('acceptCallBtn');
  const declineCallBtn = document.getElementById('declineCallBtn');
  const healthFill = document.getElementById('healthFill');
  const healthText = document.getElementById('healthText');
  const mapModePanel = document.getElementById('mapModePanel');
  const trainingPanel = document.getElementById('trainingPanel');
  const trainingTag = document.getElementById('trainingTag');
  const trainingTitle = document.getElementById('trainingTitle');
  const trainingNarrative = document.getElementById('trainingNarrative');
  const trainingFacts = document.getElementById('trainingFacts');
  const trainingOptions = document.getElementById('trainingOptions');
  const closeTrainingBtn = document.getElementById('closeTrainingBtn');

  const YOULEVEL_ASSET_ROOT = '../youlevel/images/';
  const LOCAL_ASSET_ROOT = 'images/';
  const sprites = {
    policeInterceptor: { file: 'police_ford_interceptor_topdown_facing_up_512x512.webp', root: LOCAL_ASSET_ROOT, facing: 'up' },
    policeCharger: { file: 'police_dodge_charger_topdown_facing_down_512x512.webp', root: LOCAL_ASSET_ROOT, facing: 'down' },
    sedan: { file: 'civilian_sedan_topdown_facing_up_512x512.webp', root: LOCAL_ASSET_ROOT, facing: 'up' },
    sedanDown: { file: 'civilian_sedan_topdown_facing_down_512x512.webp', root: LOCAL_ASSET_ROOT, facing: 'down' },
    hatchback: { file: 'civilian_hatchback_topdown_facing_down_512x512.webp', root: LOCAL_ASSET_ROOT, facing: 'down' },
    hatchbackYellow: { file: 'civilian_hatchback_yellow_topdown_facing_down_512x512.webp', root: LOCAL_ASSET_ROOT, facing: 'down' },
    pickup: { file: 'civilian_pickup_truck_topdown_facing_up_512x512.webp', root: LOCAL_ASSET_ROOT, facing: 'up' },
    pickupDown: { file: 'civilian_pickup_truck_topdown_facing_down_512x512.webp', root: LOCAL_ASSET_ROOT, facing: 'down' },
    suv: { file: 'civilian_suv_topdown_facing_up_512x512.webp', root: LOCAL_ASSET_ROOT, facing: 'up' },
    houseA: { file: 'building_normal_house_classic_1168x784.webp', root: YOULEVEL_ASSET_ROOT },
    houseB: { file: 'building_normal_house_gray_1168x662.webp', root: YOULEVEL_ASSET_ROOT },
    houseC: { file: 'building_normal_house_brick_1168x696.webp', root: YOULEVEL_ASSET_ROOT },
    school: { file: 'building_schoolhouse_1008x535.webp', root: YOULEVEL_ASSET_ROOT },
    garage: { file: 'building_garage_652x251.webp', root: YOULEVEL_ASSET_ROOT },
    barn: { file: 'building_barn_large_514x288.webp', root: YOULEVEL_ASSET_ROOT },
    oak: { file: 'nature_tree_oak_realistic_784x956.webp', root: YOULEVEL_ASSET_ROOT },
    pine: { file: 'nature_tree_pine_realistic_700x1092.webp', root: YOULEVEL_ASSET_ROOT }
  };

  const images = {};
  Object.entries(sprites).forEach(([key, spec]) => {
    const img = new Image();
    img.src = spec.root + spec.file;
    images[key] = img;
  });

  const GENERATED_ROOT = 'images/generated/';
  const GENERATED_DIRECTIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  const generatedSprites = {
    vehicles: ['police_cruiser', 'sedan_blue', 'sedan_red', 'pickup_green', 'suv_gray'],
    buildings: ['ranch', 'brick_home', 'garage', 'barn', 'store', 'trailer'],
    roofs: ['ranch', 'brick_home', 'garage', 'barn', 'store', 'trailer'],
    trees: ['oak_dense', 'maple', 'pine_tall', 'yard_bush'],
    people: ['civilian_blue', 'civilian_red', 'civilian_yellow', 'officer', 'ems'],
    tiles: ['lawn_striped', 'lawn_dark', 'field_plowed', 'field_green', 'gravel']
  };
  generatedSprites.vehicles.forEach((name) => GENERATED_DIRECTIONS.forEach((dir) => loadGenerated(`vehicle_${name}_${dir}`)));
  generatedSprites.buildings.forEach((name) => ['n', 'e', 's', 'w'].forEach((dir) => loadGenerated(`building_${name}_${dir}`)));
  generatedSprites.roofs.forEach((name) => ['n', 'e', 's', 'w'].forEach((dir) => loadGenerated(`roof_${name}_${dir}`)));
  generatedSprites.trees.forEach((name) => loadGenerated(`tree_${name}`));
  generatedSprites.people.forEach((name) => ['n', 'e', 's', 'w'].forEach((dir) => loadGenerated(`person_${name}_${dir}`)));
  ['n', 'e', 's', 'w'].forEach((dir) => loadGenerated(`animal_dog_${dir}`));
  generatedSprites.tiles.forEach((name) => loadGenerated(`tile_${name}`));

  function loadGenerated(name) {
    const img = new Image();
    img.src = `${GENERATED_ROOT}${name}.webp`;
    images[name] = img;
  }

  const town = {
    width: 3000,
    height: 2200,
    name: '',
    roads: []
  };

  const addresses = [];
  const stopSigns = [];

  const buildings = [
    { sprite: 'houseA', x: 1018, y: 1620, w: 150, h: 96 },
    { sprite: 'houseB', x: 1178, y: 1640, w: 150, h: 88 },
    { sprite: 'school', x: 900, y: 1680, w: 190, h: 118 },
    { sprite: 'garage', x: 982, y: 1870, w: 142, h: 86 },
    { sprite: 'houseC', x: 1196, y: 1775, w: 165, h: 98 },
    { sprite: 'houseA', x: 820, y: 1660, w: 152, h: 96 },
    { sprite: 'barn', x: 1770, y: 1660, w: 180, h: 108 },
    { sprite: 'houseB', x: 1165, y: 1480, w: 150, h: 92 },
    { sprite: 'houseC', x: 1035, y: 1940, w: 155, h: 92 },
    { sprite: 'garage', x: 1000, y: 1730, w: 136, h: 84 }
  ];

  const trees = [
    [930, 1570, 'oak'], [1220, 1585, 'pine'], [980, 1905, 'oak'], [1185, 1888, 'oak'],
    [1360, 1708, 'pine'], [2100, 1665, 'oak'], [1080, 1220, 'pine'], [760, 1850, 'oak']
  ];
  const pedestrians = [
    { x: 1020, y: 1622, color: '#ffdd55' },
    { x: 1175, y: 1712, color: '#9ed6ff' },
    { x: 950, y: 1828, color: '#ff8b8b' },
    { x: 1115, y: 1888, color: '#b7f2a2' },
    { x: 1228, y: 1565, color: '#f5f5f5' }
  ];

  const dispatches = [
    { title: 'Traffic Stop Assist', body: 'Caller reports a driver refusing instructions near {address}.', urgency: 1 },
    { title: 'Welfare Check', body: 'Neighbor requests a check after hearing a loud argument near {address}.', urgency: 1 },
    { title: 'Reckless Driver', body: 'Vehicle circling the block and ignoring stop signs near {address}.', urgency: 2 },
    { title: 'Disabled Vehicle', body: 'A vehicle is partly blocking traffic near {address}.', urgency: 1 },
    { title: 'Suspicious Vehicle', body: 'Caller reports a suspicious vehicle near {address}. They describe a {vehicle} leaving the area.', urgency: 2, kind: 'suspiciousVehicle' },
    { title: 'Suspicious Person', body: 'Resident reports a person walking between yards near {address}.', urgency: 1 },
    { title: 'Parking Complaint', body: 'Caller reports a car parked too close to the roadway near {address}.', urgency: 1 },
    { title: 'Rail Crossing Check', body: 'Dispatch received a complaint near the railroad crossing by {address}.', urgency: 2 }
  ];
  const CUSTOM_MISSION_KEY = 'patrol.customMissions.v1';
  const LEGACY_CUSTOM_MISSION_KEY = 'sovereignCitizen.customMissions.v1';
  const PRACTICE_MAP_KEY = 'patrol.practiceRoads.v1';
  const MAP_MODE_KEY = 'patrol.mapMode.v1';
  const CAMERA_ZOOMS = [0.52, 0.64, 0.78];

  const keys = new Set();
  const touchDrive = new Set();
  let camera = { x: 0, y: 0, focusX: 0, focusY: 0 };
  let mapMode = ['imagery', 'topo', 'game'].includes(localStorage.getItem(MAP_MODE_KEY)) ? localStorage.getItem(MAP_MODE_KEY) : 'game';
  let gameWorldDecor = null;
  let lastTime = performance.now();
  let callTimer = 4;
  let pendingCall = null;
  let activeCall = null;
  let callsCleared = 0;
  let policeLights = false;
  let cameraZoomIndex = 0;
  let activeInteraction = null;
  let statusHold = 0;
  let suspectVehicleCounter = 0;

  const player = {
    x: 1092,
    y: 1991,
    angle: -Math.PI / 2,
    speed: 0,
    maxSpeed: 520,
    health: 100,
    damageCooldown: 0
  };

  const traffic = [];
  const driverProfiles = [
    { name: 'Freddy Fatfoot', demeanor: 'nervous but polite' },
    { name: 'Darel Dragster', demeanor: 'impatient and defensive' },
    { name: 'Martha Maple', demeanor: 'calm and cooperative' },
    { name: 'Leonard Lanes', demeanor: 'confused and apologetic' },
    { name: 'Tina Turnwell', demeanor: 'chatty but evasive' },
    { name: 'Calvin Cross', demeanor: 'quiet and tense' },
    { name: 'Nina Northbound', demeanor: 'straightforward and respectful' },
    { name: 'Bobby Broadstreet', demeanor: 'overly friendly' }
  ];

  const violationProfiles = [
    {
      id: 'clean',
      label: 'No observed violation',
      severity: 0,
      probableCause: false,
      notes: 'Vehicle was driving normally.',
      documents: { dl: 'Valid Indiana license.', registration: 'Valid registration.', insurance: 'Proof of insurance provided.' },
      responses: {
        reason: 'I am not sure why I was stopped, officer.',
        travel: 'I am heading home.',
        impairment: 'No alcohol or drugs today.',
        search: 'I do not consent to a search.'
      },
      result: 'No violation is supported. End the stop professionally and be careful to only stop vehicles after observing an illegal act.'
    },
    {
      id: 'speeding',
      label: 'Speeding',
      severity: 1,
      probableCause: true,
      notes: 'Radar estimate shows the vehicle above the posted speed.',
      documents: { dl: 'Valid Indiana license.', registration: 'Valid registration.', insurance: 'Proof of insurance provided.' },
      responses: {
        reason: 'I was late and did not realize I was going that fast.',
        travel: 'I am going across town to pick someone up.',
        impairment: 'No impairment indicators beyond being nervous.',
        search: 'I would rather not have the car searched.'
      },
      result: 'Speeding is supported. Warning or citation is reasonable depending on speed and training policy.'
    },
    {
      id: 'reckless',
      label: 'Reckless driving',
      severity: 2,
      probableCause: true,
      notes: 'Vehicle is weaving and accelerating hard through town.',
      documents: { dl: 'Valid license, but prior moving violations are noted.', registration: 'Registration matches vehicle.', insurance: 'Insurance is valid.' },
      responses: {
        reason: 'I was just messing around. I know it looked bad.',
        travel: 'Nowhere important.',
        impairment: 'Speech is clear, but behavior is risky.',
        search: 'No, you cannot search it.'
      },
      result: 'A citation is supported. Consider further investigation only if additional clues appear.'
    },
    {
      id: 'suspended',
      label: 'Speeding with suspended license',
      severity: 3,
      probableCause: true,
      notes: 'Vehicle was speeding. Driver appears tense and avoids eye contact.',
      documents: { dl: 'License returns suspended.', registration: 'Registration belongs to a family member.', insurance: 'No proof of insurance provided.' },
      responses: {
        reason: 'I know I was a little fast. I cannot be late again.',
        travel: 'I am going to work.',
        impairment: 'No signs of impairment.',
        search: 'I do not want the car searched.'
      },
      result: 'Suspended license and no insurance support citation, tow or impound depending on agency policy.'
    },
    {
      id: 'contraband',
      label: 'Speeding with criminal indicators',
      severity: 4,
      probableCause: true,
      notes: 'Driver was speeding. Passenger area has a strong odor and the driver keeps reaching toward the console.',
      documents: { dl: 'Valid license.', registration: 'Registration is valid.', insurance: 'Insurance card is expired.' },
      responses: {
        reason: 'I was not paying attention. I am just trying to get out of here.',
        travel: 'I am visiting a friend, but I do not know the address.',
        impairment: 'Eyes are glassy and hands are shaking.',
        search: 'Driver refuses consent. Observable odor and movement may justify further investigation under training policy.'
      },
      result: 'Further investigation is supported. If contraband is confirmed, arrest and impound may be appropriate.'
    }
  ];

  const sceneCaseProfiles = [
    {
      match: /welfare|argument|suspicious/i,
      title: 'Welfare Check',
      observations: ['Loud voices were reported before arrival.', 'One person is visible near the doorway.', 'No immediate weapon is visible.'],
      actions: {
        caller: 'Caller says the argument stopped when the patrol car arrived.',
        victim: 'Resident appears upset but speaks clearly. Ask separating questions and check for injuries.',
        ems: 'EMS can stage nearby if injury or medical distress is found.',
        scene: 'Secure a safe contact position, keep hands visible, and avoid blocking EMS access.'
      },
      result: 'Good welfare checks balance safety, separation, documentation, and asking if anyone needs medical help.'
    },
    {
      match: /disabled|parking|traffic/i,
      title: 'Traffic Hazard',
      observations: ['Vehicle is close to the travel lane.', 'Driver is present.', 'Traffic can still pass slowly.'],
      actions: {
        caller: 'Caller reports vehicles swerving around the hazard.',
        victim: 'Driver says the vehicle stalled and they have not called for help yet.',
        ems: 'No EMS need unless the driver reports pain, confusion, heat exposure, or illness.',
        scene: 'Use lights, position the patrol car for protection, and consider tow/traffic control.'
      },
      result: 'Traffic hazards are about scene protection first, then driver status, documentation, and clearing the road.'
    },
    {
      match: /reckless|rail|crossing/i,
      title: 'Reckless Driving Complaint',
      observations: ['Caller points toward the last known direction.', 'No crash is visible.', 'Several pedestrians are nearby.'],
      actions: {
        caller: 'Caller can describe the vehicle color and direction but did not get a plate.',
        victim: 'No direct victim is located at the scene.',
        ems: 'EMS is not needed unless a crash or injury is located.',
        scene: 'Broadcast the description, check nearby streets, and document witness details.'
      },
      result: 'Without direct observation, build the case from witness detail and patrol search rather than overreaching.'
    }
  ];
  const backgroundOverlay = {
    img: null,
    tiles: [],
    loading: false,
    key: ''
  };

  normalizeTownGeometry();

  function car(sprite, x, y, angle, speed) {
    return { sprite, x, y, angle, speed, baseSpeed: speed, turnTimer: 0, health: 100, damageCooldown: 0, enemy: false, pulledOver: false };
  }

  function normalizeTownGeometry() {
    town.roads = normalizeRoads(window.PATROL_DEFAULT_ROADS);
    if (!town.roads.length) town.roads = loadPracticeRoads();
    if (!town.roads.length) town.roads = buildTownCoreRoads();
    stopSigns.splice(0, stopSigns.length, ...loadStopSigns());
    applyTownMapSize();

    addresses.splice(0, addresses.length,
      { label: '100 S Main Street', x: 3600, y: 1870, kind: 'post' },
      { label: '201 S Main Street', x: 3630, y: 2360, kind: 'house' },
      { label: '301 E Madison Street', x: 4220, y: 1260, kind: 'school' },
      { label: '44 S Vine Street', x: 2620, y: 3340, kind: 'garage' },
      { label: '502 East Street', x: 4540, y: 3180, kind: 'house' },
      { label: '205 Railroad Street', x: 1850, y: 2300, kind: 'house' },
      { label: '808 S Main Street', x: 3660, y: 4180, kind: 'barn' },
      { label: '61 Lake Drive', x: 1060, y: 2600, kind: 'house' }
    );

    buildings.splice(0, buildings.length,
      { sprite: 'houseA', x: 3060, y: 620, w: 210, h: 134, health: 100 },
      { sprite: 'houseB', x: 4160, y: 600, w: 210, h: 124, health: 100 },
      { sprite: 'school', x: 5000, y: 1240, w: 270, h: 168, health: 100 },
      { sprite: 'garage', x: 2360, y: 2360, w: 210, h: 128, health: 100 },
      { sprite: 'houseC', x: 5020, y: 2360, w: 230, h: 138, health: 100 },
      { sprite: 'houseA', x: 1200, y: 2360, w: 218, h: 138, health: 100 },
      { sprite: 'barn', x: 4200, y: 3820, w: 280, h: 168, health: 100 },
      { sprite: 'houseB', x: 4100, y: 3120, w: 215, h: 132, health: 100 },
      { sprite: 'houseC', x: 3160, y: 3740, w: 230, h: 138, health: 100 },
      { sprite: 'garage', x: 5060, y: 3340, w: 210, h: 130, health: 100 }
    );

    trees.splice(0, trees.length,
      [520, 980, 'oak'], [1360, 760, 'pine'], [2060, 1160, 'oak'], [5180, 980, 'oak'],
      [5200, 2440, 'pine'], [4760, 3820, 'oak'], [1120, 3540, 'pine'], [5660, 3360, 'oak'],
      [2380, 3640, 'oak'], [3960, 3160, 'pine']
    );
    pedestrians.splice(0, pedestrians.length,
      { x: 2860, y: 1880, color: '#ffdd55' },
      { x: 3590, y: 1680, color: '#9ed6ff' },
      { x: 3400, y: 3060, color: '#ff8b8b' },
      { x: 3960, y: 2760, color: '#b7f2a2' },
      { x: 1980, y: 2640, color: '#f5f5f5' }
    );
    placeStaticAlongRoads();
    placePedestriansAlongSidewalks();
    gameWorldDecor = buildGameWorldDecor();
    resetTraffic();
    placePlayerOnRoad();
  }

  function applyTownMapSize() {
    const size = window.PATROL_MAP_SIZE || {};
    let width = clamp(Number(size.width || 14000), 6200, 30000);
    let height = clamp(Number(size.height || 10000), 4600, 24000);
    town.roads.forEach((road) => {
      road.pts.forEach(([x, y]) => {
        width = Math.max(width, x + 1000);
        height = Math.max(height, y + 1000);
      });
    });
    town.width = clamp(Math.ceil(width / 500) * 500, 6200, 30000);
    town.height = clamp(Math.ceil(height / 500) * 500, 4600, 24000);
  }

  function loadPracticeRoads() {
    try {
      return normalizeRoads(JSON.parse(localStorage.getItem(PRACTICE_MAP_KEY) || '[]'));
    } catch {
      return [];
    }
  }

  function buildTownCoreRoads() {
    const sharedRoads = normalizeRoads(window.PATROL_DEFAULT_ROADS);
    if (sharedRoads.length) return sharedRoads;
    const main = 270;
    const county = 260;
    const local = 190;
    const alley = 150;
    return [
      { name: 'W County Road 200 S', kind: 'tertiary', w: county, pts: [[0, 1720], [1560, 1718], [2620, 1708], [3600, 1698], [6200, 1700]] },
      { name: 'W 234', kind: 'tertiary', w: 230, pts: [[0, 1660], [1040, 1600], [2060, 1460], [2620, 1260], [3600, 980], [4820, 780]] },
      { name: 'S Main Street', kind: 'secondary', w: main, pts: [[3600, 300], [3600, 980], [3600, 1700], [3600, 2520], [3610, 4500]] },
      { name: 'East Street', kind: 'residential', w: local, pts: [[4540, 320], [4540, 1180], [4540, 1700], [4540, 3000], [4500, 3300]] },
      { name: 'N Vine Street', kind: 'residential', w: local, pts: [[2620, 340], [2620, 1260], [2620, 1700]] },
      { name: 'S Vine Street', kind: 'residential', w: local, pts: [[2620, 1780], [2620, 2540], [2620, 3420], [2620, 4260]] },
      { name: 'Rosewood Street', kind: 'residential', w: local, pts: [[1600, 360], [1600, 1280], [1600, 2200], [1600, 3100]] },
      { name: 'Sampson Street', kind: 'residential', w: local, pts: [[760, 420], [760, 1680], [760, 3000], [760, 3600]] },
      { name: 'Hinshaw Street', kind: 'residential', w: local, pts: [[5480, 1700], [5480, 2240], [5480, 3000], [5360, 3240], [5360, 4020]] },
      { name: 'Broad Street', kind: 'residential', w: local, pts: [[1600, 2040], [2620, 2040], [3600, 2040], [4540, 2040], [5480, 2040]] },
      { name: 'Dewey Street', kind: 'residential', w: local, pts: [[1240, 2760], [1600, 2760], [2620, 2760], [3600, 2760], [4540, 2760], [5480, 2760]] },
      { name: 'South Street', kind: 'residential', w: local, pts: [[2620, 3420], [3600, 3420], [4540, 3420]] },
      { name: 'Martindale Street', kind: 'residential', w: local, pts: [[840, 3940], [1600, 3940], [2620, 3940], [3600, 3940], [4540, 3940]] },
      { name: 'Washington Street', kind: 'residential', w: local, pts: [[3600, 4260], [4140, 4260], [4540, 4120]] },
      { name: 'Railroad Street', kind: 'residential', w: alley, pts: [[940, 2480], [1600, 2300], [2260, 2080], [2620, 1900], [3600, 1700]] },
      { name: 'Lake Drive', kind: 'residential', w: local, pts: [[420, 760], [720, 1060], [720, 1700], [1080, 2020], [1080, 2520], [1600, 2760]] },
      { name: 'Rosewood Drive', kind: 'residential', w: local, pts: [[1600, 2040], [1320, 2040], [1320, 2520], [1600, 2520]] },
      { name: 'Plum Street', kind: 'residential', w: alley, pts: [[2620, 2360], [3140, 2360], [3600, 2360], [4540, 2360]] },
      { name: '', kind: 'residential', w: local, pts: [[4540, 3080], [4980, 3080], [5360, 3000]] },
      { name: '', kind: 'residential', w: local, pts: [[4540, 3660], [5000, 3660], [5360, 3500]] }
    ];
  }

  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function setStatus(text, hold = 1.8) {
    statusLine.textContent = text;
    statusHold = Math.max(statusHold, hold);
  }

  function normalizeRoads(roads) {
    if (!Array.isArray(roads)) return [];
    return roads.map((road) => ({
      name: String(road?.name || ''),
      kind: String(road?.kind || 'residential'),
      w: clamp(Number(road?.w || 190), 80, 320),
      builderRoad: Boolean(road?.builderRoad),
      pts: Array.isArray(road?.pts) ? road.pts.map((p) => [Math.round(Number(p?.[0] || 0)), Math.round(Number(p?.[1] || 0))]) : []
    })).filter((road) => road.pts.length > 1);
  }

  function cloneRoads(roads) {
    return normalizeRoads(roads).map((road) => ({ ...road, pts: road.pts.map(([x, y]) => [x, y]) }));
  }

  function normalizeStopSigns(signs) {
    if (!Array.isArray(signs)) return [];
    return signs.map((sign) => ({
      x: Math.round(Number(sign?.x || 0)),
      y: Math.round(Number(sign?.y || 0)),
      angle: Number(sign?.angle || 0),
      roadName: String(sign?.roadName || ''),
      cardinal: String(sign?.cardinal || ''),
      auto: Boolean(sign?.auto)
    })).filter((sign) => Number.isFinite(sign.x) && Number.isFinite(sign.y));
  }

  function loadStopSigns() {
    const saved = normalizeStopSigns(window.PATROL_STOP_SIGNS);
    return saved.length ? saved : generateStopSigns(town.roads);
  }

  function roadAllowsStopSigns(road) {
    return road && road.kind !== 'alley' && road.kind !== 'service' && !/alley|service/i.test(road.name || '');
  }

  function roadIsMain(road) {
    return /\bmain\b/i.test(road?.name || '');
  }

  function roadIsSouthMain(road) {
    return /south\s+main|\bs\s+main\b/i.test(road?.name || '');
  }

  function roadIsState234(road) {
    return /234|state road/i.test(road?.name || '');
  }

  function cardinalFromAngle(angle) {
    const deg = ((angle * 180 / Math.PI) + 360) % 360;
    if (deg >= 315 || deg < 45) return 'N';
    if (deg < 135) return 'E';
    if (deg < 225) return 'S';
    return 'W';
  }

  function segmentIntersection(a, b) {
    const den = (a.x1 - a.x2) * (b.y1 - b.y2) - (a.y1 - a.y2) * (b.x1 - b.x2);
    if (Math.abs(den) < 0.001) return null;
    const px = ((a.x1 * a.y2 - a.y1 * a.x2) * (b.x1 - b.x2) - (a.x1 - a.x2) * (b.x1 * b.y2 - b.y1 * b.x2)) / den;
    const py = ((a.x1 * a.y2 - a.y1 * a.x2) * (b.y1 - b.y2) - (a.y1 - a.y2) * (b.x1 * b.y2 - b.y1 * b.x2)) / den;
    const onA = px >= Math.min(a.x1, a.x2) - 80 && px <= Math.max(a.x1, a.x2) + 80 && py >= Math.min(a.y1, a.y2) - 80 && py <= Math.max(a.y1, a.y2) + 80;
    const onB = px >= Math.min(b.x1, b.x2) - 80 && px <= Math.max(b.x1, b.x2) + 80 && py >= Math.min(b.y1, b.y2) - 80 && py <= Math.max(b.y1, b.y2) + 80;
    return onA && onB ? { x: px, y: py } : null;
  }

  function addStopApproaches(signs, segment, point, bothWays = true) {
    const ux = segment.dx / segment.len;
    const uy = segment.dy / segment.len;
    const offset = Math.max(88, Math.min(160, (segment.road.w || 130) * 0.75));
    const sideOffset = (segment.road.w || 130) / 2 + 42;
    const approaches = bothWays ? [-1, 1] : [-1];
    approaches.forEach((dir) => {
      const travelX = -ux * dir;
      const travelY = -uy * dir;
      const rightX = -travelY;
      const rightY = travelX;
      const centerX = point.x + ux * offset * dir;
      const centerY = point.y + uy * offset * dir;
      const sign = {
        x: Math.round(centerX + rightX * sideOffset),
        y: Math.round(centerY + rightY * sideOffset),
        angle: Math.atan2(travelX, -travelY),
        roadName: segment.road.name || 'Custom',
        auto: true
      };
      sign.cardinal = cardinalFromAngle(sign.angle);
      if (!signs.some((existing) => Math.hypot(existing.x - sign.x, existing.y - sign.y) < 130)) signs.push(sign);
    });
  }

  function addState234EastStop(signs, segment, point) {
    const ux = segment.dx / segment.len;
    const uy = segment.dy / segment.len;
    const eastDir = ux >= 0 ? -1 : 1;
    const offset = Math.max(120, Math.min(180, (segment.road.w || 220) * 0.75));
    const sideOffset = (segment.road.w || 220) / 2 + 44;
    const centerX = point.x + ux * offset * eastDir;
    const centerY = point.y + uy * offset * eastDir;
    const sign = {
      x: Math.round(centerX - uy * sideOffset),
      y: Math.round(centerY + ux * sideOffset),
      angle: Math.PI / 2,
      roadName: segment.road.name || 'SR 234',
      cardinal: 'E',
      auto: true
    };
    if (!signs.some((existing) => Math.hypot(existing.x - sign.x, existing.y - sign.y) < 180 && /234|state road/i.test(existing.roadName))) signs.push(sign);
  }

  function generateStopSigns(roads) {
    const signs = [];
    signs.push({
      x: 9068,
      y: 10262,
      angle: Math.PI / 2,
      roadName: 'W State Road 234',
      cardinal: 'E',
      auto: true
    });
    signs.push({
      x: 4775,
      y: 10482,
      angle: Math.PI,
      roadName: 'Lake Entrance',
      cardinal: 'S',
      auto: true
    });
    const segments = getRoadSegments(60).filter((segment) => roadAllowsStopSigns(segment.road));
    for (let i = 0; i < segments.length; i += 1) {
      for (let j = i + 1; j < segments.length; j += 1) {
        const a = segments[i];
        const b = segments[j];
        if (a.roadIndex === b.roadIndex) continue;
        const point = segmentIntersection(a, b);
        if (!point) continue;
        const a234 = roadIsState234(a.road);
        const b234 = roadIsState234(b.road);
        const aMain = roadIsMain(a.road);
        const bMain = roadIsMain(b.road);
        if (/lake\s+(drive|entrance)/i.test(a.road.name || '') || /lake\s+(drive|entrance)/i.test(b.road.name || '')) continue;
        if (/north\s+rosewood/i.test(a.road.name || '') && bMain) continue;
        if (/north\s+rosewood/i.test(b.road.name || '') && aMain) continue;
        if (/sampson/i.test(a.road.name || '') && point.y < 9000) continue;
        if (/sampson/i.test(b.road.name || '') && point.y < 9000) continue;
        if (a234 || b234) {
          if (a234 && roadIsSouthMain(b.road)) addState234EastStop(signs, a, point);
          if (b234 && roadIsSouthMain(a.road)) addState234EastStop(signs, b, point);
          continue;
        }
        if (aMain && !bMain) addStopApproaches(signs, b, point, true);
        else if (bMain && !aMain) addStopApproaches(signs, a, point, true);
        else {
          addStopApproaches(signs, a, point, true);
          addStopApproaches(signs, b, point, true);
        }
      }
    }
    return signs.filter((sign) => !(/north\s+rosewood/i.test(sign.roadName || '') && /^(N|S)$/i.test(sign.cardinal || '')));
  }

  function getRoadSegments(minLen = 180) {
    const segments = [];
    town.roads.forEach((road, roadIndex) => {
      road.pts.forEach((pt, segmentIndex) => {
        if (segmentIndex >= road.pts.length - 1) return;
        const [x1, y1] = pt;
        const [x2, y2] = road.pts[segmentIndex + 1];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len >= minLen) segments.push({ road, roadIndex, segmentIndex, x1, y1, x2, y2, dx, dy, len });
      });
    });
    return segments;
  }

  function pointOnSegment(segment, t = 0.5, side = 1, offset = 0) {
    const ux = segment.dx / Math.max(1, segment.len);
    const uy = segment.dy / Math.max(1, segment.len);
    const nx = -uy * side;
    const ny = ux * side;
    return {
      x: segment.x1 + segment.dx * t + nx * offset,
      y: segment.y1 + segment.dy * t + ny * offset,
      angle: Math.atan2(segment.dx, -segment.dy),
      road: segment.road,
      roadIndex: segment.roadIndex,
      segmentIndex: segment.segmentIndex
    };
  }

  function getReferenceOverlaySettings() {
    const saved = window.PATROL_REFERENCE_OVERLAY || {};
    const source = mapMode === 'topo' ? 'topo' : 'imagery';
    return {
      source,
      opacity: clamp(Number(saved.opacity ?? 0.95), 0, 1),
      dx: Number(saved.dx || 0),
      dy: Number(saved.dy || 0),
      scale: clamp(Number(saved.scale || 1), 0.75, 1.35),
      padding: clamp(Number(saved.padding ?? 0.08), 0, 0.25),
      visible: saved.visible !== false,
      tileColumns: clamp(Number(saved.tileColumns || 1), 1, 8),
      tileRows: clamp(Number(saved.tileRows || 1), 1, 8),
      tilePixels: clamp(Number(saved.tilePixels || 4096), 512, 4096)
    };
  }

  function geoToMap(lon, lat) {
    const projection = window.PATROL_MAP_PROJECTION || {};
    const minLon = Number(projection.minLon ?? window.PATROL_GEO_BOUNDS?.west);
    const maxLat = Number(projection.maxLat ?? window.PATROL_GEO_BOUNDS?.north);
    const metersPerDegLat = Number(projection.metersPerDegLat || 111320);
    const metersPerDegLon = Number(projection.metersPerDegLon || 85600);
    const scale = Number(projection.scale || 8);
    const pad = Number(projection.pad || 900);
    return {
      x: Math.round((lon - minLon) * metersPerDegLon * scale + pad),
      y: Math.round((maxLat - lat) * metersPerDegLat * scale + pad)
    };
  }

  function paddedGeoBounds(settings = getReferenceOverlaySettings()) {
    const bounds = window.PATROL_GEO_BOUNDS;
    if (!bounds) return null;
    const lonPad = (bounds.east - bounds.west) * settings.padding;
    const latPad = (bounds.north - bounds.south) * settings.padding;
    return {
      west: bounds.west - lonPad,
      east: bounds.east + lonPad,
      south: bounds.south - latPad,
      north: bounds.north + latPad
    };
  }

  function overlayWorldRect(settings = getReferenceOverlaySettings()) {
    const bounds = paddedGeoBounds(settings);
    if (!bounds) return null;
    const nw = geoToMap(bounds.west, bounds.north);
    const se = geoToMap(bounds.east, bounds.south);
    const baseW = se.x - nw.x;
    const baseH = se.y - nw.y;
    const w = baseW * settings.scale;
    const h = baseH * settings.scale;
    return {
      x: nw.x + settings.dx - (w - baseW) / 2,
      y: nw.y + settings.dy - (h - baseH) / 2,
      w,
      h
    };
  }

  function usgsOverlayUrl(settings = getReferenceOverlaySettings(), bounds = paddedGeoBounds(settings)) {
    if (!bounds) return '';
    const service = settings.source === 'topo' ? 'USGSTopo/MapServer' : 'USGSImageryOnly/MapServer';
    const bbox = [bounds.west, bounds.south, bounds.east, bounds.north].join(',');
    return `https://basemap.nationalmap.gov/arcgis/rest/services/${service}/export?bbox=${bbox}&bboxSR=4326&size=${settings.tilePixels},${settings.tilePixels}&imageSR=4326&format=png32&transparent=false&f=image`;
  }

  function overlayTileBounds(settings = getReferenceOverlaySettings()) {
    const bounds = paddedGeoBounds(settings);
    if (!bounds) return [];
    const cols = settings.tileColumns;
    const rows = settings.tileRows;
    const lonStep = (bounds.east - bounds.west) / cols;
    const latStep = (bounds.north - bounds.south) / rows;
    const tiles = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        tiles.push({
          col,
          row,
          cols,
          rows,
          bounds: {
            west: bounds.west + lonStep * col,
            east: bounds.west + lonStep * (col + 1),
            north: bounds.north - latStep * row,
            south: bounds.north - latStep * (row + 1)
          }
        });
      }
    }
    return tiles;
  }

  function ensureBackgroundOverlay() {
    const settings = getReferenceOverlaySettings();
    if (mapMode === 'game') return;
    const key = JSON.stringify(settings);
    if (!settings.visible || backgroundOverlay.key === key || backgroundOverlay.loading) return;
    const tiles = overlayTileBounds(settings);
    if (!tiles.length) return;
    backgroundOverlay.loading = true;
    backgroundOverlay.key = key;
    backgroundOverlay.tiles = [];
    let completed = 0;
    tiles.forEach((tile) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (backgroundOverlay.key !== key) return;
        backgroundOverlay.tiles.push({ ...tile, img });
        backgroundOverlay.img = img;
        completed += 1;
        if (completed >= tiles.length) backgroundOverlay.loading = false;
      };
      img.onerror = () => {
        if (backgroundOverlay.key !== key) return;
        completed += 1;
        if (completed >= tiles.length) backgroundOverlay.loading = false;
      };
      img.src = usgsOverlayUrl(settings, tile.bounds);
    });
  }

  function drawBackgroundOverlay() {
    if (mapMode === 'game') return false;
    const settings = getReferenceOverlaySettings();
    if (!settings.visible || (!backgroundOverlay.img && !backgroundOverlay.tiles.length)) return false;
    const rect = overlayWorldRect(settings);
    if (!rect) return false;
    ctx.save();
    ctx.globalAlpha = settings.opacity;
    if (backgroundOverlay.tiles.length) {
      backgroundOverlay.tiles.forEach((tile) => {
        const x = rect.x + rect.w * (tile.col / tile.cols);
        const y = rect.y + rect.h * (tile.row / tile.rows);
        const w = rect.w / tile.cols;
        const h = rect.h / tile.rows;
        ctx.drawImage(tile.img, x, y, w + 1, h + 1);
      });
    } else {
      ctx.drawImage(backgroundOverlay.img, rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
    return true;
  }

  function roadClearanceForRect(w, h) {
    return Math.max(w, h) * 0.52 + 48;
  }

  function collidesWithRoadRect(x, y, w, h) {
    const radius = Math.max(w, h) * 0.56;
    return town.roads.some((road) => {
      for (let i = 0; i < road.pts.length - 1; i += 1) {
        const [x1, y1] = road.pts[i];
        const [x2, y2] = road.pts[i + 1];
        if (distanceToSegment(x, y, x1, y1, x2, y2) <= road.w / 2 + radius + 16) return true;
      }
      return false;
    });
  }

  function overlapsExistingStatic(x, y, w, h, placed, pad = 36) {
    return placed.some((item) => Math.abs(item.x - x) < (item.w + w) / 2 + pad && Math.abs(item.y - y) < (item.h + h) / 2 + pad);
  }

  function placeStaticAlongRoads() {
    const segments = getRoadSegments(180).filter((segment) => homesAllowedOnRoad(segment.road));
    const placed = [];
    const addressCounts = new Map();
    buildings.splice(0, buildings.length);
    addresses.splice(0, addresses.length);

    segments.forEach((segment, segmentIdx) => {
      const slots = parcelSlotsForSegment(segment);
      slots.forEach((slot, slotIdx) => {
        const p = pointOnSegment(segment, slot.t, slot.side, segment.road.w / 2 + slot.offset + 42);
        const w = slot.kind === 'garage' ? 120 : 138;
        const h = slot.kind === 'garage' ? 92 : 104;
        if (p.x < 120 || p.y < 120 || p.x > town.width - 120 || p.y > town.height - 120) return;
        if (collidesWithRoadRect(p.x, p.y, w, h)) return;
        if (overlapsExistingStatic(p.x, p.y, w, h, placed, 42)) return;
        const roadName = readableRoadName(segment.road, segmentIdx);
        const count = addressCounts.get(roadName) || 0;
        addressCounts.set(roadName, count + 1);
        const number = streetNumberFor(segment.road, count, slot.side);
        const item = {
          sprite: slot.sprite,
          roof: slot.kind,
          x: Math.round(p.x),
          y: Math.round(p.y),
          w,
          h,
          angle: p.angle,
          health: 100,
          address: `${number} ${roadName}`
        };
        buildings.push(item);
        placed.push(item);
        const arrival = nearestDispatchRoadPoint(p.x, p.y);
        addresses.push({
          label: item.address,
          x: Math.round(p.x),
          y: Math.round(p.y),
          arrivalX: Math.round(arrival.x),
          arrivalY: Math.round(arrival.y),
          kind: 'house'
        });
      });
    });

    addCivicAndServiceAddresses();

    trees.splice(0, trees.length);
    const treeSprites = Array.from({ length: 96 }, (_, idx) => (idx % 3 === 1 ? 'pine' : 'oak'));
    treeSprites.forEach((sprite, idx) => {
      if (!segments.length) return;
      for (let attempt = 0; attempt < segments.length * 2; attempt += 1) {
        const segment = segments[(idx * 7 + attempt * 5 + 2) % segments.length];
        const side = ((idx + attempt) % 2) ? -1 : 1;
        const t = 0.12 + (((idx * 29 + attempt * 17) % 72) / 100);
        const p = pointOnSegment(segment, t, side, segment.road.w / 2 + 120 + ((idx % 3) * 46));
        if (p.x < 100 || p.y < 100 || p.x > town.width - 100 || p.y > town.height - 100) continue;
        if (collidesWithRoadRect(p.x, p.y, 102, 128)) continue;
        if (overlapsExistingStatic(p.x, p.y, 102, 128, placed, 18)) continue;
        trees.push([Math.round(p.x), Math.round(p.y), sprite]);
        placed.push({ x: p.x, y: p.y, w: 102, h: 128 });
        return;
      }
    });

  }

  function homesAllowedOnRoad(road) {
    if (!road?.name || isAlleyRoad(road) || road.kind === 'service') return false;
    if (/grant city|350 south|basket ball|john ryan/i.test(road.name)) return false;
    return /main|vine|rosewood|sampson|hinshaw|east|broad|plum|martindale|dewey|washington|madison|state road|lake|elliott|railroad/i.test(road.name);
  }

  function parcelSlotsForSegment(segment) {
    const [x1, y1] = segment.road.pts[segment.segmentIndex];
    const [x2, y2] = segment.road.pts[segment.segmentIndex + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const spacing = segment.road.kind === 'secondary' ? 430 : segment.road.kind === 'tertiary' ? 520 : 300;
    const count = clamp(Math.floor(len / spacing), len > 520 ? 1 : 0, 10);
    const slots = [];
    for (let i = 0; i < count; i += 1) {
      const t = (i + 1) / (count + 1);
      [-1, 1].forEach((side) => {
        const seed = Math.abs(Math.round(x1 + y1 + i * 37 + side * 19));
        slots.push({
          t: clamp(t + (((seed % 9) - 4) / 100), 0.12, 0.88),
          side,
          offset: 88 + (seed % 4) * 18,
          kind: ['ranch', 'brick_home', 'trailer', 'garage'][seed % 4],
          sprite: ['houseA', 'houseB', 'houseC', 'garage'][seed % 4]
        });
      });
    }
    return slots;
  }

  function streetNumberFor(road, count, side) {
    const base = /north|n |n\.|plum|broad|elliott/i.test(road.name || '') ? 100 : 200;
    return base + count * 6 + (side > 0 ? 1 : 2);
  }

  function addCivicAndServiceAddresses() {
    const pd = pointOnNamedRoad(/north main/i, 0.49, 1, 122) || { x: 9260, y: 8320 };
    addresses.unshift({ label: '100 North Main Street', x: Math.round(pd.x), y: Math.round(pd.y), arrivalX: Math.round(pd.x), arrivalY: Math.round(pd.y), kind: 'police' });
    const broad = pointOnNamedRoad(/east broad/i, 0.28, -1, 122);
    if (broad) addresses.unshift({ label: 'East Broad Street Station', x: Math.round(broad.x), y: Math.round(broad.y), arrivalX: Math.round(broad.x), arrivalY: Math.round(broad.y), kind: 'garage' });
    town.roads.forEach((road) => {
      if (road.kind !== 'service' || !road.name) return;
      const mid = pointOnNamedRoad(new RegExp(escapeRegExp(road.name), 'i'), 0.5, 0, 0);
      if (mid) addresses.push({ label: road.name, x: Math.round(mid.x), y: Math.round(mid.y), arrivalX: Math.round(mid.x), arrivalY: Math.round(mid.y), kind: 'service' });
    });
  }

  function pointOnNamedRoad(pattern, t = 0.5, side = 1, offset = 0) {
    const segment = getRoadSegments(1).find((candidate) => pattern.test(candidate.road.name || ''));
    return segment ? pointOnSegment(segment, t, side, offset) : null;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function readableRoadName(road, idx = 0) {
    const name = String(road?.name || '').trim();
    if (name && !isAlleyRoad(road)) return name;
    if (name && road?.kind === 'service') return name;
    return `Kennard Road ${idx + 1}`;
  }

  function isAlleyRoad(road) {
    return road?.kind === 'alley' || /alley/i.test(String(road?.name || ''));
  }

  function dispatchRoadAllowed(road) {
    if (!road) return false;
    if (isAlleyRoad(road)) return false;
    return Boolean(String(road.name || '').trim()) || road.kind === 'service';
  }

  function nearestDispatchRoadPoint(x, y) {
    let best = { x, y, d: Infinity, road: null };
    town.roads.forEach((r) => {
      if (!dispatchRoadAllowed(r)) return;
      for (let i = 0; i < r.pts.length - 1; i += 1) {
        const [x1, y1] = r.pts[i];
        const [x2, y2] = r.pts[i + 1];
        const projected = projectToSegmentPoint(x, y, x1, y1, x2, y2);
        if (projected.d < best.d) best = { ...projected, road: r };
      }
    });
    return best.road ? best : nearestRoadPoint(x, y);
  }

  function placePedestriansAlongSidewalks() {
    const colors = ['#ffdd55', '#9ed6ff', '#ff8b8b', '#b7f2a2', '#f5f5f5', '#ffc7f0'];
    const roles = ['civilian_blue', 'civilian_red', 'civilian_yellow', 'officer', 'ems', 'civilian_blue', 'dog'];
    const segments = getRoadSegments(220);
    pedestrians.splice(0, pedestrians.length);
    Array.from({ length: 28 }).forEach((_, idx) => {
      if (!segments.length) return;
      const segment = segments[(idx * 6 + 1) % segments.length];
      const side = idx % 2 ? 1 : -1;
      const p = pointOnSegment(segment, 0.12 + ((idx * 0.17) % 0.76), side, segment.road.w / 2 + 34 + ((idx % 3) * 18));
      pedestrians.push({ x: Math.round(p.x), y: Math.round(p.y), angle: p.angle, color: colors[idx % colors.length], role: roles[idx % roles.length] });
    });
  }

  function buildGameWorldDecor() {
    const fields = [];
    const yards = [];
    const fieldColors = ['#9fb971', '#b6bf82', '#8fb06c', '#c0b17b', '#789f68', '#a8b86f'];
    const cell = 1150;
    let idx = 0;
    for (let y = 120; y < town.height; y += cell) {
      for (let x = 120; x < town.width; x += cell) {
        const cx = x + cell / 2;
        const cy = y + cell / 2;
        if (roadAt(cx, cy, 180)) continue;
        const nearRoad = nearestRoadPoint(cx, cy);
        const roadDistance = dist(cx, cy, nearRoad.x, nearRoad.y);
        const color = fieldColors[idx % fieldColors.length];
        const w = cell * (0.78 + ((idx * 17) % 18) / 100);
        const h = cell * (0.72 + ((idx * 23) % 22) / 100);
        const angle = (((idx * 37) % 28) - 14) * Math.PI / 180;
        if (roadDistance < 540) {
          yards.push({ x: cx, y: cy, w, h, color: idx % 2 ? '#6fa45f' : '#7dad67', angle });
        } else {
          fields.push({ x: cx, y: cy, w, h, color, angle, rows: 7 + (idx % 7) });
        }
        idx += 1;
      }
    }
    return { fields, yards };
  }

  function drawGameWorldBackground() {
    if (!gameWorldDecor) gameWorldDecor = buildGameWorldDecor();
    drawGeneratedGround();
    drawFieldDecor(gameWorldDecor.fields);
    drawYardDecor(gameWorldDecor.yards);
    buildings.forEach(drawGameBuilding);
    trees.forEach(([x, y, sprite], idx) => drawGameTree(x, y, sprite, idx));
  }

  function drawGeneratedGround() {
    const tileSize = 256;
    const base = images.tile_lawn_striped;
    ctx.fillStyle = '#6f9a5d';
    ctx.fillRect(0, 0, town.width, town.height);
    if (!base?.complete || !base.naturalWidth) return;
    const pattern = ctx.createPattern(base, 'repeat');
    if (!pattern) return;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, town.width, town.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    for (let x = 0; x < town.width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, town.height);
      ctx.stroke();
    }
  }

  function drawFieldDecor(fields) {
    fields.forEach((field, idx) => {
      ctx.save();
      ctx.translate(field.x, field.y);
      ctx.rotate(field.angle);
      const tile = images[idx % 2 ? 'tile_field_green' : 'tile_field_plowed'];
      if (tile?.complete && tile.naturalWidth) {
        const pattern = ctx.createPattern(tile, 'repeat');
        ctx.fillStyle = pattern || field.color;
      } else {
        ctx.fillStyle = field.color;
      }
      ctx.fillRect(-field.w / 2, -field.h / 2, field.w, field.h);
      ctx.strokeStyle = idx % 2 ? 'rgba(72, 92, 54, 0.28)' : 'rgba(245, 235, 177, 0.26)';
      ctx.lineWidth = 10;
      const step = field.h / field.rows;
      for (let y = -field.h / 2 + step; y < field.h / 2; y += step) {
        ctx.beginPath();
        ctx.moveTo(-field.w / 2, y);
        ctx.lineTo(field.w / 2, y + Math.sin((idx + y) * 0.01) * 18);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawYardDecor(yards) {
    yards.forEach((yard, idx) => {
      ctx.save();
      ctx.translate(yard.x, yard.y);
      ctx.rotate(yard.angle);
      const tile = images[idx % 2 ? 'tile_lawn_dark' : 'tile_lawn_striped'];
      if (tile?.complete && tile.naturalWidth) {
        const pattern = ctx.createPattern(tile, 'repeat');
        ctx.fillStyle = pattern || yard.color;
      } else {
        ctx.fillStyle = yard.color;
      }
      ctx.fillRect(-yard.w / 2, -yard.h / 2, yard.w, yard.h);
      ctx.strokeStyle = 'rgba(43, 88, 46, 0.2)';
      ctx.lineWidth = 7;
      for (let x = -yard.w / 2 + 70; x < yard.w / 2; x += 160) {
        ctx.beginPath();
        ctx.moveTo(x, -yard.h / 2);
        ctx.lineTo(x + Math.sin(idx) * 12, yard.h / 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawGameBuilding(b) {
    const health = Number.isFinite(b.health) ? b.health : 100;
    const kind = b.roof || {
      houseA: 'ranch',
      houseB: 'brick_home',
      houseC: 'ranch',
      school: 'store',
      garage: 'garage',
      barn: 'barn'
    }[b.sprite] || 'ranch';
    const dir = direction4(b.angle || 0);
    const key = `roof_${kind}_${dir}`;
    const roofColors = {
      ranch: '#b8604e',
      brick_home: '#8f9ba4',
      store: '#b08d56',
      garage: '#76838b',
      barn: '#9e3e36',
      trailer: '#9aa9b3'
    };
    const roof = roofColors[kind] || '#9a6a4f';
    const img = images[key];
    if (img?.complete && img.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.96;
      ctx.translate(b.x, b.y);
      ctx.drawImage(img, -b.w * 0.72, -b.h * 0.72, b.w * 1.44, b.h * 1.44);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = 'rgba(21, 35, 28, 0.32)';
    ctx.fillRect(-b.w / 2 + 18, -b.h / 2 + 22, b.w, b.h);
    ctx.fillStyle = '#d4c6a3';
    ctx.fillRect(-b.w / 2, -b.h / 2 + 14, b.w, b.h - 14);
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(-b.w / 2 - 8, -b.h / 2 + 16);
    ctx.lineTo(0, -b.h / 2 - 26);
    ctx.lineTo(b.w / 2 + 8, -b.h / 2 + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.36)';
    ctx.fillRect(-b.w * 0.24, -b.h * 0.05, b.w * 0.18, b.h * 0.18);
    ctx.fillRect(b.w * 0.1, -b.h * 0.05, b.w * 0.18, b.h * 0.18);
    if (health < 70) {
      ctx.fillStyle = `rgba(58, 28, 20, ${clamp((100 - health) / 120, 0, 0.55)})`;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    }
    ctx.restore();
  }

  function drawGameTree(x, y, sprite, idx = 0) {
    const key = sprite === 'pine' ? 'tree_pine_tall' : (idx % 3 === 0 ? 'tree_maple' : 'tree_oak_dense');
    const img = images[key];
    if (img?.complete && img.naturalWidth) {
      const size = sprite === 'pine' ? 150 : 132 + (idx % 3) * 12;
      ctx.save();
      ctx.translate(x, y);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(19, 37, 25, 0.26)';
    ctx.beginPath();
    ctx.ellipse(18, 24, 42, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sprite === 'pine' ? '#27684f' : '#2f7b3d';
    ctx.beginPath();
    ctx.arc(0, 0, 42 + (idx % 3) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sprite === 'pine' ? '#3d8d63' : '#4f9a45';
    ctx.beginPath();
    ctx.arc(-16, -14, 25, 0, Math.PI * 2);
    ctx.arc(17, -10, 28, 0, Math.PI * 2);
    ctx.arc(4, 18, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function placePlayerOnRoad() {
    const start = pointOnNamedRoad(/north main/i, 0.025, 0, 0)
      || pointOnNamedRoad(/east broad/i, 0.28, 0, 0)
      || pointOnNamedRoad(/main/i, 0.5, 0, 0);
    if (!start) return;
    player.x = start.x;
    player.y = start.y;
    player.angle = start.angle;
    player.speed = 0;
    centerCameraOnPlayer();
  }

  function centerCameraOnPlayer() {
    const zoom = cameraZoom();
    const viewW = window.innerWidth / zoom;
    const viewH = window.innerHeight / zoom;
    camera.focusX = player.x;
    camera.focusY = player.y;
    camera.x = clamp(player.x - viewW / 2, 0, Math.max(0, town.width - viewW));
    camera.y = clamp(player.y - viewH / 2, 0, Math.max(0, town.height - viewH));
  }

  function resetTraffic() {
    const segments = getRoadSegments(260);
    const specs = [
      ['sedan', 1, 0.22, 154, 'clean'],
      ['hatchbackYellow', -1, 0.58, 220, 'speeding'],
      ['pickup', 1, 0.42, 128, 'clean'],
      ['suv', 1, 0.68, 240, 'reckless'],
      ['hatchback', -1, 0.36, 146, 'clean'],
      ['pickupDown', -1, 0.52, 210, 'suspended'],
      ['sedanDown', 1, 0.2, 230, 'contraband']
    ];
    traffic.splice(0, traffic.length, ...specs.map(([sprite, direction, t, speed, violationId], idx) => {
      if (!segments.length) return trafficCar(sprite, 0, 0, direction, t, speed, violationId, idx);
      const segment = segments[(idx * 5 + 2) % segments.length];
      return trafficCar(sprite, segment.roadIndex, segment.segmentIndex, direction, t, speed, violationId, idx);
    }));
  }

  function trafficCar(sprite, roadIndex, segmentIndex, direction, t, speed, violationId = 'clean', idx = 0) {
    const c = car(sprite, 0, 0, 0, speed);
    const safeRoadIndex = town.roads.length ? roadIndex % town.roads.length : 0;
    const road = town.roads[safeRoadIndex] || { pts: [[0, 0], [1, 0]] };
    c.route = {
      roadIndex: safeRoadIndex,
      segmentIndex: clamp(segmentIndex, 0, Math.max(0, road.pts.length - 2)),
      direction,
      t
    };
    c.violation = violationProfiles.find((profile) => profile.id === violationId) || violationProfiles[0];
    c.driver = driverProfiles[idx % driverProfiles.length];
    c.enemy = c.violation.severity >= 3;
    c.baseSpeed = speed;
    c.observedViolation = c.violation.probableCause;
    c.stopCompleted = false;
    c.stopPrompted = false;
    c.pursued = false;
    c.recklessPhase = idx * 0.7;
    placeTrafficOnLane(c);
    return c;
  }

  function placeTrafficOnLane(c) {
    const road = town.roads[c.route?.roadIndex];
    if (!road || !road.pts[c.route.segmentIndex + 1]) return;
    const laneFraction = c.pulledOver ? 0.39 : (c.enemy ? 0.18 : 0.24);
    const weave = c.violation?.id === 'reckless' && !c.pulledOver ? Math.sin(performance.now() / 260 + c.recklessPhase) * 0.08 : 0;
    const lane = lanePoint(road, c.route.segmentIndex, c.route.direction, c.route.t, laneFraction + weave);
    c.x = lane.x;
    c.y = lane.y;
    c.angle = lane.angle;
  }

  function lanePoint(road, segmentIndex, direction, t, laneFraction = 0.24) {
    const p1 = road.pts[segmentIndex];
    const p2 = road.pts[segmentIndex + 1];
    const start = direction >= 0 ? p1 : p2;
    const end = direction >= 0 ? p2 : p1;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const len = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;
    const laneShift = hasYellowCenterline(road) ? Math.min(70, road.w * laneFraction) : 0;
    return {
      x: start[0] + dx * t - uy * laneShift,
      y: start[1] + dy * t + ux * laneShift,
      angle: Math.atan2(dx, -dy),
      len
    };
  }

  function advanceTrafficRoute(c, dt) {
    const road = town.roads[c.route?.roadIndex];
    if (!road || road.pts.length < 2) return false;
    const current = lanePoint(road, c.route.segmentIndex, c.route.direction, c.route.t);
    c.route.t += (Math.max(0, c.speed) * dt) / current.len;
    while (c.route.t >= 1) {
      c.route.t -= 1;
      c.route.segmentIndex += c.route.direction;
      if (c.route.segmentIndex < 0 || c.route.segmentIndex >= road.pts.length - 1) {
        const endpoint = c.route.direction > 0 ? road.pts[road.pts.length - 1] : road.pts[0];
        if (!chooseNextTrafficSegment(c, endpoint)) respawnTrafficCar(c);
      }
    }
    return true;
  }

  function chooseNextTrafficSegment(c, endpoint) {
    const choices = [];
    town.roads.forEach((road, roadIndex) => {
      if (road.pts.length < 2) return;
      road.pts.forEach(([x, y], pointIndex) => {
        if (pointIndex !== 0 && pointIndex !== road.pts.length - 1) return;
        const d = dist(endpoint[0], endpoint[1], x, y);
        if (d > Math.max(160, (road.w || 120) * 0.9)) return;
        const segmentIndex = pointIndex === 0 ? 0 : road.pts.length - 2;
        const direction = pointIndex === 0 ? 1 : -1;
        const sameRoad = roadIndex === c.route.roadIndex;
        const wouldUTurn = sameRoad && segmentIndex === clamp(c.route.segmentIndex, 0, Math.max(0, road.pts.length - 2));
        if (wouldUTurn && choices.length) return;
        choices.push({ roadIndex, segmentIndex, direction, score: (sameRoad ? 2 : 0) + d / 200 });
      });
    });
    const filtered = choices.filter((choice) => !(choice.roadIndex === c.route.roadIndex && choice.direction === -c.route.direction));
    const pool = filtered.length ? filtered : choices;
    if (!pool.length) return false;
    pool.sort((a, b) => a.score - b.score);
    const choice = pool[Math.floor(Math.min(pool.length - 1, Math.random() * Math.min(3, pool.length)))];
    c.route.roadIndex = choice.roadIndex;
    c.route.segmentIndex = choice.segmentIndex;
    c.route.direction = choice.direction;
    c.route.t = 0;
    return true;
  }

  function respawnTrafficCar(c) {
    const segments = getRoadSegments(320).filter((segment) => dispatchRoadAllowed(segment.road));
    if (!segments.length) return;
    const segment = segments[Math.floor(Math.random() * segments.length)];
    c.route.roadIndex = segment.roadIndex;
    c.route.segmentIndex = segment.segmentIndex;
    c.route.direction = Math.random() < 0.5 ? 1 : -1;
    c.route.t = 0;
    c.pursued = false;
    c.pulledOver = false;
    c.stopPrompted = false;
    placeTrafficOnLane(c);
  }

  function dist(a, b, c, d) {
    return Math.hypot(a - c, b - d);
  }

  function distanceToSegment(x, y, x1, y1, x2, y2) {
    return projectToSegmentPoint(x, y, x1, y1, x2, y2).d;
  }

  function projectToSegmentPoint(x, y, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy;
    const t = len2 ? clamp(((x - x1) * vx + (y - y1) * vy) / len2, 0, 1) : 0;
    const px = x1 + vx * t;
    const py = y1 + vy * t;
    return { x: px, y: py, d: dist(x, y, px, py) };
  }

  function roadAt(x, y, pad = 0) {
    return town.roads.some((r) => {
      const radius = r.w / 2 + pad + getRoadShoulder(r);
      if (isNearRoadNode(x, y, r, radius + intersectionForgiveness(r))) return true;
      for (let i = 0; i < r.pts.length - 1; i += 1) {
        const [x1, y1] = r.pts[i];
        const [x2, y2] = r.pts[i + 1];
        const vx = x2 - x1;
        const vy = y2 - y1;
        const len2 = vx * vx + vy * vy;
        const t = len2 ? clamp(((x - x1) * vx + (y - y1) * vy) / len2, 0, 1) : 0;
        const px = x1 + vx * t;
        const py = y1 + vy * t;
        if (dist(x, y, px, py) <= radius) return true;
      }
      return false;
    });
  }

  function getRoadShoulder(road) {
    if (isNarrowRoad(road)) return 20;
    if (road.kind === 'residential') return 18;
    return 10;
  }

  function intersectionForgiveness(road) {
    if (isNarrowRoad(road)) return 42;
    if (road.kind === 'residential') return 30;
    return 22;
  }

  function isNearRoadNode(x, y, road, radius) {
    return road.pts.some(([px, py]) => dist(x, y, px, py) <= radius);
  }

  function isNarrowRoad(road) {
    return road?.kind === 'alley' || road?.kind === 'service' || Number(road?.w || 0) < 92;
  }

  function hasYellowCenterline(road) {
    return !isNarrowRoad(road);
  }

  function isHardOffRoad(x, y) {
    return !town.roads.some((r) => {
      for (let i = 0; i < r.pts.length - 1; i += 1) {
        const [x1, y1] = r.pts[i];
        const [x2, y2] = r.pts[i + 1];
        const vx = x2 - x1;
        const vy = y2 - y1;
        const len2 = vx * vx + vy * vy;
        const t = len2 ? clamp(((x - x1) * vx + (y - y1) * vy) / len2, 0, 1) : 0;
        const px = x1 + vx * t;
        const py = y1 + vy * t;
        const forgive = (r.kind === 'residential' ? 86 : 66) + (isNarrowRoad(r) ? 34 : 0);
        if (isNearRoadNode(x, y, r, r.w / 2 + forgive + 30)) return true;
        if (dist(x, y, px, py) <= r.w / 2 + forgive) return true;
      }
      return false;
    });
  }

  function nearestRoadPoint(x, y) {
    let best = { x, y, d: Infinity };
    town.roads.forEach((r) => {
      for (let i = 0; i < r.pts.length - 1; i += 1) {
        const [x1, y1] = r.pts[i];
        const [x2, y2] = r.pts[i + 1];
        const vx = x2 - x1;
        const vy = y2 - y1;
        const len2 = vx * vx + vy * vy;
        const t = len2 ? clamp(((x - x1) * vx + (y - y1) * vy) / len2, 0, 1) : 0;
        const px = x1 + vx * t;
        const py = y1 + vy * t;
        const d = dist(x, y, px, py);
        if (d < best.d) best = { x: px, y: py, d, road: r, roadIndex: town.roads.indexOf(r), segmentIndex: i };
      }
    });
    return best;
  }

  function drawSprite(sprite, x, y, w, h, angle = 0, alpha = 1) {
    const img = images[sprite];
    ctx.save();
    ctx.globalAlpha = alpha;
    const p = worldToScreenPoint(x, y);
    ctx.translate(p.x, p.y);
    ctx.rotate(screenAngle(angle));
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = '#84959f';
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  function drawWorldSprite(sprite, x, y, w, h, angle = 0, alpha = 1) {
    const img = images[sprite];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = '#84959f';
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  function drawVehicle(sprite, x, y, w, h, angle = 0, alpha = 1) {
    const generatedKey = generatedVehicleKey(sprite, angle);
    if (generatedKey) {
      const p = worldToScreenPoint(x, y);
      drawGeneratedScreenImage(generatedKey, p.x, p.y, Math.max(w, h) * 1.25, Math.max(w, h) * 1.25, 0, alpha);
      return;
    }
    const spec = sprites[sprite] || {};
    const sourceOffset = spec.facing === 'down' ? Math.PI : 0;
    drawSprite(sprite, x, y, w, h, angle + sourceOffset, alpha);
  }

  function generatedVehicleKey(sprite, angle) {
    const base = {
      sedan: 'sedan_blue',
      sedanDown: 'sedan_red',
      hatchback: 'sedan_blue',
      pickup: 'pickup_green',
      pickupDown: 'pickup_green',
      suv: 'suv_gray'
    }[sprite];
    if (!base) return '';
    return `vehicle_${base}_${direction8(angle)}`;
  }

  function drawGeneratedImage(key, x, y, w, h, angle = 0, alpha = 1) {
    const img = images[key];
    if (!img?.complete || !img.naturalWidth) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  function drawGeneratedScreenImage(key, x, y, w, h, angle = 0, alpha = 1) {
    const img = images[key];
    if (!img?.complete || !img.naturalWidth) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  function direction8(angle) {
    const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.round(normalized / (Math.PI / 4)) % 8;
    return ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'][idx];
  }

  function direction4(angle) {
    const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.round(normalized / (Math.PI / 2)) % 4;
    return ['n', 'e', 's', 'w'][idx];
  }

  function drawPoliceCar() {
    const img = images.policeInterceptor;
    if (img?.complete && img.naturalWidth) {
      drawVehicle('policeInterceptor', player.x, player.y, 46, 70, player.angle);
      const p = worldToScreenPoint(player.x, player.y);
      drawLightbar(p.x, p.y, screenAngle(player.angle));
      return;
    }
    const p = worldToScreenPoint(player.x, player.y);
    const x = p.x;
    const y = p.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(screenAngle(player.angle));
    ctx.fillStyle = '#10161b';
    roundRect(-19, -34, 38, 68, 8);
    ctx.fill();
    ctx.fillStyle = '#f7fbff';
    ctx.fillRect(-15, -24, 30, 18);
    ctx.fillRect(-15, 8, 30, 18);
    ctx.fillStyle = '#1b66d8';
    ctx.fillRect(-17, -5, 15, 10);
    ctx.fillStyle = '#d72828';
    ctx.fillRect(2, -5, 15, 10);
    ctx.fillStyle = '#d8e8f2';
    ctx.font = '800 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 2);
    ctx.restore();
    drawLightbar(x, y, player.angle);
  }

  function drawLightbar(x, y, angle) {
    if (!policeLights) return;
    const pulse = Math.floor(performance.now() / 120) % 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = pulse ? '#2d8dff' : '#ff3333';
    ctx.beginPath();
    ctx.arc(pulse ? -16 : 16, -6, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#2d8dff';
    ctx.fillRect(-12, -8, 10, 6);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(2, -8, 10, 6);
    ctx.restore();
  }

  function drawStickman(person) {
    if (person.role === 'dog') {
      const key = `animal_dog_${direction4(person.angle || 0)}`;
      if (drawGeneratedImage(key, person.x, person.y, 76, 76, 0, 0.98)) return;
    }
    const palette = ['civilian_blue', 'civilian_red', 'civilian_yellow', 'officer', 'ems'];
    const base = person.role || palette[Math.abs(Math.round(person.x + person.y)) % palette.length];
    const key = `person_${base}_${direction4(person.angle || 0)}`;
    if (drawGeneratedImage(key, person.x, person.y, 84, 84, 0, 0.98)) return;
    ctx.save();
    ctx.translate(person.x, person.y);
    ctx.rotate(person.angle || 0);
    ctx.strokeStyle = '#07100d';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -13, 6, 0, Math.PI * 2);
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 14);
    ctx.moveTo(-10, 2);
    ctx.lineTo(10, 2);
    ctx.moveTo(0, 14);
    ctx.lineTo(-8, 26);
    ctx.moveTo(0, 14);
    ctx.lineTo(8, 26);
    ctx.stroke();
    ctx.strokeStyle = person.color || '#f8fbff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -13, 6, 0, Math.PI * 2);
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 14);
    ctx.moveTo(-10, 2);
    ctx.lineTo(10, 2);
    ctx.moveTo(0, 14);
    ctx.lineTo(-8, 26);
    ctx.moveTo(0, 14);
    ctx.lineTo(8, 26);
    ctx.stroke();
    ctx.restore();
  }

  function getVehicleSize(sprite) {
    if (sprite.includes('pickup')) return { w: 50, h: 78 };
    if (sprite === 'suv') return { w: 48, h: 72 };
    if (sprite.includes('hatchback')) return { w: 44, h: 64 };
    return { w: 46, h: 68 };
  }

  function worldToScreenX(x) {
    return (x - camera.x) * cameraZoom();
  }

  function worldToScreenY(y) {
    return (y - camera.y) * cameraZoom();
  }

  function worldToScreenPoint(x, y) {
    return { x: worldToScreenX(x), y: worldToScreenY(y) };
  }

  function cameraZoom() {
    return CAMERA_ZOOMS[cameraZoomIndex] || CAMERA_ZOOMS[0];
  }

  function screenAngle(angle) {
    return angle;
  }

  function applyWorldTransform() {
    const zoom = cameraZoom();
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);
  }


  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawMap() {
    ctx.fillStyle = '#18351f';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.save();
    applyWorldTransform();
    let hasBackground = false;
    let drewGameBackground = false;
    if (mapMode === 'game') {
      drawGameWorldBackground();
      drewGameBackground = true;
    } else {
      ctx.fillStyle = '#204f2a';
      ctx.fillRect(0, 0, town.width, town.height);
      ensureBackgroundOverlay();
      hasBackground = drawBackgroundOverlay();
      if (!hasBackground) {
        drawGameWorldBackground();
        drewGameBackground = true;
      }
    }

    ctx.strokeStyle = '#2f3338';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawRoadPass(town.roads, (r) => r.w, mapMode === 'game' ? '#20262a' : '#2f3338');
    drawRoadPass(town.roads, (r) => Math.max(4, r.w - 18), mapMode === 'game' ? '#43494f' : '#3e464d');
    town.roads.forEach((r) => {
      if (!hasYellowCenterline(r)) return;
      ctx.setLineDash([26, 26]);
      ctx.strokeStyle = 'rgba(246, 222, 116, 0.5)';
      ctx.lineWidth = 3;
      drawRoadPath(r);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    if (!hasBackground && !drewGameBackground && mapMode !== 'game') buildings.forEach((b) => {
      const health = Number.isFinite(b.health) ? b.health : 100;
      drawWorldSprite(b.sprite, b.x, b.y, b.w, b.h, 0, 0.72 + (health / 100) * 0.28);
      if (health < 70) {
        ctx.fillStyle = `rgba(45, 20, 16, ${clamp((100 - health) / 120, 0, 0.55)})`;
        ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      }
    });
    if (!hasBackground && !drewGameBackground && mapMode !== 'game') trees.forEach(([x, y, sprite]) => drawWorldSprite(sprite, x, y, 102, 128, 0, 0.9));
    pedestrians.forEach(drawStickman);

    addresses.forEach((a) => {
      const objective = getActiveObjective();
      const isObjective = objective && objective.label === a.label;
      ctx.fillStyle = isObjective ? '#ffdd55' : 'rgba(255,255,255,0.58)';
      ctx.beginPath();
      ctx.arc(a.x, a.y, isObjective ? 16 : 7, 0, Math.PI * 2);
      ctx.fill();
      if (isObjective) {
        ctx.strokeStyle = '#ff4b4b';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 221, 85, 0.22)';
        ctx.beginPath();
        ctx.arc(objective.x, objective.y, objective.arrivalRadius || 165, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 221, 85, 0.66)';
        ctx.lineWidth = 5;
        ctx.stroke();
      }
    });
    const objective = getActiveObjective();
    if (objective && !addresses.some((a) => objective.label === a.label)) {
      ctx.fillStyle = '#ffdd55';
      ctx.beginPath();
      ctx.arc(objective.displayX ?? objective.x, objective.displayY ?? objective.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff4b4b';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawRoadPass(roads, widthForRoad, color) {
    ctx.strokeStyle = color;
    roads.forEach((road) => {
      ctx.lineWidth = widthForRoad(road);
      drawRoadPath(road);
      ctx.stroke();
    });
  }

  function drawRoadPath(road) {
    ctx.beginPath();
    road.pts.forEach(([x, y], idx) => idx ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  }

  function drawRoadConnections(outer, inner) {
    const nodes = [];
    town.roads.forEach((road) => {
      road.pts.forEach(([x, y]) => nodes.push({ x, y, w: road.w || 120 }));
    });
    nodes.forEach((node, idx) => {
      const group = [node];
      for (let i = idx + 1; i < nodes.length; i += 1) {
        const other = nodes[i];
        if (Math.hypot(node.x - other.x, node.y - other.y) <= Math.max(node.w, other.w) * 0.62 + 36) group.push(other);
      }
      if (group.length < 2) return;
      const x = group.reduce((sum, item) => sum + item.x, 0) / group.length;
      const y = group.reduce((sum, item) => sum + item.y, 0) / group.length;
      const w = Math.max(...group.map((item) => item.w));
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(4, w / 2 - 9), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawStopSigns() {
    stopSigns.forEach((sign) => {
      ctx.save();
      ctx.translate(sign.x, sign.y);
      ctx.rotate(sign.angle || 0);
      ctx.fillStyle = '#d91e2b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      const radius = 23;
      for (let i = 0; i < 8; i += 1) {
        const a = Math.PI / 8 + i * Math.PI / 4;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STOP', 0, 1);
      ctx.restore();
    });
  }

  function drawLabels() {
    ctx.save();
    applyWorldTransform();
    if (town.name) {
      ctx.font = '700 24px Arial';
      ctx.fillStyle = 'rgba(245,252,255,0.8)';
      ctx.fillText(town.name, 80, 90);
    }
    town.roads.forEach((r) => {
      if (!shouldDrawRoadLabel(r)) return;
      const mid = Math.floor((r.pts.length - 1) / 2);
      const [x1, y1] = r.pts[mid];
      const [x2, y2] = r.pts[Math.min(r.pts.length - 1, mid + 1)];
      const x = (x1 + x2) / 2;
      const y = (y1 + y2) / 2;
      const label = streetLabel(r);
      const fontSize = r.kind === 'secondary' || r.kind === 'tertiary' || r.w >= 160 ? 28 : 22;
      ctx.save();
      ctx.translate(x, y);
      let labelAngle = Math.atan2(y2 - y1, x2 - x1);
      if (labelAngle > Math.PI / 2 || labelAngle < -Math.PI / 2) labelAngle += Math.PI;
      ctx.rotate(labelAngle);
      ctx.font = `800 ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const width = ctx.measureText(label).width + 28;
      const boxY = -r.w / 2 - fontSize * 2.25;
      ctx.fillStyle = 'rgba(8, 13, 17, 0.78)';
      roundRect(-width / 2, boxY - fontSize * 0.62, width, fontSize * 1.25, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#f4fbff';
      ctx.fillText(label, 0, boxY);
      ctx.restore();
    });
    ctx.restore();
  }

  function shouldDrawRoadLabel(road) {
    if (!road?.name || isAlleyRoad(road)) return false;
    return ['secondary', 'tertiary', 'residential', 'service'].includes(road.kind) && road.w >= 88;
  }

  function streetLabel(road) {
    return String(road.name || '').replace(/\s*\/\s*/g, ' / ');
  }

  function drawNavigation() {
    if (!activeCall) return;
    const target = getActiveObjective();
    if (!target) return;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const angle = Math.atan2(dy, dx);
    const cx = window.innerWidth - 86;
    const cy = window.innerHeight - 86;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffdd55';
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(-18, -16);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-18, 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f8fbff';
    ctx.font = '800 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(dist(player.x, player.y, target.x, target.y))} ft`, cx, cy + 48);
  }

  function updatePlayer(dt) {
    const accel = 760;
    const brake = 920;
    const turnRate = 3.25;
    const forward = keys.has('arrowup') || keys.has('w') || touchDrive.has('up');
    const reverse = keys.has('arrowdown') || keys.has('s') || touchDrive.has('down');
    const left = keys.has('arrowleft') || keys.has('a') || touchDrive.has('left');
    const right = keys.has('arrowright') || keys.has('d') || touchDrive.has('right');
    const handbrake = keys.has(' ');

    if (forward) player.speed += accel * dt;
    if (reverse) player.speed -= brake * dt;
    if (!forward && !reverse) player.speed *= handbrake ? 0.9 : 0.986;
    if (handbrake) player.speed *= 0.965;
    const maxForward = policeLights ? player.maxSpeed * 1.28 : player.maxSpeed;
    player.speed = clamp(player.speed, -210, maxForward);

    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    const steerScale = clamp(Math.abs(player.speed) / 260, 0.32, 1);
    const slideBoost = handbrake ? 1.45 : 1;
    player.angle += steer * turnRate * steerScale * slideBoost * dt * (player.speed < 0 ? -1 : 1);

    const oldX = player.x;
    const oldY = player.y;
    const oldSpeed = player.speed;
    player.x += Math.sin(player.angle) * player.speed * dt;
    player.y -= Math.cos(player.angle) * player.speed * dt;
    player.x = clamp(player.x, 50, town.width - 50);
    player.y = clamp(player.y, 50, town.height - 50);

    const noseX = player.x + Math.sin(player.angle) * 34;
    const noseY = player.y - Math.cos(player.angle) * 34;
    const tailX = player.x - Math.sin(player.angle) * 28;
    const tailY = player.y + Math.cos(player.angle) * 28;
    if (!roadAt(player.x, player.y, 8) && !roadAt(noseX, noseY, 18) && !roadAt(tailX, tailY, 10)) {
      const n = nearestRoadPoint(player.x, player.y);
      const hardOffRoad = isHardOffRoad(player.x, player.y);
      const pull = hardOffRoad ? 0.14 : 0.055;
      player.x += (n.x - player.x) * pull;
      player.y += (n.y - player.y) * pull;
      player.speed *= hardOffRoad ? 0.9 : 0.97;
      if (hardOffRoad && Math.abs(oldSpeed) > 90) damagePlayer((Math.abs(oldSpeed) / 520) * 18 * dt, 'Off road damage.');
      if (!roadAt(player.x, player.y, hardOffRoad ? 58 : 24) && !roadAt(noseX, noseY, hardOffRoad ? 62 : 30)) {
        player.x = oldX;
        player.y = oldY;
        player.speed *= hardOffRoad ? -0.18 : 0.62;
        if (hardOffRoad) damagePlayer((Math.abs(oldSpeed) / 520) * 8, 'Road edge impact.');
      }
    }
  }

  function updateTraffic(dt) {
    traffic.forEach((c) => {
      c.damageCooldown = Math.max(0, c.damageCooldown - dt);
      if (c.spinTimer > 0) {
        c.spinTimer -= dt;
        c.angle += c.spinDir * 8.5 * dt;
        c.x += Math.sin(c.angle) * c.speed * dt;
        c.y -= Math.cos(c.angle) * c.speed * dt;
        c.speed *= 0.985;
        return;
      }
      if (!c.route) return;
      const sirenDistance = dist(player.x, player.y, c.x, c.y);
      if (policeLights && sirenDistance < 680) c.pursued = true;
      c.pulledOver = c.pursued && sirenDistance < 760;
      const targetSpeed = c.pulledOver ? 0 : c.baseSpeed;
      c.speed += (targetSpeed - c.speed) * (c.pulledOver ? 0.1 : 0.025);
      if (c.pulledOver && !c.stopPrompted && Math.abs(c.speed) < 18 && sirenDistance < 360) {
        c.stopPrompted = true;
        setStatus('Vehicle stopped. Press E to conduct the traffic stop.', 3.5);
      }
      if (advanceTrafficRoute(c, dt)) {
        placeTrafficOnLane(c);
      }
    });
  }

  function updateCollisions(dt) {
    player.damageCooldown = Math.max(0, player.damageCooldown - dt);

    traffic.forEach((c) => {
      if ((c.health || 0) <= 0) return;
      const pr = 26;
      const cr = getVehicleSize(c.sprite).h * 0.34;
      const d = dist(player.x, player.y, c.x, c.y);
      if (d > pr + cr) return;
      const impact = clamp((Math.abs(player.speed) + Math.abs(c.speed)) / 34, 3, 28);
      const pit = policeLights && c.enemy && Math.abs(player.speed) > 170 && impact > 9;
      damagePlayer(pit ? impact * 0.35 : impact, pit ? 'PIT contact.' : 'Vehicle collision.');
      damageTraffic(c, impact * (pit ? 2.4 : 0.85));
      const nx = d ? (player.x - c.x) / d : Math.sin(player.angle);
      const ny = d ? (player.y - c.y) / d : -Math.cos(player.angle);
      player.x += nx * 18;
      player.y += ny * 18;
      c.x -= nx * 10;
      c.y -= ny * 10;
      player.speed *= -0.34;
      c.speed *= 0.42;
      if (pit) {
        c.route = null;
        c.spinTimer = 1.15;
        c.spinDir = Math.random() < 0.5 ? -1 : 1;
        statusLine.textContent = c.health <= 0 ? 'Suspect vehicle disabled.' : 'Good PIT. Stay with them.';
      }
    });

    buildings.forEach((b) => {
      if (circleRect(player.x, player.y, 24, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h)) {
        const impact = clamp(Math.abs(player.speed) / 26, 4, 32);
        damagePlayer(impact, 'Building collision.');
        b.health = clamp((Number.isFinite(b.health) ? b.health : 100) - impact * 0.45, 0, 100);
        const n = nearestRoadPoint(player.x, player.y);
        player.x += (n.x - player.x) * 0.42;
        player.y += (n.y - player.y) * 0.42;
        player.speed *= -0.38;
      }
    });
  }

  function circleRect(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    return dist(cx, cy, closestX, closestY) <= radius;
  }

  function damagePlayer(amount, message) {
    if (player.damageCooldown > 0 && amount > 1) return;
    player.health = clamp(player.health - amount, 0, 100);
    player.damageCooldown = 0.18;
    if (message && amount > 1.2) statusLine.textContent = `${message} Vehicle ${Math.round(player.health)}%.`;
    if (player.health <= 0) {
      player.health = 100;
      player.speed = 0;
      const n = nearestRoadPoint(player.x, player.y);
      player.x = n.x;
      player.y = n.y;
      statusLine.textContent = 'Vehicle disabled. Tow reset complete.';
    }
  }

  function damageTraffic(carState, amount) {
    if (carState.damageCooldown > 0) return;
    carState.health = clamp((Number.isFinite(carState.health) ? carState.health : 100) - amount, 0, 100);
    carState.damageCooldown = 0.3;
    if (carState.health <= 0) carState.speed = 0;
  }

  function updateHealthHud() {
    const health = Math.round(player.health);
    if (healthFill) {
      healthFill.style.width = `${health}%`;
      healthFill.style.background = health > 60 ? '#41d17d' : (health > 30 ? '#ffe071' : '#ff5c5c');
    }
    if (healthText) healthText.textContent = `${health}%`;
  }

  function updateDispatch(dt) {
    if (!pendingCall && !activeCall) {
      callTimer -= dt;
      if (callTimer <= 0) createPendingCall();
    }

    if (pendingCall) {
      pendingCall.expires -= dt;
      dispatchTimer.textContent = `${Math.max(0, Math.ceil(pendingCall.expires))}s`;
      if (pendingCall.expires <= 0) declineCall();
    }

    if (activeCall) {
      if (activeCall.kind === 'suspiciousVehicle' && activeCall.phase === 'hunt') {
        const suspect = activeCall.suspectCar;
        if (suspect) {
          activeCall.objectives[0] = objectiveForVehicle(suspect, `${activeCall.vehicleDescription} from ${activeCall.target.label}`);
          const remainingToVehicle = dist(player.x, player.y, suspect.x, suspect.y);
          if (policeLights && remainingToVehicle < 680) suspect.pursued = true;
          if (remainingToVehicle < 360 && policeLights && Math.abs(suspect.speed) < 45 && !activeInteraction) {
            startTrafficStop(suspect);
            setStatus('Suspicious vehicle stopped. Conduct the contact.', 3);
          } else if (statusHold <= 0) {
            statusLine.textContent = `Locate ${activeCall.vehicleDescription}. Last seen near ${activeCall.target.label}.`;
          }
        }
        return;
      }
      const objective = getActiveObjective();
      const remaining = objective ? dist(player.x, player.y, objective.x, objective.y) : Infinity;
      const arrivalRadius = objective?.arrivalRadius || 165;
      if (statusHold <= 0) statusLine.textContent = objective?.label ? `Respond to ${objective.label}` : `Mission objective ${activeCall.objectiveIndex + 1}`;
      if (remaining < arrivalRadius) {
        if (activeCall.kind === 'suspiciousVehicle' && activeCall.phase !== 'hunt') {
          launchSuspiciousVehicleCall(activeCall);
          return;
        }
        activeCall.objectiveIndex += 1;
        if (activeCall.objectiveIndex < activeCall.objectives.length) {
          dispatchBody.textContent = `Continue to objective ${activeCall.objectiveIndex + 1} of ${activeCall.objectives.length}.`;
        } else {
          callsCleared += 1;
          callsClearedEl.textContent = String(callsCleared);
          setStatus('Scene secured. Mission complete.', 3);
          startSceneCase(activeCall);
          activeCall = null;
          town.roads = buildTownCoreRoads();
          callTimer = 6 + Math.random() * 8;
          hideDispatch();
        }
      }
    } else if (!pendingCall) {
      if (statusHold <= 0) statusLine.textContent = 'Free roam patrol. Awaiting dispatch.';
    }
  }

  function createPendingCall() {
    const pool = getDispatchPool();
    const template = pool[Math.floor(Math.random() * pool.length)];
    const targetPool = template.kind === 'suspiciousVehicle'
      ? addresses.filter((address) => address.kind === 'house')
      : addresses;
    const target = template.target || targetPool[Math.floor(Math.random() * targetPool.length)] || addresses[0] || { label: 'the marked address', x: player.x, y: player.y };
    const vehicleDescription = randomVehicleDescription();
    const objectives = template.objectives?.length ? template.objectives : [objectiveForAddress(target)];
    pendingCall = {
      ...template,
      target,
      vehicleDescription,
      objectives,
      objectiveIndex: 0,
      expires: 16
    };
    dispatchPanel.classList.add('show');
    dispatchTitle.textContent = template.title;
    dispatchBody.textContent = String(template.body || template.dispatch || 'Proceed to the marked location.')
      .replace('{address}', target.label || 'the marked address')
      .replace('{vehicle}', vehicleDescription);
  }

  function objectiveForAddress(target) {
    const arrivalX = Number(target.arrivalX ?? target.x);
    const arrivalY = Number(target.arrivalY ?? target.y);
    return {
      x: arrivalX,
      y: arrivalY,
      displayX: Number(target.x ?? arrivalX),
      displayY: Number(target.y ?? arrivalY),
      label: target.label,
      arrivalRadius: target.kind === 'house' ? 190 : 150
    };
  }

  function objectiveForVehicle(vehicle, label) {
    return {
      x: vehicle.x,
      y: vehicle.y,
      displayX: vehicle.x,
      displayY: vehicle.y,
      label,
      arrivalRadius: 260
    };
  }

  function randomVehicleDescription() {
    const choices = ['yellow hatchback', 'blue sedan', 'green pickup', 'gray SUV', 'red sedan'];
    return choices[suspectVehicleCounter % choices.length];
  }

  function vehicleSpriteForDescription(description) {
    if (/yellow/i.test(description)) return 'hatchbackYellow';
    if (/pickup/i.test(description)) return 'pickup';
    if (/suv/i.test(description)) return 'suv';
    if (/red/i.test(description)) return 'sedanDown';
    return 'sedan';
  }

  function launchSuspiciousVehicleCall(call) {
    suspectVehicleCounter += 1;
    const arrival = nearestDispatchRoadPoint(call.target.arrivalX ?? call.target.x, call.target.arrivalY ?? call.target.y);
    const segment = nearestRoadSegmentForPoint(arrival.x, arrival.y) || getRoadSegments(260)[0];
    const sprite = vehicleSpriteForDescription(call.vehicleDescription);
    const suspect = trafficCar(sprite, segment?.roadIndex || 0, segment?.segmentIndex || 0, Math.random() < 0.5 ? 1 : -1, 0.35, 238, 'reckless', suspectVehicleCounter + 10);
    suspect.x = arrival.x;
    suspect.y = arrival.y;
    suspect.violation = violationProfiles.find((profile) => profile.id === 'reckless') || suspect.violation;
    suspect.driver = driverProfiles[(suspectVehicleCounter + 2) % driverProfiles.length];
    suspect.observedViolation = true;
    suspect.caseVehicle = true;
    suspect.pursued = false;
    traffic.push(suspect);
    call.suspectCar = suspect;
    call.phase = 'hunt';
    call.objectives = [objectiveForVehicle(suspect, call.vehicleDescription)];
    call.objectiveIndex = 0;
    dispatchTitle.textContent = 'Suspicious Vehicle';
    dispatchBody.textContent = `Caller at ${call.target.label} described a ${call.vehicleDescription}. Find it, observe the driving, and stop it if you have cause.`;
    setStatus(`Look for a ${call.vehicleDescription} near ${call.target.label}.`, 4);
  }

  function nearestRoadSegmentForPoint(x, y) {
    let best = null;
    getRoadSegments(1).forEach((segment) => {
      const projected = projectToSegmentPoint(x, y, segment.x1, segment.y1, segment.x2, segment.y2);
      if (!best || projected.d < best.d) best = { ...segment, d: projected.d };
    });
    return best;
  }

  function sceneProfileForCall(call) {
    const text = `${call?.title || ''} ${call?.body || ''}`;
    return sceneCaseProfiles.find((profile) => profile.match.test(text)) || {
      title: call?.title || 'Service Call',
      observations: ['Scene is calm on arrival.', 'No immediate hazard is visible.', 'A reporting party is waiting nearby.'],
      actions: {
        caller: 'Reporting party explains what changed and who may need help.',
        victim: 'Check for injuries, fear, confusion, and whether EMS is needed.',
        ems: 'EMS should be requested if anyone reports injury, illness, or unsafe condition.',
        scene: 'Park safely, keep the road clear, and document names, location, and observations.'
      },
      result: 'Handle the scene by identifying people, safety risks, medical needs, and the correct report or referral.'
    };
  }

  function startSceneCase(call) {
    const profile = sceneProfileForCall(call);
    activeInteraction = {
      type: 'scene',
      profile,
      target: call?.target,
      notes: [`Dispatch notes: ${call?.body || call?.dispatch || 'Proceed to the marked location.'}`],
      stage: 'questions'
    };
    renderTrainingInteraction();
  }

  function askSceneQuestion(key) {
    if (!activeInteraction) return;
    const response = activeInteraction.profile.actions?.[key];
    if (response) activeInteraction.notes.push(response);
    renderTrainingInteraction();
  }

  function finishSceneCase() {
    if (!activeInteraction) return;
    activeInteraction.notes.push(activeInteraction.profile.result);
    activeInteraction.stage = 'complete';
    setStatus('Case file reviewed.', 2.5);
    renderTrainingInteraction();
  }

  function nearestStoppedTraffic() {
    let best = null;
    traffic.forEach((c) => {
      if (c.stopCompleted) return;
      const d = dist(player.x, player.y, c.x, c.y);
      if (d > 390 || Math.abs(c.speed) > 38) return;
      if (!best || d < best.d) best = { car: c, d };
    });
    return best?.car || null;
  }

  function interact() {
    if (activeInteraction) return;
    const stopped = nearestStoppedTraffic();
    if (policeLights && stopped) {
      startTrafficStop(stopped);
      return;
    }
    if (pendingCall) {
      acceptCall();
      return;
    }
    setStatus(policeLights ? 'No stopped vehicle close enough to contact.' : 'Activate lights and stop a vehicle before making contact.', 2.5);
  }

  function startTrafficStop(carState) {
    carState.pulledOver = true;
    carState.pursued = true;
    carState.speed = 0;
    const profile = carState.violation || violationProfiles[0];
    activeInteraction = {
      type: 'traffic',
      car: carState,
      profile,
      driver: carState.driver || driverProfiles[0],
      asked: new Set(),
      notes: [],
      stage: 'questions'
    };
    if (!profile.probableCause) {
      activeInteraction.notes.push('No moving violation was observed before the stop.');
    } else {
      activeInteraction.notes.push(`Observed basis: ${profile.label}.`);
    }
    renderTrainingInteraction();
  }

  function askStopQuestion(key) {
    if (!activeInteraction) return;
    activeInteraction.asked.add(key);
    const profile = activeInteraction.profile;
    const note = {
      dl: `DL: ${profile.documents.dl}`,
      registration: `Registration: ${profile.documents.registration}`,
      insurance: `Insurance: ${profile.documents.insurance}`,
      reason: `Officer explains the stop: "${profile.label}." Driver says: "${profile.responses.reason}"`,
      travel: `Travel answer: "${profile.responses.travel}"`,
      impairment: `Impairment check: ${profile.responses.impairment}`,
      search: `Search/consent: ${profile.responses.search}`
    }[key];
    if (note) activeInteraction.notes.push(note);
    renderTrainingInteraction();
  }

  function finishTrafficStop(action) {
    if (!activeInteraction) return;
    const profile = activeInteraction.profile;
    const carState = activeInteraction.car;
    const score = scoreTrafficStop(profile, action, activeInteraction.asked);
    callsCleared += score > 0 ? 1 : 0;
    callsClearedEl.textContent = String(callsCleared);
    activeInteraction.notes.push(`Decision: ${action}. ${scoreTrafficFeedback(profile, action)} ${profile.result}`);
    activeInteraction.stage = 'complete';
    carState.stopCompleted = true;
    carState.pursued = false;
    carState.pulledOver = false;
    carState.baseSpeed = Math.max(90, carState.baseSpeed * 0.72);
    if (activeCall?.kind === 'suspiciousVehicle' && activeCall.suspectCar === carState) {
      activeCall = null;
      hideDispatch();
      callTimer = 8 + Math.random() * 8;
    }
    setStatus(score > 0 ? 'Traffic stop completed.' : 'Review the stop. Probable cause matters.', 3);
    renderTrainingInteraction();
  }

  function scoreTrafficStop(profile, action, asked) {
    const hasDocs = asked.has('dl') && asked.has('registration') && asked.has('insurance');
    if (!profile.probableCause) return action === 'Release' ? 1 : -1;
    if (profile.severity <= 1) return ['Warning', 'Ticket'].includes(action) && hasDocs ? 1 : 0;
    if (profile.severity === 2) return action === 'Ticket' && hasDocs ? 1 : 0;
    if (profile.severity === 3) return ['Ticket', 'Impound'].includes(action) && hasDocs ? 1 : 0;
    return ['Arrest', 'Impound'].includes(action) && asked.has('impairment') && asked.has('search') ? 1 : 0;
  }

  function scoreTrafficFeedback(profile, action) {
    if (!profile.probableCause) return action === 'Release'
      ? 'Good correction: there was no lawful basis to keep digging.'
      : 'That action is risky because the game did not record an observed violation.';
    if (profile.severity <= 1) return ['Warning', 'Ticket'].includes(action)
      ? 'That fits a minor moving violation.'
      : 'That is heavier than the facts support.';
    if (profile.severity === 2) return action === 'Ticket'
      ? 'That fits the reckless driving facts.'
      : 'Make sure the outcome matches the observed danger.';
    if (profile.severity === 3) return ['Ticket', 'Impound'].includes(action)
      ? 'That fits the suspended-license/no-insurance facts.'
      : 'Check policy before escalating.';
    return ['Arrest', 'Impound'].includes(action)
      ? 'That fits the stronger indicators after further investigation.'
      : 'The clues supported deeper investigation.';
  }

  function renderTrainingInteraction() {
    if (!activeInteraction || !trainingPanel) return;
    if (activeInteraction.type === 'scene') {
      renderSceneInteraction();
      return;
    }
    const { profile, driver, notes, stage } = activeInteraction;
    trainingPanel.classList.remove('hidden');
    trainingTag.textContent = activeInteraction.type === 'traffic' ? 'TRAFFIC STOP' : 'CASE FILE';
    trainingTitle.textContent = `${driver.name} - ${profile.label}`;
    trainingNarrative.textContent = stage === 'complete'
      ? 'Stop complete. Review the facts and close the panel when ready.'
      : `${driver.name} is ${driver.demeanor}. The vehicle is stopped on the shoulder. Build your stop from observed facts, documents, and reasonable questions.`;
    trainingFacts.innerHTML = '';
    [
      `Driver: ${driver.name}`,
      `Observed: ${profile.notes}`,
      `Vehicle: ${activeInteraction.car.sprite.replace(/[A-Z]/g, ' $&').trim()}`,
      profile.probableCause ? 'Basis: observed violation' : 'Basis: no violation observed'
    ].concat(notes.slice(-6)).forEach((fact) => {
      const item = document.createElement('span');
      item.textContent = fact;
      trainingFacts.appendChild(item);
    });
    trainingOptions.innerHTML = '';
    if (stage === 'complete') {
      addTrainingButton('Close', 'primary', closeTrainingInteraction);
      return;
    }
    availableStopQuestions(activeInteraction).forEach(([key, label]) => addTrainingButton(label, '', () => askStopQuestion(key)));
    availableStopOutcomes(activeInteraction).forEach((action) => {
      addTrainingButton(action, action === 'Arrest' ? 'danger' : (action === 'Impound' ? 'caution' : 'primary'), () => finishTrafficStop(action));
    });
  }

  function availableStopQuestions(interaction) {
    const asked = interaction.asked;
    const profile = interaction.profile;
    if (!asked.has('reason')) return [['reason', `Tell ${interaction.driver.name} why you pulled them over`]];
    const questions = [
      ['dl', 'Ask for driver license'],
      ['registration', 'Ask for registration'],
      ['insurance', 'Ask for proof of insurance'],
      ['travel', 'Ask where they are coming from and going']
    ].filter(([key]) => !asked.has(key));
    if ((asked.has('travel') || profile.severity >= 2) && !asked.has('impairment')) questions.push(['impairment', 'Check for impairment clues']);
    if ((asked.has('impairment') || profile.severity >= 4) && !asked.has('search')) questions.push(['search', 'Ask about weapons, contraband, or consent when justified']);
    return questions;
  }

  function availableStopOutcomes(interaction) {
    if (!interaction.asked.has('reason')) return ['Release'];
    if (interaction.asked.size < 4) return ['Release', 'Warning'];
    return ['Release', 'Warning', 'Ticket', 'Impound', 'Arrest'];
  }

  function renderSceneInteraction() {
    const { profile, notes, stage, target } = activeInteraction;
    trainingPanel.classList.remove('hidden');
    trainingTag.textContent = 'CASE FILE';
    trainingTitle.textContent = `${profile.title}${target?.label ? ` - ${target.label}` : ''}`;
    trainingNarrative.textContent = stage === 'complete'
      ? 'Case reviewed. Close the panel when ready.'
      : 'You arrived on scene. Read the dispatch notes, compare them to what you see, and choose the next reasonable first responder steps.';
    trainingFacts.innerHTML = '';
    (profile.observations || []).concat(notes.slice(-6)).forEach((fact) => {
      const item = document.createElement('span');
      item.textContent = fact;
      trainingFacts.appendChild(item);
    });
    trainingOptions.innerHTML = '';
    if (stage === 'complete') {
      addTrainingButton('Close', 'primary', closeTrainingInteraction);
      return;
    }
    addTrainingButton('Talk to caller / reporting party', '', () => askSceneQuestion('caller'));
    addTrainingButton('Check involved person or victim', '', () => askSceneQuestion('victim'));
    addTrainingButton('Decide if EMS is needed', '', () => askSceneQuestion('ems'));
    addTrainingButton('Secure scene and document observations', '', () => askSceneQuestion('scene'));
    addTrainingButton('Close case', 'primary', finishSceneCase);
  }

  function addTrainingButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener('click', handler);
    trainingOptions.appendChild(button);
  }

  function closeTrainingInteraction() {
    activeInteraction = null;
    trainingPanel?.classList.add('hidden');
  }

  function acceptCall() {
    if (!pendingCall) return;
    activeCall = pendingCall;
    pendingCall = null;
    if (activeCall.roads?.length) town.roads = cloneRoads(activeCall.roads);
    dispatchPanel.classList.add('show');
    dispatchTimer.textContent = 'ACTIVE';
    dispatchTitle.textContent = activeCall.title;
    dispatchBody.textContent = activeCall.objectives.length > 1
      ? `Proceed through ${activeCall.objectives.length} marked objectives.`
      : `Proceed to ${activeCall.target.label}. Marker is on your map.`;
  }

  function declineCall() {
    pendingCall = null;
    hideDispatch();
    callTimer = 4 + Math.random() * 8;
    setStatus('Call declined. Continue patrol.', 2);
  }

  function hideDispatch() {
    dispatchPanel.classList.remove('show');
    dispatchTimer.textContent = '--';
  }

  function getActiveObjective() {
    if (activeCall?.kind === 'suspiciousVehicle' && activeCall.phase === 'hunt' && activeCall.suspectCar) {
      return objectiveForVehicle(activeCall.suspectCar, `${activeCall.vehicleDescription} from ${activeCall.target.label}`);
    }
    if (!activeCall?.objectives?.length) return activeCall?.target || null;
    return activeCall.objectives[clamp(activeCall.objectiveIndex || 0, 0, activeCall.objectives.length - 1)];
  }

  function getDispatchPool() {
    const custom = loadCustomMissions();
    return custom.length ? custom.concat(dispatches) : dispatches;
  }

  function loadCustomMissions() {
    try {
      const stored = localStorage.getItem(CUSTOM_MISSION_KEY) || localStorage.getItem(LEGACY_CUSTOM_MISSION_KEY) || '[]';
      const list = JSON.parse(stored);
      if (!Array.isArray(list)) return [];
      return list.map((m) => {
        const checkpoints = Array.isArray(m.checkpoints) ? m.checkpoints : [];
        const collectibles = Array.isArray(m.collectibles) ? m.collectibles : [];
        const chaseRoute = Array.isArray(m.chaseRoute) ? m.chaseRoute : [];
        let route = [];
        if (m.type === 'collect') route = collectibles;
        else if (m.type === 'chase') route = chaseRoute;
        else if (m.type === 'mixed') route = checkpoints.concat(collectibles, chaseRoute);
        else route = checkpoints;
        const roads = normalizeRoads(m.roads);
        route = route
          .filter((p) => Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
          .map((p, idx) => ({ x: Number(p.x), y: Number(p.y), label: `${m.title || 'Custom Mission'} objective ${idx + 1}` }));
        if (!route.length) return null;
        return {
          title: String(m.title || 'Custom Mission'),
          body: String(m.dispatch || 'Proceed to the marked mission objective.'),
          target: route[0],
          objectives: route,
          roads,
          urgency: 2
        };
      }).filter(Boolean);
    } catch {
      return [];
    }
  }

  function render() {
    const zoom = cameraZoom();
    const viewW = window.innerWidth / zoom;
    const viewH = window.innerHeight / zoom;
    const speedLook = clamp(Math.abs(player.speed) * 0.4, 0, 220);
    const steer = (keys.has('arrowright') || keys.has('d') || touchDrive.has('right') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') || touchDrive.has('left') ? 1 : 0);
    const forwardX = Math.sin(player.angle);
    const forwardY = -Math.cos(player.angle);
    const sideX = Math.cos(player.angle);
    const sideY = Math.sin(player.angle);
    const desiredFocusX = player.x + forwardX * speedLook + sideX * steer * 80;
    const desiredFocusY = player.y + forwardY * speedLook + sideY * steer * 80;
    camera.focusX += (desiredFocusX - (camera.focusX || player.x)) * 0.075;
    camera.focusY += (desiredFocusY - (camera.focusY || player.y)) * 0.075;
    camera.x = clamp(camera.focusX - viewW / 2, 0, Math.max(0, town.width - viewW));
    camera.y = clamp(camera.focusY - viewH / 2, 0, Math.max(0, town.height - viewH));

    drawMap();
    drawLabels();
    traffic.forEach((c) => {
      const size = getVehicleSize(c.sprite);
      const health = Number.isFinite(c.health) ? c.health : 100;
      drawVehicle(c.sprite, c.x, c.y, size.w, size.h, c.angle, 0.45 + (health / 100) * 0.55);
    });
    drawPoliceCar();
    drawNavigation();
  }

  function selectMapMode(mode) {
    mapMode = ['imagery', 'topo', 'game'].includes(mode) ? mode : 'game';
    localStorage.setItem(MAP_MODE_KEY, mapMode);
    if (mapMode !== 'game') {
      backgroundOverlay.img = null;
      backgroundOverlay.tiles = [];
      backgroundOverlay.key = '';
      backgroundOverlay.loading = false;
      ensureBackgroundOverlay();
    }
    mapModePanel?.classList.add('hidden');
    setStatus(mapMode === 'game'
      ? 'Game map loaded. Roads remain locked to Kennard.'
      : `${mapMode === 'topo' ? 'USGS Topo' : 'USGS'} background loaded. Roads remain locked.`, 2.5);
  }

  function loop(now) {
    const dt = Math.min(0.04, (now - lastTime) / 1000);
    lastTime = now;
    statusHold = Math.max(0, statusHold - dt);
    updatePlayer(dt);
    updateTraffic(dt);
    updateCollisions(dt);
    updateDispatch(dt);
    updateHealthHud();
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    keys.add(key);
    if (key === 'e') interact();
    if (key === 'q') declineCall();
    if (key === 'l' && !event.repeat) {
      policeLights = !policeLights;
      setStatus(policeLights ? 'Lights and siren active. Civilian traffic is yielding.' : 'Lights and siren off.', 2.5);
    }
    if (key === 'z' && !event.repeat) {
      cameraZoomIndex = (cameraZoomIndex + 1) % CAMERA_ZOOMS.length;
      setStatus(`Camera zoom ${cameraZoomIndex + 1}/${CAMERA_ZOOMS.length}.`, 2);
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

  document.querySelectorAll('#mobileControls button[data-drive]').forEach((btn) => {
    const key = btn.getAttribute('data-drive');
    const down = (event) => {
      event.preventDefault();
      touchDrive.add(key);
    };
    const up = (event) => {
      event.preventDefault();
      touchDrive.delete(key);
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  });

  acceptCallBtn.addEventListener('click', acceptCall);
  declineCallBtn.addEventListener('click', declineCall);
  closeTrainingBtn?.addEventListener('click', closeTrainingInteraction);
  mapModePanel?.querySelectorAll('button[data-map-mode]').forEach((btn) => {
    btn.addEventListener('click', () => selectMapMode(btn.getAttribute('data-map-mode') || 'game'));
  });

  resizeCanvas();
  requestAnimationFrame(loop);
})();
