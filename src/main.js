import { InputController } from './game/input/InputController.js';
import { SurvivalSimulation } from './game/simulation/SurvivalSimulation.js';
import { NeonRenderer } from './render/NeonRenderer.js';
import { Hud } from './ui/Hud.js';

const canvasContainer = document.getElementById('game-canvas');
if (!canvasContainer) throw new Error('Missing game canvas container.');

const renderer = new NeonRenderer(canvasContainer);
const simulation = new SurvivalSimulation();
const input = new InputController();
let lastTimestamp = performance.now();
let lastScore = -1;
let lastThreat = -1;
let bestScore = Number.parseInt(localStorage.getItem('neon-voyager-best') ?? '0', 10);
if (!Number.isFinite(bestScore)) bestScore = 0;

const restart = () => {
  input.clear();
  simulation.reset(renderer.width, renderer.height);
  lastTimestamp = performance.now();
  lastScore = -1;
  lastThreat = -1;
  hud.hideGameOver();
  hud.updateScore(0);
  hud.updateThreat(1);
};

const hud = new Hud({
  onRestart: restart,
  onDirection: (direction, active) => {
    input.setPointer(direction, active);
    if (active) hud.dismissHint();
  },
});

const loop = (timestamp) => {
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  const collision = simulation.update(
    delta,
    input.direction,
    renderer.width,
    renderer.height,
  );
  if (input.direction !== 0) hud.dismissHint();

  if (simulation.score !== lastScore) {
    lastScore = simulation.score;
    hud.updateScore(lastScore);
  }
  if (simulation.difficulty.level !== lastThreat) {
    lastThreat = simulation.difficulty.level;
    hud.updateThreat(lastThreat);
  }
  if (collision) {
    input.clear();
    bestScore = Math.max(bestScore, simulation.score);
    localStorage.setItem('neon-voyager-best', String(bestScore));
    hud.showGameOver(simulation.score, bestScore);
  }

  renderer.render(simulation, timestamp);
  requestAnimationFrame(loop);
};

window.addEventListener('resize', () => {
  renderer.resize();
  simulation.resize(renderer.width, renderer.height);
});

window.addEventListener('keydown', (event) => {
  if (
    simulation.runState === 'game-over' &&
    (event.code === 'Space' || event.code === 'Enter')
  ) {
    event.preventDefault();
    restart();
  }
});

document.addEventListener('visibilitychange', () => {
  simulation.setPaused(document.hidden);
  hud.setPaused(document.hidden && simulation.runState === 'running');
  if (!document.hidden) lastTimestamp = performance.now();
});

requestAnimationFrame(loop);
