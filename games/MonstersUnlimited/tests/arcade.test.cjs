const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const gameDir = path.resolve(__dirname, '..');

function makeContext() {
  const ctx = new Proxy({}, {
    get(target, key) {
      if (!(key in target)) target[key] = () => {};
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  const listeners = new Map();
  const element = (id = 'created') => ({
    listeners: new Map(),
    style: {}, dataset: {}, attributes: {}, textContent: '', disabled: false,
    width: 960, height: 540,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(name, fn) { this.listeners.set(name, fn); listeners.set(`${id}:${name}`, fn); },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    setPointerCapture() {},
    getContext() { return ctx; }
  });
  const elements = new Map();
  const document = {
    hidden: false,
    addEventListener(name, fn) { listeners.set(`document:${name}`, fn); },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element(id));
      return elements.get(id);
    },
    createElement() { return element(); }
  };
  const window = {
    MONSTERS_UNLIMITED_ASSETS: undefined,
    MONSTERS_UNLIMITED_LEVELS: undefined,
    addEventListener(name, fn) { listeners.set(`window:${name}`, fn); },
    setTimeout,
    clearTimeout,
    location: { search: '?qa' }
  };
  const store = new Map();
  const localStorage = {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, String(value)); }
  };
  const sandbox = {
    window, document, localStorage,
    Image: class { set src(value) { this._src = value; } get src() { return this._src; } },
    URLSearchParams, performance: { now: () => 0 },
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    console,
    Math,
    setTimeout, clearTimeout
  };
  sandbox.__elements = elements;
  sandbox.__listeners = listeners;
  sandbox.globalThis = sandbox;

  const levelSource = fs.readFileSync(path.join(gameDir, 'level-data.js'), 'utf8');
  vm.runInNewContext(levelSource, sandbox, { filename: 'level-data.js' });
  const rendererSource = fs.readFileSync(path.join(gameDir, 'monster-renderer.js'), 'utf8');
  vm.runInNewContext(rendererSource, sandbox, { filename: 'monster-renderer.js' });
  const gameSource = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8').replace(/\r\n/g, '\n');
  const marker = '  reset();\n  draw();';
  const markerIndex = gameSource.lastIndexOf(marker);
  assert.notEqual(markerIndex, -1, 'game initialization marker must be present');
  const instrumented = `${gameSource.slice(0, markerIndex)}
  globalThis.__test = {
    reset, loadLevel, movePlayer, update, punch, getHitCell, damagePlayer,
    updateBuildings, updateEnemies, updateHumans, roofAt, punchOrigin, currentSize, playerRect, humanRect, input, keys, held, projectiles,
    get state() { return { player, level, cameraX, cameraY, pointerAim, running, paused, campaignIndex, cleared }; },
    set running(value) { running = value; },
    listeners: __listeners, elements: __elements, assets, renderer: window.MonstersUnlimitedRenderer,
    set selectedMonsterId(value) { selectedMonsterId = value; },
    set punchCooldown(value) { punchCooldown = value; },
    get punchCooldown() { return punchCooldown; },
    set eatCooldown(value) { eatCooldown = value; }
  };
  reset();
})();`;
  vm.runInNewContext(instrumented, sandbox, { filename: 'game.js' });
  return sandbox.__test;
}

const game = makeContext();

function freshMonster() {
  game.reset();
  const { player, level } = game.state;
  player.state = 'monster';
  player.y = level.world.groundY - level.player.monster.h;
  player.onGround = true;
  player.climbing = false;
  player.vx = 0;
  player.vy = 0;
  player.invulnerable = 0;
  return game.state;
}

function keepCityActive(level) {
  const world = level.world;
  level.buildings = [{ id: 'remote-test-building', x: world.width - 80, y: world.groundY - 90,
    w: 60, h: 90, cols: 1, rows: 1, hp: 1, points: 0, maxCells: 1,
    cells: [[1]], collapsed: false, collapse: null, rubble: [] }];
}

function prepareBackhandTargets() {
  const { level, player } = freshMonster();
  game.running = true;
  keepCityActive(level);
  level.humans = [];
  level.soldiers = [];
  const spec = game.currentSize();
  player.attackKind = 'backhand';
  const backOrigin = game.punchOrigin();
  player.attackKind = 'punch';
  const frontOrigin = game.punchOrigin();
  const reach = spec.w * .55;
  const makeVehicle = (origin, direction) => ({
    x: origin.x + direction * reach - 52,
    y: origin.y - 25,
    health: 5,
    dir: 0,
    speed: 0
  });
  const rear = makeVehicle(backOrigin, -1);
  const front = makeVehicle(frontOrigin, 1);
  level.vehicles = [rear, front];
  return { level, player, rear, front };
}

