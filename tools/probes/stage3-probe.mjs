// Stage 3 probe (r82) — builder-side instrument, NOT a referee check. The
// stage-3 control run in test/sim.mjs is a Jacob-authorized referee commit
// (plan §4 rule 14); until then this is how THE CANDLE SEA is measured:
//   1. the referee's four bots on stage 3 alone — startRun(g, 0, 2) — on seed
//      C0FFEE and the six robust seeds: outcome, clock (m:ss), time to the boss,
//      boss forms reached, score, kills, speed-kill rate per type, deaths per
//      section, max bullets on screen (whole run AND the swarm rush alone —
//      the stage's S8 stress scene), max enemies, timeouts, dead air, the
//      Twin Moths' fight length and the formation ledger (files, leaders
//      speed-killed / killed / escaped, files scattered vs turned);
//   2. the same for the expert with its LIVES PINNED (a probe-only edit so the
//      clock and every boss form get measured even where the bot dies);
//   3. ONE full campaign run, levels 0 → 1 → 2 on the continued rng stream,
//      printing each stage's outcome and the total clock. The honest expert
//      does not survive stage 1's boss at r79's stock, so the run is played
//      twice: once honest, once with lives floored at 1 through the earlier
//      stages so the seams and stage 3 itself are reached.
//   node tools/probes/stage3-probe.mjs [seedsHex,comma,separated]
import { makeGame, startRun, nextStage, update } from '../../src/core/game.js';
import { STAGES } from '../../src/core/stages/index.js';
import { makeBot } from '../../test/bot.mjs';

const MAX_FRAMES = 40000;
const SEEDS = process.argv[2] ? process.argv[2].split(',').map((s) => parseInt(s, 16)) : [0xC0FFEE, 0xBADA55, 0x5EED42, 0x1234567, 0xFACADE, 0xAB12CD, 0xFEEDF00D];
const BOTS = { // the referee's four, verbatim from test/sim.mjs
  expert: { aggressive: true, lookahead: 14, reactDelay: 0 },
  'aggressive-human': { aggressive: true, lookahead: 10, reactDelay: 7 },
  'passive-human': { aggressive: false, lookahead: 10, reactDelay: 7 },
  blind: { aggressive: false, lookahead: 4, reactDelay: 14 },
};
const TYPE = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss', 'part', 'tank', 'wall', 'hull', 'anchor', 'leader', 'carrier', 'moth'];
const mmss = (f) => `${Math.floor(f / 3600)}:${String(Math.floor((f % 3600) / 60)).padStart(2, '0')}`;
const SEC = STAGES[2].SECTIONS;
const secOf = (t) => { let s = 0; for (let i = SEC.length - 1; i >= 0; i--) if (t >= SEC[i].t) { s = i; break; } return SEC[s].label.split(' ')[0]; };
const RUSH = SEC[5].t, RELEASE = SEC[6].t; // S5 SWARM RUSH … S6 RELEASE

function play(g, bot, { pinLives = false, level = 2 } = {}) {
  const r = { bossAt: 0, forms: 0, formLen: [], deadAir: 0, dSec: {}, maxB: 0, maxE: 0, rushB: 0, rushE: 0, moths: [0, 0], files: 0, scattered: 0, turned: 0 };
  let dead = g.stats.deaths.length, phaseAt = 0, lastPhase = -1, mothAt = 0;
  const seenFile = {}, seenState = {};
  while (g.state === 'play' && g.frame < MAX_FRAMES) {
    bot(g); if (pinLives) g.player.lives = 9; update(g);
    let boss = null, moth = null;
    for (let i = 0; i < g.enemies.count; i++) {
      const e = g.enemies.items[i];
      if (e.type === 5) boss = e;
      else if (e.type === 13) moth = e;
      else if (level === 2 && e.type === 0 && e.holdT >= 3) { // the formation ledger
        if (!seenFile[e.sweepOff]) { seenFile[e.sweepOff] = 1; r.files++; }
        if (e.bloomed && !seenState[e.sweepOff]) { seenState[e.sweepOff] = e.bloomed; if (e.bloomed === 1) r.scattered++; else r.turned++; }
      }
    }
    if (boss) {
      if (!r.bossAt) r.bossAt = g.frame;
      if (boss.phase !== lastPhase) { if (lastPhase >= 0) r.formLen.push(g.frame - phaseAt); lastPhase = boss.phase; phaseAt = g.frame; r.forms = boss.phase + 1; }
    } else if (lastPhase >= 0 && r.formLen.length < 3) { r.formLen.push(g.frame - phaseAt); lastPhase = -1; }
    if (moth && !mothAt) mothAt = g.frame;
    if (mothAt && !r.moths[1] && !g.gate) r.moths = [mothAt, g.frame];
    if (g.frame > 180 && !g.gate && !g.bossDown && g.enemies.count === 0) r.deadAir++;
    r.maxB = Math.max(r.maxB, g.eBullets.count); r.maxE = Math.max(r.maxE, g.enemies.count);
    if (level === 2 && g.stageT >= RUSH && g.stageT < RELEASE) { r.rushB = Math.max(r.rushB, g.eBullets.count); r.rushE = Math.max(r.rushE, g.enemies.count); }
    if (g.stats.deaths.length > dead) { dead = g.stats.deaths.length; const k = level === 2 ? secOf(g.stageT) : 'ST' + (g.level + 1); r.dSec[k] = (r.dSec[k] || 0) + 1; }
  }
  return r;
}
function killRates(g, from = 0) {
  const by = {}; for (const k of g.stats.killLog.slice(from)) { by[k.t] = by[k.t] || [0, 0]; by[k.t][0]++; by[k.t][1] += k.s; }
  return Object.keys(by).map((t) => `${TYPE[t] || t} ${by[t][1]}/${by[t][0]}`).join(' ');
}
const row = (seed, name, g, r) => console.log(
  `${seed.toString(16).padStart(8)} ${name.padEnd(17)} ${g.state.padEnd(10)} clock ${mmss(g.frame)} boss@${r.bossAt ? mmss(r.bossAt) : ' -- '} forms ${r.forms}${r.formLen.length ? ' (' + r.formLen.map((f) => (f / 60).toFixed(0) + 's').join('/') + ')' : ''} score ${String(g.score).padStart(7)} kills ${String(g.kills).padStart(3)} sk ${String(g.speedKills).padStart(3)} deaths ${JSON.stringify(r.dSec)} lives ${g.player.lives} maxBul ${String(r.maxB).padStart(3)} maxEn ${String(r.maxE).padStart(2)} RUSH ${String(r.rushB).padStart(3)}b/${String(r.rushE).padStart(2)}e to [${g.stats.timeoutLog}] deadAir ${(r.deadAir / 60).toFixed(1)}s moths ${r.moths[1] ? ((r.moths[1] - r.moths[0]) / 60).toFixed(1) + 's' : '--'} files ${r.files} (scattered ${r.scattered} · turned ${r.turned})\n${' '.repeat(28)}speed-kills ${killRates(g)}`);

