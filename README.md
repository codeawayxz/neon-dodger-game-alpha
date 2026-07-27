# Neon Voyager

A compact, dependency-free 2D survival arcade game built with Canvas and
browser-native JavaScript.

## Play

- Move left: `A` or `←`
- Move right: `D` or `→`
- On touch devices, hold the on-screen arrow buttons.
- Avoid the falling neon circles. The score increases once per second.
- Press `Space`, `Enter`, or the restart button after a collision.

## Run locally

```bash
npm run dev
```

Production check:

```bash
npm test
npm run build
```

## Structure

- `src/game/simulation`: deterministic scoring, collision, run state, and difficulty
- `src/game/input`: keyboard and touch action mapping
- `src/render`: disposable Canvas rendering and effects
- `src/ui`: DOM-based HUD and game-over overlay

All art is generated procedurally at runtime, so the game has no external
runtime dependencies or image-loading step.
