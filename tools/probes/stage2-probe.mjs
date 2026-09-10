// Stage 2 probe (r80) — builder-side instrument, NOT a referee check. The
// stage-2 control run in test/sim.mjs is a Jacob-authorized referee commit
// (plan §4 rule 14); until then this is how THE BONE RAIL is measured:
//   1. the referee's four bots on stage 2 alone — startRun(g, 0, 1) — on seed
//      C0FFEE and the six robust seeds: outcome, expert clock (m:ss), time to
//      the boss, score, kills, speed-kill rate per enemy type, deaths per
//      section, max bullets on screen, timeouts, dead-air seconds, boss forms
//      reached;
//   2. the same for the expert with its LIVES PINNED (a probe-only edit so the
//      clock and every boss form get measured even where the bot dies — at r79
//      the same bot game-overs on stage 1's boss too);
//   3. the full two-stage campaign with the expert: startRun(g) → stage 1 →
//      the seam (nextStage on 'stageclear') → stage 2, printing the carry-over.
//      At r79 the honest expert dies on stage 1's boss, so a second campaign
//      run tops its lives up at the seam to show the seam itself.
//   node tools/probes/stage2-probe.mjs [seedsHex,comma,separated]
import { makeGame, startRun, nextStage, update } from '../../src/core/game.js';
import { STAGES } from '../../src/core/stages/index.js';
import { makeBot } from '../../test/bot.mjs';

const MAX_FRAMES = 30000;
const SEEDS = process.argv[2] ? process.argv[2].split(',').map((s) => parseInt(s, 16)) : [0xC0FFEE, 0xBADA55, 0x5EED42, 0x1234567, 0xFACADE, 0xAB12CD, 0xFEEDF00D];
const BOTS = { // the referee's four, verbatim from test/sim.mjs
  expert: { aggressive: true, lookahead: 14, reactDelay: 0 },
  'aggressive-human': { aggressive: true, lookahead: 10, reactDelay: 7 },
  'passive-human': { aggressive: false, lookahead: 10, reactDelay: 7 },
  blind: { aggressive: false, lookahead: 4, reactDelay: 14 },
};
const TYPE = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss', 'part', 'tank', 'wall', 'hull', 'anchor'];
const mmss = (f) => `${Math.floor(f / 3600)}:${String(Math.floor((f % 3600) / 60)).padStart(2, '0')}`;
const SEC = STAGES[1].SECTIONS;
const secOf = (t) => { let s = 0; for (let i = SEC.length - 1; i >= 0; i--) if (t >= SEC[i].t) { s = i; break; } return SEC[s].label.split(' ')[0]; };

function play(g, bot, { pinLives = false, level = 1 } = {}) {
  const r = { bossAt: 0, forms: 0, formLen: [], deadAir: 0, dSec: {}, maxB: 0, hearse: [0, 0] };
  let dead = g.stats.deaths.length, phaseAt = 0, lastPhase = -1, hearseAt = 0;
  while (g.state === 'play' && g.frame < MAX_FRAMES) {
    bot(g); if (pinLives) g.player.lives = 9; update(g);
    let boss = null, hearse = null;
    for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; if (e.type === 5) boss = e; else if (e.type === 4) hearse = e; }
    if (boss) {
      if (!r.bossAt) r.bossAt = g.frame;
      if (boss.phase !== lastPhase) { if (lastPhase >= 0) r.formLen.push(g.frame - phaseAt); lastPhase = boss.phase; phaseAt = g.frame; r.forms = boss.phase + 1; }
    } else if (lastPhase >= 0 && r.formLen.length < 3) { r.formLen.push(g.frame - phaseAt); lastPhase = -1; }
    if (hearse && !hearseAt) hearseAt = g.frame;
    if (hearseAt && !r.hearse[1] && !g.gate) r.hearse = [hearseAt, g.frame];
    if (g.frame > 180 && !g.gate && !g.bossDown && g.enemies.count === 0) r.deadAir++;
    r.maxB = Math.max(r.maxB, g.eBullets.count);
    if (g.stats.deaths.length > dead) { dead = g.stats.deaths.length; const k = level === 1 ? secOf(g.stageT) : 'ST1'; r.dSec[k] = (r.dSec[k] || 0) + 1; }
  }
  return r;
}
function killRates(g, from = 0) {
  const by = {}; for (const k of g.stats.killLog.slice(from)) { by[k.t] = by[k.t] || [0, 0]; by[k.t][0]++; by[k.t][1] += k.s; }
  return Object.keys(by).map((t) => `${TYPE[t] || t} ${by[t][1]}/${by[t][0]}`).join(' ');
}
const row = (seed, name, g, r) => console.log(
  `${seed.toString(16).padStart(8)} ${name.padEnd(17)} ${g.state.padEnd(9)} clock ${mmss(g.frame)} boss@${r.bossAt ? mmss(r.bossAt) : ' -- '} forms ${r.forms}${r.formLen.length ? ' (' + r.formLen.map((f) => (f / 60).toFixed(0) + 's').join('/') + ')' : ''} score ${String(g.score).padStart(7)} kills ${String(g.kills).padStart(3)} sk ${String(g.speedKills).padStart(3)} deaths ${JSON.stringify(r.dSec)} lives ${g.player.lives} maxBul ${String(r.maxB).padStart(3)} to [${g.stats.timeoutLog}] deadAir ${(r.deadAir / 60).toFixed(1)}s hearse ${r.hearse[1] ? ((r.hearse[1] - r.hearse[0]) / 60).toFixed(1) + 's' : '--'}\n${' '.repeat(27)}speed-kills ${killRates(g)}`);

