// Stage 4 probe (r84) — builder-side instrument, NOT a referee check. The
// stage-4 control run in test/sim.mjs is a Jacob-authorized referee commit
// (plan §4 rule 14); until then this is how THE BLOOD GATE is measured:
//   1. the referee's four bots on stage 4 alone — startRun(g, 0, 3) — on seed
//      C0FFEE and the six robust seeds: outcome, clock (m:ss), time to the boss,
//      boss forms reached, score, kills, speed-kill rate per type, deaths per
//      SECTION WITH POSITION CLUSTERING (S5 MUST "a game-over teaches": deaths
//      must land at learnable moments, not at random), max bullets / enemies,
//      timeouts, dead air, the Gatekeeper's fight length and whether its LOCK
//      was broken, and the Warden ledger — killed in-window / killed late /
//      escaped, plus how long each one spent in its late-kill RUSH;
//   2. the same for the expert with its LIVES PINNED (a probe-only edit so the
//      clock and every boss form get measured even where the bot dies);
//   3. the S4 MUST 1.6× check SCOPED TO THE WARDEN SECTIONS (S2 + S6): mean
//      bullets on screen for the passive bot over the aggressive bot. The rubric
//      bar is ≥ 1.6× and it is what makes the late-kill state a real state
//      rather than a flavour text;
//   4. ONE full campaign run, levels 0 → 1 → 2 → 3 on the continued rng stream.
//      The honest expert does not survive stage 1's boss at r79's stock, so the
//      run is played twice: once honest, once with lives floored at 1 through
//      the earlier stages so the seams and stage 4 itself are reached.
//   node tools/probes/stage4-probe.mjs [seedsHex,comma,separated]
import { makeGame, startRun, nextStage, update } from '../../src/core/game.js';
import { STAGES } from '../../src/core/stages/index.js';
import { makeBot } from '../../test/bot.mjs';
import { H as H_ } from '../../src/core/game.js';

const MAX_FRAMES = 40000;
const LV = 3;
const SEEDS = process.argv[2] ? process.argv[2].split(',').map((s) => parseInt(s, 16)) : [0xC0FFEE, 0xBADA55, 0x5EED42, 0x1234567, 0xFACADE, 0xAB12CD, 0xFEEDF00D];
const BOTS = { // the referee's four, verbatim from test/sim.mjs
  expert: { aggressive: true, lookahead: 14, reactDelay: 0 },
  'aggressive-human': { aggressive: true, lookahead: 10, reactDelay: 7 },
  'passive-human': { aggressive: false, lookahead: 10, reactDelay: 7 },
  blind: { aggressive: false, lookahead: 4, reactDelay: 14 },
};
const TYPE = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss', 'part', 'tank', 'wall', 'hull', 'anchor', 'leader', 'carrier', 'moth', 'warden', 'pod', 'lock'];
const mmss = (f) => `${Math.floor(f / 3600)}:${String(Math.floor((f % 3600) / 60)).padStart(2, '0')}`;
const SEC = STAGES[LV].SECTIONS;
const secOf = (t) => { let s = 0; for (let i = SEC.length - 1; i >= 0; i--) if (t >= SEC[i].t) { s = i; break; } return SEC[s].label.split(' ')[0]; };
const W1 = SEC[2].t, W1E = SEC[3].t, W2 = SEC[6].t, W2E = SEC[7].t; // S2 THE WARDEN … S3, S6 WARDEN 2 … S7

