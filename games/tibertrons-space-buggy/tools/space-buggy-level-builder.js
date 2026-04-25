(() => {
  const previewCanvas = document.getElementById("previewCanvas");
  const pctx = previewCanvas.getContext("2d");

  const controls = {
    metaId: document.getElementById("metaId"),
    metaTitle: document.getElementById("metaTitle"),
    metaCategory: document.getElementById("metaCategory"),
    metaResourceId: document.getElementById("metaResourceId"),
    metaLevel: document.getElementById("metaLevel"),
    metaLength: document.getElementById("metaLength"),
    metaBaseGround: document.getElementById("metaBaseGround"),
    metaCompletionBonus: document.getElementById("metaCompletionBonus"),
    goalLabel: document.getElementById("goalLabel"),
    goalStyle: document.getElementById("goalStyle"),
    goalX: document.getElementById("goalX"),
    goalY: document.getElementById("goalY"),
    goalW: document.getElementById("goalW"),
    goalH: document.getElementById("goalH"),
    geoType: document.getElementById("geoType"),
    geoX: document.getElementById("geoX"),
    geoY: document.getElementById("geoY"),
    geoW: document.getElementById("geoW"),
    geoH: document.getElementById("geoH"),
    geoValue: document.getElementById("geoValue"),
    geoLabel: document.getElementById("geoLabel"),
    addGeoBtn: document.getElementById("addGeoBtn"),
    assetKey: document.getElementById("assetKey"),
    assetLabel: document.getElementById("assetLabel"),
    assetCategory: document.getElementById("assetCategory"),
    assetPath: document.getElementById("assetPath"),
    saveAssetBtn: document.getElementById("saveAssetBtn"),
    uploadAssetInput: document.getElementById("uploadAssetInput"),
    assetCatalogList: document.getElementById("assetCatalogList"),
    addWebpBtn: document.getElementById("addWebpBtn"),
    webpSprite: document.getElementById("webpSprite"),
    webpX: document.getElementById("webpX"),
    webpY: document.getElementById("webpY"),
    webpW: document.getElementById("webpW"),
    webpH: document.getElementById("webpH"),
    webpRotation: document.getElementById("webpRotation"),
    webpScale: document.getElementById("webpScale"),
    webpHealth: document.getElementById("webpHealth"),
    webpSpeed: document.getElementById("webpSpeed"),
    webpWeaponType: document.getElementById("webpWeaponType"),
    webpFireRate: document.getElementById("webpFireRate"),
    webpDamage: document.getElementById("webpDamage"),
    webpRadius: document.getElementById("webpRadius"),
    webpPathDirection: document.getElementById("webpPathDirection"),
    webpResourceValue: document.getElementById("webpResourceValue"),
    webpIsEnemy: document.getElementById("webpIsEnemy"),
    webpCanFoam: document.getElementById("webpCanFoam"),
    webpCanLaser: document.getElementById("webpCanLaser"),
    webpPathTrace: document.getElementById("webpPathTrace"),
    webpBomberCallIn: document.getElementById("webpBomberCallIn"),
    webpSolid: document.getElementById("webpSolid"),
    webpCollectible: document.getElementById("webpCollectible"),
    holesList: document.getElementById("holesList"),
    rocksList: document.getElementById("rocksList"),
    minesList: document.getElementById("minesList"),
    platformsList: document.getElementById("platformsList"),
    collectiblesList: document.getElementById("collectiblesList"),
    checkpointsList: document.getElementById("checkpointsList"),
    enemiesList: document.getElementById("enemiesList"),
    webpList: document.getElementById("webpList"),
    exportBtn: document.getElementById("exportBtn"),
    importInput: document.getElementById("importInput"),
    clearBtn: document.getElementById("clearBtn"),
    jsonPreview: document.getElementById("jsonPreview")
  };

  const imageCache = new Map();

  const state = {
    catalog: {
      moonBuggy: { key: "moonBuggy", label: "Moon Buggy", category: "vehicles", path: "images/vehicles/moonbuggy1.webp", dataUrl: "" }
    },
    level: {
      id: "custom-mission-1",
      title: "Custom Mission 1",
      category: "mineral",
      resourceId: "ferrite",
      level: 1,
      length: 6200,
      baseGround: 452,
      completionBonus: 28,
      holes: [],
      rocks: [],
      mines: [],
      enemies: [],
      collectibles: [],
      checkpoints: [],
      platforms: [],
      deco: [],
      webpAssets: [],
      goal: { x: 5960, y: 282, w: 132, h: 170, style: "refinery", label: "Refinery Tower" }
    }
  };

  function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function asBool(v) {
    return String(v) === "true";
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

  function itemEl(label, onRemove) {
    const row = document.createElement("div");
    row.className = "item";
    const text = document.createElement("span");
    text.textContent = label;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn ghost";
    btn.style.minHeight = "28px";
    btn.textContent = "Remove";
    btn.addEventListener("click", onRemove);
    row.append(text, btn);
    return row;
  }

  function syncMetaFromInputs() {
    state.level.id = String(controls.metaId.value || "custom-mission-1");
    state.level.title = String(controls.metaTitle.value || "Custom Mission 1");
    state.level.category = String(controls.metaCategory.value || "custom");
    state.level.resourceId = String(controls.metaResourceId.value || "custom");
    state.level.level = Math.max(1, Math.min(10, Math.floor(safeNumber(controls.metaLevel.value, 1))));
    state.level.length = Math.max(1800, safeNumber(controls.metaLength.value, 6200));
    state.level.baseGround = Math.max(220, Math.min(520, safeNumber(controls.metaBaseGround.value, 452)));
    state.level.completionBonus = Math.max(0, safeNumber(controls.metaCompletionBonus.value, 28));
    state.level.goal = {
      x: safeNumber(controls.goalX.value, state.level.length - 190),
      y: safeNumber(controls.goalY.value, state.level.baseGround - 170),
      w: Math.max(40, safeNumber(controls.goalW.value, 132)),
      h: Math.max(40, safeNumber(controls.goalH.value, 170)),
      style: String(controls.goalStyle.value || "refinery"),
      label: String(controls.goalLabel.value || "Goal Site")
    };
  }

  function renderCatalogList() {
    controls.assetCatalogList.innerHTML = "";
    Object.values(state.catalog).forEach((asset) => {
      const label = `${asset.key} | ${asset.category} | ${asset.path || "data:url"}`;
      controls.assetCatalogList.appendChild(itemEl(label, () => {
        delete state.catalog[asset.key];
        renderCatalogList();
        renderPreview();
      }));
    });
  }

  function getLevelExportObject() {
    syncMetaFromInputs();
    return {
    schema: "space-buggy-level-v1",
      generatedAt: new Date().toISOString(),
      catalog: state.catalog,
      level: state.level
    };
  }

  function renderLists() {
    const mappings = [
      ["holes", controls.holesList, (it) => `x:${it.x} w:${it.w}`],
      ["rocks", controls.rocksList, (it) => `x:${it.x} y:${it.y} w:${it.w} h:${it.h}`],
      ["mines", controls.minesList, (it) => `x:${it.x} y:${it.y} w:${it.w} h:${it.h}`],
      ["platforms", controls.platformsList, (it) => `x:${it.x} y:${it.y} w:${it.w} h:${it.h}`],
      ["collectibles", controls.collectiblesList, (it) => `x:${it.x} y:${it.y} value:${it.value}`],
      ["checkpoints", controls.checkpointsList, (it) => `x:${it.x} label:${it.label}`],
      ["enemies", controls.enemiesList, (it) => `${it.type} x:${it.x} y:${it.y} speed:${it.speed}`],
      ["webpAssets", controls.webpList, (it) => `${it.spriteKey || it.sprite || "none"} x:${it.x} y:${it.y} solid:${it.solid} enemy:${it.isEnemy}`]
    ];
    mappings.forEach(([key, node, formatter]) => {
      node.innerHTML = "";
      state.level[key].forEach((item, idx) => {
        node.appendChild(itemEl(formatter(item), () => {
          state.level[key].splice(idx, 1);
          renderAll();
        }));
      });
    });

    controls.jsonPreview.value = JSON.stringify(getLevelExportObject(), null, 2);
  }

  function worldToPreviewX(x, length) {
    return (x / Math.max(1, length)) * previewCanvas.width;
  }

  function worldToPreviewY(y) {
    return (y / 580) * previewCanvas.height;
  }

  function drawGoal(goal, baseGround, length) {
    const x = worldToPreviewX(goal.x, length);
    const y = worldToPreviewY(goal.y);
    const w = Math.max(8, worldToPreviewX(goal.w, length));
    const h = Math.max(12, worldToPreviewY(goal.h));
    if (goal.style === "mountain") {
      pctx.fillStyle = "rgba(133, 143, 160, 0.95)";
      pctx.beginPath();
      pctx.moveTo(x, worldToPreviewY(baseGround + 6));
      pctx.lineTo(x + w * 0.4, y);
      pctx.lineTo(x + w * 0.7, worldToPreviewY(baseGround + 6));
      pctx.closePath();
      pctx.fill();
    } else if (goal.style === "bio") {
      pctx.fillStyle = "rgba(78, 167, 111, 0.92)";
      pctx.fillRect(x, y, w, h);
    } else {
      pctx.fillStyle = "rgba(130, 143, 166, 0.94)";
      pctx.fillRect(x, y, w, h);
    }
    pctx.fillStyle = "#d9ecff";
    pctx.font = "10px system-ui";
    pctx.fillText(goal.label || "Goal", x + 2, Math.max(10, y - 4));
  }

  function renderPreview() {
    syncMetaFromInputs();
    const level = state.level;
    const length = Math.max(1, level.length);
    const baseGround = level.baseGround;

    const g = pctx.createLinearGradient(0, 0, 0, previewCanvas.height);
    g.addColorStop(0, "#12284a");
    g.addColorStop(0.58, "#102542");
    g.addColorStop(1, "#061423");
    pctx.fillStyle = g;
    pctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

    const gy = worldToPreviewY(baseGround);
    pctx.fillStyle = "#2d3b51";
    pctx.fillRect(0, gy, previewCanvas.width, previewCanvas.height - gy);
    pctx.fillStyle = "#4f6b83";
    pctx.fillRect(0, gy, previewCanvas.width, 4);

    level.holes.forEach((hole) => {
      const x = worldToPreviewX(hole.x, length);
      const w = Math.max(4, worldToPreviewX(hole.w, length));
      pctx.fillStyle = "rgba(4, 6, 11, 0.98)";
      pctx.fillRect(x, gy - 2, w, previewCanvas.height - gy + 4);
    });

    level.platforms.forEach((p) => {
      pctx.fillStyle = p.color || "#7f8091";
      pctx.fillRect(worldToPreviewX(p.x, length), worldToPreviewY(p.y), Math.max(2, worldToPreviewX(p.w, length)), Math.max(2, worldToPreviewY(p.h)));
    });
    level.rocks.forEach((r) => {
      pctx.fillStyle = r.color || "#996548";
      pctx.fillRect(worldToPreviewX(r.x, length), worldToPreviewY(r.y), Math.max(2, worldToPreviewX(r.w, length)), Math.max(2, worldToPreviewY(r.h)));
    });
    level.mines.forEach((m) => {
      pctx.fillStyle = m.color || "#b06e6e";
      pctx.fillRect(worldToPreviewX(m.x, length), worldToPreviewY(m.y), Math.max(2, worldToPreviewX(m.w, length)), Math.max(2, worldToPreviewY(m.h)));
    });
    level.enemies.forEach((e) => {
      pctx.fillStyle = e.type === "drone" ? "#9f72ff" : "#e18d68";
      pctx.fillRect(worldToPreviewX(e.x, length), worldToPreviewY(e.y), Math.max(2, worldToPreviewX(e.w, length)), Math.max(2, worldToPreviewY(e.h)));
    });
    level.collectibles.forEach((c) => {
      pctx.fillStyle = "#8df7ae";
      const x = worldToPreviewX(c.x, length);
      const y = worldToPreviewY(c.y);
      pctx.beginPath();
      pctx.moveTo(x, y - 4);
      pctx.lineTo(x + 4, y);
      pctx.lineTo(x, y + 4);
      pctx.lineTo(x - 4, y);
      pctx.closePath();
      pctx.fill();
    });
    level.checkpoints.forEach((cp) => {
      const x = worldToPreviewX(cp.x, length);
      pctx.strokeStyle = "#9cc1e8";
      pctx.lineWidth = 2;
      pctx.beginPath();
      pctx.moveTo(x, gy - 70);
      pctx.lineTo(x, gy + 4);
      pctx.stroke();
    });
    level.webpAssets.forEach((asset) => {
      const x = worldToPreviewX(asset.x, length);
      const y = worldToPreviewY(asset.y);
      const w = Math.max(2, worldToPreviewX(asset.w, length));
      const h = Math.max(2, worldToPreviewY(asset.h));
      const catalog = state.catalog[asset.spriteKey || asset.sprite];
      let src = "";
      if (catalog?.dataUrl) src = catalog.dataUrl;
      else if (catalog?.path) src = `../${catalog.path}`;
      else if (typeof asset.sprite === "string" && asset.sprite) {
        src = asset.sprite.startsWith("data:") ? asset.sprite : `../${asset.sprite}`;
      }
      const img = src ? ensureImage(src) : null;
      if (img && img.complete && img.naturalWidth > 0) {
        pctx.save();
        pctx.translate(x + w / 2, y + h / 2);
        pctx.rotate((asset.rotation || 0) * (Math.PI / 180));
        pctx.drawImage(img, -w * (asset.scale || 1) / 2, -h * (asset.scale || 1) / 2, w * (asset.scale || 1), h * (asset.scale || 1));
        pctx.restore();
      } else {
        pctx.fillStyle = "rgba(168, 195, 230, 0.35)";
        pctx.fillRect(x, y, w, h);
      }
    });

    drawGoal(level.goal, baseGround, length);
  }

  function addGeometryFromForm() {
    syncMetaFromInputs();
    const type = String(controls.geoType.value);
    const x = safeNumber(controls.geoX.value, 0);
    const y = safeNumber(controls.geoY.value, state.level.baseGround - 30);
    const w = Math.max(4, safeNumber(controls.geoW.value, 40));
    const h = Math.max(4, safeNumber(controls.geoH.value, 24));
    const value = safeNumber(controls.geoValue.value, 4);
    const label = String(controls.geoLabel.value || "Item");

    if (type === "hole") state.level.holes.push({ x, w });
    if (type === "rock") state.level.rocks.push({ x, y, w, h, hp: 1, color: "#996548" });
    if (type === "mine") state.level.mines.push({ x, y, w, h, hp: 1, color: "#b06e6e" });
    if (type === "platform") state.level.platforms.push({ x, y, w, h, color: "#7f8091" });
    if (type === "collectible") state.level.collectibles.push({ x, y, value: Math.max(1, value), collected: false });
    if (type === "checkpoint") state.level.checkpoints.push({ x, label });
    if (type === "enemy") {
      state.level.enemies.push({
        x, y, w, h,
        baseX: x,
        patrol: 130,
        speed: Math.max(0.1, value),
        fireDelay: 1.5,
        fireTimer: 0.7,
        type: label || "crawler",
        hp: 1
      });
    }
    renderAll();
  }

  function addWebpInstance() {
    syncMetaFromInputs();
    const spriteKey = String(controls.webpSprite.value || "");
    const catalogItem = state.catalog[spriteKey];
    const spriteSource = catalogItem?.dataUrl ? catalogItem.dataUrl : (catalogItem?.path || spriteKey);

    state.level.webpAssets.push({
      spriteKey,
      sprite: spriteSource,
      x: safeNumber(controls.webpX.value, 0),
      y: safeNumber(controls.webpY.value, state.level.baseGround - 70),
      w: Math.max(4, safeNumber(controls.webpW.value, 60)),
      h: Math.max(4, safeNumber(controls.webpH.value, 60)),
      rotation: safeNumber(controls.webpRotation.value, 0),
      scale: Math.max(0.05, safeNumber(controls.webpScale.value, 1)),
      health: safeNumber(controls.webpHealth.value, 100),
      speed: safeNumber(controls.webpSpeed.value, 0),
      isEnemy: asBool(controls.webpIsEnemy.value),
      canFoam: asBool(controls.webpCanFoam.value),
      canLaser: asBool(controls.webpCanLaser.value),
      weaponType: String(controls.webpWeaponType.value || "none"),
      fireRate: safeNumber(controls.webpFireRate.value, 0),
      damage: safeNumber(controls.webpDamage.value, 0),
      radius: safeNumber(controls.webpRadius.value, 0),
      pathTrace: asBool(controls.webpPathTrace.value),
      pathDirection: String(controls.webpPathDirection.value || "ltr"),
      bomberCallIn: asBool(controls.webpBomberCallIn.value),
      solid: asBool(controls.webpSolid.value),
      collectible: asBool(controls.webpCollectible.value),
      resourceValue: safeNumber(controls.webpResourceValue.value, 0),
      collected: false
    });
    renderAll();
  }

  function saveCatalogAsset() {
    const key = String(controls.assetKey.value || "").trim();
    if (!key) return;
    const existing = state.catalog[key] || {};
    state.catalog[key] = {
      key,
      label: String(controls.assetLabel.value || key),
      category: String(controls.assetCategory.value || "misc"),
      path: String(controls.assetPath.value || ""),
      dataUrl: existing.dataUrl || ""
    };
    renderAll();
  }

  async function handleUploadAsset(file) {
    if (!file) return;
    const base = String(file.name || "uploaded.webp").replace(/\\.[^.]+$/, "");
    const key = String(controls.assetKey.value || base).trim() || base;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("read-failed"));
      reader.readAsDataURL(file);
    });
    state.catalog[key] = {
      key,
      label: String(controls.assetLabel.value || key),
      category: String(controls.assetCategory.value || "uploaded"),
      path: "",
      dataUrl
    };
    controls.assetKey.value = key;
    controls.assetLabel.value = key;
    renderAll();
  }

  function exportJson() {
    const payload = getLevelExportObject();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.level.id || "space-buggy-level"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function loadFromJsonPayload(payload) {
    const data = payload?.level ? payload : { level: payload, catalog: {} };
    const level = data.level || {};

    state.catalog = Object.keys(data.catalog || {}).length ? data.catalog : state.catalog;
    state.level = {
      id: String(level.id || "custom-mission-1"),
      title: String(level.title || "Custom Mission 1"),
      category: String(level.category || "custom"),
      resourceId: String(level.resourceId || "custom"),
      level: Math.max(1, Math.min(10, Math.floor(safeNumber(level.level, 1)))),
      length: Math.max(1800, safeNumber(level.length, 6200)),
      baseGround: Math.max(220, Math.min(520, safeNumber(level.baseGround, 452))),
      completionBonus: Math.max(0, safeNumber(level.completionBonus, 28)),
      holes: Array.isArray(level.holes) ? level.holes : [],
      rocks: Array.isArray(level.rocks) ? level.rocks : [],
      mines: Array.isArray(level.mines) ? level.mines : [],
      enemies: Array.isArray(level.enemies) ? level.enemies : [],
      collectibles: Array.isArray(level.collectibles) ? level.collectibles : [],
      checkpoints: Array.isArray(level.checkpoints) ? level.checkpoints : [],
      platforms: Array.isArray(level.platforms) ? level.platforms : [],
      deco: Array.isArray(level.deco) ? level.deco : [],
      webpAssets: Array.isArray(level.webpAssets) ? level.webpAssets : [],
      goal: {
        x: safeNumber(level?.goal?.x, Math.max(1900, safeNumber(level.length, 6200)) - 190),
        y: safeNumber(level?.goal?.y, 282),
        w: Math.max(40, safeNumber(level?.goal?.w, 132)),
        h: Math.max(40, safeNumber(level?.goal?.h, 170)),
        style: String(level?.goal?.style || "refinery"),
        label: String(level?.goal?.label || "Goal Site")
      }
    };

    controls.metaId.value = state.level.id;
    controls.metaTitle.value = state.level.title;
    controls.metaCategory.value = state.level.category;
    controls.metaResourceId.value = state.level.resourceId;
    controls.metaLevel.value = String(state.level.level);
    controls.metaLength.value = String(state.level.length);
    controls.metaBaseGround.value = String(state.level.baseGround);
    controls.metaCompletionBonus.value = String(state.level.completionBonus);
    controls.goalLabel.value = state.level.goal.label;
    controls.goalStyle.value = state.level.goal.style;
    controls.goalX.value = String(state.level.goal.x);
    controls.goalY.value = String(state.level.goal.y);
    controls.goalW.value = String(state.level.goal.w);
    controls.goalH.value = String(state.level.goal.h);
    renderAll();
  }

  function clearLists() {
    state.level.holes = [];
    state.level.rocks = [];
    state.level.mines = [];
    state.level.enemies = [];
    state.level.collectibles = [];
    state.level.checkpoints = [];
    state.level.platforms = [];
    state.level.deco = [];
    state.level.webpAssets = [];
    renderAll();
  }

  function renderAll() {
    renderCatalogList();
    renderLists();
    renderPreview();
  }

  function bindEvents() {
    [
      controls.metaId, controls.metaTitle, controls.metaCategory, controls.metaResourceId,
      controls.metaLevel, controls.metaLength, controls.metaBaseGround, controls.metaCompletionBonus,
      controls.goalLabel, controls.goalStyle, controls.goalX, controls.goalY, controls.goalW, controls.goalH
    ].forEach((el) => el.addEventListener("input", () => renderAll()));

    controls.addGeoBtn.addEventListener("click", addGeometryFromForm);
    controls.addWebpBtn.addEventListener("click", addWebpInstance);
    controls.saveAssetBtn.addEventListener("click", saveCatalogAsset);
    controls.uploadAssetInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        await handleUploadAsset(file);
      } finally {
        event.target.value = "";
      }
    });
    controls.exportBtn.addEventListener("click", exportJson);
    controls.importInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        loadFromJsonPayload(JSON.parse(text));
      } catch (_) {
        window.alert("Could not parse JSON.");
      } finally {
        event.target.value = "";
      }
    });
    controls.clearBtn.addEventListener("click", clearLists);
  }

  function boot() {
    bindEvents();
    renderAll();
  }

  boot();
})();
