(() => {
  const RESOURCE_LINES = [
    { id: "ferrite", name: "Ferrite Ore", category: "mineral", requirement: 380, chipColor: "#d99a63", goalLabel: "Refinery Tower", accent: "#f7bc84" },
    { id: "lithium", name: "Lithium Crystal", category: "mineral", requirement: 290, chipColor: "#8ec7ff", goalLabel: "Crystal Well", accent: "#9dd5ff" },
    { id: "titanium", name: "Titanium Vein", category: "mineral", requirement: 340, chipColor: "#b2b7ce", goalLabel: "Mountain Drill", accent: "#d1d5e9" },
    { id: "spore", name: "Spore Genome", category: "genetic", requirement: 260, chipColor: "#8bf28b", goalLabel: "Bio Dome", accent: "#afffae" },
    { id: "algae", name: "Algae DNA", category: "genetic", requirement: 300, chipColor: "#68d6af", goalLabel: "Gen Lab", accent: "#9deecf" },
    { id: "xeno", name: "Xeno Seed Core", category: "genetic", requirement: 320, chipColor: "#ddb5ff", goalLabel: "Gene Spire", accent: "#ebd0ff" }
  ];

  const STORAGE_KEY = "tibertron2000-save-v1";
  const COCKPIT_LAYOUT_KEY = "tibertron2000-cockpit-layout-v1";
  const COCKPIT_LAYOUT_LOCK_KEY = "tibertron2000-cockpit-layout-lock-v1";
  const MAX_LEVEL = 10;
  const PLAYER_WIDTH = 92;
  const PLAYER_HEIGHT = 50;
  const SHOT_COOLDOWN = 0.18;
  const ENEMY_SIZE_MULT = 1.3;
  const BUGGY_MAX_HEALTH = 100;
  const BUGGY_HIT_IFRAMES = 0.42;
  const GOAL_BUILDING_SPRITES = {
    mineral: [
      "images/scifi/scifi_alien_base_792x276.webp",
      "images/scifi/scifi_home_modular_ring_792x276.webp"
    ],
    genetic: [
      "images/scifi/scifi_alien_firebasewithufos.webp",
      "images/scifi/scifi_alien_plant.webp"
    ]
  };

  const ASSET_LIBRARY = {
    moonBuggy: { key: "moonBuggy", label: "Moon Buggy", path: "images/vehicles/moonbuggy1.webp" },
    backgrounds: [
      "images/scifi/scifi_background_alienplanet1_wide_792x276.webp",
      "images/scifi/scifi_background_alienplanet3_wide_792x276.webp",
      "images/scifi/scifi_background_alienplanet_crimson_wide_792x276.webp"
    ],
    enemySprites: {
      drone: [
        "images/scifi/scifi_ufo_small_saucer_459x145.webp",
        "images/scifi/scifi_ufo_medium_delta_459x145.webp",
        "images/scifi/scifi_ufo_large_cigar_459x145.webp",
        "images/scifi/scifi_ufo_920x416.webp"
      ],
      crawler: [
        "images/scifi/scifi_vehicle_hoverbike_459x145.webp",
        "images/scifi/scifi_vehicle_hovercar_compact_459x145.webp",
        "images/scifi/scifi_vehicle_fighter_459x145.webp",
        "images/scifi/scifi_vehicle_flyingpod_459x145.webp",
        "images/scifi/scifi_vehicle_armoredtransport_459x145.webp"
      ]
    }
  };
  const DASHBOARD_PLANETS = ["AETHERIS", "DUSKARA", "IRONHEART", "KRYON", "NEBULON"];

  const dashboardScreen = document.getElementById("dashboardScreen");
  const dashboardSummary = document.getElementById("dashboardSummary");
  const resourceGrid = document.getElementById("resourceGrid");
  const importLevelBtn = document.getElementById("importLevelBtn");
  const importLevelInput = document.getElementById("importLevelInput");
  const resetSaveBtn = document.getElementById("resetSaveBtn");
  const cockpitBgA = document.getElementById("cockpitBgA");
  const cockpitBgB = document.getElementById("cockpitBgB");
  const cockpitFireTransition = document.getElementById("cockpitFireTransition");
  const cockpitWrap = document.getElementById("cockpitWrap");
  const cockpitMainViewport = document.getElementById("cockpitMainViewport");
  const cockpitBottomMidPanel = document.getElementById("cockpitBottomMidPanel");
  const cockpitAdjustBtn = document.getElementById("cockpitAdjustBtn");
  const cockpitSaveLayoutBtn = document.getElementById("cockpitSaveLayoutBtn");
  const cockpitResetLayoutBtn = document.getElementById("cockpitResetLayoutBtn");
  const cockpitLockLayoutBtn = document.getElementById("cockpitLockLayoutBtn");
  const cockpitPlanetPanels = [
    document.getElementById("cockpitLeftPanel"),
    document.getElementById("cockpitTopLeftPanel"),
    document.getElementById("cockpitTopMidPanel"),
    document.getElementById("cockpitTopRightPanel"),
    document.getElementById("cockpitRightPanel")
  ];

  const missionScreen = document.getElementById("missionScreen");
  const hud = document.getElementById("hud");
  const returnShipBtn = document.getElementById("returnShipBtn");
  const restartCheckpointBtn = document.getElementById("restartCheckpointBtn");
  const toDashboardBtn = document.getElementById("toDashboardBtn");
  const fireFab = document.getElementById("fireFab");
  const deathOverlay = document.getElementById("deathOverlay");
  const deathMessage = document.getElementById("deathMessage");
  const deathStats = document.getElementById("deathStats");
  const respawnBtn = document.getElementById("respawnBtn");
  const bankReturnBtn = document.getElementById("bankReturnBtn");
  const completeOverlay = document.getElementById("completeOverlay");
  const completeMessage = document.getElementById("completeMessage");
  const nextMissionBtn = document.getElementById("nextMissionBtn");
  const completeDashboardBtn = document.getElementById("completeDashboardBtn");

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const inputState = { left: false, right: false, jump: false, boost: false, fire: false };
  const imageCache = new Map();

  const runtime = {
    active: false,
    mission: null,
    resource: null,
    player: null,
    cameraX: 0,
    runCollected: 0,
    dead: false,
    completed: false,
    importedMode: false,
    importedLabel: "",
    lastCheckpointX: 90,
    lastCheckpointLabel: "Ship Pad",
    bullets: [],
    enemyBullets: [],
    fireCooldown: 0,
    effects: [],
    aim: { x: 0, y: 0, active: false },
    health: BUGGY_MAX_HEALTH,
    maxHealth: BUGGY_MAX_HEALTH,
    damageCooldown: 0,
    ticks: 0,
    lastTime: 0,
    raf: null
  };
  const dashboardUi = {
    selectedLineId: RESOURCE_LINES[0]?.id || "",
    viewMode: "orbit",
    selectedPlanetScreenId: "",
    layoutEditMode: false,
    layoutLocked: false,
    highlightLaunchUntilMs: 0,
    highlightOrbitUntilMs: 0
  };
  const cockpitPanels = [
    "cockpitMainViewport",
    "cockpitLeftPanel",
    "cockpitTopLeftPanel",
    "cockpitTopMidPanel",
    "cockpitTopRightPanel",
    "cockpitBottomMidPanel",
    "cockpitRightPanel"
  ];
  const cockpitDefaultLayout = {
    cockpitMainViewport: { left: 41, top: 76, width: 18, height: 12 },
    cockpitLeftPanel: { left: 8, top: 68, width: 9, height: 12 },
    cockpitTopLeftPanel: { left: 28, top: 58, width: 11, height: 14 },
    cockpitTopMidPanel: { left: 41, top: 58, width: 11, height: 14 },
    cockpitTopRightPanel: { left: 54, top: 58, width: 11, height: 14 },
    cockpitBottomMidPanel: { left: 41, top: 76, width: 11, height: 12 },
    cockpitRightPanel: { left: 78, top: 68, width: 9, height: 12 }
  };
  let cockpitEditState = null;
  let cockpitBgLayerIndex = 0;
  let cockpitBgCurrentPath = "";
  let cockpitFireTimer = null;

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizePanelRect(rect) {
    const left = clamp(safeNumber(rect?.left, 0), 0, 98);
    const top = clamp(safeNumber(rect?.top, 0), 0, 98);
    const width = clamp(safeNumber(rect?.width, 10), 4, 100);
    const height = clamp(safeNumber(rect?.height, 10), 4, 100);
    const skewX = clamp(safeNumber(rect?.skewX, 0), -35, 35);
    const skewY = clamp(safeNumber(rect?.skewY, 0), -35, 35);
    const rotate = clamp(safeNumber(rect?.rotate, 0), -180, 180);
    const maxLeft = Math.max(0, 100 - width);
    const maxTop = Math.max(0, 100 - height);
    const out = {
      left: clamp(left, 0, maxLeft),
      top: clamp(top, 0, maxTop),
      width,
      height,
      skewX,
      skewY,
      rotate
    };
    const inCorners = rect?.corners;
    if (inCorners && typeof inCorners === "object") {
      out.corners = {
        tl: { x: clamp(safeNumber(inCorners?.tl?.x, out.left), 0, 100), y: clamp(safeNumber(inCorners?.tl?.y, out.top), 0, 100) },
        tr: { x: clamp(safeNumber(inCorners?.tr?.x, out.left + out.width), 0, 100), y: clamp(safeNumber(inCorners?.tr?.y, out.top), 0, 100) },
        br: { x: clamp(safeNumber(inCorners?.br?.x, out.left + out.width), 0, 100), y: clamp(safeNumber(inCorners?.br?.y, out.top + out.height), 0, 100) },
        bl: { x: clamp(safeNumber(inCorners?.bl?.x, out.left), 0, 100), y: clamp(safeNumber(inCorners?.bl?.y, out.top + out.height), 0, 100) }
      };
    } else {
      out.corners = {
        tl: { x: out.left, y: out.top },
        tr: { x: out.left + out.width, y: out.top },
        br: { x: out.left + out.width, y: out.top + out.height },
        bl: { x: out.left, y: out.top + out.height }
      };
    }
    return out;
  }

  function getPanelRectFromElement(el) {
    if (!el) return { left: 0, top: 0, width: 10, height: 10 };
    const rect = {
      left: parseFloat(el.style.left || ""),
      top: parseFloat(el.style.top || ""),
      width: parseFloat(el.style.width || ""),
      height: parseFloat(el.style.height || ""),
      skewX: parseFloat(el.dataset.skewX || "0"),
      skewY: parseFloat(el.dataset.skewY || "0"),
      rotate: parseFloat(el.dataset.rotate || "0"),
      corners: {
        tl: { x: parseFloat(el.dataset.cornerTlX || "NaN"), y: parseFloat(el.dataset.cornerTlY || "NaN") },
        tr: { x: parseFloat(el.dataset.cornerTrX || "NaN"), y: parseFloat(el.dataset.cornerTrY || "NaN") },
        br: { x: parseFloat(el.dataset.cornerBrX || "NaN"), y: parseFloat(el.dataset.cornerBrY || "NaN") },
        bl: { x: parseFloat(el.dataset.cornerBlX || "NaN"), y: parseFloat(el.dataset.cornerBlY || "NaN") }
      }
    };
    if (Number.isFinite(rect.left) && Number.isFinite(rect.top) && Number.isFinite(rect.width) && Number.isFinite(rect.height)) {
      return normalizePanelRect(rect);
    }
    const css = window.getComputedStyle(el);
    return normalizePanelRect({
      left: parseFloat(css.left || "0"),
      top: parseFloat(css.top || "0"),
      width: parseFloat(css.width || "10"),
      height: parseFloat(css.height || "10"),
      skewX: parseFloat(el.dataset.skewX || "0"),
      skewY: parseFloat(el.dataset.skewY || "0"),
      rotate: parseFloat(el.dataset.rotate || "0"),
      corners: {
        tl: { x: parseFloat(el.dataset.cornerTlX || "NaN"), y: parseFloat(el.dataset.cornerTlY || "NaN") },
        tr: { x: parseFloat(el.dataset.cornerTrX || "NaN"), y: parseFloat(el.dataset.cornerTrY || "NaN") },
        br: { x: parseFloat(el.dataset.cornerBrX || "NaN"), y: parseFloat(el.dataset.cornerBrY || "NaN") },
        bl: { x: parseFloat(el.dataset.cornerBlX || "NaN"), y: parseFloat(el.dataset.cornerBlY || "NaN") }
      }
    });
  }

  function applyPanelRectToElement(el, rect) {
    if (!el) return;
    const next = normalizePanelRect(rect);
    const points = [next.corners.tl, next.corners.tr, next.corners.br, next.corners.bl];
    const minX = Math.max(0, Math.min(...points.map((p) => p.x)));
    const minY = Math.max(0, Math.min(...points.map((p) => p.y)));
    const maxX = Math.min(100, Math.max(...points.map((p) => p.x)));
    const maxY = Math.min(100, Math.max(...points.map((p) => p.y)));
    const boxW = Math.max(4, maxX - minX);
    const boxH = Math.max(4, maxY - minY);
    const toLocal = (p) => ({
      x: clamp(((p.x - minX) / Math.max(0.001, boxW)) * 100, -30, 130),
      y: clamp(((p.y - minY) / Math.max(0.001, boxH)) * 100, -30, 130)
    });
    const ltl = toLocal(next.corners.tl);
    const ltr = toLocal(next.corners.tr);
    const lbr = toLocal(next.corners.br);
    const lbl = toLocal(next.corners.bl);
    el.style.left = `${minX.toFixed(3)}%`;
    el.style.top = `${minY.toFixed(3)}%`;
    el.style.width = `${boxW.toFixed(3)}%`;
    el.style.height = `${boxH.toFixed(3)}%`;
    const fontScale = clamp(Math.min(boxW / 14, boxH / 14), 0.5, 1);
    el.style.setProperty("--panel-font-scale", fontScale.toFixed(3));
    el.dataset.skewX = String(next.skewX);
    el.dataset.skewY = String(next.skewY);
    el.dataset.rotate = String(next.rotate);
    el.dataset.cornerTlX = String(next.corners.tl.x);
    el.dataset.cornerTlY = String(next.corners.tl.y);
    el.dataset.cornerTrX = String(next.corners.tr.x);
    el.dataset.cornerTrY = String(next.corners.tr.y);
    el.dataset.cornerBrX = String(next.corners.br.x);
    el.dataset.cornerBrY = String(next.corners.br.y);
    el.dataset.cornerBlX = String(next.corners.bl.x);
    el.dataset.cornerBlY = String(next.corners.bl.y);
    el.style.clipPath = `polygon(${ltl.x.toFixed(3)}% ${ltl.y.toFixed(3)}%, ${ltr.x.toFixed(3)}% ${ltr.y.toFixed(3)}%, ${lbr.x.toFixed(3)}% ${lbr.y.toFixed(3)}%, ${lbl.x.toFixed(3)}% ${lbl.y.toFixed(3)}%)`;
    el.style.transform = `rotate(${next.rotate.toFixed(3)}deg) skew(${next.skewX.toFixed(3)}deg, ${next.skewY.toFixed(3)}deg)`;
    const tlAnchor = el.querySelector(".panel-anchor.corner-tl");
    const trAnchor = el.querySelector(".panel-anchor.corner-tr");
    const brAnchor = el.querySelector(".panel-anchor.corner-br");
    const blAnchor = el.querySelector(".panel-anchor.corner-bl");
    if (tlAnchor) { tlAnchor.style.left = `${ltl.x}%`; tlAnchor.style.top = `${ltl.y}%`; }
    if (trAnchor) { trAnchor.style.left = `${ltr.x}%`; trAnchor.style.top = `${ltr.y}%`; }
    if (brAnchor) { brAnchor.style.left = `${lbr.x}%`; brAnchor.style.top = `${lbr.y}%`; }
    if (blAnchor) { blAnchor.style.left = `${lbl.x}%`; blAnchor.style.top = `${lbl.y}%`; }
    refreshPanelRectBadge(el);
  }

  function getCockpitLayoutFromDom() {
    const out = {};
    cockpitPanels.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      out[id] = getPanelRectFromElement(el);
    });
    return out;
  }

  function applyCockpitLayout(layout = {}) {
    cockpitPanels.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const fallback = cockpitDefaultLayout[id] || { left: 5, top: 5, width: 10, height: 10 };
      const next = normalizePanelRect(layout?.[id] || fallback);
      applyPanelRectToElement(el, next);
    });
  }

  function loadCockpitLayout() {
    try {
      const raw = localStorage.getItem(COCKPIT_LAYOUT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function saveCockpitLayout() {
    localStorage.setItem(COCKPIT_LAYOUT_KEY, JSON.stringify(getCockpitLayoutFromDom()));
  }

  function resetCockpitLayout() {
    localStorage.removeItem(COCKPIT_LAYOUT_KEY);
    applyCockpitLayout(cockpitDefaultLayout);
    refreshAllPanelRectBadges();
  }

  function readCockpitLockState() {
    dashboardUi.layoutLocked = localStorage.getItem(COCKPIT_LAYOUT_LOCK_KEY) === "1";
  }

  function writeCockpitLockState(locked) {
    dashboardUi.layoutLocked = !!locked;
    if (dashboardUi.layoutLocked) localStorage.setItem(COCKPIT_LAYOUT_LOCK_KEY, "1");
    else localStorage.removeItem(COCKPIT_LAYOUT_LOCK_KEY);
    if (cockpitLockLayoutBtn) cockpitLockLayoutBtn.textContent = `Lock Layout: ${dashboardUi.layoutLocked ? "On" : "Off"}`;
  }

  function refreshPanelRectBadge(panelEl) {
    if (!panelEl) return;
    const badge = panelEl.querySelector(".panel-rect-badge");
    if (!badge) return;
    const r = getPanelRectFromElement(panelEl);
    badge.textContent = `TL ${r.corners.tl.x.toFixed(1)},${r.corners.tl.y.toFixed(1)} | TR ${r.corners.tr.x.toFixed(1)},${r.corners.tr.y.toFixed(1)} | BR ${r.corners.br.x.toFixed(1)},${r.corners.br.y.toFixed(1)} | BL ${r.corners.bl.x.toFixed(1)},${r.corners.bl.y.toFixed(1)}`;
  }

  function refreshAllPanelRectBadges() {
    cockpitPanels.forEach((id) => {
      const el = document.getElementById(id);
      refreshPanelRectBadge(el);
    });
  }

  function ensurePanelContentNode(panel) {
    if (!panel) return null;
    let node = panel.querySelector(".panel-content");
    if (!node) {
      node = document.createElement("div");
      node.className = "panel-content";
      panel.insertBefore(node, panel.firstChild);
    }
    return node;
  }

  function setPanelContentHtml(panel, html) {
    const node = ensurePanelContentNode(panel);
    if (!node) return;
    node.innerHTML = String(html || "");
  }

  function ensureCockpitPanelAnchors() {
    cockpitPanels.forEach((id) => {
      const panel = document.getElementById(id);
      if (!panel) return;
      ensurePanelContentNode(panel);
      if (!panel.querySelector(".panel-anchor.corner-tl")) {
        ["tl", "tr", "bl", "br"].forEach((corner) => {
          const dot = document.createElement("span");
          dot.className = `panel-anchor corner-${corner}`;
          dot.dataset.anchorType = "resize";
          dot.dataset.corner = corner;
          panel.appendChild(dot);
        });
      }
      if (!panel.querySelector(".panel-anchor.skew-x")) {
        const skewX = document.createElement("span");
        skewX.className = "panel-anchor skew-x";
        skewX.dataset.anchorType = "skew-x";
        panel.appendChild(skewX);
      }
      if (!panel.querySelector(".panel-anchor.skew-y")) {
        const skewY = document.createElement("span");
        skewY.className = "panel-anchor skew-y";
        skewY.dataset.anchorType = "skew-y";
        panel.appendChild(skewY);
      }
      if (!panel.querySelector(".panel-anchor.rotate")) {
        const rotate = document.createElement("span");
        rotate.className = "panel-anchor rotate";
        rotate.dataset.anchorType = "rotate";
        panel.appendChild(rotate);
      }
      if (!panel.querySelector(".panel-rect-badge")) {
        const badge = document.createElement("span");
        badge.className = "panel-rect-badge";
        panel.appendChild(badge);
      }
      refreshPanelRectBadge(panel);
    });
  }

  function setCockpitEditMode(enabled) {
    dashboardUi.layoutEditMode = !!enabled && !dashboardUi.layoutLocked;
    if (cockpitWrap) cockpitWrap.classList.toggle("layout-edit", dashboardUi.layoutEditMode);
    if (cockpitAdjustBtn) cockpitAdjustBtn.textContent = dashboardUi.layoutEditMode ? "Done Adjusting" : "Adjust Panels";
    refreshAllPanelRectBadges();
  }

  function bindCockpitPanelEditing() {
    if (!cockpitWrap) return;
    ensureCockpitPanelAnchors();
    let active = null;
    const stopDrag = () => {
      if (active?.panel && active.pointerId != null && active.panel.hasPointerCapture(active.pointerId)) {
        active.panel.releasePointerCapture(active.pointerId);
      }
      active = null;
    };
    cockpitPanels.forEach((id) => {
      const panel = document.getElementById(id);
      if (!panel) return;
      panel.addEventListener("pointerdown", (event) => {
        if (!dashboardUi.layoutEditMode) return;
        const wrapRect = cockpitWrap.getBoundingClientRect();
        if (wrapRect.width <= 0 || wrapRect.height <= 0) return;
        const rect = getPanelRectFromElement(panel);
        const corner = String(event.target?.dataset?.corner || "");
        const anchorType = String(event.target?.dataset?.anchorType || "");
        active = {
          panel,
          pointerId: event.pointerId,
          mode: anchorType === "resize"
            ? "resize"
            : (anchorType === "skew-x"
                ? "skew-x"
                : (anchorType === "skew-y"
                    ? "skew-y"
                    : (anchorType === "rotate" ? "rotate" : "move"))),
          corner,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startRect: rect,
          wrapRect
        };
        panel.setPointerCapture(event.pointerId);
        event.preventDefault();
      });
      panel.addEventListener("pointermove", (event) => {
        if (!active || active.panel !== panel || !dashboardUi.layoutEditMode) return;
        const dxPct = ((event.clientX - active.startClientX) / Math.max(1, active.wrapRect.width)) * 100;
        const dyPct = ((event.clientY - active.startClientY) / Math.max(1, active.wrapRect.height)) * 100;
        let next = {
          ...active.startRect,
          corners: {
            tl: { ...active.startRect.corners.tl },
            tr: { ...active.startRect.corners.tr },
            br: { ...active.startRect.corners.br },
            bl: { ...active.startRect.corners.bl }
          }
        };
        if (active.mode === "move") {
          next.corners.tl.x += dxPct; next.corners.tl.y += dyPct;
          next.corners.tr.x += dxPct; next.corners.tr.y += dyPct;
          next.corners.br.x += dxPct; next.corners.br.y += dyPct;
          next.corners.bl.x += dxPct; next.corners.bl.y += dyPct;
        } else if (active.mode === "rotate") {
          next.rotate = clamp(active.startRect.rotate + (dxPct * 1.25), -180, 180);
        } else if (active.mode === "skew-x") {
          next.skewX = clamp(active.startRect.skewX + (dxPct * 0.9), -35, 35);
        } else if (active.mode === "skew-y") {
          next.skewY = clamp(active.startRect.skewY + (dyPct * 0.9), -35, 35);
        } else if (active.corner === "tl") {
          next.corners.tl.x += dxPct;
          next.corners.tl.y += dyPct;
        } else if (active.corner === "tr") {
          next.corners.tr.x += dxPct;
          next.corners.tr.y += dyPct;
        } else if (active.corner === "br") {
          next.corners.br.x += dxPct;
          next.corners.br.y += dyPct;
        } else if (active.corner === "bl") {
          next.corners.bl.x += dxPct;
          next.corners.bl.y += dyPct;
        }
        ["tl", "tr", "br", "bl"].forEach((key) => {
          next.corners[key].x = clamp(next.corners[key].x, 0, 100);
          next.corners[key].y = clamp(next.corners[key].y, 0, 100);
        });
        next = normalizePanelRect(next);
        applyPanelRectToElement(panel, next);
      });
      panel.addEventListener("pointerup", () => stopDrag());
      panel.addEventListener("pointercancel", () => stopDrag());
      panel.addEventListener("lostpointercapture", () => stopDrag());
    });
  }

  function createDefaultSave() {
    const stored = {};
    const progress = {};
    RESOURCE_LINES.forEach((line) => {
      stored[line.id] = 0;
      progress[line.id] = 0;
    });
    return {
      version: 1,
      stored,
      progress,
      missionsCompleted: 0,
      importedCompleted: 0
    };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultSave();
      const parsed = JSON.parse(raw);
      const next = createDefaultSave();
      next.missionsCompleted = safeNumber(parsed.missionsCompleted, 0);
      next.importedCompleted = safeNumber(parsed.importedCompleted, 0);
      RESOURCE_LINES.forEach((line) => {
        next.stored[line.id] = Math.max(0, safeNumber(parsed?.stored?.[line.id], 0));
        next.progress[line.id] = clamp(Math.floor(safeNumber(parsed?.progress?.[line.id], 0)), 0, MAX_LEVEL);
      });
      return next;
    } catch (_) {
      return createDefaultSave();
    }
  }

  let saveState = loadSave();

  function persistSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
  }

  function hashSeed(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)] || arr[0];
  }

  function enemySpriteForType(type, rng = null, index = 0) {
    const list = ASSET_LIBRARY.enemySprites[type === "drone" ? "drone" : "crawler"] || [];
    if (!list.length) return "";
    if (rng) return pick(list, rng);
    return list[index % list.length];
  }

  function inferEnemyTypeFromSprite(spritePath, fallback = "crawler") {
    const text = String(spritePath || "").toLowerCase();
    if (/(ufo|saucer|delta|cigar|mothership|flying|pod|fighter|drone)/.test(text)) return "drone";
    if (/(vehicle|hover|bike|car|transport|mech|crawler|hauler)/.test(text)) return "crawler";
    return fallback === "drone" ? "drone" : "crawler";
  }

  function normalizeEnemySpritePath(spritePath, type, index = 0) {
    const txt = String(spritePath || "");
    // Keep mission enemies strictly on sci-fi assets.
    if (/^images\/scifi\/.+\.webp$/i.test(txt)) return txt;
    return enemySpriteForType(type, null, index);
  }

  function cloneSimple(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getGoalBuildingSprite(resourceCategory = "mineral", level = 1) {
    const list = GOAL_BUILDING_SPRITES[resourceCategory === "genetic" ? "genetic" : "mineral"] || GOAL_BUILDING_SPRITES.mineral;
    if (!list.length) return "";
    const idx = Math.max(0, (Math.floor(Number(level || 1)) - 1) % list.length);
    return list[idx];
  }

  function createProceduralMission(resource, level) {
    const lv = clamp(level, 1, MAX_LEVEL);
    const rng = mulberry32(hashSeed(`${resource.id}-L${lv}`));
    const length = 5000 + lv * 850 + Math.floor(rng() * 240);
    const baseGround = 452;

    const holes = [];
    const rocks = [];
    const mines = [];
    const enemies = [];
    const collectibles = [];
    const checkpoints = [];
    const platforms = [];
    const deco = [];

    let cursor = 680;
    const holeCount = 4 + lv + (resource.category === "genetic" ? 1 : 0);
    const noSpawnZones = [];
    for (let i = 0; i < holeCount; i += 1) {
      cursor += 300 + rng() * 330;
      if (cursor > length - 560) break;
      // Keep holes always jumpable at normal travel speed.
      const holeWidth = Math.floor(64 + lv * 3 + rng() * 34);
      const w = clamp(holeWidth, 64, 124);
      const x = Math.floor(cursor);
      holes.push({ x, w });
      noSpawnZones.push({ start: x - 150, end: x + w + 180 });
    }

    const isUnsafeX = (x) => noSpawnZones.some((zone) => x >= zone.start && x <= zone.end);
    const pickSafeX = (min, max) => {
      for (let tries = 0; tries < 28; tries += 1) {
        const x = min + Math.floor(rng() * Math.max(1, max - min));
        if (!isUnsafeX(x)) return x;
      }
      return min + Math.floor(rng() * Math.max(1, max - min));
    };

    const platformCount = 3 + Math.floor(lv * 0.75);
    for (let i = 0; i < platformCount; i += 1) {
      const w = 115 + Math.floor(rng() * 170);
      const x = 700 + Math.floor(rng() * (length - 1300));
      const y = 328 + Math.floor(rng() * 100);
      platforms.push({ x, y, w, h: 12, color: resource.category === "genetic" ? "#568e66" : "#7f8091" });
    }

    const rockCount = 6 + lv * 2;
    for (let i = 0; i < rockCount; i += 1) {
      const w = 34 + Math.floor(rng() * 48);
      const h = 20 + Math.floor(rng() * 34);
      const x = pickSafeX(680, length - 980);
      rocks.push({ x, y: baseGround - h, w, h, hp: 1, color: "#996548" });
    }

    const mineCount = 4 + lv;
    for (let i = 0; i < mineCount; i += 1) {
      const x = pickSafeX(740, length - 1000);
      mines.push({ x, y: baseGround - 14, w: 20, h: 14, hp: 1, color: "#b06e6e" });
    }

    const enemyCount = 3 + lv;
    for (let i = 0; i < enemyCount; i += 1) {
      const fly = rng() > 0.58;
      const x = pickSafeX(900, length - 1300);
      const patrol = 80 + Math.floor(rng() * 170);
      const type = fly ? "drone" : "crawler";
      const baseW = fly ? 52 : 42;
      const baseH = fly ? 26 : 36;
      enemies.push({
        x,
        baseX: x,
        y: fly ? 250 + Math.floor(rng() * 96) : baseGround - 36,
        w: Math.round(baseW * ENEMY_SIZE_MULT),
        h: Math.round(baseH * ENEMY_SIZE_MULT),
        type,
        sprite: enemySpriteForType(type, rng),
        speed: 0.6 + lv * 0.08 + rng() * 0.9,
        patrol,
        fireDelay: 1.4 + rng() * 1.2,
        fireTimer: 0.7 + rng() * 0.8,
        hp: 1
      });
    }

    const collectCount = 11 + lv * 3;
    for (let i = 0; i < collectCount; i += 1) {
      const x = pickSafeX(430, length - 900);
      let y = baseGround - (85 + Math.floor(rng() * 110));
      if (rng() > 0.72 && platforms.length) {
        const p = pick(platforms, rng);
        y = p.y - 30;
      }
      collectibles.push({ x, y, value: 4 + Math.floor(rng() * (5 + lv)), collected: false });
    }

    for (let cp = 1; cp <= 3; cp += 1) {
      checkpoints.push({ x: Math.floor((length * cp) / 4), label: `Checkpoint ${cp}` });
    }

    for (let i = 0; i < 10; i += 1) {
      deco.push({
        x: 360 + Math.floor(rng() * (length - 700)),
        y: baseGround - 130 - Math.floor(rng() * 90),
        w: 130 + Math.floor(rng() * 130),
        h: 70 + Math.floor(rng() * 130),
        color: resource.category === "genetic" ? "rgba(111,189,124,0.18)" : "rgba(143,149,171,0.18)",
        parallax: 0.35 + rng() * 0.35,
        type: resource.category === "genetic" ? "bio" : "mountain"
      });
    }

    return {
      source: "procedural",
      id: `${resource.id}-level-${lv}`,
      title: `${resource.name} Mission ${lv}`,
      category: resource.category,
      resourceId: resource.id,
      level: lv,
      length,
      baseGround,
      completionBonus: 20 + lv * 6 + (resource.category === "genetic" ? 6 : 0),
      holes,
      rocks,
      mines,
      enemies,
      collectibles,
      checkpoints,
      platforms,
      deco,
      webpAssets: [],
      goal: {
        x: length - 190,
        y: baseGround - 170,
        w: 132,
        h: 170,
        style: resource.category === "genetic" ? "bio" : (lv >= 7 ? "mountain" : "refinery"),
        label: resource.goalLabel,
        sprite: getGoalBuildingSprite(resource.category, lv)
      }
    };
  }

  function missionFromImportedLevel(levelData) {
    const baseGround = clamp(safeNumber(levelData.baseGround, 450), 220, 520);
    const length = Math.max(1800, safeNumber(levelData.length, 5800));
    const readRect = (r, defaults = {}) => ({
      x: safeNumber(r?.x, defaults.x || 0),
      y: safeNumber(r?.y, defaults.y || 0),
      w: Math.max(10, safeNumber(r?.w, defaults.w || 40)),
      h: Math.max(8, safeNumber(r?.h, defaults.h || 20)),
      color: String(r?.color || defaults.color || "#8ca3c8"),
      hp: Math.max(1, safeNumber(r?.hp, 1))
    });

    return {
      source: "imported",
      id: String(levelData.id || `import-${Date.now()}`),
      title: String(levelData.title || "Imported Builder Level"),
      category: String(levelData.category || "custom"),
      resourceId: String(levelData.resourceId || "custom"),
      level: clamp(Math.floor(safeNumber(levelData.level, 1)), 1, MAX_LEVEL),
      length,
      baseGround,
      completionBonus: Math.max(0, safeNumber(levelData.completionBonus, 24)),
      holes: Array.isArray(levelData.holes) ? levelData.holes.map((h) => ({ x: safeNumber(h?.x, 0), w: Math.max(30, safeNumber(h?.w, 90)) })) : [],
      rocks: Array.isArray(levelData.rocks) ? levelData.rocks.map((r) => readRect(r, { h: 26, color: "#996548" })) : [],
      mines: Array.isArray(levelData.mines) ? levelData.mines.map((m) => readRect(m, { w: 20, h: 14, color: "#b06e6e" })) : [],
      enemies: Array.isArray(levelData.enemies) ? levelData.enemies.map((e) => ({
        ...readRect(e, { w: 42, h: 36 }),
        baseX: safeNumber(e?.baseX, safeNumber(e?.x, 0)),
        type: String(e?.type || "crawler"),
        sprite: String(e?.sprite || ""),
        speed: Math.max(0.1, safeNumber(e?.speed, 1.1)),
        patrol: Math.max(0, safeNumber(e?.patrol, safeNumber(e?.patrolMax, 130))),
        fireDelay: Math.max(0.1, safeNumber(e?.fireDelay, 1.5)),
        fireTimer: Math.max(0.1, safeNumber(e?.fireTimer, 0.6))
      })) : [],
      collectibles: Array.isArray(levelData.collectibles) ? levelData.collectibles.map((c) => ({
        x: safeNumber(c?.x, 0),
        y: safeNumber(c?.y, baseGround - 70),
        value: Math.max(1, safeNumber(c?.value, 4)),
        collected: false
      })) : [],
      checkpoints: Array.isArray(levelData.checkpoints) ? levelData.checkpoints.map((cp, i) => ({
        x: safeNumber(cp?.x, 200 + i * 500),
        label: String(cp?.label || `Checkpoint ${i + 1}`)
      })) : [],
      platforms: Array.isArray(levelData.platforms) ? levelData.platforms.map((p) => readRect(p, { h: 12, color: "#7f8091" })) : [],
      deco: Array.isArray(levelData.deco) ? levelData.deco.map((d) => ({
        ...readRect(d, { color: "rgba(143,149,171,0.18)" }),
        parallax: safeNumber(d?.parallax, 0.5),
        type: String(d?.type || "custom")
      })) : [],
      webpAssets: Array.isArray(levelData.webpAssets) ? levelData.webpAssets.map((asset) => ({
        ...readRect(asset, { w: 60, h: 60 }),
        sprite: String(asset?.sprite || ""),
        rotation: safeNumber(asset?.rotation, 0),
        scale: Math.max(0.05, safeNumber(asset?.scale, 1)),
        solid: !!asset?.solid,
        collectible: !!asset?.collectible,
        resourceValue: safeNumber(asset?.resourceValue, 0),
        health: safeNumber(asset?.health, 100),
        speed: safeNumber(asset?.speed, 0),
        isEnemy: !!asset?.isEnemy,
        canFoam: !!asset?.canFoam,
        canLaser: !!asset?.canLaser,
        weaponType: String(asset?.weaponType || "none"),
        fireRate: safeNumber(asset?.fireRate, 0),
        damage: safeNumber(asset?.damage, 0),
        radius: safeNumber(asset?.radius, 0),
        pathTrace: !!asset?.pathTrace,
        pathDirection: String(asset?.pathDirection || "ltr"),
        bomberCallIn: !!asset?.bomberCallIn,
        collected: false
      })) : [],
      goal: {
        x: safeNumber(levelData?.goal?.x, length - 190),
        y: safeNumber(levelData?.goal?.y, baseGround - 170),
        w: Math.max(40, safeNumber(levelData?.goal?.w, 132)),
        h: Math.max(40, safeNumber(levelData?.goal?.h, 170)),
        style: String(levelData?.goal?.style || "refinery"),
        label: String(levelData?.goal?.label || "Goal Site"),
        sprite: String(levelData?.goal?.sprite || "")
      }
    };
  }

  function ensureImage(path) {
    if (!path) return null;
    if (!imageCache.has(path)) {
      const img = new Image();
      img.src = path;
      imageCache.set(path, img);
    }
    return imageCache.get(path);
  }

  function setAimFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const sx = (clientX - rect.left) * (canvas.width / rect.width);
    const sy = (clientY - rect.top) * (canvas.height / rect.height);
    runtime.aim.x = runtime.cameraX + sx;
    runtime.aim.y = sy;
    runtime.aim.active = true;
  }

  function spawnExplosion(x, y, color = "#ffb56b") {
    runtime.effects.push({
      x,
      y,
      r: 8,
      life: 0.38,
      maxLife: 0.38,
      color
    });
  }

  function updateEffects(dt) {
    runtime.effects = runtime.effects.filter((fx) => {
      fx.life -= dt;
      fx.r += 84 * dt;
      return fx.life > 0;
    });
  }

  function missionGroundYAt(mission, x) {
    for (let i = 0; i < mission.holes.length; i += 1) {
      const hole = mission.holes[i];
      if (x >= hole.x && x <= hole.x + hole.w) return null;
    }
    return mission.baseGround;
  }

  function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function makePlayer(startX, mission) {
    const gy = missionGroundYAt(mission, startX + PLAYER_WIDTH * 0.5) ?? mission.baseGround;
    return {
      x: startX,
      y: gy - PLAYER_HEIGHT,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT,
      vx: 185,
      vy: 0,
      onGround: false,
      facing: 1
    };
  }

  function bankRunToShip(includeCompletionBonus) {
    if (!runtime.mission) return 0;
    const mission = runtime.mission;
    let amount = Math.max(0, Math.floor(runtime.runCollected));
    if (includeCompletionBonus) amount += Math.max(0, Math.floor(mission.completionBonus || 0));

    if (runtime.resource && !runtime.importedMode) {
      saveState.stored[runtime.resource.id] = Math.max(0, Math.floor((saveState.stored[runtime.resource.id] || 0) + amount));
      if (includeCompletionBonus) {
        const prev = saveState.progress[runtime.resource.id] || 0;
        if ((mission.level || 1) === prev + 1) saveState.progress[runtime.resource.id] = Math.min(MAX_LEVEL, prev + 1);
        saveState.missionsCompleted += 1;
      }
    } else if (runtime.importedMode && includeCompletionBonus) {
      saveState.importedCompleted += 1;
    }

    persistSave();
    return amount;
  }

  function launchMission(line, level, importedData = null) {
    const mission = importedData ? missionFromImportedLevel(importedData) : createProceduralMission(line, level);
    mission.collectibles = mission.collectibles.map((item) => ({ ...item, collected: false }));
    mission.webpAssets = (mission.webpAssets || []).map((asset) => ({ ...asset, collected: false }));
    mission.enemies = (mission.enemies || []).map((enemy, idx) => {
      const inferredType = inferEnemyTypeFromSprite(enemy?.sprite, enemy?.type || "crawler");
      return {
        ...enemy,
        type: inferredType,
        sprite: normalizeEnemySpritePath(enemy?.sprite, inferredType, idx)
      };
    });

    runtime.active = true;
    runtime.resource = line;
    runtime.mission = mission;
    runtime.importedMode = !!importedData;
    runtime.importedLabel = importedData ? String(importedData.title || "Imported Builder Level") : "";
    runtime.player = makePlayer(90, mission);
    runtime.cameraX = 0;
    runtime.runCollected = 0;
    runtime.dead = false;
    runtime.completed = false;
    runtime.lastCheckpointX = 90;
    runtime.lastCheckpointLabel = "Ship Pad";
    runtime.bullets = [];
    runtime.enemyBullets = [];
    runtime.fireCooldown = 0;
    runtime.effects = [];
    runtime.maxHealth = BUGGY_MAX_HEALTH;
    runtime.health = BUGGY_MAX_HEALTH;
    runtime.damageCooldown = 0;
    runtime.aim = { x: runtime.player.x + 260, y: runtime.player.y + runtime.player.h * 0.45, active: false };
    runtime.ticks = 0;
    dashboardUi.highlightOrbitUntilMs = 0;

    dashboardScreen.style.display = "none";
    missionScreen.classList.add("open");
    deathOverlay.classList.remove("open");
    completeOverlay.classList.remove("open");

    if (!runtime.raf) {
      runtime.lastTime = performance.now();
      runtime.raf = requestAnimationFrame(gameLoop);
    }
    updateHud();
  }

  function returnToDashboard() {
    const hadMission = !!runtime.mission;
    runtime.active = false;
    runtime.dead = false;
    runtime.completed = false;
    runtime.mission = null;
    runtime.resource = null;
    runtime.bullets = [];
    runtime.enemyBullets = [];
    runtime.effects = [];
    runtime.aim.active = false;
    deathOverlay.classList.remove("open");
    completeOverlay.classList.remove("open");
    missionScreen.classList.remove("open");
    dashboardScreen.style.display = "grid";
    if (hadMission) {
      // After a buggy run, guide user to return to orbit.
      dashboardUi.viewMode = "landed";
      dashboardUi.highlightOrbitUntilMs = performance.now() + 5200;
      setTimeout(() => {
        if (!runtime.active && dashboardUi.highlightOrbitUntilMs && performance.now() > dashboardUi.highlightOrbitUntilMs) {
          renderDashboard();
        }
      }, 5400);
    }
    renderDashboard();
  }

  function setRuntimeDead(reason) {
    runtime.dead = true;
    deathMessage.textContent = reason;
    deathStats.innerHTML = `
      <div class="stat"><span class="k">Collected This Run</span><span class="v">${Math.floor(runtime.runCollected)}</span></div>
      <div class="stat"><span class="k">Last Checkpoint</span><span class="v">${runtime.lastCheckpointLabel}</span></div>
      <div class="stat"><span class="k">Distance</span><span class="v">${Math.floor(runtime.player.x)}</span></div>
    `;
    deathOverlay.classList.add("open");
  }

  function applyBuggyDamage(amount, reason, options = {}) {
    if (!runtime.active || runtime.dead || runtime.completed) return false;
    if (runtime.damageCooldown > 0) return false;
    const hit = Math.max(1, Math.floor(Number(amount || 0)));
    runtime.health = Math.max(0, runtime.health - hit);
    runtime.damageCooldown = BUGGY_HIT_IFRAMES;
    const p = runtime.player;
    if (p) {
      p.vx = Math.max(110, p.vx * 0.8);
      p.vy = Math.min(p.vy, -90);
    }
    spawnExplosion(
      (p?.x || 0) + (p?.w || PLAYER_WIDTH) * 0.5,
      (p?.y || 0) + (p?.h || PLAYER_HEIGHT) * 0.6,
      options.color || "#ffb284"
    );
    if (runtime.health <= 0) {
      setRuntimeDead(reason || "Buggy hull breached.");
      return true;
    }
    updateHud();
    return true;
  }

  function respawnAtCheckpoint() {
    if (!runtime.mission) return;
    runtime.player = makePlayer(runtime.lastCheckpointX + 8, runtime.mission);
    runtime.dead = false;
    runtime.bullets = [];
    runtime.enemyBullets = [];
    runtime.effects = [];
    runtime.health = runtime.maxHealth;
    runtime.damageCooldown = 0;
    deathOverlay.classList.remove("open");
  }

  function completeMission() {
    runtime.completed = true;
    runtime.dead = false;
    const amount = bankRunToShip(true);
    const mission = runtime.mission;
    completeMessage.textContent = `Reached ${mission.goal.label}. Banked ${amount} units (${Math.floor(runtime.runCollected)} gathered + ${Math.floor(mission.completionBonus)} completion bonus).`;
    completeOverlay.classList.add("open");
  }

  function getDashboardSortedLines() {
    return [...RESOURCE_LINES].sort((a, b) => {
      const sa = Math.max(0, a.requirement - (saveState.stored[a.id] || 0));
      const sb = Math.max(0, b.requirement - (saveState.stored[b.id] || 0));
      if (sa !== sb) return sb - sa;
      return a.name.localeCompare(b.name);
    });
  }

  function getLineMissionStats(line) {
    const stored = saveState.stored[line.id] || 0;
    const complete = saveState.progress[line.id] || 0;
    const nextLevel = Math.min(MAX_LEVEL, complete + 1);
    const shortage = Math.max(0, line.requirement - stored);
    const done = shortage <= 0 && complete >= MAX_LEVEL;
    return { stored, complete, nextLevel, shortage, done };
  }

  function getPlanetSetForLine(line) {
    const idx = Math.max(0, RESOURCE_LINES.findIndex((entry) => entry.id === line.id));
    const planet = DASHBOARD_PLANETS[idx % DASHBOARD_PLANETS.length] || DASHBOARD_PLANETS[0];
    return {
      name: planet,
      spacePath: `images/planets/orbit/planet_orbit_${planet}.webp`,
      landedPath: `images/planets/landed/planet_landed_${planet}.webp`
    };
  }

  function getPlanetDashboardCards(sortedLines) {
    const lines = Array.isArray(sortedLines) ? sortedLines : [];
    return DASHBOARD_PLANETS.map((planetName, idx) => {
      const line = lines[idx] || null;
      if (!line) return null;
      const stats = getLineMissionStats(line);
      return {
        id: `screen-${idx + 1}`,
        planetName,
        line,
        stats,
        spacePath: `images/planets/orbit/planet_orbit_${planetName}.webp`,
        landedPath: `images/planets/landed/planet_landed_${planetName}.webp`
      };
    }).filter(Boolean);
  }

  function runCockpitFireTransition() {
    if (!cockpitFireTransition) return;
    cockpitFireTransition.classList.remove("active");
    void cockpitFireTransition.offsetWidth;
    cockpitFireTransition.classList.add("active");
    if (cockpitFireTimer) clearTimeout(cockpitFireTimer);
    cockpitFireTimer = setTimeout(() => {
      cockpitFireTransition.classList.remove("active");
      cockpitFireTimer = null;
    }, 700);
  }

  function setCockpitUnderlay(path, altText = "Planet cockpit background", options = {}) {
    const targetPath = String(path || "").trim();
    if (!targetPath) return;
    const immediate = !!options.immediate;
    if (!immediate && cockpitBgCurrentPath === targetPath) return;
    const front = cockpitBgLayerIndex === 0 ? cockpitBgA : cockpitBgB;
    const back = cockpitBgLayerIndex === 0 ? cockpitBgB : cockpitBgA;
    if (!front || !back) return;
    const activate = () => {
      back.classList.add("active");
      front.classList.remove("active");
      back.alt = altText;
      cockpitBgLayerIndex = cockpitBgLayerIndex === 0 ? 1 : 0;
      cockpitBgCurrentPath = targetPath;
      if (!immediate) runCockpitFireTransition();
    };
    if (immediate) {
      back.src = targetPath;
      activate();
      return;
    }
    back.onload = () => {
      back.onload = null;
      activate();
    };
    back.onerror = () => {
      back.onerror = null;
      activate();
    };
    back.src = targetPath;
  }

  function getSelectedPlanetCard(cards) {
    if (!cards.length) return null;
    const current = String(dashboardUi.selectedPlanetScreenId || "");
    let card = cards.find((entry) => entry.id === current);
    if (!card) {
      card = cards[0];
      dashboardUi.selectedPlanetScreenId = card.id;
      dashboardUi.selectedLineId = card.line.id;
    }
    return card;
  }

  function launchSelectedPlanetMission() {
    const cards = getPlanetDashboardCards(getDashboardSortedLines());
    const selected = getSelectedPlanetCard(cards);
    if (!selected) return;
    launchMission(selected.line, selected.stats.nextLevel);
  }

  function updateCockpitDashboard(sorted) {
    const cards = getPlanetDashboardCards(sorted);
    const selected = getSelectedPlanetCard(cards);
    if (!selected) return;
    const useLanded = dashboardUi.viewMode === "landed";
    const nextImage = useLanded ? selected.landedPath : selected.spacePath;
    setCockpitUnderlay(nextImage, `${selected.planetName} ${useLanded ? "landed" : "orbit"} cockpit view`);
    if (cockpitMainViewport) {
      cockpitMainViewport.style.display = "grid";
      cockpitMainViewport.style.opacity = "1";
      setPanelContentHtml(cockpitMainViewport, `
        <h3>${selected.planetName}</h3>
        <p>${selected.line.name}</p>
        <p class="statline">${useLanded ? "LANDED" : "ORBIT"} | Need ${Math.floor(selected.stats.shortage)} | L${selected.stats.nextLevel}/10</p>
      `);
    }
    cockpitPlanetPanels.forEach((panel, idx) => {
      if (!panel) return;
      const card = cards[idx] || null;
      if (!card) {
        panel.classList.remove("selected");
        setPanelContentHtml(panel, "");
        panel.dataset.screenId = "";
        return;
      }
      if (!useLanded) {
        const isSelected = card.id === selected.id;
        panel.classList.toggle("selected", isSelected);
        setPanelContentHtml(panel, `
          <h3>${card.planetName}</h3>
          <p>${card.line.name}</p>
          <p class="statline">Need: ${Math.floor(card.stats.shortage)}</p>
        `);
        panel.title = `${card.planetName} | ${card.line.name}`;
        panel.dataset.screenId = card.id;
        return;
      }
      panel.classList.remove("selected");
      panel.dataset.screenId = "";
      if (idx === 0) {
        setPanelContentHtml(panel, `
          <h3>ORBIT</h3>
          <p>Return to ${selected.planetName}</p>
          <button id="cockpitOrbitReturnBtn" class="btn ghost" type="button">Back To Orbit</button>
        `);
        panel.title = `Return to orbit around ${selected.planetName}`;
      } else if (idx === cockpitPlanetPanels.length - 1) {
        setPanelContentHtml(panel, `
          <h3>LAUNCH BUGGY</h3>
          <p>${selected.line.name}</p>
          <button id="cockpitLaunchBuggyBtn" class="btn" type="button">Launch</button>
        `);
        panel.title = `Launch buggy mission for ${selected.line.name}`;
      } else {
        setPanelContentHtml(panel, `
          <h3>${card.planetName}</h3>
          <p>${card.line.name}</p>
          <p class="statline">Need: ${Math.floor(card.stats.shortage)}</p>
        `);
        panel.title = `${card.planetName} | ${card.line.name}`;
      }
    });
    if (cockpitBottomMidPanel) {
      setPanelContentHtml(cockpitBottomMidPanel, `
        <h3>SPACE MODE</h3>
        <p>Selected: ${selected.planetName} (${useLanded ? "Landed" : "Orbit"})</p>
        <button id="cockpitToggleViewBtn" class="btn ghost" type="button">${useLanded ? "Show Orbit" : "Show Landed"}</button>
        ${useLanded ? "" : `<button id="cockpitSpaceLaunchBtn" class="btn" type="button">Launch ${selected.line.name}</button>`}
      `);
      const toggleBtn = document.getElementById("cockpitToggleViewBtn");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          dashboardUi.viewMode = dashboardUi.viewMode === "orbit" ? "landed" : "orbit";
          renderDashboard();
        });
      }
      const launchBtn = document.getElementById("cockpitSpaceLaunchBtn");
      if (launchBtn) {
        launchBtn.addEventListener("click", (event) => {
          event.preventDefault();
          launchSelectedPlanetMission();
        });
      }
    }
    if (useLanded) {
      const now = performance.now();
      if ((dashboardUi.highlightLaunchUntilMs || 0) < now) {
        dashboardUi.highlightLaunchUntilMs = now + 4600;
        setTimeout(() => {
          if (!runtime.active && dashboardUi.highlightLaunchUntilMs && performance.now() > dashboardUi.highlightLaunchUntilMs) {
            renderDashboard();
          }
        }, 4800);
      }
    } else {
      dashboardUi.highlightLaunchUntilMs = 0;
    }
    const orbitBtn = document.getElementById("cockpitOrbitReturnBtn");
    if (orbitBtn) {
      const shouldPulseOrbit = Number(dashboardUi.highlightOrbitUntilMs || 0) > performance.now();
      orbitBtn.classList.toggle("action-pulse", shouldPulseOrbit);
      orbitBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dashboardUi.viewMode = "orbit";
        dashboardUi.highlightOrbitUntilMs = 0;
        renderDashboard();
      });
    }
    const buggyBtn = document.getElementById("cockpitLaunchBuggyBtn");
    if (buggyBtn) {
      const shouldPulseLaunch = Number(dashboardUi.highlightLaunchUntilMs || 0) > performance.now();
      buggyBtn.classList.toggle("action-pulse", shouldPulseLaunch);
      buggyBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dashboardUi.highlightLaunchUntilMs = 0;
        launchSelectedPlanetMission();
      });
    }
    ensureCockpitPanelAnchors();
  }

  function createResourceCard(line) {
    const { stored, complete, nextLevel, shortage, done } = getLineMissionStats(line);

    const card = document.createElement("article");
    card.className = "resource-card";
    card.innerHTML = `
      <div class="resource-chip" style="background:${line.chipColor};color:#10253f">${line.category.toUpperCase()}</div>
      <h3>${line.name}</h3>
      <div class="stats-row">
        <div class="stat"><span class="k">Stored</span><span class="v">${Math.floor(stored)}</span></div>
        <div class="stat"><span class="k">Required</span><span class="v">${line.requirement}</span></div>
        <div class="stat"><span class="k">Shortage</span><span class="v" style="color:${shortage > 0 ? "#ffd27e" : "#8df7ae"}">${Math.floor(shortage)}</span></div>
      </div>
      <div class="stats-row">
        <div class="stat"><span class="k">Next Mission</span><span class="v">${nextLevel}/10</span></div>
        <div class="stat"><span class="k">Arc Complete</span><span class="v">${complete}/10</span></div>
        <div class="stat"><span class="k">Branch</span><span class="v">${line.category}</span></div>
      </div>
    `;

    const row = document.createElement("div");
    row.className = "row-actions";
    const selected = String(dashboardUi.selectedLineId || "") === line.id;

    const launch = document.createElement("button");
    launch.className = "btn";
    launch.type = "button";
    launch.textContent = done ? "Replay Arc" : `Launch Level ${nextLevel}`;
    launch.addEventListener("click", () => launchMission(line, nextLevel));

    const replay = document.createElement("button");
    replay.className = "btn ghost";
    replay.type = "button";
    replay.textContent = "Replay Current";
    replay.addEventListener("click", () => launchMission(line, Math.max(1, complete || 1)));
    const select = document.createElement("button");
    select.className = "btn ghost";
    select.type = "button";
    select.textContent = selected ? "Selected" : "Select";
    select.disabled = selected;
    select.addEventListener("click", () => {
      dashboardUi.selectedLineId = line.id;
      const cards = getPlanetDashboardCards(getDashboardSortedLines());
      const hit = cards.find((card) => card?.line?.id === line.id);
      if (hit) dashboardUi.selectedPlanetScreenId = hit.id;
      renderDashboard();
    });

    row.append(launch, replay, select);
    card.appendChild(row);

    if (shortage > 0) card.style.boxShadow = `0 0 0 1px ${line.accent} inset`;
    if (selected) card.style.borderColor = "rgba(0,255,255,0.9)";
    return card;
  }

  function renderDashboard() {
    resourceGrid.innerHTML = "";
    const totals = RESOURCE_LINES.reduce((acc, line) => {
      acc.required += line.requirement;
      acc.stored += saveState.stored[line.id] || 0;
      acc.progress += saveState.progress[line.id] || 0;
      return acc;
    }, { required: 0, stored: 0, progress: 0 });

    const shortage = Math.max(0, totals.required - totals.stored);
    dashboardSummary.innerHTML = `
      <div class="stat"><span class="k">Stored Payload</span><span class="v">${Math.floor(totals.stored)}</span></div>
      <div class="stat"><span class="k">Total Required</span><span class="v">${totals.required}</span></div>
      <div class="stat"><span class="k">Remaining Shortage</span><span class="v" style="color:${shortage > 0 ? "#ffd27e" : "#8df7ae"}">${Math.floor(shortage)}</span></div>
    `;

    const sorted = getDashboardSortedLines();
    if (sorted.length && !sorted.some((line) => line.id === dashboardUi.selectedLineId)) {
      dashboardUi.selectedLineId = sorted[0].id;
    }
    updateCockpitDashboard(sorted);
    sorted.forEach((line) => resourceGrid.appendChild(createResourceCard(line)));
  }

  function updateHud() {
    if (!runtime.mission) return;
    const mission = runtime.mission;
    const distance = Math.max(0, Math.floor(runtime.player.x));
    const cpPct = Math.min(100, Math.floor((runtime.lastCheckpointX / mission.length) * 100));
    const stored = runtime.resource ? Math.floor(saveState.stored[runtime.resource.id] || 0) : "-";
    const progress = runtime.resource ? `${saveState.progress[runtime.resource.id] || 0}/10` : "custom";
    const speed = Math.floor(runtime.player.vx);
    const hpPct = Math.round((Math.max(0, runtime.health) / Math.max(1, runtime.maxHealth)) * 100);
    const hpColor = hpPct > 65 ? "#8df7ae" : (hpPct > 35 ? "#ffd27e" : "#ff8f97");

    hud.innerHTML = `
      <div class="stat"><span class="k">Mission</span><span class="v">${mission.title}</span></div>
      <div class="stat"><span class="k">Branch</span><span class="v">${mission.category}</span></div>
      <div class="stat"><span class="k">Run Collected</span><span class="v" style="color:#8df7ae">${Math.floor(runtime.runCollected)}</span></div>
      <div class="stat"><span class="k">Stored In Ship</span><span class="v">${stored}</span></div>
      <div class="stat"><span class="k">Speed</span><span class="v">${speed}</span></div>
      <div class="stat"><span class="k">Distance</span><span class="v">${distance}/${Math.floor(mission.length)}</span></div>
      <div class="stat"><span class="k">Checkpoint</span><span class="v">${runtime.lastCheckpointLabel}</span></div>
      <div class="stat"><span class="k">Checkpoint %</span><span class="v">${cpPct}%</span></div>
      <div class="stat"><span class="k">Arc Progress</span><span class="v">${progress}</span></div>
      <div class="stat"><span class="k">Buggy Hull</span><span class="v" style="color:${hpColor}">${hpPct}%</span></div>
    `;
  }

  function drawParallaxBackdrop(path, y, h, speed, alpha) {
    const img = ensureImage(path);
    if (!img || !img.complete || img.naturalWidth <= 0) return;
    const tileW = (img.naturalWidth / Math.max(1, img.naturalHeight)) * h;
    const offset = -((runtime.cameraX * speed) % tileW);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let x = offset - tileW; x < canvas.width + tileW; x += tileW) {
      ctx.drawImage(img, x, y, tileW, h);
    }
    ctx.restore();
  }

  function drawBackground(mission) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#172f56");
    gradient.addColorStop(0.52, "#0e2240");
    gradient.addColorStop(1, "#071223");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawParallaxBackdrop(ASSET_LIBRARY.backgrounds[0], 24, 170, 0.08, 0.2);
    drawParallaxBackdrop(ASSET_LIBRARY.backgrounds[1], 58, 188, 0.14, 0.24);
    drawParallaxBackdrop(ASSET_LIBRARY.backgrounds[2], 90, 200, 0.22, 0.28);

    const farRidgeY = mission.baseGround - 170;
    const midRidgeY = mission.baseGround - 125;
    ctx.fillStyle = "rgba(44, 72, 108, 0.45)";
    for (let x = -200; x < canvas.width + 260; x += 120) {
      const sx = x - ((runtime.cameraX * 0.16) % 120);
      ctx.beginPath();
      ctx.moveTo(sx, mission.baseGround + 6);
      ctx.lineTo(sx + 56, farRidgeY - 26 - Math.sin((runtime.ticks + sx) * 0.01) * 14);
      ctx.lineTo(sx + 120, mission.baseGround + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(64, 98, 140, 0.36)";
    for (let x = -180; x < canvas.width + 220; x += 100) {
      const sx = x - ((runtime.cameraX * 0.24) % 100);
      ctx.beginPath();
      ctx.moveTo(sx, mission.baseGround + 6);
      ctx.lineTo(sx + 46, midRidgeY - 18 - Math.sin((runtime.ticks + sx) * 0.015) * 10);
      ctx.lineTo(sx + 100, mission.baseGround + 6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "rgba(215, 234, 255, 0.7)";
    for (let i = 0; i < 38; i += 1) {
      const sx = (i * 317 + runtime.ticks * 0.07) % (canvas.width + 80) - 40;
      const sy = (i * 113) % 220;
      ctx.fillRect(sx, sy, 2, 2);
    }

    mission.deco.forEach((d) => {
      const sx = d.x - runtime.cameraX * d.parallax;
      if (sx + d.w < -100 || sx > canvas.width + 100) return;
      ctx.fillStyle = d.color || "rgba(140,160,190,0.2)";
      if (d.type === "mountain") {
        ctx.beginPath();
        ctx.moveTo(sx, mission.baseGround + 8);
        ctx.lineTo(sx + d.w * 0.5, d.y);
        ctx.lineTo(sx + d.w, mission.baseGround + 8);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(sx, d.y, d.w, d.h);
      }
    });
  }

  function drawGroundSegment(sx, w, mission) {
    if (w <= 0) return;
    const gy = mission.baseGround;
    const depth = canvas.height - gy + 18;
    const step = 14;
    const amp = 3.4;
    const freq = 0.018;
    const grad = ctx.createLinearGradient(0, gy, 0, canvas.height);
    grad.addColorStop(0, "#6d7f95");
    grad.addColorStop(0.22, "#485c71");
    grad.addColorStop(1, "#293848");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx, gy + Math.sin((runtime.cameraX + sx) * freq) * amp);
    for (let x = sx; x <= sx + w + step; x += step) {
      const worldX = runtime.cameraX + x;
      const y = gy + Math.sin(worldX * freq) * amp + Math.sin(worldX * 0.051) * 0.8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(sx + w, gy + depth);
    ctx.lineTo(sx, gy + depth);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(186, 212, 238, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, gy + Math.sin((runtime.cameraX + sx) * freq) * amp);
    for (let x = sx; x <= sx + w + step; x += step) {
      const worldX = runtime.cameraX + x;
      const y = gy + Math.sin(worldX * freq) * amp + Math.sin(worldX * 0.051) * 0.8;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(120, 140, 162, 0.18)";
    for (let x = sx - ((runtime.cameraX * 0.27) % 21); x < sx + w; x += 21) {
      const dY = gy + 10 + Math.sin((runtime.cameraX + x) * 0.03) * 4;
      ctx.fillRect(x, dY, 3, Math.max(3, depth - 24));
    }
    ctx.fillStyle = "rgba(20, 30, 42, 0.25)";
    for (let x = sx - ((runtime.cameraX * 0.19) % 31); x < sx + w; x += 31) {
      const dY = gy + 16 + Math.sin((runtime.cameraX + x) * 0.028) * 3;
      ctx.fillRect(x, dY, 4, Math.max(3, depth - 28));
    }
  }

  function drawMission() {
    const mission = runtime.mission;
    const player = runtime.player;
    drawBackground(mission);

    const sortedHoles = [...mission.holes].sort((a, b) => a.x - b.x);
    let lastStart = 0;
    sortedHoles.forEach((hole) => {
      if (hole.x > lastStart) {
        const sx = lastStart - runtime.cameraX;
        const w = hole.x - lastStart;
        if (sx + w > 0 && sx < canvas.width) {
          drawGroundSegment(sx, w, mission);
        }
      }
      lastStart = hole.x + hole.w;
    });
    if (lastStart < mission.length) {
      const sx = lastStart - runtime.cameraX;
      const w = mission.length - lastStart;
      if (sx + w > 0 && sx < canvas.width) {
        drawGroundSegment(sx, w, mission);
      }
    }

    mission.holes.forEach((hole) => {
      const sx = hole.x - runtime.cameraX;
      if (sx + hole.w < 0 || sx > canvas.width) return;
      const pitGrad = ctx.createLinearGradient(0, mission.baseGround - 8, 0, canvas.height);
      pitGrad.addColorStop(0, "rgba(8, 11, 18, 0.95)");
      pitGrad.addColorStop(1, "rgba(2, 4, 8, 1)");
      ctx.fillStyle = pitGrad;
      ctx.fillRect(sx, mission.baseGround - 2, hole.w, canvas.height - mission.baseGround + 8);
      ctx.strokeStyle = "rgba(142, 166, 192, 0.35)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, mission.baseGround - 1);
      ctx.quadraticCurveTo(sx + hole.w * 0.08, mission.baseGround + 3, sx + hole.w * 0.16, mission.baseGround - 1);
      ctx.moveTo(sx + hole.w * 0.84, mission.baseGround - 1);
      ctx.quadraticCurveTo(sx + hole.w * 0.92, mission.baseGround + 3, sx + hole.w, mission.baseGround - 1);
      ctx.stroke();
    });

    mission.platforms.forEach((p) => {
      const sx = p.x - runtime.cameraX;
      if (sx + p.w < 0 || sx > canvas.width) return;
      ctx.fillStyle = p.color || "#7f8091";
      ctx.fillRect(sx, p.y, p.w, p.h);
    });

    mission.rocks.forEach((rock) => {
      if (rock.hp <= 0) return;
      const sx = rock.x - runtime.cameraX;
      if (sx + rock.w < 0 || sx > canvas.width) return;
      ctx.fillStyle = rock.color || "#8f7b68";
      ctx.beginPath();
      ctx.moveTo(sx, rock.y + rock.h);
      ctx.lineTo(sx + rock.w * 0.12, rock.y + rock.h * 0.38);
      ctx.lineTo(sx + rock.w * 0.4, rock.y + rock.h * 0.08);
      ctx.lineTo(sx + rock.w * 0.78, rock.y + rock.h * 0.16);
      ctx.lineTo(sx + rock.w, rock.y + rock.h * 0.55);
      ctx.lineTo(sx + rock.w * 0.82, rock.y + rock.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(229, 205, 177, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    mission.mines.forEach((mine) => {
      if (mine.hp <= 0) return;
      const sx = mine.x - runtime.cameraX;
      if (sx + mine.w < 0 || sx > canvas.width) return;
      const cx = sx + mine.w * 0.5;
      const cy = mine.y + mine.h * 0.65;
      const r = Math.max(5, mine.w * 0.42);
      ctx.fillStyle = mine.color || "#b06e6e";
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffd3d3";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.74, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    });

    mission.checkpoints.forEach((cp) => {
      const sx = cp.x - runtime.cameraX;
      if (sx < -20 || sx > canvas.width + 20) return;
      ctx.strokeStyle = cp.x <= runtime.lastCheckpointX ? "#7df7a9" : "#9cc1e8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, mission.baseGround - 120);
      ctx.lineTo(sx, mission.baseGround + 4);
      ctx.stroke();
      ctx.fillStyle = cp.x <= runtime.lastCheckpointX ? "#7df7a9" : "#9cc1e8";
      ctx.fillRect(sx - 1, mission.baseGround - 120, 34, 14);
      ctx.fillStyle = "#081526";
      ctx.font = "11px system-ui";
      ctx.fillText("CP", sx + 6, mission.baseGround - 109);
    });

    mission.collectibles.forEach((item) => {
      if (item.collected) return;
      const sx = item.x - runtime.cameraX;
      if (sx < -16 || sx > canvas.width + 16) return;
      ctx.fillStyle = runtime.resource?.accent || "#9fd0ff";
      ctx.beginPath();
      ctx.moveTo(sx, item.y - 10);
      ctx.lineTo(sx + 9, item.y);
      ctx.lineTo(sx, item.y + 10);
      ctx.lineTo(sx - 9, item.y);
      ctx.closePath();
      ctx.fill();
    });

    mission.webpAssets.forEach((asset) => {
      if (asset.collectible && asset.collected) return;
      const sx = asset.x - runtime.cameraX;
      if (sx + asset.w < -80 || sx > canvas.width + 80) return;
      const img = asset.sprite ? ensureImage(asset.sprite) : null;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.translate(sx + asset.w / 2, asset.y + asset.h / 2);
        ctx.rotate((asset.rotation || 0) * (Math.PI / 180));
        const drawW = asset.w * (asset.scale || 1);
        const drawH = asset.h * (asset.scale || 1);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(168, 195, 230, 0.35)";
        ctx.fillRect(sx, asset.y, asset.w, asset.h);
      }
    });

    mission.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      const sx = enemy.x - runtime.cameraX;
      if (sx + enemy.w < -30 || sx > canvas.width + 30) return;
      const sprite = enemy.sprite ? ensureImage(enemy.sprite) : null;
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.save();
        ctx.translate(sx + enemy.w / 2, enemy.y + enemy.h / 2);
        if (enemy.type === "crawler") ctx.scale(-1, 1);
        ctx.drawImage(sprite, -enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
        ctx.restore();
      } else {
        ctx.fillStyle = enemy.type === "drone" ? "#9f72ff" : "#e18d68";
        ctx.fillRect(sx, enemy.y, enemy.w, enemy.h);
        ctx.fillStyle = "rgba(255,255,255,0.74)";
        ctx.fillRect(sx + 4, enemy.y + 4, 8, 4);
      }
    });

    runtime.enemyBullets.forEach((b) => {
      const sx = b.x - runtime.cameraX;
      ctx.fillStyle = "#ff8f97";
      ctx.fillRect(sx - 3, b.y - 3, 6, 6);
    });

    runtime.bullets.forEach((b) => {
      const sx = b.x - runtime.cameraX;
      ctx.fillStyle = b.kind === "aim" ? "#84c7ff" : "#ffd178";
      ctx.fillRect(sx - 3, b.y - 3, 6, 6);
    });

    runtime.effects.forEach((fx) => {
      const sx = fx.x - runtime.cameraX;
      const alpha = clamp(fx.life / fx.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fx.color;
      ctx.beginPath();
      ctx.arc(sx, fx.y, fx.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,240,220,0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    const goal = mission.goal;
    const gx = goal.x - runtime.cameraX;
    if (gx + goal.w > -60 && gx < canvas.width + 60) {
      const goalSprite = String(goal?.sprite || "");
      const spriteImg = goalSprite ? ensureImage(goalSprite) : null;
      if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = 0.98;
        ctx.drawImage(spriteImg, gx, goal.y, goal.w, goal.h);
        ctx.restore();
      } else if (goal.style === "mountain") {
        ctx.fillStyle = "rgba(133, 143, 160, 0.95)";
        ctx.beginPath();
        ctx.moveTo(gx, mission.baseGround + 6);
        ctx.lineTo(gx + goal.w * 0.4, goal.y);
        ctx.lineTo(gx + goal.w * 0.7, mission.baseGround + 6);
        ctx.closePath();
        ctx.fill();
      } else if (goal.style === "bio") {
        ctx.fillStyle = "rgba(78, 167, 111, 0.92)";
        ctx.fillRect(gx, goal.y, goal.w, goal.h);
        ctx.fillStyle = "#a7ffbf";
        ctx.fillRect(gx + 14, goal.y + 16, goal.w - 28, 18);
      } else {
        ctx.fillStyle = "rgba(130, 143, 166, 0.94)";
        ctx.fillRect(gx, goal.y, goal.w, goal.h);
        ctx.fillStyle = "#d5dff0";
        ctx.fillRect(gx + 12, goal.y + 16, goal.w - 24, 12);
        ctx.fillRect(gx + 12, goal.y + 40, goal.w - 24, 12);
      }
      ctx.fillStyle = "#d8ebff";
      ctx.font = "12px system-ui";
      ctx.fillText(goal.label || "Goal", gx + 4, goal.y - 8);
    }

    const buggy = ensureImage(ASSET_LIBRARY.moonBuggy.path);
    const px = player.x - runtime.cameraX;
    if (buggy && buggy.complete && buggy.naturalWidth > 0) {
      ctx.save();
      ctx.translate(px + player.w / 2, player.y + player.h / 2);
      ctx.rotate(clamp(player.vy * 0.0011, -0.2, 0.2));
      ctx.scale(player.facing >= 0 ? -1 : 1, 1);
      ctx.drawImage(buggy, -player.w / 2, -player.h / 2, player.w, player.h);
      ctx.restore();
    } else {
      ctx.fillStyle = "#7ec8ff";
      ctx.fillRect(px, player.y, player.w, player.h);
    }

    const muzzleX = player.x + player.w * 0.74;
    const muzzleY = player.y + player.h * 0.42;
    const aimX = runtime.aim.active ? runtime.aim.x : (muzzleX + 220);
    const aimY = runtime.aim.active ? runtime.aim.y : (muzzleY - 20);
    const aimSX = aimX - runtime.cameraX;
    const muzzleSX = muzzleX - runtime.cameraX;
    ctx.strokeStyle = "rgba(140, 207, 255, 0.52)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(muzzleSX, muzzleY);
    ctx.lineTo(aimSX, aimY);
    ctx.stroke();
    ctx.strokeStyle = "rgba(170, 225, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(aimSX, aimY, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(aimSX - 10, aimY);
    ctx.lineTo(aimSX + 10, aimY);
    ctx.moveTo(aimSX, aimY - 10);
    ctx.lineTo(aimSX, aimY + 10);
    ctx.stroke();

    ctx.fillStyle = "#d9ecff";
    ctx.font = "13px system-ui";
    ctx.fillText(`Checkpoint: ${runtime.lastCheckpointLabel}`, 14, 22);
  }

  function shoot() {
    if (!runtime.active || runtime.dead || runtime.completed) return;
    if (runtime.fireCooldown > 0) return;
    runtime.fireCooldown = SHOT_COOLDOWN;
    const p = runtime.player;
    const muzzleX = p.x + p.w * 0.74;
    const muzzleY = p.y + p.h * 0.42;
    const targetX = runtime.aim.active ? runtime.aim.x : (muzzleX + 300);
    const targetY = runtime.aim.active ? runtime.aim.y : (muzzleY - 20);
    let dx = targetX - muzzleX;
    let dy = targetY - muzzleY;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    runtime.bullets.push({ x: muzzleX, y: muzzleY, vx: dx * 760, vy: dy * 760, kind: "aim", life: 1.7 });
  }

  function updateBullets(dt) {
    const mission = runtime.mission;
    const playerRect = runtime.player;

    runtime.bullets = runtime.bullets.filter((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) return false;
      if (b.x > mission.length + 100 || b.y < -120 || b.y > canvas.height + 120) return false;

      for (let i = 0; i < mission.rocks.length; i += 1) {
        const rock = mission.rocks[i];
        if (rock.hp <= 0) continue;
        if (rectOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, rock)) {
          rock.hp -= 1;
          if (rock.hp <= 0) spawnExplosion(rock.x + rock.w * 0.5, rock.y + rock.h * 0.5, "#f0ae7a");
          return false;
        }
      }
      for (let i = 0; i < mission.mines.length; i += 1) {
        const mine = mission.mines[i];
        if (mine.hp <= 0) continue;
        if (rectOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, mine)) {
          mine.hp -= 1;
          if (mine.hp <= 0) spawnExplosion(mine.x + mine.w * 0.5, mine.y + mine.h * 0.5, "#ff8d96");
          return false;
        }
      }
      for (let i = 0; i < mission.enemies.length; i += 1) {
        const enemy = mission.enemies[i];
        if (enemy.hp <= 0) continue;
        if (rectOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, enemy)) {
          enemy.hp -= 1;
          if (enemy.hp <= 0) spawnExplosion(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, enemy.type === "drone" ? "#d8a6ff" : "#ffb279");
          return false;
        }
      }
      for (let i = 0; i < mission.webpAssets.length; i += 1) {
        const asset = mission.webpAssets[i];
        if (!asset.isEnemy) continue;
        if (rectOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, asset)) {
          asset.isEnemy = false;
          spawnExplosion(asset.x + asset.w * 0.5, asset.y + asset.h * 0.5, "#e5c7ff");
          return false;
        }
      }
      return true;
    });

    runtime.enemyBullets = runtime.enemyBullets.filter((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) return false;
      if (b.x < -120 || b.y > canvas.height + 120 || b.y < -120) return false;
      if (rectOverlap({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 }, playerRect)) {
        applyBuggyDamage(7, "Enemy fire overwhelmed the buggy hull.", { color: "#ff9a9a" });
        return false;
      }
      return true;
    });
  }

  function updatePhysics(dt) {
    const mission = runtime.mission;
    const player = runtime.player;
    runtime.damageCooldown = Math.max(0, runtime.damageCooldown - dt);

    const baseSpeed = 185 + mission.level * 4;
    let targetSpeed = baseSpeed;
    if (inputState.left) targetSpeed -= 120;
    if (inputState.right) targetSpeed += 170;
    if (inputState.boost) targetSpeed += 100;
    player.vx += (targetSpeed - player.vx) * Math.min(1, dt * 4.8);
    player.vx = clamp(player.vx, 120, 530);

    if (inputState.jump && player.onGround) {
      // Tuned so every generated crater remains jumpable with normal speed control.
      player.vy = -910;
      player.onGround = false;
    }

    player.vy += 2200 * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.facing = player.vx >= 0 ? 1 : -1;
    player.onGround = false;

    const frontX = player.x + player.w * 0.56;
    const groundY = missionGroundYAt(mission, frontX);
    if (groundY !== null && player.y + player.h >= groundY) {
      player.y = groundY - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    mission.platforms.forEach((p) => {
      if (player.vy < 0) return;
      const overlapX = player.x + player.w > p.x && player.x < p.x + p.w;
      const crossingTop = player.y + player.h >= p.y && (player.y + player.h - player.vy * dt) <= p.y + 3;
      if (overlapX && crossingTop) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    });

    if (player.y > canvas.height + 120) {
      setRuntimeDead("Fell into a crater.");
    }

    player.x = clamp(player.x, 0, mission.length + 120);
    runtime.cameraX = clamp(player.x - canvas.width * 0.28, 0, Math.max(0, mission.length - canvas.width + 260));
  }

  function updateEnemies(dt) {
    const mission = runtime.mission;
    mission.enemies.forEach((enemy, index) => {
      if (enemy.hp <= 0) return;
      const wave = Math.sin((runtime.ticks * 0.016 + index * 0.63) * enemy.speed);
      enemy.x = enemy.baseX + wave * enemy.patrol;
      if (enemy.type === "drone") {
        enemy.y += Math.sin((runtime.ticks * 0.025 + index) * 1.5) * 0.65;
      }
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && enemy.type === "drone") {
        enemy.fireTimer = enemy.fireDelay;
        runtime.enemyBullets.push({
          x: enemy.x + enemy.w * 0.5,
          y: enemy.y + enemy.h,
          vx: -100 + Math.sin(runtime.ticks * 0.03 + index) * 50,
          vy: 270 + Math.random() * 60,
          life: 2.5
        });
      }
    });
  }

  function handleCollisionsAndInteractions() {
    const mission = runtime.mission;
    const p = runtime.player;
    const playerRect = { x: p.x, y: p.y, w: p.w, h: p.h };

    mission.collectibles.forEach((item) => {
      if (item.collected) return;
      if (rectOverlap(playerRect, { x: item.x - 10, y: item.y - 10, w: 20, h: 20 })) {
        item.collected = true;
        runtime.runCollected += item.value;
      }
    });

    mission.rocks.forEach((rock) => {
      if (rock.hp <= 0) return;
      if (rectOverlap(playerRect, rock)) {
        applyBuggyDamage(8, "Repeated impacts damaged the buggy.", { color: "#f3b187" });
      }
    });

    mission.mines.forEach((mine) => {
      if (mine.hp <= 0) return;
      if (rectOverlap(playerRect, mine)) {
        mine.hp = 0;
        applyBuggyDamage(14, "Mine blast destroyed the buggy hull.", { color: "#ff8d96" });
      }
    });

    mission.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      if (rectOverlap(playerRect, enemy)) {
        applyBuggyDamage(enemy.type === "drone" ? 10 : 9, enemy.type === "drone" ? "Drone impact destroyed the buggy." : "Vehicle collision destroyed the buggy.", { color: enemy.type === "drone" ? "#d8a6ff" : "#ffb279" });
      }
    });

    mission.webpAssets.forEach((asset) => {
      if (asset.collectible && !asset.collected && rectOverlap(playerRect, asset)) {
        asset.collected = true;
        runtime.runCollected += Math.max(1, safeNumber(asset.resourceValue, 1));
      }
      if (asset.solid && rectOverlap(playerRect, asset)) {
        if (p.vy >= 0 && (p.y + p.h) <= asset.y + 16) {
          p.y = asset.y - p.h;
          p.vy = 0;
          p.onGround = true;
        } else {
          applyBuggyDamage(9, "Collision with structure destroyed the buggy.", { color: "#f8c39a" });
        }
      }
      if (asset.isEnemy && rectOverlap(playerRect, asset)) {
        applyBuggyDamage(10, "Hostile asset collision destroyed the buggy.", { color: "#e5c7ff" });
      }
    });

    mission.checkpoints.forEach((cp) => {
      if (p.x >= cp.x && cp.x > runtime.lastCheckpointX) {
        runtime.lastCheckpointX = cp.x;
        runtime.lastCheckpointLabel = cp.label || "Checkpoint";
      }
    });

    if (!runtime.completed && rectOverlap(playerRect, mission.goal)) {
      completeMission();
    }
  }

  function gameLoop(now) {
    runtime.raf = requestAnimationFrame(gameLoop);
    const dt = Math.min(0.033, (now - runtime.lastTime) / 1000 || 0.016);
    runtime.lastTime = now;

    if (!runtime.active || !runtime.mission) return;

    runtime.ticks += 1;

    if (!runtime.dead && !runtime.completed) {
      runtime.fireCooldown = Math.max(0, runtime.fireCooldown - dt);
      if (inputState.fire) shoot();
      updatePhysics(dt);
      updateEnemies(dt);
      updateBullets(dt);
      handleCollisionsAndInteractions();
    }
    updateEffects(dt);

    drawMission();
    updateHud();
  }

  function releaseAllInputs() {
    inputState.left = false;
    inputState.right = false;
    inputState.jump = false;
    inputState.boost = false;
    inputState.fire = false;
  }

  function bindControl(button, key) {
    const press = (ev) => {
      ev.preventDefault();
      inputState[key] = true;
      if (key === "fire") shoot();
    };
    const release = (ev) => {
      ev.preventDefault();
      inputState[key] = false;
    };
    if (window.PointerEvent) {
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    } else {
      button.addEventListener("touchstart", press, { passive: false });
      button.addEventListener("touchend", release, { passive: false });
      button.addEventListener("touchcancel", release, { passive: false });
      button.addEventListener("mousedown", press);
      button.addEventListener("mouseup", release);
      button.addEventListener("mouseleave", release);
    }
  }

  function bindEvents() {
    document.querySelectorAll("#touchControls [data-ctl]").forEach((btn) => {
      bindControl(btn, btn.getAttribute("data-ctl"));
    });
    if (fireFab) bindControl(fireFab, "fire");
    if (window.PointerEvent) document.addEventListener("pointerup", releaseAllInputs);
    window.addEventListener("blur", releaseAllInputs);

    canvas.addEventListener("mousemove", (event) => {
      setAimFromClient(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointermove", (event) => {
      setAimFromClient(event.clientX, event.clientY);
    });
    canvas.addEventListener("touchmove", (event) => {
      const t = event.touches?.[0];
      if (!t) return;
      setAimFromClient(t.clientX, t.clientY);
    }, { passive: true });
    canvas.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      setAimFromClient(event.clientX, event.clientY);
      shoot();
    });
    canvas.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      setAimFromClient(event.clientX, event.clientY);
      shoot();
    });

    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputState.left = true;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputState.right = true;
      if (event.code === "Space" || event.code === "KeyW" || event.code === "ArrowUp") inputState.jump = true;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") inputState.boost = true;
      if (event.code === "KeyF" || event.code === "KeyX") {
        inputState.fire = true;
        shoot();
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputState.left = false;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputState.right = false;
      if (event.code === "Space" || event.code === "KeyW" || event.code === "ArrowUp") inputState.jump = false;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") inputState.boost = false;
      if (event.code === "KeyF" || event.code === "KeyX") inputState.fire = false;
    });

    returnShipBtn.addEventListener("click", () => {
      if (!runtime.active || !runtime.mission) return;
      bankRunToShip(false);
      returnToDashboard();
    });

    restartCheckpointBtn.addEventListener("click", () => {
      if (!runtime.active || !runtime.mission) return;
      respawnAtCheckpoint();
    });

    toDashboardBtn.addEventListener("click", () => {
      if (!runtime.active || !runtime.mission) {
        returnToDashboard();
        return;
      }
      if (!window.confirm("Return to dashboard and bank current gathered resources?")) return;
      bankRunToShip(false);
      returnToDashboard();
    });

    respawnBtn.addEventListener("click", () => respawnAtCheckpoint());

    bankReturnBtn.addEventListener("click", () => {
      bankRunToShip(false);
      returnToDashboard();
    });

    completeDashboardBtn.addEventListener("click", () => returnToDashboard());

    nextMissionBtn.addEventListener("click", () => {
      if (runtime.importedMode || !runtime.resource) {
        returnToDashboard();
        return;
      }
      const line = runtime.resource;
      const completed = saveState.progress[line.id] || 0;
      if (completed >= MAX_LEVEL) {
        returnToDashboard();
        return;
      }
      launchMission(line, completed + 1);
    });

    importLevelBtn.addEventListener("click", () => importLevelInput.click());
    importLevelInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const levelData = json?.level ? json.level : json;
        launchMission({ id: "custom", name: "Imported", category: "custom", requirement: 0, goalLabel: "Imported Goal", accent: "#9ed2ff" }, 1, levelData);
      } catch (_) {
        window.alert("Could not parse imported level JSON.");
      } finally {
        importLevelInput.value = "";
      }
    });

    resetSaveBtn.addEventListener("click", () => {
      if (!window.confirm("Reset all Tibertron's Space Buggy progress and resource storage?")) return;
      saveState = createDefaultSave();
      persistSave();
      renderDashboard();
    });
    cockpitPlanetPanels.forEach((panel) => {
      if (!panel) return;
      panel.addEventListener("click", () => {
        if (dashboardUi.layoutEditMode) return;
        const screenId = String(panel.dataset.screenId || "");
        if (!screenId) return;
        dashboardUi.selectedPlanetScreenId = screenId;
        const cards = getPlanetDashboardCards(getDashboardSortedLines());
        const selected = cards.find((card) => card.id === screenId);
        if (selected?.line?.id) dashboardUi.selectedLineId = selected.line.id;
        renderDashboard();
      });
    });
    if (cockpitBottomMidPanel) {
      cockpitBottomMidPanel.addEventListener("click", () => {
        if (dashboardUi.layoutEditMode) return;
        launchSelectedPlanetMission();
      });
    }
    if (cockpitAdjustBtn) {
      cockpitAdjustBtn.addEventListener("click", () => {
        if (dashboardUi.layoutLocked) {
          window.alert("Layout is locked. Turn off lock first to adjust.");
          return;
        }
        setCockpitEditMode(!dashboardUi.layoutEditMode);
      });
    }
    if (cockpitSaveLayoutBtn) {
      cockpitSaveLayoutBtn.addEventListener("click", () => {
        saveCockpitLayout();
        setCockpitEditMode(false);
      });
    }
    if (cockpitResetLayoutBtn) {
      cockpitResetLayoutBtn.addEventListener("click", () => {
        resetCockpitLayout();
        setCockpitEditMode(false);
      });
    }
    if (cockpitLockLayoutBtn) {
      cockpitLockLayoutBtn.addEventListener("click", () => {
        const next = !dashboardUi.layoutLocked;
        writeCockpitLockState(next);
        if (next) setCockpitEditMode(false);
      });
    }
  }

  function boot() {
    ensureImage(ASSET_LIBRARY.moonBuggy.path);
    ASSET_LIBRARY.backgrounds.forEach((path) => ensureImage(path));
    Object.values(ASSET_LIBRARY.enemySprites).flat().forEach((path) => ensureImage(path));
    DASHBOARD_PLANETS.forEach((planet) => {
      const set = {
        spacePath: `images/planets/orbit/planet_orbit_${planet}.webp`,
        landedPath: `images/planets/landed/planet_landed_${planet}.webp`
      };
      ensureImage(set.spacePath);
      ensureImage(set.landedPath);
    });
    setCockpitUnderlay(`images/planets/orbit/planet_orbit_${DASHBOARD_PLANETS[0]}.webp`, `${DASHBOARD_PLANETS[0]} orbit cockpit view`, { immediate: true });
    readCockpitLockState();
    const savedLayout = loadCockpitLayout();
    applyCockpitLayout(savedLayout || cockpitDefaultLayout);
    bindCockpitPanelEditing();
    writeCockpitLockState(dashboardUi.layoutLocked);
    setCockpitEditMode(false);
    bindEvents();
    renderDashboard();
    runtime.lastTime = performance.now();
  }

  boot();
})();
