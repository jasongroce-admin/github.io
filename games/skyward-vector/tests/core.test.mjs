import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, LEVELS } from '../core.js';

const DT = 1 / 60;
const LIMITS = { enemies: 80, shots: 100, hostile: 240, particles: 360 };

function fixture(options = {}) {
  const game = new Game({ seed: 71937, ...options });
  game.start(options.sector ?? 0);
  game.waves = [];
  game.player.invulnerable = 0;
  return game;
}

function advance(game, seconds, input = {}) {
  const frames = Math.round(seconds / DT);
  for (let frame = 0; frame < frames; frame++) game.update(DT, input);
}

function bulletAtPlayer(game) {
  game.hostile.push({ x: game.player.x, y: game.player.y - 9, vx: 0, vy: 120, r: 4, age: 0 });
}

function stateSnapshot(game) {
  return JSON.stringify({
    state: game.state, seed: game.seed, time: game.time, totalTime: game.totalTime,
    scroll: game.scroll, score: game.score, lives: game.lives, player: game.player,
    enemies: game.enemies, shots: game.shots, hostile: game.hostile, bombs: game.bombs,
    blasts: game.blasts, particles: game.particles, pickups: game.pickups,
    waveIndex: game.waveIndex, bossSpawned: game.bossSpawned, stats: game.stats,
  });
}

function assertFinite(value, path = 'game') {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `${path} must be finite; received ${value}`);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) assertFinite(child, `${path}.${key}`);
  }
}

function assertStable(game) {
  assertFinite(game);
  for (const [name, limit] of Object.entries(LIMITS)) {
    assert.ok(game[name].length <= limit, `${name}: ${game[name].length} exceeds ${limit}`);
  }
  assert.ok(game.player.x >= 22 && game.player.x <= 458, 'player horizontal bounds');
  assert.ok(game.player.y >= 155 && game.player.y <= 684, 'player vertical bounds');
}

test('forward air fire passes over ground structures and destroys aircraft', () => {
  const game = fixture();
  const turret = game.spawn('turret', 240, 515, { fireTimer: 100 });
  const aircraft = game.spawn('scout', 240, 450, { vy: 0, phase: 0, fireTimer: 100 });
  game.fireAir();
  advance(game, 0.25);
  assert.equal(turret.hp, turret.maxHp);
  assert.ok(aircraft.hp <= 0, 'a forward shot reaches and destroys the aircraft');
  assert.equal(game.stats.airKills, 1);
  assert.equal(game.stats.groundKills, 0);
});

test('bombs hit only ground targets, keep their release coordinate, and track terrain scrolling', () => {
  const game = fixture();
  const target = { ...game.reticle };
  const ground = game.spawn('turret', target.x, target.y, { fireTimer: 100 });
  const aircraft = game.spawn('interceptor', target.x, target.y, { vy: 0, phase: 0, fireTimer: 100 });
  game.dropBomb();
  const bomb = game.bombs[0];
  advance(game, 0.5, { dx: 1 });
  assert.ok(ground.hp <= 0, 'bomb hits the ground target despite terrain scrolling');
  assert.equal(aircraft.hp, aircraft.maxHp, 'aircraft is immune to ground bombs');
  assert.equal(bomb.targetX, target.x, 'moving the ship after release does not steer the bomb');
  assert.ok(Math.abs(bomb.targetY - (target.y + game.level.scrollSpeed * bomb.age)) < 1e-7);
  assert.equal(game.stats.groundKills, 1);
  assert.equal(game.stats.airKills, 0);
});

test('weapon cooldowns limit sustained fire and upgrades change projectile count', () => {
  const game = fixture();
  advance(game, 1, { fire: true, bomb: true });
  assert.ok(game.stats.shots >= 7 && game.stats.shots <= 8);
  assert.equal(game.stats.bombs, 2);
  for (const [weapon, expected] of [[1, 1], [2, 2], [3, 3]]) {
    game.player.weapon = weapon;
    game.player.fireCooldown = 0;
    game.shots = [];
    game.fireAir();
    assert.equal(game.shots.length, expected);
  }
});

test('a bullet consumes one life, clears nearby danger, and gives respawn protection', () => {
  const game = fixture();
  const initialLives = game.lives;
  game.player.weapon = 3;
  game.fireAir();
  game.dropBomb();
  bulletAtPlayer(game);
  advance(game, 0.05);
  assert.equal(game.lives, initialLives - 1);
  assert.equal(game.stats.deaths, 1);
  assert.equal(game.player.weapon, 2);
  assert.equal(game.player.alive, true);
  assert.ok(game.player.invulnerable > 3);
  assert.equal(game.hostile.length, 0);
  assert.equal(game.shots.length, 0);
  assert.equal(game.bombs.length, 0);
  bulletAtPlayer(game);
  advance(game, 0.05);
  assert.equal(game.lives, initialLives - 1, 'respawn prevents immediate repeated death');
});

