(() => {
  const canvas = document.getElementById('builderCanvas');
  const ctx = canvas.getContext('2d');
  const titleEl = document.getElementById('missionTitle');
  const dispatchEl = document.getElementById('dispatchText');
  const typeEl = document.getElementById('missionType');
  const importEl = document.getElementById('missionImport');
  const statusEl = document.getElementById('builderStatus');
  const missionListEl = document.getElementById('missionList');
  const roadNameEl = document.getElementById('roadName');
  const roadKindEl = document.getElementById('roadKind');
  const roadWidthEl = document.getElementById('roadWidth');
  const roadWidthValueEl = document.getElementById('roadWidthValue');
  const zoomValueEl = document.getElementById('zoomValue');
  const overlayOpacityEl = document.getElementById('overlayOpacity');
  const overlayOpacityValueEl = document.getElementById('overlayOpacityValue');
  const overlayScaleEl = document.getElementById('overlayScale');
  const overlayScaleValueEl = document.getElementById('overlayScaleValue');
  const overlayPaddingEl = document.getElementById('overlayPadding');
  const overlayPaddingValueEl = document.getElementById('overlayPaddingValue');
  const STORAGE_KEY = 'patrol.customMissions.v1';
  const LEGACY_STORAGE_KEY = 'sovereignCitizen.customMissions.v1';
  const PRACTICE_MAP_KEY = 'patrol.practiceRoads.v1';

  let map = { width: 3000, height: 2200, roads: [] };
  let stopSigns = [];
  let currentTool = 'checkpoint';
  let mission = emptyMission();
  let selectedRoad = -1;
  let selectedRoadPoint = -1;
  const selectedRoads = new Set();
  let activeRoad = null;
  let roadPointDrag = null;
  let roadSelectionDrag = null;
  let roadInspectorUndoArmed = false;
  let straightRoadClick = false;
  let panDrag = null;
  let viewInitialized = false;
  let pointerMoved = false;
  const camera = { x: 0, y: 0, zoom: 1 };
  const undoStack = [];
  const overlay = {
    img: null,
    visible: true,
    opacity: 0.55,
    dx: 0,
    dy: 0,
    scale: 1,
    padding: 0.08,
    source: '',
    tiles: [],
    loadingKey: ''
  };

  function emptyMission() {
    return {
      id: `mission-${Date.now().toString(36)}`,
      title: 'Traffic Stop Assist',
      dispatch: 'Caller reports a driver refusing instructions near the marked address.',
      type: 'checkpoint',
      checkpoints: [],
      collectibles: [],
      chaseRoute: [],
      roads: []
    };
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function loadSaved() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || '[]';
      const list = JSON.parse(stored);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 40)));
    renderMissionList();
  }

  function loadPracticeRoads() {
    try {
      return normalizeRoads(JSON.parse(localStorage.getItem(PRACTICE_MAP_KEY) || '[]'));
    } catch {
      return [];
    }
  }

  function savePracticeRoads() {
    localStorage.setItem(PRACTICE_MAP_KEY, JSON.stringify(cloneRoads(map.roads)));
    setStatus('Practice roads saved. Patrol will use this road layout.');
  }

  function saveOverlayLock() {
    const text = buildGameMapFileText();
    downloadTextFile('map.js', text);
    setStatus('USGS overlay lock saved into map.js. Replace games/patrol/map.js with the downloaded file.');
  }

  function buildGameMapFileText() {
    return [
      `window.PATROL_MAP_SIZE = ${JSON.stringify({ width: Math.round(map.width), height: Math.round(map.height) })};`,
      window.PATROL_GEO_BOUNDS ? `window.PATROL_GEO_BOUNDS = ${JSON.stringify(window.PATROL_GEO_BOUNDS)};` : '',
      window.PATROL_MAP_PROJECTION ? `window.PATROL_MAP_PROJECTION = ${JSON.stringify(window.PATROL_MAP_PROJECTION)};` : '',
      `window.PATROL_REFERENCE_OVERLAY = ${JSON.stringify(readOverlaySettingsForSave())};`,
      `window.PATROL_STOP_SIGNS = ${JSON.stringify(cloneStopSigns(stopSigns), null, 2)};`,
      `window.PATROL_DEFAULT_ROADS = ${JSON.stringify(cloneRoads(map.roads), null, 2)};`,
      ''
    ].filter(Boolean).join('\n');
  }

  function readOverlaySettingsForSave() {
    return {
      source: overlay.source || 'topo',
      opacity: Number(overlay.opacity.toFixed(3)),
      dx: Math.round(overlay.dx),
      dy: Math.round(overlay.dy),
      scale: Number(overlay.scale.toFixed(4)),
      padding: Number(overlay.padding.toFixed(3)),
      visible: overlay.visible,
      tileColumns: Number(window.PATROL_REFERENCE_OVERLAY?.tileColumns || 1),
      tileRows: Number(window.PATROL_REFERENCE_OVERLAY?.tileRows || 1),
      tilePixels: Number(window.PATROL_REFERENCE_OVERLAY?.tilePixels || 4096)
    };
  }

  function applySavedOverlaySettings() {
    const saved = window.PATROL_REFERENCE_OVERLAY || {};
    overlay.source = saved.source || overlay.source || 'topo';
    overlay.opacity = clamp(Number(saved.opacity ?? overlay.opacity), 0, 1);
    overlay.dx = Number(saved.dx || 0);
    overlay.dy = Number(saved.dy || 0);
    overlay.scale = clamp(Number(saved.scale || 1), 0.75, 1.35);
    overlay.padding = clamp(Number(saved.padding ?? overlay.padding), 0, 0.25);
    overlay.visible = saved.visible !== false;
    overlayOpacityEl.value = String(overlay.opacity);
    overlayOpacityValueEl.textContent = `${Math.round(overlay.opacity * 100)}%`;
    overlayScaleEl.value = String(overlay.scale);
    overlayScaleValueEl.textContent = `${Math.round(overlay.scale * 100)}%`;
    overlayPaddingEl.value = String(overlay.padding);
    overlayPaddingValueEl.textContent = `${Math.round(overlay.padding * 100)}%`;
    document.getElementById('toggleOverlayBtn').textContent = overlay.visible ? 'Hide Overlay' : 'Show Overlay';
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copyText(text) {
    if (!navigator.clipboard?.writeText) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function saveGameMapFile() {
    const text = buildGameMapFileText();
    localStorage.setItem(PRACTICE_MAP_KEY, JSON.stringify(cloneRoads(map.roads)));
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'map.js',
          types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        setStatus('Game map file saved. Choose games/patrol/map.js to update Patrol.');
        return;
      } catch (err) {
        if (err?.name === 'AbortError') {
          setStatus('Save canceled.');
          return;
        }
      }
    }
    downloadTextFile('map.js', text);
    const copied = await copyText(text);
    setStatus(copied
      ? 'Downloaded map.js and copied the game map code. Replace games/patrol/map.js with it.'
      : 'Downloaded map.js. Replace games/patrol/map.js with the downloaded file.');
  }

  function readForm() {
    mission.title = titleEl.value.trim() || 'Untitled Mission';
    mission.dispatch = dispatchEl.value.trim() || 'Proceed to the marked location.';
    mission.type = typeEl.value;
  }

  function writeForm() {
    titleEl.value = mission.title || '';
    dispatchEl.value = mission.dispatch || '';
    typeEl.value = mission.type || 'checkpoint';
  }

  function normalizeMission(raw) {
    const next = raw && typeof raw === 'object' ? raw : {};
    return {
      id: String(next.id || `mission-${Date.now().toString(36)}`),
      title: String(next.title || 'Untitled Mission'),
      dispatch: String(next.dispatch || 'Proceed to the marked location.'),
      type: ['checkpoint', 'collect', 'chase', 'mixed'].includes(String(next.type)) ? String(next.type) : 'checkpoint',
      checkpoints: Array.isArray(next.checkpoints) ? next.checkpoints.map(point) : [],
      collectibles: Array.isArray(next.collectibles) ? next.collectibles.map(point) : [],
      chaseRoute: Array.isArray(next.chaseRoute) ? next.chaseRoute.map(point) : [],
      roads: normalizeRoads(next.roads)
    };
  }

  function point(p) {
    return { x: Math.round(Number(p?.x || 0)), y: Math.round(Number(p?.y || 0)) };
  }

  function normalizeRoads(roads) {
    if (!Array.isArray(roads)) return [];
    return roads.map((road, idx) => ({
      name: String(road?.name || (road?.builderRoad ? `Custom Road ${idx + 1}` : '')),
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

  function cloneStopSigns(signs) {
    return normalizeStopSigns(signs).map((sign) => ({ ...sign }));
  }

  function perpendicularDistance(p, a, b) {
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const len2 = vx * vx + vy * vy;
    if (!len2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2, 0, 1);
    return Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t));
  }

  function simplifyPoints(points, tolerance = 18) {
    if (points.length <= 2) return points.map((p) => [...p]);
    let maxDistance = 0;
    let maxIndex = 0;
    const first = points[0];
    const last = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i += 1) {
      const distance = perpendicularDistance(points[i], first, last);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    if (maxDistance <= tolerance) return [first, last].map((p) => [...p]);
    const left = simplifyPoints(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPoints(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }

  function catmullRomPoint(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return [
      Math.round(0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)),
      Math.round(0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3))
    ];
  }

  function smoothRoadPoints(points) {
    const simplified = simplifyPoints(points, 22);
    if (simplified.length <= 3) return simplified;
    const smoothed = [simplified[0]];
    for (let i = 0; i < simplified.length - 1; i += 1) {
      const p0 = simplified[Math.max(0, i - 1)];
      const p1 = simplified[i];
      const p2 = simplified[i + 1];
      const p3 = simplified[Math.min(simplified.length - 1, i + 2)];
      const steps = clamp(Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 180), 3, 10);
      for (let step = 1; step <= steps; step += 1) smoothed.push(catmullRomPoint(p0, p1, p2, p3, step / steps));
    }
    smoothed[0] = points[0];
    smoothed[smoothed.length - 1] = points[points.length - 1];
    return smoothed.filter((p, idx) => idx === 0 || Math.hypot(p[0] - smoothed[idx - 1][0], p[1] - smoothed[idx - 1][1]) > 8);
  }

  function roadLooksCurved(road) {
    if (road.pts.length > 8) return true;
    if (road.pts.length <= 2) return false;
    const start = road.pts[0];
    const end = road.pts[road.pts.length - 1];
    return road.pts.some((pt) => perpendicularDistance(pt, start, end) > 80);
  }

  function smoothRoads() {
    const targets = selectedRoads.size ? Array.from(selectedRoads) : map.roads.map((_, idx) => idx).filter((idx) => roadLooksCurved(map.roads[idx]));
    if (!targets.length) {
      setStatus('No curved roads found to smooth.');
      return;
    }
    pushUndo('Smooth roads');
    targets.forEach((idx) => {
      const road = map.roads[idx];
      if (!road || road.pts.length < 3) return;
      road.pts = smoothRoadPoints(road.pts);
    });
    syncMissionRoads();
    draw();
    setStatus(`Smoothed ${targets.length} road${targets.length === 1 ? '' : 's'}.`);
  }

  function syncMissionRoads() {
    mission.roads = cloneRoads(map.roads);
  }

  function inspectedRoadIndices() {
    const indices = selectedRoads.size ? Array.from(selectedRoads) : (selectedRoad >= 0 ? [selectedRoad] : []);
    return indices.filter((idx) => map.roads[idx]);
  }

  function singleInspectedRoadIndex() {
    const indices = inspectedRoadIndices();
    return indices.length === 1 ? indices[0] : -1;
  }

  function roadKindDefaultWidth(kind) {
    return {
      secondary: 220,
      tertiary: 168,
      residential: 132,
      alley: 88,
      service: 88
    }[kind] || 132;
  }

  function armRoadInspectorUndo(label = 'Edit road details') {
    if (roadInspectorUndoArmed || !inspectedRoadIndices().length) return;
    pushUndo(label);
    roadInspectorUndoArmed = true;
  }

  function syncRoadInspector() {
    const indices = inspectedRoadIndices();
    const roads = indices.map((idx) => map.roads[idx]).filter(Boolean);
    const hasSelection = roads.length > 0;
    const single = roads.length === 1 ? roads[0] : null;

    roadNameEl.disabled = !single;
    roadKindEl.disabled = !hasSelection;
    roadWidthEl.disabled = !hasSelection;

    if (!hasSelection) {
      roadNameEl.value = '';
      roadNameEl.placeholder = 'Click a road, then name it';
      roadKindEl.value = 'residential';
      roadWidthEl.value = '190';
      roadWidthValueEl.textContent = '190';
      return;
    }

    if (single) {
      roadNameEl.value = single.name || '';
      roadNameEl.placeholder = single.kind === 'alley' ? 'Unnamed alley' : 'Road name';
      roadKindEl.value = single.kind || 'residential';
      roadWidthEl.value = String(Math.round(single.w || 132));
      roadWidthValueEl.textContent = String(Math.round(single.w || 132));
      return;
    }

    const widths = roads.map((road) => Math.round(road.w || 132));
    const kinds = new Set(roads.map((road) => road.kind || 'residential'));
    roadNameEl.value = '';
    roadNameEl.placeholder = `${roads.length} roads selected`;
    roadKindEl.value = kinds.size === 1 ? roads[0].kind || 'residential' : 'residential';
    roadWidthEl.value = String(widths[0]);
    roadWidthValueEl.textContent = Math.min(...widths) === Math.max(...widths)
      ? String(widths[0])
      : `${Math.min(...widths)}-${Math.max(...widths)}`;
  }

  function snapshotState(label = 'Edit') {
    return {
      label,
      map: { width: map.width, height: map.height, roads: cloneRoads(map.roads) },
      stopSigns: cloneStopSigns(stopSigns),
      mission: normalizeMission(JSON.parse(JSON.stringify(mission)))
    };
  }

  function pushUndo(label) {
    undoStack.push(snapshotState(label));
    if (undoStack.length > 80) undoStack.shift();
  }

  function restoreSnapshot(snapshot) {
    if (!snapshot) return;
    map.width = snapshot.map.width;
    map.height = snapshot.map.height;
    map.roads = cloneRoads(snapshot.map.roads);
    stopSigns = cloneStopSigns(snapshot.stopSigns);
    mission = normalizeMission(snapshot.mission);
    selectedRoad = -1;
    selectedRoadPoint = -1;
    selectedRoads.clear();
    activeRoad = null;
    roadPointDrag = null;
    roadSelectionDrag = null;
    roadInspectorUndoArmed = false;
    straightRoadClick = false;
    panDrag = null;
    writeForm();
    syncMissionRoads();
    clampCamera();
    draw();
  }

  function undoLastChange() {
    const snapshot = undoStack.pop();
    if (!snapshot) {
      setStatus('Nothing to undo.');
      return;
    }
    restoreSnapshot(snapshot);
    setStatus(`Undid: ${snapshot.label}.`);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function isTextEntryTarget(target) {
    const tag = String(target?.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
  }

  function parsePastedBuilderText(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    if (/PATROL_DEFAULT_ROADS|PATROL_MAP_SIZE/.test(raw)) {
      const sandbox = {};
      Function('window', `${raw}; return window;`)(sandbox);
      return {
        kind: 'map',
        roads: normalizeRoads(sandbox.PATROL_DEFAULT_ROADS),
        stopSigns: normalizeStopSigns(sandbox.PATROL_STOP_SIGNS),
        size: sandbox.PATROL_MAP_SIZE
      };
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return { kind: 'roads', roads: normalizeRoads(data) };
    if (data && typeof data === 'object') {
      if (Array.isArray(data.roads) && (data.width || data.height)) {
        return { kind: 'map', roads: normalizeRoads(data.roads), stopSigns: normalizeStopSigns(data.stopSigns), size: data };
      }
      if (Array.isArray(data.roads) || Array.isArray(data.checkpoints) || Array.isArray(data.collectibles) || Array.isArray(data.chaseRoute)) {
        return { kind: 'mission', mission: normalizeMission(data) };
      }
    }
    return null;
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard?.readText) {
      setStatus('Clipboard paste is not available in this browser. Use the Import JSON box.');
      return;
    }
    let parsed;
    try {
      parsed = parsePastedBuilderText(await navigator.clipboard.readText());
    } catch {
      setStatus('Paste failed: clipboard text is not valid Patrol map or mission JSON.');
      return;
    }
    if (!parsed) {
      setStatus('Paste failed: clipboard did not contain Patrol map or mission data.');
      return;
    }
    pushUndo('Paste');
    if (parsed.kind === 'mission') {
      mission = parsed.mission;
      if (mission.roads.length) map.roads = cloneRoads(mission.roads);
      writeForm();
    } else {
      map.roads = cloneRoads(parsed.roads);
      if (parsed.size) {
        map.width = clamp(Number(parsed.size.width || map.width), 6200, 30000);
        map.height = clamp(Number(parsed.size.height || map.height), 4600, 24000);
      }
      stopSigns = parsed.stopSigns?.length ? cloneStopSigns(parsed.stopSigns) : generateStopSigns(map.roads);
      expandMapToFitRoads();
      syncMissionRoads();
    }
    selectedRoad = -1;
    selectedRoadPoint = -1;
    selectedRoads.clear();
    fitCameraToMap();
    draw();
    setStatus(parsed.kind === 'mission' ? 'Pasted mission data.' : 'Pasted road map data.');
  }

  function loadGameRoads() {
    const sharedRoads = normalizeRoads(window.PATROL_DEFAULT_ROADS);
    return sharedRoads.length ? sharedRoads : buildTownCoreRoads();
  }

  function loadGameMapSize() {
    const size = window.PATROL_MAP_SIZE || {};
    return {
      width: clamp(Number(size.width || 14000), 6200, 30000),
      height: clamp(Number(size.height || 10000), 4600, 24000)
    };
  }

  function applyGameMapSize() {
    const size = loadGameMapSize();
    map.width = size.width;
    map.height = size.height;
    expandMapToFitRoads();
  }

  function expandMapToFitRoads() {
    let maxX = map.width;
    let maxY = map.height;
    map.roads.forEach((road) => {
      road.pts.forEach(([x, y]) => {
        maxX = Math.max(maxX, x + 1000);
        maxY = Math.max(maxY, y + 1000);
      });
    });
    map.width = clamp(Math.ceil(maxX / 500) * 500, 6200, 30000);
    map.height = clamp(Math.ceil(maxY / 500) * 500, 4600, 24000);
  }

  function loadMapFromGame() {
    map.roads = loadGameRoads();
    stopSigns = loadGameStopSigns();
    applyGameMapSize();
    selectedRoad = -1;
    selectedRoadPoint = -1;
    selectedRoads.clear();
    syncMissionRoads();
  }

  function normalizeMapGeometry() {
    map.roads = loadPracticeRoads();
    if (!map.roads.length) map.roads = loadGameRoads();
    stopSigns = loadGameStopSigns();
    applyGameMapSize();
    syncMissionRoads();
  }

  function loadGameStopSigns() {
    const saved = normalizeStopSigns(window.PATROL_STOP_SIGNS);
    return saved.length ? saved : generateStopSigns(map.roads);
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

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!viewInitialized) fitCameraToMap();
    else clampCamera();
    draw();
  }

  function fitScale() {
    const rect = canvas.getBoundingClientRect();
    return Math.min(rect.width / map.width, rect.height / map.height);
  }

  function minZoom() {
    return Math.max(0.04, fitScale() * 0.35);
  }

  function maxZoom() {
    return 2.4;
  }

  function setZoomValue() {
    zoomValueEl.textContent = `${Math.round(camera.zoom * 100)}%`;
  }

  function clampCamera() {
    const rect = canvas.getBoundingClientRect();
    const margin = Math.max(900, Math.min(map.width, map.height) * 0.18);
    const viewW = rect.width / camera.zoom;
    const viewH = rect.height / camera.zoom;
    const minX = -margin;
    const minY = -margin;
    const maxX = map.width + margin - viewW;
    const maxY = map.height + margin - viewH;
    camera.x = clamp(camera.x, Math.min(minX, maxX), Math.max(minX, maxX));
    camera.y = clamp(camera.y, Math.min(minY, maxY), Math.max(minY, maxY));
    setZoomValue();
  }

  function fitCameraToMap() {
    const rect = canvas.getBoundingClientRect();
    camera.zoom = fitScale();
    camera.x = (map.width - rect.width / camera.zoom) / 2;
    camera.y = (map.height - rect.height / camera.zoom) / 2;
    viewInitialized = true;
    clampCamera();
  }

  function zoomAt(clientX, clientY, factor) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const before = {
      x: camera.x + sx / camera.zoom,
      y: camera.y + sy / camera.zoom
    };
    camera.zoom = clamp(camera.zoom * factor, minZoom(), maxZoom());
    camera.x = before.x - sx / camera.zoom;
    camera.y = before.y - sy / camera.zoom;
    clampCamera();
    draw();
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

  function paddedGeoBounds() {
    const bounds = window.PATROL_GEO_BOUNDS;
    if (!bounds) return null;
    const lonPad = (bounds.east - bounds.west) * overlay.padding;
    const latPad = (bounds.north - bounds.south) * overlay.padding;
    return {
      west: bounds.west - lonPad,
      east: bounds.east + lonPad,
      south: bounds.south - latPad,
      north: bounds.north + latPad
    };
  }

  function overlayWorldRect() {
    const bounds = paddedGeoBounds();
    if (!bounds) return null;
    const nw = geoToMap(bounds.west, bounds.north);
    const se = geoToMap(bounds.east, bounds.south);
    const w = (se.x - nw.x) * overlay.scale;
    const h = (se.y - nw.y) * overlay.scale;
    return {
      x: nw.x + overlay.dx - (w - (se.x - nw.x)) / 2,
      y: nw.y + overlay.dy - (h - (se.y - nw.y)) / 2,
      w,
      h
    };
  }

  function usgsOverlayUrl(layer, bounds = paddedGeoBounds()) {
    if (!bounds) return '';
    const service = layer === 'imagery'
      ? 'USGSImageryOnly/MapServer'
      : 'USGSTopo/MapServer';
    const bbox = [bounds.west, bounds.south, bounds.east, bounds.north].join(',');
    const pixels = Number(window.PATROL_REFERENCE_OVERLAY?.tilePixels || 4096);
    return `https://basemap.nationalmap.gov/arcgis/rest/services/${service}/export?bbox=${bbox}&bboxSR=4326&size=${pixels},${pixels}&imageSR=4326&format=png32&transparent=false&f=image`;
  }

  function overlayTileBounds() {
    const bounds = paddedGeoBounds();
    if (!bounds) return [];
    const cols = Number(window.PATROL_REFERENCE_OVERLAY?.tileColumns || 1);
    const rows = Number(window.PATROL_REFERENCE_OVERLAY?.tileRows || 1);
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

  function loadReferenceOverlay(layer = 'topo') {
    const tiles = overlayTileBounds();
    if (!tiles.length) {
      setStatus('Reference overlay unavailable: map has no geographic bounds.');
      return;
    }
    overlay.source = layer;
    overlay.visible = true;
    overlay.tiles = [];
    overlay.loadingKey = `${layer}:${Date.now()}`;
    const loadingKey = overlay.loadingKey;
    document.getElementById('toggleOverlayBtn').textContent = 'Hide Overlay';
    setStatus(`Loading ${tiles.length} USGS ${layer === 'imagery' ? 'imagery' : 'topo'} sections...`);
    let loaded = 0;
    let failed = 0;
    tiles.forEach((tile) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (overlay.loadingKey !== loadingKey) return;
        loaded += 1;
        overlay.tiles.push({ ...tile, img });
        overlay.img = img;
        draw();
        setStatus(`Loaded ${loaded}/${tiles.length} USGS sections${failed ? `, ${failed} failed` : ''}.`);
      };
      img.onerror = () => {
        if (overlay.loadingKey !== loadingKey) return;
        failed += 1;
        setStatus(`Loaded ${loaded}/${tiles.length} USGS sections, ${failed} failed.`);
      };
      img.src = usgsOverlayUrl(layer, tile.bounds);
    });
  }

  function drawReferenceOverlay() {
    if (!overlay.visible || (!overlay.img && !overlay.tiles.length)) return;
    const rect = overlayWorldRect();
    if (!rect) return;
    ctx.save();
    ctx.globalAlpha = overlay.opacity;
    if (overlay.tiles.length) {
      overlay.tiles.forEach((tile) => {
        const x = rect.x + rect.w * (tile.col / tile.cols);
        const y = rect.y + rect.h * (tile.row / tile.rows);
        const w = rect.w / tile.cols;
        const h = rect.h / tile.rows;
        ctx.drawImage(tile.img, x, y, w + 1, h + 1);
      });
    } else {
      ctx.drawImage(overlay.img, rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  }

  function toScreen(p) {
    return { x: (p.x - camera.x) * camera.zoom, y: (p.y - camera.y) * camera.zoom };
  }

  function toMap(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(camera.x + (clientX - rect.left) / camera.zoom),
      y: Math.round(camera.y + (clientY - rect.top) / camera.zoom)
    };
  }

  function draw() {
    syncRoadInspector();
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#18351f';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawMapWorkspace();
    drawReferenceOverlay();
    drawRoadPass(map.roads, (road) => road.w, '#30373d');
    drawRoadPass(map.roads, (road) => Math.max(4, road.w - 18), '#485159');
    const highlightedRoads = new Set(selectedRoads);
    if (selectedRoad >= 0) highlightedRoads.add(selectedRoad);
    highlightedRoads.forEach((roadIdx) => {
      const road = map.roads[roadIdx];
      if (!road) return;
      ctx.strokeStyle = 'rgba(255, 224, 113, 0.9)';
      ctx.lineWidth = Math.max(6, road.w + 10);
      ctx.setLineDash([34, 22]);
      drawRoadPath(road);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    if (currentTool === 'roadEdit' || selectedRoad >= 0) drawRoadEditHandles();
    ctx.restore();

    drawPoints(mission.checkpoints, '#ffdd55', 'C');
    drawPoints(mission.collectibles, '#6be68d', '$');
    drawPoints(mission.chaseRoute, '#ff5c77', 'R');
  }

  function drawMapWorkspace() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.fillRect(0, 0, map.width, map.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = Math.max(8, 2 / camera.zoom);
    ctx.strokeRect(0, 0, map.width, map.height);
    const grid = 500;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = Math.max(2, 1 / camera.zoom);
    ctx.beginPath();
    for (let x = 0; x <= map.width; x += grid) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.height);
    }
    for (let y = 0; y <= map.height; y += grid) {
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
    }
    ctx.stroke();
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
    map.roads.forEach((road) => {
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
      ctx.lineWidth = 6;
      ctx.beginPath();
      const radius = 28;
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
      ctx.font = '800 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STOP', 0, 1);
      ctx.restore();
    });
  }

  function drawRoadEditHandles() {
    const showAllRoads = currentTool === 'roadEdit';
    map.roads.forEach((road, roadIdx) => {
      if (!showAllRoads && roadIdx !== selectedRoad) return;
      road.pts.forEach(([x, y], pointIdx) => {
        const isSelected = roadIdx === selectedRoad && pointIdx === selectedRoadPoint;
        ctx.fillStyle = isSelected ? '#ffe071' : '#f4fbff';
        ctx.strokeStyle = roadIdx === selectedRoad ? '#07100d' : 'rgba(7, 16, 13, 0.72)';
        ctx.lineWidth = isSelected ? 10 : 7;
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 28 : 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
      });
    });
  }

  function drawPoints(points, color, label) {
    points.forEach((p, idx) => {
      const sp = toScreen(p);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#07100d';
      ctx.font = '800 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${label}${idx + 1}`, sp.x, sp.y);
    });
  }

  function placePoint(p) {
    readForm();
    pushUndo(currentTool === 'erase' ? 'Erase marker' : 'Place marker');
    if (currentTool === 'erase') {
      if (eraseNearestStopSign(p)) {
        setStatus('Removed nearest stop sign.');
        draw();
        return;
      }
      const groups = [mission.checkpoints, mission.collectibles, mission.chaseRoute];
      groups.forEach((group) => {
        const idx = group.findIndex((item) => Math.hypot(item.x - p.x, item.y - p.y) < 70);
        if (idx >= 0) group.splice(idx, 1);
      });
      setStatus('Removed nearest mission marker.');
    } else if (currentTool === 'checkpoint') {
      mission.checkpoints.push(p);
      setStatus('Checkpoint added.');
    } else if (currentTool === 'collectible') {
      mission.collectibles.push(p);
      setStatus('Collectible added.');
    } else if (currentTool === 'chase') {
      mission.chaseRoute.push(p);
      setStatus('Chase route node added.');
    }
    draw();
  }

  function nearestRoadIndex(p, pad = 48) {
    let best = { idx: -1, d: Infinity };
    map.roads.forEach((road, idx) => {
      road.pts.forEach((pt, pointIdx) => {
        if (pointIdx >= road.pts.length - 1) return;
        const [x1, y1] = pt;
        const [x2, y2] = road.pts[pointIdx + 1];
        const d = distanceToSegment(p.x, p.y, x1, y1, x2, y2);
        if (d < best.d) best = { idx, d };
      });
    });
    return best.d <= (map.roads[best.idx]?.w || 0) / 2 + pad ? best.idx : -1;
  }

  function nearestRoadPoint(p, pad = 90) {
    let best = { roadIdx: -1, pointIdx: -1, d: Infinity };
    map.roads.forEach((road, roadIdx) => {
      road.pts.forEach(([x, y], pointIdx) => {
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < best.d) best = { roadIdx, pointIdx, d };
      });
    });
    return best.d <= pad ? best : null;
  }

  function nearestRoadSegment(p, pad = 80) {
    let best = { roadIdx: -1, segmentIdx: -1, d: Infinity, x: p.x, y: p.y };
    map.roads.forEach((road, roadIdx) => {
      road.pts.forEach((pt, segmentIdx) => {
        if (segmentIdx >= road.pts.length - 1) return;
        const [x1, y1] = pt;
        const [x2, y2] = road.pts[segmentIdx + 1];
        const projected = projectToSegment(p.x, p.y, x1, y1, x2, y2);
        if (projected.d < best.d) best = { roadIdx, segmentIdx, ...projected };
      });
    });
    return best.d <= pad ? best : null;
  }

  function projectToSegment(x, y, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy;
    const t = len2 ? clamp(((x - x1) * vx + (y - y1) * vy) / len2, 0, 1) : 0;
    const px = Math.round(x1 + vx * t);
    const py = Math.round(y1 + vy * t);
    return { x: px, y: py, d: Math.hypot(x - px, y - py) };
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

  function roadSegments(roads) {
    const segments = [];
    roads.forEach((road, roadIdx) => {
      road.pts.forEach((pt, idx) => {
        if (idx >= road.pts.length - 1) return;
        const [x1, y1] = pt;
        const [x2, y2] = road.pts[idx + 1];
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len < 60) return;
        segments.push({ road, roadIdx, idx, x1, y1, x2, y2, dx: x2 - x1, dy: y2 - y1, len });
      });
    });
    return segments;
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
    const segments = roadSegments(roads).filter((segment) => roadAllowsStopSigns(segment.road));
    for (let i = 0; i < segments.length; i += 1) {
      for (let j = i + 1; j < segments.length; j += 1) {
        const a = segments[i];
        const b = segments[j];
        if (a.roadIdx === b.roadIdx) continue;
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

  function placeStopSign(p) {
    const nearest = nearestRoadSegment(p, 180);
    if (!nearest) {
      setStatus('Click close to a road segment to place a stop sign.');
      return;
    }
    pushUndo('Place stop sign');
    const road = map.roads[nearest.roadIdx];
    const [x1, y1] = road.pts[nearest.segmentIdx];
    const [x2, y2] = road.pts[nearest.segmentIdx + 1];
    const angle = Math.atan2(x2 - x1, y1 - y2);
    stopSigns.push({
      x: Math.round(nearest.x),
      y: Math.round(nearest.y),
      angle,
      roadName: road.name || 'Custom',
      cardinal: cardinalFromAngle(angle),
      auto: false
    });
    setStatus(`Stop sign placed on ${road.name || 'Custom road'}.`);
    draw();
  }

  function eraseNearestStopSign(p) {
    const idx = stopSigns.findIndex((sign) => Math.hypot(sign.x - p.x, sign.y - p.y) < 90);
    if (idx < 0) return false;
    stopSigns.splice(idx, 1);
    return true;
  }

  function snapRoadPoint(p, movingRoadIdx = -1, movingPointIdx = -1) {
    let best = { x: p.x, y: p.y, d: Infinity };
    map.roads.forEach((road, roadIdx) => {
      road.pts.forEach(([x, y], pointIdx) => {
        if (roadIdx === movingRoadIdx && pointIdx === movingPointIdx) return;
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < best.d) best = { x, y, d };
      });
      road.pts.forEach((pt, segmentIdx) => {
        if (segmentIdx >= road.pts.length - 1) return;
        if (roadIdx === movingRoadIdx && (segmentIdx === movingPointIdx || segmentIdx + 1 === movingPointIdx)) return;
        const [x1, y1] = pt;
        const [x2, y2] = road.pts[segmentIdx + 1];
        const projected = projectToSegment(p.x, p.y, x1, y1, x2, y2);
        if (projected.d < best.d) best = projected;
      });
    });
    return best.d <= 70 ? { x: best.x, y: best.y } : p;
  }

  function distanceToSegment(x, y, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy;
    const t = len2 ? clamp(((x - x1) * vx + (y - y1) * vy) / len2, 0, 1) : 0;
    const px = x1 + vx * t;
    const py = y1 + vy * t;
    return Math.hypot(x - px, y - py);
  }

  function beginRoad(p, straight = false) {
    pushUndo(straight ? 'Draw straight road' : 'Draw road');
    const w = clamp(Number(roadWidthEl.value || 190), 80, 320);
    const kind = roadKindEl.value || 'residential';
    activeRoad = { name: `Custom Road ${map.roads.length + 1}`, kind, w, builderRoad: true, straight, pts: [[p.x, p.y]] };
    map.roads.push(activeRoad);
    selectedRoad = map.roads.length - 1;
    selectedRoadPoint = -1;
    pointerMoved = false;
    setStatus(straight ? 'Straight road started. Drag or Shift-click the endpoint.' : 'Drawing road. Drag to add road shape.');
    draw();
  }

  function continueRoad(p) {
    if (!activeRoad) return;
    if (activeRoad.straight) {
      const start = activeRoad.pts[0];
      if (Math.hypot(start[0] - p.x, start[1] - p.y) < 20 && activeRoad.pts.length < 2) return;
      activeRoad.pts[1] = [p.x, p.y];
      pointerMoved = true;
      syncMissionRoads();
      draw();
      return;
    }
    const last = activeRoad.pts[activeRoad.pts.length - 1];
    if (Math.hypot(last[0] - p.x, last[1] - p.y) < 28) return;
    activeRoad.pts.push([p.x, p.y]);
    pointerMoved = true;
    syncMissionRoads();
    draw();
  }

  function finishRoad() {
    if (!activeRoad) return;
    delete activeRoad.straight;
    if (activeRoad.pts.length < 2) {
      map.roads.splice(selectedRoad, 1);
      selectedRoad = -1;
      setStatus('Road needs a drag line before it is added.');
    } else {
      syncMissionRoads();
      setStatus('Road added.');
    }
    activeRoad = null;
    straightRoadClick = false;
    draw();
  }

  function selectRoad(p) {
    selectedRoad = nearestRoadIndex(p);
    selectedRoadPoint = -1;
    if (selectedRoad >= 0) {
      roadWidthEl.value = String(Math.round(map.roads[selectedRoad].w));
      roadWidthValueEl.textContent = roadWidthEl.value;
      setStatus('Road selected. Use the width slider to resize it.');
    } else {
      setStatus('No road found there.');
    }
    draw();
  }

  function eraseRoad(p) {
    const idx = nearestRoadIndex(p);
    if (idx < 0) {
      setStatus('No road found there.');
      return;
    }
    pushUndo('Erase road');
    map.roads.splice(idx, 1);
    selectedRoad = -1;
    selectedRoads.clear();
    syncMissionRoads();
    draw();
    setStatus('Road erased.');
  }

  function beginRoadEdit(p) {
    const point = nearestRoadPoint(p);
    if (point) {
      pushUndo('Move road node');
      selectedRoad = point.roadIdx;
      selectedRoadPoint = point.pointIdx;
      roadPointDrag = { roadIdx: point.roadIdx, pointIdx: point.pointIdx };
      canvas.style.cursor = 'grabbing';
      setStatus('Road node selected. Drag it to correct the connection.');
      draw();
      return true;
    }
    const segment = nearestRoadSegment(p);
    if (!segment) {
      selectedRoad = -1;
      selectedRoadPoint = -1;
      setStatus('No road node or segment found there.');
      draw();
      return false;
    }
    const road = map.roads[segment.roadIdx];
    pushUndo('Insert road node');
    road.pts.splice(segment.segmentIdx + 1, 0, [segment.x, segment.y]);
    selectedRoad = segment.roadIdx;
    selectedRoadPoint = segment.segmentIdx + 1;
    roadPointDrag = { roadIdx: selectedRoad, pointIdx: selectedRoadPoint };
    syncMissionRoads();
    canvas.style.cursor = 'grabbing';
    setStatus('Road node inserted. Drag it into place.');
    draw();
    return true;
  }

  function moveRoadEditPoint(p) {
    if (!roadPointDrag) return;
    const road = map.roads[roadPointDrag.roadIdx];
    if (!road?.pts[roadPointDrag.pointIdx]) return;
    const snapped = snapRoadPoint(p, roadPointDrag.roadIdx, roadPointDrag.pointIdx);
    road.pts[roadPointDrag.pointIdx] = [snapped.x, snapped.y];
    selectedRoad = roadPointDrag.roadIdx;
    selectedRoadPoint = roadPointDrag.pointIdx;
    syncMissionRoads();
    draw();
  }

  function finishRoadEditPoint() {
    if (!roadPointDrag) return;
    roadPointDrag = null;
    canvas.style.cursor = 'crosshair';
    setStatus('Road node moved. Save Practice Roads when the 47351 layout looks right.');
  }

  function deleteRoadEditPoint(p) {
    const point = nearestRoadPoint(p);
    if (!point) {
      setStatus('No road node found there.');
      return;
    }
    const road = map.roads[point.roadIdx];
    if (!road) return;
    pushUndo('Delete road node');
    if (road.pts.length <= 2) {
      map.roads.splice(point.roadIdx, 1);
      selectedRoad = -1;
      selectedRoadPoint = -1;
      setStatus('Road removed because it only had two nodes.');
    } else {
      road.pts.splice(point.pointIdx, 1);
      selectedRoad = point.roadIdx;
      selectedRoadPoint = Math.min(point.pointIdx, road.pts.length - 1);
      setStatus('Road node deleted.');
    }
    syncMissionRoads();
    draw();
  }

  function selectRoadForBulk(idx, append = false) {
    if (!append) selectedRoads.clear();
    if (idx >= 0) {
      if (append && selectedRoads.has(idx)) selectedRoads.delete(idx);
      else selectedRoads.add(idx);
      selectedRoad = idx;
      selectedRoadPoint = -1;
      setStatus(`${selectedRoads.size} road${selectedRoads.size === 1 ? '' : 's'} selected.`);
    } else {
      selectedRoad = -1;
      selectedRoadPoint = -1;
      setStatus('No road found there.');
    }
    draw();
  }

  function selectAllRoads() {
    selectedRoads.clear();
    map.roads.forEach((_, idx) => selectedRoads.add(idx));
    selectedRoad = map.roads.length ? 0 : -1;
    selectedRoadPoint = -1;
    draw();
    setStatus(`${selectedRoads.size} roads selected.`);
  }

  function deleteSelectedRoads() {
    if (!selectedRoads.size && selectedRoad >= 0) selectedRoads.add(selectedRoad);
    if (!selectedRoads.size) {
      setStatus('No selected roads to delete.');
      return;
    }
    pushUndo('Delete selected roads');
    const remove = new Set(selectedRoads);
    map.roads = map.roads.filter((_, idx) => !remove.has(idx));
    selectedRoads.clear();
    selectedRoad = -1;
    selectedRoadPoint = -1;
    syncMissionRoads();
    draw();
    setStatus('Selected roads deleted.');
  }

  function beginRoadSelectionDrag(event, p) {
    const idx = nearestRoadIndex(p);
    if (idx < 0) {
      selectedRoads.clear();
      selectedRoad = -1;
      selectedRoadPoint = -1;
      draw();
      setStatus('No road found there.');
      return;
    }
    if (!selectedRoads.has(idx)) selectRoadForBulk(idx, event.shiftKey || event.ctrlKey || event.metaKey);
    if (!selectedRoads.size) return;
    roadSelectionDrag = {
      start: p,
      roads: Array.from(selectedRoads),
      original: new Map(Array.from(selectedRoads).map((roadIdx) => [roadIdx, map.roads[roadIdx].pts.map(([x, y]) => [x, y])])),
      undoPushed: false
    };
    capturePointer(event);
    canvas.style.cursor = 'grabbing';
  }

  function moveRoadSelectionDrag(p) {
    if (!roadSelectionDrag) return;
    const dx = Math.round(p.x - roadSelectionDrag.start.x);
    const dy = Math.round(p.y - roadSelectionDrag.start.y);
    if (!dx && !dy) return;
    if (!roadSelectionDrag.undoPushed) {
      pushUndo('Move selected roads');
      roadSelectionDrag.undoPushed = true;
    }
    roadSelectionDrag.roads.forEach((roadIdx) => {
      const road = map.roads[roadIdx];
      const original = roadSelectionDrag.original.get(roadIdx);
      if (!road || !original) return;
      road.pts = original.map(([x, y]) => [x + dx, y + dy]);
    });
    expandMapToFitRoads();
    syncMissionRoads();
    draw();
  }

  function finishRoadSelectionDrag() {
    if (!roadSelectionDrag) return;
    const moved = roadSelectionDrag.undoPushed;
    roadSelectionDrag = null;
    canvas.style.cursor = currentTool === 'roadSelect' ? 'grab' : 'crosshair';
    setStatus(moved ? `${selectedRoads.size} selected road${selectedRoads.size === 1 ? '' : 's'} moved.` : `${selectedRoads.size} road${selectedRoads.size === 1 ? '' : 's'} selected.`);
  }

  function beginPan(event) {
    panDrag = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: camera.x,
      y: camera.y
    };
    capturePointer(event);
    canvas.style.cursor = 'grabbing';
  }

  function capturePointer(event) {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic test events may not have an active browser pointer to capture.
    }
  }

  function movePan(event) {
    if (!panDrag) return;
    camera.x = panDrag.x - (event.clientX - panDrag.clientX) / camera.zoom;
    camera.y = panDrag.y - (event.clientY - panDrag.clientY) / camera.zoom;
    clampCamera();
    draw();
  }

  function finishPan() {
    if (!panDrag) return;
    panDrag = null;
    canvas.style.cursor = currentTool === 'pan' ? 'grab' : 'crosshair';
  }

  function renderMissionList() {
    const list = loadSaved();
    if (!list.length) {
      missionListEl.innerHTML = '<p>No saved missions yet.</p>';
      return;
    }
    missionListEl.innerHTML = list.map((m, idx) => `
      <div class="mission-row">
        <strong>${escapeHtml(m.title || 'Untitled Mission')}</strong>
        <span>${m.checkpoints?.length || 0} checkpoints, ${m.collectibles?.length || 0} collectibles, ${m.chaseRoute?.length || 0} chase nodes</span>
        <button type="button" data-load="${idx}">Load</button>
      </div>
    `).join('');
    missionListEl.querySelectorAll('button[data-load]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-load') || 0);
        mission = normalizeMission(loadSaved()[idx]);
        if (mission.roads.length) map.roads = cloneRoads(mission.roads);
        selectedRoad = -1;
        selectedRoadPoint = -1;
        writeForm();
        draw();
        setStatus('Mission loaded.');
      });
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  document.querySelectorAll('.tool-grid button[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTool = btn.getAttribute('data-tool') || 'checkpoint';
      document.querySelectorAll('.tool-grid button').forEach((b) => b.classList.toggle('active', b === btn));
      canvas.style.cursor = (currentTool === 'pan' || currentTool === 'roadSelect') ? 'grab' : 'crosshair';
      setStatus(`Tool: ${btn.textContent}`);
    });
  });

  [titleEl, dispatchEl, typeEl].forEach((el) => el.addEventListener('input', () => readForm()));

  document.getElementById('saveMissionBtn').addEventListener('click', () => {
    readForm();
    syncMissionRoads();
    const list = loadSaved();
    const existing = list.findIndex((m) => m.id === mission.id);
    if (existing >= 0) list[existing] = mission;
    else list.unshift(mission);
    saveList(list);
    setStatus('Mission saved. The game can dispatch saved missions from this browser.');
  });

  document.getElementById('newMissionBtn').addEventListener('click', () => {
    pushUndo('New mission');
    mission = emptyMission();
    syncMissionRoads();
    selectedRoad = -1;
    selectedRoadPoint = -1;
    selectedRoads.clear();
    writeForm();
    draw();
    setStatus('New mission started.');
  });

  document.getElementById('exportMissionBtn').addEventListener('click', () => {
    readForm();
    syncMissionRoads();
    const blob = new Blob([JSON.stringify(mission, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${mission.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'mission'}.patrol-mission.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('copyMissionBtn').addEventListener('click', async () => {
    readForm();
    syncMissionRoads();
    await navigator.clipboard?.writeText(JSON.stringify(mission, null, 2));
    setStatus('Mission JSON copied.');
  });

  document.getElementById('importMissionBtn').addEventListener('click', () => {
    try {
      pushUndo('Import mission');
      mission = normalizeMission(JSON.parse(importEl.value || '{}'));
      if (mission.roads.length) map.roads = cloneRoads(mission.roads);
      selectedRoad = -1;
      selectedRoadPoint = -1;
      selectedRoads.clear();
      writeForm();
      draw();
      setStatus('Mission imported.');
    } catch {
      setStatus('Import failed: invalid JSON.');
    }
  });

  [roadNameEl, roadKindEl, roadWidthEl].forEach((el) => {
    el.addEventListener('focus', () => armRoadInspectorUndo());
    el.addEventListener('blur', () => { roadInspectorUndoArmed = false; });
  });

  roadNameEl.addEventListener('input', () => {
    const idx = singleInspectedRoadIndex();
    if (idx < 0 || !map.roads[idx]) return;
    armRoadInspectorUndo('Rename road');
    map.roads[idx].name = roadNameEl.value.trim();
    syncMissionRoads();
    draw();
    setStatus(map.roads[idx].name ? `Road named ${map.roads[idx].name}.` : 'Road name cleared.');
  });

  roadKindEl.addEventListener('change', () => {
    const indices = inspectedRoadIndices();
    if (!indices.length) return;
    const kind = roadKindEl.value || 'residential';
    armRoadInspectorUndo('Change road type');
    const width = roadKindDefaultWidth(kind);
    indices.forEach((idx) => {
      if (!map.roads[idx]) return;
      map.roads[idx].kind = kind;
      map.roads[idx].w = width;
    });
    roadWidthEl.value = String(width);
    roadWidthValueEl.textContent = String(width);
    syncMissionRoads();
    draw();
    setStatus(kind === 'alley' || kind === 'service'
      ? 'Marked as a narrow road with no yellow centerline.'
      : 'Road type updated.');
  });

  roadWidthEl.addEventListener('input', () => {
    const width = clamp(Number(roadWidthEl.value || 190), 80, 320);
    roadWidthValueEl.textContent = String(width);
    const indices = inspectedRoadIndices();
    if (indices.length) {
      armRoadInspectorUndo('Resize road');
      indices.forEach((idx) => {
        if (map.roads[idx]) map.roads[idx].w = width;
      });
      syncMissionRoads();
      draw();
      setStatus('Road width updated.');
    }
  });

  document.getElementById('resetRoadsBtn').addEventListener('click', () => {
    pushUndo('Reset roads');
    map.roads = loadGameRoads();
    stopSigns = loadGameStopSigns();
    applyGameMapSize();
    selectedRoad = -1;
    selectedRoadPoint = -1;
    selectedRoads.clear();
    syncMissionRoads();
    draw();
    setStatus('Roads reset to the game map.');
  });

  document.getElementById('loadGameMapBtn').addEventListener('click', () => {
    pushUndo('Load game map');
    loadMapFromGame();
    draw();
    setStatus('Loaded the current game map from map.js.');
  });

  document.getElementById('saveGameMapBtn').addEventListener('click', async () => {
    syncMissionRoads();
    await saveGameMapFile();
  });

  document.getElementById('undoBtn').addEventListener('click', undoLastChange);
  document.getElementById('pasteBtn').addEventListener('click', pasteFromClipboard);
  document.getElementById('selectAllRoadsBtn').addEventListener('click', selectAllRoads);
  document.getElementById('deleteSelectedRoadsBtn').addEventListener('click', deleteSelectedRoads);
  document.getElementById('smoothRoadsBtn').addEventListener('click', smoothRoads);

  document.getElementById('zoomInBtn').addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.22);
  });

  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1 / 1.22);
  });

  document.getElementById('fitMapBtn').addEventListener('click', () => {
    fitCameraToMap();
    draw();
    setStatus('Map view fit to the full road layout.');
  });

  overlayOpacityEl.addEventListener('input', () => {
    overlay.opacity = Number(overlayOpacityEl.value || 0.55);
    overlayOpacityValueEl.textContent = `${Math.round(overlay.opacity * 100)}%`;
    draw();
  });
  overlayScaleEl.addEventListener('input', () => {
    overlay.scale = clamp(Number(overlayScaleEl.value || 1), 0.75, 1.35);
    overlayScaleValueEl.textContent = `${Math.round(overlay.scale * 100)}%`;
    draw();
  });
  overlayPaddingEl.addEventListener('input', () => {
    overlay.padding = clamp(Number(overlayPaddingEl.value || 0), 0, 0.25);
    overlayPaddingValueEl.textContent = `${Math.round(overlay.padding * 100)}%`;
    if (overlay.img) loadReferenceOverlay(overlay.source || 'topo');
    else draw();
  });

  document.getElementById('loadTopoOverlayBtn').addEventListener('click', () => loadReferenceOverlay('topo'));
  document.getElementById('loadImageOverlayBtn').addEventListener('click', () => loadReferenceOverlay('imagery'));
  document.getElementById('lockOverlayBtn').addEventListener('click', saveOverlayLock);
  document.getElementById('toggleOverlayBtn').addEventListener('click', () => {
    overlay.visible = !overlay.visible;
    document.getElementById('toggleOverlayBtn').textContent = overlay.visible ? 'Hide Overlay' : 'Show Overlay';
    draw();
  });
  document.getElementById('resetOverlayBtn').addEventListener('click', () => {
    overlay.dx = 0;
    overlay.dy = 0;
    overlay.scale = 1;
    overlayScaleEl.value = '1';
    overlayScaleValueEl.textContent = '100%';
    draw();
    setStatus('Reference overlay reset to geographic lock.');
  });
  document.getElementById('overlayLeftBtn').addEventListener('click', () => { overlay.dx -= 20 / camera.zoom; draw(); });
  document.getElementById('overlayRightBtn').addEventListener('click', () => { overlay.dx += 20 / camera.zoom; draw(); });
  document.getElementById('overlayUpBtn').addEventListener('click', () => { overlay.dy -= 20 / camera.zoom; draw(); });
  document.getElementById('overlayDownBtn').addEventListener('click', () => { overlay.dy += 20 / camera.zoom; draw(); });

  document.getElementById('savePracticeRoadsBtn').addEventListener('click', () => {
    syncMissionRoads();
    savePracticeRoads();
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (currentTool === 'pan' || event.button === 1 || event.button === 2) {
      event.preventDefault();
      beginPan(event);
      return;
    }
    const p = toMap(event.clientX, event.clientY);
    if (currentTool === 'roadSelect') {
      beginRoadSelectionDrag(event, p);
    } else if (currentTool === 'roadDraw') {
      capturePointer(event);
      if (event.shiftKey && activeRoad?.straight && straightRoadClick) {
        continueRoad(p);
        finishRoad();
      } else {
        straightRoadClick = event.shiftKey;
        beginRoad(p, event.shiftKey);
      }
    } else if (currentTool === 'roadEdit') {
      capturePointer(event);
      beginRoadEdit(p);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (panDrag) {
      movePan(event);
    } else if (roadSelectionDrag) {
      moveRoadSelectionDrag(toMap(event.clientX, event.clientY));
    } else if (activeRoad) {
      continueRoad(toMap(event.clientX, event.clientY));
    } else if (roadPointDrag) {
      moveRoadEditPoint(toMap(event.clientX, event.clientY));
    }
  });

  canvas.addEventListener('pointerup', (event) => {
    if (panDrag) {
      finishPan();
      return;
    }
    if (roadSelectionDrag) {
      moveRoadSelectionDrag(toMap(event.clientX, event.clientY));
      finishRoadSelectionDrag();
      return;
    }
    const p = toMap(event.clientX, event.clientY);
    if (activeRoad) {
      if (straightRoadClick && activeRoad.straight && activeRoad.pts.length < 2) return;
      continueRoad(p);
      finishRoad();
      return;
    }
    if (roadPointDrag) {
      moveRoadEditPoint(p);
      finishRoadEditPoint();
      return;
    }
    if (currentTool === 'roadResize') selectRoad(p);
    else if (currentTool === 'roadErase') eraseRoad(p);
    else if (currentTool === 'roadEdit') beginRoadEdit(p);
    else if (currentTool === 'roadSelect') return;
    else if (currentTool === 'roadDraw') return;
    else if (currentTool === 'stopSign') placeStopSign(p);
    else placePoint(p);
  });

  canvas.addEventListener('dblclick', (event) => {
    if (currentTool !== 'roadEdit') return;
    deleteRoadEditPoint(toMap(event.clientX, event.clientY));
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.16 : 1 / 1.16);
  }, { passive: false });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || isTextEntryTarget(event.target)) return;
    const key = event.key.toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      undoLastChange();
    } else if (key === 'v') {
      event.preventDefault();
      pasteFromClipboard();
    } else if (key === 'a') {
      event.preventDefault();
      selectAllRoads();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (isTextEntryTarget(event.target)) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelectedRoads();
    }
  });

  canvas.addEventListener('pointercancel', () => {
    finishPan();
    finishRoadSelectionDrag();
    finishRoad();
    finishRoadEditPoint();
  });
  window.addEventListener('resize', resize);

  normalizeMapGeometry();
  applySavedOverlaySettings();
  renderMissionList();
  writeForm();
  resize();
})();
