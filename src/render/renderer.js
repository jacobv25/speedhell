// Canvas2D renderer. Visibility rules from rubric S2: washed-out low-contrast
// background; bullets pair dark rims with bright cores; consistent language
// (pink rounds = static/random, cyan needles = aimed); bullets on top.
// r57 (ART_BIBLE Round 1, renderer-only): named palette (§3), pixel grid (§2),
// per-family 1px rims via an offscreen sprite cache (§4), pixel-disc bullets
// and items (§5). Core, hitboxes, timeline, g.rng and the referee untouched.
import { W, H, PLAYER, FX } from '../core/game.js';

// r50 lab: presentation prefs the shell may switch live (src/lab.js writes
// them). The renderer stays DOM-free; headless harnesses get the defaults.
// speedPopup: 'both' = SPEED +1600 · 'num' = +1600 · 'word' = SPEED · 'off'
// fxSize: draw-size multiplier on every explosion particle (r51 experiment)
// fxStyle: 'classic' · 'bloom' (halos, streak sparks, hotter core) · 'heavy'
//          (bloom + second shockwave + darker longer smoke + bigger debris) ·
//          'chunky' (r52: the Lazy Devs/CAVE recipe — spawned in core, see
//          explodeChunky; here it means opaque shaded blobs + pixel snapping)
// Renderer-only: particle counts, positions and the fx rng are untouched, and
// everything still draws BELOW bullets (S2 — explosions never mask threats).
// speedDress: r53 — transported to core as g.fxMeta by main.js (renderer ignores it)
export const prefs = { speedPopup: 'both', fxSize: 1, fxStyle: 'classic', speedDress: 0 };

// ---------------------------------------------------------------------------
// PALETTE (ART_BIBLE §3). The only hex literals in this file live in this block
// and the fx/section tables below it. Exclusivity: pink + cyan are bullets (and
// the boss cores/parts that fire them), gold is value, violet is the player,
// white is bullet cores / hit-flash / the player hull highlight. Values are
// the r56 ones — Round 1 names first, retunes second (bible §3).
// ---------------------------------------------------------------------------
const AIR    = { out: '#2a2f45', shade: '#5c6584', base: '#8d97b4', hi: '#c9d1e8', glass: '#eef1f8' };
const GROUND = { out: '#2a2816', plate: '#34321f', shade: '#5f5c3e', base: '#9a9678', hi: '#c6c2a2', exhaust: '#d9c08a' };
const HEAVY  = { out: '#22242e', shade: '#474c60', base: '#7a8097', hi: '#aab1c8', stripe: '#8a5a52', core: '#f0e6c8' };
const SHIP   = { dark: '#4a3f78', shade: '#6b5aa8', edge: '#c9bdf5', hull: '#f0ecff', shot: '#c3a8ff', well: '#241f38', dot: '#e8e2ff' };
const ROUND  = { rim: '#20060f', ring: '#ff4fa3', ringHi: '#ff8ec4', core: '#ffe6f2' };
const NEEDLE = { rim: '#031418', body: '#37d6e0', core: '#e8feff' };
const ITEM   = { rim: '#0e0c04', gold: '#ffd24a', glint: '#fff6d0' };
const UI     = { text: '#cdd3e8', dim: '#8a8fa8', score: '#e8ecf8', lives: '#e8f6ff', white: '#ffffff',
                 gold: ITEM.gold, warn: ROUND.ring, warnHi: ROUND.ringHi, warnBand: '#14040a', warnText: ROUND.core,
                 hudBack: 'rgba(6,8,14,0.55)', bannerBack: 'rgba(6,8,14,0.72)', bombFlash: '#dff6ff' };
// Boss surface is Round 2 (bible §10); Round 1 only names what r56 drew.
const BOSS   = { hull: '#c8cde0', armor: '#3a3f55', burnA: '#e0604a', burnB: '#7a2a22', ember: '#ffb347', strut: '#8a8fa8', hot: '#fff6f0',
                 cores: [ROUND.ring, NEEDLE.body, ITEM.gold] };
export const PAL = { AIR, GROUND, HEAVY, SHIP, ROUND, NEEDLE, ITEM, UI, BOSS };