console.log('stage2-probe — 1. the referee\'s four bots on STAGE 2 alone (startRun(g, 0, 1)), 7 seeds');
for (const seed of SEEDS) for (const [name, o] of Object.entries(BOTS)) {
  const g = startRun(makeGame(seed), 0, 1); const r = play(g, makeBot(o)); row(seed, name, g, r);
}
console.log('\nstage2-probe — 2. expert with LIVES PINNED (probe-only: measures the clock + every form)');
for (const seed of SEEDS) {
  const g = startRun(makeGame(seed), 0, 1); const r = play(g, makeBot(BOTS.expert), { pinLives: true }); row(seed, 'expert-pinned', g, r);
}
console.log('\nstage2-probe — 3. the two-stage CAMPAIGN (startRun(g) → seam → stage 2), expert, seed C0FFEE');
{
  const g = startRun(makeGame(0xC0FFEE)); const bot = makeBot(BOTS.expert);
  play(g, bot, { level: 0 });
  console.log(`  stage 1 end → ${g.state} f${g.frame} score ${g.score} kills ${g.kills} lives ${g.player.lives} bombs ${g.player.bombs} (honest expert at r79: this is where it stands at the seam)`);
  if (g.state === 'stageclear') { const c = { score: g.score, kills: g.kills, frame: g.frame }; nextStage(g); const r = play(g, bot); console.log(`  seam → level ${g.level} lives ${g.player.lives} bombs ${g.player.bombs} score ${g.score} chain ${g.chain} rng continuous`); row(0xC0FFEE, 'campaign-st2', g, r); console.log(`  stage 2 alone: f${g.frame - c.frame} score ${g.score - c.score} kills ${g.kills - c.kills}`); }
  // a second campaign: lives topped up at the seam only (so the seam + stage 2 on the CONTINUED stream are shown)
  const q = startRun(makeGame(0xC0FFEE)); const b2 = makeBot(BOTS.expert);
  let sec = { score: 0 };
  while (q.state === 'play' && q.frame < MAX_FRAMES) { b2(q); q.player.lives = Math.max(q.player.lives, 1); update(q); }
  console.log(`  [lives floored at 1 through stage 1] stage 1 end → ${q.state} f${q.frame} score ${q.score} kills ${q.kills} lives ${q.player.lives} bombs ${q.player.bombs} clearBonus ${q.clearBonus}`);
  if (q.state === 'stageclear') {
    sec = { score: q.score, kills: q.kills, frame: q.frame, deaths: q.stats.deaths.length };
    const rng0 = q.rng; nextStage(q);
    console.log(`  seam → level ${q.level} state ${q.state} stageT ${q.stageT} lives ${q.player.lives} bombs ${q.player.bombs} score ${q.score} chain ${q.chain} extended ${q.extended} rng same object ${q.rng === rng0}`);
    const r = play(q, b2); row(0xC0FFEE, 'campaign-st2', q, r);
    console.log(`  stage 2 alone: f${q.frame - sec.frame} (${mmss(q.frame - sec.frame)}) score ${q.score - sec.score} kills ${q.kills - sec.kills} deaths ${q.stats.deaths.length - sec.deaths} · run total ${mmss(q.frame)} ${q.score}${q.extended ? ' · EXTEND earned' : ''}`);
  }
}
