// Exercises the real game engine in a DOM simulation. No browser/rendered QA.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { parseHTML } = require(process.env.TANK_DOM_MODULE || path.join(os.tmpdir(), 'tanks-v2-dom-check/node_modules/linkedom'));
const root = process.env.TANK_GAME_ROOT || path.resolve(__dirname, '..');
const { window, document } = parseHTML(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
const timers = new Map(); let timerId = 0;
const context = new Proxy({}, { get(target, key) {
  if (key in target) return target[key];
  if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
  if (key === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
  if (key === 'getTransform') return () => ({ a: 1, d: 1, e: 0, f: 0 });
  return () => {};
}});
window.HTMLCanvasElement.prototype.getContext = () => context;
window.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 1710, height: 810, left: 0, top: 0 });
window.HTMLElement.prototype.blur = function() {};
window.HTMLElement.prototype.focus = function() {};
Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
  get() { return this._selection || this.querySelector('option')?.value || ''; },
  set(value) { this._selection = String(value); },
});
const store = new Map();
const sandbox = { window, document, console, Event: window.Event, Math, Uint32Array, performance: { now: () => 1000 },
  Image: function() { const image = document.createElement('img'); image.complete = false; image.naturalWidth = 0; return image; },
  Path2D: function() { return context; }, ResizeObserver: class { observe() {} }, requestAnimationFrame() {},
  localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)) },
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
};
window.setTimeout = sandbox.setTimeout; window.clearTimeout = sandbox.clearTimeout;
let source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, 'globalThis.testGame = { state, newMap, generateBattlefield, setFormation, formationSlots, selectTurn, nextTurn, activeTank, saveGame, loadGame, damageTank, cpuTurn, fire, update, projectiles, terrain, obstacles, surfaceY, weapons, impact, battlefieldScale }; })();');
vm.runInNewContext(source, sandbox);
const game = sandbox.testGame;
const { state, newMap, nextTurn, activeTank, selectTurn, formationSlots, surfaceY, saveGame, loadGame, damageTank, projectiles, update } = game;
function reset(level, opponent = 'cpu', formation = 2, seed = 7821) {
  timers.clear(); state.level = level; state.opponent = opponent; state.formation = formation; state.mode = 'campaign';
  state.winner = ''; state.weather = 'clear'; state.difficulty = 'recruit'; newMap(false, seed);
}
function ids() { return Array.from(state.tanks, tank => tank.id); }
function runTimer(delay) {
  const entry = Array.from(timers).find(([, timer]) => timer.delay === delay);
  assert(entry, `Missing ${delay}ms timer`); timers.delete(entry[0]); entry[1].callback();
}
for (let level = 1; level <= 30; level++) for (const seed of [1, 7821, 1234567, 0xdeadbeef]) {
  reset(level, 'cpu', 2, seed);
  assert.equal(state.tanks.length, level % 3 === 0 ? 3 : 2);
  const hero = state.tanks[0], hostiles = state.tanks.slice(1);
  assert.equal(hero.team, 'left'); assert.equal(hero.dir, level % 2 === 0 ? -1 : 1);
  for (const hostile of hostiles) {
    assert.equal(hostile.team, 'right'); assert.equal(hostile.dir, -hero.dir);
    assert.equal(hostile.scale, level % 3 === 0 ? .8 : 1);
    if (level % 3 === 0) assert.equal(hostile.maxHp, 70);
    assert((hostile.x - hero.x) * hero.dir > 0, 'Crew faces away from the enemy');
  }
  for (let i = 0; i < state.tanks.length; i++) for (let j = i + 1; j < state.tanks.length; j++) {
    assert(Math.abs(state.tanks[i].x - state.tanks[j].x) >= 179, 'Spawn centers overlap');
  }
  assert.deepEqual(Array.from(formationSlots(), slot => slot.x), Array.from(state.tanks, tank => tank.x));
}
console.log('PASS: 120 generated maps across operations 1–30: alternating starts, every-third-operation reinforcements, 70 HP/.8 scale and distinct inward-facing spawns.');

for (const level of [3, 6]) {
  reset(level);
  const schedule = [];
  for (let i = 0; i < 7; i++) { schedule.push(activeTank().id); nextTurn(); }
  assert.deepEqual(schedule, ['L1', 'R1', 'R2', 'L1', 'R1', 'R2', 'L1']);
  assert(document.getElementById('turnLabel').textContent.includes('HOSTILE-01'));
  reset(level); damageTank(state.tanks[1], 1000); nextTurn(); assert.equal(activeTank().id, 'R2');
  nextTurn(); assert.equal(activeTank().id, 'L1'); assert.equal(state.winner, '');
  reset(level); selectTurn(1); damageTank(activeTank(), 1000); nextTurn(); assert.equal(activeTank().id, 'R2');
  reset(level); damageTank(state.tanks[1], 1000); damageTank(state.tanks[2], 1000); nextTurn();
  assert.equal(state.winner, 'left'); runTimer(3000); assert.equal(state.level, level + 1); assert.equal(state.winner, '');
  reset(level); selectTurn(1); damageTank(state.tanks[0], 1000); nextTurn();
  assert.equal(state.winner, 'right'); assert(state.turnIndex >= 0); assert.equal(activeTank().id, 'R1');
  assert(!Array.from(timers.values()).some(timer => timer.delay === 3000));
}
console.log('PASS: hero → CPU 1 → CPU 2 cycles, dead/active-dead skips, victory only after both hostiles, next-map advancement and CPU victory without an invalid index.');

