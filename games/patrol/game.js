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

  const town = {
    width: 3000,
    height: 2200,
    name: '',
    roads: []
  };

  const addresses = [];

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
    { title: 'Disorderly Subject', body: 'Store clerk requests an officer for a subject arguing paperwork at {address}.', urgency: 2 },
    { title: 'Reckless Driver', body: 'Vehicle circling the block and ignoring stop signs near {address}.', urgency: 2 },
    { title: 'Welfare Check', body: 'Neighbor requests a check after hearing a loud argument near {address}.', urgency: 1 },
    { title: 'Blocked Roadway', body: 'Pickup and trailer stopped in the travel lane at {address}.', urgency: 1 }
  ];
  const CUSTOM_MISSION_KEY = 'patrol.customMissions.v1';
  const LEGACY_CUSTOM_MISSION_KEY = 'sovereignCitizen.customMissions.v1';
  const PRACTICE_MAP_KEY = 'patrol.practiceRoads.v1';

  const keys = new Set();
  const touchDrive = new Set();
  const CAMERA_ZOOM = 0.44;
  let camera = { x: 0, y: 0 };
  let lastTime = performance.now();
  let callTimer = 4;
  let pendingCall = null;
  let activeCall = null;
  let callsCleared = 0;
  let policeLights = false;

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

  normalizeTownGeometry();

  function car(sprite, x, y, angle, speed) {
    return { sprite, x, y, angle, speed, baseSpeed: speed, turnTimer: 0, health: 100, damageCooldown: 0, enemy: false, pulledOver: false };
  }

  function normalizeTownGeometry() {
    town.width = 6200;
    town.height = 4600;
    town.roads = loadPracticeRoads();
    if (!town.roads.length) town.roads = buildTownCoreRoads();

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
    resetTraffic();
    player.x = 3600;
    player.y = 3560;
    player.angle = 0;
  }

  function loadPracticeRoads() {
    try {
      return normalizeRoads(JSON.parse(localStorage.getItem(PRACTICE_MAP_KEY) || '[]'));
    } catch {
      return [];
    }
  }

  function buildTownCoreRoads() {
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

  function resetTraffic() {
    traffic.splice(0, traffic.length,
      trafficCar('sedan', 2, 1, 1, 0.22, 154),
      trafficCar('hatchbackYellow', 0, 1, 1, 0.58, 142),
      trafficCar('pickup', 3, 2, 1, 0.42, 128),
      trafficCar('suv', 9, 0, 1, 0.68, 118),
      trafficCar('hatchback', 1, 3, -1, 0.36, 146),
      trafficCar('pickupDown', 10, 2, -1, 0.52, 122),
      trafficCar('sedanDown', 7, 1, 1, 0.2, 164, true)
    );
  }

  function trafficCar(sprite, roadIndex, segmentIndex, direction, t, speed, enemy = false) {
    const c = car(sprite, 0, 0, 0, speed);
    const safeRoadIndex = town.roads.length ? roadIndex % town.roads.length : 0;
    const road = town.roads[safeRoadIndex] || { pts: [[0, 0], [1, 0]] };
    c.route = {
      roadIndex: safeRoadIndex,
      segmentIndex: clamp(segmentIndex, 0, Math.max(0, road.pts.length - 2)),
      direction,
      t
    };
    c.enemy = enemy;
    c.baseSpeed = speed;
    placeTrafficOnLane(c);
    return c;
  }

  function placeTrafficOnLane(c) {
    const road = town.roads[c.route?.roadIndex];
    if (!road || !road.pts[c.route.segmentIndex + 1]) return;
    const laneFraction = c.pulledOver ? 0.39 : (c.enemy ? 0.18 : 0.24);
    const lane = lanePoint(road, c.route.segmentIndex, c.route.direction, c.route.t, laneFraction);
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
    const laneShift = Math.min(70, road.w * laneFraction);
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
        c.route.direction *= -1;
        c.route.segmentIndex = clamp(c.route.segmentIndex, 0, road.pts.length - 2);
      }
    }
    return true;
  }

  function dist(a, b, c, d) {
    return Math.hypot(a - c, b - d);
  }

  function roadAt(x, y, pad = 0) {
    return town.roads.some((r) => {
      for (let i = 0; i < r.pts.length - 1; i += 1) {
        const [x1, y1] = r.pts[i];
        const [x2, y2] = r.pts[i + 1];
        const vx = x2 - x1;
        const vy = y2 - y1;
        const len2 = vx * vx + vy * vy;
        const t = len2 ? clamp(((x - x1) * vx + (y - y1) * vy) / len2, 0, 1) : 0;
        const px = x1 + vx * t;
        const py = y1 + vy * t;
        if (dist(x, y, px, py) <= r.w / 2 + pad + getRoadShoulder(r)) return true;
      }
      return false;
    });
  }

  function getRoadShoulder(road) {
    if (road.kind === 'residential') return 18;
    return 10;
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
        const forgive = r.kind === 'residential' ? 76 : 54;
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
        if (d < best.d) best = { x: px, y: py, d };
      }
    });
    return best;
  }

  function drawSprite(sprite, x, y, w, h, angle = 0, alpha = 1) {
    const img = images[sprite];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(worldToScreenX(x), worldToScreenY(y));
    ctx.rotate(angle);
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
    const spec = sprites[sprite] || {};
    const sourceOffset = spec.facing === 'down' ? Math.PI : 0;
    drawSprite(sprite, x, y, w, h, angle + sourceOffset, alpha);
  }

  function drawPoliceCar() {
    const img = images.policeInterceptor;
    if (img?.complete && img.naturalWidth) {
      drawVehicle('policeInterceptor', player.x, player.y, 46, 70, player.angle);
      drawLightbar(worldToScreenX(player.x), worldToScreenY(player.y), player.angle);
      return;
    }
    const x = worldToScreenX(player.x);
    const y = worldToScreenY(player.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.angle);
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
    const x = worldToScreenX(person.x);
    const y = worldToScreenY(person.y);
    ctx.save();
    ctx.translate(x, y);
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
    return (x - camera.x) * CAMERA_ZOOM;
  }

  function worldToScreenY(y) {
    return (y - camera.y) * CAMERA_ZOOM;
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
    ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
    ctx.translate(-camera.x, -camera.y);
    ctx.fillStyle = '#204f2a';
    ctx.fillRect(0, 0, town.width, town.height);

    ctx.strokeStyle = '#2f3338';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawRoadPass(town.roads, (r) => r.w, '#2f3338');
    drawRoadPass(town.roads, (r) => Math.max(4, r.w - 18), '#3e464d');
    town.roads.forEach((r) => {
      ctx.setLineDash([26, 26]);
      ctx.strokeStyle = 'rgba(246, 222, 116, 0.5)';
      ctx.lineWidth = 3;
      drawRoadPath(r);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    buildings.forEach((b) => {
      const health = Number.isFinite(b.health) ? b.health : 100;
      drawWorldSprite(b.sprite, b.x, b.y, b.w, b.h, 0, 0.72 + (health / 100) * 0.28);
      if (health < 70) {
        ctx.fillStyle = `rgba(45, 20, 16, ${clamp((100 - health) / 120, 0, 0.55)})`;
        ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      }
    });
    trees.forEach(([x, y, sprite]) => drawWorldSprite(sprite, x, y, 102, 128, 0, 0.9));
    pedestrians.forEach(drawStickman);

    addresses.forEach((a) => {
      const objective = getActiveObjective();
      const isObjective = objective && dist(objective.x, objective.y, a.x, a.y) < 2;
      ctx.fillStyle = isObjective ? '#ffdd55' : 'rgba(255,255,255,0.58)';
      ctx.beginPath();
      ctx.arc(a.x, a.y, isObjective ? 16 : 7, 0, Math.PI * 2);
      ctx.fill();
      if (isObjective) {
        ctx.strokeStyle = '#ff4b4b';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });
    const objective = getActiveObjective();
    if (objective && !addresses.some((a) => dist(objective.x, objective.y, a.x, a.y) < 2)) {
      ctx.fillStyle = '#ffdd55';
      ctx.beginPath();
      ctx.arc(objective.x, objective.y, 16, 0, Math.PI * 2);
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

  function drawLabels() {
    ctx.save();
    ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
    ctx.translate(-camera.x, -camera.y);
    if (town.name) {
      ctx.font = '700 24px Arial';
      ctx.fillStyle = 'rgba(245,252,255,0.8)';
      ctx.fillText(town.name, 80, 90);
    }
    ctx.font = '600 13px Arial';
    ctx.fillStyle = 'rgba(226,238,245,0.54)';
    town.roads.forEach((r) => {
      if (!r.name) return;
      const mid = Math.floor((r.pts.length - 1) / 2);
      const [x1, y1] = r.pts[mid];
      const [x2, y2] = r.pts[Math.min(r.pts.length - 1, mid + 1)];
      const x = (x1 + x2) / 2;
      const y = (y1 + y2) / 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
      ctx.fillText(r.name, -48, -r.w / 2 - 8);
      ctx.restore();
    });
    ctx.restore();
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
    player.speed = clamp(player.speed, -210, player.maxSpeed);

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

    if (!roadAt(player.x, player.y, 2)) {
      const n = nearestRoadPoint(player.x, player.y);
      const hardOffRoad = isHardOffRoad(player.x, player.y);
      const pull = hardOffRoad ? 0.24 : 0.08;
      player.x += (n.x - player.x) * pull;
      player.y += (n.y - player.y) * pull;
      player.speed *= hardOffRoad ? 0.84 : 0.95;
      if (hardOffRoad && Math.abs(oldSpeed) > 90) damagePlayer((Math.abs(oldSpeed) / 520) * 18 * dt, 'Off road damage.');
      if (!roadAt(player.x, player.y, hardOffRoad ? 34 : 12)) {
        player.x = oldX;
        player.y = oldY;
        player.speed *= hardOffRoad ? -0.28 : 0.52;
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
      c.pulledOver = policeLights && !c.enemy && sirenDistance < 620;
      const targetSpeed = c.pulledOver ? 0 : c.baseSpeed;
      c.speed += (targetSpeed - c.speed) * (c.pulledOver ? 0.08 : 0.025);
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
      const objective = getActiveObjective();
      const remaining = objective ? dist(player.x, player.y, objective.x, objective.y) : Infinity;
      statusLine.textContent = objective?.label ? `Respond to ${objective.label}` : `Mission objective ${activeCall.objectiveIndex + 1}`;
      if (remaining < 72) {
        activeCall.objectiveIndex += 1;
        if (activeCall.objectiveIndex < activeCall.objectives.length) {
          dispatchBody.textContent = `Continue to objective ${activeCall.objectiveIndex + 1} of ${activeCall.objectives.length}.`;
        } else {
          callsCleared += 1;
          callsClearedEl.textContent = String(callsCleared);
          statusLine.textContent = 'Scene secured. Mission complete.';
          activeCall = null;
          town.roads = buildTownCoreRoads();
          callTimer = 6 + Math.random() * 8;
          hideDispatch();
        }
      }
    } else if (!pendingCall) {
      statusLine.textContent = 'Free roam patrol. Awaiting dispatch.';
    }
  }

  function createPendingCall() {
    const pool = getDispatchPool();
    const template = pool[Math.floor(Math.random() * pool.length)];
    const target = template.target || addresses[Math.floor(Math.random() * addresses.length)];
    const objectives = template.objectives?.length ? template.objectives : [{ x: target.x, y: target.y, label: target.label }];
    pendingCall = {
      ...template,
      target,
      objectives,
      objectiveIndex: 0,
      expires: 16
    };
    dispatchPanel.classList.add('show');
    dispatchTitle.textContent = template.title;
    dispatchBody.textContent = String(template.body || template.dispatch || 'Proceed to the marked location.').replace('{address}', target.label || 'the marked address');
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
    statusLine.textContent = 'Call declined. Continue patrol.';
  }

  function hideDispatch() {
    dispatchPanel.classList.remove('show');
    dispatchTimer.textContent = '--';
  }

  function getActiveObjective() {
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
    const viewW = window.innerWidth / CAMERA_ZOOM;
    const viewH = window.innerHeight / CAMERA_ZOOM;
    camera.x = clamp(player.x - viewW / 2, 0, Math.max(0, town.width - viewW));
    camera.y = clamp(player.y - viewH / 2, 0, Math.max(0, town.height - viewH));

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

  function loop(now) {
    const dt = Math.min(0.04, (now - lastTime) / 1000);
    lastTime = now;
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
    if (key === 'e') acceptCall();
    if (key === 'q') declineCall();
    if (key === 'l' && !event.repeat) {
      policeLights = !policeLights;
      statusLine.textContent = policeLights ? 'Lights and siren active. Civilian traffic is yielding.' : 'Lights and siren off.';
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

  resizeCanvas();
  requestAnimationFrame(loop);
})();
