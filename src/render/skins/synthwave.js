// SYNTHWAVE SKIN (r60) — 80s outrun. Contract + reference implementation live in
// skins/base.js; concept sheets in docs/concepts/2026-09-04-synthwave/.
//
// World palette: INDIGO · VIOLET · BURNT ORANGE · SUNSET GOLD. Hot pink and cyan
// are the bullet castes (wiki §6.2) and appear nowhere in this file except the
// UI warning band, which base already owns. Gold stays value-only; the enemy
// engine glow is burnt amber, deliberately duller and oranger than ITEM.gold.
//
// Where the direction lives: the BACKGROUND. Every section gets a banded sunset
// sky, a slitted outrun sun on the horizon, a scrolling perspective grid floor,
// palm / skyline / mountain silhouettes and one chrome-lit landmark (carrier
// deck, dam, hangar, tower block) that rises out of the horizon and passes the
// player. All of it stays in the washed band so the bullet layer stays brightest
// (S2-MUST-1) — see docs/art-rounds/skin-synthwave.md for the measured values.

// ---------------------------------------------------------------------------
// colour helpers (module-init only — nothing below builds a string per frame)
// ---------------------------------------------------------------------------
const hex = (r, g, b) => '#' + (((1 << 24) + (r << 16) + (g << 8) + b) | 0).toString(16).slice(1);
const cl = (v) => v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
const mix = (a, b, t) => [cl(a[0] + (b[0] - a[0]) * t), cl(a[1] + (b[1] - a[1]) * t), cl(a[2] + (b[2] - a[2]) * t)];
const sc = (a, k) => [cl(a[0] * k), cl(a[1] * k), cl(a[2] * k)];
const hx = (a) => hex(cl(a[0]), cl(a[1]), cl(a[2]));

// ---------------------------------------------------------------------------
// PALETTE (bible §3). Chrome = lavender steel, lit top-left. Warm amber is the
// engine note and the only saturated hue on a body.
// ---------------------------------------------------------------------------
const AIR    = { out: '#241d36', shade: '#4c4166', base: '#8b80ab', hi: '#c6bfdc', glass: '#ece9f6' };
const GROUND = { out: '#241a24', plate: '#2f2438', shade: '#564a68', base: '#94889f', hi: '#c4bccb', exhaust: '#e0862e' };
const HEAVY  = { out: '#1b1626', shade: '#3d3552', base: '#726a8e', hi: '#a79fc4', stripe: '#b0552c', core: '#e8a044' };
// engine glow — burnt amber, two frames. Duller + oranger than ITEM.gold so the
// value channel stays unambiguous (bible §3 exclusivity).
const ENG    = { deep: '#7a3c14', mid: '#c46a22', hot: '#f0a03e' };
const SHIP   = { dark: '#3b2f66', shade: '#6b58ad', edge: '#c9bdf5', hull: '#f4f1ff', shot: '#c3a8ff', well: '#221c3a', dot: '#e8e2ff' };
const ITEM   = { rim: '#0e0c04', gold: '#ffd24a', glint: '#fff6d0' };
const UI     = { text: '#d2cbe8', dim: '#8f88a8', score: '#efeaff', lives: '#e9e2ff', white: '#ffffff',
                 gold: ITEM.gold, warn: '#ff4fa3', warnHi: '#ff8ec4', warnBand: '#14040a', warnText: '#ffe6f2',
                 hudBack: 'rgba(6,5,14,0.55)', bannerBack: 'rgba(6,5,14,0.72)', bombFlash: '#efe4ff' };
const BOSS   = { hull: '#b9b3d0', armor: '#332c48', burnA: '#e0604a', burnB: '#7a2a22', ember: '#ffb347',
                 strut: '#8a83a6', hot: '#fff4e2', cores: ['#e8a044', '#f0b45a', '#fff0d2'] };

// ---------------------------------------------------------------------------
// FIELD — the sunset. Per-section sky anchors [top, mid, horizon] and a sun
// ramp; floor / grid / silhouette / landmark tones derive from them at init so
// the whole section reads as one time of day.
// ---------------------------------------------------------------------------
const HY = 118;                 // horizon line on the 320x427 field
// [top indigo, mid violet, horizon burnt orange] — max channel 0x48 (72)
const SKY = [
  [[10, 9, 26], [24, 15, 42], [56, 30, 40]],   // 0 intro   — dusk indigo
  [[9, 11, 30], [28, 17, 48], [66, 34, 36]],   // 1 s1      — deeper violet
  [[13, 9, 24], [32, 16, 40], [72, 38, 32]],   // 2 s2      — burnt city dusk
  [[9, 9, 24], [22, 15, 46], [58, 30, 42]],    // 3 s3      — cool violet night
  [[14, 9, 22], [36, 17, 36], [72, 40, 28]],   // 4 s4      — orange midboss sky
  [[16, 11, 19], [40, 22, 28], [72, 44, 26]],  // 5 s5      — low sun, smog
  [[9, 12, 27], [24, 20, 48], [60, 38, 38]],   // 6 s6      — teal-free indigo
  [[9, 11, 32], [26, 18, 52], [66, 36, 38]],   // 7 s7      — approach, violet
  [[17, 9, 27], [42, 17, 44], [72, 42, 32]],   // 8 s8      — final sunset
];
// boss arena restain per phase (S3b): indigo night → red-shifted → white-hot dawn
const BOSS_SKY = [
  [[8, 9, 28], [20, 14, 48], [52, 28, 46]],
  [[20, 8, 14], [44, 14, 20], [78, 30, 22]],
  [[22, 18, 20], [46, 38, 36], [80, 66, 48]],
];
const SUN = [[172, 128, 56], [122, 54, 30]];        // gold crown → burnt-orange base (kept well under the bullet layer)
const BOSS_SUN = [[[150, 110, 70], [104, 52, 46]], [[178, 96, 40], [132, 40, 26]], [[186, 166, 128], [146, 96, 52]]];
// silhouette kind per section: 0 palms · 1 mountains · 2 skyline · 3 skyline+palms
const SIL = [3, 1, 2, 0, 2, 1, 2, 0, 3];
// landmark [x, w, h, kind] — kind 0 carrier deck · 1 dam · 2 hangar · 3 tower block
const LAND = [
  [110, 100, 58, 3], [38, 140, 66, 0], [88, 138, 78, 1], [58, 150, 62, 2], [98, 120, 86, 3],
  [30, 160, 58, 0], [70, 158, 82, 1], [80, 148, 68, 2], [58, 180, 92, 3],
];