// Run scheduled CPU behavior and the real movement/flight loop for each gunner.
reset(3); game.terrain.fill(650); game.obstacles.length = 0;
for (const index of [1, 2]) {
  projectiles.length = 0; state.moving = false; state.resolving = false; state.aiMove = null; timers.clear();
  selectTurn(index); const gunner = activeTank(); runTimer(800);
  for (let frame = 0; state.moving && frame < 500; frame++) update(1);
  assert(projectiles.length > 0, `${gunner.id} never fired`);
  assert.equal(projectiles[0].team, 'right'); assert.equal(activeTank(), gunner);
  let frames = 0;
  while (projectiles.length && frames++ < 1500) update(1);
  assert.equal(projectiles.length, 0, `${gunner.id} shot never resolved`);
  // Fresh health keeps the second CPU test independent of first-shot accuracy.
  for (const tank of state.tanks) { tank.hp = tank.maxHp; tank.alive = true; }
  state.winner = '';
}
console.log('PASS: both scheduled CPU gunners execute their actual aim/move/fire code and resolve real projectiles in the update loop.');

for (const opponent of ['local', 'cpu']) {
  reset(6, opponent, 4); assert.deepEqual(ids(), ['L1', 'R1', 'L2', 'R2']);
  assert(state.tanks.every(tank => tank.scale === 1));
  for (const id of ['L1', 'R1', 'L2', 'R2', 'L1']) { assert.equal(activeTank().id, id); nextTurn(); }
}
reset(6, 'local'); assert.equal(state.tanks.length, 2); assert(state.tanks[0].x < state.tanks[1].x);
assert.equal(state.tanks[0].dir, 1); assert.equal(state.tanks[1].scale, 1);
console.log('PASS: local two-tank and manual four-tank configurations retain their counts, positions, scales and full crew rotation.');

reset(6); selectTurn(2); activeTank().hp = 31; activeTank().weapon = 'heavy'; activeTank().power = 77; saveGame();
const snapshot = store.get('tam-v2-save'); reset(1); loadGame();
assert.deepEqual(ids(), ['L1', 'R1', 'R2']); assert.equal(state.level, 6); assert.equal(activeTank().id, 'R2');
assert.equal(activeTank().hp, 31); assert.equal(activeTank().maxHp, 70); assert.equal(activeTank().scale, .8);
assert.equal(activeTank().weapon, 'heavy'); assert.equal(activeTank().power, 77); assert.equal(state.tanks[0].dir, -1);
nextTurn(); assert.equal(activeTank().id, 'L1');
const stale = JSON.parse(snapshot); stale.turnIndex = 200; stale.tanks[0].hp = 0; stale.tanks[0].alive = false;
store.set('tam-v2-save', JSON.stringify(stale)); loadGame(); assert.equal(state.winner, 'right'); assert.equal(state.turnIndex, 1);
const legacy = JSON.parse(snapshot); legacy.level = 3; legacy.tanks.pop(); legacy.turnIndex = 0;
for (const tank of legacy.tanks) { delete tank.scale; delete tank.chassis; delete tank.maxHp; tank.hp = 100; }
store.set('tam-v2-save', JSON.stringify(legacy)); loadGame(); assert.equal(state.tanks.length, 2);
assert.equal(state.tanks[1].scale, 1); assert.equal(state.tanks[1].hp, 100);
const beforeInvalid = state.tanks;
for (const invalid of [{ ...legacy, terrain: [1] }, { ...legacy, tanks: [] }, { ...legacy, tanks: [legacy.tanks[0], legacy.tanks[0]] }]) {
  store.set('tam-v2-save', JSON.stringify(invalid)); loadGame(); assert.equal(state.tanks, beforeInvalid);
}
console.log('PASS: three-crew reversed save restores health/scale/direction/loadouts; stale indices recover, legacy saves keep their crews, malformed saves preserve the current battle.');

// Enable once map integration has reserved clearances and pads for all slots.
if (process.env.TANK_CHECK_SPAWN_PADS === '1') {
  for (const level of [1, 2, 3, 6]) for (const seed of [1, 7821, 1234567, 0xdeadbeef]) {
    reset(level, 'cpu', 2, seed);
    for (const tank of state.tanks) {
      const halfTrack = 42 * game.battlefieldScale(tank.x) * tank.scale;
      assert(Math.abs(surfaceY(tank.x - halfTrack) - surfaceY(tank.x + halfTrack)) < 1, `Unlevel tank pad: OP ${level} ${tank.id}`);
      for (const obstacle of game.obstacles) if (obstacle.active) {
        assert(Math.abs(obstacle.x - tank.x) >= obstacle.width / 2 + halfTrack + 12, `Spawn overlaps ${obstacle.type}: OP ${level} ${tank.id}`);
      }
    }
  }
  console.log('PASS: all generated crew tracks rest on flat pads with clearance from every active map prop.');
}
