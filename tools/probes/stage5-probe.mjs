// Stage 5 probe (r85) — builder-side instrument, NOT a referee check. The
// stage-5 control run in test/sim.mjs is a Jacob-authorized referee commit
// (plan §4 rule 14); until then this is how THE GREAT ALTAR is measured:
//   1. the referee's four bots on stage 5 alone — startRun(g, 0, 4) — on seed
//      C0FFEE and the six robust seeds: outcome, clock (m:ss), the APPROACH's
//      length against plan §3's ≤ 25 s, the GAUNTLET's per-guard seconds against
//      ≤ 8 s each, time to the boss against Psikyo's 42-80 s, the boss's share,
//      forms reached and seconds per form, score, speed-kill rate per type,
//      deaths per SECTION with position clustering (S5 MUST "a game-over
//      teaches"), max bullets / enemies, timeouts, dead air;
//   2. the same for the expert with its LIVES PINNED (a probe-only edit so the
//      clock and every boss form get measured even where the bot dies);
//   3. ONE full FIVE-STAGE campaign run on one continuous rng stream, played
//      three ways as stage4-probe does — honest, lives floored at 1 through the
//      earlier stages, and invulnerable from the first seam — and then the
//      CAMPAIGN RECEIPT's own data (g.stageLog: per-stage clock and score, the
//      totals, the stock, the extend) printed exactly as the card reads it.
//   node tools/probes/stage5-probe.mjs [seedsHex,comma,separated]
import { makeGame, startRun, nextStage, update } from '../../src/core/game.js';
import { STAGES } from '../../src/core/stages/index.js';
import { makeBot } from '../../test/bot.mjs';

const MAX_FRAMES = 40000;
const LV = STAGES.findIndex((s) => s.id === 5);
const SEEDS = process.argv[2] ? process.argv[2].split(',').map((s) => parseInt(s, 16)) : [0xC0FFEE, 0xBADA55, 0x5EED42, 0x1234567, 0xFACADE, 0xAB12CD, 0xFEEDF00D];
const BOTS = { // the referee's four, verbatim from test/sim.mjs
  expert: { aggressive: true, lookahead: 14, reactDelay: 0 },
  'aggressive-human': { aggressive: true, lookahead: 10, reactDelay: 7 },
  'passive-human': { aggressive: false, lookahead: 10, reactDelay: 7 },
  blind: { aggressive: false, lookahead: 4, reactDelay: 14 },
};
const TYPE = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss', 'part', 'tank', 'wall', 'hull', 'anchor', 'leader', 'carrier', 'moth', 'warden', 'pod', 'lock'];
const FORMS = ['THE IDOL', 'THE DEMON', "THE MIRROR", 'THE HOLLOW CORE'];
const GUARDS = ['HEARSE', 'MOTH', 'GATEKEEPER'];
const mmss = (f) => `${Math.floor(f / 3600)}:${String(Math.floor((f % 3600) / 60)).padStart(2, '0')}`;
const s1 = (f) => (f / 60).toFixed(1);
const SEC = STAGES[LV].SECTIONS;
const secOf = (t) => { let s = 0; for (let i = SEC.length - 1; i >= 0; i--) if (t >= SEC[i].t) { s = i; break; } return SEC[s].label.split(' ')[0]; };

// which returning guard a body is: type 13 = the Moth, type 4 = role 1 Hearse / role 3 Gatekeeper
const guardOf = (e) => (e.type === 13 ? 1 : e.role === 3 ? 2 : 0);