function play(g, bot, { pinLives = false, level = LV } = {}) {
  const r = {
    bossAt: 0, forms: 0, formLen: [], deadAir: 0, dSec: {}, dPos: {}, maxB: 0, maxE: 0,
    keeper: [0, 0], lockBroke: 0, wardens: 0, wIn: 0, wLate: 0, wGone: 0, wRush: [],
    wardenB: [0, 0], // [sum bullets, frames] inside the Warden sections
    allB: [0, 0],    // …and over the whole stage (the rubric's own scope)
  };
  let dead = g.stats.deaths.length, phaseAt = 0, lastPhase = -1, keeperAt = 0;
  const seenW = new Map(); // warden entity → { rushAt }
  while (g.state === 'play' && g.frame < MAX_FRAMES) {
    bot(g); if (pinLives) g.player.lives = 9; update(g);
    let boss = null, keeper = null;
    for (let i = 0; i < g.enemies.count; i++) {
      const e = g.enemies.items[i];
      if (e.type === 5) boss = e;
      else if (e.type === 4) keeper = e;
      else if (e.type === 14) {
        if (!seenW.has(e)) { seenW.set(e, { rush: 0, alive: 1 }); r.wardens++; }
        const w = seenW.get(e); if (e.bloomed) w.rush++;
      }
    }
    if (keeper) { if (!keeperAt) keeperAt = g.frame; if (keeper.bloomed === 2) r.lockBroke = 1; }
    if (keeperAt && !r.keeper[1] && !g.gate) r.keeper = [keeperAt, g.frame];
    if (boss) {
      if (!r.bossAt) r.bossAt = g.frame;
      if (boss.phase !== lastPhase) { if (lastPhase >= 0) r.formLen.push(g.frame - phaseAt); lastPhase = boss.phase; phaseAt = g.frame; r.forms = boss.phase + 1; }
    } else if (lastPhase >= 0 && r.formLen.length < 3) { r.formLen.push(g.frame - phaseAt); lastPhase = -1; }
    if (g.frame > 180 && !g.gate && !g.bossDown && g.enemies.count === 0) r.deadAir++;
    r.maxB = Math.max(r.maxB, g.eBullets.count); r.maxE = Math.max(r.maxE, g.enemies.count);
    r.allB[0] += g.eBullets.count; r.allB[1]++;
    if (level === LV && ((g.stageT >= W1 && g.stageT < W1E) || (g.stageT >= W2 && g.stageT < W2E))) { r.wardenB[0] += g.eBullets.count; r.wardenB[1]++; }
    if (g.stats.deaths.length > dead) {
      dead = g.stats.deaths.length;
      const d = g.stats.deaths[dead - 1];
      const k = level === LV ? secOf(g.stageT) : 'ST' + (g.level + 1);
      r.dSec[k] = (r.dSec[k] || 0) + 1;
      (r.dPos[k] = r.dPos[k] || []).push([d.x, d.y, g.stageT, d.c]);
    }
  }
  // the Warden ledger: what happened to each one that ever existed
  for (const [, w] of seenW) { if (w.rush) r.wRush.push(w.rush); }
  for (const kl of g.stats.killLog) if (kl.t === 14) { if (kl.s) r.wIn++; else r.wLate++; }
  r.wGone = r.wardens - r.wIn - r.wLate;
  return r;
}
function killRates(g, from = 0) {
  const by = {}; for (const k of g.stats.killLog.slice(from)) { by[k.t] = by[k.t] || [0, 0]; by[k.t][0]++; by[k.t][1] += k.s; }
  return Object.keys(by).map((t) => `${TYPE[t] || t} ${by[t][1]}/${by[t][0]}`).join(' ');
}
// death CLUSTERING: for one section's deaths, the modal 40 px cell and how tight
// the cloud is (mean distance to the section's centroid). A learnable moment
// reads as a small spread around one cell; random popcorn collisions do not.
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
const row = (seed, name, g, r) => console.log(
  `${seed.toString(16).padStart(8)} ${name.padEnd(17)} ${g.state.padEnd(10)} clock ${mmss(g.frame)} boss@${r.bossAt ? mmss(r.bossAt) : ' -- '}`
  + `${r.bossAt ? ' (' + ((g.frame - r.bossAt) / g.frame * 100).toFixed(0) + '% boss)' : ''}`
  + ` forms ${r.forms}${r.formLen.length ? ' (' + r.formLen.map((f) => (f / 60).toFixed(0) + 's').join('/') + ')' : ''}`
  + ` score ${String(g.score).padStart(7)} kills ${String(g.kills).padStart(3)} sk ${String(g.speedKills).padStart(3)}`
  + ` deaths ${JSON.stringify(r.dSec)} lives ${g.player.lives} maxBul ${String(r.maxB).padStart(3)} maxEn ${String(r.maxE).padStart(2)}`
  + ` to [${g.stats.timeoutLog}] deadAir ${(r.deadAir / 60).toFixed(1)}s`
  + ` keeper ${r.keeper[1] ? ((r.keeper[1] - r.keeper[0]) / 60).toFixed(1) + 's' : '--'}${r.lockBroke ? ' LOCK BROKEN' : ' lock held'}`
  + ` wardens ${r.wardens} (in-window ${r.wIn} · late ${r.wLate} · escaped ${r.wGone}${r.wRush.length ? ' · rush ' + r.wRush.map((f) => (f / 60).toFixed(1) + 's').join('/') : ''})`
  + `\n${' '.repeat(28)}speed-kills ${killRates(g)}`
  + (Object.keys(r.dPos).length ? `\n${' '.repeat(28)}death clustering ${Object.entries(r.dPos).map(([k, v]) => `${k} ${cluster(v)}`).join(' | ')}` : ''));