// r8-fx explosion palette, indexed [family][heat stop 0=hot … 3=cool] by the
// particle's remaining life. Lookup tables: no string building in the hot loop (S8).
// (FX family — bible §3 "as tabled"; explosions are Round 5.)
const FX_RAMP = [
  ['#ffffff', '#e8dcff', '#b49aff', '#6a4fc0'], // 0 WHITE/violet — player
  ['#ffffff', '#ffe27a', '#ff9a3c', '#c8401e'], // 1 ORANGE — default kill
  ['#ffffff', '#c8f4ff', '#7fd8ff', '#2f7fb0'], // 2 CYAN — chevron kill / bullet cancel
  ['#ffd27a', '#ff8a4a', '#e0503a', '#7a2a22'], // 3 BURN — boss handoff embers
];
const FX_SMOKE = ['#3a3648', '#2c2a38', '#2a3038', '#3a2424'];
// r52 chunky blob colour clock, [family][stage] = [rim, mid, highlight]; stage
// 0 white flash → 1 yellow → 2 orange → 3 dark red → 4 grey smoke (Lazy Devs
// "Better Explosions": white/yellow/orange/dark-red/grey, per-particle offset)
const CH_SMOKE = ['#262432', '#34303f', '#46424f'];
const CH_RAMP = [
  [['#ffffff', '#ffffff', '#ffffff'], ['#b49aff', '#e8dcff', '#ffffff'], ['#6a4fc0', '#b49aff', '#e8dcff'], ['#3a2a70', '#6a4fc0', '#b49aff'], CH_SMOKE],
  [['#ffffff', '#ffffff', '#ffffff'], ['#ff9a3c', '#ffe27a', '#ffffff'], ['#c8401e', '#ff9a3c', '#ffe27a'], ['#7a2a22', '#c8401e', '#ff9a3c'], CH_SMOKE],
  [['#ffffff', '#ffffff', '#ffffff'], ['#7fd8ff', '#c8f4ff', '#ffffff'], ['#2f7fb0', '#7fd8ff', '#c8f4ff'], ['#1a4a70', '#2f7fb0', '#7fd8ff'], CH_SMOKE],
  [['#ffd27a', '#ffd27a', '#ffffff'], ['#ff8a4a', '#ffd27a', '#ffffff'], ['#e0503a', '#ff8a4a', '#ffd27a'], ['#7a2a22', '#e0503a', '#ff8a4a'], CH_SMOKE],
];
const CH_STAGE_AT = [3, 9, 15, 22]; // age thresholds (frames) for stages 1..4 (white / yellow / orange / dark red / smoke)
const FX_DEBRIS = ['#c8bfe8', '#d07a3a', '#5fb4d8', '#b0503a'];

let displayScore = 0; // ticks up toward real score [BOGHOG_CRAFT]

// FIELD family (bible §3): section place-identity (r5 S5-SHOULD-1) — each stage
// section gets its own subtle background accent — hue-shifted slabs/stars near
// the base wash values, plus one large landmark slab that scrolls through as
// the section plays. Purely renderer-side (keyed off g.stageT); values stay
// washed-out so the background never competes with the bullet layer (S2-MUST-1).
// Entry stageT per section: intro / s1..s8.
const FIELD_BG = '#0a0c14';
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

// ---------------------------------------------------------------------------
// PIXEL GRID + SPRITE CACHE (bible §2, §4).
// Every sprite is painted ONCE into an offscreen canvas per (type, variant,
// heading step, flags), alpha-thresholded so anti-aliased polygon edges become
// hard pixels, rimmed with its family's `out` colour at the four 1px offsets,
// then drawImage'd at an integer origin. Rims cost nothing per frame and the
// per-enemy draw drops from ~10 fills to one drawImage (S8).
// ---------------------------------------------------------------------------
const CACHE = new Map();
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function crisp(cv) { // §2.5: no anti-aliasing side effects — edge pixels are on or off
  const x = cv.getContext('2d'), im = x.getImageData(0, 0, cv.width, cv.height), d = im.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 128 ? 0 : 255;
  x.putImageData(im, 0, 0);
}
// paint(ctx) draws the sprite centred on the origin. rim: 1px outline colour
// (null = none). topLight: replaces the rim on the top edge (player hull rim, §4).
function sprite(key, span, rim, paint, topLight) {
  let s = CACHE.get(key); if (s) return s;
  const size = span + 4, o = size >> 1;
  const body = makeCanvas(size, size), bx = body.getContext('2d');
  bx.translate(o, o); paint(bx); crisp(body);
  const out = makeCanvas(size, size), ox = out.getContext('2d');
  if (rim) {
    const m = makeCanvas(size, size), mx = m.getContext('2d');
    mx.drawImage(body, 0, 0); mx.globalCompositeOperation = 'source-in';
    mx.fillStyle = rim; mx.fillRect(0, 0, size, size);
    ox.drawImage(m, 1, 0); ox.drawImage(m, -1, 0); ox.drawImage(m, 0, 1);
    if (topLight) { mx.fillStyle = topLight; mx.fillRect(0, 0, size, size); }
    ox.drawImage(m, 0, -1);
  }
  ox.drawImage(body, 0, 0);
  s = { img: out, o }; CACHE.set(key, s); return s;
}
// Pixel discs (§2.3): a row-span table per radius — a pixel is in when its
// centre lies inside r about an integer origin, so disc(r) matches arc(r)'s
// footprint without the soft edge. Fractional r keeps the r20 bullet sizes.
const DISC = new Map();
function discSpans(r) {
  let s = DISC.get(r); if (s) return s; s = [];
  const n = Math.ceil(r);
  for (let j = -n; j < n; j++) {
    const cy = j + 0.5, h = r * r - cy * cy; if (h <= 0) continue;
    const k = Math.ceil(Math.sqrt(h) - 0.5) - 1; if (k < 0) continue;
    s.push(j, -(k + 1), 2 * (k + 1));
  }
  DISC.set(r, s); return s;
}
function disc(ctx, x, y, r) { const s = discSpans(r); for (let i = 0; i < s.length; i += 3) ctx.fillRect(x + s[i + 1], y + s[i], s[i + 2], 1); }
function poly(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}
// §2.4 heading steps. r57 shipped 16 (22.5°); Jacob's playtest: the popcorn's
// ±20° sine wobble snapped between 2–3 angles and read as jitter. r58: 32
// (11.25°) — bible §12 Q2's named fallback — so the wobble sweeps ~4 steps.
const STEPS = 32, STEP = Math.PI / (STEPS / 2);
function stepOf(a) { return ((Math.round(a / STEP) % STEPS) + STEPS) % STEPS; }

