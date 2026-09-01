// Top-camper probe for turret alley (stageT 720-1700). NOT a referee check —
// scratch instrumentation for the turret arrival-shot decision.
// Camper: holds y=CAMP_Y, slides x onto the nearest approaching turret column,
// fires always. Two variants: 'pure' never dodges; 'dodgy' sidesteps bullets
// within a short lookahead but never leaves the camp band.
import { makeGame, startRun, update, W, H, PLAYER } from '/Users/jacobvalenzuela/Dev/speedhell/src/core/game.js';

const CAMP_Y = Number(process.argv[2] || 50);
const MODE = process.argv[3] || 'pure';
const SEED = Number(process.argv[4] || 1);

function camper(g) {
  const p = g.player, i = g.input;
  i.fire = true; i.bomb = false; i.focus = false;
  let tx = W / 2, best = 1e9;
  for (let k = 0; k < g.enemies.count; k++) {
    const e = g.enemies.items[k];
    if (e.type !== 2 || e.y > p.y - 20) continue;
    const d = Math.abs(e.x - p.x) + Math.max(0, 16 - e.y) * 0.3; // prefer ones about to be vulnerable
    if (d < best) { best = d; tx = e.x; }
  }
  let dx = Math.sign(tx - p.x) * (Math.abs(tx - p.x) > 2 ? 1 : 0);
  let dy = Math.sign(CAMP_Y - p.y) * (Math.abs(CAMP_Y - p.y) > 2 ? 1 : 0);
  if (MODE === 'dodgy') {
    // sidestep any bullet that will pass within 10px in the next 10 frames
    let threat = 0;
    for (let b = 0; b < g.eBullets.count; b++) {
      const q = g.eBullets.items[b];
      for (let f = 1; f <= 10; f++) {
        const bx = q.x + q.vx * f, by = q.y + q.vy * f;
        if (Math.hypot(bx - p.x, by - p.y) < 10) { threat = bx >= p.x ? -1 : 1; break; }
      }
      if (threat) break;
    }
    if (threat) dx = threat;
  }
  i.dx = dx; i.dy = dy;
}

const g = startRun(makeGame(SEED));
let spawned = 0, prevB = 0, inAlley = false, alleyStart = -1, alleyEnd = -1;
let bulletSum = 0, bulletFrames = 0, maxB = 0;
const killsBefore = g.stats.killLog.length, deathsBefore = g.stats.deaths.length;
while (g.state === 'play' && g.frame < 9000) {
  camper(g); update(g);
  const t = g.stageT;
  if (t >= 720 && t < 1700) {
    if (!inAlley) { inAlley = true; alleyStart = g.frame; }
    const b = g.eBullets.count;
    if (b > prevB) spawned += b - prevB;
    bulletSum += b; bulletFrames++; if (b > maxB) maxB = b;
    prevB = b;
  } else if (inAlley) { alleyEnd = g.frame; break; }
}
const turretKills = g.stats.killLog.filter(k => k.t === 2);
const deaths = g.stats.deaths.filter(d => d.f >= alleyStart && (alleyEnd < 0 || d.f <= alleyEnd));
console.log(JSON.stringify({
  campY: CAMP_Y, mode: MODE, seed: SEED,
  alleyFrames: alleyEnd - alleyStart,
  turretKills: turretKills.length,
  speedKills: turretKills.filter(k => k.s).length,
  killAgesFromVuln: turretKills.map(k => k.f),
  bulletsSpawnedInAlley: spawned,
  avgBullets: +(bulletSum / Math.max(1, bulletFrames)).toFixed(1), maxBullets: maxB,
  deathsInAlley: deaths.map(d => ({ f: d.f - alleyStart, x: d.x, y: d.y, c: d.c })),
  livesLeft: g.player.lives, state: g.state,
}));