function play(g, bot, { pinLives = false, level = LV } = {}) {
  const r = {
    bossAt: 0, warnAt: 0, forms: 0, formLen: [], formLeft: [], deadAir: 0, dSec: {}, dPos: {}, maxB: 0, maxE: 0,
    approach: 0, gauntletAt: 0, gauntletEnd: 0, guard: [null, null, null], lockBroke: 0, moths: 0,
  };
  let dead = g.stats.deaths.length, phaseAt = 0, lastPhase = -1, lastHp = 0;
  const seen = [0, 0, 0];
  while (g.state === 'play' && g.frame < MAX_FRAMES) {
    bot(g); if (pinLives) g.player.lives = 9; update(g);
    if (!r.warnAt && g.warn > 0) r.warnAt = g.frame;
    let boss = null;
    for (let i = 0; i < g.enemies.count; i++) {
      const e = g.enemies.items[i];
      if (e.type === 5) boss = e;
      else if (level === LV && (e.type === 4 || e.type === 13)) {
        const k = guardOf(e);
        if (!seen[k]) { seen[k] = 1; r.guard[k] = [g.frame, 0]; if (!r.gauntletAt) { r.gauntletAt = g.frame; r.approach = g.frame; } }
        if (r.guard[k]) r.guard[k][1] = g.frame + 1; // last frame it was alive
        if (e.type === 4 && e.role === 3 && e.bloomed === 2) r.lockBroke = 1;
      }
    }
    if (r.guard[2] && r.guard[2][1] === g.frame && !g.gate) r.gauntletEnd = g.frame;
    if (boss) {
      if (!r.bossAt) r.bossAt = g.frame;
      if (boss.phase !== lastPhase) { if (lastPhase >= 0) { r.formLen.push(g.frame - phaseAt); r.formLeft.push(lastHp); } lastPhase = boss.phase; phaseAt = g.frame; r.forms = boss.phase + 1; }
      lastHp = boss.hp;
    } else if (lastPhase >= 0 && r.formLen.length < 4) { r.formLen.push(g.frame - phaseAt); r.formLeft.push(lastHp); lastPhase = -1; }
    if (g.frame > 180 && !g.gate && !g.bossDown && g.enemies.count === 0) r.deadAir++;
    r.maxB = Math.max(r.maxB, g.eBullets.count); r.maxE = Math.max(r.maxE, g.enemies.count);
    if (g.stats.deaths.length > dead) {
      dead = g.stats.deaths.length;
      const d = g.stats.deaths[dead - 1];
      const k = level === LV ? secOf(g.stageT) : 'ST' + (g.level + 1);
      r.dSec[k] = (r.dSec[k] || 0) + 1;
      (r.dPos[k] = r.dPos[k] || []).push([d.x, d.y, g.stageT, d.c]);
    }
  }
  if (!r.gauntletEnd) r.gauntletEnd = r.bossAt || g.frame;
  return r;
}
function killRates(g, from = 0) {
  const by = {}; for (const k of g.stats.killLog.slice(from)) { by[k.t] = by[k.t] || [0, 0]; by[k.t][0]++; by[k.t][1] += k.s; }
  return Object.keys(by).map((t) => `${TYPE[t] || t} ${by[t][1]}/${by[t][0]}`).join(' ');
}
// death CLUSTERING (as stage4-probe): the modal 40 px cell and the cloud's spread.
function cluster(list) {
  const cells = {};
  let sx = 0, sy = 0;
  for (const [x, y] of list) { sx += x; sy += y; const c = `${(x / 40) | 0},${(y / 40) | 0}`; cells[c] = (cells[c] || 0) + 1; }
  const cx = sx / list.length, cy = sy / list.length;
  let sd = 0; for (const [x, y] of list) sd += Math.hypot(x - cx, y - cy);
  const best = Object.entries(cells).sort((a, b) => b[1] - a[1])[0];
  const [bx, by] = best[0].split(',').map(Number);
  return `${list.length}d @(${cx | 0},${cy | 0}) ±${(sd / list.length) | 0}px · modal cell x${bx * 40}-${bx * 40 + 40} y${by * 40}-${by * 40 + 40} ${best[1]}/${list.length}`;
}
const guardTxt = (r) => GUARDS.map((n, i) => `${n} ${r.guard[i] ? s1(r.guard[i][1] - r.guard[i][0]) + 's' : '--'}`).join(' · ');
const row = (seed, name, g, r) => console.log(
  `${seed.toString(16).padStart(8)} ${name.padEnd(17)} ${g.state.padEnd(10)} clock ${mmss(g.frame)} approach ${r.approach ? s1(r.approach) + 's' : ' -- '} (≤25)`
  + ` gauntlet ${r.gauntletAt ? s1(r.gauntletEnd - r.gauntletAt) + 's' : '--'} [${guardTxt(r)}]${r.lockBroke ? ' LOCK BROKEN' : ''}`
  + ` boss@${r.bossAt ? mmss(r.warnAt || r.bossAt) : ' -- '}${r.bossAt ? ' (' + ((g.frame - r.bossAt) / g.frame * 100).toFixed(0) + '% boss)' : ''}`
  + ` forms ${r.forms}/4 [${r.formLen.map((f, i) => s1(f) + 's' + (f >= 2100 ? ` TIMEOUT ${r.formLeft[i] | 0}hp` : '')).join(' · ') || '--'}]`
  + ` score ${String(g.score).padStart(7)} kills ${String(g.kills).padStart(3)} sk ${String(g.speedKills).padStart(3)}`
  + ` deaths ${JSON.stringify(r.dSec)} lives ${g.player.lives} maxBul ${String(r.maxB).padStart(3)} maxEn ${String(r.maxE).padStart(2)}`
  + ` to [${g.stats.timeoutLog}] deadAir ${(r.deadAir / 60).toFixed(1)}s`
  + `\n${' '.repeat(28)}speed-kills ${killRates(g)}`
  + (Object.keys(r.dPos).length ? `\n${' '.repeat(28)}death clustering ${Object.entries(r.dPos).map(([k, v]) => `${k} ${cluster(v)}`).join(' | ')}` : ''));

