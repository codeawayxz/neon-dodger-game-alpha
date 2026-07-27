export class InputController {
  constructor() {
    this.clear();
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  get direction() {
    const left = this.keyboardLeft || this.pointerLeft;
    const right = this.keyboardRight || this.pointerRight;
    if (left === right) return 0;
    return left ? -1 : 1;
  }

  setPointer(direction, active) {
    if (direction === -1) this.pointerLeft = active;
    if (direction === 1) this.pointerRight = active;
  }

  clear() {
    this.keyboardLeft = false;
    this.keyboardRight = false;
    this.pointerLeft = false;
    this.pointerRight = false;
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  onKeyDown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') this.keyboardLeft = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') this.keyboardRight = true;
    if (event.code.startsWith('Arrow')) event.preventDefault();
  }

  onKeyUp(event) {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') this.keyboardLeft = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') this.keyboardRight = false;
  }
}
