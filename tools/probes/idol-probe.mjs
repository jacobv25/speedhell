// THE IDOL probe (r83; re-pointed at r85) — builder-side instrument, NOT a
// referee check. Stage 5 IS registered since r85 (`STAGES = [s1…s5]`), so the
// probe no longer pushes anything onto the table: it plays the FINALE ALONE by
// starting stage 5 at its own BOSS SECTION — `startRun(g, SECTIONS[6].t, 4)`, the
// S6 RELEASE anchor — which gives the whole boss ritual (release → WARNING →
// entrance) with none of the stage in front of it. The r83 `?boss=idol` dev flag
// is retired with the same change (wiki §12). The whole stage is stage5-probe;
// this file is the FOUR FORMS under a microscope.
// It never touches test/sim.mjs; the stage-5 control run is a Jacob-authorized
// referee commit (plan §4 rule 14).
//
// What it prints, per bot per seed:
//   outcome · total boss time (WARNING → resolution) · forms reached ·
//   seconds per form · deaths per form · max bullets on screen · timeouts hit ·
//   and the four-form clock against the ≤ 65 s target (plan §3).
// Then the same with the expert's LIVES PINNED, so every form is measured on
// every seed even where the bot dies (bot deaths are a bot ceiling, not a
// verdict — Jacob's standing note).
// Finally the HP-BUDGET table: measured hp-per-second for the expert on each
// form, which is what option B (a finale-own multiplier) has to be sized from.
//
//   node tools/probes/idol-probe.mjs [seedsHex,comma,separated]
import { makeGame, startRun, update } from '../../src/core/game.js';
import { STAGES } from '../../src/core/stages/index.js';
import { IDOL_HP } from '../../src/core/stages/s5.js';
import { BOSS_PHASE_TIMEOUT } from '../../src/core/stage.js';
import { makeBot } from '../../test/bot.mjs';

const MAX_FRAMES = 30000;
const SEEDS = process.argv[2] ? process.argv[2].split(',').map((s) => parseInt(s, 16)) : [0xC0FFEE, 0xBADA55, 0x5EED42, 0x1234567, 0xFACADE, 0xAB12CD, 0xFEEDF00D];
const BOTS = { // the referee's four, verbatim from test/sim.mjs
  expert: { aggressive: true, lookahead: 14, reactDelay: 0 },
  'aggressive-human': { aggressive: true, lookahead: 10, reactDelay: 7 },
  'passive-human': { aggressive: false, lookahead: 10, reactDelay: 7 },
  blind: { aggressive: false, lookahead: 4, reactDelay: 14 },
};
const FORMS = ['THE IDOL', 'THE DEMON', "THE PRIESTESS'S MIRROR", 'THE HOLLOW CORE'];
// r85: form 3 gained its SAMPLE → TRAVEL → PLANT dwell (s5.js MIRROR_DWELL) —
// a counter, not a number (T3). IDOL_HP is unchanged, so the hp-budget table
// below still measures options A / B / C exactly as r83 wrote it.

// HP-BUDGET OVERRIDE (measurement only): `IDOLHP=220,220,220,405 node …` writes
// the four numbers into the exported table IN PLACE, so Jacob's options A / B / C
// (wiki §16) can be measured without editing s5.js. Default = option A as shipped.
if (process.env.IDOLHP) {
  const v = process.env.IDOLHP.split(',').map(Number);
  for (let i = 0; i < 4 && i < v.length; i++) IDOL_HP[i] = v[i];
}

// r85: stage 5 is IN the table — find it by id (never by a hard-coded index) and
// start at its boss section, so the finale is measured with its own ritual and
// nothing else.
const LV = STAGES.findIndex((s) => s.id === 5);
const BOSS_AT = STAGES[LV].SEC_T[6]; // S6 RELEASE → WARNING → S7 THE IDOL
const mmss = (f) => `${Math.floor(f / 3600)}:${String(Math.floor((f % 3600) / 60)).padStart(2, '0')}`;
const s1 = (f) => (f / 60).toFixed(1);

