export class NeonRenderer {
  constructor(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.context = this.canvas.getContext('2d', { alpha: false });
    if (!this.context) throw new Error('Canvas 2D is not supported by this browser.');
    container.append(this.canvas);

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 3-layer starfield
    this.starLayers = [
      this.generateStars(40, 0.3, 0.08, 0.25),  // layer 1: small, slow, dim
      this.generateStars(20, 0.6, 0.2, 0.5),     // layer 2: medium, moderate, bright
      this.generateStars(10, 1.2, 0.35, 0.7),     // layer 3: few, fast, very bright
    ];

    // Nebula blobs
    this.nebulae = Array.from({ length: 3 }, (_, i) => ({
      x: this.seeded(i * 4.21) * 0.8 + 0.1,
      y: this.seeded(i * 7.33) * 0.6 + 0.1,
      radius: 0.18 + this.seeded(i * 2.91) * 0.14,
      hue: i % 2 === 0 ? 'rgba(139, 92, 255, 0.04)' : 'rgba(255, 60, 166, 0.03)',
    }));

    // Thruster particle pool
    this.particles = [];
    this.maxParticles = 60;

    // Camera state
    this.cameraShake = { x: 0, y: 0, intensity: 0 };
    this.cameraZoom = 1;

    this.resize();
  }

  generateStars(count, speedMul, minAlpha, maxAlpha) {
    return Array.from({ length: count }, (_, i) => ({
      x: this.seeded(i * 3.31 + count),
      y: this.seeded(i * 7.17 + count),
      size: 1 + this.seeded(i * 2.13 + count) * (speedMul > 0.8 ? 2.5 : 1.5),
      length: 2 + this.seeded(i * 5.73 + count) * (3 + speedMul * 8),
      alpha: minAlpha + this.seeded(i * 9.91 + count) * (maxAlpha - minAlpha),
      speedMul,
      color: i % 5 === 0 ? '#ff3ca6' : i % 3 === 0 ? '#8b5cff' : '#42f5ff',
    }));
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
    const ctx = this.context;
    const intensity = simulation.difficulty.intensity;
    const isOver = simulation.runState === 'game-over';

    // Update camera
    this.updateCamera(simulation, timestamp);

    ctx.save();

    // Apply camera transforms
    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.translate(cx + this.cameraShake.x, cy + this.cameraShake.y);
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(-cx, -cy);

    // Apply camera tilt based on player roll
    const tiltAngle = simulation.player.roll * 0.03;
    ctx.translate(cx, cy);
    ctx.rotate(tiltAngle);
    ctx.translate(-cx, -cy);

    ctx.clearRect(-50, -50, this.width + 100, this.height + 100);
    this.drawBackdrop(ctx, timestamp, intensity);
    this.drawNebulae(ctx, timestamp);
    this.drawStarfield(ctx, timestamp, intensity);
    this.drawObstacles(ctx, simulation.obstacles);
    this.updateParticles(simulation, timestamp);
    this.drawParticles(ctx);
    this.drawPlayer(ctx, simulation.player, isOver, timestamp, intensity);

    ctx.restore();
  }

  updateCamera(simulation, timestamp) {
    const isOver = simulation.runState === 'game-over';

    // Impact shake on game over
    if (isOver && this.cameraShake.intensity === 0) {
      this.cameraShake.intensity = 12;
    }
    if (this.cameraShake.intensity > 0.1) {
      this.cameraShake.x = (Math.random() - 0.5) * this.cameraShake.intensity * 2;
      this.cameraShake.y = (Math.random() - 0.5) * this.cameraShake.intensity * 2;
      this.cameraShake.intensity *= 0.88;
    } else {
      this.cameraShake.x = 0;
      this.cameraShake.y = 0;
      if (!isOver) this.cameraShake.intensity = 0;
    }

    // Subtle zoom pulse
    if (!this.reducedMotion) {
      this.cameraZoom = 1 + Math.sin(timestamp * 0.0012) * 0.004;
    }
  }

