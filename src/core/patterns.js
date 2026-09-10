// Bullet pattern emitters. Three deliberate types per rubric S3:
//   aimed   — trajectory from player position (manipulable)
//   static  — fixed geometry (positional, pink rounds)
//   random  — weighted spread within limits (reactive, pink rounds)
// Caste (r59, rubric S2): a cyan NEEDLE is aimed fire from the special tier
// (game.js NEEDLE_TIER); every other bullet — including a popcorn or turret's
// aimed prong — is a pink ROUND. fire() enforces it.
// Every helper spawns GROUPS, never lone bullets in open space (S2).

const TAU = Math.PI * 2;

export const B_ROUND = 0;  // pink round: static / randomized spread
export const B_NEEDLE = 1; // cyan needle: fast aimed, special tier only (r59)

function fire(g, x, y, angle, speed, kind, accel = 0, curve = 0, hatch = 0) {
  const b = g.eBullets.spawn();
  if (!b) return;
  b.x = x; b.y = y;
  // r82 (stage 3's boss dialect): `hatch` = frames until this bullet HATCHES
  // into a small ring and dies (game.js's bullet loop ticks it). 0 on every
  // other call site, and the pool's field is reset here every spawn, so a
  // recycled slot can never carry a stale fuse — stages 1 and 2 are untouched.
  b.hatch = hatch;
  b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed;
  // r59 (Jacob, 2026-09-04): needles are the SPECIAL enemies' aimed fire. If a
  // needle tier is set (g.needleTier[type] truthy), any needle from an emitter
  // outside the tier is downgraded to a pink round — same angle, same speed,
  // same rng consumption; only the caste (and its r) changes.
  if (kind === B_NEEDLE && g.needleTier && g.emitter && !g.needleTier[g.emitter.type]) kind = B_ROUND;
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
// Optional vLead (r6.5, BOSS-ONLY callers): leads the aim point — see leadAngle.
export function spray(g, x, y, n, spread, sMin, sMax, vLead = null) {
  const base = vLead === null ? aimAt(g, x, y) : leadAngle(g, x, y, (sMin + sMax) / 2, vLead);
  for (let i = 0; i < n; i++) {
    const a = base + g.rng.range(-spread / 2, spread / 2);
    fire(g, x, y, a, g.rng.range(sMin, sMax), B_ROUND);
  }
}

// r6.5 BOSS-ONLY LED AIM (the r6.4 finding: no-lead aimed fire self-misses a
// slow continuous mover by ~80px of lead error — the boss was BLIND to slow
// targets, and the anti-camp governor was carrying a burden the guns should).
// Leads the target's NET velocity (the caller passes it — typically the boss's
// own player-position ema read, (player.x − pxEma) · emaRate, which measures a
// drifter's true 1.2px/f exactly while a hovering fighter reads ≈ 0) by the
// shot's flight time. The lead velocity is CLAMPED to walking pace (±1.8px/f):
// slow crawls get an exact clip, fast reactive dodging is never hard-sniped.
// Stage-section enemies NEVER call these — their no-lead fans are the stage's
// dodge grammar, and led fire stays part of the boss-only dialect (S3b-6).
export function leadAngle(g, x, y, speed, vLead) {
  const v = Math.max(-1.8, Math.min(1.8, vLead));
  const dist = Math.hypot(g.player.x - x, g.player.y - y);
  return Math.atan2(g.player.y - y, g.player.x + v * (dist / speed) - x);
}

// Led needle fan, half-and-half: even needles aim at where the target IS, odd
// needles at where its net drift is taking it — a pure-lead fan is dodged by
// STOPPING (the inverse exploit), so every fan denies both answers at once.
// (KNOWN SEAM, r6.6 arbitration: a sprint/stop stutterer whose net velocity
// the ema averages can thread both aims; the referee ships that as a
// documented residual — its mortal twin dies to this same fire.)
export function ledFan(g, x, y, n, spread, speed, vLead) {
  const led = leadAngle(g, x, y, speed, vLead);
  const base = aimAt(g, x, y);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    fire(g, x, y, ((i & 1) ? led : base) + t * spread, speed, B_NEEDLE);
  }
}

// Bendy stream: same angle, increasing speeds → stretches into a line (S3 flair).
export function bendyStream(g, x, y, angle, n, sMin, sMax) {
  for (let i = 0; i < n; i++) fire(g, x, y, angle, sMin + (sMax - sMin) * (i / (n - 1)), B_ROUND);
}

