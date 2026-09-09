// Canvas2D renderer. Visibility rules from rubric S2: washed-out low-contrast
// background; bullets pair dark rims with bright cores; consistent language
// (pink rounds = anyone; cyan needles = a special enemy aiming at you, r59);
// bullets on top.
// r57 (ART_BIBLE Round 1): named palette, pixel grid, per-family rims via an
// offscreen sprite cache, pixel-disc bullets and items.
// r60 (skins): everything a concept direction may restyle — palette, background,
// enemy/ship/item painters, an optional post pass — lives in a SKIN
// (src/render/skins/*.js, contract in skins/base.js). This file keeps what no
// skin may touch: the bullet castes, the hit dot, the sprite cache and grid,
// fx, HUD layout, popups/WARNING/flashes. Core, hitboxes, g.rng, referee: untouched.
import { W, H, PLAYER, FX } from '../core/game.js';
import { SKINS } from './skins/index.js';

// r50 lab: presentation prefs the shell may switch live (src/lab.js writes
// them). The renderer stays DOM-free; headless harnesses get the defaults.
// speedPopup: 'both' = SPEED +1600 · 'num' = +1600 · 'word' = SPEED · 'off'
// (r67: fxSize / fxStyle left the Lab — 2× and chunky shipped, see FX_SIZE and
// explodeChunky in core; bloom/heavy/classic painters deleted.) Explosions
// still draw BELOW bullets (S2 — they never mask threats).
// speedDress: r53 — transported to core as g.fxMeta by main.js (renderer ignores it)
// skin: r60 — which skins/*.js draws the world (setSkin below; Lab row `skin`); r62 default cute-occult
// shotLook: r75 (open Q22) — 'current' = the 4×20 rect + 2×18 white core · 'bolt' = pixel bolt + trail + muzzle
// flash + impact blob (core side: main.js mirrors it into g.fxShot). muzzleAt = the g.frame main.js last saw
// SFX.SHOT in the ring (-1 = never); the renderer strobes the muzzle off it for 2 frames — no core change.
export const prefs = { speedPopup: 'both', speedDress: 0, skin: 'cute-occult', shotLook: 'current', muzzleAt: -1 };
const FX_SIZE = 2; // r67: explosion draw-size multiplier, 2× shipped (Lab open Q12 decided 2026-09-07)

// r62: cute-occult is THE look (Jacob's verdict 2026-09-05: "the most personality");
// base = the r58 classic, kept as the contract's reference implementation.
let skin = SKINS['cute-occult'];
export function getSkin() { return skin; }
export function setSkin(id) {
  const s = SKINS[id] || SKINS['cute-occult'];
  if (s !== skin) { skin = s; CACHE.clear(); } // sprites are per-skin; rebuild lazily
  prefs.skin = s.id;
}
export const PAL = SKINS.base.pal; // r57 export, kept for tools

// Bullet castes — NOT skinnable (wiki §6.2 display contract; bible §5).
const ROUND  = { rim: '#20060f', ring: '#ff4fa3', ringHi: '#ff8ec4', core: '#ffe6f2' };
const NEEDLE = { rim: '#031418', body: '#37d6e0', core: '#e8feff' };
const WHITE = '#ffffff';

// r8-fx explosion palette, indexed [family][heat stop 0=hot … 3=cool] by the
// particle's remaining life. Lookup tables: no string building in the hot loop (S8).
// (FX family — bible §3 "as tabled"; explosions are Round 5, not skinnable yet.)
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

// Section entry stageT (intro / s1..s8) — the skin gets `sec` already resolved.
const SEC_T = [0, 120, 720, 1700, 2400, 2460, 2900, 3700, 3900];
function sectionOf(t) {
  let s = 0;
  for (let i = SEC_T.length - 1; i >= 0; i--) if (t >= SEC_T[i]) { s = i; break; }
  return s;
}

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
// The kit every skin painter receives (see skins/base.js contract).
const KIT = { poly, disc, STEP, STEPS, W, H, white: WHITE };

export function resetHud() { displayScore = 0; }

