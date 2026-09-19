import { GRID, LEVEL_TIMER } from "./config.js";

export function buildLevel() {
  const pipeTiles = new Set();
  const traces = [
    line(2, 2, 15, 2),
    line(3, 4, 14, 4),
    line(4, 7, 16, 7),
    line(2, 8, 12, 8),
    line(3, 2, 3, 8),
    line(8, 2, 8, 8),
    line(12, 4, 12, 8),
    line(15, 2, 15, 7)
  ];

  traces.flat().forEach((tile) => pipeTiles.add(`${tile.c},${tile.r}`));

  const brokenPipes = [
    makeBroken(3, 4),
    makeBroken(8, 7),
    makeBroken(12, 8),
    makeBroken(15, 2)
  ];

  const enemies = [
    makeEnemy("raccoon", 4, 8, 1.0),
    makeEnemy("spider", 14, 4, 1.2),
    makeEnemy("bug", 16, 7, 1.35)
  ];

  return {
    timer: LEVEL_TIMER,
    pipeTiles,
    brokenPipes,
    enemies
  };
}

function line(c1, r1, c2, r2) {
  const out = [];
  if (c1 === c2) {
    const [start, end] = r1 < r2 ? [r1, r2] : [r2, r1];
    for (let r = start; r <= end; r++) out.push({ c: c1, r });
  } else {
    const [start, end] = c1 < c2 ? [c1, c2] : [c2, c1];
    for (let c = start; c <= end; c++) out.push({ c, r: r1 });
  }
  return out;
}

function makeBroken(c, r) {
  return {
    c,
    r,
    repaired: false,
    progress: 0,
    required: 1.1
  };
}

function makeEnemy(type, c, r, speed) {
  return {
    type,
    x: GRID.offsetX + c * GRID.cell + GRID.cell / 2,
    y: GRID.offsetY + r * GRID.cell + GRID.cell / 2,
    speed,
    hp: 3,
    inflate: 0,
    knockback: 0,
    alive: true
  };
}
