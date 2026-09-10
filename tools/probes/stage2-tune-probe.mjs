// Stage 2 TUNE probe (r81) — builder-side instrument, NOT a referee check.
// Measures the two r81 Lab knobs (wiki §13.9, Q27 / Q28) against Jacob's first
// play of stage 2 (2026-09-09): "im not even noticing the tank sealing … i expect
// having many more tanks, approaching from the sides with lower HP may cause
// sealing to happen more often" and "i am always dying at the boss's phase 2.
// the boss keeps running around extremely fast and is hard to catch".
//   For each knob combo — s2tanks current/swarm × bellWalker current/calm — the
//   referee's expert bot plays stage 2 alone (startRun(g, 0, 1)) on seed C0FFEE +
//   the six robust seeds, MORTAL and with its LIVES PINNED (probe-only edit):
//   · the tank column (S1 + S5): tanks spawned, killed, killed WHILE SEALED (the
//     ship inside 48 px of the tank at the kill — the r18 seal radius), deaths in
//     S1/S5, max bullets in the column, dead air over the run;
//   · the Bell's P2 (the walker): reached, P3 reached, boss killed, P2 seconds,
//     the boss's transit share of P2 (sweepOff 1 = stepping between rails), how
//     much of P2 (and of its transit) the camp governor's latch owns (latchX set),
//     deaths in P2, hp dealt while it dwells vs while it walks.
//   node tools/probes/stage2-tune-probe.mjs [seedsHex,comma,separated]   (env COMBOS=swarm/current,… MODES=mortal|pinned narrow it)
import { makeGame, startRun, update, H } from '../../src/core/game.js';
import { STAGES } from '../../src/core/stages/index.js';
import { makeBot } from '../../test/bot.mjs';

const MAX_FRAMES = 30000;
const SEEDS = process.argv[2] ? process.argv[2].split(',').map((s) => parseInt(s, 16)) : [0xC0FFEE, 0xBADA55, 0x5EED42, 0x1234567, 0xFACADE, 0xAB12CD, 0xFEEDF00D];
// The referee's expert bot option set, copied VERBATIM from test/sim.mjs
// (`runBot('expert', { aggressive: true, lookahead: 14, reactDelay: 0 })`).
const EXPERT = { aggressive: true, lookahead: 14, reactDelay: 0 };
const COMBOS = [['current', 'current'], ['swarm', 'current'], ['current', 'calm'], ['swarm', 'calm']].filter((c) => !process.env.COMBOS || process.env.COMBOS.split(',').includes(c.join('/'))); // COMBOS=swarm/current,... narrows the table
const MODES = [false, true].filter((pin) => !process.env.MODES || process.env.MODES.split(',').includes(pin ? 'pinned' : 'mortal'));
const SEAL_R2 = 48 * 48; // stage.js SEAL_R2 — the r18 proximity seal
const SEC = STAGES[1].SECTIONS;
const secOf = (t) => { let s = 0; for (let i = SEC.length - 1; i >= 0; i--) if (t >= SEC[i].t) { s = i; break; } return SEC[s].label.split(' ')[0]; };
const inColumn = (t) => (t >= 120 && t < 760) || (t >= 2460 && t < 2880); // S1 TANK COLUMN + S5 RAIL RUSH (s2.js SECTIONS)

