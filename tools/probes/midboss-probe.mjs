import { makeGame, startRun, update, W, H } from '/Users/jacobvalenzuela/Dev/speedhell/src/core/game.js';
import { makeBot } from '/Users/jacobvalenzuela/Dev/speedhell/test/bot.mjs';
for (const [name, opts] of [['expert', { aggressive: true, lookahead: 14, reactDelay: 0 }], ['aggressive-human', { aggressive: true, lookahead: 10, reactDelay: 7 }]]) {
  const g = startRun(makeGame(1)); const bot = makeBot(opts);
  let inGate = false, gateStart = -1, bSum = 0, eSum = 0, n = 0, deathsIn = 0, popIn = 0, prevKills = 0;
  while (g.state === 'play' && g.frame < 12000) {
    bot(g); update(g);
    if (g.gate === 'midboss') { if (!inGate) { inGate = true; gateStart = g.frame; prevKills = g.kills; } bSum += g.eBullets.count; eSum += g.enemies.count; n++; }
    else if (inGate) { inGate = false; popIn = g.kills - prevKills - 1; break; }
  }
  const mb = g.stats.killLog.filter(k => k.t === 4)[0];
  const d = g.stats.deaths.filter(x => x.f >= gateStart);
  console.log(JSON.stringify({ name, midbossKillFramesFromVuln: mb ? mb.f : null, speed: mb ? mb.s : null, gateFrames: n, avgBulletsInGate: +(bSum / Math.max(1, n)).toFixed(1), avgEnemiesInGate: +(eSum / Math.max(1, n)).toFixed(2), popcornKilledInGate: popIn, deathsInGate: d.length, timeouts: g.stats.timeoutLog }));
}