test('masonry lookup rejects attacks whose hitbox misses the building', () => {
  const { level } = freshMonster();
  const building = level.buildings[0];
  assert.equal(game.getHitCell(building, {
    x: building.x + building.w + 8,
    y: building.y + 20,
    w: 24,
    h: 24
  }), null);
});

test('masonry lookup rejects a hitbox entirely inside a destroyed cell', () => {
  const { level } = freshMonster();
  const building = level.buildings[0];
  const row = 3;
  const col = 1;
  building.cells[row][col] = 0;
  const cellW = building.w / building.cols;
  const cellH = building.h / building.rows;
  const hit = {
    x: building.x + col * cellW + cellW * .25,
    y: building.y + row * cellH + cellH * .25,
    w: cellW * .5,
    h: cellH * .5
  };
  assert.equal(game.getHitCell(building, hit), null);
});

test('walking along the street can pass through a building facade', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  player.x = building.x - game.currentSize().w - 28;
  player.y = level.world.groundY - game.currentSize().h;
  player.onGround = true;
  player.onRoof = '';
  player.vx = player.vy = 0;
  game.input.x = 1;
  game.input.y = 0;
  for (let i = 0; i < 120; i++) game.movePlayer(1 / 60);
  assert.ok(player.x > building.x + building.w,
    'street movement should carry the monster past the building instead of treating its facade as a wall');
});

test('roof landing uses the highest surviving cell in the player column', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  building.cells = Array.from({ length: building.rows }, () => Array(building.cols).fill(0));
  const survivingColumn = 0;
  const firstSurvivingRow = 3;
  for (let row = firstSurvivingRow; row < building.rows; row++) building.cells[row][survivingColumn] = 1;
  const cellW = building.w / building.cols;
  const landingTop = building.y + firstSurvivingRow * building.h / building.rows;
  player.x = building.x + cellW * .5 - game.currentSize().w * .5;
  player.y = landingTop - game.currentSize().h - 4;
  player.vy = 100;
  player.onGround = false;
  player.onRoof = '';
  game.input.x = game.input.y = 0;
  game.movePlayer(.05);
  assert.equal(player.onRoof, building.id);
  assert.equal(player.y + game.currentSize().h, landingTop,
    'a destroyed top row should leave a lower roof on surviving masonry');
});

test('climb grab is unavailable when the nearby side cells are gone', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  for (const row of [1, 2]) building.cells[row][0] = 0;
  player.x = building.x - game.currentSize().w * .68;
  player.y = building.y + 90;
  player.onGround = false;
  player.climbing = false;
  player.climbBuildingId = '';
  player.grabCooldown = 0;
  game.input.x = 0;
  game.input.y = -1;
  game.movePlayer(.016);
  assert.equal(player.climbing, false,
    'surviving interior cells should not allow a grip on a destroyed left edge');
});

test('climbing detaches when the edge cells supporting the grip are destroyed', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  player.x = building.x - game.currentSize().w * .68;
  player.y = building.y + 90;
  player.onGround = false;
  player.climbing = true;
  player.climbSide = 'left';
  player.climbBuildingId = building.id;
  player.grabCooldown = 0;
  for (const row of [1, 2]) building.cells[row][0] = 0;
  game.input.x = 0;
  game.input.y = 0;
  game.movePlayer(.016);
  assert.equal(player.climbing, false);
  assert.equal(player.climbBuildingId, '');
});

test('destroyed vehicles reach zero health and stop awarding repeated hit score', () => {
  const { level, player } = freshMonster();
  const vehicle = { x: 0, y: 0, health: 3, dir: 0, speed: 0 };
  level.buildings = [];
  level.humans = [];
  level.soldiers = [];
  level.vehicles = [vehicle];
  const originX = player.x + game.currentSize().w * .57;
  const originY = player.y + game.currentSize().h * .43;
  vehicle.x = originX + game.currentSize().w * .55 - 25;
  vehicle.y = originY - 10;

  for (let i = 0; i < 3; i++) {
    game.punchCooldown = 0;
    game.punch();
  }
  assert.equal(vehicle.health, 0);
  const scoreAtDestruction = player.score;
  for (let i = 0; i < 3; i++) {
    game.punchCooldown = 0;
    game.punch();
  }
  assert.equal(player.score, scoreAtDestruction);
});

