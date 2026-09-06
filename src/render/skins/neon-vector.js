// NEON-VECTOR SKIN (r60) — Geometry Wars / Resogun lineage: glowing wireframe
// creatures on near-black. Reference sheets: docs/concepts/2026-09-04-neon-vector/.
//
// HOW THE GLOW IS BUILT (no alpha anywhere on a sprite fill — bible §2.5):
//   1. every body is a polygon filled in its type's BRIGHT line hue,
//   2. then an `inset()` copy of the same polygon is filled in near-black INK,
//      leaving a 1–2 px bright band = the wireframe stroke,
//   3. the renderer's 1 px `rimOf` rim (same bright hue) sits outside that band,
//      so the silhouette edge reads as a 2–3 px glowing line (brief: "the rim
//      colour IS the glow"),
//   4. interior structure is 1 px bright rects/wedges over the ink.
// Everything is integer geometry; discs go through K.disc; hit ⇒ every fill
// white; flick (armour shimmer) ⇒ one dim flat wire set.
//
// COLOUR LAW (bible §3 + brief rule 2/3): ONE hue per enemy TYPE — popcorn
// variants separate by SILHOUETTE, not hue, so the saturated-hue count on
// screen stays low. Hot pink and cyan never touch a body or the background
// (bullets own them); gold is value only; violet stays player-only. Boss cores
// keep the sanctioned emitter hues (pink / cyan / gold).

const WHT = '#ffffff';

// --- enemy wire sets: line = bright stroke, glow = dim inner note, ink = fill
const POP  = { line: '#52dd6c', glow: '#1d7a3c', ink: '#06170d' }; // popcorn — lime
const MIDW = { line: '#4a8cf0', glow: '#1c4a86', ink: '#050f22' }; // mid — azure
const TURW = { line: '#f08c22', glow: '#8a4a12', ink: '#1a0e03' }; // turret — amber
const ELIW = { line: '#a8bcdc', glow: '#41506e', ink: '#080b14' }; // elite — steel (desaturated on purpose)
const MBW  = { line: '#b4d832', glow: '#5e7016', ink: '#131805' }; // midboss — chartreuse
const DIMW = { line: '#454c60', glow: '#2a3040', ink: '#0c0e14' }; // armour shimmer (flick)
// Boss forms: ice → amber → hot steel. Never violet (player-only), never white.
const BOSSW = [
  { line: '#8fb6ff', glow: '#33538a', ink: '#070d1c' },
  { line: '#ffb04a', glow: '#8a5416', ink: '#1a0f03' },
  { line: '#cbd8f2', glow: '#5b6480', ink: '#12141c' },
];
// burn-in on a boss handoff (extra 1/2 alternates)
const BURNW = [
  { line: '#7a2a22', glow: '#4a1610', ink: '#150402' },
  { line: '#ffb46a', glow: '#a04a20', ink: '#1e0a04' },
];

const AIR    = { out: POP.ink,  shade: POP.glow,  base: POP.line,  hi: '#b6ffc4', glass: '#e6fff0' };
const GROUND = { out: TURW.ink, plate: TURW.glow, shade: TURW.glow, base: TURW.line, hi: '#ffd8a0', exhaust: '#ffc46a' };
const HEAVY  = { out: ELIW.ink, shade: ELIW.glow, base: ELIW.line, hi: '#dce6ff', stripe: '#ff8a4a', core: '#f2ffd0' };
const SHIP   = { dark: '#a98cff', shade: '#1b1338', edge: '#d9ccff', hull: '#f4efff', shot: '#c3a8ff', well: '#140f24', dot: '#efeaff' };
const ITEM   = { rim: '#0d0a02', gold: '#ffd24a', glint: '#fff6d0' };
const UI     = { text: '#c6d6e8', dim: '#7d8aa4', score: '#e4f0ff', lives: '#e8f6ff', white: WHT,
                 gold: ITEM.gold, warn: '#ff4fa3', warnHi: '#ff8ec4', warnBand: '#12030a', warnText: '#ffe6f2',
                 hudBack: 'rgba(3,5,10,0.58)', bannerBack: 'rgba(3,5,10,0.74)', bombFlash: '#dff6ff' };