function play(seed, s2tanks, bellWalker, pin) {
  const g = startRun(makeGame(seed), 0, 1);
  g.tune.s2tanks = s2tanks === 'swarm' ? 1 : 0;        // exactly what main.js beginRun does: AFTER startRun
  g.tune.bellWalker = bellWalker === 'calm' ? 1 : 0;
  const bot = makeBot(EXPERT);
  const r = { spawned: 0, killed: 0, sealedKills: 0, colDeaths: 0, colMaxB: 0, maxB: 0, deadAir: 0,
    p2: 0, p3: 0, bossKilled: 0, p2Frames: 0, transitFrames: 0, latchedFrames: 0, latchedTransit: 0, p2Deaths: 0, hpDwell: 0, hpTransit: 0, deaths: 0, dSec: {}, deathLog: [], outcome: '', frames: 0, kS1: 0, kS5: 0 };
  const seen = new Map(); // tank object → last age (a new object, or an age reset, is a spawn)
  let deaths = g.stats.deaths.length, klIdx = 0;
  while (g.state === 'play' && g.frame < MAX_FRAMES) {
    const pre = []; let boss = null;
    for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; if (e.type === 7 && !e.dead) pre.push([e, e.x, e.y, e.age]); else if (e.type === 5) boss = e; }
    const preHp = boss ? boss.hp : 0, prePhase = boss ? boss.phase : -1, preTransit = !!(boss && boss.phase === 1 && boss.sweepOff === 1);
    bot(g); if (pin) g.player.lives = 9; update(g);
    const col = inColumn(g.stageT);
    boss = null; const live = new Set();
    for (let i = 0; i < g.enemies.count; i++) {
      const e = g.enemies.items[i]; live.add(e);
      if (e.type === 5) boss = e;
      if (e.type !== 7) continue;
      const a = seen.get(e); if (a === undefined || e.age <= a) { if (col) r.spawned++; } seen.set(e, e.age);
    }
    // kills: the kill log is the truth for the count; the pre-update snapshot attributes the seal
    for (; klIdx < g.stats.killLog.length; klIdx++) if (g.stats.killLog[klIdx].t === 7 && col) { r.killed++; if (g.stageT < 760) r.kS1++; else r.kS5++; }
    for (const [e, x, y, age] of pre) {
      const gone = !(live.has(e) && e.type === 7 && !e.dead && e.age === age + 1); // the same tank, still in the live pool, one frame older — anything else left this frame (killAt swaps the object out past `count` with its fields intact)
      if (!gone || y > H + 40 || !col) continue; // scrolled off (outro) is not a kill
      const dx = x - g.player.x, dy = y - g.player.y;
      if (dx * dx + dy * dy < SEAL_R2) r.sealedKills++;
    }
    if (col) r.colMaxB = Math.max(r.colMaxB, g.eBullets.count);
    r.maxB = Math.max(r.maxB, g.eBullets.count);
    if (g.frame > 180 && !g.gate && !g.bossDown && g.enemies.count === 0) r.deadAir++;
    if (boss) {
      if (boss.phase >= 1) r.p2 = 1; if (boss.phase >= 2) r.p3 = 1;
      if (boss.phase === 1) {
        r.p2Frames++; if (boss.sweepOff === 1) r.transitFrames++;
        if (boss.latchX > -1e8) { r.latchedFrames++; if (boss.sweepOff === 1) r.latchedTransit++; } // the camp governor's latch (stage.js campGovernor: latchX set = a banned band exists)
        if (prePhase === 1) { const d = Math.max(0, preHp - boss.hp); if (preTransit) r.hpTransit += d; else r.hpDwell += d; }
      }
    }
    if (g.stats.deaths.length > deaths) {
      deaths = g.stats.deaths.length; r.deaths++; const k = secOf(g.stageT); r.dSec[k] = (r.dSec[k] || 0) + 1;
      let tk = 0, ang = 0; for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; if (e.type === 7 && !e.dead) { tk++; if (e.vulnAt >= 0 && g.frame - e.vulnAt > 240) ang++; } }
      r.deathLog.push(`${k}@${g.stageT}(tanks ${tk}/${ang} angry, ship y ${g.player.y | 0}, bul ${g.eBullets.count})`);
      if (col) r.colDeaths++;
      if (boss && boss.phase === 1) r.p2Deaths++;
    }
  }
  r.outcome = g.state; r.frames = g.frame; r.bossKilled = g.state === 'clear' ? 1 : 0;
  return r;
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const f1 = (v) => v.toFixed(1).padStart(5);
const pct = (a, b) => (b ? (100 * a / b).toFixed(0) : '--').padStart(3) + '%';
console.log('stage2-tune-probe (r81) — expert bot, 7 seeds, stage 2 alone; knob combos s2tanks × bellWalker; MORTAL and LIVES-PINNED');
console.log('sealed kill = the ship inside 48 px of the tank at the kill (the r18 seal radius) — the lesson the column teaches\n');
const hdr = 'combo              mode    | tanks: spawn  kill  sealed (share)  deaths S1/S5 (run)  maxBul(col)  deadAir | Bell P2: reach  P3  killed  P2 s   transit%  (latched: P2% / of transit)  deaths   hp dwell/transit | run: outcome (min)';
console.log(hdr);
const detail = [];
for (const [tk, bw] of COMBOS) for (const pin of MODES) {
  const rs = SEEDS.map((s) => play(s, tk, bw, pin));
  for (let i = 0; i < rs.length; i++) detail.push(`${tk}/${bw} ${pin ? 'pinned' : 'mortal'} ${SEEDS[i].toString(16).padStart(8)}: tanks ${rs[i].spawned}/${rs[i].killed}/${rs[i].sealedKills} (S1 ${rs[i].kS1} S5 ${rs[i].kS5}) colDeaths ${rs[i].colDeaths} P2 ${rs[i].p2} P3 ${rs[i].p3} clear ${rs[i].bossKilled} p2 ${(rs[i].p2Frames / 60).toFixed(1)}s transit ${pct(rs[i].transitFrames, rs[i].p2Frames)} latched ${pct(rs[i].latchedFrames, rs[i].p2Frames)} p2deaths ${rs[i].p2Deaths} hp ${rs[i].hpDwell | 0}/${rs[i].hpTransit | 0} deaths ${rs[i].deaths} [${rs[i].deathLog.join(' · ')}] ${rs[i].outcome} f${rs[i].frames}`);
  const n = rs.length, sum = (k) => rs.reduce((a, x) => a + x[k], 0);
  const outcomes = {}; for (const x of rs) outcomes[x.outcome] = (outcomes[x.outcome] || 0) + 1;
  console.log(`${(tk + '/' + bw).padEnd(18)} ${(pin ? 'pinned' : 'mortal').padEnd(7)} | ${f1(mean(rs.map((x) => x.spawned)))} ${f1(mean(rs.map((x) => x.killed)))} ${f1(mean(rs.map((x) => x.sealedKills)))} (${pct(sum('sealedKills'), sum('killed'))})  ${f1(mean(rs.map((x) => x.colDeaths)))} (${f1(mean(rs.map((x) => x.deaths)))})   ${String(Math.max(...rs.map((x) => x.colMaxB))).padStart(4)}       ${f1(mean(rs.map((x) => x.deadAir / 60)))}s | ${String(sum('p2') + '/' + n).padStart(9)} ${String(sum('p3') + '/' + n).padStart(4)} ${String(sum('bossKilled') + '/' + n).padStart(5)}  ${f1(mean(rs.filter((x) => x.p2).map((x) => x.p2Frames / 60)) || 0)}   ${pct(sum('transitFrames'), sum('p2Frames'))}      ${pct(sum('latchedFrames'), sum('p2Frames'))} / ${pct(sum('latchedTransit'), sum('transitFrames'))}          ${f1(mean(rs.map((x) => x.p2Deaths)))}   ${String(Math.round(mean(rs.map((x) => x.hpDwell)))).padStart(4)}/${String(Math.round(mean(rs.map((x) => x.hpTransit)))).padEnd(4)} | ${Object.entries(outcomes).map(([k, v]) => `${k} ${v}`).join(', ')} (${f1(mean(rs.map((x) => x.frames / 3600)))})`);
}
console.log('\nper seed:'); for (const d of detail) console.log('  ' + d);
