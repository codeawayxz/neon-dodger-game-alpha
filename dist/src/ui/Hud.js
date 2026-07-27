const requiredElement = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required UI element: ${id}`);
  return element;
};

export class Hud {
  constructor(callbacks) {
    this.score = requiredElement('score');
    this.finalScore = requiredElement('final-score');
    this.bestScore = requiredElement('best-score');
    this.gameOver = requiredElement('game-over');
    this.restartButton = requiredElement('restart-button');
    this.statusMessage = requiredElement('status-message');
    this.pauseOverlay = requiredElement('pause-overlay');
    this.leftButton = requiredElement('move-left');
    this.rightButton = requiredElement('move-right');
    this.threatSegments = Array.from(
      { length: 5 },
      (_, index) => requiredElement(`threat-${index + 1}`),
    );

    this.restartButton.addEventListener('click', callbacks.onRestart);
    this.bindHoldButton(this.leftButton, -1, callbacks.onDirection);
    this.bindHoldButton(this.rightButton, 1, callbacks.onDirection);
  }

  updateScore(value) {
    this.score.textContent = this.formatScore(value);
  }

  updateThreat(level) {
    this.threatSegments.forEach((segment, index) => {
      segment.classList.toggle('is-active', index < level);
    });
  }

  dismissHint() {
    this.statusMessage.classList.add('is-hidden');
  }

  showGameOver(score, best) {
    this.finalScore.textContent = this.formatScore(score);
    this.bestScore.textContent = this.formatScore(best);
    this.gameOver.hidden = false;
    requestAnimationFrame(() => this.gameOver.classList.add('is-visible'));
    this.restartButton.focus({ preventScroll: true });
  }

  hideGameOver() {
    this.gameOver.classList.remove('is-visible');
    this.gameOver.hidden = true;
  }

  setPaused(paused) {
    this.pauseOverlay.hidden = !paused;
  }

  formatScore(value) {
    return Math.min(value, 999).toString().padStart(3, '0');
  }

  bindHoldButton(button, direction, callback) {
    const release = () => {
      button.classList.remove('is-pressed');
      callback(direction, false);
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      button.classList.add('is-pressed');
      callback(direction, true);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }
}
