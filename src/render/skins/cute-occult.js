// CUTE-OCCULT SKIN (r60 art round). Reference sheets:
// docs/concepts/2026-09-04-cute-occult/{enemies,boss,backgrounds,ship-logo}.
// Bone-white on deep purple with dried-red accents; candle gold is a warm note
// on enemies only and stays duller than ITEM.gold (value gold is untouched).
// Contract + reference implementation: skins/base.js. Renderer owns caching,
// rims, placement, bullets, the hit dot. Pink + cyan stay bullet-only; the boss
// eye iris / part windows carry their emitter's hue exactly as base does
// (the one sanctioned body use — renderer.js case 6 comment).
// Determinism: animation keys off g.frame only; g.rng is never touched.

// ---------------------------------------------------------------------------
// PALETTE (bible §3) — three enemy families, named once, no literals below.
//   AIR    = BONE   : the cute skull castes (popcorn fighter, crosser, mid)
//   GROUND = WAX    : stone + candle (turret, riser)
//   HEAVY  = MOTH   : dark chitin + dried red (diver, elite, midboss, boss)
// Every enemy body value sits below the bullet cores; the brightest bone (hi)
// is used as a 1px top-edge light and inside skull masks only.
// ---------------------------------------------------------------------------
const AIR = { // BONE
  out: '#1b1424', shade: '#6b5f6e', base: '#b5a894', hi: '#d6c9b0',
  socket: '#251320', glow: '#8c3040', robe: '#5e2130', robeHi: '#7d3040', glass: '#d6c9b0',
};
const GROUND = { // WAX / stone
  out: '#191521', plate: '#282433', shade: '#4c4657', base: '#8e8779', hi: '#b4ac9a',
  flame: '#d8a24a', flameHi: '#f0cf86', exhaust: '#a03a3e',
};
const HEAVY = { // MOTH / chitin
  out: '#171320', shade: '#3b3348', base: '#6a5d72', hi: '#98899a',
  stripe: '#6a2030', wine: '#6a2030', wineHi: '#8c2e3c', core: '#e8d9b4', gold: '#b8913f',
};
const SHIP = { dark: '#3a2a52', shade: '#5a4478', edge: '#c9bdf5', hull: '#f0ecff', shot: '#c3a8ff', well: '#1c1428', dot: '#e8e2ff' };
const ITEM = { rim: '#0e0c04', gold: '#ffd24a', glint: '#fff6d0' };
const UI = {
  text: '#cdc6d8', dim: '#8a8298', score: '#eae4f0', lives: '#e8e0f8', white: '#ffffff',
  gold: ITEM.gold, warn: '#ff4fa3', warnHi: '#ff8ec4', warnBand: '#140410', warnText: '#ffe6f2',
  hudBack: 'rgba(8,4,16,0.58)', bannerBack: 'rgba(8,4,16,0.74)', bombFlash: '#efe4ff',
};
const BOSS = {
  hull: '#b5a894', armor: '#39304a', burnA: '#d0644a', burnB: '#6e2a24', ember: '#ffb347',
  strut: '#6a5d72', hot: '#e8d9b4', cores: ['#ff4fa3', '#37d6e0', ITEM.gold],
};
const DIM = BOSS.armor;   // armour shimmer: one dim flat fill
const VOID = '#150a14';   // pupil / deep socket

// ---------------------------------------------------------------------------
// FIELD (background) — deep purple crypt. Every swatch stays inside the washed
// band (≤ #2e per channel, S2-MUST-1): candles are dim warm motes, never lights.
// ---------------------------------------------------------------------------
const FIELD_BG = '#0c0716';
const SEC_T = [0, 120, 720, 1700, 2400, 2460, 2900, 3700, 3900];
const SEC_SLAB = ['#17102a', '#1a1230', '#1d142e', '#201434', '#241430', '#1e1628', '#181a2c', '#1b1233', '#26142e'];
const SEC_STAR = ['#241a3a', '#281c42', '#2c1e3e', '#2e1e44', '#2e1c3c', '#2a2034', '#22263a', '#261a42', '#2e1c3c'];
const SEC_LAND = ['#1c1430', '#1f1638', '#221836', '#25183c', '#2a1836', '#241c2e', '#1e2234', '#211636', '#2c1836'];
const BG_WAX = '#2b1e12';  // candle bodies + flames in the far/near layers
const BG_BONE = '#2c2632'; // bone-white read down into the band
const BOSS_BG = ['#0c0716', '#140812', '#131018'];
const BOSS_SLAB = ['#1a1233', '#281216', '#26242c'];
const BOSS_STAR = ['#2a1c44', '#2c1a1e', '#2c2a32'];
const BOSS_LAND = ['#221838', '#2a1a20', '#2a2830'];
// landmark box per section [x, w, h] — one per section, distinct silhouette
const SEC_LANDGEO = [
  [110, 100, 44], [40, 120, 96], [190, 96, 92], [50, 170, 84], [80, 150, 70],
  [200, 100, 60], [16, 150, 74], [80, 140, 78], [50, 190, 88],
];

