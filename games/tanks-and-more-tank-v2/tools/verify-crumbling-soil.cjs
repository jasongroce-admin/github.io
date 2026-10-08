// Engine checks only; no browser performance or physical-touch claims.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let harness = fs.readFileSync(path.join(__dirname, 'verify-campaign-flow.cjs'), 'utf8').split('for (let level = 1; level <= 30;')[0];
harness = harness.replace('impact, battlefieldScale };', 'impact, battlefieldScale, deformTerrain, updateSoilSlides, updateEarthClods, soilSlides, particles };');
const {game, reset} = new Function('require', '__dirname', harness + '\nreturn {game,reset};')(require, __dirname);
reset(1); game.terrain.fill(560); game.obstacles.length = 0;
const original = Array.from(game.terrain);
game.deformTerrain(700, 100, 70, 60);
assert.deepEqual(Array.from(game.terrain), original, 'Sky burst drills into distant soil');
game.deformTerrain(700, 560, 70, 60);
assert(game.terrain[Math.round(700/8)] > 600, 'No persistent crater');
assert(game.particles.some(p => p.kind === 'earth'), 'No ejected soil');
const afterBlast = Array.from(game.terrain), volume = game.terrain.reduce((a,b) => a+b,0);
for (let i=0;i<100;i++) game.updateSoilSlides(1);
assert.equal(game.soilSlides.length,0, 'Soil never stops simulating');
assert(Math.abs(game.terrain.reduce((a,b) => a+b,0) - volume) < 1e-7, 'Sliding creates or deletes soil');
assert(game.terrain.some((y,i) => Math.abs(y-afterBlast[i])>.1), 'Crater banks do not crumble');
for (let i=0;i<game.terrain.length;i++) if (Math.abs(i*8-700)>140) assert.equal(game.terrain[i],original[i], 'Remote ground collapses');
for (let i=0;i<120;i++) game.updateEarthClods(1);
for (const p of game.particles.filter(p => p.kind==='earth')) assert(p.y <= game.surfaceY(p.x)+.01, 'Clod sinks into ground');
const armor = game.state.tanks.map(t=>t.hp);
for (let i=0;i<180;i++) game.update(1);
assert.deepEqual(game.state.tanks.map(t=>t.hp),armor,'Cosmetic dirt damages tank armor');
function collapse(dt) {
  reset(1); game.terrain.fill(560); game.deformTerrain(700,560,70,60);
  for (let elapsed=0;elapsed<96;elapsed+=dt) game.updateSoilSlides(dt);
  return Array.from(game.terrain);
}
assert.deepEqual(collapse(1),collapse(3),'Collapse depends on display frame rate');
for(let i=0;i<30;i++) game.deformTerrain(100+(i%10)*100,game.surfaceY(100+(i%10)*100),30,10);
assert(game.soilSlides.length<=8 && game.particles.length<=560,'Debris work budget exceeded');
reset(2); assert.equal(game.soilSlides.length,0,'Old landslide survives new level');
console.log('PASS: contact-local craters, conservative soil collapse, settled clods, unchanged armor, fixed-cadence settling and bounded queues.');
