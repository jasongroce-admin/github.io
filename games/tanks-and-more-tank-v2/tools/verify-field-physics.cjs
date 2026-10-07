// Uses the existing filesystem-only DOM engine harness. No browser/input QA.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let harness = fs.readFileSync(path.join(__dirname, 'verify-campaign-flow.cjs'), 'utf8').split('for (let level = 1; level <= 30;')[0];
harness = harness.replace('impact, battlefieldScale };', 'impact, battlefieldScale, tankScale, obstacleAt, movementObstacleAt, structureFrame, updateSideRocks, deformTerrain, muzzle, terrainSlope, effects, particles, FIELD_PROPS, updateFieldPropExplosions };');
const { game, reset, timers } = new Function('require', '__dirname', harness + '\nreturn {game,reset,timers};')(require, __dirname);
const seen = new Set();
for (let level = 1; level <= 12; level++) for (let seed = 1; seed <= 80; seed++) {
  reset(level, 'cpu', 2, seed * 9157);
  const props = game.obstacles.filter(object => !object.faceRock);
  // Compact battles may intentionally have one safe cover placement rather
  // than forcing the same two-prop silhouette or intruding into a crew pad.
  assert(props.length >= 1 && props.length <= 2, `Empty cover recipe at OP${level} seed${seed}`);
  for (const prop of props) {
    seen.add(prop.type);
    const half = prop.width * (prop.visualScale || 1) * game.battlefieldScale(prop.x) * .5;
    const groundHalf = (prop.foundationWidth || prop.width) * (prop.visualScale || 1) * game.battlefieldScale(prop.x) * .5;
    assert(Math.abs(game.surfaceY(prop.x - groundHalf) - game.surfaceY(prop.x + groundHalf)) < .1, `Sloping foundation: ${prop.type}`);
    for (const tank of game.state.tanks) {
      assert(Math.abs(tank.x - prop.x) > half + 127 * game.tankScale(tank) + 10, `Tank hull intersects ${prop.type}`);
    }
  }
  for (const rock of game.obstacles.filter(object => object.faceRock)) for (const prop of props) {
    assert(Math.abs(rock.x - prop.x) > (rock.width * game.battlefieldScale(rock.x) + prop.width * (prop.visualScale || 1) * game.battlefieldScale(prop.x)) * .5 + 30,
      `Rock intrudes into ${prop.type} foundation`);
  }
  for (const tank of game.state.tanks) {
    const half = 112 * game.tankScale(tank);
    assert(Math.abs(game.surfaceY(tank.x - half) - game.surfaceY(tank.x + half)) < 1, `Track footing tilted OP${level} seed${seed} tank${tank.id}`);
    assert.equal(Math.sign(game.muzzle(tank).x - tank.x), tank.dir, 'Mirrored muzzle faces backwards');
  }
}
for (const type of ['cornerwall','truck','airwreck','fieldgun','depot','bunker','wall','jeep','tree']) assert(seen.has(type), `Missing map variety: ${type}`);
console.log('PASS: 960 seeded maps: one or two grounded strategic cover props, visible hull clearances, level tank pads, reversed muzzle directions, all five new and four existing prop types.');

reset(1); game.terrain.fill(650); game.obstacles.length = 0;
for (const type of ['cornerwall','truck','airwreck','fieldgun','depot']) {
  const object = { type, x: 700, width: 170, height: 100, hp: 100, maxHp: 100, active: true };
  game.obstacles.splice(0, game.obstacles.length, object);
  assert.equal(game.structureFrame(object), 0); assert(game.movementObstacleAt(700));
  object.hp = 60; assert.equal(game.structureFrame(object), 1); assert.equal(game.movementObstacleAt(700), null);
  object.hp = 20; assert.equal(game.structureFrame(object), 2); assert(game.obstacleAt(700, 625), 'Damaged cover should still intercept shells');
  object.hp = 0; object.active = false; object.destroyed = true;
  assert.equal(game.structureFrame(object), 3); assert.equal(game.obstacleAt(700, 625), null);
}
// Inverse-rotation regression: a shot inside tilted art must hit its collider.
game.terrain.forEach((_, index) => { game.terrain[index] = 500 + index * 8 * .22; });
const truck = { type: 'truck', x: 700, width: 210, height: 130, hp: 100, maxHp: 100, active: true };
game.obstacles.splice(0, game.obstacles.length, truck);
const slope = game.terrainSlope(700), scale = game.battlefieldScale(700);
const lx = 100 * scale, ly = -100 * scale;
assert.equal(game.obstacleAt(700 + lx * Math.cos(slope) - ly * Math.sin(slope), game.surfaceY(700) + lx * Math.sin(slope) + ly * Math.cos(slope)), truck);
console.log('PASS: four damage stages, breached/rubble driveability, remaining cover collision, and rotated hitbox alignment.');

