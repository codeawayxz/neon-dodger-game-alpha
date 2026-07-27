import test from 'node:test';
import assert from 'node:assert/strict';
import { SurvivalSimulation } from './SurvivalSimulation.js';

test('awards one point per completed second', () => {
  const simulation = new SurvivalSimulation(() => 0.5);
  simulation.update(999, 0, 520, 720);
  assert.equal(simulation.score, 0);
  simulation.update(1, 0, 520, 720);
  assert.equal(simulation.score, 1);
});

test('increases threat while respecting caps', () => {
  const simulation = new SurvivalSimulation(() => 0.5);
  simulation.elapsedMs = 60_000;
  assert.equal(simulation.difficulty.level, 5);
  assert.ok(simulation.difficulty.spawnIntervalMs >= 330);
});

test('detects a collision and freezes the run', () => {
  const simulation = new SurvivalSimulation(() => 0.5);
  simulation.elapsedMs = 5_000;
  simulation.obstacles = [{
    x: simulation.player.x,
    y: simulation.player.y,
    radius: 18,
    speed: 0,
    rotation: 0,
    spin: 0,
    hue: 'pink',
  }];
  assert.equal(simulation.update(16, 0, 520, 720), true);
  assert.equal(simulation.runState, 'game-over');
  const score = simulation.score;
  simulation.update(1_000, 0, 520, 720);
  assert.equal(simulation.score, score);
});