// derived tone sets, built once
function tonesFor(sky, sun) {
  const hor = sky[2], top = sky[0];
  return {
    bands: bandsOf(sky),
    sun,
    floor: hx(mix(sc(top, 0.42), sc(hor, 0.10), 0.4)),
    floorFar: hx(mix(sc(top, 0.7), sc(hor, 0.24), 0.45)),
    grid: hx(sc(mix([62, 38, 112], hor, 0.28), 0.60)),
    gridNear: hx(sc(mix([62, 38, 112], hor, 0.28), 0.82)),
    sil: hx(sc(top, 0.42)),
    silHi: hx(mix(sc(top, 0.6), sc(hor, 0.5), 0.4)),
    lit: hx(mix([150, 92, 40], hor, 0.2)),
    lmDark: hx(mix([18, 15, 32], hor, 0.14)),
    lmMid: hx(mix([38, 32, 58], hor, 0.18)),
    lmHi: hx(mix([66, 58, 94], hor, 0.20)),
    lmLit: hx(mix([160, 100, 44], hor, 0.15)),
  };
}
function bandsOf(sky) {
  const n = 14, out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(hx(t < 0.5 ? mix(sky[0], sky[1], t * 2) : mix(sky[1], sky[2], (t - 0.5) * 2)));
  }
  return out;
}
const TONE = SKY.map((s) => tonesFor(s, SUN));
const BTONE = BOSS_SKY.map((s, i) => tonesFor(s, BOSS_SUN[i]));

// ---------------------------------------------------------------------------
// SKY CACHE — sky bands + sun + horizon silhouettes + water reflection are
// static per (section | boss phase), so they are painted once into an offscreen
// canvas and blitted. Per frame the background costs: 1 fill, 1 drawImage,
// ~16 grid rects, one stroked grid path, one landmark (S8 budget).
// ---------------------------------------------------------------------------
const SKYC = new Map();
function mkCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
// tiny deterministic LCG — silhouettes differ per section but never per frame
function lcg(seed) { let s = (seed * 1664525 + 1013904223) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) >>> 8) / 16777216; }

// foreground palm: leaning trunk that runs down past the horizon into the grid,
// with a drooping 8-frond crown. Pure silhouette (the sheet's framing device).
const FROND = [[-1, -0.5], [-0.78, -0.86], [-0.3, -1], [0.3, -1], [0.78, -0.86], [1, -0.5], [-0.95, 0.05], [0.95, 0.05]];
function palm(x, x2, base, top, T, flip) {
  const h = base - top, lean = flip ? -1 : 1;
  x2.fillStyle = T.sil;
  for (let i = 0; i < h; i++) {
    const t = i / h, bx = Math.round(x + lean * t * t * 8);
    x2.fillRect(bx, base - i, i > h - 8 ? 4 : 3, 1);
  }
  const cx = Math.round(x + lean * 8), cy = top, L = Math.round(h * 0.36);
  for (let f = 0; f < FROND.length; f++) {
    const dx = FROND[f][0], dy = FROND[f][1];
    for (let s = 1; s <= L; s++) {
      const t = s / L, w = t < 0.55 ? 3 : 2;
      x2.fillRect(Math.round(cx + dx * L * t), Math.round(cy + dy * L * t + t * t * L * 0.75), w, w);
    }
  }
  x2.fillRect(cx - 2, cy - 3, 5, 6);
}