reset(1); const rock = game.obstacles.find(object => object.faceRock);
const oldX = rock.x;
game.deformTerrain(rock.x, rock.anchorY, 70, 35);
game.updateSideRocks(1); assert(rock.rolling > 0, 'Eroded rock did not release');
rock.active = false; rock.destroyed = true; rock.hp = 0;
for (let frame = 0; frame < 250; frame++) game.updateSideRocks(1);
assert(Math.abs(rock.rockY - game.surfaceY(rock.x)) < .01, 'Destroyed rock freezes above ground');
assert(Math.abs(rock.x - oldX) > .1, 'Released rock never rolls');
console.log('PASS: eroded hillside rocks roll and destroyed fragments settle rather than hover.');

reset(1); game.terrain.fill(650); game.obstacles.length = 0;
const shooter = game.state.tanks[0], target = game.state.tanks[1]; shooter.x = 300; target.x = 800;
const enemyHp = target.hp, w = game.weapons.find(weapon => weapon.key === 'heavy');
game.impact(target.x, 620, w, 'left', target);
assert(target.hp < enemyHp); assert(game.effects.some(effect => effect.stage === 'aftermath' && effect.life >= 130));
assert(game.particles.length <= 560);
for (const tank of game.state.tanks) { tank.hp = tank.maxHp; tank.alive = true; }
game.state.resolving = true; game.projectiles.length = 0; timers.clear();
game.projectiles.push({ x: 650, y: 640, vx: 0, vy: 20, age: 1, weapon: 'shell', team: 'left', perks: {direct:1,scenery:1} });
game.update(1);
assert(Array.from(timers.values()).some(timer => timer.delay === 2400), 'Impact turn hold missing');
assert.equal(game.state.turnIndex, 0, 'Camera switched before damage settled');
console.log('PASS: direct damage produces lasting aftermath; final impact holds the current crew for 2.4 seconds; particle budget retained.');

reset(1); game.terrain.fill(650); game.obstacles.length = 0;
const plane = { ...game.FIELD_PROPS.airwreck, type: 'airwreck', x: 700, maxHp: game.FIELD_PROPS.airwreck.hp, active: true };
game.obstacles.push(plane);
const planeScale = game.battlefieldScale(700), wingX = 700 + 100 * planeScale, wingY = 650 - 35 * planeScale;
assert.equal(game.obstacleAt(wingX, wingY), plane, 'Outer aircraft wing does not intercept a shell');
const armorBefore = game.state.tanks.map(tank => tank.hp);
game.impact(wingX, wingY, game.weapons.find(weapon => weapon.key === 'shell'), 'left', null);
assert(plane.hp < plane.maxHp, 'Wing hit fails to damage the aircraft');
assert(plane.detonateIn > 0, 'Aircraft fuel has no secondary explosion');
game.updateFieldPropExplosions(23);
assert(plane.secondarySpent && plane.destroyed && !plane.active, 'Aircraft fuel blast does not leave rubble');
assert.deepEqual(game.state.tanks.map(tank => tank.hp), armorBefore, 'Scenery explosion damages armor without a direct hit');
const aftermathCount = game.effects.length;
game.updateFieldPropExplosions(100);
assert.equal(game.effects.length, aftermathCount, 'Aircraft fuel explosion repeats');
console.log('PASS: aircraft wing collision, damage and once-only fuel blast/rubble; scenery blasts leave remote tank armor unchanged.');
