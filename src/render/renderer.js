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
import { W, H, PLAYER, FX, EXTEND_AT } from '../core/game.js';
import { SKINS } from './skins/index.js';
import { stageAt } from '../core/stages/index.js'; // r78: section anchors come from the stage module, not a mirror
import { sealed } from '../core/stage.js'; // r81: the r18 proximity seal, read (never written) for the sealed tell

// r50 lab: presentation prefs the shell may switch live (src/lab.js writes
// them). The renderer stays DOM-free; headless harnesses get the defaults.
// speedPopup: 'both' = SPEED +1600 · 'num' = +1600 · 'word' = SPEED · 'off'
// (r67: fxSize / fxStyle left the Lab — 2× and chunky shipped, see FX_SIZE and
// explodeChunky in core; bloom/heavy/classic painters deleted.) Explosions
// still draw BELOW bullets (S2 — they never mask threats).
// speedDress: r53 — transported to core as g.fxMeta by main.js (renderer ignores it)
// skin: r60 — which skins/*.js draws the world (setSkin below; Lab row `skin`); r62 default cute-occult
// muzzleAt / muzzlePrev / muzzleSide: r75–r77 — the muzzle flame's data path (not a Lab knob). main.js stamps
// muzzleAt = the g.frame it last saw SFX.SHOT in the ring (-1 = never), muzzlePrev = the volley before it, and
// toggles muzzleSide (which barrel flares this volley); drawShots strobes the flames off them. No core change.
// (r77: the Lab row `shotLook` left — 'heavy' shipped as THE shot, Q22 decided 2026-09-09; the r57 rect and
// the r75 bolt paths are deleted.)
export const prefs = { speedPopup: 'both', speedDress: 0, skin: 'cute-occult', muzzleAt: -1, muzzlePrev: -1, muzzleSide: 0 };
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
// r78: read from STAGES[g.level].SEC_T (stage 1: the same nine anchors).
function sectionOf(g) {
  const SEC_T = stageAt(g.level).SEC_T;
  let s = 0;
  for (let i = SEC_T.length - 1; i >= 0; i--) if (g.stageT >= SEC_T[i]) { s = i; break; }
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
  const { UI } = skin.pal;
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
  const sec = sectionOf(g);
  let bossPhase = -1;
  for (let i = 0; i < g.enemies.count; i++) {
    const e = g.enemies.items[i];
    if (e.type === 5) { bossPhase = e.phase; break; }
  }
  skin.drawBackground(ctx, g, bgScroll, sec, bossPhase, KIT, stageAt(g.level).SEC_T[sec]); // r78: secT = this section's entry stageT (landmark scroll)

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
  if (g.level === 1) drawPendulums(ctx, g); // r80: stage 2's chains, under the sprites
  for (let i = 0; i < g.enemies.count; i++) drawEnemy(ctx, g, g.enemies.items[i]);

  // player
  drawPlayer(ctx, g);

  // particles (below bullets: explosions must never mask threats, S2).
  drawFx(ctx, g);

  // player shots — tall white-headed bolts in the skin's player edge colour (S1); the player family
  // never shares a hue with enemy needles (r5 S2-MUST-3). r77: drawShots (was r76 `heavy`) is THE shot —
  // flame muzzle, 6×28 bolt + echo + trail, scorch — and stays BELOW enemy bullets (S2 display contract).
  drawShots(ctx, g);

  // ⚠ ART-CHANGE NOTE (r35/r57): src/howto.js draws its bullet card through
  // drawRoundBullet / drawNeedle below — the card mirrors by construction.
  // enemy bullets — TOP layer; needles above rounds (faster ⇒ higher, S2)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < g.eBullets.count; i++) {
      const b = g.eBullets.items[i];
      if (b.kind !== pass) continue;
      if (pass === 0) drawRoundBullet(ctx, b.x, b.y, g.frame, b.hatch);
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
export function drawRoundBullet(ctx, x, y, frame, hatch = 0) {
  // r82 THE EGG'S TELEGRAPH (stage 3's boss dialect). An egg is an ORDINARY
  // pink round — same body, same 3 px white hit core, same r20 display contract
  // — until its last 30 f, when six motes appear around it at exactly the
  // angles the hatch will fire and close in as the fuse burns. The telegraph
  // shows you the pattern that is coming, half a second ahead (well over the
  // S7 120 ms reaction floor), and it adds no colour family: pink only (S2).
  if (hatch > 0 && hatch <= 30) {
    const step = (hatch - 1) >> 3; // 3 → 0
    const h = CACHE.get(2010 + step) || sprite(2010 + step, 26, null, (c) => {
      const r = 4.5 + step * 2.6;
      c.fillStyle = step ? ROUND.ring : ROUND.ringHi;
      for (let k = 0; k < 6; k++) { const a = 0.26 + (k / 6) * Math.PI * 2; c.fillRect(Math.round(Math.cos(a) * r) - 1, Math.round(Math.sin(a) * r) - 1, 2, 2); }
    });
    ctx.drawImage(h.img, Math.round(x) - h.o, Math.round(y) - h.o);
  }
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

// --- THE PLAYER SHOT (r77 — was r76 Lab `shotLook` = heavy; Q22 decided 2026-09-09, Jacob: "heavy is
// obviously the best"; research player-shot-juice-2026-09-09 §6 + §8) -------------------------------------
// The r75 pixel bolt plus the six research recipes, in the frame study's revised order. Everything here is
// DRAWN, not simulated: hitboxes, speed, cap, damage and b.x / b.y are untouched (the only core touch is the
// impact blob + two up-sparks in game.js's hit block, fxRng only). Player family only (SHIP.shot / SHIP.shade /
// white); the whole pass sits under enemy bullets (S2 display contract). The r57 4×20 rect and the r75 5×20
// bolt were deleted with the Lab row (wiki §10 lifecycle rule).
// 1. MUZZLE at flame size — a flame per barrel, 10×12 with its rim (a third of the 28px ship: DaiOuJou's
//    option-pod flare, Garegga's nose flame), 4 frames (10×12 → 10×12 licked → 8×8 → 4×5), white core →
//    violet edge → dark-violet rim, ALTERNATING barrels per volley (main.js toggles prefs.muzzleSide and keeps
//    prefs.muzzlePrev), so at the 3-frame cadence the other barrel's dying flare overlaps the new one.
// 2. BOLT 6×28 — a 4px white head in a 1px rim (the head sits where the r75 head sat, so a hit still lands
//    at the nose), a 12-row body, narrowing at row 18, a 4px tail — plus an ECHO (the same sprite 4px behind
//    the tail at alpha 0.5: the Psikyo pair, drawn only) and a 16px TRAIL of four 3×4 ghosts behind the echo
//    (alpha 0.6 / 0.4 / 0.25 / 0.12). Bolt, echo and ghosts are clipped above the barrel line (py − 12) so a
//    28px bolt emerges from the flame instead of lying across the figurehead, and nothing trails over the
//    ship. Each lone volley reads as a 76px streak; a full column shows 3 bright + 1 dim + smear.
// 3. MESSIER stream — ±1px x-jitter per bolt, seeded on the frame it was first seen (stable, not sparkle),
//    and the right rail drawn one frame (9px) behind the left. Draw offsets only.
// 4. LAYERED impact — the blob lives 6 drawn frames at 8/6/4/3/2/1 px (pass 3 in drawFx), two up-sparks
//    (core), and a 1px SCORCH dot in SHIP.dark riding the hull for 10 frames (a renderer list keyed to
//    the enemy, drawn UNDER the fx from drawScorch; no sprite-cache change). The popcorn hit-flash is the core
//    field e.flash (already 2 frames) — untouched.
// 5. Hit-sound weight lives in audio.js (the SFX.HIT click, once per frame). 6. SHIMMER — spine 1px / 2px by frame.
// Known cosmetic artefact (r76, left as is): core culls a bolt at y < −20, so the echo (b.y + 22…49) and the
// ghosts (+50…66) of a bolt leaving the top stay visible for ~5 frames and then vanish with it — a comet
// tail following its head off the field; fading it would mean per-bolt tail state, not a one-liner.
function shotRows(wide) { // per row [x offset, width, colour]* for the 6×28 sprite (cols −3..2); 0 rim 1 body 2 white
  const rows = [[[-1, 2, 0]], [[-2, 1, 0], [-1, 2, 2], [1, 1, 0]]];
  for (let r = 0; r < 4; r++) rows.push([[-3, 1, 0], [-2, 4, 2], [2, 1, 0]]); // the 4px white head
  for (let r = 0; r < 12; r++) rows.push(wide ? [[-3, 1, 0], [-2, 1, 1], [-1, 2, 2], [1, 1, 1], [2, 1, 0]] : [[-3, 1, 0], [-2, 2, 1], [0, 1, 2], [1, 1, 1], [2, 1, 0]]);
  for (let r = 0; r < 4; r++) rows.push(wide ? [[-2, 1, 0], [-1, 2, 2], [1, 1, 0]] : [[-2, 1, 0], [-1, 1, 1], [0, 1, 2], [1, 1, 0]]);
  rows.push([[-2, 1, 0], [-1, 2, 1], [1, 1, 0]], [[-2, 1, 0], [-1, 2, 1], [1, 1, 0]]);
  for (let r = 0; r < 4; r++) rows.push([[-1, 2, 1]]); // 2px tail
  return rows; // 28 rows, drawn at dy = row − 10 (−10 … 17)
}
const SHOT_ROWS = [shotRows(false), shotRows(true)];
// flame frames, rows tip → base as [outer width, white-core width]; even widths centred on the barrel x
const FLARE_ROWS = [
  [[2, 0], [4, 0], [4, 2], [6, 2], [6, 4], [8, 4], [8, 6], [8, 6], [6, 4], [4, 2]],   // age 0: 8×10 + rim = 10×12
  [[2, 0], [2, 0], [4, 2], [6, 2], [6, 4], [8, 4], [8, 6], [8, 6], [8, 6], [6, 4]],   // age 1: the lick (same box, fatter base)
  [[2, 0], [2, 0], [4, 2], [6, 2], [6, 4], [4, 2]],                                   // age 2: 6×6 + rim = 8×8
  [[2, 0], [2, 2], [2, 0]],                                                           // age 3: 2×3 + rim = 4×5
];
const TRAIL_A = [0.6, 0.4, 0.25, 0.12];
const IMPACT_D = [8, 6, 4, 3, 2, 1]; // impact blob diameter by drawn frame (px, at the 3-hit size)
const BOLT_STATE = new WeakMap(); // pooled bolt object → { y, side, jit } (draw-only bookkeeping, never written back)
const SCORCH = []; // { e, dx, dy, age, f } — a 1px dot riding an enemy's hull for 10 frames after a hit
function shotSprite(k) {
  const { SHIP } = skin.pal, key = 'shot' + k;
  return CACHE.get(key) || sprite(key, 32, null, (c) => {
    const col = [SHIP.shade, SHIP.shot, WHITE], rows = SHOT_ROWS[k];
    for (let r = 0; r < rows.length; r++) for (const [dx, w, kk] of rows[r]) { c.fillStyle = col[kk]; c.fillRect(dx, r - 10, w, 1); }
  });
}
function flareSprite(age) {
  const { SHIP } = skin.pal, key = 'flare' + age;
  return CACHE.get(key) || sprite(key, 22, SHIP.shade, (c) => { // rows end at dy −1: the base sits on the barrel mouth
    const rows = FLARE_ROWS[age], h = rows.length;
    for (let r = 0; r < h; r++) { const [w, cw] = rows[r]; c.fillStyle = SHIP.shot; c.fillRect(-w / 2, r - h, w, 1); if (cw) { c.fillStyle = WHITE; c.fillRect(-cw / 2, r - h, cw, 1); } }
  });
}
// r57/r77 ART-CHANGE NOTE: src/howto.js draws the shipped bolt on its bullet card through drawShot — keep the
// player shot's pixels inside shotRows / shotSprite so the card mirrors the live art by construction (wiki §6.2).
export function drawShot(ctx, x, y) { const s = shotSprite(1); ctx.drawImage(s.img, Math.round(x) - s.o, Math.round(y) - s.o); }
function drawScorch(ctx, g) { // 4b. scorch dots (called from drawFx so the dots sit under the blob)
  // a blob particle on its first drawn frame marks the hull it hit (the nearest enemy within reach)
  const live = new Set(); for (let i = 0; i < g.enemies.count; i++) live.add(g.enemies.items[i]);
  for (let i = 0; i < g.particles.count; i++) {
    const q = g.particles.items[i];
    if (q.kind !== FX.CORE || q.ck !== 2 || q.life !== q.max - 1) continue;
    let best = null, bd = 1e9;
    for (const e of live) { const dx = q.x - e.x, dy = q.y - e.y, d = dx * dx + dy * dy; if (d < bd && d < (e.r + 8) * (e.r + 8)) { bd = d; best = e; } }
    if (best && SCORCH.length < 64) SCORCH.push({ e: best, dx: Math.round(q.x - best.x), dy: Math.round(q.y - best.y), age: best.age, f: g.frame });
  }
  ctx.fillStyle = skin.pal.SHIP.dark;
  for (let i = SCORCH.length - 1; i >= 0; i--) {
    const sc = SCORCH[i], dt = g.frame - sc.f;
    if (dt >= 10 || !live.has(sc.e) || sc.e.age !== sc.age + dt) { SCORCH[i] = SCORCH[SCORCH.length - 1]; SCORCH.pop(); continue; } // gone, or the slot was reused
    ctx.fillRect(Math.round(sc.e.x) + sc.dx, Math.round(sc.e.y) + sc.dy, 1, 1);
  }
}
function drawShots(ctx, g) {
  const { SHIP } = skin.pal, p = g.player, px = Math.round(p.x), py = Math.round(p.y);
  const n = g.pBullets.count, items = g.pBullets.items, s = shotSprite(g.frame & 1);
  // per-bolt draw state: side + jitter fixed on the frame the bolt is first seen (a new bolt is at p.y − 10 − 9
  // after its spawn tick; a reused pool slot shows up as y jumping DOWN). Nothing is written to the bolt.
  const X = new Int16Array(n), Y = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const b = items[i]; let st = BOLT_STATE.get(b);
    if (!st || b.y > st.y || b.y === p.y - 10 - 9) {
      const side = b.x < p.x ? 0 : 1, h = ((g.frame * 3 + side + 1) * 2654435761) >>> 0;
      st = { y: b.y, side, jit: (h >>> 8) % 3 - 1 }; BOLT_STATE.set(b, st);
    }
    st.y = b.y;
    X[i] = Math.round(b.x) + st.jit; Y[i] = Math.round(b.y) + (st.side ? 9 : 0); // 3. jitter + the right rail a frame behind
  }
  // 2. trail ghosts, then echoes, then the bolts — all clipped above the barrel line (a bolt emerges from the
  // flame; nothing trails over the ship)
  ctx.save(); ctx.beginPath(); ctx.rect(-40, -40, W + 80, py - 12 + 40); ctx.clip();
  ctx.fillStyle = SHIP.shot;
  for (let k = 0; k < 4; k++) { ctx.globalAlpha = TRAIL_A[k]; for (let i = 0; i < n; i++) ctx.fillRect(X[i] - 1, Y[i] + 50 + 4 * k, 3, 4); }
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < n; i++) ctx.drawImage(s.img, X[i] - s.o, Y[i] + 32 - s.o);
  ctx.globalAlpha = 1;
  for (let i = 0; i < n; i++) ctx.drawImage(s.img, X[i] - s.o, Y[i] - s.o);
  ctx.restore();
  // 1. the muzzle flames — this volley's barrel, and the previous volley's other barrel while its flare lives
  if (g.state !== 'play' || (p.invuln > 0 && (g.frame & 2))) return;
  const age = g.frame - prefs.muzzleAt, side = prefs.muzzleSide;
  if (age >= 0 && age <= 3) { const f = flareSprite(age); ctx.drawImage(f.img, px + (side ? 7 : -7) - f.o, py - 12 - f.o); }
  const ageP = g.frame - prefs.muzzlePrev;
  if (ageP >= 0 && ageP <= 3 && prefs.muzzlePrev !== prefs.muzzleAt) { const f = flareSprite(ageP); ctx.drawImage(f.img, px + (side ? -7 : 7) - f.o, py - 12 - f.o); }
}

