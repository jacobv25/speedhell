// Ship B probe (r69, docs/plans/ship-b.md step 2) — builder tool, NOT referee
// infrastructure. Runs the sim's four bots on every ship, prints the ship × bot
// table, the per-enemy-type speed-kill table (the honesty check for windows:
// B must earn its elite/midboss/boss speed kills by closing in, not be locked
// out of them), the point-blank / range dps per ship, and the Ship-A identity
// check against evidence/metrics.json (must say IDENTICAL — ship 0 is the
// certified craft, byte for byte).
//   node tools/probes/ship-b-probe.mjs            # seed C0FFEE, all bots, both ships
//   node tools/probes/ship-b-probe.mjs --robust   # + the s7_robust seeds (expert only)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeGame, startRun, update, spawnEnemy, W, H, SHIPS } from '../../src/core/game.js';
import { makeBot } from '../../test/bot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = 0xC0FFEE, MAX_FRAMES = 30000;
const ROBUST = process.argv.includes('--robust');
const ROBUST_SEEDS = [0xBADA55, 0x5EED42, 0x1234567, 0xFACADE, 0xAB12CD, 0xFEEDF00D]; // = sim.mjs s7_robust
// the four bot configs, copied VERBATIM from test/sim.mjs `runs`
const BOTS = [
  ['expert', { aggressive: true, lookahead: 14, reactDelay: 0 }],
  ['aggressive-human', { aggressive: true, lookahead: 10, reactDelay: 7 }],
  ['passive-human', { aggressive: false, lookahead: 10, reactDelay: 7 }],
  ['blind', { aggressive: false, lookahead: 4, reactDelay: 14 }],
];
const TYPES = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss', 'part'];

function run(ship, botOpts, seed = SEED) {
  const g = makeGame(seed); startRun(g, 0, ship);
  const bot = makeBot(botOpts);
  while (g.state === 'play' && g.frame < MAX_FRAMES) { bot(g); update(g); }
  const byType = {};
  for (const k of g.stats.killLog) { const t = TYPES[k.t]; byType[t] = byType[t] || { n: 0, speed: 0 }; byType[t].n++; byType[t].speed += k.s; }
  return {
    outcome: g.state, frames: g.frame, score: g.score, kills: g.kills, speedKills: g.speedKills,
    speedRate: g.kills ? g.speedKills / g.kills : 0, deaths: g.stats.deaths.length, lives: Math.max(0, g.player.lives),
    timeouts: g.stats.timeouts, byType,
  };
}

// point-blank / range dps, same probe as sim.mjs s1_pointblank (elite pinned at y 200)
function dps(ship, dist) {
  const g = makeGame(3); startRun(g, 0, ship); g.timeline = []; g.tlIndex = 0;
  const e = spawnEnemy(g, 3, W / 2, 200); e.hp = 1e9; g.player.invuln = 1e9; g.input.fire = true;
  const pin = () => { g.player.x = W / 2; g.player.y = Math.min(H - 20, 200 + dist); g.input.dx = 0; g.input.dy = 0; e.x = W / 2; e.y = 200; };
  for (let f = 0; f < 60; f++) { pin(); update(g); }
  const hp0 = e.hp;
  for (let f = 0; f < 600; f++) { pin(); update(g); }
  return (hp0 - e.hp) / 10;
}

const pct = (r) => (r.n ? Math.round((100 * r.speed) / r.n) + '%' : '—');
const cell = (r) => (r ? `${r.speed}/${r.n} ${pct(r)}` : '—');

console.log(`SHIP B PROBE — seed ${SEED.toString(16)} · ships: ${SHIPS.map((s, i) => `${i}=${s.name} (spd ${s.speed}/${s.focusSpeed}, cap ${s.shotLimit}, ${s.volley.length} bolts)`).join(' · ')}`);
console.log('\nship × bot');
console.log('ship       bot               outcome   frames    score  kills  speed%  deaths  lives  timeouts');
const results = {};
for (let ship = 0; ship < SHIPS.length; ship++) {
  results[ship] = {};
  for (const [name, opts] of BOTS) {
    const r = (results[ship][name] = run(ship, opts));
    console.log(`${SHIPS[ship].name.padEnd(10)} ${name.padEnd(17)} ${r.outcome.padEnd(9)} ${String(r.frames).padStart(6)} ${String(r.score).padStart(8)} ${String(r.kills).padStart(6)} ${String(Math.round(r.speedRate * 100) + '%').padStart(7)} ${String(r.deaths).padStart(7)} ${String(r.lives).padStart(6)} ${String(r.timeouts).padStart(9)}`);
  }
}