export function draw(g, ctx, bgScroll) {
  const { UI, SHIP } = skin.pal;
  ctx.save();
  if (g.shake > 0) { // r8-fx: squared decay — snaps hard, settles fast (no constant buzz)
    const k = g.shakeMax > 0 ? g.shake / g.shakeMax : 1, amp = (g.shakeMax || g.shake) * k * k;
    // r28: fxRng, NEVER g.rng — draw() only runs in the browser, so pulling the
    // gameplay stream here desynced live runs from headless replay (the Booth
    // recorder divergence). Renderer randomness must never touch g.rng.
    // r57: whole-pixel shake so the grid survives it (§2.1).
    ctx.translate(Math.round((g.fxRng.next() - 0.5) * amp), Math.round((g.fxRng.next() - 0.5) * amp));
  }

  // background — the skin's; it receives the section and boss phase resolved.
  // Must stay inside the washed band (S2-MUST-1); boss arena restains per phase (r6).
  const sec = sectionOf(g.stageT);
  let bossPhase = -1;
  for (let i = 0; i < g.enemies.count; i++) {
    const e = g.enemies.items[i];
    if (e.type === 5) { bossPhase = e.phase; break; }
  }
  skin.drawBackground(ctx, g, bgScroll, sec, bossPhase, KIT);

  // items — gold, unmistakable vs bullets (S2). Radius scales with value; the
  // glint pulse steps 1px. Items sit below enemies/fx/bullets, so size can never
  // mask a threat. One cached pixel-disc sprite per integer radius.
  for (let i = 0; i < g.items.count; i++) {
    const it = g.items.items[i];
    const r = Math.round(Math.min(12, 7 + it.val / 150) + Math.sin(g.frame * 0.11 + it.tw) * 0.6);
    const s = CACHE.get(1000 + r) || sprite(1000 + r, 2 * r + 2, null, (c) => skin.paintItem(c, r, KIT));
    ctx.drawImage(s.img, Math.round(it.x) - s.o, Math.round(it.y) - s.o);
  }

  // enemies — desaturated silhouettes, distinct per role (S4)
  for (let i = 0; i < g.enemies.count; i++) drawEnemy(ctx, g, g.enemies.items[i]);

  // player
  drawPlayer(ctx, g);

  // particles (below bullets: explosions must never mask threats, S2).
  drawFx(ctx, g);

  // player shots — tall white-core bolts with the skin's player edge colour (S1);
  // the player family never shares a hue with enemy needles (r5 S2-MUST-3).
  // r75 Lab `shotLook` (open Q22): 'bolt' swaps the rect for drawBolt + a 2-frame muzzle strobe on the
  // barrels; 'current' is this loop, untouched. Both stay BELOW enemy bullets (S2 display contract).
  if (prefs.shotLook === 'bolt') drawBolts(ctx, g);
  else for (let i = 0; i < g.pBullets.count; i++) {
    const b = g.pBullets.items[i], x = Math.round(b.x), y = Math.round(b.y);
    ctx.fillStyle = SHIP.shot;
    ctx.fillRect(x - 2, y - 10, 4, 20);
    ctx.fillStyle = WHITE;
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

  // r60: the skin's post pass (scanlines / halftone / glow) — alpha-capped
  // overlays only; it must never lower bullet contrast (S2-MUST).
  if (skin.post) skin.post(ctx, g, KIT);

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

// --- enemy bullets (bible §5; wiki §6.2 display contract) — not skinnable ----
// Round: dark rim → pink ring → WHITE core = the true 3px hit circle. r57: a
// pixel-disc sprite at the exact r20 radii (5.6 / 4.2 / 3), two frames — the
// r5 0.35px pulse became a 2-frame ring flash held 4 ticks.
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
// because an aimed shot's direction IS the telegraph. r57 adds the 1px bright
// tail tick (§5). White = the 3px hit circle at the centre (+1px nose taper).
export function drawNeedle(ctx, x, y, ang) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang);
  ctx.fillStyle = NEEDLE.rim; ctx.fillRect(-7, -3, 14, 6);
  ctx.fillStyle = NEEDLE.body; ctx.fillRect(-6, -2, 12, 4);
  ctx.fillStyle = NEEDLE.core; ctx.fillRect(-3, -2, 7, 4); ctx.fillRect(-6, -2, 1, 4);
  ctx.restore();
}