console.log("stage4-probe — 1. the referee's four bots on STAGE 4 alone (startRun(g, 0, 3)), 7 seeds");
const wb = {}, ab = {}; // for the 1.6x check — scoped to the Warden sections, and stage-wide (the rubric's own scope)
for (const seed of SEEDS) for (const [name, o] of Object.entries(BOTS)) {
  const g = startRun(makeGame(seed), 0, LV); const r = play(g, makeBot(o)); row(seed, name, g, r);
  if (r.wardenB[1]) { (wb[name] = wb[name] || []).push(r.wardenB[0] / r.wardenB[1]); }
  if (r.allB[1]) { (ab[name] = ab[name] || []).push(r.allB[0] / r.allB[1]); }
}
console.log('\nstage4-probe — 2. expert with LIVES PINNED (probe-only: measures the clock + every form)');
const pin = { clock: [], boss: [], share: [], deaths: [], wIn: 0, wLate: 0, wGone: 0 };
for (const seed of SEEDS) {
  const g = startRun(makeGame(seed), 0, LV); const r = play(g, makeBot(BOTS.expert), { pinLives: true }); row(seed, 'expert-pinned', g, r);
  pin.clock.push(g.frame); if (r.bossAt) { pin.boss.push(r.bossAt); pin.share.push((g.frame - r.bossAt) / g.frame * 100); }
  pin.deaths.push(g.stats.deaths.length); pin.wIn += r.wIn; pin.wLate += r.wLate; pin.wGone += r.wGone;
  if (r.wardenB[1]) (wb['expert-pinned'] = wb['expert-pinned'] || []).push(r.wardenB[0] / r.wardenB[1]);
}
{
  const lo = (a) => Math.min(...a), hi = (a) => Math.max(...a);
  console.log(`  → clock ${mmss(lo(pin.clock))}-${mmss(hi(pin.clock))} (target 2:10, envelope 1:30-2:15) · to boss ${mmss(lo(pin.boss))}-${mmss(hi(pin.boss))} (Psikyo#1 42-80 s) · boss ${lo(pin.share).toFixed(0)}-${hi(pin.share).toFixed(0)} % (band 30-50) · deaths ${lo(pin.deaths)}-${hi(pin.deaths)} · deaths/min ${(pin.deaths.reduce((a, b) => a + b, 0) / (pin.clock.reduce((a, b) => a + b, 0) / 3600)).toFixed(1)}`);
  console.log(`  → Warden ledger over the 7 pinned runs: ${pin.wIn} killed IN-WINDOW · ${pin.wLate} killed late · ${pin.wGone} escaped (each escape is a rush that was ridden out)`);
}