test('a shield absorbs one hit without consuming a life', () => {
  const game = fixture();
  const initialLives = game.lives;
  game.player.shield = true;
  bulletAtPlayer(game);
  advance(game, 0.05);
  assert.equal(game.lives, initialLives);
  assert.equal(game.player.shield, false);
  assert.equal(game.stats.deaths, 0);
  assert.ok(game.player.invulnerable > 1);
});

test('ground structures can be flown over, while an air collision consumes a life', () => {
  const game = fixture();
  const initialLives = game.lives;
  game.spawn('turret', game.player.x, game.player.y, { fireTimer: 100 });
  advance(game, 0.05);
  assert.equal(game.lives, initialLives);
  game.spawn('scout', game.player.x, game.player.y, { phase: 0, vy: 0, fireTimer: 100 });
  advance(game, 0.05);
  assert.equal(game.lives, initialLives - 1);
});

test('game over stops simulation and sector retry restores the checkpoint', () => {
  const game = fixture({ difficulty: 'veteran', sector: 2 });
  game.score = 975;
  game.player.weapon = 3;
  game.lives = 1;
  bulletAtPlayer(game);
  advance(game, 0.05);
  assert.equal(game.state, 'gameover');
  assert.equal(game.player.alive, false);
  const stopped = stateSnapshot(game);
  advance(game, 1, { fire: true, bomb: true, dx: 1 });
  assert.equal(stateSnapshot(game), stopped);
  game.retrySector();
  assert.equal(game.state, 'playing');
  assert.equal(game.levelIndex, 2);
  assert.equal(game.score, 0);
  assert.equal(game.lives, 3);
  assert.equal(game.player.weapon, 1);
  assert.equal(game.stats.deaths, 0);
  assert.equal(game.time, 0);
  assert.equal(game.enemies.length, 0);
  assert.ok(game.player.invulnerable > 0);
});

test('pause freezes the entire simulation and resume continues it', () => {
  const game = fixture();
  game.spawn('scout', 140, 100);
  advance(game, 0.5, { fire: true, bomb: true });
  game.pause();
  const paused = stateSnapshot(game);
  advance(game, 3, { fire: true, bomb: true, dx: 1, dy: 1 });
  assert.equal(stateSnapshot(game), paused);
  game.resume();
  advance(game, 0.05);
  assert.equal(game.state, 'playing');
  assert.ok(game.time > 0.5);
});

test('diagonal movement is normalized, pointer travel is bounded, and player remains in the arena', () => {
  const horizontal = fixture();
  const diagonal = fixture();
  const origin = { x: horizontal.player.x, y: horizontal.player.y };
  horizontal.update(0.05, { dx: 1 });
  diagonal.update(0.05, { dx: 1, dy: -1 });
  const cardinalDistance = Math.hypot(horizontal.player.x - origin.x, horizontal.player.y - origin.y);
  const diagonalDistance = Math.hypot(diagonal.player.x - origin.x, diagonal.player.y - origin.y);
  assert.ok(Math.abs(cardinalDistance - diagonalDistance) < 1e-7);
  assert.ok(Math.abs(cardinalDistance - 282 * 0.05) < 1e-7);
  const pointer = fixture();
  pointer.update(0.05, { pointer: { x: 450, y: 200 } });
  assert.ok(Math.hypot(pointer.player.x - origin.x, pointer.player.y - origin.y) <= 330 * 0.05 + 1e-7);
  advance(pointer, 3, { pointer: { x: 9999, y: -9999 } });
  assertStable(pointer);
  assert.equal(pointer.player.y, 155);
  advance(horizontal, 3, { dx: 1, dy: 1 });
  assert.equal(horizontal.player.x, 458);
  assert.equal(horizontal.player.y, 684);
});

test('large frame gaps are capped and elapsed time is independent of normal display rate', () => {
  const gap = fixture();
  gap.update(60, { dx: 1 });
  assert.ok(Math.abs(gap.time - 0.05) < 1e-7, 'tab resume does not simulate an entire hidden interval');
  const slow = fixture();
  const fast = fixture();
  for (let i = 0; i < 30; i++) slow.update(1 / 30, { dx: 1, dy: -1, fire: true, bomb: true });
  for (let i = 0; i < 120; i++) fast.update(1 / 120, { dx: 1, dy: -1, fire: true, bomb: true });
  assert.ok(Math.abs(slow.player.x - fast.player.x) < 1e-7);
  assert.ok(Math.abs(slow.player.y - fast.player.y) < 1e-7);
  assert.equal(slow.stats.shots, fast.stats.shots);
  assert.equal(slow.stats.bombs, fast.stats.bombs);
});