export function resetHud() { displayScore = 0; }

export function draw(g, ctx, bgScroll) {
  ctx.save();
  if (g.shake > 0) { // r8-fx: squared decay — snaps hard, settles fast (no constant buzz)
    const k = g.shakeMax > 0 ? g.shake / g.shakeMax : 1, amp = (g.shakeMax || g.shake) * k * k;
    // r28: fxRng, NEVER g.rng — draw() only runs in the browser, so pulling the
    // gameplay stream here desynced live runs from headless replay (the Booth
    // recorder divergence). Renderer randomness must never touch g.rng.
    // r57: whole-pixel shake so the grid survives it (§2.1).
    ctx.translate(Math.round((g.fxRng.next() - 0.5) * amp), Math.round((g.fxRng.next() - 0.5) * amp));
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
  const bgC = bossPhase >= 0 ? BOSS_BG[bossPhase] : FIELD_BG;
  const slabC = bossPhase >= 0 ? BOSS_SLAB[bossPhase] : SEC_SLAB[sec];
  const starC = bossPhase >= 0 ? BOSS_STAR[bossPhase] : SEC_STAR[sec];
  const landC = bossPhase >= 0 ? BOSS_LAND[bossPhase] : SEC_LAND[sec];
  ctx.fillStyle = bgC;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  // landmark slab: enters at the section boundary, scrolls with section progress
  {
    const [lx, lw, lh] = SEC_LANDGEO[sec];
    const ly = Math.round((g.stageT - SEC_T[sec]) * 0.55 - lh - 20);
    if (ly < H + 20) {
      ctx.fillStyle = landC;
      ctx.fillRect(lx, ly, lw, lh);
      ctx.fillStyle = slabC;
      ctx.fillRect(lx + 10, ly + 8, lw - 20, lh - 16); // inset gives it structure
    }
  }
  ctx.fillStyle = starC;
  for (let i = 0; i < 40; i++) {
    const sx = Math.floor((i * 137.5) % W);
    const sy = Math.floor(((i * 89.3) + bgScroll * (0.4 + (i % 3) * 0.3)) % (H + 40) - 20);
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, 8 + (i % 3) * 6);
  }
  ctx.fillStyle = slabC;
  for (let i = 0; i < 6; i++) {
    const sy = Math.floor(((i * 173) + bgScroll * 0.25) % (H + 120) - 60);
    ctx.fillRect(30 + (i * 97) % (W - 120), sy, 60, 34); // dim "terrain" slabs
  }

  // items — gold, unmistakable vs bullets (S2). Blue Revolver-sized: radius
  // scales with value (fat chains pay in visibly fatter gold) and a slow
  // glint pulse keeps the big discs reading as treasure, not UI. Safe to grow:
  // items sit below enemies/fx/bullets, so size can never mask a threat.
  // r57: pixel discs from the cache, one per integer radius (the pulse steps 1px).
  for (let i = 0; i < g.items.count; i++) {
    const it = g.items.items[i];
    const r = Math.round(Math.min(12, 7 + it.val / 150) + Math.sin(g.frame * 0.11 + it.tw) * 0.6);
    const s = CACHE.get(1000 + r) || sprite(1000 + r, 2 * r + 2, null, (c) => {
      c.fillStyle = ITEM.rim; disc(c, 0, 0, r);
      c.fillStyle = ITEM.gold; disc(c, 0, 0, Math.round(r * 0.78));
      c.fillStyle = ITEM.glint; const hl = Math.max(2, Math.round(r * 0.3)); c.fillRect(-Math.round(r * 0.4), -Math.round(r * 0.4), hl, hl);
    });
    ctx.drawImage(s.img, Math.round(it.x) - s.o, Math.round(it.y) - s.o);
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
    const b = g.pBullets.items[i], x = Math.round(b.x), y = Math.round(b.y);
    ctx.fillStyle = SHIP.shot;
    ctx.fillRect(x - 2, y - 10, 4, 20);
    ctx.fillStyle = UI.white;
    ctx.fillRect(x - 1, y - 9, 2, 18);
  }

  // ⚠ ART-CHANGE NOTE (r35/r57): src/howto.js draws its bullet card through
  // drawRoundBullet / drawNeedle below — the card mirrors by construction.
  // enemy bullets — TOP layer; needles above rounds (faster ⇒ higher, S2)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < g.eBullets.count; i++) {
      const b = g.eBullets.items[i];
      if (b.kind !== pass) continue;
      if (pass === 0) drawRoundBullet(ctx, b.x, b.y, g.frame);
      else drawNeedle(ctx, b.x, b.y, Math.atan2(b.vy, b.vx));
    }
  }

  // popups
  ctx.textAlign = 'center';
  for (let i = 0; i < g.popups.count; i++) {
    const q = g.popups.items[i];
    let text = q.text;
    if (q.val) { // speed-kill popup: the lab picks how the value shows (wiki §2.6)
      const m = prefs.speedPopup;
      if (m === 'off') continue;
      text = m === 'num' ? '+' + q.val : m === 'word' ? 'SPEED' : 'SPEED +' + q.val;
    }
    ctx.globalAlpha = Math.min(1, q.life / 18);
    ctx.font = q.big ? 'bold 15px monospace' : '11px monospace';
    ctx.fillStyle = q.big ? UI.gold : UI.text;
    ctx.fillText(text, Math.round(q.x), Math.round(q.y));
  }
  ctx.globalAlpha = 1;

  // r6 S3b arrival ritual: WARNING telegraph — big, field-centered, flashing;
  // deliberately unlike popups (gold 15px) and banners (backing box + sub-lines).
  // Animation keys off g.frame only (renderer determinism: no g.rng in draw).
  if (g.warn > 0) {
    const on = (g.frame >> 3) & 1;
    const fade = Math.min(1, g.warn / 12);
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = UI.warnBand;
    ctx.fillRect(0, H / 2 - 32, W, 64);
    ctx.globalAlpha = fade;
    ctx.fillStyle = on ? UI.warn : UI.warnHi;
    for (let x = 0; x < W; x += 26) { // hazard ticks along the band edges
      ctx.fillRect(x + (on ? 0 : 13), H / 2 - 32, 13, 3);
      ctx.fillRect(x + (on ? 13 : 0), H / 2 + 29, 13, 3);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = on ? UI.warn : UI.warnText;
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
    if (fa > 0) { ctx.globalAlpha = fa * cap; ctx.fillStyle = UI.bombFlash; ctx.fillRect(0, 0, W, H); }
    if (ca > 0) { ctx.globalAlpha = ca * cap; ctx.fillStyle = UI.gold; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  drawHud(ctx, g);
}

// --- enemy bullets (bible §5; wiki §6.2 display contract) -------------------
// Round: dark rim → pink ring → WHITE core = the true 3px hit circle. r57: a
// pixel-disc sprite at the exact r20 radii (5.6 / 4.2 / 3), two frames — the
// r5 0.35px pulse becomes a 2-frame ring flash held 4 ticks (SLYNYRD: flashing
// reads as dangerous). Sizes unchanged: ring and rim are graze area.
export function drawRoundBullet(ctx, x, y, frame) {
  const f = (frame >> 2) & 1;
  const s = CACHE.get(2000 + f) || sprite(2000 + f, 12, null, (c) => {
    c.fillStyle = ROUND.rim; disc(c, 0, 0, 5.6);
    c.fillStyle = f ? ROUND.ringHi : ROUND.ring; disc(c, 0, 0, 4.2);
    c.fillStyle = ROUND.core; disc(c, 0, 0, 3);
  });
  ctx.drawImage(s.img, Math.round(x) - s.o, Math.round(y) - s.o);
}
// Needle: elongated along velocity (S2 telegraphing) — rotation stays smooth
// because an aimed shot's direction IS the telegraph (16 steps would lie by up
// to 11°). r57 adds the 1px bright tail tick (§5) so direction reads from the
// sprite alone. White = the 3px hit circle at the centre (+1px nose taper).
export function drawNeedle(ctx, x, y, ang) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang);
  ctx.fillStyle = NEEDLE.rim; ctx.fillRect(-7, -3, 14, 6);
  ctx.fillStyle = NEEDLE.body; ctx.fillRect(-6, -2, 12, 4);
  ctx.fillStyle = NEEDLE.core; ctx.fillRect(-3, -2, 7, 4); ctx.fillRect(-6, -2, 1, 4);
  ctx.restore();
}