// --- r75 player shot as a BOLT (Lab `shotLook`, open Q22; bible §2 grid, §5/§6) --------------------
// Same colour family as the rect it replaces (the skin's SHIP.shot edge + white; the darker rim is the
// skin's SHIP.shade — still violet, player-only, r5 S2-MUST-3), same 20px height and 9px/frame (fast +
// tall, S1), one cached pixel sprite. Rows top→bottom: a 1px rim tip, a 3px white HEAD (rows 1–4) inside
// a 1px darker rim, the body (violet with a 1px white spine) narrowing at row 12, a 2px violet tail —
// then, drawn first so the bolt covers it, an 8px trail: two stepped ghosts of the tail at the bolt's
// previous positions (alpha 0.5 / 0.25 — the bible's fx-halo exception, capped; integer-snapped).
// boghog WS05: "thick, detailed, juicy — always check in motion"; follow-through: the shot stream is
// where the eye reads the ship. Hitboxes, speed, cap, damage: untouched (renderer-only, no g.rng).
const BOLT_ROWS = [ // per row [x offset, width, colour]* for the 5×20 sprite; 0 = rim, 1 = body, 2 = white
  [[0, 1, 0]],
  [[-1, 1, 0], [0, 1, 2], [1, 1, 0]],
  [[-2, 1, 0], [-1, 3, 2], [2, 1, 0]], [[-2, 1, 0], [-1, 3, 2], [2, 1, 0]], [[-2, 1, 0], [-1, 3, 2], [2, 1, 0]],
  [[-2, 1, 0], [-1, 1, 1], [0, 1, 2], [1, 1, 1], [2, 1, 0]], [[-2, 1, 0], [-1, 1, 1], [0, 1, 2], [1, 1, 1], [2, 1, 0]],
  [[-2, 1, 0], [-1, 1, 1], [0, 1, 2], [1, 1, 1], [2, 1, 0]], [[-2, 1, 0], [-1, 1, 1], [0, 1, 2], [1, 1, 1], [2, 1, 0]],
  [[-2, 1, 0], [-1, 1, 1], [0, 1, 2], [1, 1, 1], [2, 1, 0]], [[-2, 1, 0], [-1, 1, 1], [0, 1, 2], [1, 1, 1], [2, 1, 0]],
  [[-2, 1, 0], [-1, 1, 1], [0, 1, 2], [1, 1, 1], [2, 1, 0]],
  [[-1, 1, 0], [0, 1, 2], [1, 1, 0]], [[-1, 1, 0], [0, 1, 2], [1, 1, 0]],
  [[-1, 1, 0], [0, 1, 1], [1, 1, 0]], [[-1, 1, 0], [0, 1, 1], [1, 1, 0]],
  [[-1, 2, 1]], [[-1, 2, 1]], [[-1, 2, 1]], [[-1, 2, 1]],
];
function drawBolts(ctx, g) {
  const { SHIP } = skin.pal;
  const s = CACHE.get('bolt') || sprite('bolt', 20, null, (c) => {
    const col = [SHIP.shade, SHIP.shot, WHITE];
    for (let r = 0; r < BOLT_ROWS.length; r++) for (const [dx, w, k] of BOLT_ROWS[r]) { c.fillStyle = col[k]; c.fillRect(dx, r - 10, w, 1); }
  });
  const n = g.pBullets.count, items = g.pBullets.items;
  ctx.fillStyle = SHIP.shot; // trail ghosts first (under every bolt), stepped alpha, then all the bolts
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < n; i++) { const b = items[i]; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) + 10, 2, 4); }
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < n; i++) { const b = items[i]; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) + 14, 2, 4); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < n; i++) { const b = items[i]; ctx.drawImage(s.img, Math.round(b.x) - s.o, Math.round(b.y) - s.o); }
  // muzzle strobe: main.js stamps prefs.muzzleAt with g.frame whenever the ring carried SFX.SHOT; frame 1 a
  // 5×3 white flash on each barrel mouth (shots leave at x±7, y−10), frame 2 a 3×2 ember. Follows the
  // ship's invuln blink so a flash never floats over an invisible ship; play state only (g.frame holds at death).
  const age = g.frame - prefs.muzzleAt, p = g.player;
  if (age < 0 || age > 1 || g.state !== 'play' || (p.invuln > 0 && (g.frame & 2))) return;
  const x = Math.round(p.x), y = Math.round(p.y);
  ctx.fillStyle = WHITE;
  if (age === 0) { ctx.fillRect(x - 9, y - 12, 5, 3); ctx.fillRect(x + 5, y - 12, 5, 3); }
  else { ctx.fillRect(x - 8, y - 12, 3, 2); ctx.fillRect(x + 6, y - 12, 3, 2); }
}