test('wall jump preserves horizontal momentum after jump input is released', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  player.x = building.x - game.currentSize().w * .68;
  player.y = building.y + 140;
  player.onGround = false;
  player.climbing = true;
  player.climbSide = 'left';
  player.climbBuildingId = building.id;
  game.input.x = 0;
  game.input.y = 0;
  player.jumpBuffer = .14;
  game.movePlayer(1 / 60);
  const afterKickX = player.x;
  game.movePlayer(0.12);
  assert.notEqual(player.x, afterKickX, 'horizontal displacement should continue after button release');
  assert.equal(player.climbing, false, 'wall jump must detach from the wall');
});

test('player can stand on an intact roof and falls when that support disappears', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  player.x = building.x + 12;
  player.y = building.y - game.currentSize().h - 4;
  player.vy = 100;
  player.onGround = false;
  game.input.x = 0;
  game.input.y = 0;
  game.input.jump = false;
  game.movePlayer(0.05);
  assert.equal(player.onRoof, building.id);
  assert.equal(player.y + game.currentSize().h, building.y);

  building.collapsed = true;
  game.updateBuildings(.016);
  assert.equal(player.onRoof, '');
  assert.equal(player.onGround, false);
  const beforeFall = player.y;
  game.input.x = 0;
  game.input.y = 0;
  game.movePlayer(.05);
  assert.ok(player.y > beforeFall, 'the player should descend after roof support is removed');
});

test('walking past a roof edge loses platform support and begins falling', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  const spec = game.currentSize();
  player.x = building.x + building.w - spec.w * .5 - 4;
  player.y = building.y - spec.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.onRoof = building.id;
  game.input.x = 1;
  game.input.y = 0;
  game.movePlayer(.1);
  assert.equal(player.onRoof, '');
  assert.ok(player.y > building.y - spec.h,
    'the player should fall once their support column passes the roof edge');
});

test('downward punch from a roof damages the masonry below the player', () => {
  const { level, player } = freshMonster();
  const building = level.buildings.find((item) => item.id === 'tower');
  level.buildings = [building];
  player.x = building.x + 8;
  player.y = building.y - game.currentSize().h;
  player.onRoof = building.id;
  player.onGround = true;
  game.input.x = 0;
  game.input.y = 1;
  const before = building.cells.flat().reduce((sum, hp) => sum + hp, 0);
  game.punch();
  const after = building.cells.flat().reduce((sum, hp) => sum + hp, 0);
  assert.ok(after < before, 'the downward strike should intersect the building below the roof');
});

test('left and right directional strikes hit only within the intended reach', () => {
  const { level, player } = freshMonster();
  level.buildings = [];
  level.humans = [];
  level.soldiers = [];
  const spec = game.currentSize();
  const origin = game.punchOrigin();
  const reach = spec.w * .55;
  const makeVehicle = (centerX) => ({ x: centerX - 52, y: origin.y - 25, health: 3, dir: 0, speed: 0 });
  const nearRight = makeVehicle(origin.x + reach);
  const farRight = makeVehicle(origin.x + reach + 90);
  const nearLeft = makeVehicle(origin.x - reach);
  level.vehicles = [nearRight, farRight, nearLeft];

  game.input.x = 1;
  game.input.y = 0;
  game.punch();
  assert.equal(nearRight.health, 2);
  assert.equal(farRight.health, 3, 'targets beyond the strike box should not be hit');
  assert.equal(nearLeft.health, 3);
  assert.ok(player.attackAim.x > .99);

  game.punchCooldown = 0;
  game.input.x = -1;
  game.punch();
  assert.equal(nearLeft.health, 2);
  assert.equal(nearRight.health, 2);
  assert.equal(player.punchDir, -1);
  assert.ok(player.attackAim.x < -.99);
});

test('reversing strike direction can create a backhand vector without flipping facing', () => {
  const { level, player } = freshMonster();
  level.buildings = [];
  level.humans = [];
  level.vehicles = [];
  level.soldiers = [];
  player.facing = 1;
  game.input.x = -1;
  game.input.y = 0;
  game.punch();
  assert.equal(player.facing, 1, 'a swing direction should not rotate the body facing');
  assert.ok(player.attackAim.x * player.facing < 0, 'the swing vector points behind the facing direction');
  assert.equal(player.attackKind, 'backhand', 'a strike behind the current facing should select the backhand pose');
});