console.log(`stage5-probe — 1. the referee's four bots on STAGE 5 alone (startRun(g, 0, ${LV})), 7 seeds`);
console.log(`  sections: ${SEC.map((s) => s.label + '@' + s.t).join(' · ')}`);
for (const seed of SEEDS) for (const [name, o] of Object.entries(BOTS)) {
  const g = startRun(makeGame(seed), 0, LV); const r = play(g, makeBot(o)); row(seed, name, g, r);
}

console.log('\nstage5-probe — 2. expert with LIVES PINNED (probe-only: measures the clock + every form)');
const pin = { clock: [], boss: [], share: [], deaths: [], approach: [], gaunt: [], guard: [[], [], []], forms: [[], [], [], []], reached: [] };
for (const seed of SEEDS) {
  const g = startRun(makeGame(seed), 0, LV); const r = play(g, makeBot(BOTS.expert), { pinLives: true }); row(seed, 'expert-pinned', g, r);
  pin.clock.push(g.frame); if (r.bossAt) { pin.boss.push(r.warnAt || r.bossAt); pin.share.push((g.frame - r.bossAt) / g.frame * 100); }
  pin.deaths.push(g.stats.deaths.length); if (r.approach) pin.approach.push(r.approach);
  if (r.gauntletAt) pin.gaunt.push(r.gauntletEnd - r.gauntletAt);
  r.guard.forEach((v, i) => { if (v) pin.guard[i].push(v[1] - v[0]); });
  r.formLen.forEach((f, i) => { if (i < 4) pin.forms[i].push(f); });
  pin.reached.push(r.forms);
}
{
  const lo = (a) => Math.min(...a), hi = (a) => Math.max(...a), avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(`  → clock ${mmss(lo(pin.clock))}-${mmss(hi(pin.clock))} (cap 2:15) · approach ${s1(lo(pin.approach))}-${s1(hi(pin.approach))} s (≤ 25) · gauntlet ${s1(lo(pin.gaunt))}-${s1(hi(pin.gaunt))} s (~24)`);
  console.log(`  → to the boss ${s1(lo(pin.boss))}-${s1(hi(pin.boss))} s (Psikyo#1 42-80) · boss ${lo(pin.share).toFixed(0)}-${hi(pin.share).toFixed(0)} % (band 30-50) · deaths ${lo(pin.deaths)}-${hi(pin.deaths)} · deaths/min ${(pin.deaths.reduce((a, b) => a + b, 0) / (pin.clock.reduce((a, b) => a + b, 0) / 3600)).toFixed(1)}`);
  GUARDS.forEach((n, i) => { if (pin.guard[i].length) console.log(`  → guard ${i + 1} ${n.padEnd(11)} ${s1(lo(pin.guard[i]))}-${s1(hi(pin.guard[i]))} s (target ≤ 8 each)`); });
  console.log('  → forms reached ' + lo(pin.reached) + '-' + hi(pin.reached) + ' of 4');
  FORMS.forEach((n, i) => { if (pin.forms[i].length) console.log(`     form ${i + 1} ${n.padEnd(16)} hp ${String([220, 220, 402, 405][i]).padStart(3)} · ${s1(lo(pin.forms[i]))}-${s1(hi(pin.forms[i]))} s · ${(([220, 220, 402, 405][i]) / (avg(pin.forms[i]) / 60)).toFixed(0)} hp/s`); });
}