const BOSS   = { hull: BOSSW[0].line, armor: DIMW.line, burnA: BURNW[1].line, burnB: BURNW[0].line, ember: '#ffb46a',
                 strut: '#8fa0c0', hot: '#f0f6ff', cores: ['#ff4fa3', '#37d6e0', ITEM.gold] };

// --- background: near-black + a perspective floor grid + one wireframe
// landmark per section, ALL inside the washed band (every channel ≤ 0x2e).
const FIELD_BG = '#04060c';
const SEC_T = [0, 120, 720, 1700, 2400, 2460, 2900, 3700, 3900];
const SEC_GRID = ['#111a2c', '#0f1e2e', '#161a24', '#191528', '#241620', '#231c14', '#112620', '#12202e', '#24172a'];
const SEC_STAR = ['#151d2e', '#122130', '#1a1e26', '#1d182a', '#281a22', '#272016', '#142a24', '#152430', '#281a2e'];
const SEC_LAND = ['#1a2440', '#16283c', '#20242e', '#241e34', '#2e1c26', '#2c2618', '#183028', '#1a2c3c', '#2e2036'];
// Boss arena restain per phase (r6 S3b): deep blue → red-shift → pale dawn.
const BOSS_BG   = ['#04070e', '#0c0407', '#0a0a0e'];
const BOSS_GRID = ['#101c34', '#26141a', '#26262c'];
const BOSS_STAR = ['#142440', '#2c1820', '#2e2e34'];
const BOSS_LAND = ['#182c50', '#3a1c24', '#38383e'];
// landmark [x, w, h] per section — one wireframe silhouette each
const LANDGEO = [
  [96, 128, 76], [24, 120, 108], [72, 176, 88], [40, 240, 96], [92, 136, 136],
  [16, 288, 60], [80, 160, 110], [8, 304, 84], [56, 208, 120],
];

// ---------------------------------------------------------------------------
// wire helpers — all integer output
// ---------------------------------------------------------------------------
// Pull every vertex `d` px toward (cx,cy): an approximate uniform inset, so a
// polygon filled bright then re-filled inset with ink becomes a `d`-px stroke.
function inset(pts, d, cx, cy) {
  const ax = cx || 0, ay = cy || 0, o = [];
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0], y = pts[i][1], dx = ax - x, dy = ay - y;
    const L = Math.sqrt(dx * dx + dy * dy) || 1, t = L <= d ? 1 : d / L;
    o.push([Math.round(x + dx * t), Math.round(y + dy * t)]);
  }
  return o;
}
function octa(r) { const k = Math.round(r * 0.42); return [[-k, -r], [k, -r], [r, -k], [r, k], [k, r], [-k, r], [-r, k], [-r, -k]]; }
// hollow polygon: outer loop + reversed inset loop, filled as one path
function wireLoop(c, pts, cx, cy) {
  const inr = inset(pts, 1, cx, cy);
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.moveTo(inr[0][0], inr[0][1]);
  for (let i = inr.length - 1; i > 0; i--) c.lineTo(inr[i][0], inr[i][1]);
  c.closePath();
  c.fill();
}
function frame(c, x, y, w, h) { c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h); }