function buildSky(key, T, silKind, seed, W) {
  const cv = mkCanvas(W, HY + 46), x2 = cv.getContext('2d');
  // banded sky (the sheet's stepped gradient, not a smooth ramp)
  for (let i = 0; i < T.bands.length; i++) {
    const y0 = Math.round((i * HY) / T.bands.length), y1 = Math.round(((i + 1) * HY) / T.bands.length);
    x2.fillStyle = T.bands[i]; x2.fillRect(0, y0, W, y1 - y0);
  }
  // the sun: half-set disc, gold crown → burnt orange, with widening slit cuts
  const R = 34, cx = W >> 1;
  for (let j = -R; j <= 0; j++) {
    const hw = Math.floor(Math.sqrt(R * R - j * j));
    if (hw <= 0) continue;
    const t = (j + R) / R;                            // 0 at crown, 1 at horizon
    const period = 10 - ((t * 6) | 0);                // slits tighten toward the base
    const cut = t < 0.28 ? 0 : Math.min(period - 1, 1 + ((t - 0.28) * 6) | 0);
    if (((j + R) % period) < cut) continue;
    x2.fillStyle = hx(mix(T.sun[0], T.sun[1], t));
    x2.fillRect(cx - hw, HY + j, hw * 2, 1);
  }
  // sun-on-water reflection below the horizon — dashes that thin as they near
  for (let i = 0; i < 10; i++) {
    const y = HY + 2 + i * 3, w = Math.round(26 - i * 2.4);
    if (w <= 1) break;
    x2.fillStyle = hx(mix(T.sun[1], [20, 12, 34], 0.45 + i * 0.05));
    x2.fillRect(cx - w, y, w * 2, 1);
  }
  // horizon silhouettes
  const rnd = lcg(seed + 7);
  if (silKind === 1) {                                 // mountain range
    x2.fillStyle = T.sil;
    for (let i = 0; i < 9; i++) {
      const px = Math.round(-20 + i * 44 + rnd() * 20), ph = 16 + Math.round(rnd() * 26), pw = 30 + Math.round(rnd() * 26);
      for (let r = 0; r < ph; r++) { const half = Math.round((pw / 2) * (1 - r / ph)); x2.fillRect(px - half, HY - r, half * 2, 1); }
    }
    x2.fillStyle = T.silHi;
    for (let i = 0; i < 9; i++) { const px = Math.round(-20 + i * 44 + 3); x2.fillRect(px - 6, HY - 14, 6, 1); }
  }
  if (silKind === 2 || silKind === 3) {                 // skyline
    for (let i = 0; i < 26; i++) {
      const bw = 5 + Math.round(rnd() * 12), bh = 8 + Math.round(rnd() * 34), bx = Math.round(i * 13 - 6 + rnd() * 4);
      x2.fillStyle = T.sil; x2.fillRect(bx, HY - bh, bw, bh);
      x2.fillStyle = T.silHi; x2.fillRect(bx, HY - bh, bw, 1);
      if (bh > 24) x2.fillRect(bx + (bw >> 1), HY - bh - 5, 1, 5);   // spire
      x2.fillStyle = T.lit;                                          // dim window dots
      for (let w = 0; w < 3; w++) { const wy = HY - Math.round(rnd() * (bh - 3)) - 2; x2.fillRect(bx + 2 + ((w * 4) % Math.max(1, bw - 3)), wy, 1, 1); }
    }
  }
  if (silKind === 0 || silKind === 3) {                 // foreground palms framing the field
    palm(4, x2, HY + 38, HY - 44, T, false); palm(W - 12, x2, HY + 40, HY - 50, T, true);
    palm(40, x2, HY + 14, HY - 22, T, false); palm(W - 48, x2, HY + 16, HY - 26, T, true);
  }
  SKYC.set(key, cv); return cv;
}

