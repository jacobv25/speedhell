// graphic-pop SKIN (r60) — Persona 5 / Jet Set Radio poster graphics.
// Source sheets: docs/concepts/2026-09-04-graphic-pop/{enemies,boss,backgrounds,ship-logo}.jpg
// (references only — nothing loads; every shape below is code-drawn).
//
// The look in one line: flat slate cut-outs with ONE warm-red accent and a
// mustard tick each, a hard black offset shadow behind every body (solid fill,
// never alpha — bible §2.5), jagged black cut-out bands and halftone dot fields
// behind everything. Ink black is the outline AND the shadow: the whole skin is
// screen-printed poster art, so tone comes from shape, not from shading ramps.
//
// Contract: see skins/base.js. Rules honoured here — bullets/dot untouched, hot
// pink + cyan only on the boss-part emitter cores (base's sanctioned exception),
// gold stays value-only (ITEM + the HUD), background inside the washed band,
// hit ⇒ every fill white, flick ⇒ one dim flat fill, integer geometry, discs via
// K.disc, animation off g.frame only.

// --- palette ---------------------------------------------------------------
const INK = '#08080b'; // the print black: outline, shadow, cut-out bands

// Enemy slate (AIR / GROUND / HEAVY keep their contract names so the renderer
// and tools still destructure them; in this skin all three are the same slate
// family separated by VALUE, with red/mustard doing the identity work).
const AIR    = { out: INK, shade: '#3f454e', base: '#767d88', hi: '#a4abb5', glass: '#d8dce2' };
const GROUND = { out: INK, plate: '#2b2f36', shade: '#454b55', base: '#6e757f', hi: '#9aa1ab', exhaust: '#a07a24' };
const HEAVY  = { out: INK, shade: '#31363e', base: '#5d646e', hi: '#8f96a0', stripe: '#a8332a', core: '#e2ded6' };
// the two accent hues (bible §3 caps saturated hues at 3 besides the bullets:
// warm red + mustard here, violet is the player's)
const RED  = { deep: '#4c1a15', mid: '#a8332a', hot: '#c8402f' };
const MUST = { deep: '#5c4715', mid: '#a07a24', hi: '#c0932f' }; // duller than ITEM.gold — never reads as value
const DIM  = '#343941'; // armour shimmer: one dim flat fill

const SHIP   = { dark: '#241d44', shade: '#5a479c', edge: '#c9bdf5', hull: '#f0ecff', shot: '#c3a8ff', well: '#241f38', dot: '#e8e2ff' };
const ITEM   = { rim: INK, gold: '#ffd24a', glint: '#fff6d0' };
const UI     = { text: '#d4d7dd', dim: '#8a8f99', score: '#eef0f4', lives: '#e8f6ff', white: '#ffffff',
                 gold: ITEM.gold, warn: '#ff4fa3', warnHi: '#ff8ec4', warnBand: '#14040a', warnText: '#ffe6f2',
                 hudBack: 'rgba(5,5,8,0.6)', bannerBack: 'rgba(5,5,8,0.76)', bombFlash: '#dff6ff' };
// Boss = poster silhouette: bone hull, grey panels, RED modules, mustard core ring.
const BOSS   = { hull: '#c6cad2', armor: DIM, panel: '#7d848e', deep: '#2b2f36',
                 burnA: '#c8402f', burnB: '#5e211a', ember: MUST.hi, strut: '#8f96a0', hot: '#f2eee8',
                 cores: ['#ff4fa3', '#37d6e0', ITEM.gold] }; // parts only (base's sanctioned bullet-hue use)

// --- field: stains, ink bands, halftone (all inside the washed band) ---------
const SEC_T = [0, 120, 720, 1700, 2400, 2460, 2900, 3700, 3900];
const SEC_BG   = ['#0b0c10', '#100c0e', '#12100a', '#0d0f12', '#150f10', '#141109', '#0b1110', '#0c0f16', '#160e12'];
const SEC_DOT  = ['#141720', '#1c1318', '#1e1a10', '#151920', '#221616', '#201a0e', '#121e1c', '#131a26', '#221420'];
const SEC_BAND = ['#050508', '#080406', '#070603', '#050609', '#0a0505', '#090703', '#040807', '#040610', '#0a050a'];
const SEC_LAND = ['#1b1f27', '#281a1c', '#2a2416', '#1c2028', '#2c1e1e', '#2a2414', '#1a2a26', '#1a2130', '#2c2030'];
const SEC_ACC  = ['#252a34', '#2c1a18', '#2c2410', '#242a30', '#2c1614', '#2c2610', '#14302a', '#202c3c', '#2c1e2c'];
// landmark [x, w, h] per section — a distinct fortress silhouette each (backgrounds sheet)
const SEC_LANDGEO = [
  [110, 92, 56], [26, 118, 62], [196, 84, 96], [52, 156, 52], [96, 116, 104],
  [188, 104, 66], [16, 140, 58], [78, 150, 44], [58, 190, 78],
];
// boss arena restain per phase (r6 S3b): ink-blue → red-black → bone-grey dawn
const BOSS_BG   = ['#080a12', '#120a0b', '#131316'];
const BOSS_DOT  = ['#141c2c', '#28181a', '#2a2a2e'];
const BOSS_BAND = ['#04050a', '#0a0405', '#080809'];
const BOSS_LAND = ['#1a2130', '#2c1c1c', '#2a2a2e'];
const BOSS_ACC  = ['#20304a', '#2c1614', '#2c2c30'];