test('sector completion reports a stable final score when a bomb overlaps the reactor and another target', () => {
  const events = [];
  const game = fixture({ onEvent: (type, detail) => events.push({ type, ...detail }) });
  game.player.y = 271;
  game.player.invulnerable = 100;
  game.spawn('boss', 240, 145, { hp: 3, fireTimer: 100 });
  game.spawn('turret', 240, 145, { fireTimer: 100 });
  game.dropBomb();
  advance(game, 0.65);
  const completion = events.find(event => event.type === 'sectorClear');
  assert.ok(completion, 'bombing the reactor completes the sector');
  assert.equal(completion.score, game.score, 'score cannot change after the completion event');
  assert.equal(events.filter(event => event.type === 'sectorClear').length, 1);
});

function playCampaign(seed) {
  const events = [];
  const game = new Game({ seed, onEvent: (type, detail) => events.push({ type, ...detail }) });
  game.start();
  const sectors = [];
  const kindsSeen = new Set();
  const peaks = Object.fromEntries(Object.keys(LIMITS).map(name => [name, 0]));
  for (let sector = 0; sector < LEVELS.length; sector++) {
    assert.equal(game.levelIndex, sector);
    // This test verifies waves, attacks, targeting, and completion. Collision/life
    // behavior is covered separately; invulnerability lets every pattern run.
    game.player.invulnerable = 10000;
    let frames = 0;
    let sawBoss = false;
    while (game.state === 'playing' && frames < 60 * 160) {
      const boss = game.boss;
      const input = boss
        ? { fire: true, bomb: true, pointer: { x: boss.x, y: boss.y + 126 } }
        : { fire: true, bomb: true, dx: Math.sin(frames / 90), dy: Math.sin(frames / 170) * 0.25 };
      if (boss) sawBoss = true;
      game.update(DT, input);
      for (const enemy of game.enemies) kindsSeen.add(enemy.kind);
      for (const name of Object.keys(peaks)) peaks[name] = Math.max(peaks[name], game[name].length);
      if (frames % 30 === 0) assertStable(game);
      frames++;
    }
    assert.ok(sawBoss, `sector ${sector + 1} spawns its fortress`);
    assert.equal(game.waveIndex, game.waves.length, `sector ${sector + 1} executes all scheduled waves`);
    assert.ok(frames < 60 * 160, `sector ${sector + 1} can be completed with actual player weapons`);
    assert.equal(game.state, sector === LEVELS.length - 1 ? 'victory' : 'sectorClear');
    assert.equal(game.hostile.length, 0);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.bombs.length, 0);
    assert.ok(game.lastBonus >= 1000);
    assertStable(game);
    sectors.push({ sector, seconds: Number(game.time.toFixed(3)), score: game.score, groundKills: game.stats.groundKills, airKills: game.stats.airKills });
    if (sector < LEVELS.length - 1) game.nextSector();
  }
  assert.equal(game.unlocked, 5);
  assert.ok(game.stats.groundKills >= 6, 'six fortresses were defeated using ground bombs');
  for (const kind of ['scout', 'swoop', 'interceptor', 'disc', 'turret', 'battery', 'bunker', 'boss']) {
    assert.ok(kindsSeen.has(kind), `campaign exercises ${kind}`);
  }
  assert.equal(events.filter(event => event.type === 'boss').length, 6);
  assert.equal(events.filter(event => event.type === 'sectorClear').length, 5);
  assert.equal(events.filter(event => event.type === 'victory').length, 1);
  const finished = stateSnapshot(game);
  game.nextSector();
  game.update(1, { fire: true, bomb: true });
  assert.equal(stateSnapshot(game), finished, 'victory remains stable after further input');
  return { sectors, peaks, events, score: game.score, stats: game.stats, seed: game.seed };
}

test('all six sectors run their waves, sustain bounded finite state, and finish through bomb damage', () => {
  const first = playCampaign(71937);
  const second = playCampaign(71937);
  assert.deepEqual(first, second, 'same seed and inputs reproduce campaign outcomes');
  console.log('Campaign verification:', JSON.stringify({ sectors: first.sectors, peaks: first.peaks, score: first.score, stats: first.stats }));
});
