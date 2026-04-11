import { PipeRescueGame } from "./game.js";

const ui = {
  levelLabel: document.getElementById("levelLabel"),
  scoreLabel: document.getElementById("scoreLabel"),
  fixedLabel: document.getElementById("fixedLabel"),
  totalLabel: document.getElementById("totalLabel"),
  patchLabel: document.getElementById("patchLabel"),
  timerLabel: document.getElementById("timerLabel"),
  hpLabel: document.getElementById("hpLabel"),
  equipPatchBtn: document.getElementById("equipPatchBtn"),
  retryBtn: document.getElementById("retryBtn"),
  restartBtn: document.getElementById("restartBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  tipModal: document.getElementById("tipModal"),
  tipTitle: document.getElementById("tipTitle"),
  tipText: document.getElementById("tipText"),
  nextLevelBtn: document.getElementById("nextLevelBtn")
};

const canvas = document.getElementById("gameCanvas");
const game = new PipeRescueGame(canvas, ui);
game.start();
