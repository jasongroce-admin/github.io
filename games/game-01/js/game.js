import { GRID, PLAYER, EDUCATIONAL_TIPS } from "./config.js";
import { buildLevel } from "./level.js";
import { clamp, distance } from "./utils.js";

export class PipeRescueGame {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;

    this.keys = new Set();
    this.pointer = { x: 0, y: 0, down: false };
    this.levelNumber = 1;
    this.score = 0;
    this.fixedCount = 0;
    this.patchEquipped = false;
    this.goldenShovelTimer = 0;
    this.popups = [];

    this.player = {
      x: GRID.offsetX + GRID.cell * (GRID.cols / 2),
      y: GRID.offsetY + GRID.cell * (GRID.rows - 0.8),
      size: PLAYER.size,
      targetX: null,
      targetY: null
    };

    this.level = buildLevel(this.levelNumber);
    this.last = performance.now();
    this.bindEvents();
    this.refreshUi();
  }

  bindEvents() {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.code === "Space") {
        this.pointer.down = true;
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
      if (e.code === "Space") {
        this.pointer.down = false;
      }
    });

    const setPointer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches?.[0] ?? e;
      this.pointer.x = ((touch.clientX - rect.left) / rect.width) * this.canvas.width;
      this.pointer.y = ((touch.clientY - rect.top) / rect.height) * this.canvas.height;
    };

    this.canvas.addEventListener("mousedown", (e) => {
      setPointer(e);
      this.pointer.down = true;
      this.player.targetX = this.pointer.x;
      this.player.targetY = this.pointer.y;
      this.tryRepair();
    });
    window.addEventListener("mouseup", () => (this.pointer.down = false));
    this.canvas.addEventListener("mousemove", setPointer);

    this.canvas.addEventListener("touchstart", (e) => {
      setPointer(e);
      this.pointer.down = true;
      this.player.targetX = this.pointer.x;
      this.player.targetY = this.pointer.y;
      this.tryRepair();
    });
    this.canvas.addEventListener("touchmove", (e) => {
      setPointer(e);
      this.player.targetX = this.pointer.x;
      this.player.targetY = this.pointer.y;
    });
    window.addEventListener("touchend", () => (this.pointer.down = false));

    this.ui.equipPatchBtn.addEventListener("click", () => {
      if (this.isNearPatchTable()) {
        this.patchEquipped = true;
        this.refreshUi();
      }
    });
    this.ui.retryBtn.addEventListener("click", () => this.retryLevel());
    this.ui.restartBtn.addEventListener("click", () => this.restartGame());
    this.ui.nextLevelBtn.addEventListener("click", () => {
      this.ui.tipModal.classList.add("hidden");
      this.levelNumber += 1;
      if (this.levelNumber > 10) {
        this.levelNumber = 1;
        this.score = 0;
      }
      this.loadLevel();
    });
  }

  retryLevel() {
    this.level = buildLevel(this.levelNumber);
    this.fixedCount = 0;
    this.patchEquipped = false;
    this.goldenShovelTimer = 0;
    this.player.x = GRID.offsetX + GRID.cell * (GRID.cols / 2);
    this.player.y = GRID.offsetY + GRID.cell * (GRID.rows - 0.8);
    this.refreshUi();
  }

  restartGame() {
    this.levelNumber = 1;
    this.score = 0;
    this.loadLevel();
  }

  loadLevel() {
    this.level = buildLevel(this.levelNumber);
    this.fixedCount = 0;
    this.patchEquipped = false;
    this.goldenShovelTimer = 0;
    this.popups.length = 0;
    this.player.x = GRID.offsetX + GRID.cell * (GRID.cols / 2);
    this.player.y = GRID.offsetY + GRID.cell * (GRID.rows - 0.8);
    this.refreshUi();
  }

  isNearPatchTable() {
    const tx = this.canvas.width - 105;
    const ty = this.canvas.height - 95;
    return distance(this.player.x, this.player.y, tx, ty) < 110;
  }

  tryRepair() {
    if (!this.patchEquipped) return;
    for (const hole of this.level.holes) {
      if (hole.type !== "leak" || hole.repaired) continue;
      const center = this.cellCenter(hole.c, hole.r);
      if (distance(this.pointer.x, this.pointer.y, center.x, center.y) < GRID.cell * 0.45) {
        if (distance(this.player.x, this.player.y, center.x, center.y) < GRID.cell * 0.9) {
          hole.repaired = true;
          hole.exploded = false;
          this.patchEquipped = false;
          this.fixedCount += 1;
          this.addScore(hole.timer > 0 ? 200 : 90, center.x, center.y, "+Repair");
          this.refreshUi();
        }
      }
    }
  }

  addScore(amount, x, y, label = "+") {
    this.score += amount;
    this.popups.push({ x, y, text: `${label} ${amount}`, life: 1.1 });
  }

  update(dt) {
    this.updateMovement(dt);
    this.updateHoles(dt);
    this.updateDigging(dt);
    this.updatePopups(dt);

    if (this.goldenShovelTimer > 0) {
      this.goldenShovelTimer -= dt;
    }
  }

  updateMovement(dt) {
    const speed = PLAYER.speed;
    let dx = 0;
    let dy = 0;

    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const mag = Math.hypot(dx, dy) || 1;
      this.player.x += (dx / mag) * speed * dt;
      this.player.y += (dy / mag) * speed * dt;
      this.player.targetX = null;
      this.player.targetY = null;
    } else if (this.player.targetX !== null) {
      const dist = distance(this.player.x, this.player.y, this.player.targetX, this.player.targetY);
      if (dist > 3) {
        this.player.x += ((this.player.targetX - this.player.x) / dist) * speed * dt;
        this.player.y += ((this.player.targetY - this.player.y) / dist) * speed * dt;
      }
    }

    this.player.x = clamp(this.player.x, GRID.offsetX + 8, GRID.offsetX + GRID.cols * GRID.cell - 8);
    this.player.y = clamp(this.player.y, GRID.offsetY + 8, GRID.offsetY + GRID.rows * GRID.cell - 8);
  }

  updateHoles(dt) {
    for (const hole of this.level.holes) {
      hole.pulse += dt * 1.8;

      if (hole.type === "leak" && hole.dug >= 1 && !hole.repaired) {
        hole.timer -= dt;
        hole.wetness = clamp(1 - hole.timer / hole.maxTimer, 0, 1);
        if (hole.timer <= 0) {
          hole.exploded = true;
        }
      }
    }
  }

  updateDigging(dt) {
    if (!this.pointer.down) return;

    for (const hole of this.level.holes) {
      const center = this.cellCenter(hole.c, hole.r);
      if (distance(this.player.x, this.player.y, center.x, center.y) > GRID.cell * 0.82) continue;
      if (distance(this.pointer.x, this.pointer.y, center.x, center.y) > GRID.cell * 0.55) continue;

      const rate = this.goldenShovelTimer > 0 ? 1.55 : 1;
      hole.dug = clamp(hole.dug + dt * rate, 0, 1);

      if (hole.dug >= 1 && hole.type === "treasure" && !hole.claimed) {
        hole.claimed = true;
        this.goldenShovelTimer = 20;
        this.addScore(350, center.x, center.y, "Golden Shovel!");
      } else if (hole.dug >= 1 && hole.type === "false" && !hole.claimed) {
        hole.claimed = true;
        this.addScore(35, center.x, center.y, "Searched");
      }
    }

    if (this.fixedCount >= this.level.totalLeaks) {
      this.showTipModal();
    }
  }

  updatePopups(dt) {
    for (const pop of this.popups) {
      pop.life -= dt;
      pop.y -= dt * 24;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  showTipModal() {
    this.ui.tipTitle.textContent = `Level ${this.levelNumber} Complete!`;
    this.ui.tipText.textContent = EDUCATIONAL_TIPS[this.levelNumber - 1] || EDUCATIONAL_TIPS[0];
    this.ui.tipModal.classList.remove("hidden");
  }

  cellCenter(c, r) {
    return {
      x: GRID.offsetX + c * GRID.cell + GRID.cell / 2,
      y: GRID.offsetY + r * GRID.cell + GRID.cell / 2
    };
  }

  refreshUi() {
    this.ui.levelLabel.textContent = String(this.levelNumber);
    this.ui.scoreLabel.textContent = String(this.score);
    this.ui.fixedLabel.textContent = String(this.fixedCount);
    this.ui.totalLabel.textContent = String(this.level.totalLeaks);
    this.ui.patchLabel.textContent = this.patchEquipped ? "Equipped" : "None";
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGround(ctx);
    this.drawPatchTable(ctx);
    this.drawHoles(ctx);
    this.drawPlayer(ctx);
    this.drawPopups(ctx);

    if (this.goldenShovelTimer > 0) {
      ctx.fillStyle = "#ffe686";
      ctx.font = "bold 16px Trebuchet MS";
      ctx.fillText(`Golden Shovel: ${this.goldenShovelTimer.toFixed(1)}s`, 16, this.canvas.height - 16);
    }
  }

  drawGround(ctx) {
    ctx.fillStyle = "#49705d";
    ctx.fillRect(GRID.offsetX, GRID.offsetY, GRID.cols * GRID.cell, GRID.rows * GRID.cell);

    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++) {
        const x = GRID.offsetX + c * GRID.cell;
        const y = GRID.offsetY + r * GRID.cell;
        const checker = (c + r) % 2;
        ctx.fillStyle = checker ? "rgba(52,89,74,0.45)" : "rgba(42,78,66,0.45)";
        ctx.fillRect(x + 2, y + 2, GRID.cell - 4, GRID.cell - 4);
      }
    }
  }

  drawPatchTable(ctx) {
    const x = this.canvas.width - 165;
    const y = this.canvas.height - 140;
    ctx.fillStyle = "#6e4f34";
    ctx.fillRect(x, y, 120, 70);
    ctx.fillStyle = "#d8c0a0";
    ctx.fillRect(x + 8, y + 12, 102, 10);

    ctx.fillStyle = "#7ec8ff";
    ctx.fillRect(x + 20, y + 34, 25, 15);
    ctx.fillRect(x + 55, y + 34, 25, 15);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.fillText("PATCH TABLE", x + 13, y - 7);

    if (this.isNearPatchTable()) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText("Press button to equip", x - 20, y + 86);
    }
  }

  drawHoles(ctx) {
    for (const hole of this.level.holes) {
      const center = this.cellCenter(hole.c, hole.r);
      const radius = 16 + hole.dug * 7;

      if (hole.wetness > 0) {
        const wetR = radius + 12 + hole.wetness * 12;
        ctx.fillStyle = `rgba(125, 83, 45, ${0.18 + hole.wetness * 0.25})`;
        ctx.beginPath();
        ctx.arc(center.x, center.y, wetR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = hole.dug > 0 ? "#3c2b20" : "#6d5c4f";
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (hole.dug >= 1) {
        if (hole.type === "leak" && !hole.repaired) {
          this.drawPipe(ctx, center.x, center.y, hole.exploded);
          if (!hole.exploded) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px Trebuchet MS";
            ctx.fillText(Math.max(0, hole.timer).toFixed(1), center.x - 12, center.y - 24);
          }
        } else if (hole.type === "treasure" && !hole.claimed) {
          ctx.fillStyle = "#ffdd5e";
          ctx.fillRect(center.x - 10, center.y - 10, 20, 20);
        } else if (hole.repaired) {
          ctx.fillStyle = "#6adfff";
          ctx.fillRect(center.x - 12, center.y - 4, 24, 8);
        }
      }
    }
  }

  drawPipe(ctx, x, y, exploded) {
    if (exploded) {
      const colors = ["#7f5128", "#9e652f", "#d7af58"];
      for (let i = 0; i < 14; i++) {
        const a = ((Math.PI * 2) / 14) * i + performance.now() * 0.002;
        const len = 15 + (i % 3) * 8;
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#9ca8af";
      ctx.fillRect(x - 15, y - 6, 30, 12);
      ctx.fillStyle = "#d86b6b";
      ctx.fillRect(x - 4, y - 6, 8, 12);
    }
  }

  drawPlayer(ctx) {
    const { x, y } = this.player;
    ctx.fillStyle = "#293b48";
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f5ca9c";
    ctx.beginPath();
    ctx.arc(x, y - 3, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff8c5a";
    ctx.fillRect(x - 10, y + 10, 20, 8);

    ctx.fillStyle = "#dcb76a";
    ctx.fillRect(x + 9, y + 3, 13, 4);
  }

  drawPopups(ctx) {
    ctx.save();
    ctx.font = "bold 16px Trebuchet MS";
    for (const p of this.popups) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = "#ffe17a";
      ctx.fillText(`💥 ${p.text}`, p.x - 20, p.y);
    }
    ctx.restore();
    this.refreshUi();
  }

  start() {
    const frame = (t) => {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      if (this.ui.tipModal.classList.contains("hidden")) {
        this.update(dt);
      }
      this.draw();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
