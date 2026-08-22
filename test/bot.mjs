// Scripted bots — shared by the sim referee (test/sim.mjs, Node) and the
// screenshot harness (test/shots.html, browser). Referee infrastructure:
// builders never edit this file.
// Greedy dodge: sample candidate moves, project bullets N frames, pick the move
// maximizing minimum clearance. reactDelay models human reaction (S7: 120ms ≈ 7f).
import { W, H, PLAYER } from '../src/core/game.js';

export function makeBot({ aggressive, lookahead = 12, reactDelay = 0 }) {
  let delayed = 0;
  return (g) => {
    const p = g.player, i = g.input;
    i.fire = true; i.bomb = false; i.focus = false;
    if (reactDelay > 0 && (delayed = (delayed + 1) % (reactDelay + 1)) !== 0) return;

    let target = W / 2;
    if (aggressive && g.enemies.count > 0) {
      let best = 1e9;
      for (let k = 0; k < g.enemies.count; k++) {
        const e = g.enemies.items[k];
        if (e.vulnAt < 0 || e.y > p.y - 40) continue;
        const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 0.3;
        if (d < best) { best = d; target = e.x; }
      }
    }
    let bestScore = -1e9, bestDx = 0, bestDy = 0;
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
      const spd = PLAYER.speed;
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
      const homeY = -Math.abs((H - 110) - py) * 0.15;
      const homeX = -Math.abs(target - px) * (aggressive ? 0.35 : 0.08);
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