// ---------------------------------------------------------------------------
// BACKGROUND
// ---------------------------------------------------------------------------
const HZ = -34;               // vanishing point sits above the field
function landmark(c, sec, x, y, w, h) {
  const r = x + w, b = y + h, mx = x + (w >> 1);
  switch (sec) {
    case 0: // comms platform: deck + antenna masts
      frame(c, x, y + (h >> 1), w, h >> 1);
      c.fillRect(x, y + (h >> 1) + 6, w, 1);
      for (const t of [0.16, 0.5, 0.84]) c.fillRect(Math.round(x + w * t), y, 1, h >> 1);
      c.fillRect(x + 8, y + 4, w - 16, 1); break;
    case 1: // twin towers with spires
      frame(c, x, y + 14, 40, h - 14); frame(c, r - 40, y + 14, 40, h - 14);
      c.fillRect(x + 20, y, 1, 14); c.fillRect(r - 21, y, 1, 14);
      for (let i = 1; i < 5; i++) { const yy = y + 14 + Math.round((h - 14) * i / 5); c.fillRect(x, yy, 40, 1); c.fillRect(r - 40, yy, 40, 1); }
      c.fillRect(x + 40, y + 30, w - 80, 1); break;
    case 2: // gate wall with a lit slot
      frame(c, x, y, w, h);
      c.fillRect(mx - 10, y + 8, 20, 1); c.fillRect(mx - 10, y + 8, 1, h - 8); c.fillRect(mx + 9, y + 8, 1, h - 8);
      c.fillRect(x, y + 20, w, 1); c.fillRect(x, b - 18, w, 1);
      frame(c, x - 6, y + 10, 18, h - 10); frame(c, r - 12, y + 10, 18, h - 10); break;
    case 3: // hangar corridor: nested frames + connectors
      for (let i = 0; i < 3; i++) { const k = i * 16; frame(c, x + k, y + Math.round(k * 0.6), w - 2 * k, h - Math.round(k * 1.2)); }
      c.fillRect(x, y, 34, 1); c.fillRect(r - 34, y, 34, 1);
      c.fillRect(mx, y + 4, 1, h - 8); break;
    case 4: { // launch ring
      const cx = mx, cy = y + (h >> 1), R = Math.min(w, h) >> 1;
      const shift = (p) => [p[0] + cx, p[1] + cy];
      wireLoop(c, octa(R).map(shift), cx, cy);
      wireLoop(c, octa(R - 14).map(shift), cx, cy);
      c.fillRect(cx - R, cy, 2 * R, 1); c.fillRect(cx, cy - R, 1, 2 * R);
      c.fillRect(cx - 3, y - 16, 1, 16); c.fillRect(cx + 3, y - 12, 1, 12); break;
    }
    case 5: // bridge span
      c.fillRect(x, y + 12, w, 1); c.fillRect(x, y + 26, w, 1);
      for (let i = 0; i <= 6; i++) { const xx = x + Math.round(w * i / 6); c.fillRect(xx, y, 1, h); }
      c.fillRect(x + 20, b - 1, w - 40, 1); break;
    case 6: { // reactor: ring + core diamond
      const cx = mx, cy = y + (h >> 1), R = Math.min(w, h) >> 1;
      frame(c, cx - R, cy - R, 2 * R, 2 * R);
      wireLoop(c, [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]], cx, cy);
      for (const s of [-1, 1]) { c.fillRect(cx + s * (R - 8) - 2, cy - 2, 4, 4); c.fillRect(cx - 2, cy + s * (R - 8) - 2, 4, 4); }
      break;
    }
    case 7: { // skyline blocks
      const hs = [0.45, 0.9, 0.6, 1, 0.7];
      for (let i = 0; i < 5; i++) {
        const bw = Math.round(w / 5.6), bx = x + Math.round(i * w / 5), bh = Math.round(h * hs[i]);
        frame(c, bx, b - bh, bw, bh);
        for (let k = 1; k * 12 < bh; k++) c.fillRect(bx, b - bh + k * 12, bw, 1);
      }
      break;
    }
    default: // 8 — citadel, stepped
      for (let i = 0; i < 4; i++) {
        const k = Math.round(w * i / 9), hh = Math.round(h / 4);
        frame(c, x + k, b - hh * (i + 1), w - 2 * k, hh);
      }
      c.fillRect(mx, y - 18, 1, 18); break;
  }
}

