const MAX_LEVEL = 5;
const PLAYER_SPEED = 440;
const PLAYER_RADIUS = 15;
const PLAYER_BOTTOM_PADDING = 56;

export class SurvivalSimulation {
  constructor(random = Math.random) {
    this.random = random;
    this.reset(520, 720);
  }

  get score() {
    return Math.floor(this.elapsedMs / 1000);
  }

  get difficulty() {
    const level = Math.min(MAX_LEVEL, 1 + Math.floor(this.elapsedMs / 12_000));
    return {
      level,
      obstacleSpeed: 205 + (level - 1) * 62,
      spawnIntervalMs: Math.max(330, 880 - (level - 1) * 125),
      maxObstacles: 8 + level * 3,
    };
  }

  update(deltaMs, direction, width, height) {
    if (this.runState !== 'running' || this.paused) return false;

    const elapsedDelta = Math.max(0, deltaMs);
    const safeDelta = Math.min(elapsedDelta, 50);
    const deltaSeconds = safeDelta / 1000;
    this.elapsedMs += elapsedDelta;
    this.player.x = this.clamp(
      this.player.x + direction * PLAYER_SPEED * deltaSeconds,
      26,
      width - 26,
    );
    this.player.y = height - PLAYER_BOTTOM_PADDING;

    const difficulty = this.difficulty;
    this.spawnTimer += Math.min(elapsedDelta, 250);
    if (
      this.spawnTimer >= difficulty.spawnIntervalMs &&
      this.obstacles.length < difficulty.maxObstacles
    ) {
      this.spawnTimer = 0;
      this.spawnObstacle(width, difficulty.obstacleSpeed);
    }

    for (const obstacle of this.obstacles) {
      obstacle.y += obstacle.speed * deltaSeconds;
      obstacle.rotation += obstacle.spin * deltaSeconds;
    }
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.y < height + 70);

    const collision = this.obstacles.some((obstacle) => {
      const dx = obstacle.x - this.player.x;
      const dy = obstacle.y - this.player.y;
      const collisionRadius = obstacle.radius + PLAYER_RADIUS;
      return dx * dx + dy * dy <= collisionRadius * collisionRadius;
    });

    if (collision) {
      this.runState = 'game-over';
      return true;
    }
    return false;
  }

  resize(width, height) {
    this.player.x = this.clamp(this.player.x, 26, width - 26);
    this.player.y = height - PLAYER_BOTTOM_PADDING;
  }

  setPaused(paused) {
    if (this.runState === 'running') this.paused = paused;
  }

  reset(width, height) {
    this.elapsedMs = 0;
    this.spawnTimer = 0;
    this.runState = 'running';
    this.paused = false;
    this.player = { x: width / 2, y: height - PLAYER_BOTTOM_PADDING };
    this.obstacles = [];
  }

  spawnObstacle(width, baseSpeed) {
    const radius = 12 + this.random() * 8;
    this.obstacles.push({
      x: 34 + this.random() * Math.max(1, width - 68),
      y: -36,
      radius,
      speed: baseSpeed * (0.88 + this.random() * 0.26),
      rotation: 0,
      spin: -1.5 + this.random() * 3,
      hue: this.random() > 0.7 ? 'cyan' : 'pink',
    });
  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
}
