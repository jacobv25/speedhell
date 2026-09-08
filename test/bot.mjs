// Scripted bots — shared by the sim referee (test/sim.mjs, Node) and the
// screenshot harness (test/shots.html, browser). Referee infrastructure:
// builders never edit this file.
// Greedy dodge: sample candidate moves, project bullets N frames, pick the move
// maximizing minimum clearance. reactDelay models human reaction (S7: 120ms ≈ 7f).
import { W, H, PLAYER, SHIPS } from '../src/core/game.js';

// r65 referee fix (Jacob-authorized, 2026-09-07): the aggressive bot used to home
// to y = H-110 whatever it was shooting at. With shotLimit 6 / shotSpeed 9 a shot
// from the bottom lives ~37f, so the limit capped fire at ~1 per 6f instead of
// 1 per 3f — half DPS on the midboss/boss ("the computer player was shooting
// from too far away"). closeY = how far below a big target (midboss/boss/part)
// the bot now tries to sit; closePull/trackPull = the y/x homing weights while a
// big target is on screen (0.15/0.35 otherwise). Chosen by full-referee sweep:
// 110/1.0/0.8 → zero timeouts on all seeds, s6/s4/s7_clearable green; the
// only red left is lives (s7_robust) — closing in costs deaths.
export function makeBot({ aggressive, lookahead = 12, reactDelay = 0, closeY = 110, closePull = 1.0, trackPull = 0.8 }) {
  let delayed = 0;
  return (g) => {
    const p = g.player, i = g.input;
    i.fire = true; i.bomb = false; i.focus = false;
    if (reactDelay > 0 && (delayed = (delayed + 1) % (reactDelay + 1)) !== 0) return;

    let target = W / 2, homeTargetY = H - 110, big = false;
    if (aggressive && g.enemies.count > 0) {
      let best = 1e9, bigY = -1;
      for (let k = 0; k < g.enemies.count; k++) {
        const e = g.enemies.items[k];
        if (e.vulnAt < 0 || e.y > p.y - 40) continue;
        if (e.type >= 4 && e.y > bigY) bigY = e.y; // midboss 4 / boss 5 / part 6
        const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 0.3;
        if (d < best) { best = d; target = e.x; }
      }
      if (bigY >= 0) { big = true; homeTargetY = Math.min(H - 110, Math.max(120, bigY + closeY)); }
    }
    let bestScore = -1e9, bestDx = 0, bestDy = 0;
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
      const spd = SHIPS[g.ship].speed; // r69: the active ship's move speed (ship A = PLAYER.speed, same 3.7 — path unchanged)
      let px = p.x, py = p.y, minClear = 1e9;
      for (let f = 1; f <= lookahead; f++) {
        px = Math.max(12, Math.min(W - 12, px + dx * spd * ((dx && dy) ? 0.707 : 1)));
        py = Math.max(16, Math.min(H - 16, py + dy * spd * ((dx && dy) ? 0.707 : 1)));
        for (let b = 0; b < g.eBullets.count; b++) {
          const q = g.eBullets.items[b];
          const bx = q.x + q.vx * f, by = q.y + q.vy * f;
          const d = Math.hypot(bx - px, by - py) - q.r - PLAYER.hitR;
          if (d < minClear) minClear = d;
        }
        for (let e = 0; e < g.enemies.count; e++) {
          const q = g.enemies.items[e];
          const d = Math.hypot(q.x - px, q.y - py) - q.r - PLAYER.hitR;
          if (d < minClear) minClear = d;
        }
      }
      const clearScore = Math.min(minClear, 60);
      const homeY = -Math.abs(homeTargetY - py) * (big ? closePull : 0.15);
      const homeX = -Math.abs(target - px) * (aggressive ? (big ? trackPull : 0.35) : 0.08);
      const s = clearScore * 3 + homeY + homeX;
      if (s > bestScore) { bestScore = s; bestDx = dx; bestDy = dy; }
    }
    i.dx = bestDx; i.dy = bestDy;
    // panic bomb when boxed in (checkmate detector, not an auto-win)
    let nearest = 1e9;
    for (let b = 0; b < g.eBullets.count; b++) {
      const q = g.eBullets.items[b];
      const d = Math.hypot(q.x - p.x, q.y - p.y) - q.r;
      if (d < nearest) nearest = d;
    }
    if (nearest < 10 && bestScore < 20) i.bomb = true;
  };
}
