(() => {
  const canvas = document.getElementById('builderCanvas');
  const ctx = canvas.getContext('2d');
  const titleEl = document.getElementById('missionTitle');
  const dispatchEl = document.getElementById('dispatchText');
  const typeEl = document.getElementById('missionType');
  const importEl = document.getElementById('missionImport');
  const statusEl = document.getElementById('builderStatus');
  const missionListEl = document.getElementById('missionList');
  const roadWidthEl = document.getElementById('roadWidth');
  const roadWidthValueEl = document.getElementById('roadWidthValue');
  const STORAGE_KEY = 'patrol.customMissions.v1';
  const LEGACY_STORAGE_KEY = 'sovereignCitizen.customMissions.v1';
  const PRACTICE_MAP_KEY = 'patrol.practiceRoads.v1';

  let map = { width: 3000, height: 2200, roads: [] };
  let currentTool = 'checkpoint';
  let mission = emptyMission();
  let selectedRoad = -1;
  let activeRoad = null;
  let pointerMoved = false;

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

  function syncMissionRoads() {
    mission.roads = cloneRoads(map.roads);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  async function loadMapFromGame() {
    const text = await fetch('game.js').then((r) => r.text());
    const marker = 'roads: [';
    const start = text.indexOf(marker);
    if (start < 0) return;
    const arrStart = text.indexOf('[', start);
    let depth = 0;
    let end = -1;
    for (let i = arrStart; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '[') depth += 1;
      if (ch === ']') {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end < 0) return;
    map.roads = Function(`"use strict"; return (${text.slice(arrStart, end)});`)();
    normalizeMapGeometry();
  }

  function normalizeMapGeometry() {
    map.width = 6200;
    map.height = 4600;
    map.roads = loadPracticeRoads();
    if (!map.roads.length) map.roads = buildTownCoreRoads();
    syncMissionRoads();
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

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function scale() {
    const rect = canvas.getBoundingClientRect();
    return Math.min(rect.width / map.width, rect.height / map.height);
  }

  function toScreen(p) {
    const rect = canvas.getBoundingClientRect();
    const s = scale();
    const ox = (rect.width - map.width * s) / 2;
    const oy = (rect.height - map.height * s) / 2;
    return { x: ox + p.x * s, y: oy + p.y * s };
  }

  function toMap(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const s = scale();
    const ox = (rect.width - map.width * s) / 2;
    const oy = (rect.height - map.height * s) / 2;
    return {
      x: Math.round((clientX - rect.left - ox) / s),
      y: Math.round((clientY - rect.top - oy) / s)
    };
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#18351f';
    ctx.fillRect(0, 0, rect.width, rect.height);
    const s = scale();
    const ox = (rect.width - map.width * s) / 2;
    const oy = (rect.height - map.height * s) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawRoadPass(map.roads, (road) => road.w, '#30373d');
    drawRoadPass(map.roads, (road) => Math.max(4, road.w - 18), '#485159');
    if (selectedRoad >= 0 && map.roads[selectedRoad]) {
      const road = map.roads[selectedRoad];
      ctx.strokeStyle = 'rgba(255, 224, 113, 0.9)';
      ctx.lineWidth = Math.max(6, road.w + 10);
      ctx.setLineDash([34, 22]);
      drawRoadPath(road);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    drawPoints(mission.checkpoints, '#ffdd55', 'C');
    drawPoints(mission.collectibles, '#6be68d', '$');
    drawPoints(mission.chaseRoute, '#ff5c77', 'R');
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
    if (currentTool === 'erase') {
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

  function distanceToSegment(x, y, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy;
    const t = len2 ? clamp(((x - x1) * vx + (y - y1) * vy) / len2, 0, 1) : 0;
    const px = x1 + vx * t;
    const py = y1 + vy * t;
    return Math.hypot(x - px, y - py);
  }

  function beginRoad(p) {
    const w = clamp(Number(roadWidthEl.value || 190), 80, 320);
    activeRoad = { name: `Custom Road ${map.roads.length + 1}`, kind: 'residential', w, builderRoad: true, pts: [[p.x, p.y]] };
    map.roads.push(activeRoad);
    selectedRoad = map.roads.length - 1;
    pointerMoved = false;
    setStatus('Drawing road. Drag to add road shape.');
    draw();
  }

  function continueRoad(p) {
    if (!activeRoad) return;
    const last = activeRoad.pts[activeRoad.pts.length - 1];
    if (Math.hypot(last[0] - p.x, last[1] - p.y) < 28) return;
    activeRoad.pts.push([p.x, p.y]);
    pointerMoved = true;
    syncMissionRoads();
    draw();
  }

  function finishRoad() {
    if (!activeRoad) return;
    if (activeRoad.pts.length < 2) {
      map.roads.splice(selectedRoad, 1);
      selectedRoad = -1;
      setStatus('Road needs a drag line before it is added.');
    } else {
      syncMissionRoads();
      setStatus('Road added.');
    }
    activeRoad = null;
    draw();
  }

  function selectRoad(p) {
    selectedRoad = nearestRoadIndex(p);
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
    map.roads.splice(idx, 1);
    selectedRoad = -1;
    syncMissionRoads();
    draw();
    setStatus('Road erased.');
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
    mission = emptyMission();
    syncMissionRoads();
    selectedRoad = -1;
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
      mission = normalizeMission(JSON.parse(importEl.value || '{}'));
      if (mission.roads.length) map.roads = cloneRoads(mission.roads);
      selectedRoad = -1;
      writeForm();
      draw();
      setStatus('Mission imported.');
    } catch {
      setStatus('Import failed: invalid JSON.');
    }
  });

  roadWidthEl.addEventListener('input', () => {
    const width = clamp(Number(roadWidthEl.value || 190), 80, 320);
    roadWidthValueEl.textContent = String(width);
    if (selectedRoad >= 0 && map.roads[selectedRoad]) {
      map.roads[selectedRoad].w = width;
      syncMissionRoads();
      draw();
      setStatus('Road width updated.');
    }
  });

  document.getElementById('resetRoadsBtn').addEventListener('click', () => {
    map.roads = buildTownCoreRoads();
    selectedRoad = -1;
    syncMissionRoads();
    draw();
    setStatus('Roads reset to the town layout.');
  });

  document.getElementById('savePracticeRoadsBtn').addEventListener('click', () => {
    syncMissionRoads();
    savePracticeRoads();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const p = toMap(event.clientX, event.clientY);
    if (currentTool === 'roadDraw') {
      canvas.setPointerCapture(event.pointerId);
      beginRoad(p);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!activeRoad) return;
    continueRoad(toMap(event.clientX, event.clientY));
  });

  canvas.addEventListener('pointerup', (event) => {
    const p = toMap(event.clientX, event.clientY);
    if (activeRoad) {
      continueRoad(p);
      finishRoad();
      return;
    }
    if (currentTool === 'roadResize') selectRoad(p);
    else if (currentTool === 'roadErase') eraseRoad(p);
    else placePoint(p);
  });

  canvas.addEventListener('pointercancel', finishRoad);
  window.addEventListener('resize', resize);

  loadMapFromGame().finally(() => {
    renderMissionList();
    writeForm();
    resize();
  });
})();