// Sigil ring + pentagram, precomputed once as integer 1px marks (bible §2.2:
// no arc(), no sub-pixel). Drawn as the mid background layer.
function ringPts(r, n, out) {
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; out.push(Math.round(Math.cos(t) * r), Math.round(Math.sin(t) * r)); }
}
function dashLine(x0, y0, x1, y1, step, out) {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i += step) out.push(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n));
}
const SIGIL = (() => {
  const p = [];
  ringPts(46, 52, p); ringPts(30, 30, p);
  const s = [];
  for (let i = 0; i < 5; i++) { const t = -Math.PI / 2 + i * Math.PI * 2 / 5; s.push(Math.cos(t) * 44, Math.sin(t) * 44); }
  for (let i = 0; i < 5; i++) { const a = (i * 2) % 5, b = (i * 2 + 2) % 5; dashLine(s[a * 2], s[a * 2 + 1], s[b * 2], s[b * 2 + 1], 4, p); }
  return p;
})();
const SIGIL_SM = (() => { const p = []; ringPts(20, 24, p); ringPts(11, 12, p); return p; })();

const mir = (pts) => { const o = []; for (let i = 0; i < pts.length; i++) o.push([-pts[i][0], pts[i][1]]); return o; };

// ---------------------------------------------------------------------------
// BACKGROUND — far: candle motes + hanging chains · mid: a scrolling sigil
// circle · near: one code-drawn landmark per section (bible §7).
// ---------------------------------------------------------------------------
function drawBackground(ctx, g, bgScroll, sec, bossPhase, K) {
  const { W, H } = K;
  const boss = bossPhase >= 0;
  const bgC = boss ? BOSS_BG[bossPhase] : FIELD_BG;
  const slabC = boss ? BOSS_SLAB[bossPhase] : SEC_SLAB[sec];
  const starC = boss ? BOSS_STAR[bossPhase] : SEC_STAR[sec];
  const landC = boss ? BOSS_LAND[bossPhase] : SEC_LAND[sec];
  ctx.fillStyle = bgC;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // --- mid layer: the ritual circle -----------------------------------------
  {
    const cy = boss ? Math.round(H * 0.42) : Math.floor((bgScroll * 0.22) % (H + 260) - 130);
    ctx.fillStyle = starC;
    for (let i = 0; i < SIGIL.length; i += 2) ctx.fillRect(160 + SIGIL[i], cy + SIGIL[i + 1], 1, 1);
    if (!boss) {
      const cy2 = Math.floor((bgScroll * 0.22 + 300) % (H + 260) - 130);
      ctx.fillStyle = slabC;
      for (let i = 0; i < SIGIL_SM.length; i += 2) ctx.fillRect(56 + SIGIL_SM[i], cy2 + SIGIL_SM[i + 1], 1, 1);
      for (let i = 0; i < SIGIL_SM.length; i += 2) ctx.fillRect(268 + SIGIL_SM[i], cy2 + 140 + SIGIL_SM[i + 1], 1, 1);
    }
  }

  // --- near layer: the landmark ---------------------------------------------
  if (!boss) {
    const [lx, lw, lh] = SEC_LANDGEO[sec];
    const ly = Math.round((g.stageT - SEC_T[sec]) * 0.55 - lh - 40);
    if (ly < H + 40 && ly > -lh - 60) landmark(ctx, sec, lx, ly, lw, lh, landC, slabC, K);
  }

  // --- far layer: hanging chains + candle motes ------------------------------
  ctx.fillStyle = starC;
  for (let i = 0; i < 6; i++) { // chains: dotted vertical links, parallax by column
    const cx = 18 + i * 57;
    const sp = 0.5 + (i % 3) * 0.28;
    const o = Math.floor((bgScroll * sp) % 10);
    for (let y = -10 + o; y < H + 10; y += 10) { ctx.fillRect(cx, y, 1, 4); ctx.fillRect(cx - 1, y + 5, 3, 1); }
  }
  for (let i = 0; i < 30; i++) { // votive motes drifting up the shaft
    const sx = Math.floor((i * 137.5) % W);
    const sy = Math.floor(((i * 89.3) + bgScroll * (0.45 + (i % 3) * 0.35)) % (H + 40) - 20);
    ctx.fillStyle = (i % 4 === 0) ? BG_WAX : starC;
    ctx.fillRect(sx, sy, 1, (i % 3) ? 2 : 5);
  }
}

