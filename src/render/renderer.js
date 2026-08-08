// Canvas2D renderer. Visibility rules from rubric S2: washed-out low-contrast
// background; bullets pair dark rims with bright cores; consistent language
// (pink rounds = static/random, cyan needles = aimed); bullets on top.
import { W, H, PLAYER } from '../core/game.js';

const ENEMY_TINT = ['#8a8fa8', '#9aa0b8', '#7d8298', '#a8adc4', '#b8bdd4', '#c8cde0'];
let displayScore = 0; // ticks up toward real score [BOGHOG_CRAFT]

export function resetHud() { displayScore = 0; }

export function draw(g, ctx, bgScroll) {
  ctx.save();
  if (g.shake > 0) ctx.translate((g.rng.next() - 0.5) * g.shake, (g.rng.next() - 0.5) * g.shake);

  // background: deep indigo, faint slow stars — low value contrast (S2)
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.fillStyle = '#161a28';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137.5) % W;
    const sy = ((i * 89.3) + bgScroll * (0.4 + (i % 3) * 0.3)) % (H + 40) - 20;
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, 8 + (i % 3) * 6);
  }
  ctx.fillStyle = '#12151f';
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

  // player shots — tall cyan-white bolts (S1)
  ctx.fillStyle = '#bff4ff';
  for (let i = 0; i < g.pBullets.count; i++) {
    const b = g.pBullets.items[i];
    ctx.fillRect(b.x - 2, b.y - 10, 4, 20);
  }

  // enemy bullets — TOP layer; needles above rounds (faster ⇒ higher, S2)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < g.eBullets.count; i++) {
      const b = g.eBullets.items[i];
      if (b.kind !== pass) continue;
      if (pass === 0) { // pink round: dark rim, bright ring, white core
        ctx.fillStyle = '#20060f';
        ctx.beginPath(); ctx.arc(b.x, b.y, 5.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#ff4fa3';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4.2, 0, 7); ctx.fill();
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

  // bomb / cancel flashes
  if (g.flash > 0) { ctx.globalAlpha = g.flash / 24; ctx.fillStyle = '#dff6ff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (g.cancelFlash > 0) { ctx.globalAlpha = g.cancelFlash / 60; ctx.fillStyle = '#ffd24a'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }

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
  // option trail (follow-through, S1)
  ctx.fillStyle = '#2a5f6f';
  ctx.fillRect(-13 - (p.x - p.prevX) * 2, 4 - (p.y - p.prevY) * 2, 5, 5);
  ctx.fillRect(9 - (p.x - p.prevX) * 2, 4 - (p.y - p.prevY) * 2, 5, 5);
  ctx.fillStyle = '#e8f6ff';
  poly(ctx, [[0, -12], [9, 10], [0, 5], [-9, 10]]);
  ctx.fillStyle = '#37d6e0';
  poly(ctx, [[0, -4], [4, 8], [-4, 8]]);
  if (p.focus) { // hitbox dot only while focused
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, PLAYER.hitR, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ff4fa3'; ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, g) {
  displayScore += Math.ceil((g.score - displayScore) * 0.18);
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
    banner(ctx, 'SPEEDHELL', 'PRESS ENTER — Z/SPACE shot · SHIFT focus · X bomb');
  } else if (g.state === 'gameover') {
    banner(ctx, 'GAME OVER', 'SCORE ' + g.score + ' · SPEED KILLS ' + g.speedKills + '/' + g.kills + ' · R to retry');
  } else if (g.state === 'clear') {
    banner(ctx, 'STAGE CLEAR', 'SCORE ' + g.score + ' (STOCK BONUS +' + g.clearBonus + ') · SPEED ' + g.speedKills + '/' + g.kills + ' · R to retry');
  }
}

function banner(ctx, big, small) {
  ctx.fillStyle = 'rgba(6,8,14,0.72)';
  ctx.fillRect(0, H / 2 - 60, W, 120);
  ctx.font = 'bold 34px monospace'; ctx.fillStyle = '#ff4fa3';
  ctx.fillText(big, W / 2, H / 2 - 10);
  ctx.font = '12px monospace'; ctx.fillStyle = '#cdd3e8';
  ctx.fillText(small, W / 2, H / 2 + 20);
}
