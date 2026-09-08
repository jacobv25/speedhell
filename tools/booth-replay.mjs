// Booth replay — Claude's side of "watching you play". Re-simulates a Booth
// recording (seed + packed inputs) headlessly to a given tick and prints the
// game state there plus what happened in the window before it. Deterministic
// core ⇒ this IS the frame the player flagged.
//
//   node tools/booth-replay.mjs playtest/recordings/<session>-run<N>.json <tick> [windowFrames=180]
//   node tools/booth-replay.mjs <file> --note <i>      # tick taken from playtest/notes.jsonl line i
import { readFileSync } from 'node:fs';
import { makeGame, startRun, update, W, H } from '../src/core/game.js';
import { BUILD } from '../src/version.js';

const ENEMY = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss', 'boss-part'];
const SEC_T = [0, 120, 720, 1700, 2400, 2460, 2900, 3700, 3900];
const SEC_NAME = ['intro', 'S1 popcorn intro', 'S2 turret alley', 'S3 mid gauntlet', 'S4 midboss', 'S5 rush', 'S6 elite pair', 'S7 release', 'S8 boss'];
const sectionOf = (g) => { if (g.gate === 'midboss') return 'S4 midboss'; if (g.gate === 'boss') return 'S8 boss'; let s = 0; for (let i = SEC_T.length - 1; i >= 0; i--) if (g.stageT >= SEC_T[i]) { s = i; break; } return SEC_NAME[s]; };

const [file, a, b] = process.argv.slice(2);
if (!file) { console.error('usage: booth-replay <recording.json> <tick> [window] | <recording.json> --note <i>'); process.exit(2); }
const rec = JSON.parse(readFileSync(file, 'utf8'));
if (rec.build !== BUILD) console.error(`⚠ tape build ${rec.build} ≠ current ${BUILD} — cross-build replays can diverge legitimately (core changed between)`);
if (parseInt(String(rec.build).slice(1)) < 28) console.error('⚠ pre-r28 tape: recorded while draw() leaked g.rng on screen shake — the live run drifted from clean replay after the first shake (bomb / elite / midboss kill / death). Historical tapes; do not debug their divergence. See wiki changelog r28.');
let target = Number(a), win = Number(b) || 180;
if (a === '--note') {
  const lines = readFileSync('playtest/notes.jsonl', 'utf8').split('\n').filter(Boolean);
  const n = JSON.parse(lines[Number(b)]); target = n.snap.tick; win = 180;
}
const bytes = Uint8Array.from(Buffer.from(rec.inputs, 'base64'));
if (target > bytes.length) { console.error(`tick ${target} beyond recording (${bytes.length} ticks)`); process.exit(2); }

const g = startRun(makeGame(rec.seed), 0, rec.ship || 0); // r69: the tape's ship (pre-r69 tapes: ship A)
if (rec.tune) Object.assign(g.tune, rec.tune); // r26: replay under the run's recorded variant
const events = []; // window log: kills, deaths, bullet spawns per frame
let prevB = 0, prevKills = 0, prevDeaths = 0;
for (let t = 0; t < target; t++) {
  const v = bytes[t], i = g.input;
  i.dx = (v & 3) - 1; i.dy = ((v >> 2) & 3) - 1; i.fire = !!(v & 16); i.bomb = !!(v & 32); i.focus = !!(v & 64);
  update(g);
  if (t >= target - win) {
    const spawned = Math.max(0, g.eBullets.count - prevB);
    const kills = g.stats.killLog.slice(prevKills).map((k) => `${ENEMY[k.t]}${k.s ? '(SPEED)' : ''}`);
    const died = g.stats.deaths.length > prevDeaths ? g.stats.deaths[g.stats.deaths.length - 1] : null;
    if (spawned >= 3 || kills.length || died) events.push({ tick: t + 1, frame: g.frame, bulletsSpawned: spawned || undefined, kills: kills.length ? kills : undefined, died: died ? `${died.c} @${died.x},${died.y}` : undefined });
  }
  prevB = g.eBullets.count; prevKills = g.stats.killLog.length; prevDeaths = g.stats.deaths.length;
  if (g.state !== 'play') { console.log(`(run ended: ${g.state} at tick ${t + 1})`); break; }
}
const p = g.player;
const enemies = [];
for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; enemies.push(`${ENEMY[e.type]}#${i} x${e.x | 0} y${e.y | 0} age${e.age} hp${e.hp.toFixed(0)} ph${e.phase}${e.vulnAt >= 0 ? '' : ' (armored)'}`); }
// bullets near the player
let near = 0, incoming = 0;
for (let i = 0; i < g.eBullets.count; i++) { const q = g.eBullets.items[i]; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < 60) near++; if (d < 120 && (q.x - p.x) * q.vx + (q.y - p.y) * q.vy < 0) incoming++; }
console.log(JSON.stringify({
  file, tick: target, frame: g.frame, stageT: g.stageT, section: sectionOf(g), gate: g.gate, state: g.state,
  player: { x: p.x | 0, y: p.y | 0, lives: p.lives, bombs: p.bombs, invuln: p.invuln, focus: g.input.focus, fire: g.input.fire },
  score: g.score, chain: g.chain, kills: g.kills, speedKills: g.speedKills,
  bullets: g.eBullets.count, bulletsWithin60px: near, bulletsIncomingWithin120px: incoming, items: g.items.count,
  enemies, recentKills: g.stats.killLog.slice(-8), deaths: g.stats.deaths, timeouts: g.stats.timeoutLog,
  windowEvents: events,
}, null, 1));
