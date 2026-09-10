// Campaign infrastructure probe (r78, plan docs/plans/campaign-five-stages.md
// §7 step 1). Builder-side referee plumbing — NOT a referee check: test/sim.mjs
// is untouched; the per-stage control run is a Jacob-authorized referee commit
// (plan §4 rule 14). Two questions, printed with numbers:
//
//   1. STAGE 1 BYTE-IDENTICAL — startRun(g) (every existing caller) and the
//      new startRun(g, 0, 0) must produce the same expert run on the certified
//      seed: outcome / frames / score / kills / determinism string. Also printed
//      against evidence/metrics.json's expert run — NOTE the certificate is
//      r65 and HEAD (r71 boss hp 3×) already diverges from it; the binding
//      comparison for this pass is HEAD-as-control (CLAUDE.md), which is what
//      `node test/sim.mjs` on the r77 tree vs this tree measures.
//   2. TWO-STAGE RUN — r80: on the REAL table (STAGES = [s1, s2]; r78 faked
//      [s1, s1]). The expert plays both: rng continuous (same objects, no
//      reseed), lives / bombs / score carried, chain reset, stage 2's timeline
//      from stageT 0, g.level === 1, the final clear is g.state === 'clear'.
//      The stage-2 balance table is tools/probes/stage2-probe.mjs.
//
//   node tools/probes/campaign-probe.mjs        (exit 1 on any failed assert)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeGame, startRun, nextStage, update } from '../../src/core/game.js';
import { STAGES } from '../../src/core/stages/index.js';
import { makeBot } from '../../test/bot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = 0xC0FFEE, MAX_FRAMES = 30000;

// The referee's four bot option sets, copied VERBATIM from test/sim.mjs
// (`runs = [...]`) so this probe plays the same players the certificate does.
const BOTS = {
  expert: { aggressive: true, lookahead: 14, reactDelay: 0 },
  'aggressive-human': { aggressive: true, lookahead: 10, reactDelay: 7 },
  'passive-human': { aggressive: false, lookahead: 10, reactDelay: 7 },
  blind: { aggressive: false, lookahead: 4, reactDelay: 14 },
};

let fails = 0;
const ok = (cond, what) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) fails++; };
const sig = (g) => `${g.state}:${g.frame}:${g.score}:${g.kills}:${g.speedKills}:${g.stats.deaths.length}:${g.stats.timeouts}:${g.player.lives}:${g.player.bombs}`;

function play(g, bot) { while (g.state === 'play' && g.frame < MAX_FRAMES) { bot(g); update(g); } return g; }

// --- 1. stage 1 byte-identical ------------------------------------------------
console.log('campaign-probe — 1. stage 1 identity (seed C0FFEE, expert)');
const A = play(startRun(makeGame(SEED)), makeBot(BOTS.expert));          // today's call
const B = play(startRun(makeGame(SEED), 0, 0), makeBot(BOTS.expert));    // the r78 signature
console.log(`  startRun(g)       → ${sig(A)}  level ${A.level}`);
console.log(`  startRun(g, 0, 0) → ${sig(B)}  level ${B.level}`);
ok(sig(A) === sig(B) && A.level === 0 && B.level === 0, 'identical outcome/frames/score/kills/deaths/stock, level 0');
ok(A.timeline.length === B.timeline.length && A.timeline.every((e, i) => e.t === B.timeline[i].t), `timeline ${A.timeline.length} events, same stageT anchors`);
ok(STAGES[0].SEC_T.join() === '0,120,720,1700,2400,2460,2900,3700,3900', 'SEC_T anchors unchanged (0,120,720,1700,2400,2460,2900,3700,3900)');
const other = Object.entries(BOTS).filter(([n]) => n !== 'expert').map(([n, o]) => [n, sig(play(startRun(makeGame(SEED)), makeBot(o))), sig(play(startRun(makeGame(SEED), 0, 0), makeBot(o)))]);
for (const [n, a, b] of other) { ok(a === b, `${n.padEnd(16)} ${a}`); }
let cert = null;
try { cert = JSON.parse(readFileSync(join(ROOT, 'evidence', 'metrics.json'), 'utf8')).runs.find((r) => r.name === 'expert'); } catch { /* no evidence */ }
if (cert) {
  const match = cert.outcome === A.state && cert.frames === A.frame && cert.score === A.score && cert.kills === A.kills;
  console.log(`  vs evidence/metrics.json expert: ${cert.outcome} f=${cert.frames} score=${cert.score} kills=${cert.kills} → ${match ? 'MATCH' : 'differs (certificate is r65; HEAD r77 already differs — compare HEAD-as-control: node test/sim.mjs on both trees)'}`);
}