export const TURRET_PLATE = [[-11, -13], [11, -13], [13, -11], [13, 11], [11, 13], [-11, 13], [-13, 11], [-13, -11]];

// --- halftone tiles ---------------------------------------------------------
// Two dot lattices built once into offscreen tiles and used as fill patterns:
// a full-screen halftone is ~2000 dots if drawn as rects, one fillRect as a
// pattern. Patterns are cached per (context, colour, size).
let patCtx = null;
const PATS = new Map();
function tile(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function halftone(ctx, colour, size) { // size 8 = coarse near dots, 6 = fine far dots
  if (patCtx !== ctx) { PATS.clear(); patCtx = ctx; }
  const key = colour + size;
  let p = PATS.get(key);
  if (!p) {
    const t = tile(size, size), tx = t.getContext('2d');
    tx.fillStyle = colour;
    const d = size >= 8 ? 2 : 1;
    tx.fillRect(1, 1, d, d);
    tx.fillRect(1 + (size >> 1), 1 + (size >> 1), d, d);
    p = ctx.createPattern(t, 'repeat');
    PATS.set(key, p);
  }
  return p;
}

// --- background -------------------------------------------------------------
// Layers, back to front: flat stain → halftone dot field (parallax by pattern
// offset) → jagged black cut-out bands → the section landmark → near speed
// shards. Nothing here climbs out of the FIELD band: the landmark is LARGE,
// never bright (S2-MUST-1).
const BAND_A = [[-30, 0], [150, 0], [96, 46], [210, 60], [120, 118], [180, 150], [-30, 150]];
const BAND_B = [[350, 0], [200, 34], [286, 74], [176, 96], [300, 140], [190, 178], [350, 178]];
const BAND_C = [[-30, 0], [120, 26], [40, 58], [190, 84], [60, 104], [140, 138], [-30, 138]];

function drawBackground(ctx, g, bgScroll, sec, bossPhase, K) {
  const { W, H, poly, disc } = K;
  const boss = bossPhase >= 0;
  const bgC   = boss ? BOSS_BG[bossPhase]   : SEC_BG[sec];
  const dotC  = boss ? BOSS_DOT[bossPhase]  : SEC_DOT[sec];
  const bandC = boss ? BOSS_BAND[bossPhase] : SEC_BAND[sec];
  const landC = boss ? BOSS_LAND[bossPhase] : SEC_LAND[sec];
  const accC  = boss ? BOSS_ACC[bossPhase]  : SEC_ACC[sec];

  ctx.fillStyle = bgC;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // far halftone field — the print texture; scrolls slowly under everything
  ctx.save();
  ctx.translate(0, Math.round(bgScroll * 0.3) % 6);
  ctx.fillStyle = halftone(ctx, dotC, 6);
  ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.restore();

  // jagged black cut-out bands (enemies sheet's background): three big torn
  // shards on their own parallax, in ink — they DARKEN, so they can never
  // compete with a bullet.
  ctx.fillStyle = bandC;
  const y0 = Math.round(bgScroll * 0.22) % 360;
  for (let i = 0; i < 3; i++) {
    const band = i === 0 ? BAND_A : i === 1 ? BAND_B : BAND_C;
    const oy = y0 - 360 + i * 190;
    for (let rep = 0; rep < 2; rep++) {
      const yy = oy + rep * 360;
      if (yy > H + 40 || yy < -220) continue;
      ctx.save(); ctx.translate(0, yy); poly(ctx, band); ctx.restore();
    }
  }

  // coarse halftone inside the lower field — a second, denser dot plate that
  // gives the poster its printed gradient
  ctx.save();
  ctx.translate(0, Math.round(bgScroll * 0.45) % 8);
  ctx.fillStyle = halftone(ctx, dotC, 8);
  ctx.fillRect(-20, Math.round(H * 0.55), W + 40, H);
  ctx.restore();

  // landmark — one fortress per section, scrolling through as the section plays
  {
    const [lx, lw, lh] = SEC_LANDGEO[sec];
    const ly = Math.round((g.stageT - SEC_T[sec]) * 0.55 - lh - 40);
    if (ly < H + 40 && ly > -260) landmark(ctx, sec, lx, ly, lw, lh, landC, bgC, accC, poly, disc);
  }

  // near layer: speed shards (the poster's motion ticks) — thin, dark, fast
  ctx.fillStyle = accC;
  for (let i = 0; i < 22; i++) {
    const sx = Math.floor((i * 137.5) % W);
    const sy = Math.floor(((i * 91.7) + bgScroll * (0.7 + (i % 3) * 0.35)) % (H + 60) - 30);
    const len = 10 + (i % 3) * 7;
    ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, len);
  }
}