console.log('\nstage4-probe — 3. the S4 MUST 1.6× check, SCOPED TO THE WARDEN SECTIONS (S2 + S6)');
console.log('  mean enemy bullets on screen while a Warden section is running — the late-kill state is only real if leaving it alive is measurably worse:');
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
for (const [n, a] of Object.entries(wb)) console.log(`    ${n.padEnd(17)} ${avg(a).toFixed(1)} bullets (7 seeds)`);
if (wb['passive-human'] && wb['aggressive-human']) {
  const ratio = avg(wb['passive-human']) / avg(wb['aggressive-human']);
  console.log(`    passive / aggressive = ${ratio.toFixed(2)}× (Warden sections only)`);
}
console.log('  …and over the WHOLE STAGE, which is the scope the rubric check actually has:');
for (const [n, a] of Object.entries(ab)) console.log(`    ${n.padEnd(17)} ${avg(a).toFixed(1)} bullets (7 seeds)`);
if (ab['passive-human'] && ab['aggressive-human']) {
  const ratio = avg(ab['passive-human']) / avg(ab['aggressive-human']);
  console.log(`    passive / aggressive = ${ratio.toFixed(2)}× — rubric S4 MUST bar is ≥ 1.60× → ${ratio >= 1.6 ? 'PASS' : 'BELOW BAR'}`);
}

// --- 3b. THE COUNTER, driven by hand -------------------------------------------
// The referee's bots cannot execute either answer to the Warden and cannot be
// made to: `test/bot.mjs` homes to `bigY + closeY` where bigY is the LOWEST
// on-screen enemy of type >= 4 — and stage 4's wall pods are type 15, so a pod
// scrolling past the bottom pins the bot's target y to the bottom band for most
// of both Warden sections; and the bot always tracks a target's x, so it never
// flanks. (Stage 2 recorded the same caveat for tanks; wiki §13/§14.) The
// counter therefore has to be measured with a HAND DRIVER: a scripted ship that
// holds one position relative to the Warden and fires, with invulnerability on
// (probe-only, the flow-only trick campaign-probe already uses) so this measures
// DAMAGE, not dodging. Stage 4's S2 is the Warden solo, so `startRun(g, 900, 3)`
// isolates it with nothing else on the field.
console.log('\nstage4-probe — 3b. THE COUNTER, hand-driven (the referee bots cannot execute it — see the note in this file)');
console.log('  ship holds one spot vs the S2 Warden and fires; invulnerable, so this is a DAMAGE measurement. Window is 380 f.');
{
  const HOLD_B = {};
  const HOLDS = [
    ['COLUMN at range', (w) => [w.x, H_ - 110]],
    ['FLANK +24 at range', (w) => [w.x + 24, H_ - 110]],
    ['SHOULDER +17 at range', (w) => [w.x + 17, H_ - 110]],
    ['CLOSE (dy 96), on-column', (w) => [w.x, w.y + 96]],
    ['POINT-BLANK (dy 40)', (w) => [w.x, w.y + 40]],
  ];
  for (const [label, spot] of HOLDS) {
    const out = [], bul = [];
    for (const seed of SEEDS.slice(0, 3)) {
      const g = startRun(makeGame(seed), 900, LV);
      let vulnAt = -1, killAt = 0, hpAtWindow = -1, rushAt = 0, wardenAt = 0, bSum = 0, bN = 0;
      while (g.state === 'play' && g.frame < 4000) {
        let w = null;
        for (let i = 0; i < g.enemies.count; i++) if (g.enemies.items[i].type === 14) { w = g.enemies.items[i]; break; }
        const p = g.player;
        if (w) {
          const [tx, ty] = spot(w);
          g.input.dx = Math.abs(tx - p.x) < 2 ? 0 : Math.sign(tx - p.x);
          g.input.dy = Math.abs(ty - p.y) < 2 ? 0 : Math.sign(ty - p.y);
        } else g.input.dx = g.input.dy = 0;
        g.input.fire = true; g.input.bomb = false; g.input.focus = false;
        g.player.invuln = 1e9;
        update(g);
        if (w && !wardenAt) wardenAt = g.frame;
        if (wardenAt && g.frame - wardenAt < 700) { bSum += g.eBullets.count; bN++; }
        if (w && !w.dead) {
          if (vulnAt < 0 && w.vulnAt >= 0) vulnAt = w.vulnAt;
          if (vulnAt >= 0 && hpAtWindow < 0 && g.frame - vulnAt >= 380) hpAtWindow = w.hp;
          if (w.bloomed && !rushAt) rushAt = g.frame;
        }
        if (vulnAt >= 0 && !w && !killAt) killAt = g.frame;
        if (killAt && g.frame - wardenAt >= 700) break;
      }
      out.push(killAt && vulnAt >= 0
        ? `${((killAt - vulnAt) / 60).toFixed(1)}s${killAt - vulnAt <= 380 ? ' IN-WINDOW' : ' late'}`
        : `alive (${hpAtWindow >= 0 ? (hpAtWindow | 0) + 'hp left at the window' : 'never vulnerable'})`);
      bul.push(bSum / Math.max(1, bN));
    }
    console.log(`    ${label.padEnd(26)} ${out.join(' · ')}  · mean bullets over the first 700 f of its life: ${(bul.reduce((a, b) => a + b, 0) / bul.length).toFixed(1)}`);
    HOLD_B[label] = bul.reduce((a, b) => a + b, 0) / bul.length;
  }
  // The S4 dynamic-lifecycle question, asked WITHOUT the bots: over one fixed
  // span (700 f from the Warden's arrival), what does riding out the late-kill
  // state cost against killing it in-window? This is the same comparison the
  // rubric's 1.6× check makes, with the two behaviours actually executed.
  const kill = HOLD_B['CLOSE (dy 96), on-column'], ride = HOLD_B['COLUMN at range'];
  if (kill && ride) console.log(`    → late-kill state vs in-window kill: ${ride.toFixed(1)} / ${kill.toFixed(1)} = ${(ride / kill).toFixed(2)}× the bullets (rubric S4's bar for "leaving it alive is measurably more dangerous" is 1.60×)`);
}