// ---------------------------------------------------------------------------
// LANDMARKS — chrome-lit structures that rise out of the horizon and pass the
// player. Three washed tones + 1px amber lights; large, never bright (§7).
// ---------------------------------------------------------------------------
function landmark(c, kind, x, y, w, h, T) {
  const R = Math.round;
  c.fillStyle = T.lmDark; c.fillRect(x, y, w, h);
  if (kind === 0) {                                    // CARRIER DECK
    const dy = y + R(h * 0.18), dh = h - R(h * 0.18);
    c.fillStyle = T.lmMid; c.fillRect(x + 6, dy, w - 12, dh);
    c.fillStyle = T.lmHi; c.fillRect(x + 6, dy, w - 12, 1); c.fillRect(x + 6, dy, 1, dh);
    c.fillStyle = T.lmDark;                            // angled deck stripe
    for (let i = 0; i < dh; i += 2) c.fillRect(x + 14 + R(i * 0.5), dy + i, R(w * 0.42), 1);
    c.fillStyle = T.lmHi;                              // centreline dashes
    for (let i = 4; i < dh - 4; i += 8) c.fillRect(x + R(w * 0.36), dy + i, 2, 4);
    c.fillStyle = T.lmMid; c.fillRect(x + w - 26, y + 2, 18, R(h * 0.46));   // island
    c.fillStyle = T.lmHi; c.fillRect(x + w - 26, y + 2, 18, 1); c.fillRect(x + w - 20, y - 8, 1, 10);
    c.fillStyle = T.lmLit;
    for (let i = 0; i < w - 12; i += 11) { c.fillRect(x + 6 + i, dy + 1, 1, 1); c.fillRect(x + 6 + i, y + h - 2, 1, 1); }
    for (let i = 0; i < 3; i++) c.fillRect(x + w - 23 + i * 6, y + 6, 2, 1);
  } else if (kind === 1) {                             // DAM FACE
    c.fillStyle = T.lmMid;
    for (let i = 0; i < h; i++) { const in_ = R((i / h) * 12); c.fillRect(x + 12 - in_, y + i, w - 24 + in_ * 2, 1); }
    c.fillStyle = T.lmHi; c.fillRect(x + 12, y, w - 24, 2);                  // crest
    c.fillStyle = T.lmDark;
    for (let s = 0; s < 3; s++) {                                            // spillway channels
      const sx = x + R(w * (0.28 + s * 0.22));
      for (let i = 6; i < h; i++) { const sp = R((i / h) * 5); c.fillRect(sx - 5 - sp, y + i, 10 + sp * 2, 1); }
    }
    c.fillStyle = T.lmHi;
    for (let s = 0; s < 3; s++) { const sx = x + R(w * (0.28 + s * 0.22)); for (let i = 6; i < h; i += 2) c.fillRect(sx, y + i, 1, 1); }
    c.fillStyle = T.lmMid; c.fillRect(x, y + 2, 14, R(h * 0.5)); c.fillRect(x + w - 14, y + 2, 14, R(h * 0.5)); // abutments
    c.fillStyle = T.lmLit;
    for (let i = 0; i < w - 24; i += 13) c.fillRect(x + 12 + i, y + 3, 1, 1);
  } else if (kind === 2) {                             // HANGAR
    const ah = R(h * 0.55);
    c.fillStyle = T.lmMid;
    for (let i = 0; i < ah; i++) { const half = R((w / 2) * Math.sqrt(1 - ((ah - i) / ah) * ((ah - i) / ah))); c.fillRect(x + (w >> 1) - half, y + i, half * 2, 1); }
    c.fillStyle = T.lmHi;
    for (let i = 0; i < ah; i += 6) { const half = R((w / 2) * Math.sqrt(1 - ((ah - i) / ah) * ((ah - i) / ah))); c.fillRect(x + (w >> 1) - half, y + i, 2, 1); }
    c.fillStyle = T.lmMid; c.fillRect(x + 4, y + ah, w - 8, h - ah);
    c.fillStyle = T.lmHi; c.fillRect(x + 4, y + ah, w - 8, 1);
    c.fillStyle = T.lmDark; c.fillRect(x + R(w * 0.28), y + ah + 4, R(w * 0.44), h - ah - 4);  // door
    c.fillStyle = T.lmMid; c.fillRect(x + R(w * 0.5), y + ah + 4, 1, h - ah - 4);
    c.fillStyle = T.lmMid; c.fillRect(x + 2, y + h - 16, 16, 16); c.fillRect(x + w - 18, y + h - 16, 16, 16);
    c.fillStyle = T.lmLit;
    for (let i = 0; i < 4; i++) c.fillRect(x + R(w * 0.30) + i * R(w * 0.13), y + ah + 5, 1, 3);
    c.fillRect(x + 8, y + h - 13, 2, 1); c.fillRect(x + w - 12, y + h - 13, 2, 1);
  } else {                                             // TOWER BLOCK
    const seg = [[0.00, 1.00, 0.34], [0.14, 0.72, 0.34], [0.28, 0.44, 0.32]];
    for (let s = 2; s >= 0; s--) {
      const sx = x + R(w * seg[s][0]), sw = R(w * seg[s][1]), sy = y + R(h * (1 - seg[s][2] - s * 0.29)), sh = h - (sy - y);
      c.fillStyle = s === 0 ? T.lmMid : T.lmDark; c.fillRect(sx, sy, sw, sh);
      c.fillStyle = T.lmHi; c.fillRect(sx, sy, sw, 1); c.fillRect(sx, sy, 1, sh);
      c.fillStyle = T.lmLit;
      for (let r = 4; r < sh - 2; r += 7) for (let q = 3; q < sw - 2; q += 9) c.fillRect(sx + q, sy + r, 1, 1);
    }
    c.fillStyle = T.lmHi; c.fillRect(x + R(w * 0.44), y - 12, 1, 12); c.fillRect(x + R(w * 0.56), y - 7, 1, 7);
    c.fillStyle = T.lmLit; c.fillRect(x + R(w * 0.44), y - 12, 1, 1);
  }
}

