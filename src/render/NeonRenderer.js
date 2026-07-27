export class NeonRenderer {
  constructor(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.context = this.canvas.getContext('2d', { alpha: false });
    if (!this.context) throw new Error('Canvas 2D is not supported by this browser.');
    container.append(this.canvas);

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.stars = Array.from({ length: 34 }, (_, index) => ({
      x: this.seeded(index * 3.31),
      y: this.seeded(index * 7.17),
      length: 2 + this.seeded(index * 5.73) * 7,
      alpha: 0.12 + this.seeded(index * 9.91) * 0.4,
      color: index % 4 === 0 ? '#ff3ca6' : '#42f5ff',
    }));
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(320, rect.width);
    this.height = Math.max(400, rect.height);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  render(simulation, timestamp) {
    const context = this.context;
    context.clearRect(0, 0, this.width, this.height);
    this.drawBackdrop(context, timestamp);
    this.drawObstacles(context, simulation.obstacles);
    this.drawPlayer(context, simulation.player, simulation.runState === 'game-over', timestamp);
  }

  drawBackdrop(context, timestamp) {
    const gradient = context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#070612');
    gradient.addColorStop(0.62, '#0a0713');
    gradient.addColorStop(1, '#16091c');
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);

    context.save();
    context.strokeStyle = 'rgba(111, 89, 172, 0.22)';
    context.lineWidth = 1;
    const cellWidth = Math.max(48, this.width / 9);
    const drift = this.reducedMotion ? 0 : (timestamp * 0.018) % 54;
    for (let x = -cellWidth; x < this.width + cellWidth; x += cellWidth) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x - 70, this.height);
      context.stroke();
    }
    for (let y = -54 + drift; y < this.height + 54; y += 54) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.width, y);
      context.stroke();
    }
    context.restore();

    context.save();
    for (const star of this.stars) {
      const travel = this.reducedMotion ? 0 : (timestamp * 0.025) % this.height;
      const y = (star.y * this.height + travel) % this.height;
      context.globalAlpha = star.alpha;
      context.fillStyle = star.color;
      context.fillRect(star.x * this.width, y, 1.5, star.length);
    }
    context.restore();

    context.strokeStyle = 'rgba(66, 245, 255, 0.14)';
    context.beginPath();
    context.moveTo(24, 0);
    context.lineTo(24, this.height);
    context.moveTo(this.width - 24, 0);
    context.lineTo(this.width - 24, this.height);
    context.stroke();
  }

  drawPlayer(context, player, hit, timestamp) {
    const pulse = this.reducedMotion ? 1 : 0.92 + Math.sin(timestamp * 0.008) * 0.08;
    context.save();
    context.translate(player.x, player.y);
    context.scale(pulse, pulse);
    context.shadowColor = hit ? '#ff3ca6' : '#42f5ff';
    context.shadowBlur = hit ? 28 : 20;
    context.fillStyle = hit ? 'rgba(255, 60, 166, 0.2)' : 'rgba(66, 245, 255, 0.16)';
    this.triangle(context, 0, -24, -28, 22, 28, 22);
    context.fill();
    context.lineWidth = 2.4;
    context.strokeStyle = hit ? '#ffffff' : '#d9fdff';
    this.triangle(context, 0, -18, -21, 18, 21, 18);
    context.stroke();
    context.fillStyle = '#ff3ca6';
    this.triangle(context, 0, -6, -7, 10, 7, 10);
    context.fill();
    context.restore();

    if (!hit) {
      const trail = context.createLinearGradient(0, player.y + 14, 0, player.y + 60);
      trail.addColorStop(0, 'rgba(66, 245, 255, 0.5)');
      trail.addColorStop(1, 'rgba(66, 245, 255, 0)');
      context.fillStyle = trail;
      context.beginPath();
      context.moveTo(player.x - 7, player.y + 15);
      context.lineTo(player.x + 7, player.y + 15);
      context.lineTo(player.x, player.y + 55);
      context.closePath();
      context.fill();
    }
  }

  drawObstacles(context, obstacles) {
    for (const obstacle of obstacles) {
      const color = obstacle.hue === 'cyan' ? '#42f5ff' : '#ff3ca6';
      context.save();
      context.translate(obstacle.x, obstacle.y);
      context.rotate(obstacle.rotation);
      context.shadowColor = color;
      context.shadowBlur = 19;
      context.fillStyle = '#16091c';
      context.strokeStyle = color;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, obstacle.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.globalAlpha = 0.75;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(-obstacle.radius * 0.35, -obstacle.radius * 0.4, 2.6, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  triangle(context, topX, topY, leftX, leftY, rightX, rightY) {
    context.beginPath();
    context.moveTo(topX, topY);
    context.lineTo(rightX, rightY);
    context.lineTo(leftX, leftY);
    context.closePath();
  }

  seeded(value) {
    return Math.abs(Math.sin(value * 12.9898) * 43758.5453) % 1;
  }
}