test('K backhand hits behind the monster without turning the body around', () => {
  const { player, rear, front } = prepareBackhandTargets();
  const originalFacing = player.facing;
  const serial = player.attackSerial;
  game.listeners.get('window:keydown')({ key: 'k', repeat: false, preventDefault() {} });
  game.update(.016);
  assert.equal(rear.health, 4);
  assert.equal(front.health, 5);
  assert.equal(player.facing, originalFacing);
  assert.equal(player.attackKind, 'backhand');
  assert.ok(player.attackAim.x * player.facing < 0);
  assert.equal(player.attackSerial, serial + 1);
});

test('held K backhand repeats until key release', () => {
  const { player, rear, front } = prepareBackhandTargets();
  const initialSerial = player.attackSerial;
  game.listeners.get('window:keydown')({ key: 'k', repeat: false, preventDefault() {} });
  game.update(.016);
  game.update(.25);
  assert.equal(rear.health, 3);
  assert.equal(front.health, 5);
  assert.equal(player.attackSerial, initialSerial + 2);
  const serialAtRelease = player.attackSerial;
  game.listeners.get('window:keyup')({ key: 'k' });
  game.update(.25);
  assert.equal(rear.health, 3);
  assert.equal(player.attackSerial, serialAtRelease);
});

test('touch backhand repeats while held and pointerup stops subsequent swings', () => {
  const { player, rear, front } = prepareBackhandTargets();
  const button = game.elements.get('backhandBtn');
  button.listeners.get('pointerdown')({ preventDefault() {}, pointerId: 7 });
  game.update(.016);
  game.update(.25);
  assert.equal(rear.health, 3);
  assert.equal(front.health, 5);
  const serialAtRelease = player.attackSerial;
  button.listeners.get('pointerup')();
  assert.equal(game.held.backhand, false);
  game.update(.25);
  assert.equal(rear.health, 3);
  assert.equal(player.attackSerial, serialAtRelease);
});