function drawFx(ctx, g) {
  const n = g.particles.count, items = g.particles.items;
  const S = FX_SIZE;
  drawScorch(ctx, g); // r76/r77: scorch dots under every fx
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
  // r75/r76 pass 3 (r77: always on): the IMPACT BLOB — an opaque WHITE pixel disc inside a 1px dark-violet rim
  // (FX_RAMP[0][3], player family). Drawn LAST of the fx so the r8 hit sparks + fire puff at the same point
  // never wash it out, and rimmed because the hit-flash paints the enemy white for the same 2 frames and a bare
  // white flare vanished into it (peek, r75) — WS02 "very dark next to very bright". Six drawn frames,
  // collapsing 8/6/4/3/2/1 px at the 3-hit size (scaled by hits: 1 hit starts at 4px, 2 at 6px); odd sizes are
  // centred squares, even ones pixel discs. source-over (a solid flare on the hull, not a glow); still under
  // player shots and enemy bullets (S2).
  for (let i = 0; i < n; i++) {
    const q = items[i];
    if (q.kind !== FX.CORE || q.ck !== 2 || q.life > 6) continue;
    const d = Math.max(1, Math.round(IMPACT_D[6 - q.life] * q.size / 4)), x = Math.round(q.x), y = Math.round(q.y);
    if (d & 1) { const h = d >> 1; ctx.fillStyle = FX_RAMP[0][3]; ctx.fillRect(x - h - 1, y - h - 1, d + 2, d + 2); ctx.fillStyle = FX_RAMP[0][0]; ctx.fillRect(x - h, y - h, d, d); }
    else { ctx.fillStyle = FX_RAMP[0][3]; disc(ctx, x, y, d / 2 + 1); ctx.fillStyle = FX_RAMP[0][0]; disc(ctx, x, y, d / 2); }
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
    case 2: case 7: extra = stepOf(Math.atan2(g.player.y - e.y, g.player.x - e.x)) + ((e.vulnAt >= 0 && g.frame - e.vulnAt > 240) ? STEPS : 0); break; // barrel step + angry (r80: the tank aims like a turret)
    case 5: extra = (e.vulnAt < 0 && e.phase > 0) ? ((g.frame & 2) ? 2 : 1) : 0; break; // burn-in frames
    // r82 stage 3: heading for the two flyers, and one state bit each — the
    // leader's file has TURNED (its window expired), the carrier is past its
    // polite phase (doors open), a Moth is ENRAGED (its twin is down). All three
    // read core fields only; the painter draws the state (S4 feedback).
    case 11: step = stepOf(heading(e)); extra = e.phase === 1 ? 1 : 0; break;
    case 12: step = stepOf(heading(e)); extra = e.fireT > 380 ? 1 : 0; break;
    case 13: extra = e.bloomed ? 1 : 0; break;
  }
  if (e.type === 1) dy = Math.round(Math.sin(e.age * 0.09) * 0.8); // parked bob, whole pixels
  // r80: a type the skin does not paint (stage 2's ground layer, types ≥ 7) and the
  // stage-owned bosses of a later stage (types 4/5 on g.level > 0) FALL BACK to the
  // base skin's painter — cute-occult / synthwave creatures for them are a later
  // pass (plan §6: "other skins may lag; say so"). `lvl` reaches the painter and
  // the cache key, so stage 1's sprites are keyed exactly as before (lvl 0).
  const lvl = (e.type === 4 || e.type === 5) ? g.level : 0;
  const sk = (e.type < skin.span.length && !(lvl > 0)) ? skin : SKINS.base;
  // r81 SEALED TELL (presentation only — wiki §13.9): a ground gun (turret, tank,
  // wall, hull) that WOULD fire this frame but is sealed by proximity shows it:
  // exactly mayFire's condition with the seal true — vulnerable, below the top dead
  // zone, above the bottom band, inside 48 px. The painter RETRACTS the barrel (to
  // ~0.65 of its length, capped with 1 px of `out`, its highlight gone) and the sprite dims
  // for 2 frames in 4 (alpha toward the field = a washed value, bible §3; drawn
  // under the bullets as ever, so nothing is masked). Reads core; writes nothing.
  const tell = ((e.type === 2 || e.type === 7 || e.type === 8 || e.type === 9) && e.vulnAt >= 0 && e.y > 20 && e.y <= H - 60 && sealed(g, e)) ? 1 : 0;
  const key = ((((((((e.type * 4 + phase) * 2 + side) * STEPS + step) * 2 + prop) * 2 + hit) * 2 + flick) * 64 + extra) * 4 + lvl) * 2 + tell;
  const s = CACHE.get(key) || sprite(key, sk.span[e.type], hit ? WHITE : sk.rimOf(e.type, phase),
    (c) => sk.paintEnemy(c, e.type, phase, side ? 1 : -1, step, prop, hit, flick, extra, KIT, lvl, tell));
  const dim = tell && !hit && (g.frame & 2); // the hit-flash (S4-MUST) always wins over the tell
  if (dim) ctx.globalAlpha = 0.6;
  ctx.drawImage(s.img, Math.round(e.x) - s.o, Math.round(e.y) - s.o + dy);
  if (dim) ctx.globalAlpha = 1;
}