function drawFx(ctx, g) {
  const n = g.particles.count, items = g.particles.items;
  const S = FX_SIZE;
  // r52 chunky pass 0: white constant-width shockwave UNDER everything, then
  // opaque shaded blobs in spawn order (centre blob of each grape drawn last).
  for (let i = 0; i < n; i++) {
    const q = items[i];
    if (q.delay > 0) continue;
    if (q.kind === FX.CORE && q.ck === 2) continue; // r75 impact blob — pass 3 below, on top of the fx stack
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
      ctx.globalAlpha = a * 0.7;
      ctx.fillStyle = FX_SMOKE[q.hue];
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size * S * (1 + (1 - a) * 1.2), 0, 7); ctx.fill();
    } else {
      ctx.globalAlpha = Math.min(1, a * 3);
      ctx.fillStyle = FX_DEBRIS[q.hue];
      const d = q.size * S;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.fillRect(-d, -d / 2, d * 2, d);
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { // pass 2: hot kinds, additive
    const q = items[i];
    if (q.delay > 0 || q.kind === FX.SMOKE || q.kind === FX.DEBRIS || q.kind === FX.BLOB || (q.kind === FX.RING && q.ck) || (q.kind === FX.CORE && q.ck === 2)) continue;
    const a = q.life / q.max, ramp = FX_RAMP[q.hue];
    const stop = ((1 - a) * 3.99) | 0;
    switch (q.kind) {
      case FX.SPARK: {
        ctx.globalAlpha = a;
        ctx.fillStyle = ramp[stop];
        const s = (1 + a * 2) * S;
        ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
        break;
      }
      case FX.FIRE: { // swells fast, then shrinks as it cools
        const r = q.size * S * (a < 0.85 ? a / 0.85 : 0.4 + (1 - a) / 0.15 * 0.6);
        ctx.globalAlpha = Math.min(1, a * 1.5) * 0.85;
        ctx.fillStyle = ramp[1 + (((1 - a) * 2.99) | 0)]; // fire never starts white — the CORE owns the flash; additive via 'lighter'
        ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
        break;
      }
      case FX.CORE: { // full size on frame 0, collapses
        if (q.ck) { // r52 chunky: static contrast frame — full size for both frames, gone
          ctx.globalAlpha = 1; ctx.fillStyle = ramp[0];
          ctx.beginPath(); ctx.arc(Math.round(q.x), Math.round(q.y), q.size * S, 0, 7); ctx.fill();
          break;
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
        break;
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // r75 pass 3 (Lab shotLook = bolt only): the IMPACT BLOB — an opaque WHITE pixel disc (size = radius 2/3/4 →
  // 4/6/8px) inside a 1px dark-violet rim (FX_RAMP[0][3], player family). Drawn LAST of the fx so the r8 hit
  // sparks + fire puff at the same point never wash it out, and rimmed because the hit-flash paints the enemy
  // white for the same 2 frames and a bare white flare vanished into it (peek, r75) — WS02 "very dark next to
  // very bright". Full size 2 frames, one step smaller on its last: snaps on, collapses. source-over (a solid
  // flare on the hull, not a glow); still under player shots and enemy bullets (S2).
  if (prefs.shotLook === 'bolt') for (let i = 0; i < n; i++) {
    const q = items[i];
    if (q.kind !== FX.CORE || q.ck !== 2) continue;
    const r = q.life > 1 ? q.size : q.size - 1, x = Math.round(q.x), y = Math.round(q.y);
    ctx.fillStyle = FX_RAMP[0][3]; disc(ctx, x, y, r + 1);
    ctx.fillStyle = FX_RAMP[0][0]; disc(ctx, x, y, r);
  }
}

// --- enemies: the skin paints, the renderer caches/rims/places -----------------
// sprites are drawn nose-DOWN (+y, toward the player); rotate to the velocity
// heading when moving so crossers fly sideways and risers climb nose-up
function heading(e) {
  // zako motion = vx + a sine wobble (core: sin(age*0.06)*side*0.6) that is
  // bigger than vx itself — Booth flag: "the nose doesn't point where they fly"
  const vx = e.type === 0 ? e.vx + Math.sin(e.age * 0.06) * e.side * 0.6 : e.vx;
  return (vx * vx + e.vy * e.vy > 0.09) ? Math.atan2(e.vy, vx) - Math.PI / 2 : 0;
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
  const s = CACHE.get(key) || sprite(key, skin.span[e.type], hit ? WHITE : skin.rimOf(e.type, phase),
    (c) => skin.paintEnemy(c, e.type, phase, side ? 1 : -1, step, prop, hit, flick, extra, KIT));
  ctx.drawImage(s.img, Math.round(e.x) - s.o, Math.round(e.y) - s.o + dy);
}

// --- player -------------------------------------------------------------------
// ⚠ ART-CHANGE NOTE (r35/r57): the HOW TO card (src/howto.js) draws its ship
// through drawShip below, so the card mirrors by construction.
// r20 (Booth flags): the ship is drawn BIG around a tiny core — ~28px span on
// a 3px hit radius (bullets add their own 3px: a bullet kills when its
// centre is within 6px of the dot). boghog WS01. The core dot is always
// drawn at the full effective radius (hitR + 3 = 6px) — the marker is NEVER
// smaller than the truth (hitbox-display-report.md); focus whitens the dot
// and adds a 1px pink rim OUTSIDE it. The dot is not skinnable in size.
// r57 (§4): dark rim + a 1px hull-light rim along the top edge.
export function drawShip(ctx, x, y, focus) {
  const { SHIP } = skin.pal;
  const s = CACHE.get('ship') || sprite('ship', 36, SHIP.dark, (c) => skin.paintShip(c, KIT), SHIP.hull);
  const dk = focus ? 'dot1' : 'dot0';
  const d = CACHE.get(dk) || sprite(dk, 2 * (PLAYER.hitR + 5) + 2, null, (c) => {
    c.fillStyle = SHIP.well; disc(c, 0, 0, PLAYER.hitR + 5);
    if (focus) { c.fillStyle = ROUND.ring; disc(c, 0, 0, PLAYER.hitR + 4); }
    c.fillStyle = focus ? WHITE : SHIP.dot; disc(c, 0, 0, PLAYER.hitR + 3);
  });
  ctx.drawImage(s.img, x - s.o, y - s.o);
  ctx.drawImage(d.img, x - d.o, y - d.o);
}

export function drawPlayer(ctx, g) {
  const p = g.player;
  if (p.invuln > 0 && (g.frame & 2)) return; // classic invuln blink
  const x = Math.round(p.x), y = Math.round(p.y);
  // option trail (follow-through, S1) in the skin's dark player colour
  const tx = Math.round((p.x - p.prevX) * 2), ty = Math.round((p.y - p.prevY) * 2);
  ctx.fillStyle = skin.pal.SHIP.dark;
  ctx.fillRect(x - 19 - tx, y + 6 - ty, 5, 5);
  ctx.fillRect(x + 15 - tx, y + 6 - ty, 5, 5);
  drawShip(ctx, x, y, p.focus);
}

function drawHud(ctx, g) {
  const { UI } = skin.pal;
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
  const { UI } = skin.pal;
  ctx.fillStyle = UI.bannerBack;
  ctx.fillRect(0, H / 2 - 44, W, 92);
  ctx.font = 'bold 21px monospace'; ctx.fillStyle = UI.warn;
  ctx.fillText(big, W / 2, H / 2 - 16);
  ctx.font = '9px monospace'; ctx.fillStyle = UI.text;
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, H / 2 + 4 + i * 14));
}