// ---------------------------------------------------------------------------
function drawBackground(ctx, g, bgScroll, sec, bossPhase, K, secT = 0) {
  const { W, H } = K;
  const boss = bossPhase >= 0;
  const T = boss ? BTONE[bossPhase] : TONE[sec];
  const key = boss ? 'b' + bossPhase : 's' + sec;

  // floor (below the horizon) — near ground darker than the far ground
  ctx.fillStyle = T.floorFar; ctx.fillRect(-20, HY - 4, W + 40, H - HY + 24);
  ctx.fillStyle = T.floor; ctx.fillRect(-20, HY + Math.round((H - HY) * 0.35), W + 40, H + 20);

  // perspective grid: horizontals rush toward the player, verticals converge
  const N = 16, ph = ((bgScroll * 0.011) % 1 + 1) % 1, span = H - HY;
  for (let i = 0; i < N; i++) {
    const t = (i + ph) / N, y = HY + Math.round(span * t * t);
    if (y <= HY) continue;
    ctx.fillStyle = t > 0.7 ? T.gridNear : T.grid;
    ctx.fillRect(0, y, W, 1);
  }
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  ctx.beginPath();
  const vx = (W >> 1) + 0.5;
  for (let k = -6; k <= 6; k++) { ctx.moveTo(vx, HY + 0.5); ctx.lineTo(vx + k * 58, H + 0.5); }
  ctx.stroke();

  // sky + sun + silhouettes (cached; static per section / boss phase)
  ctx.drawImage(SKYC.get(key) || buildSky(key, T, boss ? 2 : SIL[sec], boss ? 40 + bossPhase : sec, W), 0, 0);

  // the landmark rises out of the horizon and passes the player (field sections only)
  if (!boss) {
    const [lx, lw, lh, kind] = LAND[sec];
    const prog = (g.stageT - secT) * 0.55;               // px travelled since the section opened
    const k = 0.45 + Math.min(1.05, prog / 260);               // and it grows as it nears (perspective)
    const lw2 = Math.round(lw * k), lh2 = Math.round(lh * k);
    const lx2 = Math.round(lx + lw / 2 - lw2 / 2);
    const ly = HY + Math.round(prog) - lh2;
    if (ly < H && ly + lh2 > HY) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, HY - 1, W, H - HY + 1); ctx.clip();
      landmark(ctx, kind, lx2, ly, lw2, lh2, T);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// scanlines — baked at 0.10 alpha into one cached overlay (cap is 0.12).
// ---------------------------------------------------------------------------
let SCAN = null;
function post(ctx, g, K) {
  const { W, H } = K;
  if (!SCAN) {
    SCAN = mkCanvas(W, H);
    const x2 = SCAN.getContext('2d');
    x2.fillStyle = 'rgba(0,0,0,0.10)';
    for (let y = 0; y < H; y += 3) x2.fillRect(0, y, W, 1);
  }
  ctx.drawImage(SCAN, 0, 0);
}

// ---------------------------------------------------------------------------
function rimOf(type, phase) {
  if (type === 0) return phase === 1 ? HEAVY.out : phase === 3 ? GROUND.out : AIR.out;
  if (type === 1) return AIR.out;
  if (type === 2) return GROUND.out;
  return HEAVY.out;
}

export const TURRET_PLATE = [[-9, -13], [9, -13], [13, -9], [13, 9], [9, 13], [-9, 13], [-13, 9], [-13, -9]];

// ---------------------------------------------------------------------------
// ENEMIES — chrome military craft, three tones + rim, warm engine glow. Drawn
// nose-DOWN (+y); the flying types rotate themselves by step*K.STEP.
// hit ⇒ every fill white · flick ⇒ dim flat armour fill (rule 5).
// ---------------------------------------------------------------------------
function paintEnemy(ctx, type, phase, side, step, prop, hit, flick, extra, K, lvl = 0, tell = 0) { // r81: tell = sealed (renderer drawEnemy) — the cannon's muzzle is capped
  const { poly, disc, STEP } = K;
  const F = (c) => { ctx.fillStyle = hit ? UI.white : c; };
  const S = (c) => F(flick ? BOSS.armor : c);
  const G = () => S(prop ? ENG.hot : ENG.mid);   // 2-frame engine glow (bible §8)
  switch (type) {
    case 0: {
      ctx.rotate(step * STEP);
      if (phase === 2) {            // CROSSER — flat lenticular blade, very wide, very thin
        S(AIR.shade); poly(ctx, [[0, 9], [7, 3], [13, -1], [7, -5], [0, -7], [-7, -5], [-13, -1], [-7, 3]]);
        S(AIR.base); poly(ctx, [[0, 8], [4, 1], [2, -5], [-2, -5], [-4, 1]]);
        S(AIR.hi); ctx.fillRect(-12, -1, 24, 1);
        S(AIR.glass); ctx.fillRect(-3, 1, 6, 1);
        G(); ctx.fillRect(-4, -6, 8, 1);
      } else if (phase === 3) {     // RISER — stubby lifter, twin outboard nozzle pods
        S(GROUND.shade); poly(ctx, [[0, 11], [6, 4], [6, -6], [-6, -6], [-6, 4]]);
        S(GROUND.shade); ctx.fillRect(-10, -6, 4, 11); ctx.fillRect(6, -6, 4, 11);
        S(GROUND.base); poly(ctx, [[0, 9], [4, 3], [4, -5], [-4, -5], [-4, 3]]);
        S(GROUND.base); ctx.fillRect(-9, -5, 3, 9); ctx.fillRect(6, -5, 3, 9);
        S(GROUND.hi); ctx.fillRect(-10, -6, 4, 1); ctx.fillRect(6, -6, 4, 1); ctx.fillRect(-4, -5, 8, 1);
        S(AIR.glass); ctx.fillRect(-2, 3, 4, 3);
        G(); ctx.fillRect(-10, -8, 4, 2); ctx.fillRect(6, -8, 4, 2);
        if (extra && prop) { S(GROUND.exhaust); poly(ctx, [[-10, -9], [-6, -9], [-8, -15]]); poly(ctx, [[6, -9], [10, -9], [8, -15]]); }
      } else if (phase === 1) {     // DIVER — forward-swept, burnt-orange band, blunt nose
        S(HEAVY.shade); poly(ctx, [[0, 10], [9, 5], [8, -1], [4, -9], [-4, -9], [-8, -1], [-9, 5]]);
        S(HEAVY.base); poly(ctx, [[0, 12], [4, 3], [4, -8], [-4, -8], [-4, 3]]);
        S(HEAVY.stripe); ctx.fillRect(-4, -1, 8, 2);
        S(HEAVY.hi); ctx.fillRect(-8, -1, 16, 1);
        S(AIR.glass); ctx.fillRect(-1, 4, 2, 3);
        G(); ctx.fillRect(-3, -10, 2, 2); ctx.fillRect(1, -10, 2, 2);
      } else {                      // FIGHTER — swept delta with twin canted fins
        S(AIR.shade); poly(ctx, [[0, 6], [9, -1], [10, -9], [4, -6], [-4, -6], [-10, -9], [-9, -1]]);
        S(AIR.base); poly(ctx, [[0, 12], [3, 1], [3, -9], [0, -11], [-3, -9], [-3, 1]]);
        S(AIR.hi); ctx.fillRect(-9, -1, 18, 1); ctx.fillRect(-3, -9, 6, 1);
        S(AIR.glass); ctx.fillRect(-1, 3, 2, 3);
        G(); ctx.fillRect(-2, -11, 4, 2);
      }
      break;
    }
    case 1: {                       // MID — twin nacelle interceptor, tall fins
      ctx.rotate(step * STEP);
      S(AIR.shade); ctx.fillRect(-15, -4, 30, 5);
      S(AIR.shade); ctx.fillRect(-13, -10, 7, 17); ctx.fillRect(6, -10, 7, 17);
      S(AIR.shade); ctx.fillRect(-9, -15, 2, 6); ctx.fillRect(7, -15, 2, 6);
      S(AIR.base); ctx.fillRect(-12, -9, 5, 15); ctx.fillRect(7, -9, 5, 15);
      S(AIR.base); poly(ctx, [[0, 14], [4, 4], [4, -10], [0, -13], [-4, -10], [-4, 4]]);
      S(AIR.hi); ctx.fillRect(-15, -4, 30, 1); ctx.fillRect(-12, -9, 5, 1); ctx.fillRect(7, -9, 5, 1);
      S(AIR.shade); ctx.fillRect(-12, -1, 5, 1); ctx.fillRect(7, -1, 5, 1);
      S(AIR.glass); ctx.fillRect(-2, 3, 4, 4);
      G(); ctx.fillRect(-12, -11, 5, 2); ctx.fillRect(7, -11, 5, 2);
      break;
    }
    case 2: {                       // TURRET — chrome bunker, amber slits, long cannon
      const angry = extra >= K.STEPS, barrel = (extra % K.STEPS) * STEP;
      if (!hit) { ctx.save(); ctx.translate(2, 3); S(GROUND.out); poly(ctx, TURRET_PLATE); ctx.restore(); }
      S(GROUND.plate); poly(ctx, TURRET_PLATE);
      S(GROUND.shade); ctx.fillRect(-11, -12, 22, 3);
      S(angry ? HEAVY.stripe : ENG.mid); ctx.fillRect(-9, 10, 5, 2); ctx.fillRect(4, 10, 5, 2); ctx.fillRect(-2, 11, 4, 2);
      S(GROUND.shade); disc(ctx, 0, 0, 9);
      S(angry ? HEAVY.stripe : GROUND.base); disc(ctx, -1, -1, 7);
      S(GROUND.hi); ctx.fillRect(-5, -6, 4, 2);
      ctx.save(); ctx.rotate(barrel); if (tell) ctx.scale(0.65, 1); // r81 tell: retracted along its axis
      S(GROUND.shade); ctx.fillRect(0, -3, 16, 6);
      S(GROUND.base); ctx.fillRect(3, -2, 13, 4);
      if (!tell) { S(GROUND.hi); ctx.fillRect(3, -2, 13, 1); }
      S(GROUND.shade); ctx.fillRect(13, -3, 3, 6); if (tell) { S(GROUND.out); ctx.fillRect(14, -3, 2, 6); } // r81 tell: muzzle capped, no highlight
      ctx.restore();
      break;
    }
    case 3: {                       // ELITE — swept-wing bomber, four engine pods
      ctx.rotate(step * STEP);
      S(HEAVY.shade); poly(ctx, [[-22, -8], [-6, -2], [6, -2], [22, -8], [19, 3], [7, 6], [-7, 6], [-19, 3]]);
      S(HEAVY.shade); ctx.fillRect(-10, -19, 3, 7); ctx.fillRect(7, -19, 3, 7);
      S(HEAVY.base); poly(ctx, [[0, 20], [6, 8], [6, -14], [3, -19], [-3, -19], [-6, -14], [-6, 8]]);
      S(HEAVY.base); for (const x of [-18, -11, 6, 13]) ctx.fillRect(x, -9, 5, 13);
      S(HEAVY.hi); for (const x of [-18, -11, 6, 13]) ctx.fillRect(x, -9, 5, 1);
      S(HEAVY.stripe); ctx.fillRect(-22, -4, 6, 2); ctx.fillRect(16, -4, 6, 2);
      S(HEAVY.hi); ctx.fillRect(-22, -8, 44, 1); ctx.fillRect(-6, -14, 1, 22);
      S(AIR.glass); ctx.fillRect(-2, 8, 4, 5);
      G(); for (const x of [-18, -11, 6, 13]) ctx.fillRect(x, -11, 5, 2);
      break;
    }
    case 4: {                       // MIDBOSS — chrome manta, chevron spine, strip lights
      S(HEAVY.shade); poly(ctx, [[0, -24], [17, -15], [31, 1], [16, 15], [0, 23], [-16, 15], [-31, 1], [-17, -15]]);
      S(HEAVY.base); poly(ctx, [[0, -21], [15, -13], [27, 1], [14, 13], [0, 20], [-14, 13], [-27, 1], [-15, -13]]);
      S(HEAVY.shade); poly(ctx, [[0, 24], [8, 8], [8, -14], [0, -20], [-8, -14], [-8, 8]]);
      S(HEAVY.hi); poly(ctx, [[0, -21], [15, -13], [14, -11], [0, -19], [-14, -11], [-15, -13]]);
      for (let i = 0; i < 3; i++) {   // chevron stack down the spine
        const y = -6 + i * 7;
        S(HEAVY.hi); poly(ctx, [[0, y], [7, y + 6], [7, y + 8], [0, y + 2], [-7, y + 8], [-7, y + 6]]);
      }
      S(phase === 1 ? HEAVY.core : HEAVY.shade); poly(ctx, [[0, -14], [5, -8], [0, -1], [-5, -8]]);
      S(HEAVY.stripe); ctx.fillRect(-28, -2, 7, 2); ctx.fillRect(21, -2, 7, 2);
      G(); ctx.fillRect(-23, 4, 2, 8); ctx.fillRect(21, 4, 2, 8);
      G(); ctx.fillRect(-9, -21, 4, 2); ctx.fillRect(5, -21, 4, 2);
      break;
    }
    case 5: {                       // BOSS — three forms, visible modules (bible §10)
      const burning = extra > 0;
      const body = burning ? (extra === 2 ? BOSS.burnA : BOSS.burnB) : (flick ? BOSS.armor : BOSS.hull);
      const shade = burning ? BOSS.burnB : (flick ? BOSS.armor : HEAVY.shade);
      const core = burning ? BOSS.ember : BOSS.cores[phase];
      const glow = burning ? BOSS.ember : (prop ? ENG.hot : ENG.mid);
      if (phase === 0) {            // P1 — winged carrier with detachable side pods
        F(shade); poly(ctx, [[-19, -16], [-48, 1], [-45, 16], [-18, 18]]);       // swept carrier wings
        F(shade); poly(ctx, [[19, -16], [48, 1], [45, 16], [18, 18]]);
        F(body); poly(ctx, [[-20, -12], [-43, 1], [-41, 12], [-19, 14]]);
        F(body); poly(ctx, [[20, -12], [43, 1], [41, 12], [19, 14]]);
        F(shade); ctx.fillRect(-41, 5, 23, 2); ctx.fillRect(18, 5, 23, 2);
        F(body); poly(ctx, [[0, -32], [15, -24], [21, 0], [17, 24], [-17, 24], [-21, 0], [-15, -24]]);
        F(shade); ctx.fillRect(-21, -6, 42, 2); ctx.fillRect(-18, 10, 36, 2);    // hull panel lines
        F(shade); ctx.fillRect(-9, -24, 18, 2);
        F(BOSS.strut); ctx.fillRect(-42, -12, 12, 15); ctx.fillRect(30, -12, 12, 15);  // pods (part mounts, ±36)
        F(shade); ctx.fillRect(-42, -12, 12, 1); ctx.fillRect(30, -12, 12, 1);
        F(glow); ctx.fillRect(-40, 1, 8, 2); ctx.fillRect(32, 1, 8, 2);
        F(core); poly(ctx, [[0, -14], [11, 4], [0, 16], [-11, 4]]);
        F(BOSS.hot); poly(ctx, [[0, -6], [5, 3], [0, 9], [-5, 3]]);
        F(glow); for (const x of [-13, -5, 3, 11]) ctx.fillRect(x, -36, 4, 5);   // four nozzles
      } else if (phase === 1) {     // P2 — flat armoured slab, big core, turret nubs
        F(body); poly(ctx, [[-25, -26], [25, -26], [35, -8], [35, 8], [25, 26], [-25, 26], [-35, 8], [-35, -8]]);
        F(shade); ctx.fillRect(-35, -10, 70, 2); ctx.fillRect(-35, 8, 70, 2);
        F(shade); ctx.fillRect(-14, -26, 2, 52); ctx.fillRect(12, -26, 2, 52);
        F(BOSS.strut); ctx.fillRect(-8, -26, 16, 8);                              // raised spine
        F(shade); for (const x of [-31, -20, 17, 27]) ctx.fillRect(x, -22, 6, 6); // turret nubs
        F(shade); for (const x of [-31, -20, 17, 27]) ctx.fillRect(x, 16, 6, 6);
        F(body); ctx.fillRect(-40, -6, 6, 14); ctx.fillRect(34, -6, 6, 14);       // side modules (part mounts)
        F(core); poly(ctx, [[0, -16], [11, -9], [15, 0], [11, 9], [0, 16], [-11, 9], [-15, 0], [-11, -9]]);
        F(BOSS.hot); poly(ctx, [[0, -8], [6, -4], [8, 0], [6, 4], [0, 8], [-6, 4], [-8, 0], [-6, -4]]);
        F(glow); for (const x of [-11, -2, 7]) ctx.fillRect(x, -30, 5, 5);        // three nozzles
        F(glow); ctx.fillRect(-38, 6, 4, 2); ctx.fillRect(34, 6, 4, 2);
      } else {                      // P3 — bare X-frame around a blazing core
        for (const s of [-1, 1]) for (const t of [-1, 1]) {
          F(shade); poly(ctx, [[s * 3, t * 3], [s * 34, t * 27], [s * 40, t * 21], [s * 9, t * -3]]);
          F(body); poly(ctx, [[s * 4, t * 4], [s * 33, t * 25], [s * 36, t * 22], [s * 8, t * 0]]);
        }
        F(BOSS.strut); ctx.fillRect(-26, -2, 52, 4); ctx.fillRect(-2, -26, 4, 52);
        F(glow); poly(ctx, [[-40, -24], [-34, -30], [-28, -24], [-34, -19]]);
        F(glow); poly(ctx, [[40, -24], [34, -30], [28, -24], [34, -19]]);
        F(glow); poly(ctx, [[-40, 24], [-34, 30], [-28, 24], [-34, 19]]);
        F(glow); poly(ctx, [[40, 24], [34, 30], [28, 24], [34, 19]]);
        F(core); poly(ctx, [[0, -20], [14, -12], [19, 0], [14, 12], [0, 20], [-14, 12], [-19, 0], [-14, -12]]);
        F(BOSS.hot); poly(ctx, [[0, -11], [8, -6], [11, 0], [8, 6], [0, 11], [-8, 6], [-11, 0], [-8, -6]]);
        F(UI.white); ctx.fillRect(-3, -3, 6, 6);
      }
      break;
    }
    case 6: {                       // PART — a piece of the form it rides
      const glow = prop ? ENG.hot : ENG.mid;
      S(BOSS.hull);
      if (phase === 0) {            // pod segment torn off the carrier wing
        poly(ctx, [[side * -3, -10], [side * 7, -8], [side * 9, 5], [side * 1, 9], [side * -5, 1]]);
        S(HEAVY.shade); ctx.fillRect(side > 0 ? -3 : -7, -3, 10, 1);
        F(glow); ctx.fillRect(side * 3 - 2, 3, 4, 3);
      } else if (phase === 1) {     // armour block off the slab
        ctx.fillRect(-8, -8, 16, 16);
        S(HEAVY.shade); ctx.fillRect(-8, -2, 16, 1); ctx.fillRect(-2, -8, 1, 16);
        F(glow); ctx.fillRect(-4, 2, 8, 3);
      } else {                      // arm-tip nozzle off the X
        poly(ctx, [[0, -9], [7, -2], [5, 8], [-5, 8], [-7, -2]]);
        S(HEAVY.shade); ctx.fillRect(-5, -3, 10, 1);
        F(glow); poly(ctx, [[0, -6], [4, 0], [0, 5], [-4, 0]]);
        F(UI.white); ctx.fillRect(-1, -1, 2, 2);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// SHIP — the ship-logo craft: white hull, violet panels, forward-swept canards,
// 28px span. The renderer adds the dark rim, the hull-light top edge and the dot.
// ---------------------------------------------------------------------------
function paintShip(c, K) {
  const { poly } = K;
  c.fillStyle = SHIP.shade; poly(c, [[-14, 11], [-5, 3], [5, 3], [14, 11], [11, 15], [-11, 15]]);
  c.fillStyle = SHIP.shade; poly(c, [[-9, 1], [-14, 6], [-13, 8], [-7, 4]]); poly(c, [[9, 1], [14, 6], [13, 8], [7, 4]]);
  c.fillStyle = SHIP.hull;  poly(c, [[0, -17], [4, -8], [13, 11], [5, 8], [0, 12], [-5, 8], [-13, 11], [-4, -8]]);
  c.fillStyle = SHIP.edge;  poly(c, [[4, -8], [13, 11], [11, 11], [3, -6]]); poly(c, [[-4, -8], [-13, 11], [-11, 11], [-3, -6]]);
  c.fillStyle = SHIP.shade; poly(c, [[0, -13], [3, -5], [3, 6], [-3, 6], [-3, -5]]);
  c.fillStyle = SHIP.edge;  c.fillRect(-1, -11, 2, 5);
  c.fillStyle = SHIP.dark;  c.fillRect(-2, 12, 4, 4);
}

// gold pickup: a tiny outrun sun (slit cuts) so value reads at a glance
function paintItem(c, r, K) {
  const { disc } = K;
  c.fillStyle = ITEM.rim; disc(c, 0, 0, r);
  c.fillStyle = ITEM.gold; disc(c, 0, 0, Math.round(r * 0.78));
  c.fillStyle = ITEM.rim;
  const w = Math.round(r * 0.7);
  c.fillRect(-w, 1, w * 2, 1);
  if (r >= 8) c.fillRect(-Math.round(r * 0.5), 4, Math.round(r * 0.5) * 2, 1);
  c.fillStyle = ITEM.glint;
  const hl = Math.max(2, Math.round(r * 0.3));
  c.fillRect(-Math.round(r * 0.4), -Math.round(r * 0.45), hl, hl);
}

export default {
  id: 'synthwave', name: 'synthwave',
  pal: { AIR, GROUND, HEAVY, SHIP, ITEM, UI, BOSS },
  span: [32, 48, 40, 66, 72, 100, 32],
  rimOf, drawBackground, paintEnemy, paintShip, paintItem, post,
};