// `melt` (probe-only, pass 2b): forms 1-3 are held at 1 hp so form 4 — the
// medley — is reached and measured on every seed. Nothing in the game does this;
// it is the same class of probe-only edit as pinning lives.
function play(g, bot, { pinLives = false, melt = 0 } = {}) {
  const r = { bossAt: 0, endAt: 0, forms: 0, formLen: [], formLeft: [], dForm: {}, maxB: 0, warnAt: 0 };
  let dead = g.stats.deaths.length, phaseAt = 0, lastPhase = -1, curForm = -1, lastHp = 0;
  while (g.state === 'play' && g.frame < MAX_FRAMES) {
    bot(g); if (pinLives) g.player.lives = 9; update(g);
    if (!r.warnAt && g.warn > 0) r.warnAt = g.frame;
    let boss = null;
    for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; if (e.type === 5) { boss = e; break; } }
    if (boss) {
      if (melt && boss.phase < melt && boss.vulnAt >= 0 && boss.hp > 1) boss.hp = 1;
      if (!r.bossAt) r.bossAt = g.frame;
      if (boss.phase !== lastPhase) {
        if (lastPhase >= 0) { r.formLen.push(g.frame - phaseAt); r.formLeft.push(lastHp); }
        lastPhase = boss.phase; phaseAt = g.frame; curForm = boss.phase; r.forms = boss.phase + 1;
      }
      lastHp = boss.hp; // hp still standing — read on the LAST frame of the form (0 = killed, > 0 = timed out that far short)
    } else if (lastPhase >= 0 && !r.endAt) { // the last form resolved (killed or timed out)
      r.formLen.push(g.frame - phaseAt); r.formLeft.push(lastHp); r.endAt = g.frame; lastPhase = -1;
    }
    r.maxB = Math.max(r.maxB, g.eBullets.count);
    if (g.stats.deaths.length > dead) { dead = g.stats.deaths.length; const k = 'F' + (curForm + 1); r.dForm[k] = (r.dForm[k] || 0) + 1; }
  }
  if (!r.endAt) r.endAt = g.frame;
  return r;
}
const row = (seed, name, g, r) => console.log(
  `${seed.toString(16).padStart(8)} ${name.padEnd(17)} ${g.state.padEnd(10)} boss ${s1(r.endAt - (r.warnAt || r.bossAt)).padStart(5)}s (target ≤ 65)`
  // a form that ran the full BOSS_PHASE_TIMEOUT was NOT killed: print how much hp was still standing
  + ` forms ${r.forms}/4 [${r.formLen.map((f, i) => s1(f) + 's' + (f >= BOSS_PHASE_TIMEOUT ? ` TIMEOUT ${r.formLeft[i] | 0}hp left` : '')).join(' · ') || '--'}]`
  + ` score ${String(g.score).padStart(6)} kills ${String(g.kills).padStart(2)} sk ${String(g.speedKills).padStart(2)}`
  + ` deaths ${JSON.stringify(r.dForm)} lives ${g.player.lives} maxBul ${String(r.maxB).padStart(3)} to [${g.stats.timeoutLog}]`);

