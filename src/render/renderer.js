// Canvas2D renderer. Visibility rules from rubric S2: washed-out low-contrast
// background; bullets pair dark rims with bright cores; consistent language
// (pink rounds = static/random, cyan needles = aimed); bullets on top.
import { W, H, PLAYER, FX } from '../core/game.js';

// r8-fx explosion palette, indexed [family][heat stop 0=hot … 3=cool] by the
// particle's remaining life. Lookup tables: no string building in the hot loop (S8).
const FX_RAMP = [
  ['#ffffff', '#e8dcff', '#b49aff', '#6a4fc0'], // 0 WHITE/violet — player
  ['#ffffff', '#ffe27a', '#ff9a3c', '#c8401e'], // 1 ORANGE — default kill
  ['#ffffff', '#c8f4ff', '#7fd8ff', '#2f7fb0'], // 2 CYAN — chevron kill / bullet cancel
  ['#ffd27a', '#ff8a4a', '#e0503a', '#7a2a22'], // 3 BURN — boss handoff embers
];
const FX_SMOKE = ['#3a3648', '#2c2a38', '#2a3038', '#3a2424'];
const FX_DEBRIS = ['#c8bfe8', '#d07a3a', '#5fb4d8', '#b0503a'];

const ENEMY_TINT = ['#8a8fa8', '#9aa0b8', '#7d8298', '#a8adc4', '#b8bdd4', '#c8cde0', '#c0c6da'];
let displayScore = 0; // ticks up toward real score [BOGHOG_CRAFT]

// Section place-identity (r5 S5-SHOULD-1): each stage section gets its own
// subtle background accent — hue-shifted slabs/stars near the base wash values,
// plus one large landmark slab that scrolls through as the section plays.
// Purely renderer-side (keyed off g.stageT); values stay washed-out so the
// background never competes with the bullet layer (S2-MUST-1).
// Entry stageT per section: intro / s1..s8.
const SEC_T = [0, 120, 720, 1700, 2400, 2460, 2900, 3700, 3900];
const SEC_SLAB = ['#12151f', '#101726', '#171820', '#181422', '#1d1418', '#1c1812', '#101c17', '#101a26', '#1d1220'];
const SEC_STAR = ['#161a28', '#141d30', '#1e2026', '#1f1a2e', '#261b20', '#25211a', '#16241e', '#152230', '#261a2a'];
const SEC_LAND = ['#161a26', '#141c2e', '#1e2028', '#211c30', '#291d22', '#28241c', '#182922', '#1a2632', '#2a1e2e'];
const SEC_LANDGEO = [ // landmark [x, w, h] — distinct silhouette per section
  [120, 80, 50], [30, 110, 46], [210, 70, 90], [60, 150, 40], [110, 100, 100],
  [200, 90, 56], [20, 130, 60], [90, 140, 36], [70, 180, 70],
];
function sectionOf(t) {
  let s = 0;
  for (let i = SEC_T.length - 1; i >= 0; i--) if (t >= SEC_T[i]) { s = i; break; }
  return s;
}

// r6 S3b-SHOULD: arena restain per boss phase — deep blue → red-shifted →
// white-hot dawn (homage BRDA#6), all values inside the washed band the r5
// section tints established (S2-MUST-1: the background never competes with
// the bullet layer).
const BOSS_BG = ['#0a0e1a', '#130a0e', '#141317'];
const BOSS_SLAB = ['#111b30', '#261416', '#28262c'];
const BOSS_STAR = ['#15233c', '#2c181a', '#302e33'];
const BOSS_LAND = ['#16243e', '#2e1a1e', '#333038'];

export function resetHud() { displayScore = 0; }