console.log('\nstage4-probe — 4. the FULL CAMPAIGN, levels 0 → 1 → 2 → 3 on one continuous rng stream, expert, seed C0FFEE');
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
  console.log(`  honest  RUN TOTAL → ${g.state} ${mmss(g.frame)} score ${g.score}${g.extended ? ' · EXTEND earned' : ''} (the honest r79 expert's stock is the wall here — Pillar 4, not a stage-4 fault)`);
  const q = startRun(makeGame(0xC0FFEE)); const b2 = makeBot(BOTS.expert);
  let qf = 0, qs = 0;
  for (let lv = 0; lv < STAGES.length; lv++) {
    const last = lv === STAGES.length - 1;
    while (q.state === 'play' && q.frame < MAX_FRAMES) { b2(q); if (!last && q.player.lives < 1) q.player.lives = 1; update(q); }
    console.log(`  floored stage ${lv + 1} ${STAGES[lv].name.padEnd(15)} → ${q.state.padEnd(10)} stage f${q.frame - qf} (${mmss(q.frame - qf)}) score +${q.score - qs} lives ${q.player.lives} bombs ${q.player.bombs} clearBonus ${q.clearBonus} timeouts [${q.stats.timeoutLog}]`);
    qf = q.frame; qs = q.score;
    if (q.state !== 'stageclear') break;
    const rng0 = q.rng; nextStage(q);
    console.log(`     seam → level ${q.level} stageT ${q.stageT} score ${q.score} chain ${q.chain} extended ${q.extended} rng same object ${q.rng === rng0}`);
  }
  console.log(`  floored RUN TOTAL → ${q.state} ${mmss(q.frame)} score ${q.score} kills ${q.kills} speed kills ${q.speedKills} deaths ${q.stats.deaths.length}${q.extended ? ' · EXTEND earned' : ''}`);
}
