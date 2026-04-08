export const GRID = {
  cols: 15,
  rows: 10,
  cell: 58,
  offsetX: 16,
  offsetY: 16
};

export const PLAYER = {
  speed: 180,
  digRange: 0,
  size: 22
};

export const LEVELS = Array.from({ length: 10 }, (_, i) => {
  const idx = i + 1;
  return {
    level: idx,
    holes: 20 + i * 2,
    realLeaks: 5 + Math.floor(i / 2),
    treasures: 2 + Math.floor(i / 3),
    minTimer: Math.max(12 - i, 4),
    maxTimer: Math.max(22 - i, 8)
  };
});

export const EDUCATIONAL_TIPS = [
  "Never pour grease down drains. It hardens and can block neighborhood sewer lines.",
  "Only flush toilet paper. Wipes labeled flushable can still clog systems.",
  "Report sewage odors or wet patches early to prevent backups and contamination.",
  "After heavy rain, avoid contact with floodwater near manholes and drains.",
  "Keep storm drains clear of leaves and trash so runoff can move safely.",
  "Plant roots can break older pipes. Slow drains outside may be an early warning.",
  "If a sewer line backs up, limit water use and call your utility immediately.",
  "Never open a manhole cover yourself. Hazardous gases can be present.",
  "Teach kids to avoid wastewater spills and report standing polluted water.",
  "Community reporting helps utilities fix leaks faster and protect public health."
];
