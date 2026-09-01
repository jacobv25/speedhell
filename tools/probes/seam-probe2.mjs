// "Nothing shootable" seconds across the S1->S2 seam for the FAST bot:
// frames (stageT>=400, before first turret vuln) where no enemy is vulnerable.
import { makeGame, startRun, update } from '/Users/jacobvalenzuela/Dev/speedhell/src/core/game.js';
import { makeBot } from '/Users/jacobvalenzuela/Dev/speedhell/test/bot.mjs';
const g = startRun(makeGame(1)); const bot = makeBot({ aggressive: true, lookahead: 14, reactDelay: 0 });
let streak = 0, maxStreak = 0, total = 0, done = false;
while (g.state === 'play' && g.frame < 3000 && !done) {
  bot(g); update(g);
  if (g.stageT >= 400) {
    let shootable = false, turretVuln = false;
    for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; if (e.vulnAt >= 0) { shootable = true; if (e.type === 2) turretVuln = true; } }
    if (turretVuln) { done = true; break; }
    if (!shootable) { streak++; total++; if (streak > maxStreak) maxStreak = streak; } else streak = 0;
  }
}
console.log(JSON.stringify({ maxNothingShootableSec: +(maxStreak/60).toFixed(2), totalSec: +(total/60).toFixed(2), frame: g.frame }));