// One landmark per section, three tones from the FIELD band (never bright).
function landmark(ctx, sec, x, y, w, h, land, slab, K) {
  const { poly } = K;
  const R = (a, b, c, d) => ctx.fillRect(x + a, y + b, c, d);
  const P = (pts) => { const o = []; for (let i = 0; i < pts.length; i++) o.push([x + pts[i][0], y + pts[i][1]]); poly(ctx, o); };
  const L = () => { ctx.fillStyle = land; };
  const S = () => { ctx.fillStyle = slab; };
  const Wx = () => { ctx.fillStyle = BG_WAX; };
  const B = () => { ctx.fillStyle = BG_BONE; };
  const candles = (ys, xs) => { Wx(); for (let i = 0; i < xs.length; i++) { ctx.fillRect(x + xs[i], y + ys - 7, 2, 7); ctx.fillRect(x + xs[i], y + ys - 10, 2, 2); } };
  switch (sec) {
    case 0: // votive wall — a low altar shelf lined with candles
      L(); R(0, 14, w, h - 14); S(); R(6, 20, w - 12, h - 26);
      candles(14, [8, 26, 44, 62, 80, 92]);
      break;
    case 1: // bone cathedral spire (backgrounds panel 2)
      L(); P([[w / 2, 0], [w / 2 + 12, 26], [w / 2 + 12, h], [w / 2 - 12, h], [w / 2 - 12, 26]]);
      L(); R(10, 34, w - 20, h - 34); S(); R(18, 42, w - 36, h - 50);
      B(); P([[w / 2 - 9, 30], [w / 2, 22], [w / 2 + 9, 30], [w / 2 + 6, 44], [w / 2 - 6, 44]]); // skull face on the tower
      ctx.fillStyle = land; R(w / 2 - 6, 33, 4, 5); R(w / 2 + 2, 33, 4, 5);
      candles(34, [4, 16, w - 18, w - 6]); candles(h, [24, w - 26]);
      break;
    case 2: { // skull tower
      L(); R(8, 30, w - 16, h - 30);
      B(); P([[10, 30], [w / 2, 6], [w - 10, 30], [w - 14, 52], [w - 26, 62], [26, 62], [14, 52]]);
      ctx.fillStyle = land; R(18, 30, 18, 16); R(w - 36, 30, 18, 16); R(w / 2 - 3, 50, 6, 8);
      S(); R(20, 66, w - 40, h - 66);
      candles(30, [2, w - 6]);
      break;
    }
    case 3: // blood gate — arch + portcullis + drip columns
      L(); R(0, 8, 26, h - 8); R(w - 26, 8, 26, h - 8);
      L(); P([[20, 30], [w / 2, 4], [w - 20, 30], [w - 20, 40], [w / 2, 16], [20, 40]]);
      S(); R(30, 30, w - 60, h - 30);
      ctx.fillStyle = land; for (let i = 0; i < 7; i++) R(34 + i * 14, 34, 4, h - 34);
      candles(10, [6, 16, w - 18, w - 8]);
      break;
    case 4: { // moth shrine (backgrounds panel 4)
      L(); R(w / 2 - 40, h - 22, 80, 22);
      S(); P([[w / 2 - 6, 14], [w / 2 - 60, 2], [w / 2 - 52, 34], [w / 2 - 10, 40]]);
      S(); P([[w / 2 + 6, 14], [w / 2 + 60, 2], [w / 2 + 52, 34], [w / 2 + 10, 40]]);
      L(); P([[w / 2 - 8, 10], [w / 2 - 34, 22], [w / 2 - 12, 30]]);
      L(); P([[w / 2 + 8, 10], [w / 2 + 34, 22], [w / 2 + 12, 30]]);
      B(); P([[w / 2 - 7, 8], [w / 2, 0], [w / 2 + 7, 8], [w / 2 + 5, 30], [w / 2 - 5, 30]]);
      ctx.fillStyle = land; R(w / 2 - 5, 10, 4, 5); R(w / 2 + 1, 10, 4, 5);
      candles(h - 22, [w / 2 - 44, w / 2 - 30, w / 2 + 28, w / 2 + 42]);
      break;
    }
    case 5: // ossuary wall — grid of niches with tiny skulls
      L(); R(0, 0, w, h); S(); R(4, 4, w - 8, h - 8);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        L(); ctx.fillRect(x + 10 + c * 22, y + 10 + r * 17, 14, 12);
        B(); ctx.fillRect(x + 14 + c * 22, y + 13 + r * 17, 6, 6);
      }
      candles(0, [2, w - 4]);
      break;
    case 6: { // chain bridge between two pylons
      L(); R(0, 0, 30, h); R(w - 30, 0, 30, h);
      S(); R(6, 12, 18, h - 20); S(); R(w - 24, 12, 18, h - 20);
      ctx.fillStyle = land;
      for (let i = 30; i < w - 30; i += 8) { const sag = Math.round(Math.sin((i - 30) / (w - 60) * Math.PI) * 10); ctx.fillRect(x + i, y + 20 + sag, 5, 2); }
      for (let i = 44; i < w - 40; i += 26) { const sag = Math.round(Math.sin((i - 30) / (w - 60) * Math.PI) * 10); B(); ctx.fillRect(x + i, y + 26 + sag, 5, 5); }
      candles(6, [4, 22, w - 24, w - 6]);
      break;
    }
    case 7: { // reliquary — a great closed eye above a plinth
      L(); R(10, h - 26, w - 20, 26);
      L(); P([[w / 2, 4], [w / 2 + 44, 30], [w / 2, 56], [w / 2 - 44, 30]]);
      S(); P([[w / 2, 12], [w / 2 + 32, 30], [w / 2, 48], [w / 2 - 32, 30]]);
      B(); R(w / 2 - 18, 28, 36, 3);
      candles(h - 26, [16, 34, w - 36, w - 18]);
      break;
    }
    default: { // throne / great altar with a sigil disc
      L(); R(0, h - 30, w, 30); S(); R(20, h - 52, w - 40, 22); L(); R(50, h - 74, w - 100, 22);
      ctx.fillStyle = slab;
      for (let i = 0; i < SIGIL_SM.length; i += 2) ctx.fillRect(x + w / 2 + SIGIL_SM[i], y + 26 + SIGIL_SM[i + 1], 1, 1);
      B(); P([[w / 2 - 6, 18], [w / 2, 10], [w / 2 + 6, 18], [w / 2 + 4, 34], [w / 2 - 4, 34]]);
      candles(h - 30, [8, 24, w - 26, w - 10]); candles(h - 52, [30, w - 32]);
      break;
    }
  }
}

function rimOf(type, phase) {
  if (type === 0) return phase === 1 ? HEAVY.out : phase === 3 ? GROUND.out : AIR.out;
  if (type === 1) return AIR.out;
  if (type === 2) return GROUND.out;
  return HEAVY.out;
}

