const SETTINGS = {
  easy: { colors: 8, pieces: 26 },
  medium: { colors: 14, pieces: 40 },
  hard: { colors: 20, pieces: 58 }
};

const PALETTES = {
  firefighter: ["#e74c3c", "#f39c12", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#1abc9c", "#e67e22", "#d35400", "#c0392b", "#7f8c8d", "#16a085", "#8e44ad", "#2980b9", "#27ae60", "#ff6b81", "#6c5ce7", "#00cec9", "#fdcb6e", "#e17055"],
  police: ["#1e90ff", "#2f3542", "#70a1ff", "#57606f", "#ffa502", "#2ed573", "#3742fa", "#ff4757", "#7bed9f", "#5352ed", "#a4b0be", "#ff6b81", "#2f9cff", "#37406b", "#00d2d3", "#feca57", "#5f27cd", "#ff9f43", "#10ac84", "#341f97"]
};

const STATE = {
  selected: 1,
  scene: "firefighter",
  difficulty: "easy",
  pieces: []
};

const svg = document.getElementById("puzzleSvg");
const paletteEl = document.getElementById("palette");
const statusEl = document.getElementById("status");
const sceneSelect = document.getElementById("sceneSelect");
const difficultySelect = document.getElementById("difficultySelect");

document.getElementById("resetBtn").addEventListener("click", render);
sceneSelect.addEventListener("change", () => { STATE.scene = sceneSelect.value; render(); });
difficultySelect.addEventListener("change", () => { STATE.difficulty = difficultySelect.value; render(); });

document.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("load", () => setTimeout(() => window.scrollTo(0, 1), 120));

function render() {
  const config = SETTINGS[STATE.difficulty];
  STATE.selected = 1;
  STATE.pieces = buildPieces(config.pieces, config.colors);
  renderPalette(config.colors);
  renderPuzzle();
  updateStatus();
}

function buildPieces(totalPieces, colors) {
  const pieces = [];
  const cols = 6;
  const rows = Math.ceil(totalPieces / cols);
  const w = 420 / cols;
  const h = 560 / rows;

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (idx >= totalPieces) break;
      const x = c * w;
      const y = r * h;
      const jitter = 10;
      const pts = [
        [x + rand(2, jitter), y + rand(2, jitter)],
        [x + w - rand(2, jitter), y + rand(2, jitter)],
        [x + w - rand(2, jitter), y + h - rand(2, jitter)],
        [x + rand(2, jitter), y + h - rand(2, jitter)]
      ];
      const number = (idx % colors) + 1;
      pieces.push({ id: idx + 1, number, pts, filled: false, cx: x + w / 2, cy: y + h / 2 });
      idx++;
    }
  }
  return pieces;
}

function renderPalette(colorCount) {
  paletteEl.innerHTML = "";
  const colors = PALETTES[STATE.scene];

  for (let i = 1; i <= colorCount; i++) {
    const btn = document.createElement("button");
    btn.className = `swatch ${i === STATE.selected ? "active" : ""}`;
    btn.style.background = colors[i - 1];
    btn.textContent = i;
    btn.addEventListener("click", () => {
      STATE.selected = i;
      renderPalette(colorCount);
      updateStatus();
    });
    paletteEl.appendChild(btn);
  }
}

function renderPuzzle() {
  svg.innerHTML = "";

  // Scene background accents
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0"); bg.setAttribute("width", "420"); bg.setAttribute("height", "560");
  bg.setAttribute("fill", STATE.scene === "firefighter" ? "#3a1b26" : "#16233d");
  svg.appendChild(bg);

  const emblem = document.createElementNS("http://www.w3.org/2000/svg", "text");
  emblem.setAttribute("x", "210"); emblem.setAttribute("y", "36"); emblem.setAttribute("text-anchor", "middle");
  emblem.setAttribute("fill", "#ffffffaa"); emblem.setAttribute("font-size", "20");
  emblem.textContent = STATE.scene === "firefighter" ? "🚒 Firefighter Action" : "🚓 Police Action";
  svg.appendChild(emblem);

  for (const piece of STATE.pieces) {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("class", `piece ${piece.filled ? "done" : ""}`);
    poly.setAttribute("points", piece.pts.map(([x, y]) => `${x},${y}`).join(" "));
    poly.dataset.id = piece.id;
    if (piece.filled) poly.setAttribute("fill", PALETTES[STATE.scene][piece.number - 1]);

    poly.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      tryPaintPiece(piece.id);
    });
    svg.appendChild(poly);

    if (!piece.filled) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", piece.cx);
      label.setAttribute("y", piece.cy);
      label.setAttribute("class", "nLabel");
      label.textContent = piece.number;
      svg.appendChild(label);
    }
  }

  svg.onpointerdown = (e) => {
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 420;
    const y = ((e.clientY - rect.top) / rect.height) * 560;
    const nearby = nearestPiece(x, y, 26); // forgiving touch radius
    if (nearby) tryPaintPiece(nearby.id);
  };
}

function nearestPiece(x, y, maxDist) {
  let best = null;
  let d = Infinity;
  for (const p of STATE.pieces) {
    if (p.filled) continue;
    const dist = Math.hypot(p.cx - x, p.cy - y);
    if (dist < d && dist <= maxDist) {
      d = dist;
      best = p;
    }
  }
  return best;
}

function tryPaintPiece(id) {
  const piece = STATE.pieces.find((p) => p.id === id);
  if (!piece || piece.filled) return;

  if (piece.number === STATE.selected) {
    piece.filled = true;
    renderPuzzle();
    updateStatus();
  }
}

function updateStatus() {
  const total = STATE.pieces.length;
  const done = STATE.pieces.filter((p) => p.filled).length;
  statusEl.textContent = `Color ${STATE.selected} selected • ${done}/${total} sections painted.`;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

render();
