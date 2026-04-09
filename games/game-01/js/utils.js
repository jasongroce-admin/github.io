export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function pickRandomCells(total, cols, rows, bottomSafeRows = 2) {
  const out = [];
  const used = new Set();
  while (out.length < total) {
    const c = rand(0, cols - 1);
    const r = rand(0, rows - 1 - bottomSafeRows);
    const key = `${c},${r}`;
    if (used.has(key)) continue;
    used.add(key);
    out.push({ c, r });
  }
  return out;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