function drawFx(ctx, g) {
  const n = g.particles.count, items = g.particles.items;
  const S = prefs.fxSize, bloom = prefs.fxStyle === 'bloom' || prefs.fxStyle === 'heavy', heavy = prefs.fxStyle === 'heavy'; // r51 lab
  // r52 chunky pass 0: white constant-width shockwave UNDER everything, then
  // opaque shaded blobs in spawn order (centre blob of each grape drawn last).
  for (let i = 0; i < n; i++) {
    const q = items[i];
    if (q.delay > 0) continue;
    if (q.kind === FX.RING && q.ck) { // linear expansion to target, hard cull (life sized to match)
      const t = 1 - q.life / q.max;
      ctx.globalAlpha = 1; ctx.strokeStyle = FX_RAMP[q.hue][0]; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(Math.round(q.x), Math.round(q.y), Math.max(1, Math.round(q.size * S * t)), 0, 7); ctx.stroke();
    } else if (q.kind === FX.BLOB) {
      const h = q.max - q.life + q.off; // age on this blob's own clock
      const stage = h < CH_STAGE_AT[0] ? 0 : h < CH_STAGE_AT[1] ? 1 : h < CH_STAGE_AT[2] ? 2 : h < CH_STAGE_AT[3] ? 3 : 4;
      const a = q.life / q.max;
      // swell in over the first 4 frames, hold, then shrink to ZERO across the last 35% (never pops out)
      const r = q.size * S * (h < 4 ? 0.55 + h * 0.1125 : a < 0.35 ? a / 0.35 : 1);
      if (r < 0.6) continue;
      const [rim, mid, hi] = CH_RAMP[q.hue][stage];
      const x = Math.round(q.x), y = Math.round(q.y); // pixel-snapped: sub-pixel blobs read "unhinged" (Lazy Devs)
      ctx.globalAlpha = stage === 4 ? Math.min(1, a * 2.2) : 1; // smoke fades a little as it shrinks
      ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      if (r >= 3) { ctx.fillStyle = mid; ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.15, r * 0.72, 0, 7); ctx.fill(); }
      if (r >= 5) { ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.42, 0, 7); ctx.fill(); }
    }
  }
  for (let i = 0; i < n; i++) { // pass 1: smoke, debris
    const q = items[i];
    if (q.delay > 0 || (q.kind !== FX.SMOKE && q.kind !== FX.DEBRIS)) continue;
    const a = q.life / q.max;
    if (q.kind === FX.SMOKE) {
      ctx.globalAlpha = a * (heavy ? 0.85 : 0.7);
      ctx.fillStyle = FX_SMOKE[q.hue];
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size * S * (1 + (1 - a) * (heavy ? 1.6 : 1.2)), 0, 7); ctx.fill();
    } else {
      ctx.globalAlpha = Math.min(1, a * 3);
      ctx.fillStyle = FX_DEBRIS[q.hue];
      const d = q.size * S * (heavy ? 1.3 : 1);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.fillRect(-d, -d / 2, d * 2, d);
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { // pass 2: hot kinds, additive
    const q = items[i];
    if (q.delay > 0 || q.kind === FX.SMOKE || q.kind === FX.DEBRIS || q.kind === FX.BLOB || (q.kind === FX.RING && q.ck)) continue;
    const a = q.life / q.max, ramp = FX_RAMP[q.hue];
    const stop = ((1 - a) * 3.99) | 0;
    switch (q.kind) {
      case FX.SPARK: {
        ctx.globalAlpha = a;
        ctx.fillStyle = ramp[stop];
        const s = (1 + a * 2) * S;
        if (bloom) { // streak along the velocity — reads as motion, not a dot
          ctx.strokeStyle = ramp[stop]; ctx.lineWidth = s;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 2.5, q.y - q.vy * 2.5); ctx.stroke();
        } else ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
        break;
      }
      case FX.FIRE: { // swells fast, then shrinks as it cools
        const r = q.size * S * (a < 0.85 ? a / 0.85 : 0.4 + (1 - a) / 0.15 * 0.6);
        if (bloom) { // soft halo behind the fireball (capped alpha: bullets stay legible over it)
          ctx.globalAlpha = Math.min(1, a * 1.5) * 0.12; // low: nine of these stack additively on a boss phase
          ctx.fillStyle = ramp[2];
          ctx.beginPath(); ctx.arc(q.x, q.y, r * 1.7, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = Math.min(1, a * 1.5) * 0.85;
        ctx.fillStyle = ramp[1 + (((1 - a) * 2.99) | 0)]; // fire never starts white — the CORE owns the flash; overlaps bloom via 'lighter'
        ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
        break;
      }
      case FX.CORE: { // full size on frame 0, collapses
        if (q.ck) { // r52 chunky: static contrast frame — full size for both frames, gone
          ctx.globalAlpha = 1; ctx.fillStyle = ramp[0];
          ctx.beginPath(); ctx.arc(Math.round(q.x), Math.round(q.y), q.size * S, 0, 7); ctx.fill();
          break;
        }
        if (bloom) { // hotter flash: a wider dim halo around the white core
          ctx.globalAlpha = a * 0.25;
          ctx.fillStyle = ramp[1];
          ctx.beginPath(); ctx.arc(q.x, q.y, q.size * S * a * 1.5, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = ramp[0];
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * S * a, 0, 7); ctx.fill();
        break;
      }
      case FX.RING: { // shockwave: expands out to `size`, thins and fades
        ctx.globalAlpha = a;
        ctx.strokeStyle = ramp[1]; ctx.lineWidth = (0.5 + a * 2) * S;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * S * (1 - a) + 1, 0, 7); ctx.stroke();
        if (heavy) { // second, wider, fainter shockwave trailing the first
          ctx.globalAlpha = a * 0.45; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.size * S * (1 - a) * 1.5 + 1, 0, 7); ctx.stroke();
        }
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
// wide, a base plate with a solid under-plate and a barrel that aims at the
// ship (Komazawa: "the way tanks fire… every enemy had a backstory"). Size
// ladder per DDP's "big things are slow; fast things are small". Every
// behaviour variant is its own craft: fighter, diver, crosser dart, riser
// climber. Renderer-only: core hitboxes (ENEMY_DEFS r) untouched — sprites
// stay within ~1.2r (bible §6).
// r57: every sprite goes through the cache — integer geometry (§2.2), 16
// heading steps (§2.4), family rim (§4), hit-flash whitens the rim too.
// sprites are drawn nose-DOWN (+y, toward the player); rotate to the velocity
// heading when moving so crossers fly sideways and risers climb nose-up
function heading(e) {
  // zako motion = vx + a sine wobble (core: sin(age*0.06)*side*0.6) that is
  // bigger than vx itself — Booth flag: "the nose doesn't point where they fly"
  const vx = e.type === 0 ? e.vx + Math.sin(e.age * 0.06) * e.side * 0.6 : e.vx;
  return (vx * vx + e.vy * e.vy > 0.09) ? Math.atan2(e.vy, vx) - Math.PI / 2 : 0;
}
const TURRET_PLATE = [[-9, -13], [9, -13], [13, -9], [13, 9], [9, 13], [-9, 13], [-13, 9], [-13, -9]];
const SPAN = [32, 48, 40, 66, 72, 100, 32]; // cache canvas per type (rotated extents + rim)
function rimOf(type, phase) {
  if (type === 0) return phase === 1 ? HEAVY.out : phase === 3 ? GROUND.out : AIR.out;
  if (type === 1) return AIR.out;
  if (type === 2) return GROUND.out;
  return HEAVY.out;
}

export function drawEnemy(ctx, g, e) {
  const flick = (e.vulnAt < 0 && (g.frame & 4)) ? 1 : 0; // intro armor shimmer
  const hit = e.flash > 0 ? 1 : 0; // r8-fx S4-MUST: hit-flash — every fill goes white for 2 frames
  const prop = (g.frame & 2) ? 1 : 0;
  const phase = e.phase & 3, side = e.side > 0 ? 1 : 0;
  let step = 0, extra = 0, dy = 0;
  switch (e.type) {
    case 0: step = stepOf(heading(e)); if (e.phase === 3 && e.vy < -0.5) extra = 1; break; // riser climbing → exhaust plume
    case 1: case 3: step = stepOf(heading(e)); break;
    case 2: extra = stepOf(Math.atan2(g.player.y - e.y, g.player.x - e.x)) + ((e.vulnAt >= 0 && g.frame - e.vulnAt > 240) ? STEPS : 0); break; // barrel step + angry
    case 5: extra = (e.vulnAt < 0 && e.phase > 0) ? ((g.frame & 2) ? 2 : 1) : 0; break; // burn-in frames
  }
  if (e.type === 1) dy = Math.round(Math.sin(e.age * 0.09) * 0.8); // parked bob, whole pixels
  const key = ((((((e.type * 4 + phase) * 2 + side) * STEPS + step) * 2 + prop) * 2 + hit) * 2 + flick) * 64 + extra;
  const s = CACHE.get(key) || sprite(key, SPAN[e.type], hit ? UI.white : rimOf(e.type, phase),
    (c) => paintEnemy(c, e.type, phase, side ? 1 : -1, step, prop, hit, flick, extra));
  ctx.drawImage(s.img, Math.round(e.x) - s.o, Math.round(e.y) - s.o + dy);
}

function paintEnemy(ctx, type, phase, side, step, prop, hit, flick, extra) {
  const F = (c) => { ctx.fillStyle = hit ? UI.white : c; };
  const S = (c) => F(flick ? BOSS.armor : c); // surface fill: armor shimmer applies
  switch (type) {
    case 0: { // popcorn family — each behaviour variant is its own craft
      ctx.rotate(step * STEP);
      if (phase === 2) {            // CROSSER: dart interceptor — long, swept, flies sideways across the top band
        S(AIR.shade); poly(ctx, [[0, 12], [8, -5], [0, -10], [-8, -5]]);
        S(AIR.base); poly(ctx, [[0, 13], [3, -3], [0, -9], [-3, -3]]);
        S(AIR.hi); poly(ctx, [[0, 12], [8, -5], [7, -5], [0, 10]]);
        S(AIR.glass); ctx.fillRect(-1, 1, 2, 3);
      } else if (phase === 3) {     // RISER: stubby climber with exhaust — nose flips as it turns to fall
        S(GROUND.shade); poly(ctx, [[0, 9], [8, 2], [8, -3], [-8, -3], [-8, 2]]);
        S(GROUND.base); poly(ctx, [[0, 11], [4, 0], [4, -8], [-4, -8], [-4, 0]]);
        S(GROUND.hi); ctx.fillRect(-4, -8, 8, 1);
        S(AIR.glass); ctx.fillRect(-1, 2, 2, 3);
        if (extra && prop) { S(GROUND.exhaust); poly(ctx, [[-3, -8], [3, -8], [0, -15]]); } // climbing: exhaust plume
      } else {                      // FIGHTER — and its diver twin (phase 1): darker, nose on the target
        const c = phase === 1 ? HEAVY : AIR;
        S(c.shade); ctx.fillRect(-9, -2, 18, 4);       // main wing
        S(c.shade); ctx.fillRect(-4, -8, 8, 2);        // tailplane
        S(c.base); poly(ctx, [[0, 10], [3, 2], [3, -8], [0, -10], [-3, -8], [-3, 2]]); // fuselage
        S(c.hi); ctx.fillRect(-9, -2, 18, 1);          // leading-edge light
        S(AIR.glass); ctx.fillRect(-1, 0, 2, 3);       // canopy
        S(c.hi); if (prop) ctx.fillRect(-4, 9, 8, 1); else ctx.fillRect(-1, 7, 2, 4); // prop disc flicker
      }
      break;
    }
    case 1: { // MID — twin-boom heavy fighter: wider, taller, two engines; bobs while parked
      ctx.rotate(step * STEP);
      S(AIR.shade); ctx.fillRect(-15, -4, 30, 5);                               // wing
      S(AIR.shade); ctx.fillRect(-10, -13, 3, 10); ctx.fillRect(7, -13, 3, 10); // tail booms
      S(AIR.base); ctx.fillRect(-13, -13, 26, 2);                               // tailplane bar
      S(AIR.base); poly(ctx, [[0, 13], [4, 3], [4, -9], [0, -11], [-4, -9], [-4, 3]]); // fuselage
      S(AIR.base); ctx.fillRect(-11, -6, 5, 9); ctx.fillRect(6, -6, 5, 9);      // engine nacelles
      S(AIR.hi); ctx.fillRect(-15, -4, 30, 1);
      S(AIR.glass); ctx.fillRect(-2, 2, 4, 4);
      S(AIR.hi); if (prop) { ctx.fillRect(-12, 3, 7, 1); ctx.fillRect(5, 3, 7, 1); }
      break;
    }
    case 2: { // TURRET — ground family: solid under-plate (§4, no alpha shadow), khaki dome, barrel aims at the ship; rust when angry
      const angry = extra >= STEPS, barrel = (extra % STEPS) * STEP;
      if (!hit) { ctx.save(); ctx.translate(2, 3); S(GROUND.out); poly(ctx, TURRET_PLATE); ctx.restore(); }
      S(GROUND.plate); poly(ctx, TURRET_PLATE);
      S(GROUND.shade); disc(ctx, 0, 0, 9);
      S(angry ? HEAVY.stripe : GROUND.base); disc(ctx, -1, -1, 7);
      ctx.save(); ctx.rotate(barrel); S(GROUND.shade); ctx.fillRect(0, -2, 15, 4); S(GROUND.hi); ctx.fillRect(4, -2, 11, 1); ctx.restore();
      S(GROUND.hi); ctx.fillRect(-4, -5, 3, 2);
      break;
    }
    case 3: { // ELITE — heavy bomber: broad wing, four engines, rust wingtip stripes; the space controller
      ctx.rotate(step * STEP);
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
      S(phase === 1 ? HEAVY.core : HEAVY.shade); poly(ctx, [[0, 12], [5, 2], [0, -8], [-5, 2]]);
      S(HEAVY.hi); poly(ctx, [[0, -20], [28, -4], [27, -3], [0, -19], [-27, -3], [-28, -4]]);
      S(HEAVY.hi); if (prop) { ctx.fillRect(-22, 8, 8, 1); ctx.fillRect(14, 8, 8, 1); }
      break;
    }
    case 5: {
      // r6 S3b: each phase is a FORM change — three distinct silhouettes.
      // During the 60f handoff armor the incoming form BURNS IN: red-hot
      // flicker (g.frame-keyed — no rng in draw) over the whole body.
      // Surface detail (panels, modules, engines) is Round 2 (bible §10).
      const burning = extra > 0;
      const body = burning ? (extra === 2 ? BOSS.burnA : BOSS.burnB) : (flick ? BOSS.armor : BOSS.hull);
      const core = burning ? BOSS.ember : (BOSS.cores[phase] || UI.white);
      F(body);
      if (phase === 0) {        // P1: winged carrier — broad hull + swept wing roots
        poly(ctx, [[0, -30], [28, -12], [22, 26], [-22, 26], [-28, -12]]);
        poly(ctx, [[-24, -8], [-42, 2], [-24, 12]]); // wing roots reach for the pods
        poly(ctx, [[24, -8], [42, 2], [24, 12]]);
        F(core);
        poly(ctx, [[0, -16], [14, 10], [-14, 10]]);
      } else if (phase === 1) { // P2: armor shed — wide flat hull, new geometry
        poly(ctx, [[-36, -4], [-16, -18], [16, -18], [36, -4], [24, 18], [-24, 18]]);
        F(core);
        ctx.fillRect(-20, -4, 40, 8); // exposed cyan core band
      } else {                    // P3: stripped bare core — small, angular, white-hot
        poly(ctx, [[0, -24], [17, 0], [0, 20], [-17, 0]]);
        F(burning ? BOSS.ember : BOSS.strut);
        ctx.fillRect(-26, -3, 9, 6); ctx.fillRect(17, -3, 9, 6); // bare struts
        F(core);
        poly(ctx, [[0, -13], [9, 0], [0, 11], [-9, 0]]);
        F(BOSS.hot);
        ctx.fillRect(-2, -3, 4, 6); // white-hot center
      }
      break;
    }
    case 6: {
      // r6 boss sub-part: silhouette continues the boss's form — destroying it
      // visibly amputates that piece (S3b part MUST). Shapes keyed to phase.
      // The part carries its emitter's bullet hue — the one sanctioned body use (§3).
      S(BOSS.hull);
      if (phase === 0) {        // wing pod: outward-swept blade
        poly(ctx, [[0, -9], [side * 13, -2], [side * 9, 6], [0, 8]]);
        F(ROUND.ring);
        ctx.fillRect(side * 3 - 2, -2, 4, 4);
      } else if (phase === 1) { // armor node: slab with exposed vent
        ctx.fillRect(-8, -8, 16, 16);
        F(NEEDLE.body);
        ctx.fillRect(-4, -3, 8, 6);
      } else {                    // core relay node: bright diamond
        poly(ctx, [[0, -9], [8, 0], [0, 9], [-8, 0]]);
        F(ITEM.gold);
        poly(ctx, [[0, -5], [4, 0], [0, 5], [-4, 0]]);
        F(UI.white);
        ctx.fillRect(-1, -1, 2, 2);
      }
      break;
    }
  }
}

// --- player -------------------------------------------------------------------
// ⚠ ART-CHANGE NOTE (r35/r57): the HOW TO card (src/howto.js) draws its ship
// through drawShip below, so the card mirrors by construction — keep the ship
// + dot inside this one function.
// r20 (Booth flags): the ship is drawn BIG around a tiny core — 28px span on
// a 3px hit radius (bullets add their own 3px: a bullet kills when its
// centre is within 6px of the dot). boghog WS01: "small hitboxes, much
// smaller than their sprites… if it harms the player, make it small";
// Cave ships run ~8–10:1 sprite:hitbox, the old 18px body was 3:1 and the
// focus ring read as "the hitbox is half the ship". The core dot is always
// drawn (visible hit point); focus brightens it, no ring.
// r20 hitbox marker, per the genre research (hitbox-display-report.md): the
// marker is NEVER smaller than the truth — Touhou draws a 10px dot over a
// ~3-7px hitbox; Mushihimesama's circle covers "a few pixels". Every bullet
// here has the same 3px radius, so we fold it in and draw ONE dot at the
// full effective radius (hitR + 3 = 6px): a bullet's CENTRE touching your
// dot is a hit — no smaller mark exists to mis-read, and every surprise is
// a pleasant one. Dark well behind it for value contrast (WS02); focus
// whitens the dot and adds the pink rim (a 1px disc ring at r7 — outside
// the truth, never inside it).
// r57 (§4): dark rim + a 1px hull-light rim along the top edge, so the ship
// pops against its own violet shots.
export function drawShip(ctx, x, y, focus) {
  const s = CACHE.get('ship') || sprite('ship', 36, SHIP.dark, (c) => {
    c.fillStyle = SHIP.shade;                                   // wing underside shade
    poly(c, [[-14, 12], [-4, 4], [4, 4], [14, 12], [10, 15], [-10, 15]]);
    c.fillStyle = SHIP.hull;                                    // hull
    poly(c, [[0, -17], [4, -8], [13, 11], [5, 8], [0, 12], [-5, 8], [-13, 11], [-4, -8]]);
    c.fillStyle = SHIP.edge;                                    // wing leading edges
    poly(c, [[4, -8], [13, 11], [11, 11], [3, -6]]); poly(c, [[-4, -8], [-13, 11], [-11, 11], [-3, -6]]);
    c.fillStyle = SHIP.dark; c.fillRect(-2, 12, 4, 4);          // exhaust
  }, SHIP.hull);
  const dk = focus ? 'dot1' : 'dot0';
  const d = CACHE.get(dk) || sprite(dk, 2 * (PLAYER.hitR + 5) + 2, null, (c) => {
    c.fillStyle = SHIP.well; disc(c, 0, 0, PLAYER.hitR + 5);
    if (focus) { c.fillStyle = ROUND.ring; disc(c, 0, 0, PLAYER.hitR + 4); }
    c.fillStyle = focus ? UI.white : SHIP.dot; disc(c, 0, 0, PLAYER.hitR + 3);
  });
  ctx.drawImage(s.img, x - s.o, y - s.o);
  ctx.drawImage(d.img, x - d.o, y - d.o);
}

export function drawPlayer(ctx, g) {
  const p = g.player;
  if (p.invuln > 0 && (g.frame & 2)) return; // classic invuln blink
  const x = Math.round(p.x), y = Math.round(p.y);
  // option trail (follow-through, S1) — violet family: the whole player identity
  // sits outside the enemy needle cyan (r5 S2-MUST-3, with the shot recolor)
  const tx = Math.round((p.x - p.prevX) * 2), ty = Math.round((p.y - p.prevY) * 2);
  ctx.fillStyle = SHIP.dark;
  ctx.fillRect(x - 19 - tx, y + 6 - ty, 5, 5);
  ctx.fillRect(x + 15 - tx, y + 6 - ty, 5, 5);
  drawShip(ctx, x, y, p.focus);
}

function drawHud(ctx, g) {
  displayScore += Math.ceil((g.score - displayScore) * 0.18);
  // low-alpha backing strip: the score/chain block stays legible over popups,
  // items, and background accents (r5 S6-legibility)
  ctx.fillStyle = UI.hudBack;
  ctx.fillRect(0, 0, W, 46);
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = UI.score;
  ctx.fillText(String(displayScore).padStart(9, '0'), 10, 20);
  ctx.font = '11px monospace';
  ctx.fillStyle = UI.dim;
  ctx.fillText('CHAIN ' + g.chain, 10, 36);
  if (g.practice) { ctx.font = 'bold 9px monospace'; ctx.fillStyle = UI.gold; ctx.fillText('PRACTICE', 6, H - 6); } // r36: always visible — this score is rehearsal
  // lives / bombs icons
  ctx.fillStyle = UI.lives;
  for (let i = 0; i < g.player.lives; i++) poly(ctx, [[W - 16 - i * 16, 12], [W - 10 - i * 16, 24], [W - 22 - i * 16, 24]]);
  ctx.fillStyle = UI.gold;
  for (let i = 0; i < g.player.bombs; i++) disc(ctx, W - 14 - i * 16, 36, 5);

  ctx.textAlign = 'center';
  if (g.state === 'title') {
    banner(ctx, 'SPEEDHELL', []); // r42: the DOM title menu carries start/practice/how-to/options
  } // r44: gameover/clear banners retired — the DOM results receipt replaces them
}

// Field-relative type: sized for the 320-wide logical field (post-r4 rescale);
// the canvas stretch supplies the on-screen size.
function banner(ctx, big, lines) {
  ctx.fillStyle = UI.bannerBack;
  ctx.fillRect(0, H / 2 - 44, W, 92);
  ctx.font = 'bold 21px monospace'; ctx.fillStyle = UI.warn;
  ctx.fillText(big, W / 2, H / 2 - 16);
  ctx.font = '9px monospace'; ctx.fillStyle = UI.text;
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, H / 2 + 4 + i * 14));
}