function drawBackground(ctx, g, bgScroll, sec, bossPhase, K) {
  const { W, H } = K;
  const boss = bossPhase >= 0;
  ctx.fillStyle = boss ? BOSS_BG[bossPhase] : FIELD_BG;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // perspective floor grid — depth rows on a 1/z ladder + rays to the horizon
  const gc = boss ? BOSS_GRID[bossPhase] : SEC_GRID[sec];
  ctx.fillStyle = gc;
  // depth rows on a geometric ladder (q^k): dense at the horizon, wide at the
  // bottom edge — one full field of rows, scrolling toward the player
  let q = Math.pow(0.79, 1 - ((bgScroll * 0.013) % 1)) * (H - HZ);
  for (let k = 0; k < 14; k++, q *= 0.79) {
    const y = Math.round(HZ + q);
    if (y > -1 && y < H) ctx.fillRect(-20, y, W + 40, 1);
  }
  const vx = W >> 1;
  for (let j = -6; j <= 6; j++) {
    if (j === 0) { ctx.fillRect(vx, 0, 1, H); continue; }
    const xb = vx + j * 38;
    K.poly(ctx, [[vx, HZ], [xb + 1, H], [xb, H]]);
  }

  // wireframe landmark: enters at the section boundary, scrolls with progress
  {
    const [lx, lw, lh] = LANDGEO[sec];
    const ly = Math.round((g.stageT - SEC_T[sec]) * 0.55 - lh - 24);
    if (ly < H + 24 && ly > -lh - 40) {
      ctx.fillStyle = boss ? BOSS_LAND[bossPhase] : SEC_LAND[sec];
      landmark(ctx, sec, lx, ly, lw, lh);
    }
  }

  // drifting motes (the sheet's dim particle field)
  ctx.fillStyle = boss ? BOSS_STAR[bossPhase] : SEC_STAR[sec];
  for (let i = 0; i < 24; i++) {
    const sx = Math.floor((i * 137.5) % W);
    const sy = Math.floor(((i * 89.3) + bgScroll * (0.5 + (i % 3) * 0.35)) % (H + 40) - 20);
    ctx.fillRect(sx, sy, 1, i % 3 === 0 ? 5 : 3);
  }
}

// ---------------------------------------------------------------------------
// RIMS — the rim IS the glow edge (one hue per TYPE)
// ---------------------------------------------------------------------------
function rimOf(type, phase) {
  switch (type) {
    case 0: return POP.line;
    case 1: return MIDW.line;
    case 2: return TURW.line;
    case 3: return ELIW.line;
    case 4: return MBW.line;
    default: return (BOSSW[phase] || BOSSW[0]).line; // boss + its parts share the form hue
  }
}

