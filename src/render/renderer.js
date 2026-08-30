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
    ctx.translate((g.rng.next() - 0.5) * amp, (g.rng.next() - 0.5) * amp);
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
        ctx.fillStyle = '#ffe6f2';
        ctx.beginPath(); ctx.arc(b.x, b.y, 1.8, 0, 7); ctx.fill();
      } else { // cyan needle: elongated along velocity (S2 telegraphing)
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.fillStyle = '#031418'; ctx.fillRect(-7, -3, 14, 6);
        ctx.fillStyle = '#37d6e0'; ctx.fillRect(-6, -2, 12, 4);
        ctx.fillStyle = '#e8feff'; ctx.fillRect(0, -1, 6, 2);
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

function drawEnemy(ctx, g, e) {
  const flick = e.vulnAt < 0 && (g.frame & 4); // intro armor shimmer
  const hit = e.flash > 0; // r8-fx S4-MUST: hit-flash — every fill goes white for 2 frames
  const F = (c) => { ctx.fillStyle = hit ? '#ffffff' : c; };
  F(flick ? '#3a3f55' : ENEMY_TINT[e.type]);
  ctx.save(); ctx.translate(e.x, e.y);
  switch (e.type) {
    case 0: poly(ctx, [[0, -10], [8, 0], [0, 10], [-8, 0]]); break;         // diamond
    case 1: poly(ctx, [[-14, -6], [0, 4], [14, -6], [10, 8], [-10, 8]]); break; // chevron
    case 2: ctx.fillRect(-10, -10, 20, 20); F('#5a5f78'); ctx.fillRect(-3, 0, 6, 14); break; // turret
    case 3: poly(ctx, [[0, -20], [17, -10], [17, 10], [0, 20], [-17, 10], [-17, -10]]); break; // hex
    case 4: poly(ctx, [[0, -26], [24, -8], [16, 22], [-16, 22], [-24, -8]]); F('#6a7090'); poly(ctx, [[0, -14], [12, 8], [-12, 8]]); break;
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

function drawPlayer(ctx, g) {
  const p = g.player;
  if (p.invuln > 0 && (g.frame & 2)) return; // classic invuln blink
  ctx.save(); ctx.translate(p.x, p.y);
  // option trail (follow-through, S1) — violet family: the whole player identity
  // sits outside the enemy needle cyan (r5 S2-MUST-3, with the shot recolor)
  ctx.fillStyle = '#4a3f78';
  ctx.fillRect(-13 - (p.x - p.prevX) * 2, 4 - (p.y - p.prevY) * 2, 5, 5);
  ctx.fillRect(9 - (p.x - p.prevX) * 2, 4 - (p.y - p.prevY) * 2, 5, 5);
  ctx.fillStyle = '#f0ecff';
  poly(ctx, [[0, -12], [9, 10], [0, 5], [-9, 10]]);
  ctx.fillStyle = '#9a7dff';
  poly(ctx, [[0, -4], [4, 8], [-4, 8]]);
  if (p.focus) { // hitbox dot only while focused
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, PLAYER.hitR, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ff4fa3'; ctx.stroke();
  }
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
  // lives / bombs icons
  for (let i = 0; i < g.player.lives; i++) { ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.moveTo(W - 16 - i * 16, 12); ctx.lineTo(W - 10 - i * 16, 24); ctx.lineTo(W - 22 - i * 16, 24); ctx.closePath(); ctx.fill(); }
  for (let i = 0; i < g.player.bombs; i++) { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(W - 14 - i * 16, 36, 5, 0, 7); ctx.fill(); }

  ctx.textAlign = 'center';
  if (g.state === 'title') {
    banner(ctx, 'SPEEDHELL', ['PRESS ENTER', 'Z/SPACE shot · SHIFT focus · X bomb']);
  } else if (g.state === 'gameover') {
    banner(ctx, 'GAME OVER', ['SCORE ' + g.score + ' · SPEED ' + g.speedKills + '/' + g.kills, 'R to retry']);
  } else if (g.state === 'clear') {
    banner(ctx, 'STAGE CLEAR', ['SCORE ' + g.score + ' (STOCK +' + g.clearBonus + ')', 'SPEED ' + g.speedKills + '/' + g.kills + ' · R to retry']);
  }
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
