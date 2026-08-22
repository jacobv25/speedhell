// Canvas2D renderer. Visibility rules from rubric S2: washed-out low-contrast
// background; bullets pair dark rims with bright cores; consistent language
// (pink rounds = static/random, cyan needles = aimed); bullets on top.
import { W, H, PLAYER } from '../core/game.js';

const ENEMY_TINT = ['#8a8fa8', '#9aa0b8', '#7d8298', '#a8adc4', '#b8bdd4', '#c8cde0'];
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

export function resetHud() { displayScore = 0; }

export function draw(g, ctx, bgScroll) {
  ctx.save();
  if (g.shake > 0) ctx.translate((g.rng.next() - 0.5) * g.shake, (g.rng.next() - 0.5) * g.shake);

  // background: deep indigo, faint slow stars — low value contrast (S2),
  // hue-accented per section so each place reads distinct (r5 S5-SHOULD-1)
  const sec = sectionOf(g.stageT);
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  // landmark slab: enters at the section boundary, scrolls with section progress
  {
    const [lx, lw, lh] = SEC_LANDGEO[sec];
    const ly = (g.stageT - SEC_T[sec]) * 0.55 - lh - 20;
    if (ly < H + 20) {
      ctx.fillStyle = SEC_LAND[sec];
      ctx.fillRect(lx, ly, lw, lh);
      ctx.fillStyle = SEC_SLAB[sec];
      ctx.fillRect(lx + 10, ly + 8, lw - 20, lh - 16); // inset gives it structure
    }
  }
  ctx.fillStyle = SEC_STAR[sec];
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137.5) % W;
    const sy = ((i * 89.3) + bgScroll * (0.4 + (i % 3) * 0.3)) % (H + 40) - 20;
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, 8 + (i % 3) * 6);
  }
  ctx.fillStyle = SEC_SLAB[sec];
  for (let i = 0; i < 6; i++) {
    const sy = ((i * 173) + bgScroll * 0.25) % (H + 120) - 60;
    ctx.fillRect(30 + (i * 97) % (W - 120), sy, 60, 34); // dim "terrain" slabs
  }

  // items — gold, unmistakable vs bullets (S2)
  for (let i = 0; i < g.items.count; i++) {
    const it = g.items.items[i];
    ctx.fillStyle = '#0e0c04';
    ctx.beginPath(); ctx.arc(it.x, it.y, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(it.x, it.y, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff6d0';
    ctx.fillRect(it.x - 1, it.y - 1, 2, 2);
  }

  // enemies — desaturated silhouettes, distinct per role (S4)
  for (let i = 0; i < g.enemies.count; i++) drawEnemy(ctx, g, g.enemies.items[i]);

  // player
  drawPlayer(ctx, g);

  // particles (below bullets: explosions must never mask threats, S2)
  for (let i = 0; i < g.particles.count; i++) {
    const q = g.particles.items[i];
    const a = q.life / q.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = q.hue === 0 ? '#ffffff' : q.hue === 200 ? '#7fd8ff' : q.hue === 190 ? '#9fe8ff' : '#ffb347';
    const s = 2 + a * 3;
    ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;

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

function drawEnemy(ctx, g, e) {
  const flick = e.vulnAt < 0 && (g.frame & 4); // intro armor shimmer
  ctx.fillStyle = flick ? '#3a3f55' : ENEMY_TINT[e.type];
  ctx.save(); ctx.translate(e.x, e.y);
  switch (e.type) {
    case 0: poly(ctx, [[0, -10], [8, 0], [0, 10], [-8, 0]]); break;         // diamond
    case 1: poly(ctx, [[-14, -6], [0, 4], [14, -6], [10, 8], [-10, 8]]); break; // chevron
    case 2: ctx.fillRect(-10, -10, 20, 20); ctx.fillStyle = '#5a5f78'; ctx.fillRect(-3, 0, 6, 14); break; // turret
    case 3: poly(ctx, [[0, -20], [17, -10], [17, 10], [0, 20], [-17, 10], [-17, -10]]); break; // hex
    case 4: poly(ctx, [[0, -26], [24, -8], [16, 22], [-16, 22], [-24, -8]]); ctx.fillStyle = '#6a7090'; poly(ctx, [[0, -14], [12, 8], [-12, 8]]); break;
    case 5: {
      poly(ctx, [[0, -30], [28, -12], [22, 26], [-22, 26], [-28, -12]]);
      ctx.fillStyle = ['#ff4fa3', '#37d6e0', '#ffd24a'][e.phase] || '#fff';
      poly(ctx, [[0, -16], [14, 10], [-14, 10]]); // core tint telegraphs phase
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