// --- 2. the two-stage run ---------------------------------------------------------
// r78 faked STAGES = [s1, s1]; r80 registered the real stage 2 (stages/s2.js), so
// the seam is exercised on the real table: STAGES[1] = THE BONE RAIL. Note the
// honest r79 expert game-overs on stage 1's boss (the one-bomb refill), so the
// seam is reached with the bot's LIVES FLOORED AT 1 through stage 1 — a
// probe-only edit of the flow under test, printed as such.
console.log(`campaign-probe — 2. the campaign seam (STAGES = [${STAGES.map((s) => s.name).join(', ')}])`);
const N0 = STAGES.length;
ok(N0 >= 2 && STAGES[1].name === 'THE BONE RAIL', `stage 2 registered: ${STAGES[1]?.name}`);
{
  const g = startRun(makeGame(SEED), 0, 0);
  const rng0 = g.rng, fx0 = g.fxRng, bot = makeBot(BOTS.expert);
  let floored = 0;
  while (g.state === 'play' && g.frame < MAX_FRAMES) { bot(g); if (g.player.lives < 1) { g.player.lives = 1; floored++; } update(g); }
  console.log(`  stage 1 end → ${sig(g)}  level ${g.level}  stageT ${g.stageT}${floored ? `  (lives floored at 1 on ${floored} frames — the honest r79 expert dies here)` : ''}`);
  ok(g.state === 'stageclear', "non-final boss down → g.state 'stageclear'");
  ok(g.level === 0, 'g.level still 0 at the clear');
  const carry = { lives: g.player.lives, bombs: g.player.bombs, score: g.score, kills: g.kills, speedKills: g.speedKills, frame: g.frame, deaths: g.stats.deaths.length };
  g.chain = 7; // make the reset observable even if the tally left it 0
  const tl1 = g.timeline;
  nextStage(g);
  console.log(`  nextStage → level ${g.level} state ${g.state} stageT ${g.stageT} tlIndex ${g.tlIndex} lives ${g.player.lives} bombs ${g.player.bombs} score ${g.score} chain ${g.chain} frame ${g.frame}`);
  ok(g.level === 1, 'g.level === 1');
  ok(g.state === 'play', "state back to 'play'");
  ok(g.rng === rng0 && g.fxRng === fx0, 'rng + fxRng are the SAME objects (no reseed; stream continuous)');
  ok(g.player.lives === carry.lives && g.player.bombs === carry.bombs, `lives ${carry.lives} / bombs ${carry.bombs} carried`);
  ok(g.score === carry.score && g.kills === carry.kills && g.speedKills === carry.speedKills, `score ${carry.score} / kills ${carry.kills} / speed kills ${carry.speedKills} carried`);
  ok(g.frame === carry.frame && g.stats.deaths.length === carry.deaths, `run clock ${carry.frame} f + stats carried`);
  ok(g.chain === 0, 'chain reset to 0');
  ok(g.stageT === 0 && g.tlIndex === 0 && g.gate === null && !g.bossDown && !g.bossKilled && g.clearAt === 0, 'stageT 0 / tlIndex 0 / gate null / clear latches reset');
  ok(g.timeline !== tl1 && g.timeline[0].t === STAGES[1].SECTIONS[1].t, `stage 2 timeline built (${g.timeline.length} events, first at stageT ${g.timeline[0].t})`);
  ok(g.enemies.count === 0 && g.eBullets.count === 0 && g.items.count === 0 && g.pBullets.count === 0 && g.particles.count === 0, 'pools empty');
  ok(g.stageBase.score === carry.score && g.stageBase.frame === carry.frame && g.stageBase.kills === carry.kills, 'stageBase = run counters at the stage start (per-stage receipt)');
  ok(g.startLevel === 0 && g.practice === 0, 'startLevel 0 (a real run — board-eligible), practice 0');
  play(g, bot);
  const st2 = { frames: g.frame - carry.frame, score: g.score - carry.score, kills: g.kills - carry.kills };
  console.log(`  stage 2 end → ${sig(g)}  level ${g.level}  stage-2 alone: f=${st2.frames} score=${st2.score} kills=${st2.kills}`);
  ok(g.state === 'clear' || g.state === 'gameover' || g.state === 'stageclear', `stage 2 resolves: '${g.state}' (the expert enters stage 2 with the stock it has left — ${carry.lives} lives — so a game over here is the arcade contract, Pillar 4, not a plumbing fault; r82: with a stage 3 registered, a CLEARING stage 2 reads 'stageclear')`);
  ok(g.level === 1, 'g.level === 1 at the end of stage 2');
  // the final-clear path: the same run with the ship INVULNERABLE from the seam
  // (the camp probes' trick — flow-only), walked through EVERY seam to the last
  // stage. Asserts each non-final clear is 'stageclear' and the LAST stage's is
  // today's 'clear' with today's tally. (r82: generalised from the two-stage
  // form — the assert used to read "stage 2 is last", which stopped being true
  // when THE CANDLE SEA registered. Section 1 above is untouched, so the
  // stage-1 identity diff against a control checkout still compares line for line.)
  {
    const q = startRun(makeGame(SEED), 0, 0), b2 = makeBot(BOTS.expert);
    while (q.state === 'play' && q.frame < MAX_FRAMES) { b2(q); if (q.player.lives < 1) q.player.lives = 1; update(q); }
    while (q.state === 'stageclear' && q.level < N0 - 1) {
      const lv = q.level;
      ok(q.state === 'stageclear', `stage ${lv + 1} (not last) → 'stageclear'`);
      nextStage(q); q.player.invuln = 1e9;
      const f1 = q.frame, s1 = q.score;
      play(q, b2);
      console.log(`  invulnerable through stage ${q.level + 1} → ${sig(q)}  level ${q.level}  that stage alone: f=${q.frame - f1} score=${q.score - s1} timeouts ${q.stats.timeouts}`);
    }
    ok(q.state === 'clear' && q.level === N0 - 1 && q.bossKilled, `final stage's boss down → g.state === 'clear' at level ${q.level} (the last stage's clear is today's clear), bossKilled`);
    ok(q.clearBonus === q.player.lives * 1000 + q.player.bombs * 500, `the last stage's tally paid today's stock bonus (${q.clearBonus})`);
  }
  // determinism of the whole two-stage run
  const h = () => { const q = startRun(makeGame(SEED), 0, 0), b2 = makeBot(BOTS.expert); while (q.state === 'play' && q.frame < MAX_FRAMES) { b2(q); if (q.player.lives < 1) q.player.lives = 1; update(q); } if (q.state === 'stageclear') { nextStage(q); play(q, b2); } return sig(q); };
  const d1 = h(), d2 = h();
  ok(d1 === d2 && d1 === sig(g), `two-stage run deterministic: ${d1}`);
  // stage select: a run started on stage 2 is practice (never the board)
  const p = startRun(makeGame(SEED), 0, 1);
  ok(p.level === 1 && p.startLevel === 1 && p.practice === 0 && p.timeline[0].t === STAGES[1].SECTIONS[1].t, 'startRun(g, 0, 1): level 1, startLevel 1 (practice for the board), stage-2 timeline');
  ok(startRun(makeGame(SEED), 0, 99).level === N0 - 1, `level clamps to STAGES.length - 1 (${N0 - 1})`);
  // stage 2 alone is deterministic and is a DIFFERENT run than the continued stream
  const a1 = sig(play(startRun(makeGame(SEED), 0, 1), makeBot(BOTS.expert))), a2 = sig(play(startRun(makeGame(SEED), 0, 1), makeBot(BOTS.expert)));
  ok(a1 === a2, `stage 2 from startRun(g, 0, 1) deterministic: ${a1}`);
}
ok(STAGES.length === N0, `STAGES untouched (length ${N0})`);
console.log(fails ? `campaign-probe: ${fails} FAILED` : 'campaign-probe: all asserts passed');
process.exit(fails ? 1 : 0);
