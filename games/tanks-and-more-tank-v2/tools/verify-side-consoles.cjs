// DOM simulation only: no browser, navigation, or claims of rendered gameplay.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { parseHTML } = require(process.env.TANK_DOM_MODULE || path.join(os.tmpdir(), 'tanks-v2-dom-check/node_modules/linkedom'));
const root = process.env.TANK_GAME_ROOT || path.resolve(__dirname, '..');
const { window, document } = parseHTML(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
let box = { width: 1710, height: 810, left: 0, top: 0 };
const timers = new Map(); let timerId = 0;
const context = new Proxy({}, { get(target, key) {
  if (key in target) return target[key];
  if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
  if (key === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
  if (key === 'getTransform') return () => ({ a: 1, d: 1, e: 0, f: 0 });
  return () => {};
}});
window.HTMLCanvasElement.prototype.getContext = () => context;
window.HTMLElement.prototype.getBoundingClientRect = () => box;
window.HTMLElement.prototype.blur = function() {};
window.HTMLElement.prototype.focus = function() {};
// Linkedom has no form-selection engine; supply the browser's select.value contract.
Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
  get() { return this._selection || this.querySelector('option')?.value || ''; },
  set(value) { this._selection = String(value); },
});
const store = new Map();
const sandbox = { window, document, console, Event: window.Event, Math, Uint32Array, performance: {now: () => 1000},
  Image: function() { const image = document.createElement('img'); image.complete = false; image.naturalWidth = 0; return image; },
  Path2D: function() { return context; },
  ResizeObserver: class { observe() {} },
  localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)) },
  requestAnimationFrame() {},
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
};
window.setTimeout = sandbox.setTimeout; window.clearTimeout = sandbox.clearTimeout;
let source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, 'globalThis.testGame = { state, resize, showSwitchHints, advanceBallistic, launchSpeed, weapons, FLIGHT_TIME_SCALE, BALLISTIC_GRAVITY, update, projectiles, terrain, obstacles, effects, hazards, battlefieldScale }; })();');
vm.runInNewContext(source, sandbox);
const { state, resize, showSwitchHints } = sandbox.testGame;
const { advanceBallistic, launchSpeed, weapons, FLIGHT_TIME_SCALE, BALLISTIC_GRAVITY } = sandbox.testGame;
// Actual flight integrator: demonstrate faster launch / slow apex / fast fall,
// unchanged trajectory, and frame-rate-independent positions for every shell.
for (const weapon of weapons) for (const power of [20, 60, 100]) {
  const speed = launchSpeed(weapon, power), a = 65 * Math.PI / 180;
  const initial = {x: 0, y: 0, vx: speed * Math.cos(a), vy: -speed * Math.sin(a), age: 0};
  const apexTime = -initial.vy / BALLISTIC_GRAVITY;
  const apex = {...initial}; advanceBallistic(apex, apexTime, 0);
  const landing = {...initial}; advanceBallistic(landing, apexTime * 2, 0);
  assert(Math.hypot(apex.vx,apex.vy) < speed * .45);
  assert(Math.abs(Math.hypot(landing.vx,landing.vy) - speed) < 1e-8);
  assert(Math.abs(landing.y) < 1e-8);
  assert(Math.abs(FLIGHT_TIME_SCALE - 1.25) < 1e-8, 'Flight should remain readable, not fast-forwarded');
  assert(apexTime * 2 / FLIGHT_TIME_SCALE <= apexTime * 2 * .81);
  for (const frameDt of [.5, 1, 2]) {
    const p = {...initial}; let remaining = 120;
    while (remaining > 1e-7) { const dt = Math.min(frameDt * FLIGHT_TIME_SCALE,remaining); advanceBallistic(p,dt,.018); remaining -= dt; }
    const expected = {...initial}; advanceBallistic(expected,120,.018);
    assert(Math.abs(p.x-expected.x) < 1e-7 && Math.abs(p.y-expected.y) < 1e-7);
  }
}
console.log('PASS: 12 ordnance types at three charges; readable flight pace, slow apex and accelerating descent; equal paths at 30/60/120 FPS (physics simulation).');
const rack = document.getElementById('ordnanceRack');
assert(rack.parentElement.classList.contains('ordnance-console'));
assert.equal(rack.querySelectorAll('button').length, 12);
for (const [width, height] of [[2235, 830], [1710, 810], [1366, 730], [1024, 730], [820, 650]]) {
  box = { width, height, left: 0, top: 0 }; resize();
  const frame = document.querySelector('.dashboard-frame');
  const container = document.querySelector('.instrument-frame');
  assert(container.classList.contains('has-side-consoles'));
  const frameLeft = parseFloat(frame.style.left), frameWidth = parseFloat(frame.style.width);
  const sideWidth = parseFloat(container.style.getPropertyValue('--side-width'));
  assert(6 + sideWidth < frameLeft, `Ammunition console overlaps fascia at ${width}`);
  assert(width - 6 - sideWidth > frameLeft + frameWidth, `Status console overlaps fascia at ${width}`);
  assert(document.querySelector('.status-console').parentElement === container);
}
for (const chassis of ['m40', 'r12', 'b76', 's90']) {
  document.getElementById('playerChassis').value = chassis;
  document.getElementById('applySettings').dispatchEvent(new window.Event('click'));
  assert.equal(document.body.dataset.chassis, chassis);
  assert(document.getElementById('cockpitSkin').src.includes(`cockpit-${chassis}`));
  const mask = document.getElementById('cockpitSkin').style.getPropertyValue('--gauge-mask');
  assert(mask.includes('data:image/svg+xml,'));
  assert(decodeURIComponent(mask).includes('fill-rule="evenodd"'));
  for (const kind of ['angle', 'power']) {
    assert(parseFloat(document.querySelector('.gauge-layer').style.getPropertyValue(`--${kind}-w`)) > 15);
    assert(document.querySelector('.console').style.getPropertyValue(`--${kind}-y`));
  }
  const input = document.getElementById('power'); input.value = '91'; input.dispatchEvent(new window.Event('input'));
  assert.equal(state.tanks[0].power, 91);
  const enemyWeapon = state.tanks[1].weapon;
  rack.querySelector('[data-weapon="cluster"]').dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.equal(state.tanks[0].weapon, 'cluster'); assert.equal(state.tanks[1].weapon, enemyWeapon);
  assert.equal(document.getElementById('loadedWeaponName').textContent, 'Cluster Storm');
  assert(document.querySelector('.selected-shell-art svg circle'));
}
assert.equal(document.querySelector('.topbar .crew-plate'), null);
assert(document.querySelector('.topbar .battle-strip .mission-card'));
assert(document.querySelector('.topbar .battle-strip #targetCard'));
assert(document.querySelector('.topbar .battle-strip #mapReadout'));
assert.equal(document.querySelector('.status-console .mission-card'), null);
assert.equal(document.querySelector('.ordnance-console .loaded-round small'), null);
state.level = 2; state.atmosphere = 'DAYLIGHT'; showSwitchHints();
assert.equal(document.querySelectorAll('.is-hinting').length, 0);
state.atmosphere = 'NIGHTFALL'; showSwitchHints();
assert.equal(document.querySelectorAll('.is-hinting').length, 1);
for (const [id, timer] of timers) if (timer.delay === 2800) { timer.callback(); timers.delete(id); }
assert.equal(document.querySelectorAll('.is-hinting').length, 0);
box = { width: 390, height: 720, left: 0, top: 0 }; resize();
assert(!document.querySelector('.instrument-frame').classList.contains('has-side-consoles'));
assert(document.querySelector('.mission-panel > .status-console'));
assert(document.querySelector('.ordnance-console #ordnanceRack'));
console.log('PASS: startup, four chassis, five desktop layout boundaries, independent shell selection, large selected-shell preview, temporary hints, and phone menu relocation (DOM simulation).');
const {update, projectiles, terrain, obstacles, effects, hazards, battlefieldScale} = sandbox.testGame;
const crew = state.tanks.map(t => ({...t}));
function fixture() {
  terrain.fill(650); obstacles.length = 0; projectiles.length = 0; effects.length = 0; hazards.length = 0;
  state.tanks = crew.map(t => ({...t,hp:100,maxHp:100,alive:true}));
  state.tanks[0].x=100; state.tanks[1].x=500;
  state.weather='clear'; state.winner=''; state.resolving=true; state.moving=false; state.aiMove=null;
}
function shot(fields={}) {
  return {x:450,y:650-44* battlefieldScale(500),vx:120,vy:0,age:0,weapon:'rail',team:'left',isSub:false,perks:{direct:1,scenery:1},...fields};
}
for (const frameDt of [.5,1,2]) {
  fixture(); projectiles.push(shot()); update(frameDt);
  assert(state.tanks[1].hp < 100, 'Fast round tunneled through the enemy');
  fixture(); state.tanks[1].x=1100;
  const wall={x:500,width:2,height:100,hp:100,active:true,type:'wall',variant:0}; obstacles.push(wall);
  projectiles.push(shot({y:600})); update(frameDt);
  assert(wall.hp < 100, 'Fast round tunneled through thin cover');
  fixture(); state.tanks[1].x=1100;
  projectiles.push(shot({x:400,y:520,vx:8,vy:8,weapon:'cluster'}));
  let split=false;
  for(let frame=0;frame<800 && projectiles.length;frame++) {
    update(frameDt);
    if(projectiles.filter(p=>p.isSub).length===5) split=true;
  }
  assert(split,'Cluster did not split in the descending approach');
  assert.equal(projectiles.length,0,'Cluster flight failed to resolve');
  assert.equal(state.tanks[1].hp,100,'Cluster miss damaged remote enemy');
}
console.log('PASS: actual update loop detects fast tank hits/thin-wall hits, descending cluster splits, complete resolution and no damage on remote misses at 30/60/120 FPS (engine simulation).');