console.log(`idol-probe — stage 5 is STAGES[${LV}] (${STAGES[LV].name}); the finale alone, startRun(g, ${BOSS_AT}, ${LV}) = its S6 release → WARNING → the Idol`);
console.log(`  IDOL_HP = [${IDOL_HP}] (option A: forms 1-2 on the elite tier, forms 3-4 on the r71 boss tiers) · form timeout ${BOSS_PHASE_TIMEOUT} f = ${s1(BOSS_PHASE_TIMEOUT)} s each, worst case ${s1(BOSS_PHASE_TIMEOUT * 4)} s for four`);
console.log("\nidol-probe — 1. the referee's four bots on THE IDOL alone, 7 seeds");
const stat = { formLen: [[], [], [], []], boss: [], reached: [] };
for (const seed of SEEDS) for (const [name, o] of Object.entries(BOTS)) {
  const g = startRun(makeGame(seed), BOSS_AT, LV); const r = play(g, makeBot(o)); row(seed, name, g, r);
}
console.log("\nidol-probe — 2. expert with LIVES PINNED (probe-only: every form measured on every seed)");
for (const seed of SEEDS) {
  const g = startRun(makeGame(seed), BOSS_AT, LV); const r = play(g, makeBot(BOTS.expert), { pinLives: true }); row(seed, 'expert-pinned', g, r);
  r.formLen.forEach((f, i) => { if (i < 4) stat.formLen[i].push(f); });
  stat.boss.push(r.endAt - (r.warnAt || r.bossAt)); stat.reached.push(r.forms);
}
console.log("\nidol-probe — 2b. FORM 4 ISOLATED (probe-only: forms 1-3 held at 1 hp, so the MEDLEY is measured on every seed)");
const f4 = [];
for (const seed of SEEDS) {
  const g = startRun(makeGame(seed), BOSS_AT, LV); const r = play(g, makeBot(BOTS.expert), { pinLives: true, melt: 3 });
  row(seed, 'expert-melt-f4', g, r);
  if (r.formLen[3] !== undefined) f4.push(r.formLen[3]);
}
{
  const lo = (a) => Math.min(...a), hi = (a) => Math.max(...a), avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log('\nidol-probe — 3. THE HP BUDGET (expert, lives pinned): what each form costs, and what option B would cost');
  console.log('  form                        hp   seconds (lo-hi)   hp/s      HOMAGE guardrail 15-25 s?');
  let totalS = 0;
  for (let i = 0; i < 4; i++) {
    const a = stat.formLen[i]; if (!a.length) { console.log(`  ${(i + 1 + ' ' + FORMS[i]).padEnd(26)} ${String(IDOL_HP[i]).padStart(4)}   (not reached)`); continue; }
    const secLo = lo(a) / 60, secHi = hi(a) / 60, hps = IDOL_HP[i] / (avg(a) / 60);
    totalS += avg(a) / 60;
    console.log(`  ${(i + 1 + ' ' + FORMS[i]).padEnd(26)} ${String(IDOL_HP[i]).padStart(4)}   ${secLo.toFixed(1)}-${secHi.toFixed(1)}`.padEnd(58)
      + `${hps.toFixed(0).padStart(5)}   ${secHi < 15 ? 'NO — under the 15 s floor' : secLo > 25 ? 'NO — over the 25 s ceiling' : 'yes'}`);
  }
  if (f4.length) {
    const s4 = f4.map((f) => f / 60);
    console.log(`  4 THE HOLLOW CORE (isolated)  ${String(IDOL_HP[3]).padStart(4)}   ${Math.min(...s4).toFixed(1)}-${Math.max(...s4).toFixed(1)}`.padEnd(58)
      + `${(IDOL_HP[3] / (s4.reduce((x, y) => x + y, 0) / s4.length)).toFixed(0).padStart(5)}   ${Math.max(...s4) < 15 ? 'NO — under the 15 s floor' : Math.min(...s4) > 25 ? 'NO — over the 25 s ceiling' : 'yes'}`);
    totalS += s4.reduce((x, y) => x + y, 0) / s4.length;
  }
  const hpsAll = totalS > 0 && stat.formLen.slice(0, 3).every((a) => a.length) ? IDOL_HP.reduce((x, y) => x + y, 0) / totalS : null;
  console.log(`  TOTAL boss ${lo(stat.boss) / 60 | 0}-${Math.ceil(hi(stat.boss) / 60)} s (WARNING → resolution), forms reached ${lo(stat.reached)}-${hi(stat.reached)} of 4; the ≤ 65 s target is plan §3's 50 % of 2:15`);
  if (hpsAll) {
    // Option B = four EQUAL forms under one finale multiplier m of the r71 tiers.
    // At the measured aggregate hp/s, the fight time for a given total hp is
    // total/hps + the ritual overhead the forms do not pay for (entrance +
    // three 60 f handoffs ≈ 4.5 s), so solve for the m that lands on 65 s.
    const over = (90 + 3 * 60) / 60;
    const budget = (65 - over) * hpsAll;
    const base = 390 + 402 + 405 + 405;
    console.log(`  OPTION B sizing (NOT built): at the measured ${hpsAll.toFixed(0)} hp/s and ${over.toFixed(1)} s of ritual overhead, a 65 s finale can carry ~${budget.toFixed(0)} hp.`);
    console.log(`    four equal forms off the r71 tiers (${base} at 1.0×) need m ≈ ${(budget / base).toFixed(2)} → ${[390, 402, 405, 405].map((h) => Math.round(h * budget / base)).join(' / ')} — four NEW hp numbers, which needs Jacob's override of the no-new-tiers rule.`);
    console.log(`    option A as shipped carries ${IDOL_HP.reduce((x, y) => x + y, 0)} hp in the same clock with ZERO new numbers.`);
  }
}