// Nine fortress silhouettes (backgrounds sheet: bunker deck, radar tower, gun
// keep, dam face, hangar, mast cluster, span, reactor, gate). Body in `land`,
// cut-outs back to the stain, one accent tick — all washed-band values.
function landmark(ctx, sec, x, y, w, h, land, cut, acc, poly, disc) {
  const q = (v) => Math.round(v);
  const R = (a, b, c, d) => ctx.fillRect(x + q(a), y + q(b), q(c), q(d));
  const P = (pts) => poly(ctx, pts.map((p) => [q(p[0]), q(p[1])]));
  ctx.fillStyle = land;
  switch (sec) {
    case 0: // bunker deck with two masts
      R(0, 10, w, h - 10); ctx.fillStyle = cut; R(8, 18, w - 16, h - 26);
      ctx.fillStyle = land; R(10, 0, 5, 12); R(w - 15, 0, 5, 12);
      ctx.fillStyle = acc; R(8, 18, w - 16, 2); break;
    case 1: // radar tower: stepped block + dish
      R(w * 0.3, 16, w * 0.4, h - 16); R(w * 0.18, h - 18, w * 0.64, 18);
      ctx.fillStyle = cut; R(w * 0.38, 24, w * 0.24, h - 32);
      ctx.fillStyle = land; disc(ctx, q(x + w * 0.5), q(y + 14), 13);
      ctx.fillStyle = acc; disc(ctx, q(x + w * 0.5), q(y + 14), 8); break;
    case 2: // gun keep: tall hexagon shaft
      P([[x + w * 0.2, y + 12], [x + w * 0.8, y + 12], [x + w, y + 30], [x + w, y + h], [x, y + h], [x, y + 30]]);
      ctx.fillStyle = cut; R(w * 0.3, 30, w * 0.4, h - 42);
      ctx.fillStyle = acc; R(w * 0.3, 30, w * 0.4, 2); R(w * 0.42, 0, w * 0.16, 12); break;
    case 3: // dam face with spillway columns
      R(0, 0, w, h); ctx.fillStyle = cut;
      for (let i = 0; i < 4; i++) R(10 + i * ((w - 20) / 4), 8, (w - 20) / 8, h - 12);
      ctx.fillStyle = acc; R(0, h - 6, w, 3); break;
    case 4: // hangar: big block, open mouth
      P([[x, y + h], [x, y + 24], [x + 18, y], [x + w - 18, y], [x + w, y + 24], [x + w, y + h]]);
      ctx.fillStyle = cut; R(w * 0.3, h - 40, w * 0.4, 40);
      ctx.fillStyle = acc; R(w * 0.3, h - 40, w * 0.4, 2); R(10, 26, w - 20, 2); break;
    case 5: // mast cluster
      R(0, h - 22, w, 22);
      for (let i = 0; i < 4; i++) R(8 + i * 26, (i % 2) * 14, 6, h - 22 - (i % 2) * 14);
      ctx.fillStyle = acc; R(0, h - 22, w, 2); break;
    case 6: // bridge span
      R(0, h - 14, w, 14);
      for (let i = 0; i < 5; i++) R(6 + i * 28, h - 40, 6, 26);
      ctx.fillStyle = cut; R(6, h - 10, w - 12, 4);
      ctx.fillStyle = acc; R(0, h - 42, w, 2); break;
    case 7: // reactor drums
      for (let i = 0; i < 3; i++) { ctx.fillStyle = land; disc(ctx, q(x + 26 + i * 50), q(y + h - 20), 20); }
      ctx.fillStyle = cut; R(0, h - 6, w, 6);
      ctx.fillStyle = acc; for (let i = 0; i < 3; i++) ctx.fillRect(x + 8 + i * 50, y + h - 24, 36, 2); break;
    default: // 8 — the gate: two towers + a lintel
      R(0, 0, 44, h); R(w - 44, 0, 44, h); R(0, 0, w, 20);
      ctx.fillStyle = cut; R(52, 20, w - 104, h - 20); R(10, 26, 24, h - 34); R(w - 34, 26, 24, h - 34);
      ctx.fillStyle = acc; R(0, 20, w, 2); break;
  }
}

