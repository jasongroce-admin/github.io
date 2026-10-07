// Engine/DOM simulation, not a browser frame-rate benchmark.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let harness = fs.readFileSync(path.join(__dirname, 'verify-campaign-flow.cjs'), 'utf8').split('for (let level = 1; level <= 30;')[0];
harness = harness.replace('impact, battlefieldScale };', 'impact, battlefieldScale, frame, combatCamera, FLIGHT_TIME_SCALE, render, terrainOverdrawY, FIELD_LAYOUT, TERRAIN_OVERDRAW };');
const { game, reset } = new Function('require', '__dirname', harness + '\nreturn {game,reset};')(require, __dirname);
function trajectory(fps) {
  reset(1); game.terrain.fill(730); game.obstacles.length = 0;
  game.projectiles.splice(0, game.projectiles.length, { x: 450, y: 250, vx: 5, vy: -5, age: 0, weapon: 'shell', team: 'left' });
  game.state.lastTime = 1000;
  for (let i = 1; i <= fps; i++) game.frame(1000 + i * 1000 / fps);
  return { ...game.projectiles[0] };
}
const reference = trajectory(60);
for (const fps of [20,30,120]) {
  const actual = trajectory(fps);
  for (const key of ['x','y','vx','vy','age']) assert(Math.abs(actual[key] - reference[key]) < 1e-7, `${fps} FPS drift in ${key}`);
}
reset(1); const tank = game.state.tanks[0];
game.damageTank(tank, 25, 'blast');
assert.equal(tank.damageStage, 1); assert.equal(tank.burnLife, 480);
for (let i = 0; i < 180; i++) game.update(1);
assert.equal(tank.damageStage, 1); assert(tank.burnLife >= 300, 'Damage fire should outlast the impact flash');
game.saveGame(); game.loadGame();
assert.equal(game.state.tanks[0].damageStage, 1); assert(game.state.tanks[0].burnLife > 0);
reset(1); game.damageTank(game.state.tanks[0], 20, 'ice');
assert.equal(game.state.tanks[0].burnLife || 0, 0, 'Cryogenic damage should not start flames');
reset(1);
const resting = game.combatCamera();
game.state.shotCameraBounds = { left: 400, right: 900, top: -100 };
const arc = game.combatCamera(); assert(arc.scale < resting.scale);
game.projectiles.push({ x: 800, y: -180, vy: -1 }); game.combatCamera();
const high = game.combatCamera(); game.projectiles[0].y = 200;
assert.equal(game.combatCamera().scale, high.scale, 'Camera must not pump inward while a shell descends');
game.projectiles.length = 0;
assert.equal(game.combatCamera().scale, high.scale, 'Impact must hold shot framing');
game.selectTurn(0, false); assert.equal(game.combatCamera().scale, resting.scale);
console.log('PASS: real frame timing at 20/30/60/120 FPS; lasting/saved scorch and fire; cryo stays cold; wide resting frame and no flight zoom pumping.');

const contours = new Set();
for (let seed = 1; seed <= 100; seed++) {
  reset(1, 'cpu', 2, seed * 9157);
  contours.add(game.state.terrainRecipe.kind % 3);
  for (const edge of [0,1400]) {
    assert(Math.abs(game.surfaceY(edge - .001) - game.surfaceY(edge + .001)) < .01, 'Ground discontinuity at world edge');
  }
  for (const x of [-3000,-520,-250,0,1400,1650,1920,3000]) assert(Number.isFinite(game.surfaceY(x)), 'Missing offscreen ground');
  const leftSlope = Math.abs(game.surfaceY(-250 + 22) - game.surfaceY(-250 - 22)) / 44;
  const rightSlope = Math.abs(game.surfaceY(1650 + 22) - game.surfaceY(1650 - 22)) / 44;
  assert(Math.max(leftSlope, rightSlope) < .5, 'Backup lanes have an excessive side-bank slope');
}
assert.equal(contours.size, 3, 'Missing one-sided / two-sided bowl variety');
console.log('PASS: 100 seeded edge-continuity checks, one/both-side bowls, finite ground beyond both screen edges and usable backing-up slopes.');
