import { GRID, LEVELS } from "./config.js";
import { pickRandomCells, rand } from "./utils.js";

export function buildLevel(levelNumber) {
  const template = LEVELS[Math.min(levelNumber - 1, LEVELS.length - 1)];
  const cells = pickRandomCells(template.holes, GRID.cols, GRID.rows);

  const holes = cells.map((cell, index) => ({
    id: index,
    c: cell.c,
    r: cell.r,
    dug: 0,
    wetness: 0,
    type: "false",
    exploded: false,
    repaired: false,
    timer: 0,
    maxTimer: 0,
    pulse: Math.random() * Math.PI * 2
  }));

  const realIndexes = shuffledIndexes(holes.length).slice(0, template.realLeaks);
  const treasureIndexes = shuffledIndexes(holes.length)
    .filter((idx) => !realIndexes.includes(idx))
    .slice(0, template.treasures);

  for (const idx of realIndexes) {
    holes[idx].type = "leak";
    holes[idx].maxTimer = rand(template.minTimer, template.maxTimer);
    holes[idx].timer = holes[idx].maxTimer;
  }

  for (const idx of treasureIndexes) {
    holes[idx].type = "treasure";
  }

  return {
    ...template,
    holes,
    totalLeaks: template.realLeaks
  };
}

function shuffledIndexes(length) {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