export function draw(g, ctx, bgScroll) {
  ctx.save();
  if (g.shake > 0) { // r8-fx: squared decay — snaps hard, settles fast (no constant buzz)
    const k = g.shakeMax > 0 ? g.shake / g.shakeMax : 1, amp = (g.shakeMax || g.shake) * k * k;
    // r28: fxRng, NEVER g.rng — draw() only runs in the browser, so pulling the
    // gameplay stream here desynced live runs from headless replay (the Booth
    // recorder divergence). Renderer randomness must never touch g.rng.
    ctx.translate((g.fxRng.next() - 0.5) * amp, (g.fxRng.next() - 0.5) * amp);
  }

  // background: deep indigo, faint slow stars — low value contrast (S2),
  // hue-accented per section so each place reads distinct (r5 S5-SHOULD-1).
  // During the boss fight the arena RESTAINS per phase (r6 S3b-SHOULD).
  const sec = sectionOf(g.stageT);
  let bossPhase = -1;
  for (let i = 0; i < g.enemies.count; i++) {
    const e = g.enemies.items[i];
    if (e.type === 5) { bossPhase = e.phase; break; }
  }
  const bgC = bossPhase >= 0 ? BOSS_BG[bossPhase] : '#0a0c14';
  const slabC = bossPhase >= 0 ? BOSS_SLAB[bossPhase] : SEC_SLAB[sec];
  const starC = bossPhase >= 0 ? BOSS_STAR[bossPhase] : SEC_STAR[sec];
  const landC = bossPhase >= 0 ? BOSS_LAND[bossPhase] : SEC_LAND[sec];
  ctx.fillStyle = bgC;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  // landmark slab: enters at the section boundary, scrolls with section progress
  {
    const [lx, lw, lh] = SEC_LANDGEO[sec];
    const ly = (g.stageT - SEC_T[sec]) * 0.55 - lh - 20;
    if (ly < H + 20) {
      ctx.fillStyle = landC;
      ctx.fillRect(lx, ly, lw, lh);
      ctx.fillStyle = slabC;
      ctx.fillRect(lx + 10, ly + 8, lw - 20, lh - 16); // inset gives it structure
    }
  }
  ctx.fillStyle = starC;
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137.5) % W;
    const sy = ((i * 89.3) + bgScroll * (0.4 + (i % 3) * 0.3)) % (H + 40) - 20;
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, 8 + (i % 3) * 6);
  }
  ctx.fillStyle = slabC;
  for (let i = 0; i < 6; i++) {
    const sy = ((i * 173) + bgScroll * 0.25) % (H + 120) - 60;
    ctx.fillRect(30 + (i * 97) % (W - 120), sy, 60, 34); // dim "terrain" slabs
  }

  // items — gold, unmistakable vs bullets (S2). Blue Revolver-sized: radius
  // scales with value (fat chains pay in visibly fatter gold) and a slow
  // glint pulse keeps the big discs reading as treasure, not UI. Safe to grow:
  // items sit below enemies/fx/bullets, so size can never mask a threat.
  for (let i = 0; i < g.items.count; i++) {
    const it = g.items.items[i];
    const r = Math.min(12, 7 + it.val / 150) + Math.sin(g.frame * 0.11 + it.tw) * 0.6;
    ctx.fillStyle = '#0e0c04';
    ctx.beginPath(); ctx.arc(it.x, it.y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(it.x, it.y, r * 0.78, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff6d0';
    const hl = Math.max(2, r * 0.3);
    ctx.fillRect(it.x - r * 0.4, it.y - r * 0.4, hl, hl);
  }

  // enemies — desaturated silhouettes, distinct per role (S4)
  for (let i = 0; i < g.enemies.count; i++) drawEnemy(ctx, g, g.enemies.items[i]);

  // player
  drawPlayer(ctx, g);

  // particles (below bullets: explosions must never mask threats, S2).
  // r8-fx: two passes — smoke + debris in source-over, then the hot kinds
  // (fire / core / ring / spark) additive so overlapping fireballs bloom white.
  drawFx(ctx, g);

  // player shots — tall white-core bolts with pale-violet edges (S1); moved out
  // of the cyan/teal family entirely — that family belongs to enemy needles
  // (r5 S2-MUST-3), and violet reads apart from gold items and pink rounds.
  for (let i = 0; i < g.pBullets.count; i++) {
    const b = g.pBullets.items[i];
    ctx.fillStyle = '#c3a8ff';
    ctx.fillRect(b.x - 2, b.y - 10, 4, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 1, b.y - 9, 2, 18);
  }

  // ⚠ ART-CHANGE NOTE (r35): src/howto.js drawBulletCard mirrors both bullet
  // castes pixel-for-pixel — redesign bullets → update the card, same commit.
  // enemy bullets — TOP layer; needles above rounds (faster ⇒ higher, S2)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < g.eBullets.count; i++) {
      const b = g.eBullets.items[i];
      if (b.kind !== pass) continue;
      if (pass === 0) { // pink round: dark rim, bright ring (subtle pulse, r5 S2-SHOULD), white core
        ctx.fillStyle = '#20060f';
        ctx.beginPath(); ctx.arc(b.x, b.y, 5.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#ff4fa3';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4.2 + Math.sin(g.frame * 0.24) * 0.35, 0, 7); ctx.fill();
        // r20 (Booth session 2): the WHITE part of a bullet is the part that
        // counts — Touhou's "non-white border does not count", now literal.
        // White core = the true 3px hit circle; ring and rim are graze area.
        ctx.fillStyle = '#ffe6f2';
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill();
      } else { // cyan needle: elongated along velocity (S2 telegraphing)
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.fillStyle = '#031418'; ctx.fillRect(-7, -3, 14, 6);
        ctx.fillStyle = '#37d6e0'; ctx.fillRect(-6, -2, 12, 4);
        ctx.fillStyle = '#e8feff'; ctx.fillRect(-3, -2, 7, 4); // white = the 3px hit circle at the centre (+1px nose taper)
        ctx.restore();
      }
    }
  }

  // popups
  ctx.textAlign = 'center';
  for (let i = 0; i < g.popups.count; i++) {
    const q = g.popups.items[i];
    ctx.globalAlpha = Math.min(1, q.life / 18);
    ctx.font = q.big ? 'bold 15px monospace' : '11px monospace';
    ctx.fillStyle = q.big ? '#ffd24a' : '#cdd3e8';
    ctx.fillText(q.text, q.x, q.y);
  }
  ctx.globalAlpha = 1;

  // r6 S3b arrival ritual: WARNING telegraph — big, field-centered, flashing;
  // deliberately unlike popups (gold 15px) and banners (backing box + sub-lines).
  // Animation keys off g.frame only (renderer determinism: no g.rng in draw).
  if (g.warn > 0) {
    const on = (g.frame >> 3) & 1;
    const fade = Math.min(1, g.warn / 12);
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = '#14040a';
    ctx.fillRect(0, H / 2 - 32, W, 64);
    ctx.globalAlpha = fade;
    ctx.fillStyle = on ? '#ff4fa3' : '#ff8ec4';
    for (let x = 0; x < W; x += 26) { // hazard ticks along the band edges
      ctx.fillRect(x + (on ? 0 : 13), H / 2 - 32, 13, 3);
      ctx.fillRect(x + (on ? 13 : 0), H / 2 + 29, 13, 3);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = on ? '#ff4fa3' : '#ffe6f2';
    ctx.fillText('W A R N I N G', W / 2, H / 2 + 9);
    ctx.globalAlpha = 1;
  }

  // bomb / cancel flashes — combined effective wash hard-capped at 0.55 so the
  // field is never blotted out (r5 nit-a); the gold cancel wash is also eased
  // (peak 0.33 → 0.26 — it read as a full-field brown-out on the dark bg)
  {
    const fa = g.flash > 0 ? g.flash / 24 : 0;
    const ca = g.cancelFlash > 0 ? g.cancelFlash / 76 : 0;
    const comb = 1 - (1 - fa) * (1 - ca);
    const cap = comb > 0.55 ? 0.55 / comb : 1;
    if (fa > 0) { ctx.globalAlpha = fa * cap; ctx.fillStyle = '#dff6ff'; ctx.fillRect(0, 0, W, H); }
    if (ca > 0) { ctx.globalAlpha = ca * cap; ctx.fillStyle = '#ffd24a'; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  drawHud(ctx, g);
}

function drawFx(ctx, g) {
  const n = g.particles.count, items = g.particles.items;
  for (let i = 0; i < n; i++) { // pass 1: smoke, debris
    const q = items[i];
    if (q.delay > 0 || (q.kind !== FX.SMOKE && q.kind !== FX.DEBRIS)) continue;
    const a = q.life / q.max;
    if (q.kind === FX.SMOKE) {
      ctx.globalAlpha = a * 0.7;
      ctx.fillStyle = FX_SMOKE[q.hue];
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1 + (1 - a) * 1.2), 0, 7); ctx.fill();
    } else {
      ctx.globalAlpha = Math.min(1, a * 3);
      ctx.fillStyle = FX_DEBRIS[q.hue];
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size);
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { // pass 2: hot kinds, additive
    const q = items[i];
    if (q.delay > 0 || q.kind === FX.SMOKE || q.kind === FX.DEBRIS) continue;
    const a = q.life / q.max, ramp = FX_RAMP[q.hue];
    const stop = ((1 - a) * 3.99) | 0;
    switch (q.kind) {
      case FX.SPARK: {
        ctx.globalAlpha = a;
        ctx.fillStyle = ramp[stop];
        const s = 1 + a * 2;
        ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
        break;
      }
      case FX.FIRE: { // swells fast, then shrinks as it cools
        const r = q.size * (a < 0.85 ? a / 0.85 : 0.4 + (1 - a) / 0.15 * 0.6);
        ctx.globalAlpha = Math.min(1, a * 1.5) * 0.85;
        ctx.fillStyle = ramp[1 + (((1 - a) * 2.99) | 0)]; // fire never starts white — the CORE owns the flash; overlaps bloom via 'lighter'
        ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
        break;
      }
      case FX.CORE: { // full size on frame 0, collapses
        ctx.globalAlpha = a;
        ctx.fillStyle = ramp[0];
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * a, 0, 7); ctx.fill();
        break;
      }
      case FX.RING: { // shockwave: expands out to `size`, thins and fades
        ctx.globalAlpha = a;
        ctx.strokeStyle = ramp[1]; ctx.lineWidth = 0.5 + a * 2;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1 - a) + 1, 0, 7); ctx.stroke();
        break;
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// r20 enemy identity pass (Booth session 1: "everything just looks like grey,
// boring, geometric shapes"). Identity comes from SHAPE, SIZE, MOTION and
// LAYER — never saturated colour, which stays reserved for bullets, items and
// the player (Pillar 6; boghog WS02 "values are the most important thing…
// colours still matter"). Two families: AIR — aircraft silhouettes, nose along
// their heading, banking with lateral velocity, prop flicker; GROUND — squat,
// wide, a base plate with a drop shadow and a barrel that aims at the ship
// (Komazawa: "the way tanks fire… every enemy had a backstory"). Size ladder
// per DDP's "big things are slow; fast things are small". Every behaviour
// variant is its own craft: fighter, diver, crosser dart, riser climber.
// Hit-flash and armor flicker unchanged. Renderer-only: core hitboxes
// (ENEMY_DEFS r) untouched — sprites stay within ~1.2r.
const AIR = { base: '#8d97b4', shade: '#5c6584', hi: '#c9d1e8', glass: '#eef1f8' };
const GROUND = { base: '#9a9678', shade: '#5f5c3e', hi: '#c6c2a2', plate: '#34321f' };
const HEAVY = { base: '#7a8097', shade: '#474c60', hi: '#aab1c8', stripe: '#8a5a52' };
// sprites are drawn nose-DOWN (+y, toward the player); rotate to the velocity
// heading when moving so crossers fly sideways and risers climb nose-up
function heading(e) {
  // zako motion = vx + a sine wobble (core: sin(age*0.06)*side*0.6) that is
  // bigger than vx itself — Booth flag: "the nose doesn't point where they fly"
  const vx = e.type === 0 ? e.vx + Math.sin(e.age * 0.06) * e.side * 0.6 : e.vx;
  return (vx * vx + e.vy * e.vy > 0.09) ? Math.atan2(e.vy, vx) - Math.PI / 2 : 0;
}
const TURRET_PLATE = [[-9, -13], [9, -13], [13, -9], [13, 9], [9, 13], [-9, 13], [-13, 9], [-13, -9]];

export function drawEnemy(ctx, g, e) {
  const flick = e.vulnAt < 0 && (g.frame & 4); // intro armor shimmer
  const hit = e.flash > 0; // r8-fx S4-MUST: hit-flash — every fill goes white for 2 frames
  const F = (c) => { ctx.fillStyle = hit ? '#ffffff' : c; };
  const S = (c) => F(flick ? '#3a3f55' : c); // surface fill: armor shimmer applies
  const prop = (g.frame & 2) ? 1 : 0;
  ctx.save(); ctx.translate(e.x, e.y);
  switch (e.type) {
    case 0: { // popcorn family — each behaviour variant is its own craft
      ctx.rotate(heading(e));
      if (e.phase === 2) {          // CROSSER: dart interceptor — long, swept, flies sideways across the top band
        S(AIR.shade); poly(ctx, [[0, 12], [8, -5], [0, -10], [-8, -5]]);
        S(AIR.base); poly(ctx, [[0, 13], [2.5, -3], [0, -9], [-2.5, -3]]);
        S(AIR.hi); poly(ctx, [[0, 12], [8, -5], [7, -5], [0, 10]]);
        S(AIR.glass); ctx.fillRect(-1, 1, 2, 3);
      } else if (e.phase === 3) {   // RISER: stubby climber with exhaust — nose flips as it turns to fall
        S(GROUND.shade); poly(ctx, [[0, 9], [8, 2], [8, -3], [-8, -3], [-8, 2]]);
        S(GROUND.base); poly(ctx, [[0, 11], [4, 0], [4, -8], [-4, -8], [-4, 0]]);
        S(GROUND.hi); ctx.fillRect(-4, -8, 8, 1);
        S(AIR.glass); ctx.fillRect(-1, 2, 2, 3);
        if (e.vy < -0.5 && prop) { S('#d9c08a'); poly(ctx, [[-3, -8], [3, -8], [0, -15]]); }
      } else {                      // FIGHTER — and its diver twin (phase 1): darker, nose on the target
        const c = e.phase === 1 ? HEAVY : AIR;
        S(c.shade); ctx.fillRect(-9, -2, 18, 4);       // main wing
        S(c.shade); ctx.fillRect(-4, -8, 8, 2);        // tailplane
        S(c.base); poly(ctx, [[0, 10], [2.5, 2], [2.5, -8], [0, -10], [-2.5, -8], [-2.5, 2]]); // fuselage
        S(c.hi); ctx.fillRect(-9, -2, 18, 1);          // leading-edge light
        S(AIR.glass); ctx.fillRect(-1, 0, 2, 3);       // canopy
        S(c.hi); if (prop) ctx.fillRect(-4, 9, 8, 1); else ctx.fillRect(-1, 7, 2, 4); // prop disc flicker
      }
      break;
    }
    case 1: { // MID — twin-boom heavy fighter: wider, taller, two engines; bobs while parked
      ctx.rotate(heading(e)); ctx.translate(0, Math.sin(e.age * 0.09) * 0.8);
      S(AIR.shade); ctx.fillRect(-15, -4, 30, 5);                               // wing
      S(AIR.shade); ctx.fillRect(-10, -13, 3, 10); ctx.fillRect(7, -13, 3, 10); // tail booms
      S(AIR.base); ctx.fillRect(-13, -13, 26, 2);                               // tailplane bar
      S(AIR.base); poly(ctx, [[0, 13], [3.5, 3], [3.5, -9], [0, -11], [-3.5, -9], [-3.5, 3]]); // fuselage
      S(AIR.base); ctx.fillRect(-11, -6, 5, 9); ctx.fillRect(6, -6, 5, 9);      // engine nacelles
      S(AIR.hi); ctx.fillRect(-15, -4, 30, 1);
      S(AIR.glass); ctx.fillRect(-1.5, 2, 3, 4);
      S(AIR.hi); if (prop) { ctx.fillRect(-12, 3, 7, 1); ctx.fillRect(5, 3, 7, 1); }
      break;
    }
    case 2: { // TURRET — ground family: plate + drop shadow, khaki dome, barrel aims at the ship; rust when angry
      const angry = e.vulnAt >= 0 && g.frame - e.vulnAt > 240;
      const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      if (!hit) { ctx.save(); ctx.translate(3, 4); ctx.globalAlpha = 0.45; ctx.fillStyle = '#000'; poly(ctx, TURRET_PLATE); ctx.restore(); }
      S(GROUND.plate); poly(ctx, TURRET_PLATE);
      S(GROUND.shade); ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
      S(angry ? HEAVY.stripe : GROUND.base); ctx.beginPath(); ctx.arc(-1, -1, 7, 0, 7); ctx.fill();
      ctx.save(); ctx.rotate(a); S(GROUND.shade); ctx.fillRect(0, -2.5, 15, 5); S(GROUND.hi); ctx.fillRect(4, -2.5, 11, 1.5); ctx.restore();
      S(GROUND.hi); ctx.fillRect(-4, -5, 3, 2);
      break;
    }
    case 3: { // ELITE — heavy bomber: broad wing, four engines, rust wingtip stripes; the space controller
      ctx.rotate(heading(e));
      S(HEAVY.shade); poly(ctx, [[-22, -4], [22, -4], [18, 4], [-18, 4]]);                 // wing
      S(HEAVY.shade); ctx.fillRect(-9, -18, 18, 3);                                        // tailplane
      S(HEAVY.base); poly(ctx, [[0, 20], [7, 8], [7, -14], [3, -19], [-3, -19], [-7, -14], [-7, 8]]); // fuselage
      S(HEAVY.base); for (const x of [-17, -10, 5, 12]) ctx.fillRect(x, -6, 5, 11);         // engines
      S(HEAVY.stripe); ctx.fillRect(-22, -1, 6, 2); ctx.fillRect(16, -1, 6, 2);            // wingtip stripes
      S(HEAVY.hi); ctx.fillRect(-22, -4, 44, 1);
      S(AIR.glass); ctx.fillRect(-2, 8, 4, 5);
      S(HEAVY.hi); if (prop) for (const x of [-17, -10, 5, 12]) ctx.fillRect(x - 1, 5, 7, 1);
      break;
    }
    case 4: { // MIDBOSS — flying-wing gunship; the phase-B flip (r14) exposes a pale core
      S(HEAVY.shade); poly(ctx, [[0, -22], [30, -4], [30, 6], [12, 18], [-12, 18], [-30, 6], [-30, -4]]);
      S(HEAVY.base); poly(ctx, [[0, -20], [28, -4], [28, 3], [11, 15], [-11, 15], [-28, 3], [-28, -4]]);
      S(HEAVY.base); poly(ctx, [[0, 24], [8, 10], [8, -16], [0, -20], [-8, -16], [-8, 10]]);   // central hull
      S(HEAVY.stripe); ctx.fillRect(-28, -2, 8, 2); ctx.fillRect(20, -2, 8, 2);
      S(e.phase === 1 ? '#f0e6c8' : HEAVY.shade); poly(ctx, [[0, 12], [5, 2], [0, -8], [-5, 2]]);
      S(HEAVY.hi); poly(ctx, [[0, -20], [28, -4], [27, -3], [0, -19], [-27, -3], [-28, -4]]);
      S(HEAVY.hi); if (prop) { ctx.fillRect(-22, 8, 8, 1); ctx.fillRect(14, 8, 8, 1); }
      break;
    }
    case 5: {
      // r6 S3b: each phase is a FORM change — three distinct silhouettes.
      // During the 60f handoff armor the incoming form BURNS IN: red-hot
      // flicker (g.frame-keyed — no rng in draw) over the whole body.
      const burning = e.vulnAt < 0 && e.phase > 0;
      const body = burning ? ((g.frame & 2) ? '#e0604a' : '#7a2a22') : (flick ? '#3a3f55' : ENEMY_TINT[5]);
      const core = burning ? '#ffb347' : (['#ff4fa3', '#37d6e0', '#ffd24a'][e.phase] || '#fff');
      F(body);
      if (e.phase === 0) {        // P1: winged carrier — broad hull + swept wing roots
        poly(ctx, [[0, -30], [28, -12], [22, 26], [-22, 26], [-28, -12]]);
        poly(ctx, [[-24, -8], [-42, 2], [-24, 12]]); // wing roots reach for the pods
        poly(ctx, [[24, -8], [42, 2], [24, 12]]);
        F(core);
        poly(ctx, [[0, -16], [14, 10], [-14, 10]]);
      } else if (e.phase === 1) { // P2: armor shed — wide flat hull, new geometry
        poly(ctx, [[-36, -4], [-16, -18], [16, -18], [36, -4], [24, 18], [-24, 18]]);
        F(core);
        ctx.fillRect(-20, -4, 40, 8); // exposed cyan core band
      } else {                    // P3: stripped bare core — small, angular, white-hot
        poly(ctx, [[0, -24], [17, 0], [0, 20], [-17, 0]]);
        F(burning ? '#ffb347' : '#8a8fa8');
        ctx.fillRect(-26, -3, 9, 6); ctx.fillRect(17, -3, 9, 6); // bare struts
        F(core);
        poly(ctx, [[0, -13], [9, 0], [0, 11], [-9, 0]]);
        F('#fff6f0');
        ctx.fillRect(-2, -3, 4, 6); // white-hot center
      }
      break;
    }
    case 6: {
      // r6 boss sub-part: silhouette continues the boss's form — destroying it
      // visibly amputates that piece (S3b part MUST). Shapes keyed to e.phase.
      if (e.phase === 0) {        // wing pod: outward-swept blade
        poly(ctx, [[0, -9], [e.side * 13, -2], [e.side * 9, 6], [0, 8]]);
        F('#ff4fa3');
        ctx.fillRect(e.side * 3 - 2, -2, 4, 4);
      } else if (e.phase === 1) { // armor node: slab with exposed vent
        ctx.fillRect(-8, -8, 16, 16);
        F('#37d6e0');
        ctx.fillRect(-4, -3, 8, 6);
      } else {                    // core relay node: bright diamond
        poly(ctx, [[0, -9], [8, 0], [0, 9], [-8, 0]]);
        F('#ffd24a');
        poly(ctx, [[0, -5], [4, 0], [0, 5], [-4, 0]]);
        F('#fff');
        ctx.fillRect(-1, -1, 2, 2);
      }
      break;
    }
  }
  ctx.restore();
}

function poly(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}

export function drawPlayer(ctx, g) {
  const p = g.player;
  if (p.invuln > 0 && (g.frame & 2)) return; // classic invuln blink
  ctx.save(); ctx.translate(p.x, p.y);
  // option trail (follow-through, S1) — violet family: the whole player identity
  // sits outside the enemy needle cyan (r5 S2-MUST-3, with the shot recolor)
  ctx.fillStyle = '#4a3f78';
  ctx.fillRect(-19 - (p.x - p.prevX) * 2, 6 - (p.y - p.prevY) * 2, 5, 5);
  ctx.fillRect(15 - (p.x - p.prevX) * 2, 6 - (p.y - p.prevY) * 2, 5, 5);
  // ⚠ ART-CHANGE NOTE (r35): the HOW TO card (src/howto.js drawShipCard)
  // mirrors this ship + dot pixel-for-pixel. Redesign the ship → update the
  // card in the same commit, or the onboarding lies about the contract.
  // r20 (Booth flags): the ship is drawn BIG around a tiny core — 28px span on
  // a 3px hit radius (bullets add their own 3px: a bullet kills when its
  // centre is within 6px of the dot). boghog WS01: "small hitboxes, much
  // smaller than their sprites… if it harms the player, make it small";
  // Cave ships run ~8–10:1 sprite:hitbox, the old 18px body was 3:1 and the
  // focus ring read as "the hitbox is half the ship". The core dot is always
  // drawn (visible hit point); focus brightens it, no ring.
  ctx.fillStyle = '#6b5aa8';                                   // wing underside shade
  poly(ctx, [[-14, 12], [-4, 4], [4, 4], [14, 12], [10, 15], [-10, 15]]);
  ctx.fillStyle = '#f0ecff';                                   // hull
  poly(ctx, [[0, -17], [4, -8], [13, 11], [5, 8], [0, 12], [-5, 8], [-13, 11], [-4, -8]]);
  ctx.fillStyle = '#c9bdf5';                                   // wing leading edges
  poly(ctx, [[4, -8], [13, 11], [11, 11], [3, -6]]); poly(ctx, [[-4, -8], [-13, 11], [-11, 11], [-3, -6]]);
  ctx.fillStyle = '#4a3f78'; ctx.fillRect(-2, 12, 4, 4);       // exhaust
  // r20 hitbox marker, per the genre research (hitbox-display-report.md): the
  // marker is NEVER smaller than the truth — Touhou draws a 10px dot over a
  // ~3-7px hitbox; Mushihimesama's circle covers "a few pixels". Every bullet
  // here has the same 3px radius, so we fold it in and draw ONE dot at the
  // full effective radius (hitR + 3 = 6px): a bullet's CENTRE touching your
  // dot is a hit — no smaller mark exists to mis-read, and every surprise is
  // a pleasant one. Dark well behind it for value contrast (WS02); focus
  // whitens the dot and adds the pink rim.
  ctx.fillStyle = '#241f38'; ctx.beginPath(); ctx.arc(0, 0, PLAYER.hitR + 5, 0, 7); ctx.fill();
  ctx.fillStyle = p.focus ? '#ffffff' : '#e8e2ff';
  ctx.beginPath(); ctx.arc(0, 0, PLAYER.hitR + 3, 0, 7); ctx.fill();
  if (p.focus) { ctx.strokeStyle = '#ff4fa3'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, PLAYER.hitR + 3, 0, 7); ctx.stroke(); }
  ctx.restore();
}

function drawHud(ctx, g) {
  displayScore += Math.ceil((g.score - displayScore) * 0.18);
  // low-alpha backing strip: the score/chain block stays legible over popups,
  // items, and background accents (r5 S6-legibility)
  ctx.fillStyle = 'rgba(6,8,14,0.55)';
  ctx.fillRect(0, 0, W, 46);
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#e8ecf8';
  ctx.fillText(String(displayScore).padStart(9, '0'), 10, 20);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#8a8fa8';
  ctx.fillText('CHAIN ' + g.chain, 10, 36);
  if (g.practice) { ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#ffd24a'; ctx.fillText('PRACTICE', 6, H - 6); } // r36: always visible — this score is rehearsal
  // lives / bombs icons
  for (let i = 0; i < g.player.lives; i++) { ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.moveTo(W - 16 - i * 16, 12); ctx.lineTo(W - 10 - i * 16, 24); ctx.lineTo(W - 22 - i * 16, 24); ctx.closePath(); ctx.fill(); }
  for (let i = 0; i < g.player.bombs; i++) { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(W - 14 - i * 16, 36, 5, 0, 7); ctx.fill(); }

  ctx.textAlign = 'center';
  if (g.state === 'title') {
    banner(ctx, 'SPEEDHELL', []); // r42: the DOM title menu carries start/practice/how-to/options
  } // r44: gameover/clear banners retired — the DOM results receipt replaces them
}

// Field-relative type: sized for the 320-wide logical field (post-r4 rescale);
// the canvas stretch supplies the on-screen size.
function banner(ctx, big, lines) {
  ctx.fillStyle = 'rgba(6,8,14,0.72)';
  ctx.fillRect(0, H / 2 - 44, W, 92);
  ctx.font = 'bold 21px monospace'; ctx.fillStyle = '#ff4fa3';
  ctx.fillText(big, W / 2, H / 2 - 16);
  ctx.font = '9px monospace'; ctx.fillStyle = '#cdd3e8';
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, H / 2 + 4 + i * 14));
}
