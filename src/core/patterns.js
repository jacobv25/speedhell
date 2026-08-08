// Bullet pattern emitters. Three deliberate types per rubric S3:
//   aimed   — trajectory from player position (manipulable, cyan needles)
//   static  — fixed geometry (positional, pink rounds)
//   random  — weighted spread within limits (reactive, pink rounds)
// Every helper spawns GROUPS, never lone bullets in open space (S2).

const TAU = Math.PI * 2;

export const B_ROUND = 0;  // pink round: static / randomized spread
export const B_NEEDLE = 1; // cyan needle: fast aimed

function fire(g, x, y, angle, speed, kind, accel = 0, curve = 0) {
  const b = g.eBullets.spawn();
  if (!b) return;
  b.x = x; b.y = y;
  b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed;
  b.kind = kind; b.r = kind === B_NEEDLE ? 2.6 : 3.2;
  b.accel = accel; b.curve = curve; b.age = 0;
}

export function aimAt(g, x, y) {
  return Math.atan2(g.player.y - y, g.player.x - x);
}

// Aimed n-way fan of needles (fast, manipulable by moving).
export function aimedFan(g, x, y, n, spread, speed) {
  const base = aimAt(g, x, y);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    fire(g, x, y, base + t * spread, speed, B_NEEDLE);
  }
}

// Static ring of rounds (positional macro-dodge test).
export function ring(g, x, y, n, speed, phase = 0) {
  for (let i = 0; i < n; i++) fire(g, x, y, phase + (i / n) * TAU, speed, B_ROUND);
}

// Static arc facing down (wall with lanes; gapIndex carves a lane).
export function arcWall(g, x, y, n, spread, speed, gapIndex = -1, gapWidth = 0) {
  const base = Math.PI / 2; // downward
  for (let i = 0; i < n; i++) {
    if (gapIndex >= 0 && Math.abs(i - gapIndex) <= gapWidth) continue;
    const t = i / (n - 1) - 0.5;
    fire(g, x, y, base + t * spread, speed, B_ROUND);
  }
}

// Randomized-within-limits spray (reactive dodging, bounded weights).
export function spray(g, x, y, n, spread, sMin, sMax) {
  const base = aimAt(g, x, y);
  for (let i = 0; i < n; i++) {
    const a = base + g.rng.range(-spread / 2, spread / 2);
    fire(g, x, y, a, g.rng.range(sMin, sMax), B_ROUND);
  }
}

// Bendy stream: same angle, increasing speeds → stretches into a line (S3 flair).
export function bendyStream(g, x, y, angle, n, sMin, sMax) {
  for (let i = 0; i < n; i++) fire(g, x, y, angle, sMin + (sMax - sMin) * (i / (n - 1)), B_ROUND);
}

// Rotating double-emitter curve (boss): two spirals curving opposite ways.
export function twinSpiral(g, x, y, step, count, speed, dir, curve) {
  for (let k = 0; k < count; k++) {
    fire(g, x, y, step + k * 0.42 * dir, speed, B_ROUND, 0, curve * dir);
    fire(g, x, y, -step - k * 0.42 * dir, speed, B_ROUND, 0, -curve * dir);
  }
}