// ---------------------------------------------------------------------------
// ENEMIES — nose DOWN (+y); flying types rotate themselves by step * K.STEP
// ---------------------------------------------------------------------------
function paintEnemy(ctx, type, phase, side, step, prop, hit, flick, extra, K) {
  const { poly, disc, STEP } = K;
  let w = type === 0 ? POP : type === 1 ? MIDW : type === 2 ? TURW : type === 3 ? ELIW : type === 4 ? MBW : BOSSW[phase] || BOSSW[0];
  if (type === 5 && extra > 0) w = BURNW[extra - 1];      // boss burn-in
  if (flick) w = DIMW;                                     // armour shimmer: one dim flat wire set
  const LINE = hit ? WHT : w.line, INK = hit ? WHT : w.ink, GLOW = hit ? WHT : w.glow;
  const A = (c) => { ctx.fillStyle = hit ? WHT : c; };      // accent (core hues); white on hit
  // bright shell → ink core: leaves a d-px wire stroke
  const shell = (pts, d, cx, cy) => { ctx.fillStyle = LINE; poly(ctx, pts); ctx.fillStyle = INK; poly(ctx, inset(pts, d, cx, cy)); };

  switch (type) {
    case 0: { // POPCORN — one hue, four silhouettes (brief rule 4)
      ctx.rotate(step * STEP);
      if (phase === 2) {          // CROSSER — long needle-nosed dart, straight flat wings
        shell([[0, 13], [2, 4], [12, 1], [12, -1], [2, -3], [2, -9], [-2, -9], [-2, -3], [-12, -1], [-12, 1], [-2, 4]], 1, 0, 0);
        ctx.fillStyle = LINE; ctx.fillRect(-1, -8, 2, 19);
      } else if (phase === 3) {   // RISER — squat wingless capsule
        shell([[0, 10], [7, 4], [7, -4], [0, -9], [-7, -4], [-7, 4]], 2, 0, 0);
        ctx.fillStyle = LINE; ctx.fillRect(-2, -3, 4, 6);
        if (extra && prop) { ctx.fillStyle = LINE; poly(ctx, [[-3, -9], [3, -9], [0, -15]]); ctx.fillStyle = INK; poly(ctx, [[-1, -10], [1, -10], [0, -12]]); }
      } else if (phase === 1) {   // DIVER — twin prongs reaching down at the player
        shell([[0, 1], [4, 13], [8, 10], [6, -1], [9, -6], [2, -4], [0, -10], [-2, -4], [-9, -6], [-6, -1], [-8, 10], [-4, 13]], 1, 0, -2);
        ctx.fillStyle = LINE; ctx.fillRect(-1, -9, 2, 9);
        ctx.fillStyle = GLOW; ctx.fillRect(-5, -1, 10, 1);
      } else {                    // FIGHTER — clean swept delta
        shell([[0, 11], [2, 4], [9, -1], [9, -4], [2, -5], [2, -9], [-2, -9], [-2, -5], [-9, -4], [-9, -1], [-2, 4]], 1, 0, 0);
        ctx.fillStyle = LINE; ctx.fillRect(-1, -8, 2, 17);
        ctx.fillStyle = GLOW; ctx.fillRect(-7, -3, 14, 1);
        if (prop) { ctx.fillStyle = LINE; ctx.fillRect(-2, -10, 4, 1); }
      }
      break;
    }
    case 1: { // MID — three-boom block craft (sheet: the blue segmented ship)
      ctx.rotate(step * STEP);
      shell([[-15, -4], [15, -4], [15, 1], [-15, 1]], 1, 0, -1);                      // wing bar
      for (const s of [-1, 1]) {                                                       // outboard booms
        const x = s * 11;
        shell([[x - 4, -9], [x, -13], [x + 4, -9], [x + 4, 7], [x, 11], [x - 4, 7]], 1, x, 0);
        ctx.fillStyle = GLOW; ctx.fillRect(x - 2, -3, 4, 1); ctx.fillRect(x - 2, 3, 4, 1);
      }
      shell([[0, 15], [4, 7], [4, -11], [2, -14], [-2, -14], [-4, -11], [-4, 7]], 1, 0, 0);
      ctx.fillStyle = LINE; ctx.fillRect(-1, -12, 2, 25);
      if (prop) { ctx.fillStyle = LINE; ctx.fillRect(-13, 8, 5, 1); ctx.fillRect(8, 8, 5, 1); }
      break;
    }
    case 2: { // TURRET — concentric neon ziggurat seen from above + aimed barrel
      const angry = extra >= K.STEPS, barrel = (extra % K.STEPS) * STEP;
      shell(octa(13), 1, 0, 0);                       // outer emplacement ring
      ctx.fillStyle = GLOW;                           // four spokes across the empty plate
      for (const d of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) poly(ctx, [[d[0] * 5, d[1] * 5], [d[0] * 10, d[1] * 8], [d[0] * 8, d[1] * 10]]);
      ctx.save(); ctx.rotate(barrel);                 // barrel reaches well past the ring
      ctx.fillStyle = LINE; poly(ctx, [[0, -2], [19, -2], [19, 2], [0, 2]]);
      ctx.fillStyle = INK; ctx.fillRect(3, -1, 13, 2);
      ctx.fillStyle = LINE; ctx.fillRect(16, -3, 3, 6);   // muzzle block
      ctx.restore();
      ctx.fillStyle = angry && !hit ? HEAVY.stripe : LINE; disc(ctx, 0, 0, 5);
      ctx.fillStyle = INK; disc(ctx, 0, 0, 3);
      ctx.fillStyle = angry && !hit ? HEAVY.stripe : GLOW; ctx.fillRect(-1, -1, 2, 2);
      break;
    }
    case 3: { // ELITE — steel bomber: long wing, four nacelles (desaturated by design)
      ctx.rotate(step * STEP);
      shell([[-23, -5], [-14, -9], [14, -9], [23, -5], [23, -1], [17, 4], [-17, 4], [-23, -1]], 1, 0, -3);
      for (const x of [-18, -11, 6, 13]) {
        shell([[x, -7], [x + 5, -7], [x + 5, 6], [x + 2, 9], [x, 6]], 1, x + 2, 0);
        if (prop) { ctx.fillStyle = LINE; ctx.fillRect(x, 10, 5, 1); }
      }
      shell([[0, 20], [6, 9], [7, -13], [3, -18], [-3, -18], [-7, -13], [-6, 9]], 2, 0, 0);
      ctx.fillStyle = LINE; ctx.fillRect(-1, -16, 2, 34);
      // the one warm note on the steel bomber (bible §3 rust stripe)
      if (!flick) { ctx.fillStyle = hit ? WHT : HEAVY.stripe; poly(ctx, [[-22, -3], [-16, -3], [-19, 1]]); poly(ctx, [[16, -3], [22, -3], [19, 1]]); }
      ctx.fillStyle = GLOW; ctx.fillRect(-4, 6, 8, 1); ctx.fillRect(-4, -10, 8, 1);
      break;
    }
    case 4: { // MIDBOSS — chartreuse flying wing, exposed core in phase B
      shell([[0, -20], [9, -14], [24, -18], [30, -5], [22, 5], [10, 9], [0, 20], [-10, 9], [-22, 5], [-30, -5], [-24, -18], [-9, -14]], 2, 0, 0);
      shell([[0, -18], [6, -10], [7, 10], [0, 16], [-7, 10], [-6, -10]], 1, 0, 0);
      ctx.fillStyle = GLOW; poly(ctx, [[-25, -6], [-11, -2], [-11, 0], [-25, -4]]); poly(ctx, [[25, -6], [11, -2], [11, 0], [25, -4]]);
      ctx.fillStyle = hit ? WHT : (phase === 1 && !flick ? HEAVY.core : GLOW);
      poly(ctx, [[0, 10], [5, 1], [0, -8], [-5, 1]]);
      if (phase === 1 && !flick && !hit) { ctx.fillStyle = INK; poly(ctx, [[0, 6], [2, 1], [0, -4], [-2, 1]]); }
      if (prop) { ctx.fillStyle = LINE; ctx.fillRect(-21, 10, 7, 1); ctx.fillRect(14, 10, 7, 1); }
      break;
    }
    case 5: { // BOSS — three forms, three silhouettes, visible modules (S3b)
      const core = hit ? WHT : (extra > 0 ? BOSS.ember : BOSS.cores[phase] || WHT);
      if (phase === 0) {                    // FORM 1 — winged carrier with two drop pods
        for (const s of [-1, 1]) {
          shell([[s * 9, -16], [s * 30, -8], [s * 44, 2], [s * 40, 9], [s * 18, 6], [s * 10, 11]], 2, s * 24, 0);
          shell([[s * 34, -2], [s * 27, -7], [s * 21, 0], [s * 21, 17], [s * 28, 26], [s * 34, 17]], 2, s * 28, 8);
          A(core); ctx.fillRect(s * 28 - 2, 4, 4, 8);
        }
        shell([[0, -30], [9, -18], [12, 6], [6, 24], [-6, 24], [-12, 6], [-9, -18]], 2, 0, 0);
        ctx.fillStyle = LINE; ctx.fillRect(-1, -26, 2, 48);
        for (const y of [-14, -4, 6, 16]) { ctx.fillStyle = GLOW; ctx.fillRect(-8, y, 16, 1); }
        A(core); poly(ctx, [[0, 14], [6, 2], [0, -10], [-6, 2]]);
        ctx.fillStyle = INK; poly(ctx, [[0, 9], [3, 2], [0, -5], [-3, 2]]);
      } else if (phase === 1) {             // FORM 2 — module fortress around a big core
        shell([[0, -28], [16, -16], [36, -6], [36, 4], [16, 12], [6, 26], [-6, 26], [-16, 12], [-36, 4], [-36, -6], [-16, -16]], 2, 0, 0);
        for (const m of [[-24, -6], [24, -6], [-15, 12], [15, 12], [0, -20]]) {
          ctx.save(); ctx.translate(m[0], m[1]);
          shell(octa(6), 2, 0, 0);
          A(core); ctx.fillRect(-2, -2, 4, 4);
          ctx.restore();
        }
        shell(octa(13), 2, 0, 0);
        A(core); poly(ctx, octa(9));
        ctx.fillStyle = INK; poly(ctx, octa(5));
        A(core); ctx.fillRect(-2, -2, 4, 4);
        ctx.fillStyle = GLOW; ctx.fillRect(-34, -1, 20, 1); ctx.fillRect(14, -1, 20, 1);
      } else {                              // FORM 3 — bare diamond, two raised arms
        for (const s of [-1, 1]) {
          shell([[s * 9, -4], [s * 28, -25], [s * 34, -20], [s * 15, 1]], 1, s * 21, -12);
          ctx.fillStyle = hit ? WHT : BOSS.strut; ctx.fillRect(s * 30 - 4, -27, 8, 6);
          ctx.fillStyle = INK; ctx.fillRect(s * 30 - 2, -25, 4, 2);
        }
        shell([[0, -26], [14, 0], [0, 24], [-14, 0]], 2, 0, 0);
        ctx.fillStyle = GLOW; ctx.fillRect(-9, -1, 18, 1);
        A(core); poly(ctx, [[0, -14], [9, 0], [0, 12], [-9, 0]]);
        ctx.fillStyle = INK; poly(ctx, [[0, -8], [5, 0], [0, 7], [-5, 0]]);
        ctx.fillStyle = hit ? WHT : BOSS.hot; ctx.fillRect(-2, -3, 4, 6);
      }
      break;
    }
    case 6: { // BOSS PART — a piece of the current form, carrying its emitter hue
      const core = hit ? WHT : BOSS.cores[phase] || WHT;
      if (phase === 0) {          // a drop-pod off the carrier
        shell([[0, -9], [side * 6, -7], [side * 10, 0], [side * 8, 7], [0, 9]], 1, side * 4, 0);
        A(core); ctx.fillRect(side * 3 - 2, -2, 4, 4);
      } else if (phase === 1) {   // a fortress module
        shell(octa(8), 2, 0, 0);
        A(core); ctx.fillRect(-3, -3, 6, 6);
        ctx.fillStyle = INK; ctx.fillRect(-1, -1, 2, 2);
      } else {                    // an arm segment
        shell([[0, -9], [8, 0], [0, 9], [-8, 0]], 1, 0, 0);
        A(core); poly(ctx, [[0, -5], [4, 0], [0, 5], [-4, 0]]);
        ctx.fillStyle = WHT; ctx.fillRect(-1, -1, 2, 2);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// PLAYER — the ship-logo sheet's violet delta as a wireframe. 28 px span,
// no dot (the renderer owns it). Renderer rims it in SHIP.dark (bright violet)
// with a SHIP.hull top edge, so the craft glows against its own violet shots.
// ---------------------------------------------------------------------------
const SHIP_OUT = [[0, -17], [3, -7], [6, 1], [14, 10], [13, 14], [6, 10], [3, 12], [-3, 12], [-6, 10], [-13, 14], [-14, 10], [-6, 1], [-3, -7]];
function paintShip(c, K) {
  const { poly } = K;
  c.fillStyle = SHIP.edge; poly(c, SHIP_OUT);
  c.fillStyle = SHIP.shade; poly(c, inset(SHIP_OUT, 2, 0, 2));
  c.fillStyle = SHIP.hull; c.fillRect(-1, -15, 2, 25);              // bright spine
  // the logo's long wing spars, running from the nose out to each tip
  c.fillStyle = SHIP.edge; poly(c, [[-2, -6], [-11, 11], [-9, 11], [-1, -6]]); poly(c, [[2, -6], [11, 11], [9, 11], [1, -6]]);
  c.fillStyle = SHIP.edge; c.fillRect(-8, 5, 17, 1);                // wing chord
  c.fillStyle = SHIP.hull; c.fillRect(-2, 10, 4, 1);
}

// Item: a glowing gold ring with a hot pip — unmistakably not a bullet (S2).
function paintItem(c, r, K) {
  const { disc } = K;
  c.fillStyle = ITEM.gold; disc(c, 0, 0, r);
  c.fillStyle = ITEM.rim; disc(c, 0, 0, Math.max(1, r - 2));
  c.fillStyle = ITEM.glint; disc(c, 0, 0, Math.max(1, Math.round(r * 0.3)));
}

// ---------------------------------------------------------------------------
// POST — one alpha-capped vignette (cached gradient; ~1 fill per frame).
// It darkens the field edges only; bullet cores stay the brightest pixels.
// ---------------------------------------------------------------------------
const VIG = new WeakMap();
function post(ctx, g, K) {
  const { W, H } = K;
  let v = VIG.get(ctx);
  if (!v) {
    v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.32)');
    VIG.set(ctx, v);
  }
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

export default {
  id: 'neon-vector', name: 'neon vector',
  pal: { AIR, GROUND, HEAVY, SHIP, ITEM, UI, BOSS },
  span: [32, 48, 40, 66, 72, 100, 32],
  rimOf, drawBackground, paintEnemy, paintShip, paintItem, post,
};