test('all six playable monsters select a skeletal rig with connected attack and climb poses', () => {
  const roster = game.assets.monsters.filter((asset) => asset.playable !== false);
  assert.equal(roster.length, 6);
  const buildingTemplate = game.state.level.buildings[0];

  for (const asset of roster) {
    assert.equal(asset.rig?.type, 'skeletal', `${asset.id} should use the skeletal renderer`);
    assert.ok(asset.rig?.atlas, `${asset.id} should provide a rig atlas`);
    assert.ok(fs.existsSync(path.join(gameDir, asset.rig.atlas)), `${asset.id} atlas must exist`);
    game.selectedMonsterId = asset.id;
    game.loadLevel(0);
    const { level, player } = game.state;
    const spec = game.currentSize();
    assert.equal(level.player.monsterId, asset.id);

    player.facing = 1;
    player.attackTimer = .2;
    player.attackKind = 'backhand';
    player.attackAim = { x: -1, y: 0 };
    let pose = game.renderer.geometry({ asset, player, spec, time: .2 });
    assert.equal(pose.arms[0].attacking, true, `${asset.id} should animate a rear-side backhand`);
    assert.equal(pose.arms[1].attacking, false);
    assert.ok(pose.arms[0].hand.x < player.x, `${asset.id} backhand should extend behind its facing`);

    player.attackKind = 'punch';
    player.attackAim = { x: 1, y: 0 };
    pose = game.renderer.geometry({ asset, player, spec, time: .2 });
    assert.equal(pose.arms[0].attacking, false);
    assert.equal(pose.arms[1].attacking, true, `${asset.id} should animate the forward punch arm`);
    assert.ok(pose.arms[1].hand.x > player.x + spec.w, `${asset.id} punch should reach in front of its facing`);

    const building = level.buildings[0] || buildingTemplate;
    player.x = building.x - spec.w * .68;
    player.y = building.y + 100;
    player.climbing = true;
    player.climbSide = 'left';
    player.climbBuildingId = building.id;
    player.onGround = false;
    player.attackTimer = 0;
    pose = game.renderer.geometry({ asset, player, spec, time: .2 });
    for (const arm of pose.arms) {
      for (const point of [arm.shoulder, arm.elbow, arm.wrist, arm.hand]) {
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${asset.id} climb joints should remain finite`);
      }
      assert.ok(Math.abs(arm.hand.x - building.x) < spec.w * .1,
        `${asset.id} climbing hand should stay connected to the contacted wall`);
    }
  }
});

test('ape and wolf gaits plant the stance foot and swing it forward in both travel directions', () => {
  for (const monsterId of ['grokkon', 'thorvak']) {
    for (const direction of [1, -1]) {
      game.selectedMonsterId = monsterId;
      game.loadLevel(0);
      const { level, player } = game.state;
      const asset = game.assets.monsters.find((item) => item.id === monsterId);
      const spec = game.currentSize();
      player.x = 500;
      player.y = level.world.groundY - spec.h;
      player.vx = direction * 240;
      player.facing = direction;
      player.onGround = true;
      player.climbing = false;
      player.attackTimer = 0;

      const geometry = (time) => game.renderer.geometry({ asset, player, spec, time });
      const stanceStart = geometry(0).legs[1].sole;
      const stanceCenterStart = player.x + spec.w * .5;
      player.x += direction * 240 * .02;
      const stanceNext = geometry(.02).legs[1].sole;
      const stanceCenterNext = player.x + spec.w * .5;
      assert.ok(Math.abs(stanceNext.x - stanceStart.x) < .01,
        `${monsterId} stance foot should stay planted in world space while facing ${direction}`);
      const stanceRelativeStart = direction * (stanceStart.x - stanceCenterStart);
      const stanceRelativeNext = direction * (stanceNext.x - stanceCenterNext);
      assert.ok(stanceRelativeNext < stanceRelativeStart,
        `${monsterId} planted foot should move rearward relative to its facing torso`);

      game.loadLevel(0);
      const swingPlayer = game.state.player;
      swingPlayer.x = 500;
      swingPlayer.y = level.world.groundY - spec.h;
      swingPlayer.vx = direction * 240;
      swingPlayer.facing = direction;
      swingPlayer.onGround = true;
      swingPlayer.climbing = false;
      const swingGeometry = (time) => game.renderer.geometry({ asset, player: swingPlayer, spec, time });
      const swingStart = swingGeometry(0).legs[0].sole;
      swingPlayer.x += direction * 240 * .1;
      const swingMid = swingGeometry(.1).legs[0].sole;
      const swingMidCenter = swingPlayer.x + spec.w * .5;
      swingPlayer.x += direction * 240 * .05;
      const swingLifted = swingGeometry(.15).legs[0].sole;
      const swingLiftedCenter = swingPlayer.x + spec.w * .5;
      const relativeMid = direction * (swingMid.x - swingMidCenter);
      const relativeLifted = direction * (swingLifted.x - swingLiftedCenter);
      assert.ok(relativeLifted > relativeMid,
        `${monsterId} swing foot should advance forward relative to its facing torso`);
      assert.ok(swingLifted.y < swingStart.y,
        `${monsterId} swing foot should lift instead of scuffing backward on the street`);
    }
  }
});

test('focus pause clears both held punch and backhand inputs', () => {
  prepareBackhandTargets();
  const punchButton = game.elements.get('punchBtn');
  const backhandButton = game.elements.get('backhandBtn');
  punchButton.listeners.get('pointerdown')({ preventDefault() {}, pointerId: 8 });
  backhandButton.listeners.get('pointerdown')({ preventDefault() {}, pointerId: 9 });
  assert.equal(game.held.punch, true);
  assert.equal(game.held.backhand, true);
  game.listeners.get('window:blur')();
  assert.equal(game.state.paused, true);
  assert.equal(game.held.punch, false);
  assert.equal(game.held.backhand, false);
  assert.equal(game.input.punch, false);
  assert.equal(game.input.backhand, false);
  assert.equal(game.keys.size, 0);
});

test('punching while climbing preserves the wall grip and facing', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  player.x = building.x - game.currentSize().w * .68;
  player.y = building.y + 100;
  player.onGround = false;
  player.climbing = true;
  player.climbSide = 'left';
  player.climbBuildingId = building.id;
  player.facing = 1;
  const before = { x: player.x, y: player.y, facing: player.facing };
  game.input.x = -1;
  game.input.y = 0;
  game.punch();
  assert.equal(player.climbing, true);
  assert.equal(player.climbSide, 'left');
  assert.equal(player.climbBuildingId, building.id);
  assert.equal(player.x, before.x);
  assert.equal(player.y, before.y);
  assert.equal(player.facing, before.facing);
});

test('incoming damage respects invulnerability and a lethal hit costs a life', () => {
  const { player } = freshMonster();
  game.running = true;
  const health = player.health;
  game.damagePlayer(10);
  const afterFirstHit = player.health;
  assert.ok(afterFirstHit < health);
  game.damagePlayer(10);
  assert.equal(player.health, afterFirstHit, 'a hit during invulnerability should be ignored');

  player.invulnerable = 0;
  player.health = 5;
  const lives = player.lives;
  game.damagePlayer(10);
  assert.ok(player.lives < lives);
  assert.ok(player.respawning > 0);
  game.update(player.respawning + .01);
  assert.equal(player.state, 'monster');
  assert.equal(player.health, player.maxHealth);
});

test('campaign levels retain score while resetting level-local city state', () => {
  const first = freshMonster();
  first.player.score = 321;
  game.loadLevel(1);
  const second = game.state;
  assert.equal(second.campaignIndex, 1);
  assert.equal(second.player.score, 321);
  assert.ok(second.level.buildings.every((building) => building.cells.flat().every((hp) => hp === building.hp)));
});

test('keyboard jump press is buffered through update and launches from the floor', () => {
  const { player } = freshMonster();
  game.running = true;
  game.listeners.get('window:keydown')({ key: ' ', repeat: false, preventDefault() {} });
  const beforeY = player.y;
  game.update(1 / 60);
  assert.ok(player.y < beforeY, 'a pressed jump should move the player upward');
  assert.ok(player.vy < 0);
  game.keys.clear();
});

test('human target collision uses each human sprite dimensions', () => {
  const { level } = freshMonster();
  const windowHuman = level.humans.find((human) => human.kind === 'window');
  const groundHuman = level.humans.find((human) => human.kind === 'ground');
  assert.deepEqual({ w: game.humanRect(windowHuman).w, h: game.humanRect(windowHuman).h },
    { w: windowHuman.w, h: windowHuman.h });
  assert.deepEqual({ w: game.humanRect(groundHuman).w, h: game.humanRect(groundHuman).h },
    { w: groundHuman.w, h: groundHuman.h });
});

test('window civilians remain fixed while their host cell survives', () => {
  const { level } = freshMonster();
  const human = level.humans.find((item) => item.kind === 'window');
  assert.ok(human?.buildingId);
  const { x, y } = human;
  game.updateHumans(.5);
  game.updateHumans(.5);
  assert.equal(human.kind, 'window');
  assert.equal(human.x, x);
  assert.equal(human.y, y);
});

test('destroying a different cell does not release a window civilian', () => {
  const { level } = freshMonster();
  const human = level.humans.find((item) => item.kind === 'window');
  const host = level.buildings.find((building) => building.id === human.buildingId);
  const row = (human.cellRow + 2) % host.rows;
  const col = (human.cellCol + 1) % host.cols;
  assert.notEqual(`${row}:${col}`, `${human.cellRow}:${human.cellCol}`);
  host.cells[row][col] = 0;
  game.updateHumans(.1);
  assert.equal(human.kind, 'window');
});

test('destroying a window host cell releases, drops, and turns the civilian into a runner', () => {
  const { level } = freshMonster();
  const human = level.humans.find((item) => item.kind === 'window');
  const host = level.buildings.find((building) => building.id === human.buildingId);
  const beforeCenterX = human.x + human.w / 2;
  const beforeFeet = human.y + human.h;
  host.cells[human.cellRow][human.cellCol] = 0;
  game.updateHumans(0);
  assert.equal(human.kind, 'falling');
  assert.ok(Math.abs(human.x + human.w / 2 - beforeCenterX) < 1e-9);
  assert.ok(Math.abs(human.y + human.h - beforeFeet) < 1e-9);
  assert.equal(human.w, 40);
  assert.equal(human.h, 54);
  const runnerAsset = game.assets.humans.find((asset) => asset.id === human.assetId);
  assert.equal(runnerAsset?.kind, 'ground');

  for (let i = 0; i < 20 && human.kind === 'falling'; i++) game.updateHumans(.1);
  assert.equal(human.kind, 'ground');
  assert.equal(human.y + human.h, level.world.groundY);
  const landedX = human.x;
  game.updateHumans(.1);
  assert.notEqual(human.x, landedX, 'a released civilian should start walking after reaching the street');
});

test('a higher surviving cell does not mask a lower exposed landing ledge', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  building.cells = Array.from({ length: building.rows }, () => Array(building.cols).fill(0));
  building.cells[0][0] = 1;
  building.cells[2][0] = 1;
  building.cells[3][0] = 1;
  const cellW = building.w / building.cols;
  const lowerLedge = building.y + 2 * building.h / building.rows;
  const centerX = building.x + cellW / 2;
  player.x = centerX - game.currentSize().w / 2;
  player.y = lowerLedge - game.currentSize().h - 4;
  player.vy = 100;
  player.onGround = false;
  player.onRoof = '';
  game.input.x = game.input.y = 0;
  game.movePlayer(.05);
  assert.equal(player.onRoof, building.id);
  assert.equal(player.y + game.currentSize().h, lowerLedge);
});

test('climbing onto a damaged edge uses the held ledge height, not the original roof', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  for (let row = 0; row < 2; row++) building.cells[row][0] = 0;
  const ledgeTop = building.y + 2 * building.h / building.rows;
  player.x = building.x - game.currentSize().w * .68;
  player.y = ledgeTop - game.currentSize().h * .23 - 1;
  player.onGround = false;
  player.climbing = true;
  player.climbSide = 'left';
  player.climbBuildingId = building.id;
  player.grabCooldown = 0;
  game.input.x = 0;
  game.input.y = -1;
  game.movePlayer(.016);
  assert.equal(player.onRoof, building.id);
  assert.equal(player.y + game.currentSize().h, ledgeTop);
  assert.notEqual(player.y + game.currentSize().h, building.y,
    'vaulting must land on the exposed damaged ledge, not teleport to the original roof');
});

test('soldiers disappear when their host edge tile is destroyed', () => {
  const { level } = freshMonster();
  const soldier = level.soldiers.find((item) => item.side < 0);
  const building = level.buildings.find((item) => item.id === soldier.buildingId);
  const row = Math.floor((soldier.y + soldier.h / 2 - building.y) / (building.h / building.rows));
  assert.ok(building.cells[row][0] > 0);
  building.cells[row][0] = 0;
  game.updateEnemies(.016);
  assert.equal(soldier.health, 0);
});

test('held punch repeats and released input stops attacking', () => {
  const { level, player } = freshMonster();
  game.running = true;
  level.buildings = [];
  level.humans = [];
  level.soldiers = [];
  const vehicle = { x: 0, y: 0, health: 5, dir: 0, speed: 0 };
  level.vehicles = [vehicle];
  const originX = player.x + game.currentSize().w * .57;
  const originY = player.y + game.currentSize().h * .43;
  vehicle.x = originX + game.currentSize().w * .55 - 25;
  vehicle.y = originY - 10;
  const punchButton = game.elements.get('punchBtn');
  punchButton.listeners.get('pointerdown')({ preventDefault() {}, pointerId: 2 });
  game.update(.016);
  game.update(.25);
  assert.ok(vehicle.health < 5, 'held punch should repeat when cooldown expires');
  punchButton.listeners.get('pointerup')();
  const afterRelease = vehicle.health;
  game.update(.5);
  assert.equal(vehicle.health, afterRelease, 'released punch must not trigger another attack');
});

test('enemy projectile collision damages once and removes the projectile', () => {
  const { player } = freshMonster();
  game.running = true;
  player.health = 7;
  const body = game.playerRect();
  game.projectiles.push({ x: body.x + body.w / 2, y: body.y + body.h / 2, vx: 0, vy: 0, damage: 7, life: 1 });
  const health = player.health;
  game.updateEnemies(.016);
  assert.equal(player.health, health - 7);
  assert.equal(player.lives, 2);
  assert.ok(player.respawning > 0, 'a lethal enemy hit should enter the respawn interval');
  assert.equal(game.projectiles.length, 0);
});

test('up input grabs the nearby wall and climbs in the requested direction', () => {
  const { level, player } = freshMonster();
  const building = level.buildings[0];
  player.x = building.x - game.currentSize().w * .68;
  player.y = building.y + 150;
  player.onGround = false;
  player.climbing = false;
  player.climbBuildingId = '';
  player.grabCooldown = 0;
  game.input.x = 0;
  game.input.y = -1;
  const beforeY = player.y;
  game.movePlayer(.1);
  assert.equal(player.climbing, true);
  assert.equal(player.climbSide, 'left');
  assert.equal(player.climbBuildingId, building.id);
  assert.ok(player.y < beforeY, 'up input should move the monster upward on the wall');
});

test('standing on the tallest roof stays supported across a full second of updates', () => {
  const { level, player } = freshMonster();
  const building = level.buildings.reduce((tallest, building) => building.y < tallest.y ? building : tallest);
  player.x = building.x + 12;
  player.y = building.y - game.currentSize().h;
  player.vx = player.vy = 0;
  player.onGround = true;
  player.onRoof = building.id;
  game.running = true;
  const initialY = player.y;
  for (let i = 0; i < 60; i++) game.update(1 / 60);
  assert.equal(player.onRoof, building.id);
  assert.equal(player.y, initialY);
});

test('city completion waits for the final collapse and awards its bonus once', () => {
  const { level, player } = freshMonster();
  game.running = true;
  player.x = level.world.width - game.currentSize().w - 4;
  level.buildings.forEach((building) => {
    building.collapsed = true;
    building.collapse = null;
    building.cells.forEach((row) => row.fill(0));
  });
  const finalBuilding = level.buildings.at(-1);
  finalBuilding.collapsed = false;
  finalBuilding.cells = Array.from({ length: finalBuilding.rows }, () => Array(finalBuilding.cols).fill(finalBuilding.hp));
  finalBuilding.collapse = { time: 1.1, dir: 1, scored: true };
  const beforeScore = player.score;
  game.update(.05);
  assert.equal(game.state.running, true, 'a city must remain active while its last building is falling');
  game.update(.15);
  assert.equal(game.state.cleared, true);
  assert.equal(game.state.running, false);
  assert.equal(player.score, beforeScore + 1000);
  game.update(.1);
  assert.equal(player.score, beforeScore + 1000, 'later updates must not re-award the clear bonus');
});

test('losing the final life ends the run instead of starting another respawn', () => {
  const { player } = freshMonster();
  game.running = true;
  player.lives = 1;
  player.health = 5;
  player.invulnerable = 0;
  game.damagePlayer(5);
  assert.equal(game.state.running, false);
  assert.equal(player.lives, 0);
  assert.equal(player.respawning, 0);
  assert.equal(player.state, 'human');
});

test('camera stays at zero when the world is narrower than the viewport', () => {
  const { level, player } = freshMonster();
  game.running = true;
  level.world.width = 400;
  player.x = 100;
  game.update(.1);
  assert.equal(game.state.cameraX, 0);
  assert.ok(game.state.cameraX >= 0 && game.state.cameraX <= Math.max(0, level.world.width - 960));
});

test('held pointer punch keeps its original aim through cooldown repeats', () => {
  const { level, player } = freshMonster();
  game.running = true;
  keepCityActive(level);
  level.humans = [];
  level.soldiers = [];
  const vehicle = { x: 0, y: 0, health: 4, dir: 0, speed: 0 };
  level.vehicles = [vehicle];
  const originX = player.x + game.currentSize().w * .57;
  const originY = player.y + game.currentSize().h * .43;
  const targetX = originX + game.currentSize().w * .55;
  const targetY = originY;
  vehicle.x = targetX - 25;
  vehicle.y = targetY - 10;
  const canvas = game.elements.get('game');
  const clientX = (targetX - game.state.cameraX) * canvas.getBoundingClientRect().width / canvas.width;
  const clientY = targetY * canvas.getBoundingClientRect().height / canvas.height;
  canvas.listeners.get('pointerdown')({ button: 0, pointerId: 3, clientX, clientY, preventDefault() {} });
  const fixedAim = { ...game.state.pointerAim };
  game.update(.016);
  assert.equal(vehicle.health, 3);
  game.update(.25);
  assert.equal(vehicle.health, 2);
  assert.equal(game.state.pointerAim.x, fixedAim.x);
  assert.equal(game.state.pointerAim.y, fixedAim.y);
  canvas.listeners.get('pointerup')();
  game.update(.25);
  assert.equal(vehicle.health, 2, 'releasing the pointer should stop repeat attacks');
});

test('eating after a backhand still reaches the mouth-side target in either facing', () => {
  for (const facing of [-1, 1]) {
    const { player, level } = freshMonster();
    game.running = true;
    keepCityActive(level);
    level.vehicles = [];
    level.soldiers = [];
    player.facing = facing;
    player.attackKind = 'backhand';
    const mouthOriginX = game.punchOrigin('punch').x;
    const spec = game.currentSize();
    const human = {
      id: `mouth-edge-${facing}`, kind: 'ground', eaten: false,
      x: mouthOriginX + facing * 48, y: player.y + spec.h * .43 - 20,
      w: 12, h: 40, dir: 0
    };
    level.humans = [human];
    game.input.eat = true;
    game.update(1 / 60);
    assert.equal(human.eaten, true, `the target at the forward mouth edge should be eaten facing ${facing}`);
  }
});