function rimOf() { return INK; } // one print black rims everything

// --- enemies ----------------------------------------------------------------
// Identity is SHAPE first (every type and every popcorn variant is its own
// silhouette), then the red accent's placement, then a mustard tick. Sprites
// are nose-DOWN (+y); the flying types rotate themselves. The hard black
// shadow is drawn in SCREEN space (translate before rotate) so the light stays
// top-left no matter which way the craft points.
function paintEnemy(ctx, type, phase, side, step, prop, hit, flick, extra, K) {
  const { poly, disc, STEP } = K;
  const F = (c) => { ctx.fillStyle = hit ? '#ffffff' : c; };
  const S = (c) => F(flick ? DIM : c);
  // shadow pass: the outer silhouette, solid ink, offset 2/3 — skipped on the
  // hit frame (the flash silhouette must stay clean)
  const shade = (pts, rot) => {
    if (hit) return;
    ctx.save(); ctx.translate(2, 3); if (rot) ctx.rotate(rot);
    ctx.fillStyle = INK; poly(ctx, pts); ctx.restore();
  };

  switch (type) {
    case 0: { // popcorn family — four craft, four silhouettes (enemies sheet 1–4)
      const rot = step * STEP;
      if (phase === 2) {          // CROSSER — the lance: long, thin, all nose
        const outer = [[0, 13], [3, 5], [4, -4], [2, -11], [-2, -11], [-4, -4], [-3, 5]];
        shade(outer, rot); ctx.rotate(rot);
        S(AIR.base); poly(ctx, outer);
        S(AIR.shade); poly(ctx, [[-9, -4], [-3, -2], [3, -2], [9, -4], [7, 2], [-7, 2]]);
        S(AIR.hi); ctx.fillRect(-8, -4, 16, 1); ctx.fillRect(-1, -11, 2, 4);
        F(RED.mid); ctx.fillRect(-1, -8, 2, 13);
        F(MUST.mid); ctx.fillRect(-8, -1, 2, 1); ctx.fillRect(6, -1, 2, 1);
      } else if (phase === 3) {   // RISER — the pod: stubby capsule with fin pods
        const outer = [[-5, -8], [5, -8], [7, -4], [7, 6], [4, 11], [-4, 11], [-7, 6], [-7, -4]];
        shade(outer, rot); ctx.rotate(rot);
        S(GROUND.base); poly(ctx, outer);
        S(GROUND.shade); ctx.fillRect(-7, -1, 14, 4);
        S(GROUND.hi); ctx.fillRect(-5, -8, 10, 1);
        F(MUST.mid); ctx.fillRect(-10, -8, 3, 6); ctx.fillRect(7, -8, 3, 6);
        F(RED.mid); disc(ctx, 0, 3, 3);
        F(RED.hot); ctx.fillRect(-1, 2, 2, 2);
        if (extra && prop) { F(MUST.hi); poly(ctx, [[-3, -8], [3, -8], [0, -15]]); }
      } else if (phase === 1) {   // DIVER — the wedge: wide, heavy, swept back
        const outer = [[0, 11], [8, 3], [11, -6], [5, -4], [0, -8], [-5, -4], [-11, -6], [-8, 3]];
        shade(outer, rot); ctx.rotate(rot);
        S(HEAVY.base); poly(ctx, outer);
        S(HEAVY.shade); poly(ctx, [[0, 11], [8, 3], [-8, 3]]);
        S(HEAVY.hi); ctx.fillRect(-5, -5, 10, 1);
        F(RED.mid); ctx.fillRect(-4, -3, 8, 3);
        F(RED.hot); ctx.fillRect(-1, -3, 2, 3);
        F(MUST.mid); ctx.fillRect(-11, -6, 3, 2); ctx.fillRect(8, -6, 3, 2);
      } else {                    // FIGHTER — the swept dart, wings joined to the hull
        const outer = [[0, 13], [4, 2], [11, -3], [9, -8], [3, -6], [2, -9], [-2, -9], [-3, -6], [-9, -8], [-11, -3], [-4, 2]];
        shade(outer, rot); ctx.rotate(rot);
        S(AIR.base); poly(ctx, outer);
        S(AIR.shade); poly(ctx, [[0, 13], [4, 2], [-4, 2]]); ctx.fillRect(-11, -3, 22, 2);
        S(AIR.hi); ctx.fillRect(-2, -9, 4, 1); ctx.fillRect(-9, -8, 3, 1); ctx.fillRect(6, -8, 3, 1);
        F(RED.mid); ctx.fillRect(-1, -6, 2, 9);
        F(MUST.mid); ctx.fillRect(-11, -3, 3, 1); ctx.fillRect(8, -3, 3, 1);
      }
      break;
    }
    case 1: { // MID — twin outboard pods on a slim spine (enemies sheet 5)
      const rot = step * STEP;
      const outer = [[0, 15], [5, 4], [5, -10], [0, -14], [-5, -10], [-5, 4]];
      const podL = [[-14, -8], [-8, -8], [-8, 10], [-11, 14], [-14, 8]];
      const podR = [[14, -8], [8, -8], [8, 10], [11, 14], [14, 8]];
      if (!hit) {
        ctx.save(); ctx.translate(2, 3); ctx.rotate(rot);
        ctx.fillStyle = INK; poly(ctx, outer); poly(ctx, podL); poly(ctx, podR);
        ctx.fillRect(-14, -4, 28, 6); ctx.restore();
      }
      ctx.rotate(rot);
      S(AIR.shade); ctx.fillRect(-14, -4, 28, 6);
      S(AIR.hi); ctx.fillRect(-14, -4, 28, 1);
      S(AIR.base); poly(ctx, podL); poly(ctx, podR); poly(ctx, outer);
      S(AIR.shade); ctx.fillRect(-5, 4, 10, 4);
      F(MUST.mid); ctx.fillRect(-14, 4, 6, 2); ctx.fillRect(8, 4, 6, 2);
      F(RED.mid); ctx.fillRect(-2, -10, 4, 11);
      F(RED.hot); ctx.fillRect(-2, -10, 4, 2);
      S(AIR.glass); if (prop) { ctx.fillRect(-13, 10, 4, 1); ctx.fillRect(9, 10, 4, 1); }
      break;
    }
    case 2: { // TURRET — the tank block (enemies sheet 6): grey hull, red skirt band
      const angry = extra >= K.STEPS, barrel = (extra % K.STEPS) * STEP;
      if (!hit) { ctx.save(); ctx.translate(3, 4); ctx.fillStyle = INK; poly(ctx, TURRET_PLATE); ctx.restore(); }
      S(GROUND.plate); poly(ctx, TURRET_PLATE);
      S(GROUND.base); poly(ctx, [[-9, -11], [9, -11], [11, -9], [11, 5], [-11, 5], [-11, -9]]);
      S(GROUND.hi); ctx.fillRect(-9, -11, 18, 1);
      F(RED.deep); poly(ctx, [[-12, 6], [12, 6], [12, 10], [10, 13], [-10, 13], [-12, 10]]); // skirt: red along the tracks
      F(RED.mid); ctx.fillRect(-12, 6, 24, 1);
      F(MUST.mid); ctx.fillRect(-11, 4, 22, 1);
      ctx.save(); ctx.rotate(barrel);
      if (!hit) { ctx.fillStyle = INK; ctx.fillRect(1, -1, 16, 6); }
      S(GROUND.shade); ctx.fillRect(0, -3, 15, 6);
      S(GROUND.hi); ctx.fillRect(3, -3, 12, 1);
      F(angry ? RED.hot : GROUND.plate); ctx.fillRect(13, -3, 2, 6);
      ctx.restore();
      S(GROUND.plate); disc(ctx, 0, -3, 7);
      S(GROUND.hi); disc(ctx, -1, -4, 5);
      F(angry ? RED.hot : RED.mid); ctx.fillRect(-2, -5, 3, 3);  // the eye: small, red, hotter when angry
      break;
    }
    case 3: { // ELITE — gull-wing controller with mustard tips (enemies sheet 7)
      const rot = step * STEP;
      const wing = [[-22, -4], [-10, -9], [10, -9], [22, -4], [18, 6], [8, 1], [-8, 1], [-18, 6]];
      const body = [[0, 20], [7, 6], [7, -12], [3, -18], [-3, -18], [-7, -12], [-7, 6]];
      if (!hit) {
        ctx.save(); ctx.translate(3, 4); ctx.rotate(rot);
        ctx.fillStyle = INK; poly(ctx, wing); poly(ctx, body); ctx.restore();
      }
      ctx.rotate(rot);
      S(HEAVY.shade); poly(ctx, wing);
      S(HEAVY.base); poly(ctx, [[-18, -6], [-10, -9], [10, -9], [18, -6], [15, 2], [-15, 2]]);
      S(HEAVY.hi); ctx.fillRect(-18, -7, 36, 1);
      F(MUST.mid); poly(ctx, [[-22, -4], [-16, -6], [-15, 4], [-18, 6]]); poly(ctx, [[22, -4], [16, -6], [15, 4], [18, 6]]);
      S(HEAVY.base); poly(ctx, body);
      S(HEAVY.shade); poly(ctx, [[0, 20], [7, 6], [-7, 6]]);
      S(HEAVY.hi); ctx.fillRect(-3, -18, 6, 1);
      F(RED.mid); ctx.fillRect(-3, -14, 6, 16);
      F(RED.hot); ctx.fillRect(-3, -14, 6, 3);
      S(AIR.glass); if (prop) { ctx.fillRect(-13, 0, 5, 1); ctx.fillRect(8, 0, 5, 1); }
      break;
    }
    case 4: { // MIDBOSS — the kite with the red eye (enemies sheet 8)
      const outer = [[0, -26], [10, -18], [24, -4], [16, 14], [0, 26], [-16, 14], [-24, -4], [-10, -18]];
      shade(outer, 0);
      S(HEAVY.shade); poly(ctx, outer);
      S(HEAVY.base); poly(ctx, [[0, -21], [9, -15], [19, -3], [12, 12], [0, 21], [-12, 12], [-19, -3], [-9, -15]]);
      S(HEAVY.hi); poly(ctx, [[0, -21], [9, -15], [7, -14], [0, -19], [-7, -14], [-9, -15]]);
      S(HEAVY.shade); ctx.fillRect(-19, -1, 8, 2); ctx.fillRect(11, -1, 8, 2); // panel cuts
      F(MUST.mid); poly(ctx, [[-24, -4], [-17, -2], [-17, 2], [-22, 3]]); poly(ctx, [[24, -4], [17, -2], [17, 2], [22, 3]]);
      S(HEAVY.shade); poly(ctx, [[0, -12], [10, 0], [0, 12], [-10, 0]]);
      F(RED.deep); poly(ctx, [[0, -9], [7, 0], [0, 9], [-7, 0]]);
      F(RED.mid); poly(ctx, [[0, -6], [5, 0], [0, 6], [-5, 0]]);
      F(phase === 1 ? HEAVY.core : RED.hot); ctx.fillRect(-2, -2, 4, 4);
      S(HEAVY.hi); if (prop) { ctx.fillRect(-13, 11, 5, 1); ctx.fillRect(8, 11, 5, 1); }
      break;
    }
    case 5: { // BOSS — three poster silhouettes with red modules (boss sheet)
      const burning = extra > 0;
      const hull = burning ? (extra === 2 ? BOSS.burnA : BOSS.burnB) : (flick ? BOSS.armor : BOSS.hull);
      const panel = burning ? BOSS.burnB : (flick ? BOSS.armor : BOSS.panel);
      const mod = burning ? BOSS.ember : RED.mid;
      if (phase === 0) {          // FORM A — the carrier: spine, swept wings, 4 pods
        const spine = [[0, -34], [9, -18], [11, 14], [6, 26], [-6, 26], [-11, 14], [-9, -18]];
        const wingL = [[-9, -8], [-30, 0], [-38, 14], [-12, 16]];
        const wingR = [[9, -8], [30, 0], [38, 14], [12, 16]];
        if (!hit) {
          ctx.save(); ctx.translate(3, 4); ctx.fillStyle = INK;
          poly(ctx, spine); poly(ctx, wingL); poly(ctx, wingR);
          ctx.fillRect(-34, -16, 12, 18); ctx.fillRect(22, -16, 12, 18); ctx.restore();
        }
        F(panel); poly(ctx, wingL); poly(ctx, wingR);
        F(hull); poly(ctx, spine);
        F(panel); ctx.fillRect(-9, -6, 18, 4); ctx.fillRect(-10, 10, 20, 4);
        F(hull); ctx.fillRect(-34, -16, 12, 18); ctx.fillRect(22, -16, 12, 18); // pods
        F(mod); ctx.fillRect(-31, -12, 6, 11); ctx.fillRect(25, -12, 6, 11);
        F(mod); ctx.fillRect(-4, -26, 8, 12); ctx.fillRect(-6, 16, 12, 6);
        F(burning ? BOSS.ember : MUST.mid); ctx.fillRect(-30, 2, 24, 2); ctx.fillRect(6, 2, 24, 2);
        F(BOSS.hot); ctx.fillRect(-2, -32, 4, 6);
      } else if (phase === 1) {   // FORM B — the wedge with the core hex
        const wedge = [[0, -32], [9, -24], [34, 20], [26, 28], [-26, 28], [-34, 20], [-9, -24]];
        if (!hit) { ctx.save(); ctx.translate(3, 4); ctx.fillStyle = INK; poly(ctx, wedge); ctx.restore(); }
        F(hull); poly(ctx, wedge);
        F(panel); poly(ctx, [[0, -22], [24, 16], [-24, 16]]);        // the big grey face plate
        F(hull); poly(ctx, [[0, -20], [4, -14], [4, 14], [-4, 14], [-4, -14]]); // spine down the face
        F(burning ? BOSS.burnB : BOSS.deep);                          // fold lines
        ctx.fillRect(-20, 8, 12, 2); ctx.fillRect(8, 8, 12, 2); ctx.fillRect(-24, 16, 48, 2);
        F(panel); ctx.fillRect(-26, 22, 52, 4);
        F(hull); ctx.fillRect(-12, 24, 24, 4);
        F(mod); ctx.fillRect(-31, 12, 10, 12); ctx.fillRect(21, 12, 10, 12);
        F(mod); ctx.fillRect(-4, -26, 8, 10); ctx.fillRect(-20, 0, 6, 8); ctx.fillRect(14, 0, 6, 8);
        F(burning ? BOSS.ember : MUST.mid); poly(ctx, [[0, -12], [12, -4], [12, 6], [0, 14], [-12, 6], [-12, -4]]);
        F(burning ? BOSS.burnA : RED.hot); poly(ctx, [[0, -7], [7, -2], [7, 4], [0, 9], [-7, 4], [-7, -2]]);
        F(BOSS.hot); ctx.fillRect(-2, -2, 4, 4);
      } else {                    // FORM C — the blade cross around a bare core
        const bl = [[-2, -3], [-26, -30], [-14, -32], [-4, -8]];
        const br = [[2, -3], [26, -30], [14, -32], [4, -8]];
        const bl2 = [[-2, 3], [-26, 24], [-14, 28], [-4, 8]];
        const br2 = [[2, 3], [26, 24], [14, 28], [4, 8]];
        const core = [[0, -16], [11, 0], [0, 16], [-11, 0]];
        if (!hit) {
          ctx.save(); ctx.translate(3, 4); ctx.fillStyle = INK;
          poly(ctx, bl); poly(ctx, br); poly(ctx, bl2); poly(ctx, br2); poly(ctx, core); ctx.restore();
        }
        F(hull); poly(ctx, bl); poly(ctx, br); poly(ctx, bl2); poly(ctx, br2);
        F(mod); poly(ctx, [[-16, -18], [-22, -25], [-14, -27], [-11, -22]]); poly(ctx, [[16, -18], [22, -25], [14, -27], [11, -22]]);
        F(mod); poly(ctx, [[-16, 16], [-22, 21], [-14, 25], [-11, 19]]); poly(ctx, [[16, 16], [22, 21], [14, 25], [11, 19]]);
        F(panel); poly(ctx, core);
        F(burning ? BOSS.ember : MUST.mid); poly(ctx, [[0, -12], [8, 0], [0, 12], [-8, 0]]);
        F(burning ? BOSS.burnA : RED.hot); poly(ctx, [[0, -7], [5, 0], [0, 7], [-5, 0]]);
        F(BOSS.hot); ctx.fillRect(-2, -2, 4, 4);
      }
      break;
    }
    case 6: { // boss sub-part — a pod prised off the boss; emitter hue on the core only
      if (phase === 0) { // carrier pod
        const outer = [[-6, -8], [6, -8], [7, 4], [4, 9], [-4, 9], [-7, 4]];
        shade(outer, 0);
        S(BOSS.hull); poly(ctx, outer);
        S(BOSS.deep); ctx.fillRect(-6, 4, 12, 3);
        F(RED.mid); ctx.fillRect(-3, -6, 6, 9);
        F(MUST.mid); ctx.fillRect(side * 3 - 1, -8, 2, 2);
        F(BOSS.cores[0]); ctx.fillRect(-2, -2, 4, 4);
      } else if (phase === 1) { // wedge module
        const outer = [[-8, -6], [8, -6], [8, 6], [0, 10], [-8, 6]];
        shade(outer, 0);
        S(BOSS.hull); poly(ctx, outer);
        S(BOSS.deep); ctx.fillRect(-8, -6, 16, 2);
        F(RED.mid); ctx.fillRect(-6, -3, 12, 5);
        F(BOSS.cores[1]); ctx.fillRect(-3, -2, 6, 3);
      } else { // blade shard
        const outer = [[0, -10], [8, 0], [0, 10], [-8, 0]];
        shade(outer, 0);
        S(BOSS.hull); poly(ctx, outer);
        F(RED.mid); poly(ctx, [[0, -6], [5, 0], [0, 6], [-5, 0]]);
        F(BOSS.cores[2]); ctx.fillRect(-2, -2, 4, 4);
        F('#ffffff'); ctx.fillRect(-1, -1, 2, 2);
      }
      break;
    }
  }
}