  drawBackdrop(ctx, timestamp, intensity) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#070612');
    gradient.addColorStop(0.62, '#0a0713');
    gradient.addColorStop(1, '#16091c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Intensifying background glow with difficulty
    const glowAlpha = 0.03 + intensity * 0.06;
    const bgGlow = ctx.createRadialGradient(
      this.width / 2, this.height * 0.8, 0,
      this.width / 2, this.height * 0.8, this.height * 0.6,
    );
    bgGlow.addColorStop(0, `rgba(139, 92, 255, ${glowAlpha})`);
    bgGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(111, 89, 172, 0.22)';
    ctx.lineWidth = 1;
    const cellWidth = Math.max(48, this.width / 9);
    for (let x = -cellWidth; x < this.width + cellWidth; x += cellWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 70, this.height);
      ctx.stroke();
    }
    const drift = this.reducedMotion ? 0 : (timestamp * 0.018) % 54;
    for (let y = -54 + drift; y < this.height + 54; y += 54) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Side rails
    ctx.strokeStyle = 'rgba(66, 245, 255, 0.14)';
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(24, this.height);
    ctx.moveTo(this.width - 24, 0);
    ctx.lineTo(this.width - 24, this.height);
    ctx.stroke();
  }

  drawNebulae(ctx, timestamp) {
    ctx.save();
    for (const nebula of this.nebulae) {
      const wobble = this.reducedMotion ? 0 : Math.sin(timestamp * 0.0003) * 10;
      const x = nebula.x * this.width + wobble;
      const y = nebula.y * this.height;
      const r = nebula.radius * this.width;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, nebula.hue);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  drawStarfield(ctx, timestamp, intensity) {
    if (this.reducedMotion) return;
    ctx.save();
    const speedBoost = 1 + intensity * 1.5;
    for (const layer of this.starLayers) {
      for (const star of layer) {
        const travel = (timestamp * 0.025 * star.speedMul * speedBoost) % this.height;
        const y = (star.y * this.height + travel) % this.height;
        const trailLen = star.length * (1 + intensity * star.speedMul);
        ctx.globalAlpha = star.alpha * (1 + intensity * 0.3);
        ctx.fillStyle = star.color;
        ctx.fillRect(star.x * this.width, y, star.size, trailLen);
      }
    }
    ctx.restore();
  }

  drawPlayer(ctx, player, hit, timestamp, intensity) {
    const pulse = this.reducedMotion ? 1 : 0.96 + Math.sin(timestamp * 0.008) * 0.04;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.roll);
    ctx.scale(pulse, pulse);

    // Ship glow increases with intensity
    const glowStrength = 20 + intensity * 14;
    ctx.shadowColor = hit ? '#ff3ca6' : '#42f5ff';
    ctx.shadowBlur = hit ? 28 : glowStrength;

    // --- Engine flame (behind ship) ---
    if (!hit) {
      this.drawEngineFlame(ctx, timestamp, intensity);
    }

    // --- Wings (outer hull) ---
    ctx.fillStyle = hit ? 'rgba(255, 60, 166, 0.15)' : 'rgba(66, 245, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-10, 4);
    ctx.lineTo(-30, 20);
    ctx.lineTo(-26, 14);
    ctx.lineTo(-8, 8);
    ctx.moveTo(0, -22);
    ctx.lineTo(10, 4);
    ctx.lineTo(30, 20);
    ctx.lineTo(26, 14);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();

    // --- Main hull (neon outline) ---
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = hit ? '#ffffff' : '#d9fdff';
    ctx.fillStyle = hit ? 'rgba(255, 60, 166, 0.2)' : 'rgba(10, 8, 22, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-12, 6);
    ctx.lineTo(-8, 8);
    ctx.lineTo(-10, 20);
    ctx.lineTo(0, 14);
    ctx.lineTo(10, 20);
    ctx.lineTo(8, 8);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing struts
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = hit ? 'rgba(255, 60, 166, 0.6)' : 'rgba(66, 245, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(-28, 18);
    ctx.moveTo(10, 4);
    ctx.lineTo(28, 18);
    ctx.stroke();

    // Wing tips
    ctx.fillStyle = hit ? '#ff3ca6' : '#42f5ff';
    ctx.beginPath();
    ctx.arc(-29, 19, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(29, 19, 2, 0, Math.PI * 2);
    ctx.fill();

    // --- Cockpit ---
    ctx.fillStyle = hit ? '#ff3ca6' : '#42f5ff';
    ctx.shadowColor = hit ? '#ff3ca6' : '#42f5ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-5, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fill();

    // Cockpit highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-2, -4);
    ctx.lineTo(0, -2);
    ctx.lineTo(2, -4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawEngineFlame(ctx, timestamp, intensity) {
    const flicker = Math.sin(timestamp * 0.03) * 0.3 + Math.sin(timestamp * 0.07) * 0.2;
    const baseLength = 18 + intensity * 22;
    const flameLength = baseLength + flicker * 6;

    // Main flame
    const flameGrad = ctx.createLinearGradient(0, 14, 0, 14 + flameLength);
    flameGrad.addColorStop(0, 'rgba(66, 245, 255, 0.9)');
    flameGrad.addColorStop(0.3, 'rgba(139, 92, 255, 0.6)');
    flameGrad.addColorStop(0.7, 'rgba(255, 60, 166, 0.3)');
    flameGrad.addColorStop(1, 'rgba(255, 60, 166, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(6, 14);
    ctx.lineTo(1 + flicker * 2, 14 + flameLength);
    ctx.lineTo(-1 + flicker * -2, 14 + flameLength);
    ctx.closePath();
    ctx.fill();

    // Inner bright core
    const coreLen = flameLength * 0.5;
    const coreGrad = ctx.createLinearGradient(0, 14, 0, 14 + coreLen);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    coreGrad.addColorStop(1, 'rgba(66, 245, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(-3, 14);
    ctx.lineTo(3, 14);
    ctx.lineTo(0, 14 + coreLen);
    ctx.closePath();
    ctx.fill();
  }

  updateParticles(simulation, timestamp) {
    const player = simulation.player;
    const isOver = simulation.runState === 'game-over';
    const intensity = simulation.difficulty.intensity;

    // Spawn thruster particles
    if (!isOver && !this.reducedMotion) {
      const spawnCount = 1 + Math.floor(intensity * 2);
      for (let i = 0; i < spawnCount && this.particles.length < this.maxParticles; i++) {
        const rollOffset = Math.sin(player.roll) * 4;
        this.particles.push({
          x: player.x + (Math.random() - 0.5) * 8 + rollOffset,
          y: player.y + 16 + Math.random() * 4,
          vx: (Math.random() - 0.5) * 20,
          vy: 40 + Math.random() * 60 + intensity * 30,
          life: 1,
          decay: 1.5 + Math.random() * 1.5,
          size: 2 + Math.random() * 3,
          brightness: 0.6 + intensity * 0.4,
        });
      }
    }

    // Update existing particles
    const dt = 1 / 60;
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      p.size *= 0.97;
      return p.life > 0 && p.size > 0.3;
    });
  }

  drawParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = p.life * p.brightness;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.life > 0.6 ? '#42f5ff' : p.life > 0.3 ? '#8b5cff' : '#ff3ca6';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawObstacles(ctx, obstacles) {
    for (const obstacle of obstacles) {
      const color = obstacle.hue === 'cyan' ? '#42f5ff' : '#ff3ca6';
      ctx.save();
      ctx.translate(obstacle.x, obstacle.y);
      ctx.rotate(obstacle.rotation);

      // Rim glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;

      // Draw polygon shape
      ctx.fillStyle = '#16091c';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;

      if (obstacle.vertices) {
        ctx.beginPath();
        for (let i = 0; i < obstacle.vertices.length; i++) {
          const v = obstacle.vertices[i];
          const px = Math.cos(v.angle) * v.r;
          const py = Math.sin(v.angle) * v.r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Surface cracks
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `${color}44`;
        ctx.lineWidth = 0.8;
        const seed = obstacle.crackSeed || 0;
        for (let c = 0; c < 3; c++) {
          const a1 = this.seeded(seed + c * 2.7) * Math.PI * 2;
          const a2 = a1 + (this.seeded(seed + c * 4.1) - 0.5) * 1.2;
          const r1 = obstacle.radius * 0.15;
          const r2 = obstacle.radius * (0.5 + this.seeded(seed + c * 1.3) * 0.4);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
          ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, obstacle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Specular highlight
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-obstacle.radius * 0.3, -obstacle.radius * 0.35, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  seeded(value) {
    return Math.abs(Math.sin(value * 12.9898) * 43758.5453) % 1;
  }
}
