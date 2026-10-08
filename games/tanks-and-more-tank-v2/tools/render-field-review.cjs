// Offline native-canvas review of the real game renderer. This never starts a
// browser, navigates, connects to a page, or verifies pointer/touch behavior.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const runtimeModules = process.env.CODEX_NODE_MODULES || 'C:/Users/jgroce/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { createCanvas, loadImage, Path2D } = require(path.join(runtimeModules, '@napi-rs/canvas'));
const { parseHTML } = require(process.env.TANK_DOM_MODULE || path.join(os.tmpdir(), 'tanks-v2-dom-check/node_modules/linkedom'));
const root = process.env.TANK_GAME_ROOT || path.resolve(__dirname, '..');
const output = process.env.TANK_RENDER_OUTPUT || path.join(os.tmpdir(), 'tanks-v2-field-review');
const { window, document } = parseHTML(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
const canvases = new WeakMap(), images = new WeakMap(), contexts = new WeakMap(), pending = new Set(), assetErrors = [];
function backing(node) {
  if (images.has(node)) return images.get(node).native;
  if (!canvases.has(node)) canvases.set(node, createCanvas(Number(node.getAttribute('width')) || 300, Number(node.getAttribute('height')) || 150));
  return canvases.get(node);
}
function contextFor(node) {
  const native = backing(node);
  if (!contexts.has(node)) {
    const context = native.getContext('2d');
    contexts.set(node, new Proxy(context, {
      get(target, key) {
        if (key === 'drawImage') return (source, ...args) => {
          const image = images.has(source) ? images.get(source).native : canvases.has(source) ? backing(source) : source;
          if (!image) throw new Error('Renderer used an unloaded image');
          return target.drawImage(image, ...args);
        };
        if (key === 'createPattern') return (source, repeat) => target.createPattern(images.has(source) ? images.get(source).native : backing(source), repeat);
        const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, key, value) { return Reflect.set(target, key, value, target); }
    }));
  }
  return contexts.get(node);
}
window.HTMLCanvasElement.prototype.getContext = function() { return contextFor(this); };
for (const dimension of ['width', 'height']) Object.defineProperty(window.HTMLCanvasElement.prototype, dimension, {
  get() { return backing(this)[dimension]; },
  set(value) { this.setAttribute(dimension, String(value)); backing(this)[dimension] = Math.max(1, Number(value)); }
});
Object.defineProperty(window.HTMLImageElement.prototype, 'src', {
  get() { return this.getAttribute('src') || ''; },
  set(value) {
    const requested = String(value); this.setAttribute('src', requested);
    if (images.get(this)?.requested === requested) return;
    const record = { requested, native: null }; images.set(this, record);
    if (!requested) return;
    if (/^(https?:|file:|\/\/)/i.test(requested)) throw new Error(`Offline renderer refuses remote asset: ${requested}`);
    const asset = requested.startsWith('data:') ? requested : path.resolve(root, decodeURIComponent(requested.split(/[?#]/)[0]));
    if (!requested.startsWith('data:') && !asset.startsWith(root + path.sep)) throw new Error(`Asset outside V2: ${requested}`);
    const promise = Promise.resolve().then(() => {
      if (!requested.startsWith('data:') && !fs.existsSync(asset)) throw new Error(`Missing local file: ${asset}`);
      // Buffers keep native decoding strictly on the filesystem. The library's
      // string loader otherwise interprets a missing Windows path as a URL.
      return loadImage(requested.startsWith('data:') ? asset : fs.readFileSync(asset));
    }).then(native => {
      if (images.get(this) !== record) return;
      record.native = native; this.onload?.();
    }).catch(error => { assetErrors.push(`${requested}: ${error.message}`); this.onerror?.(error); }).finally(() => pending.delete(promise));
    pending.add(promise);
  }
});
for (const dimension of ['naturalWidth', 'naturalHeight']) Object.defineProperty(window.HTMLImageElement.prototype, dimension, {
  get() { return images.get(this)?.native?.[dimension === 'naturalWidth' ? 'width' : 'height'] || 0; }
});
Object.defineProperty(window.HTMLImageElement.prototype, 'complete', { get() { return !!images.get(this)?.native; } });
window.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 1600, height: 900, left: 0, top: 0 });
window.HTMLElement.prototype.blur = function() {};
window.HTMLElement.prototype.focus = function() {};
Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
  get() { return this._selection || this.querySelector('option')?.value || ''; }, set(value) { this._selection = String(value); }
});
let randomState = 7821;
const seededMath = Object.create(Math); seededMath.random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
const store = new Map(); const timers = new Map(); let timerId = 0;
const sandbox = { window, document, console, Event: window.Event, Math: seededMath, Uint32Array, Path2D,
  performance: { now: () => 1000 }, Image: function() { return document.createElement('img'); }, ResizeObserver: class { observe() {} },
  localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)) }, requestAnimationFrame() {},
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; }, clearTimeout(id) { timers.delete(id); }
};
window.setTimeout = sandbox.setTimeout; window.clearTimeout = sandbox.clearTimeout; window.devicePixelRatio = 1;
let source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
if (process.argv.includes('--profile')) {
  source = source.replace(/\}\)\(\);\s*$/, `
    globalThis.profileTimes = {};
    const timed = (name, fn) => (...args) => { const t = performance.now(); const value = fn(...args);
      const item = profileTimes[name] ||= {ms:0,calls:0}; item.ms += performance.now()-t; item.calls++; return value; };
    frame = timed('frame', frame); update = timed('update', update); render = timed('render', render);
    drawTerrain = timed('terrain', drawTerrain); drawAtmosphericSmoke = timed('atmosphere', drawAtmosphericSmoke);
    drawObstacles = timed('props', drawObstacles); drawTank = timed('tank', drawTank);
    drawParticles = timed('particles', drawParticles); drawEffects = timed('effects', drawEffects);
    drawSmokePuffs = timed('tankSmoke', drawSmokePuffs); cpuShotSolution = timed('CPU', cpuShotSolution);
    combatCamera = timed('camera', combatCamera); rebuildTerrainLayer = timed('terrainRebuild', rebuildTerrainLayer);
    gradedBackdrop = timed('backdrop', gradedBackdrop);
  })();`);
  sandbox.performance.now = () => Number(process.hrtime.bigint()) / 1e6;
}
source = source.replace(/\}\)\(\);\s*$/, `globalThis.reviewGame = { state, newMap, render, frame, update, obstacles, terrain, drawTank, drawObstacles, drawEffects, effects, hazards, particles, projectiles, weapons, impact, surfaceY, getStructureAtlas, FIELD_PROPS,
  offlineViewport() { canvas.width=1600; canvas.height=900; opticalFrame={x:0,y:0,w:1600,h:854}; cameraPose=null; cameraStamp=''; terrainDirty=true; },
  flatFixture() { terrain.fill(640); terrainDirty=true; cameraPose=null; },
  fixtureFrame(time) { ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='#242a2b'; ctx.fillRect(0,0,1600,900); ctx.translate(100,70); drawBackground(time); drawTerrain(); drawObstacles(time); ctx.restore(); },
  edgeFrame(side) { opticalFrame={x:0,y:0,w:1600,h:854}; ctx.save(); ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='#758086'; ctx.fillRect(0,0,1600,900); ctx.translate(side==='left'?1100+TERRAIN_OVERDRAW:400-W-TERRAIN_OVERDRAW,0);
    drawTerrain(); ctx.restore(); },
}; })();`);
vm.runInNewContext(source, sandbox);
const game = sandbox.reviewGame;
async function awaitAssets() {
  while (pending.size) await Promise.all(Array.from(pending));
  if (assetErrors.length) throw new Error(`Local asset loading failed:\n${assetErrors.join('\n')}`);
}
function label(text) {
  const context = backing(document.getElementById('battlefield')).getContext('2d');
  context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.fillStyle = '#172026'; context.fillRect(0, 854, 1600, 46);
  context.font = '17px sans-serif'; context.fillStyle = '#e9d5ac'; context.fillText(`OFFLINE ENGINE RENDER · ${text} · NO BROWSER / INPUT QA`, 20, 883); context.restore();
}
async function capture(filename, title, time = 1000, fixture = false) {
  game.state.lastTime = 0;
  const draw = fixture ? game.fixtureFrame : game.frame;
  draw(time); await awaitAssets(); draw(time); label(title);
  const native = backing(document.getElementById('battlefield'));
  const pixels = native.getContext('2d').getImageData(0, 0, native.width, native.height).data;
  let min = 255, max = 0; for (let i = 0; i < pixels.length; i += 128) { min = Math.min(min, pixels[i]); max = Math.max(max, pixels[i]); }
  assert(max - min > 50, 'Offline output lacks visible drawing');
  const target = path.join(output, filename); fs.writeFileSync(target, native.toBuffer('image/png')); console.log(target);
}
async function mission(level) {
  timers.clear(); game.state.level = level; game.state.mode = 'campaign'; game.state.opponent = 'cpu'; game.state.formation = 2;
  game.state.winner = ''; game.newMap(false, 7821); game.offlineViewport();
  await awaitAssets();
}
async function main() {
  fs.mkdirSync(output, { recursive: true }); await awaitAssets();
  // Ensure both authored and newly generated local atlases are fully decoded.
  for (const type of ['bunker', 'wall', 'jeep', 'tree', ...Object.keys(game.FIELD_PROPS)]) game.getStructureAtlas(type);
  await awaitAssets();
  if (process.argv.includes('--edge-only')) {
    await mission(1);
    for (const side of ['left','right']) {
      game.edgeFrame(side); label(side.toUpperCase() + ' SOIL CACHE EDGE / NO RAW-TEXTURE HANDOFF');
      const native = backing(document.getElementById('battlefield')), c = native.getContext('2d');
      const edgeX = side==='left'?1100:400;
      for (const y of [700,800]) {
        const pixels = c.getImageData(edgeX-1,y,2,1).data;
        assert(Math.max(...[0,1,2].map(i=>Math.abs(pixels[i]-pixels[i+4]))) < 12, 'Visible soil seam at cache edge');
      }
      const target = path.join(output, 'offline-soil-edge-'+side+'.png'); fs.writeFileSync(target,native.toBuffer('image/png')); console.log(target);
    }
    console.log('PASS: left/right cached-soil pixel continuity under forced zoom-out framing. No browser/input QA.');
    return;
  }
  if (process.argv.includes('--crumble-only')) {
    await mission(1);
    // Use an actual ridge-flank impact, then show both airborne clods and the
    // permanent terrain shape after gravity has settled the loose soil.
    const x = game.state.terrainRecipe.center * 1400 - 80;
    const y = game.surfaceY(x);
    await capture('offline-soil-before.png', 'RIDGE BEFORE HEAVY IMPACT');
    game.impact(x, y, game.weapons.find(w => w.key === 'heavy'), 'left', null);
    for (let i = 0; i < 12; i++) game.update(1);
    await capture('offline-soil-impact.png', 'HEAVY IMPACT / DUST AND EJECTED CLODS', 2000);
    for (let i = 0; i < 90; i++) game.update(1);
    await capture('offline-soil-settled.png', 'CRATER AND SETTLED BANKS', 3500);
    console.log('PASS: before/impact/settled native-canvas soil renders. No browser/input QA.');
    return;
  }
  for (const level of [1, 2, 3, 6]) {
    await mission(level); await capture(`offline-op-${String(level).padStart(2, '0')}.png`, `OP ${level} / SEED 00001E8D / ${level % 2 ? 'NORMAL' : 'REVERSED'} / ${game.state.tanks.length - 1} HOSTILE(S)`);
  }
  if (process.argv.includes('--missions-only')) {
    console.log('PASS: four current seeded battlefield renders; filesystem assets decoded. No browser/input QA.');
    return;
  }
  await mission(3);
  for (const [index, object] of game.obstacles.entries()) {
    object.hp = object.maxHp * (index % 2 ? .19 : .61);
  }
  await capture('offline-field-damaged.png', 'OP 3 / DAMAGED GENERATED PROPS');
  for (const object of game.obstacles) { object.hp = 0; object.active = false; object.destroyed = true; }
  await capture('offline-field-rubble.png', 'OP 3 / DESTROYED GENERATED PROPS');
  await mission(3);
  const target = game.obstacles[0];
  game.impact(target.x, game.surfaceY(target.x) - target.height * .45, game.weapons.find(weapon => weapon.key === 'heavy'), 'left', null);
  await capture('offline-impact.png', 'OP 3 / REAL HEAVY IMPACT + TERRAIN DEFORMATION', 1120);
  // Two flat-ground fixture groups show every atlas at four actual health stages.
  // The fixture only supplies geometry/state; the existing game draws each prop.
  const types = ['bunker', 'wall', 'jeep', 'tree', ...Object.keys(game.FIELD_PROPS)];
  const defaults = { bunker: {width:116,height:78,hp:150}, wall:{width:148,height:56,hp:135}, jeep:{width:150,height:104,hp:115}, tree:{width:142,height:166,hp:85} };
  for (let group = 0; group < 2; group++) for (let stage = 0; stage < 4; stage++) {
    await mission(1); game.flatFixture(); game.state.tanks.length = 0; game.obstacles.length = 0;
    for (const [index, type] of types.slice(group * 5, group * 5 + 5).entries()) {
      const spec = game.FIELD_PROPS[type] || defaults[type];
      game.obstacles.push({ ...spec, type, id:index, x:140 + index * 280, maxHp:spec.hp, hp:spec.hp * [1,.6,.15,0][stage], active:stage !== 3, destroyed:stage === 3, variant:0 });
    }
    await capture(`offline-props-${group + 1}-stage-${stage}.png`, `${types.slice(group * 5, group * 5 + 5).join(' / ')} · STAGE ${stage}`, 1000, true);
  }
  console.log(`PASS: filesystem assets decoded and 15 labeled offline native-canvas images rendered using real game drawing code. Output: ${output}`);
  if (process.argv.includes('--stress')) {
    await mission(3);
    let peakParticles = 0, peakEffects = 0;
    const started = process.hrtime.bigint();
    for (let frame = 0; frame < 720; frame++) {
      if (frame % 60 === 0) {
        const target = game.state.tanks[1], weapon = game.weapons[Math.floor(frame / 60)];
        target.hp = target.maxHp; target.alive = true;
        game.impact(target.x, game.surfaceY(target.x) - 40, weapon, 'left', target);
      }
      game.frame(2000 + frame * (1000 / 60));
      peakParticles = Math.max(peakParticles, game.particles.length);
      peakEffects = Math.max(peakEffects, game.effects.length);
    }
    assert(peakParticles <= 560, 'Particle budget exceeded');
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(`PASS: 720 native-canvas frames, 12 weapon impacts, peak particles ${peakParticles}/560, peak effects ${peakEffects}, ${(elapsed / 720).toFixed(2)} ms/frame average. OFFLINE CPU rendering only, not browser/mobile performance.`);
  }
  if (process.argv.includes('--profile')) {
    await mission(3); sandbox.profileTimes = {};
    for (let frame = 0; frame < 180; frame++) {
      if (frame % 60 === 0) {
        const target = game.state.tanks[1]; target.hp = target.maxHp; target.alive = true;
        game.impact(target.x, game.surfaceY(target.x)-40, game.weapons[frame/60], 'left', target);
      }
      game.frame(2000+frame*1000/60);
    }
    console.log('PROFILE_OFFLINE ' + JSON.stringify(sandbox.profileTimes));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