// --- player -----------------------------------------------------------------
// ship-logo sheet: a violet-and-white cut-out delta — long nose spike, white
// spine, hard violet chevrons, black inset lines. 28px span, no dot.
function paintShip(c, K) {
  const { poly } = K;
  const wingL = [[-4, -4], [-14, 8], [-14, 13], [-8, 10], [-5, 13]];
  const wingR = [[4, -4], [14, 8], [14, 13], [8, 10], [5, 13]];
  const hull = [[0, -18], [3, -5], [5, 6], [5, 13], [-5, 13], [-5, 6], [-3, -5]];
  c.fillStyle = SHIP.dark; // hard offset shadow, solid (no alpha) — poster rule
  c.save(); c.translate(2, 2); poly(c, wingL); poly(c, wingR); poly(c, hull); c.restore();
  c.fillStyle = SHIP.shade; poly(c, wingL); poly(c, wingR);
  c.fillStyle = SHIP.edge;  poly(c, [[-4, -4], [-14, 8], [-13, 8], [-4, -2]]); poly(c, [[4, -4], [14, 8], [13, 8], [4, -2]]);
  // white poster chevron on each wing — sits OUTSIDE the hit dot's well, so the
  // craft still reads violet-and-white at native scale
  c.fillStyle = SHIP.hull;  poly(c, [[-6, 2], [-12, 9], [-10, 10], [-5, 5]]); poly(c, [[6, 2], [12, 9], [10, 10], [5, 5]]);
  c.fillStyle = SHIP.dark;  poly(c, [[-5, 4], [-11, 11], [-9, 12], [-4, 7]]); poly(c, [[5, 4], [11, 11], [9, 12], [4, 7]]);
  c.fillStyle = SHIP.hull;  poly(c, hull);
  c.fillStyle = SHIP.shade; poly(c, [[0, -12], [3, -8], [3, -3], [-3, -3], [-3, -8]]); // canopy — the nose tip stays white
  c.fillStyle = SHIP.dark;  c.fillRect(-2, 9, 4, 5);
  c.fillStyle = SHIP.shade; c.fillRect(-5, 11, 3, 2); c.fillRect(2, 11, 3, 2);
}