console.log("stage3-probe — 1. the referee's four bots on STAGE 3 alone (startRun(g, 0, 2)), 7 seeds");
for (const seed of SEEDS) for (const [name, o] of Object.entries(BOTS)) {
  const g = startRun(makeGame(seed), 0, 2); const r = play(g, makeBot(o)); row(seed, name, g, r);
}
console.log('\nstage3-probe — 2. expert with LIVES PINNED (probe-only: measures the clock + every form)');
for (const seed of SEEDS) {
  const g = startRun(makeGame(seed), 0, 2); const r = play(g, makeBot(BOTS.expert), { pinLives: true }); row(seed, 'expert-pinned', g, r);
}
console.log('\nstage3-probe — 3. the FULL CAMPAIGN, levels 0 → 1 → 2 on one continuous rng stream, expert, seed C0FFEE');
{
  const g = startRun(makeGame(0xC0FFEE)); const bot = makeBot(BOTS.expert);
  let f = 0, s = 0;
  for (let lv = 0; lv < STAGES.length; lv++) {
    const r = play(g, bot, { level: lv });
    console.log(`  honest  stage ${lv + 1} ${STAGES[lv].name.padEnd(15)} → ${g.state.padEnd(10)} stage f${g.frame - f} (${mmss(g.frame - f)}) score +${g.score - s} lives ${g.player.lives} bombs ${g.player.bombs} deaths ${JSON.stringify(r.dSec)}`);
    f = g.frame; s = g.score;
    if (g.state !== 'stageclear') break;
    nextStage(g);
  }
  console.log(`  honest  RUN TOTAL → ${g.state} ${mmss(g.frame)} score ${g.score}${g.extended ? ' · EXTEND earned' : ''} (the honest r79 expert's stock is the wall here — Pillar 4, not a stage-3 fault)`);
  // the same run with lives floored at 1 through the earlier stages, so the seams
  // and stage 3 itself are measured on the CONTINUED stream (probe-only).
  const q = startRun(makeGame(0xC0FFEE)); const b2 = makeBot(BOTS.expert);
  let qf = 0, qs = 0;
  for (let lv = 0; lv < STAGES.length; lv++) {
    const last = lv === STAGES.length - 1;
    while (q.state === 'play' && q.frame < MAX_FRAMES) { b2(q); if (!last && q.player.lives < 1) q.player.lives = 1; update(q); }
    const r = { dSec: {} };
    console.log(`  floored stage ${lv + 1} ${STAGES[lv].name.padEnd(15)} → ${q.state.padEnd(10)} stage f${q.frame - qf} (${mmss(q.frame - qf)}) score +${q.score - qs} lives ${q.player.lives} bombs ${q.player.bombs} clearBonus ${q.clearBonus} timeouts [${q.stats.timeoutLog}]`);
    qf = q.frame; qs = q.score; void r;
    if (q.state !== 'stageclear') break;
    const rng0 = q.rng; nextStage(q);
    console.log(`     seam → level ${q.level} stageT ${q.stageT} score ${q.score} chain ${q.chain} extended ${q.extended} rng same object ${q.rng === rng0}`);
  }
  console.log(`  floored RUN TOTAL → ${q.state} ${mmss(q.frame)} score ${q.score} kills ${q.kills} speed kills ${q.speedKills} deaths ${q.stats.deaths.length}${q.extended ? ' · EXTEND earned' : ''}`);
}