// Boss-only dialect (r6 S3b, homage L6): accelerating needle LANCE — a tight
// column of aimed needles launched slow-to-fast (every one accelerates), so the
// group visibly stretches then whip-cracks across the field. No stage section
// ever fires accelerating needles: "stage or boss?" is readable from the
// bullets alone (Psikyo's needle/dot caste, sharpened). Aimed ⇒ manipulable;
// cyan needle family per S2 (aimed = cyan, no new color family).
// Optional vLead (r6.5): a led lance aims at the target's drift-projected spot.
// Acceleration shortens real flight time, so the lead projection uses an
// effective speed ~1.35x the launch speed (empirical mid-flight average).
export function lanceVolley(g, x, y, n, speed, accel = 0.015, vLead = null) {
  const base = vLead === null ? aimAt(g, x, y) : leadAngle(g, x, y, speed * 1.35, vLead);
  for (let i = 0; i < n; i++) fire(g, x, y, base, speed * (1 - i * 0.11), B_NEEDLE, accel, 0);
}

// Rotating double-emitter curve (boss): two spirals curving opposite ways.
export function twinSpiral(g, x, y, step, count, speed, dir, curve) {
  for (let k = 0; k < count; k++) {
    fire(g, x, y, step + k * 0.42 * dir, speed, B_ROUND, 0, curve * dir);
    fire(g, x, y, -step - k * 0.42 * dir, speed, B_ROUND, 0, -curve * dir);
  }
}

// r80 (stage 2's boss-only dialect, WS03 #6 "emitter movement distorts the
// pattern"): a STATIC fan of rounds about an arbitrary base angle. The Bell's
// clapper swings on a pendulum and fires this along the chain's radial, so a
// fixed fan stretches into curved sheets on screen — pendulum arcs. Pink
// rounds (static = positional, S3); no rng. Nothing in a stage section calls
// it (S3b-6: the dialect is the boss's alone).
export function staticFan(g, x, y, n, spread, speed, base) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    fire(g, x, y, base + t * spread, speed, B_ROUND);
  }
}

// r82 (STAGE 3's boss-only dialect, WS03 #5 "projectiles that spawn emitters"):
// an EGG fan — a static fan of pink rounds, each carrying a `hatch` fuse. The
// egg drifts as an ordinary round, PULSES over its last 30 f (renderer: the
// telegraph, S2 warning grammar) and then bursts into a fixed 6-round ring
// (game.js, deterministic — no rng). Same pink caste, same radius, same display
// contract (r20): the dialect is the bullet's LIFE CYCLE, not a new colour or
// shape. No stage section calls it (S3b-6: the dialect is the boss's alone).
export function eggFan(g, x, y, n, spread, speed, base, fuse) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    fire(g, x, y, base + t * spread, speed, B_ROUND, 0, 0, fuse);
  }
}

// r84 (STAGE 4's boss-only dialect, WS03 #7 "the box trap": *six emitters
// firing six bullets around the arena centre pen the player, then other patterns
// assault the box while it moves* — Touhou's favourite). THE PEN: six sources —
// the rectangle's four corners plus its two side midpoints — each lay a wall
// segment of pink rounds toward the next source, at a fixed `step` px spacing,
// so the cage reads as a dashed box the moment it exists (S2: bullets arrive in
// groups, never singles). ONE segment is omitted: `door` (0 top · 1 upper-right ·
// 2 lower-right · 3 bottom · 4 lower-left · 5 upper-left) is the way out, so the
// pen is a LANE decision with pros and cons (take the door and be led where the
// door points, or micro-dodge a wall and pay in timing) and never a checkmate
// on its own [S3 MUST ≥ 2 viable lanes; S7 no unavoidable deaths].
// AND THEN THE PEN MOVES: every round in it carries the same (vx, vy) and the
// same `accel`, so the whole cage translates as one rigid body and then whips
// off the field — the walls sweep the arena instead of parking in it (S4 outro:
// no bullet source or wall is dragged through the fight). The caller owns the
// clamp: pass a centre that keeps the cage on the field.
// Deterministic — no rng, so a stage that never fires it is stream-untouched.
// Pink rounds only: no new colour family, no new bullet shape, r20 display
// contract unchanged (the dialect is the GEOMETRY, as stage 2's was motion and
// stage 3's was the bullet's life cycle).
export function boxTrap(g, cx, cy, hw, hh, step, vx, vy, door = 0, accel = 0) {
  const P = [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy], [cx + hw, cy + hh], [cx - hw, cy + hh], [cx - hw, cy]];
  const ang = Math.atan2(vy, vx), spd = Math.hypot(vx, vy);
  for (let s = 0; s < 6; s++) {
    if (s === door) continue;
    const a = P[s], b = P[(s + 1) % 6];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      const f = i / n; // the far endpoint belongs to the NEXT segment: no doubled round at a corner
      fire(g, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, ang, spd, B_ROUND, accel, 0);
    }
  }
}