console.log('\nper-enemy-type speed kills (made/attempts rate) — expert bot');
console.log('ship       ' + TYPES.map((t) => t.padEnd(14)).join(''));
for (let ship = 0; ship < SHIPS.length; ship++) {
  const bt = results[ship].expert.byType;
  console.log(SHIPS[ship].name.padEnd(11) + TYPES.map((t) => cell(bt[t]).padEnd(14)).join(''));
}
console.log('\nper-enemy-type speed kills — aggressive-human bot');
console.log('ship       ' + TYPES.map((t) => t.padEnd(14)).join(''));
for (let ship = 0; ship < SHIPS.length; ship++) {
  const bt = results[ship]['aggressive-human'].byType;
  console.log(SHIPS[ship].name.padEnd(11) + TYPES.map((t) => cell(bt[t]).padEnd(14)).join(''));
}

console.log('\ndps (elite pinned, sim s1 probe): point-blank 27px / range 200px');
for (let ship = 0; ship < SHIPS.length; ship++) {
  const c = dps(ship, Math.round(W * 0.083)), f = dps(ship, Math.round(W * 0.625));
  console.log(`${SHIPS[ship].name.padEnd(10)} close ${c.toFixed(1)}  far ${f.toFixed(1)}  ratio ${(c / f).toFixed(2)}`);
}

if (ROBUST) {
  console.log('\ns7_robust seeds — expert bot');
  console.log('ship       seed       outcome   frames    score  kills  speed%  deaths  lives  timeouts');
  for (let ship = 0; ship < SHIPS.length; ship++) {
    for (const s of ROBUST_SEEDS) {
      const r = run(ship, BOTS[0][1], s);
      console.log(`${SHIPS[ship].name.padEnd(10)} ${s.toString(16).padEnd(10)} ${r.outcome.padEnd(9)} ${String(r.frames).padStart(6)} ${String(r.score).padStart(8)} ${String(r.kills).padStart(6)} ${String(Math.round(r.speedRate * 100) + '%').padStart(7)} ${String(r.deaths).padStart(7)} ${String(r.lives).padStart(6)} ${String(r.timeouts).padStart(9)}`);
    }
  }
}

// honesty summary (plan "Ship B honesty"): expert + aggressive clear; expert score within ±15% of A;
// elite/midboss/boss speed-kill rate ≥ 60% of A's; popcorn rate ≥ A's
const A = results[0], B = results[1];
const rate = (r, t) => (r.byType[t] && r.byType[t].n ? r.byType[t].speed / r.byType[t].n : 0);
const bigA = ['elite', 'midboss', 'boss'].reduce((s, t) => s + (A.expert.byType[t]?.speed || 0), 0) / ['elite', 'midboss', 'boss'].reduce((s, t) => s + (A.expert.byType[t]?.n || 0), 0);
const bigB = ['elite', 'midboss', 'boss'].reduce((s, t) => s + (B.expert.byType[t]?.speed || 0), 0) / ['elite', 'midboss', 'boss'].reduce((s, t) => s + (B.expert.byType[t]?.n || 0), 0);
console.log('\nhonesty (ship B vs A, expert unless noted)');
console.log(`  expert clears:            ${B.expert.outcome === 'clear' ? 'yes' : 'NO'}   aggressive-human clears: ${B['aggressive-human'].outcome === 'clear' ? 'yes' : 'NO'}`);
console.log(`  expert score B/A:         ${(100 * B.expert.score / A.expert.score).toFixed(1)}%  (band 85–115%)`);
console.log(`  elite+midboss+boss rate:  A ${(bigA * 100).toFixed(0)}%  B ${(bigB * 100).toFixed(0)}%  B/A ${bigA ? (100 * bigB / bigA).toFixed(0) : '—'}%  (need ≥ 60%)`);
console.log(`  popcorn (zako) rate:      A ${(rate(A.expert, 'zako') * 100).toFixed(0)}%  B ${(rate(B.expert, 'zako') * 100).toFixed(0)}%  (need B ≥ A)`);

// Ship A identity vs the certificate
let cert = null;
try { cert = JSON.parse(readFileSync(join(ROOT, 'evidence', 'metrics.json'), 'utf8')); } catch { /* no certificate */ }
if (cert) {
  const diffs = [];
  for (const c of cert.runs) {
    const r = A[c.name]; if (!r) continue;
    for (const k of ['outcome', 'frames', 'score', 'kills']) if (r[k] !== c[k]) diffs.push(`${c.name}.${k} ${r[k]} ≠ cert ${c[k]}`);
    if (r.deaths !== c.deaths.length) diffs.push(`${c.name}.deaths ${r.deaths} ≠ cert ${c.deaths.length}`);
  }
  console.log(`\nship A vs evidence/metrics.json (${cert.runs.length} bots): ${diffs.length ? 'DIFFERENT — ' + diffs.join('; ') : 'IDENTICAL'}`);
} else console.log('\nship A identity: evidence/metrics.json not found');