// ---------------------------------------------------------------------------
// ENEMIES — identity from SHAPE first (S4). Sprites are painted nose-DOWN (+y,
// toward the player) and the flying types rotate themselves by step*STEP.
// ---------------------------------------------------------------------------
function paintEnemy(ctx, type, phase, side, step, prop, hit, flick, extra, K) {
  const { poly, disc, STEP } = K;
  const F = (c) => { ctx.fillStyle = hit ? UI.white : c; };
  const S = (c) => F(flick ? DIM : c);
  const P = (pts) => poly(ctx, pts);
  const M = (pts) => { poly(ctx, pts); poly(ctx, mir(pts)); }; // both sides

  // a skull mask: bone dome + two sockets (+ a dim red ember in each when big)
  const skull = (x, y, a, b) => {
    S(AIR.base); P([[x - a, y - b + 2], [x - a + 2, y - b], [x + a - 2, y - b], [x + a, y - b + 2],
      [x + a, y + b - 3], [x + a - 2, y + b], [x - a + 2, y + b], [x - a, y + b - 3]]);
    S(AIR.hi); ctx.fillRect(x - a + 2, y - b, 2 * a - 4, 1);
    const sw = Math.max(2, a - 2), sh = Math.max(2, b - 3);
    S(AIR.socket); ctx.fillRect(x - 1 - sw, y - 1, sw, sh); ctx.fillRect(x + 1, y - 1, sw, sh);
    if (a >= 5) { S(AIR.glow); ctx.fillRect(x - sw, y + sh - 3, 2, 2); ctx.fillRect(x + 2, y + sh - 3, 2, 2); }
    if (b >= 6) { S(AIR.socket); ctx.fillRect(x - 1, y + sh, 2, 2); }
  };
  // a wax candle standing on (x, y), burning upward (-y)
  const candle = (x, y, h) => {
    S(AIR.base); ctx.fillRect(x, y - h, 2, h);
    S(AIR.hi); ctx.fillRect(x, y - h, 1, h - 1);
    S(prop ? GROUND.flameHi : GROUND.flame); ctx.fillRect(x, y - h - 2, 2, 2);
  };

  switch (type) {
    case 0: { // POPCORN — one craft per behaviour variant
      ctx.rotate(step * STEP);
      if (phase === 2) { // CROSSER — the dart-eye lance (long, thin, blades trailing)
        S(HEAVY.shade); M([[-2, 2], [-9, -6], [-8, -11], [-1, -3]]);
        S(HEAVY.base); P([[-2, -2], [0, -13], [2, -2]]);
        S(GROUND.flame); ctx.fillRect(-6, -6, 1, 1); ctx.fillRect(5, -6, 1, 1);
        S(AIR.base); P([[0, 14], [4, 4], [2, -4], [-2, -4], [-4, 4]]);
        S(AIR.hi); P([[0, 14], [4, 4], [3, 4], [0, 11]]);
        S(AIR.socket); ctx.fillRect(-2, 2, 4, 5);
        S(AIR.glow); ctx.fillRect(-1, 4, 2, 2);
      } else if (phase === 3) { // RISER — hooded rocket acolyte with a wax plume
        S(AIR.robe); P([[-4, -10], [4, -10], [5, -5], [-5, -5]]);
        S(HEAVY.shade); ctx.fillRect(-8, -5, 3, 7); ctx.fillRect(5, -5, 3, 7);
        S(AIR.base); P([[0, 11], [5, 2], [6, -5], [-6, -5], [-5, 2]]);
        S(AIR.hi); ctx.fillRect(-5, -5, 10, 1);
        S(AIR.socket); ctx.fillRect(-4, -1, 3, 4); ctx.fillRect(1, -1, 3, 4);
        S(HEAVY.wine); ctx.fillRect(-1, -4, 2, 2); ctx.fillRect(-2, -3, 4, 1);
        if (extra && prop) { S(GROUND.exhaust); P([[-3, -10], [3, -10], [0, -15]]); }
      } else if (phase === 1) { // DIVER — horned reaper, narrow, spike-first
        S(HEAVY.wine); P([[0, 13], [3, 3], [-3, 3]]);
        S(HEAVY.shade); P([[-7, -3], [7, -3], [5, 5], [-5, 5]]);
        S(HEAVY.base); M([[-7, -3], [-9, 1], [-5, 4]]);
        S(AIR.base); M([[-2, -5], [-7, -14], [-4, -14], [0, -4]]);
        S(AIR.hi); M([[-6, -14], [-4, -14], [-3, -10]]);
        S(AIR.base); P([[0, -8], [5, -2], [4, 4], [-4, 4], [-5, -2]]);
        S(AIR.socket); ctx.fillRect(-4, -2, 3, 4); ctx.fillRect(1, -2, 3, 4);
        S(AIR.glow); ctx.fillRect(-3, 0, 2, 2); ctx.fillRect(1, 0, 2, 2);
        S(HEAVY.wine); ctx.fillRect(-1, -6, 2, 2);
      } else { // FIGHTER — the little horned imp
        S(AIR.robe); P([[-4, -10], [4, -10], [6, -2], [-6, -2]]);
        S(HEAVY.shade); M([[-4, -7], [-9, -4], [-9, 1], [-4, -1]]);
        S(HEAVY.base); M([[-9, -4], [-9, 1], [-7, -1]]);
        S(AIR.robeHi); M([[-5, -6], [-8, -11], [-4, -7]]);
        skull(0, 0, 6, 7);
      }
      break;
    }
    case 1: { // MID — twin-cannon acolyte: hooded skull between two skull pods
      ctx.rotate(step * STEP);
      S(HEAVY.wine); P([[-4, -6], [4, -6], [4, -14], [0, -12], [-4, -14]]);
      S(HEAVY.shade); M([[-6, -4], [-15, -7], [-16, 1], [-8, 4]]);
      S(HEAVY.base); M([[-15, -7], [-16, 1], [-13, -1]]);
      S(HEAVY.base); ctx.fillRect(-12, -8, 6, 12); ctx.fillRect(6, -8, 6, 12);
      S(HEAVY.hi); ctx.fillRect(-12, -8, 6, 1); ctx.fillRect(6, -8, 6, 1);
      S(HEAVY.shade); ctx.fillRect(-11, 4, 4, 8); ctx.fillRect(7, 4, 4, 8);
      S(GROUND.hi); ctx.fillRect(-11, 10, 4, 1); ctx.fillRect(7, 10, 4, 1);
      S(AIR.base); M([[-11, -8], [-9, -14], [-7, -8]]);
      skull(-9, -3, 4, 4); skull(9, -3, 4, 4);
      S(HEAVY.shade); P([[0, 13], [7, 4], [7, -8], [0, -12], [-7, -8], [-7, 4]]);
      skull(0, 1, 6, 8);
      S(HEAVY.wine); ctx.fillRect(-1, -7, 2, 4); ctx.fillRect(-3, -6, 6, 1);
      break;
    }
    case 2: { // TURRET — candle-spike gun on a stone plinth; barrel aims at the ship
      const angry = extra >= K.STEPS, barrel = (extra % K.STEPS) * STEP;
      if (!hit) { ctx.save(); ctx.translate(2, 3); S(GROUND.out); P(PLINTH); ctx.restore(); }
      S(GROUND.shade); P(PLINTH);                              // lit stone slab
      S(GROUND.hi); ctx.fillRect(-9, -13, 18, 1);               // top-lit rim (§4)
      S(GROUND.plate); P([[-8, -11], [8, -11], [11, -7], [11, 7], [8, 11], [-8, 11], [-11, 7], [-11, -7]]);
      S(GROUND.base); ctx.fillRect(-9, 9, 18, 3);               // front step
      ctx.save(); ctx.rotate(barrel);                            // barrel first: the skull sits over it
      S(GROUND.plate); ctx.fillRect(0, -4, 16, 8);
      S(GROUND.base); ctx.fillRect(4, -3, 12, 3);
      S(GROUND.hi); ctx.fillRect(4, -3, 12, 1);
      S(HEAVY.wine); ctx.fillRect(12, -4, 2, 8);
      S(GROUND.out); ctx.fillRect(14, -3, 2, 6);
      ctx.restore();
      S(angry ? HEAVY.wineHi : GROUND.base); disc(ctx, 0, -1, angry ? 11 : 9); // collar flares red when angry
      S(angry ? HEAVY.wine : GROUND.shade); disc(ctx, 0, 0, angry ? 10 : 8);
      candle(-13, -6, 5); candle(11, -6, 5); candle(-1, -11, 4);
      skull(0, -1, 7, 8);
      S(angry ? HEAVY.wineHi : HEAVY.wine); ctx.fillRect(-1, -9, 2, 3); ctx.fillRect(-2, -8, 4, 1);
      break;
    }
    case 3: { // ELITE — moth-wing cathedral barge: candled wing bar, hanging pods
      ctx.rotate(step * STEP);
      S(HEAVY.shade); P([[-22, -3], [-10, -10], [10, -10], [22, -3], [17, 2], [10, -5], [-10, -5], [-17, 2]]);
      S(HEAVY.base); P([[-10, -10], [10, -10], [10, -8], [-10, -8]]);
      S(HEAVY.hi); ctx.fillRect(-9, -10, 18, 1);
      candle(-17, -4, 5); candle(-8, -9, 5); candle(6, -9, 5); candle(15, -4, 5);
      S(HEAVY.wine); P([[-20, 1], [-15, 1], [-15, 9], [-17, 7], [-20, 9]]);
      S(HEAVY.wine); P([[15, 1], [20, 1], [20, 9], [17, 7], [15, 9]]);
      S(HEAVY.base); P([[0, -14], [3, -19], [0, -24], [-3, -19]]);
      S(GROUND.flame); ctx.fillRect(-1, -20, 2, 2);
      S(HEAVY.shade); P([[0, 18], [8, 8], [8, -8], [0, -14], [-8, -8], [-8, 8]]);
      S(HEAVY.base); ctx.fillRect(-13, 4, 6, 8); ctx.fillRect(7, 4, 6, 8);
      S(HEAVY.shade); ctx.fillRect(-11, 12, 2, 7); ctx.fillRect(9, 12, 2, 7);
      skull(-10, 7, 4, 4); skull(10, 7, 4, 4);
      skull(0, 2, 7, 9);
      S(HEAVY.wine); ctx.fillRect(-1, -8, 2, 5); ctx.fillRect(-3, -7, 6, 1);
      break;
    }
    case 4: { // MIDBOSS — eye reliquary: horn-wings, moon sigils, hanging skulls
      const open = phase === 1;
      // wing lobes + horns, both sides
      S(AIR.shade); M([[-8, -4], [-26, -16], [-30, 2], [-22, 14], [-10, 10]]);
      S(HEAVY.wine); M([[-10, -2], [-24, -12], [-26, 2], [-20, 10], [-11, 8]]);
      S(AIR.base); M([[-6, -8], [-14, -29], [-19, -21], [-12, -6]]);
      S(HEAVY.shade); M([[-8, -8], [-14, -25], [-16, -20], [-11, -7]]);
      S(HEAVY.gold); ctx.fillRect(-19, -13, 3, 1); ctx.fillRect(-20, -12, 1, 3); ctx.fillRect(-19, -9, 3, 1);
      ctx.fillRect(16, -13, 3, 1); ctx.fillRect(19, -12, 1, 3); ctx.fillRect(16, -9, 3, 1);
      S(HEAVY.wineHi); ctx.fillRect(-22, 1, 2, 2); ctx.fillRect(20, 1, 2, 2);
      // chains + hanging skulls
      S(HEAVY.shade); ctx.fillRect(-13, 10, 1, 6); ctx.fillRect(12, 10, 1, 6);
      skull(-13, 18, 4, 4); skull(13, 18, 4, 4);
      // central hull
      S(AIR.shade); P([[0, -25], [10, -6], [10, 8], [0, 21], [-10, 8], [-10, -6]]);
      S(AIR.base); P([[0, -21], [8, -5], [8, 7], [0, 17], [-8, 7], [-8, -5]]);
      S(HEAVY.shade); ctx.fillRect(-7, -9, 14, 1); ctx.fillRect(-6, 11, 12, 1);
      candle(-4, -20, 4); candle(2, -20, 4);
      // the eye
      S(AIR.hi); P([[0, -8], [9, 2], [0, 12], [-9, 2]]);
      S(HEAVY.wine); P([[0, -5], [6, 2], [0, 9], [-6, 2]]);
      if (open) {
        S(HEAVY.wineHi); disc(ctx, 0, 2, 5);
        S(GROUND.flameHi); disc(ctx, 0, 2, 3);
        S(VOID); ctx.fillRect(-1, -2, 2, 8);
      } else {
        S(AIR.base); P([[0, -4], [6, 2], [0, 8], [-6, 2]]);
        S(VOID); ctx.fillRect(-5, 1, 10, 2);
      }
      break;
    }
    case 5: { // BOSS — the eye reliquary in three forms (S3b: phase = form)
      const burning = extra > 0;
      const B = burning ? (extra === 2 ? BOSS.burnA : BOSS.burnB) : (flick ? DIM : AIR.base);
      const Bd = burning ? BOSS.burnB : (flick ? DIM : AIR.shade);
      const Bm = burning ? BOSS.burnB : (flick ? DIM : HEAVY.base);
      const Bw = burning ? BOSS.burnA : (flick ? DIM : HEAVY.wine);
      const core = burning ? BOSS.ember : (BOSS.cores[phase] || UI.white);
      const eye = (cy, a, b) => { // bone lens · wine surround · emitter iris · slit
        F(burning ? BOSS.burnA : AIR.hi); P([[0, cy - b], [a, cy], [0, cy + b], [-a, cy]]);
        F(Bw); P([[0, cy - b + 3], [a - 3, cy], [0, cy + b - 3], [-(a - 3), cy]]);
        F(core); disc(ctx, 0, cy, a - 8);
        F(VOID); ctx.fillRect(-1, cy - (b - 7), 2, 2 * (b - 7));
        F(burning ? BOSS.ember : AIR.hi); ctx.fillRect(-4, cy - 3, 2, 2);
      };
      const MP = (pts) => { P(pts); P(mir(pts)); };
      const Bhi = burning ? BOSS.burnA : HEAVY.hi;
      const Bfl = burning ? BOSS.ember : GROUND.exhaust;
      if (phase === 0) { // P1 — winged reliquary cathedral: scalloped horn shields, halo, gun towers
        F(Bd); MP([[-13, -12], [-34, -46], [-48, -26], [-50, 4], [-42, 18], [-36, 10], [-30, 20], [-24, 10], [-18, 18], [-15, 4]]);
        F(Bw); MP([[-19, -8], [-33, -36], [-42, -24], [-43, 2], [-36, 12], [-22, 10]]);   // dried-red inner panel
        F(B); MP([[-34, -46], [-48, -26], [-44, -24], [-32, -40]]);                       // lit outer edge
        F(B); MP([[-31, -10], [-25, -3], [-31, 4], [-37, -3]]);                           // wing eye lens
        F(Bw); ctx.fillRect(-33, -5, 4, 5); ctx.fillRect(29, -5, 4, 5);
        F(burning ? BOSS.ember : HEAVY.gold); // halo: a ring of gilded marks over the spire
        for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; ctx.fillRect(Math.round(Math.cos(t) * 9), -46 + Math.round(Math.sin(t) * 9), 2, 2); }
        F(Bd); P([[0, -42], [16, -18], [18, 12], [8, 32], [-8, 32], [-18, 12], [-16, -18]]);
        F(B); P([[0, -36], [12, -16], [14, 10], [6, 27], [-6, 27], [-14, 10], [-12, -16]]);
        F(Bm); ctx.fillRect(-13, 22, 26, 1);                                              // panel line
        F(burning ? BOSS.burnB : HEAVY.shade); ctx.fillRect(-18, -34, 13, 15); ctx.fillRect(5, -34, 13, 15);
        F(B); ctx.fillRect(-18, -34, 13, 3); ctx.fillRect(5, -34, 13, 3);
        F(Bm); ctx.fillRect(-17, -31, 11, 2); ctx.fillRect(6, -31, 11, 2);
        F(Bd); for (const x of [-17, -13, -9, 6, 10, 14]) ctx.fillRect(x, -19, 3, 8);     // barrel clusters
        F(B); ctx.fillRect(-24, -22, 2, 6); ctx.fillRect(22, -22, 2, 6);                  // votive candles
        F(burning ? BOSS.ember : (prop ? GROUND.flameHi : GROUND.flame)); ctx.fillRect(-24, -24, 2, 2); ctx.fillRect(22, -24, 2, 2);
        eye(2, 13, 16);
        F(Bm); ctx.fillRect(-13, 31, 9, 7); ctx.fillRect(4, 31, 9, 7);
        if (prop) { F(Bfl); P([[-12, 38], [-5, 38], [-9, 49]]); P([[5, 38], [12, 38], [8, 49]]); }
        F(Bm); ctx.fillRect(-30, 20, 1, 10); ctx.fillRect(29, 20, 1, 10);
        F(burning ? BOSS.burnA : AIR.base); ctx.fillRect(-34, 30, 8, 7); ctx.fillRect(26, 30, 8, 7);
        F(VOID); ctx.fillRect(-33, 32, 2, 3); ctx.fillRect(-29, 32, 2, 3); ctx.fillRect(27, 32, 2, 3); ctx.fillRect(31, 32, 2, 3);
      } else if (phase === 1) { // P2 — flat manta reliquary, module row along the leading edge
        F(Bd); P([[0, -26], [13, -21], [30, -14], [54, -2], [34, 6], [24, 10], [16, 32], [7, 15], [0, 20], [-7, 15], [-16, 32], [-24, 10], [-34, 6], [-54, -2], [-30, -14], [-13, -21]]);
        F(B); P([[0, -20], [11, -16], [24, -10], [42, -2], [27, 3], [19, 7], [13, 25], [5, 12], [0, 15], [-5, 12], [-13, 25], [-19, 7], [-27, 3], [-42, -2], [-24, -10], [-11, -16]]);
        F(Bm); ctx.fillRect(-34, 3, 68, 1);
        for (const [mx, my] of [[-43, -3], [-32, -8], [-20, -13], [9, -13], [21, -8], [32, -3]]) {
          F(burning ? BOSS.burnB : HEAVY.shade); ctx.fillRect(mx, my, 11, 10);
          F(B); ctx.fillRect(mx, my, 11, 2);
          F(Bm); ctx.fillRect(mx + 1, my + 2, 9, 2);
          F(Bd); ctx.fillRect(mx + 2, my + 10, 2, 6); ctx.fillRect(mx + 7, my + 10, 2, 6);
        }
        eye(-2, 13, 16);
        for (const nx of [-29, -17, 4, 17]) {
          F(Bm); ctx.fillRect(nx, 5, 10, 8);
          F(Bd); ctx.fillRect(nx + 1, 11, 8, 2);
          if (prop) { F(Bfl); ctx.fillRect(nx + 3, 13, 4, 6); }
        }
        F(Bw); for (const dx of [-48, -39, -27, 28, 38, 47]) ctx.fillRect(dx, 2, 1, 8); // blood drips off the trailing edge
        F(burning ? BOSS.burnA : AIR.base); ctx.fillRect(-5, 16, 10, 8);
        F(VOID); ctx.fillRect(-4, 18, 3, 3); ctx.fillRect(2, 18, 3, 3);
      } else { // P3 — the bare radiant core on two engine struts
        F(Bm); MP([[-14, -2], [-24, 4], [-44, 30], [-32, 36]]);
        F(Bhi); MP([[-14, -2], [-24, 4], [-22, 7], [-13, 2]]);
        F(Bd); ctx.fillRect(-45, 30, 12, 7); ctx.fillRect(33, 30, 12, 7);
        if (prop) { F(Bfl); P([[-43, 37], [-35, 37], [-39, 50]]); P([[35, 37], [43, 37], [39, 50]]); }
        F(Bd); for (let i = 0; i < SPIKES.length; i++) P(SPIKES[i]);
        F(B); for (let i = 0; i < SPIKES.length; i += 2) P(SPIKES[i]);
        F(Bw); disc(ctx, 0, 0, 15);
        F(burning ? BOSS.burnB : AIR.shade); disc(ctx, 0, 0, 12);
        F(core); disc(ctx, 0, 0, 8);
        F(burning ? BOSS.ember : BOSS.hot); disc(ctx, 0, 0, 4);
        F(VOID); ctx.fillRect(-1, -7, 2, 14);
      }
      break;
    }
    case 6: { // BOSS PART — a piece of the form it came from; window = its bullet hue
      if (phase === 0) { // a horn-wing shard
        S(AIR.shade); P([[0, -10], [side * 6, -9], [side * 10, -2], [side * 7, 7], [0, 9]]);
        S(HEAVY.wine); P([[0, -7], [side * 5, -6], [side * 7, -2], [side * 5, 5], [0, 6]]);
        F(BOSS.cores[0]); disc(ctx, side * 4, 0, 3);
        S(AIR.hi); P([[0, -10], [side * 6, -9], [side * 6, -7], [0, -8]]);
      } else if (phase === 1) { // a gun module torn off the manta
        S(HEAVY.base); ctx.fillRect(-7, -8, 14, 12);
        S(AIR.base); ctx.fillRect(-7, -8, 14, 2);
        S(HEAVY.shade); ctx.fillRect(-5, 4, 3, 5); ctx.fillRect(2, 4, 3, 5);
        F(BOSS.cores[1]); ctx.fillRect(-4, -4, 8, 6);
      } else { // a radiant spike shard
        S(AIR.base); P([[0, -9], [6, 0], [0, 9], [-6, 0]]);
        S(HEAVY.shade); P([[0, -5], [4, 0], [0, 5], [-4, 0]]);
        F(BOSS.cores[2]); disc(ctx, 0, 0, 3);
        F(BOSS.hot); ctx.fillRect(-1, -1, 2, 2);
      }
      break;
    }
  }
}