// r80 STAGE 2 pendulums: the Hearse's anchor chain (type 10 → its type-4 owner)
// and the Bell's clapper(s) (bobX/bobY on the type-5 entity; the clapper is an
// EMITTER, not an entity — drawn here as a small bob at the chain's end). Chains
// are dotted links in the base GROUND family, drawn under the sprites so the
// anchor / boss cover their ends. Keys off entity fields only — no rng.
function drawPendulums(ctx, g) {
  const { GROUND, HEAVY, BOSS } = SKINS.base.pal;
  const chain = (x0, y0, x1, y1) => {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6));
    ctx.fillStyle = GROUND.hi;
    for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(x0 + (x1 - x0) * t) - 1, Math.round(y0 + (y1 - y0) * t) - 1, 2, 2); }
  };
  let hearse = null, boss = null;
  for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; if (e.type === 4) hearse = e; else if (e.type === 5) boss = e; }
  if (hearse && g.level === 1 && hearse.bloomed === 1) for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; if (e.type === 10) chain(hearse.x, hearse.y + 8, e.x, e.y - 10); }
  if (boss && g.level === 1 && boss.age >= 90) {
    const bobs = boss.phase === 2 ? [[boss.bobX, boss.bobY], [boss.bobX2, boss.bobY2]] : [[boss.bobX, boss.bobY]];
    for (const [bx, by] of bobs) {
      chain(boss.x, boss.y + 8, bx, by);
      ctx.fillStyle = HEAVY.out; disc(ctx, Math.round(bx), Math.round(by), 7);
      ctx.fillStyle = BOSS.strut; disc(ctx, Math.round(bx), Math.round(by), 5);
      ctx.fillStyle = BOSS.cores[boss.phase] || WHITE; disc(ctx, Math.round(bx), Math.round(by), 2);
    }
  }
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
  if (g.practice || g.startLevel) { ctx.font = 'bold 9px monospace'; ctx.fillStyle = UI.gold; ctx.fillText('PRACTICE', 6, H - 6); } // r36: always visible — this score is rehearsal
  // lives / bombs icons
  ctx.fillStyle = UI.lives;
  for (let i = 0; i < g.player.lives; i++) poly(ctx, [[W - 16 - i * 16, 12], [W - 10 - i * 16, 24], [W - 22 - i * 16, 24]]);
  ctx.fillStyle = UI.gold;
  for (let i = 0; i < g.player.bombs; i++) disc(ctx, W - 14 - i * 16, 36, 5);
  if (!g.extended && g.state === 'play') { // r79: the extend is ANNOUNCED (plan §5 A1: fixed, visible, binary) — a dim line until earned
    ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillStyle = UI.dim || UI.warnText; ctx.fillText('EXTEND ' + EXTEND_AT, W - 6, 52); ctx.textAlign = 'left';
  }

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
