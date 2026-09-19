import { GRID, PLAYER, EDUCATIONAL_TIPS } from "./config.js";
import { buildLevel } from "./level.js";
import { clamp, distance } from "./utils.js";

const DIRTY = "#6e4d2f";

export class PipeRescueGame {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;

    this.levelNumber = 1;
    this.score = 0;
    this.patchEquipped = false;
    this.repaired = 0;
    this.timeLeft = 0;
    this.timeOfDay = "day";

    this.keys = new Set();
    this.joystick = { active: false, id: null, x: 115, y: canvas.height - 90, dx: 0, dy: 0, baseX: 115, baseY: canvas.height - 90 };

    this.player = {
      x: GRID.offsetX + GRID.cell * 2.5,
      y: GRID.offsetY + GRID.cell * 2.5,
      hp: PLAYER.maxHp,
      facing: 1,
      meleeCd: 0,
      hoseCd: 0,
      invuln: 0,
      digPulse: 0
    };

    this.dug = new Set();
    this.particles = [];
    this.last = performance.now();

    this.level = buildLevel();
    this.timeLeft = this.level.timer;

    this.bindEvents();
    this.refreshUi();
  }

  bindEvents() {
    window.addEventListener("keydown", (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));

    const pointer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches?.[0] ?? e;
      return {
        x: ((touch.clientX - rect.left) / rect.width) * this.canvas.width,
        y: ((touch.clientY - rect.top) / rect.height) * this.canvas.height,
        id: touch.identifier ?? "mouse"
      };
    };

    const down = (e) => {
      const p = pointer(e);
      if (this.inCircle(p.x, p.y, this.joystick.baseX, this.joystick.baseY, 84)) {
        this.joystick.active = true;
        this.joystick.id = p.id;
        this.joystick.x = p.x;
        this.joystick.y = p.y;
      }
      this.handleActionButtons(p.x, p.y);
      this.tryRepair();
    };

    const move = (e) => {
      const p = pointer(e);
      if (this.joystick.active && this.joystick.id === p.id) {
        const dx = p.x - this.joystick.baseX;
        const dy = p.y - this.joystick.baseY;
        const len = Math.hypot(dx, dy) || 1;
        const cap = Math.min(56, len);
        this.joystick.dx = (dx / len) * (cap / 56);
        this.joystick.dy = (dy / len) * (cap / 56);
        this.joystick.x = this.joystick.baseX + (dx / len) * cap;
        this.joystick.y = this.joystick.baseY + (dy / len) * cap;
      }
    };

    const up = (e) => {
      const id = e.changedTouches?.[0]?.identifier ?? "mouse";
      if (this.joystick.id === id || id === "mouse") {
        this.joystick.active = false;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
        this.joystick.x = this.joystick.baseX;
        this.joystick.y = this.joystick.baseY;
      }
    };

    this.canvas.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    this.canvas.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up, { passive: true });

    this.ui.equipPatchBtn.addEventListener("click", () => {
      if (this.isNearToolbox()) {
        this.patchEquipped = true;
        this.refreshUi();
      }
    });
    this.ui.retryBtn.addEventListener("click", () => this.resetLevel());
    this.ui.restartBtn.addEventListener("click", () => this.restartGame());
    this.ui.fullscreenBtn?.addEventListener("click", () => this.enterFullscreen());
    this.ui.timeOfDay?.addEventListener("change", (e) => {
      this.timeOfDay = e.target.value;
    });
    this.ui.nextLevelBtn.addEventListener("click", () => {
      this.ui.tipModal.classList.add("hidden");
      this.restartGame();
    });
  }

  restartGame() {
    this.score = 0;
    this.levelNumber = 1;
    this.resetLevel();
  }

  resetLevel() {
    this.level = buildLevel();
    this.dug.clear();
    this.particles.length = 0;
    this.player.x = GRID.offsetX + GRID.cell * 2.5;
    this.player.y = GRID.offsetY + GRID.cell * 2.5;
    this.player.hp = PLAYER.maxHp;
    this.repaired = 0;
    this.timeLeft = this.level.timer;
    this.patchEquipped = false;
    this.refreshUi();
  }

  inCircle(x, y, cx, cy, r) {
    return distance(x, y, cx, cy) <= r;
  }

  handleActionButtons(x, y) {
    const shovel = { x: this.canvas.width - 130, y: this.canvas.height - 95, r: 45 };
    const hose = { x: this.canvas.width - 54, y: this.canvas.height - 175, r: 38 };
    if (this.inCircle(x, y, shovel.x, shovel.y, shovel.r)) this.shovelAttack();
    if (this.inCircle(x, y, hose.x, hose.y, hose.r)) this.hoseAttack();
  }

  shovelAttack() {
    if (this.player.meleeCd > 0) return;
    this.player.meleeCd = 0.35;
    for (const enemy of this.level.enemies) {
      if (!enemy.alive) continue;
      const d = distance(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d <= 56) {
        enemy.hp -= 1;
        enemy.knockback = 0.18;
        this.spawnBurst(enemy.x, enemy.y, "#ffd77e", 5);
        if (enemy.hp <= 0) {
          enemy.alive = false;
          this.score += 120;
          this.spawnBurst(enemy.x, enemy.y, "#79dcff", 18);
        }
      }
    }
  }

  hoseAttack() {
    if (this.player.hoseCd > 0) return;
    this.player.hoseCd = 0.5;
    for (const enemy of this.level.enemies) {
      if (!enemy.alive) continue;
      const d = distance(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d <= 170) {
        enemy.inflate += 1;
        enemy.knockback = 0.26;
        this.spawnBurst(enemy.x, enemy.y, "#6fd6ff", 8);
        if (enemy.inflate >= 3) {
          enemy.alive = false;
          this.score += 180;
          this.spawnBurst(enemy.x, enemy.y, "#73ecff", 26);
        }
      }
    }
  }

  isNearToolbox() {
    return distance(this.player.x, this.player.y, GRID.offsetX + 56, GRID.offsetY + 56) < 72;
  }

  tryRepair() {
    if (!this.patchEquipped) return;
    for (const broken of this.level.brokenPipes) {
      if (broken.repaired) continue;
      const center = this.cellCenter(broken.c, broken.r);
      if (distance(this.player.x, this.player.y, center.x, center.y) < 45) {
        broken.progress += 0.4;
        if (broken.progress >= broken.required) {
          broken.repaired = true;
          this.patchEquipped = false;
          this.repaired += 1;
          this.score += 300;
          this.spawnBurst(center.x, center.y, "#9ef2ff", 14);
          this.refreshUi();
        }
      }
    }
  }

  update(dt) {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.player.hp <= 0 || this.timeLeft <= 0) {
      this.showTipModal("Mission Failed", "Time or health ran out. Try again and balance repair with combat.");
      return;
    }

    this.player.meleeCd = Math.max(0, this.player.meleeCd - dt);
    this.player.hoseCd = Math.max(0, this.player.hoseCd - dt);
    this.player.invuln = Math.max(0, this.player.invuln - dt);
    this.player.digPulse += dt * 10;

    this.updatePlayer(dt);
    this.digAroundPlayer();
    this.updateEnemies(dt);
    this.updateParticles(dt);

    if (this.repaired >= this.level.brokenPipes.length) {
      this.showTipModal(`Level ${this.levelNumber} complete!`, EDUCATIONAL_TIPS[0]);
    }

    this.refreshUi();
  }

  updatePlayer(dt) {
    let dx = this.joystick.dx;
    let dy = this.joystick.dy;

    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;

    const len = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      this.player.x += (dx / len) * PLAYER.speed * dt;
      this.player.y += (dy / len) * PLAYER.speed * dt;
      this.player.facing = dx >= 0 ? 1 : -1;
    }

    this.player.x = clamp(this.player.x, GRID.offsetX + 14, GRID.offsetX + GRID.cols * GRID.cell - 14);
    this.player.y = clamp(this.player.y, GRID.offsetY + 14, GRID.offsetY + GRID.rows * GRID.cell - 14);
  }

  digAroundPlayer() {
    const c = Math.floor((this.player.x - GRID.offsetX) / GRID.cell);
    const r = Math.floor((this.player.y - GRID.offsetY) / GRID.cell);
    for (let rr = r - 1; rr <= r + 1; rr++) {
      for (let cc = c - 1; cc <= c + 1; cc++) {
        if (cc < 0 || rr < 0 || cc >= GRID.cols || rr >= GRID.rows) continue;
        if (distance(this.player.x, this.player.y, ...Object.values(this.cellCenter(cc, rr))) < 46) {
          this.dug.add(`${cc},${rr}`);
          if (Math.random() < 0.12) this.spawnBurst(this.player.x, this.player.y + 6, "#9d7a56", 1);
        }
      }
    }
  }

  updateEnemies(dt) {
    for (const enemy of this.level.enemies) {
      if (!enemy.alive) continue;
      const d = distance(enemy.x, enemy.y, this.player.x, this.player.y);
      const dirX = (this.player.x - enemy.x) / (d || 1);
      const dirY = (this.player.y - enemy.y) / (d || 1);

      const slow = enemy.inflate > 0 ? 0.85 - enemy.inflate * 0.18 : 1;
      const moveRate = Math.max(0.35, enemy.speed * slow);
      if (enemy.knockback > 0) {
        enemy.knockback -= dt;
        enemy.x -= dirX * 90 * dt;
        enemy.y -= dirY * 90 * dt;
      } else {
        enemy.x += dirX * moveRate * 58 * dt;
        enemy.y += dirY * moveRate * 58 * dt;
      }

      if (d < 28 && this.player.invuln <= 0) {
        this.player.hp -= 1;
        this.player.invuln = 0.8;
      }
    }
  }

  spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 90;
      this.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.5 + Math.random() * 0.5, color });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 30 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  cellCenter(c, r) {
    return { x: GRID.offsetX + c * GRID.cell + GRID.cell / 2, y: GRID.offsetY + r * GRID.cell + GRID.cell / 2 };
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawSky(ctx);
    this.drawGround(ctx);
    this.drawPipeNetwork(ctx);
    this.drawToolbox(ctx);
    this.drawBrokenPipes(ctx);
    this.drawEnemies(ctx);
    this.drawPlayer(ctx);
    this.drawParticles(ctx);
    this.drawControls(ctx);
    this.drawAtmosphere(ctx);
  }

  drawSky(ctx) {
    const horizon = GRID.offsetY - 10;
    const themes = {
      day: { top: "#80d9ff", bottom: "#c8f0ff", glow: "#ffd85f", body: "#fff2a8", dim: 0 },
      sunset: { top: "#ff8a62", bottom: "#ffcb89", glow: "#ff7b42", body: "#ffd7a8", dim: 0.08 },
      night: { top: "#081126", bottom: "#25385e", glow: "#ccd9ff", body: "#eff5ff", dim: 0.32 }
    };
    const mode = themes[this.timeOfDay] ?? themes.day;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, mode.top);
    sky.addColorStop(1, mode.bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.canvas.width, horizon);

    const bodyX = this.timeOfDay === "night" ? this.canvas.width - 120 : 120;
    const glow = ctx.createRadialGradient(bodyX, 46, 3, bodyX, 46, 46);
    glow.addColorStop(0, mode.glow);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(bodyX, 46, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = mode.body;
    ctx.beginPath();
    ctx.arc(bodyX, 46, 18, 0, Math.PI * 2);
    ctx.fill();

    if (this.timeOfDay === "night") {
      ctx.fillStyle = "#f6fbff";
      for (let i = 0; i < 20; i++) {
        const x = ((i * 71) % this.canvas.width) + 8;
        const y = 10 + ((i * 43) % (horizon - 24));
        ctx.fillRect(x, y, 2, 2);
      }
    }

    ctx.fillStyle = "#2f6f47";
    ctx.fillRect(0, horizon - 10, this.canvas.width, 12);
  }


  drawAtmosphere(ctx) {
    const dimMap = { day: 0, sunset: 0.1, night: 0.32 };
    const alpha = dimMap[this.timeOfDay] ?? 0;
    if (!alpha) return;
    ctx.fillStyle = `rgba(7, 12, 24, ${alpha})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGround(ctx) {
    ctx.fillStyle = DIRTY;
    ctx.fillRect(GRID.offsetX, GRID.offsetY, GRID.cols * GRID.cell, GRID.rows * GRID.cell);

    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++) {
        const x = GRID.offsetX + c * GRID.cell;
        const y = GRID.offsetY + r * GRID.cell;
        const key = `${c},${r}`;
        if (this.dug.has(key)) {
          ctx.fillStyle = "#2f1e12";
          ctx.fillRect(x + 2, y + 2, GRID.cell - 4, GRID.cell - 4);
        } else {
          const grain = (c * 37 + r * 17) % 24;
          ctx.fillStyle = grain > 12 ? "#7a5838" : "#66472c";
          ctx.fillRect(x, y, GRID.cell, GRID.cell);
          ctx.fillStyle = "rgba(43,24,10,.25)";
          ctx.fillRect(x + (grain % 8), y + 9 + (grain % 16), 4, 4);
          ctx.fillRect(x + 26 + (grain % 8), y + 22, 3, 3);
        }
      }
    }
  }

  drawPipeNetwork(ctx) {
    for (const key of this.level.pipeTiles) {
      const [c, r] = key.split(",").map(Number);
      const center = this.cellCenter(c, r);
      const steel = ctx.createLinearGradient(center.x - 20, center.y - 11, center.x + 20, center.y + 11);
      steel.addColorStop(0, "#4c5c66");
      steel.addColorStop(0.45, "#9fb3bf");
      steel.addColorStop(1, "#5b6973");

      ctx.lineCap = "round";
      ctx.lineWidth = 16;
      ctx.strokeStyle = steel;
      ctx.beginPath();
      ctx.moveTo(center.x - 21, center.y);
      ctx.lineTo(center.x + 21, center.y);
      ctx.stroke();

      ctx.strokeStyle = "rgba(226,244,255,0.35)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(center.x - 16, center.y - 3);
      ctx.lineTo(center.x + 16, center.y - 3);
      ctx.stroke();

      ctx.fillStyle = "#73838e";
      ctx.beginPath();
      ctx.arc(center.x - 16, center.y, 3.3, 0, Math.PI * 2);
      ctx.arc(center.x + 16, center.y, 3.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawToolbox(ctx) {
    const x = GRID.offsetX + 16;
    const y = GRID.offsetY + 16;
    ctx.fillStyle = "#37495f";
    ctx.fillRect(x, y, 80, 42);
    ctx.fillStyle = "#8bd8ff";
    ctx.fillRect(x + 12, y + 14, 18, 14);
    ctx.fillRect(x + 36, y + 14, 18, 14);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.fillText("Toolbox", x + 9, y - 6);
  }

  drawBrokenPipes(ctx) {
    for (const broken of this.level.brokenPipes) {
      const center = this.cellCenter(broken.c, broken.r);
      const pipeGrad = ctx.createLinearGradient(center.x - 19, center.y - 8, center.x + 19, center.y + 8);
      pipeGrad.addColorStop(0, "#506069");
      pipeGrad.addColorStop(0.5, "#99afbb");
      pipeGrad.addColorStop(1, "#5b6b76");

      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.strokeStyle = broken.repaired ? "#79dbff" : pipeGrad;
      ctx.beginPath();
      ctx.moveTo(center.x - 18, center.y);
      ctx.lineTo(center.x + 18, center.y);
      ctx.stroke();

      if (broken.repaired) continue;

      ctx.strokeStyle = "#ce4f4f";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(center.x - 1, center.y - 8);
      ctx.lineTo(center.x + 1, center.y + 8);
      ctx.stroke();

      ctx.fillStyle = "rgba(120,236,255,0.85)";
      ctx.beginPath();
      ctx.arc(center.x, center.y + 13, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEnemies(ctx) {
    for (const enemy of this.level.enemies) {
      if (!enemy.alive) continue;
      const inflate = enemy.inflate * 3;
      const radius = 13 + inflate;
      ctx.fillStyle = enemy.type === "raccoon" ? "#74777f" : enemy.type === "spider" ? "#2d2d39" : "#5f8f47";
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y, radius + 2, radius, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(enemy.x - 5, enemy.y - 3, 2.2, 0, Math.PI * 2);
      ctx.arc(enemy.x + 5, enemy.y - 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(ctx) {
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.facing, 1);

    const suit = ctx.createLinearGradient(-14, -5, 14, 20);
    suit.addColorStop(0, "#4a6a8a");
    suit.addColorStop(1, "#253a50");
    ctx.fillStyle = suit;
    ctx.beginPath();
    ctx.ellipse(0, 10, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f6c99c";
    ctx.beginPath();
    ctx.arc(0, -7, 9.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f39b27";
    ctx.beginPath();
    ctx.roundRect(-11, -17, 22, 7, 3);
    ctx.fill();

    ctx.fillStyle = "#152739";
    ctx.beginPath();
    ctx.arc(-3.3, -8, 1.2, 0, Math.PI * 2);
    ctx.arc(3.3, -8, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#102030";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -4.4, 2.2, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.fillStyle = "#6dc4ff";
    ctx.beginPath();
    ctx.roundRect(9, 4, 16, 5, 3);
    ctx.fill();

    ctx.fillStyle = "#3e556d";
    ctx.beginPath();
    ctx.roundRect(-10, 24, 8, 5, 2);
    ctx.roundRect(2, 24, 8, 5, 2);
    ctx.fill();

    ctx.restore();
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  drawControls(ctx) {
    const joy = this.joystick;
    ctx.fillStyle = "rgba(20,32,44,0.55)";
    ctx.beginPath();
    ctx.arc(joy.baseX, joy.baseY, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(110,220,255,0.75)";
    ctx.beginPath();
    ctx.arc(joy.x, joy.y, 24, 0, Math.PI * 2);
    ctx.fill();

    this.drawActionButton(ctx, this.canvas.width - 130, this.canvas.height - 95, 45, "🛠");
    this.drawActionButton(ctx, this.canvas.width - 54, this.canvas.height - 175, 38, "💧");
  }

  drawActionButton(ctx, x, y, r, icon) {
    ctx.fillStyle = "rgba(22,36,52,.72)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a6e8ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.floor(r * 0.8)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, x, y + 1);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  refreshUi() {
    this.ui.levelLabel.textContent = `${this.levelNumber}`;
    this.ui.scoreLabel.textContent = `${this.score}`;
    this.ui.fixedLabel.textContent = `${this.repaired}`;
    this.ui.totalLabel.textContent = `${this.level.brokenPipes.length}`;
    this.ui.patchLabel.textContent = this.patchEquipped ? "Ready" : "None";
    this.ui.timerLabel.textContent = `${Math.ceil(this.timeLeft)}s`;
    this.ui.hpLabel.textContent = `${"❤️".repeat(this.player.hp)}${"🖤".repeat(Math.max(0, PLAYER.maxHp - this.player.hp))}`;
  }

  showTipModal(title, text) {
    this.ui.tipTitle.textContent = title;
    this.ui.tipText.textContent = text;
    this.ui.tipModal.classList.remove("hidden");
  }

  enterFullscreen() {
    const root = document.documentElement;
    if (root.requestFullscreen) root.requestFullscreen();
  }

  start() {
    const frame = (t) => {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      if (this.ui.tipModal.classList.contains("hidden")) this.update(dt);
      this.draw();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