// turret plinth (octagonal stone slab, bible §6 turret = 26)
const PLINTH = [[-9, -13], [9, -13], [13, -8], [13, 8], [9, 13], [-9, 13], [-13, 8], [-13, -8]];
// P3 boss sunburst: 12 integer bone spikes around the core
const SPIKES = (() => {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 12 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const len = (i % 2) ? 30 : 44, w = (i % 2) ? 5 : 7;
    out.push([
      [Math.round(c * len), Math.round(s * len)],
      [Math.round(c * 12 - s * w), Math.round(s * 12 + c * w)],
      [Math.round(c * 8), Math.round(s * 8)],
      [Math.round(c * 12 + s * w), Math.round(s * 12 - c * w)],
    ]);
  }
  return out;
})();

// ---------------------------------------------------------------------------
// SHIP — the witch's broom-craft (ship-logo + boss sheets): skull figurehead on
// the shaft, swept moth-cloak wings, straw bristles trailing. ~28px span, and
// NO dot: the renderer draws the hit dot over the middle (which is why the
// silhouette's information lives at the tips).
// ---------------------------------------------------------------------------
function paintShip(c, K) {
  const { poly } = K;
  const P = (pts) => poly(c, pts);
  // trailing bristles
  c.fillStyle = AIR.shade; P([[-7, 7], [7, 7], [10, 16], [-10, 16]]);
  c.fillStyle = AIR.base; P([[-6, 8], [6, 8], [8, 15], [-8, 15]]);
  c.fillStyle = AIR.socket; c.fillRect(-5, 9, 1, 6); c.fillRect(-1, 9, 1, 6); c.fillRect(4, 9, 1, 6);
  c.fillStyle = SHIP.dark; c.fillRect(-6, 5, 12, 3);
  // cloak wings
  c.fillStyle = SHIP.shade; P([[-3, -4], [-14, 1], [-13, 10], [-4, 7]]); P([[3, -4], [14, 1], [13, 10], [4, 7]]);
  c.fillStyle = SHIP.dark; P([[-5, 2], [-12, 3], [-11, 9], [-5, 6]]); P([[5, 2], [12, 3], [11, 9], [5, 6]]);
  c.fillStyle = SHIP.edge; P([[-3, -4], [-14, 1], [-12, 1], [-3, -2]]); P([[3, -4], [14, 1], [12, 1], [3, -2]]);
  // shaft + skull figurehead
  c.fillStyle = SHIP.hull; c.fillRect(-2, -12, 4, 19);
  c.fillStyle = SHIP.edge; c.fillRect(-2, -12, 1, 19);
  c.fillStyle = AIR.hi; P([[-5, -12], [-3, -15], [3, -15], [5, -12], [5, -8], [3, -6], [-3, -6], [-5, -8]]);
  c.fillStyle = SHIP.dark; c.fillRect(-4, -11, 3, 3); c.fillRect(1, -11, 3, 3); c.fillRect(-1, -8, 2, 2);
  c.fillStyle = AIR.hi; P([[-4, -15], [-1, -18], [1, -18], [4, -15]]); // bone spike above the skull
}