function paintItem(c, r, K) {
  const { disc } = K;
  c.fillStyle = ITEM.rim; disc(c, 1, 2, r);            // hard offset shadow
  c.fillStyle = ITEM.rim; disc(c, 0, 0, r);
  c.fillStyle = ITEM.gold; disc(c, 0, 0, Math.round(r * 0.78));
  c.fillStyle = ITEM.rim; c.fillRect(-Math.round(r * 0.6), Math.round(r * 0.1), 2 * Math.round(r * 0.6), 1);
  c.fillStyle = ITEM.glint; const hl = Math.max(2, Math.round(r * 0.3)); c.fillRect(-Math.round(r * 0.45), -Math.round(r * 0.45), hl, hl);
}

// --- post -------------------------------------------------------------------
// Print pass: one halftone plate plus one slow diagonal poster band, both dark
// and alpha-capped, so nothing on the bullet layer loses contrast. Two fills.
const POST_BAND = [[-40, 90], [360, -140], [360, -60], [-40, 170]];
function post(ctx, g, K) {
  const { W, H, poly } = K;
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = halftone(ctx, INK, 6);
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.045;
  ctx.fillStyle = INK;
  ctx.save();
  ctx.translate(0, Math.round(H * 0.5 + Math.sin(g.frame * 0.006) * 40));
  poly(ctx, POST_BAND);
  ctx.restore();
  ctx.globalAlpha = 1;
}

export default {
  id: 'graphic-pop', name: 'graphic-pop',
  pal: { AIR, GROUND, HEAVY, SHIP, ITEM, UI, BOSS },
  span: [32, 48, 40, 66, 72, 100, 32],
  rimOf, drawBackground, paintEnemy, paintShip, paintItem, post,
};
