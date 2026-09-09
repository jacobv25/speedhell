// Booth replay — Claude's side of "watching you play". Re-simulates a Booth
// recording (seed + packed inputs) headlessly to a given tick and prints the
// game state there plus what happened in the window before it. Deterministic
// core ⇒ this IS the frame the player flagged.
//
//   node tools/booth-replay.mjs playtest/recordings/<session>-run<N>.json <tick> [windowFrames=180]
//   node tools/booth-replay.mjs <file> --note <i>      # tick taken from playtest/notes.jsonl line i
import { readFileSync } from 'node:fs';
import { makeGame, startRun, nextStage, update, W, H } from '../src/core/game.js';
import { STAGES, stageAt } from '../src/core/stages/index.js'; // r78
import { BUILD } from '../src/version.js';

const ENEMY = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss', 'boss-part'];
// r78: section names from the stage module (as booth.js); STn tag with >1 stage
const sectionOf = (g) => { const S = stageAt(g.level).SECTIONS, tag = STAGES.length > 1 ? `ST${g.level + 1} ` : ''; if (g.gate === 'midboss') return tag + 'S4 midboss'; if (g.gate === 'boss') return tag + 'S8 boss'; let s = 0; for (let i = S.length - 1; i >= 0; i--) if (g.stageT >= S[i].t) { s = i; break; } return tag + S[s].name; };

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

const g = startRun(makeGame(rec.seed), 0, rec.level || 0); // r78: tapes carry the stage they started on (absent = stage 1)
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
  if (g.state === 'stageclear') { nextStage(g); console.log(`(stage ${g.level + 1} entered at tick ${t + 1})`); continue; } // r78: the Booth records no ticks while it holds the clear screen
  if (g.state !== 'play') { console.log(`(run ended: ${g.state} at tick ${t + 1})`); break; }
}
const p = g.player;
const enemies = [];
for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; enemies.push(`${ENEMY[e.type]}#${i} x${e.x | 0} y${e.y | 0} age${e.age} hp${e.hp.toFixed(0)} ph${e.phase}${e.vulnAt >= 0 ? '' : ' (armored)'}`); }
// bullets near the player
let near = 0, incoming = 0;
for (let i = 0; i < g.eBullets.count; i++) { const q = g.eBullets.items[i]; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < 60) near++; if (d < 120 && (q.x - p.x) * q.vx + (q.y - p.y) * q.vy < 0) incoming++; }
console.log(JSON.stringify({
  file, tick: target, frame: g.frame, level: g.level, stageT: g.stageT, section: sectionOf(g), gate: g.gate, state: g.state,
  player: { x: p.x | 0, y: p.y | 0, lives: p.lives, bombs: p.bombs, invuln: p.invuln, focus: g.input.focus, fire: g.input.fire },
  score: g.score, chain: g.chain, kills: g.kills, speedKills: g.speedKills,
  bullets: g.eBullets.count, bulletsWithin60px: near, bulletsIncomingWithin120px: incoming, items: g.items.count,
  enemies, recentKills: g.stats.killLog.slice(-8), deaths: g.stats.deaths, timeouts: g.stats.timeoutLog,
  windowEvents: events,
}, null, 1));