function paintItem(c, r, K) {
  const { disc } = K;
  c.fillStyle = ITEM.rim; disc(c, 0, 0, r);
  c.fillStyle = ITEM.gold; disc(c, 0, 0, Math.round(r * 0.78));
  c.fillStyle = ITEM.rim; // a sigil struck into the coin
  c.fillRect(-Math.round(r * 0.5), -1, 2 * Math.round(r * 0.5), 1);
  c.fillRect(-1, -Math.round(r * 0.5), 1, 2 * Math.round(r * 0.5));
  c.fillStyle = ITEM.glint; const hl = Math.max(2, Math.round(r * 0.3)); c.fillRect(-Math.round(r * 0.4), -Math.round(r * 0.42), hl, hl);
}

// Crypt vignette: one cached radial gradient, darkening only — it can never
// lower bullet contrast (alpha-capped overlay, rule 7).
let VIG = null, VIGCTX = null;
function post(ctx, g, K) {
  const { W, H } = K;
  if (!VIG || VIGCTX !== ctx) {
    VIGCTX = ctx;
    VIG = ctx.createRadialGradient(W >> 1, H >> 1, Math.round(H * 0.30), W >> 1, H >> 1, Math.round(H * 0.74));
    VIG.addColorStop(0, 'rgba(10,4,20,0)');
    VIG.addColorStop(1, 'rgba(10,4,20,0.30)');
  }
  ctx.fillStyle = VIG;
  ctx.fillRect(-20, -20, W + 40, H + 40);
}

export default {
  id: 'cute-occult', name: 'cute-occult (default, r62)',
  pal: { AIR, GROUND, HEAVY, SHIP, ITEM, UI, BOSS },
  span: [32, 48, 40, 66, 76, 112, 32],
  rimOf, drawBackground, paintEnemy, paintShip, paintItem, post,
};