console.log('\nstage5-probe — 3. the FULL FIVE-STAGE CAMPAIGN on one continuous rng stream, expert, seed C0FFEE');
const receipt = (g, tag) => {
  console.log(`  ${tag} CAMPAIGN RECEIPT (g.stageLog, exactly what the card reads):`);
  let tf = 0, ts = 0;
  for (const r of g.stageLog) {
    tf += r.frames; ts += r.score;
    console.log(`    STAGE ${r.level + 1} ${STAGES[r.level].name.padEnd(15)} ${mmss(r.frames).padStart(5)} · ${String(r.score).padStart(7)} · speed ${r.speedKills}/${r.kills} · deaths ${r.deaths} · bombs ${r.bombsUsed} · stock bonus ${r.bonus}`);
  }
  console.log(`    TOTAL ${g.stageLog.length}/5 stages · ${mmss(tf)} · ${ts} (run score ${g.score}) · stock ${g.player.lives}L / ${g.player.bombs}B · extend ${g.extended ? 'EARNED' : 'not earned'}`);
};
{
  const g = startRun(makeGame(0xC0FFEE)); const bot = makeBot(BOTS.expert);
  let f = 0, s = 0;
  for (let lv = 0; lv < STAGES.length; lv++) {
    const r = play(g, bot, { level: lv });
    console.log(`  honest  stage ${lv + 1} ${STAGES[lv].name.padEnd(15)} → ${g.state.padEnd(10)} stage ${mmss(g.frame - f)} score +${g.score - s} lives ${g.player.lives} bombs ${g.player.bombs} deaths ${JSON.stringify(r.dSec)}`);
    f = g.frame; s = g.score;
    if (g.state !== 'stageclear') break;
    nextStage(g);
  }
  console.log(`  honest  RUN TOTAL → ${g.state} ${mmss(g.frame)} score ${g.score}${g.extended ? ' · EXTEND earned' : ''} (the honest r79 expert's stock is the wall — Pillar 4, not a stage-5 fault)`);

  const q = startRun(makeGame(0xC0FFEE)); const b2 = makeBot(BOTS.expert);
  let qf = 0, qs = 0;
  for (let lv = 0; lv < STAGES.length; lv++) {
    const last = lv === STAGES.length - 1;
    while (q.state === 'play' && q.frame < MAX_FRAMES) { b2(q); if (!last && q.player.lives < 1) q.player.lives = 1; update(q); }
    console.log(`  floored stage ${lv + 1} ${STAGES[lv].name.padEnd(15)} → ${q.state.padEnd(10)} stage ${mmss(q.frame - qf)} score +${q.score - qs} lives ${q.player.lives} bombs ${q.player.bombs} clearBonus ${q.clearBonus} timeouts [${q.stats.timeoutLog}]`);
    qf = q.frame; qs = q.score;
    if (q.state !== 'stageclear') break;
    nextStage(q);
  }
  console.log(`  floored RUN TOTAL → ${q.state} ${mmss(q.frame)} score ${q.score} kills ${q.kills} speed kills ${q.speedKills} deaths ${q.stats.deaths.length}${q.extended ? ' · EXTEND earned' : ''}`);
  receipt(q, 'floored');

  // the flow-only walk: invulnerable from the first seam (campaign-probe's trick)
  const v = startRun(makeGame(0xC0FFEE)); const b3 = makeBot(BOTS.expert);
  let vf = 0, vs = 0;
  for (let lv = 0; lv < STAGES.length; lv++) {
    while (v.state === 'play' && v.frame < 60000) { b3(v); v.player.invuln = 1e9; update(v); }
    console.log(`  invuln  stage ${lv + 1} ${STAGES[lv].name.padEnd(15)} → ${v.state.padEnd(10)} stage ${mmss(v.frame - vf)} score +${v.score - vs} timeouts [${v.stats.timeoutLog}]`);
    vf = v.frame; vs = v.score;
    if (v.state !== 'stageclear') break;
    nextStage(v);
  }
  console.log(`  invuln  RUN TOTAL → ${v.state} ${mmss(v.frame)} score ${v.score} (flow only — the five-stage clear the campaign can produce)`);
  receipt(v, 'invulnerable');
}
