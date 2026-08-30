// Headless sim harness — produces evidence/metrics.json for gauntlet critics.
// Runs the real game logic (no DOM) with scripted bots. Usage: node test/sim.mjs
import { makeGame, startRun, update, stressScene, spawnEnemy, W, H, PLAYER } from '../src/core/game.js';
import { ENEMY_DEFS } from '../src/core/stage.js';
import { makeBot } from './bot.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 0xC0FFEE;
const MAX_FRAMES = 30000;

// --- bots ------------------------------------------------------------------
// makeBot lives in test/bot.mjs (shared with the browser screenshot harness).

function runBot(name, botOpts, seed = SEED) {
  const g = makeGame(seed); startRun(g);
  const bot = makeBot(botOpts);
  const t0 = performance.now();
  // dead air: empty screen outside gates. Track total AND longest streak — a
  // single 2s wait is felt even when the total looks small (playtest finding).
  let deadAir = 0, streak = 0, maxStreak = 0, edgeFrames = 0;
  while (g.state === 'play' && g.frame < MAX_FRAMES) {
    bot(g); update(g);
    if (g.frame > 180 && !g.gate && !g.bossDown && g.enemies.count === 0) {
      deadAir++; streak++; if (streak > maxStreak) maxStreak = streak;
    } else streak = 0;
    // WS05 edge-trap detector (playtest screenshot: popcorn clipped off-edge)
    for (let k = 0; k < g.enemies.count; k++) {
      const e = g.enemies.items[k];
      if (e.y > 0 && e.y < H && (e.x < 14 || e.x > W - 14)) edgeFrames++;
    }
  }
  const wall = performance.now() - t0;
  const s = g.stats;
  const speedRate = g.kills ? g.speedKills / g.kills : 0;
  const avgBullets = s.bulletCurve.length ? s.bulletCurve.reduce((a, b) => a + b, 0) / s.bulletCurve.length : 0;
  return {
    name, outcome: g.state, frames: g.frame, minutes: +(g.frame / 3600).toFixed(2),
    score: g.score, kills: g.kills, speedKills: g.speedKills, speedRate: +speedRate.toFixed(2),
    livesLeft: Math.max(0, g.player.lives), deaths: s.deaths, timeouts: s.timeouts, timeoutLog: s.timeoutLog,
    maxBullets: s.maxEBullets, avgBullets: +avgBullets.toFixed(1),
    deadAirFrames: deadAir, deadAirSec: +(deadAir / 60).toFixed(1),
    deadAirMaxStreak: maxStreak, deadAirMaxStreakSec: +(maxStreak / 60).toFixed(1),
    edgeFrames,
    bulletCurve: s.bulletCurve, scoreCurve: s.scoreCurve,
    killWindows: summarizeKills(s.killLog), simWallMs: +wall.toFixed(0),
  };
}

// --- S1 point-blank economy ---------------------------------------------------
// Pin the player at a fixed range from an invulnerable-to-timeout elite and
// measure damage per second. Rubric S1: DPS close >= 1.8x DPS at range.
// Probe distances are SCREEN-RELATIVE so the check survives field rescales.
const PROBE_CLOSE = Math.round(W * 0.083); // ≈40px on the original 480 field
const PROBE_FAR = Math.round(W * 0.625);   // ≈300px on the original 480 field
function pointBlankDps(dist) {
  const g = makeGame(3); startRun(g);
  g.timeline = []; g.tlIndex = 0; // no stage — controlled scene
  const e = spawnEnemy(g, 3, W / 2, 200);
  e.hp = 1e9;
  g.player.invuln = 1e9; g.input.fire = true;
  const pin = () => {
    g.player.x = W / 2; g.player.y = Math.min(H - 20, 200 + dist);
    g.input.dx = 0; g.input.dy = 0;
    e.x = W / 2; e.y = 200; // pin target too — elite sway must not skew the probe
  };
  for (let f = 0; f < 60; f++) { pin(); update(g); }      // warmup (intro armor)
  const hp0 = e.hp;
  for (let f = 0; f < 600; f++) { pin(); update(g); }     // 10s measured
  return (hp0 - e.hp) / 10;
}

function summarizeKills(log) {
  const byType = {};
  for (const k of log) {
    const t = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss', 'part'][k.t] || 'type' + k.t;
    byType[t] = byType[t] || { n: 0, speed: 0 };
    byType[t].n++; byType[t].speed += k.s;
  }
  return byType;
}

// --- S6 anti-camp probes (r6.3) ----------------------------------------------
// The boss may never be KILLED by stationary or two-spot-shuttle play. Probes
// are invulnerable (the upper bound of death-tank strategies — mortal versions
// die, verified r6.2) and fire constantly from the bottom band. r6.2 critic:
// a pinned center camper and a blind 60<->260 shuffler both collected full pay.
function campProbe(name, mover) {
  const g = makeGame(SEED); startRun(g);
  g.timeline = []; g.tlIndex = 0;
  g.gate = 'boss';
  spawnEnemy(g, 5, W / 2, -27);
  g.player.invuln = 1e9;
  let frames = 0, bossHpAt90 = null;
  while (!g.bossDown && g.state === 'play' && frames < 5400) {
    g.input.dy = 0;
    mover(g, frames); g.input.fire = true; g.input.bomb = false;
    update(g); frames++;
    for (let i = 0; i < g.enemies.count; i++) {
      const e = g.enemies.items[i];
      if (e.type === 5 && e.age === 90) bossHpAt90 = e.hp;
    }
  }
  const bossKills = g.stats.killLog.filter((k) => k.t === 5).length;
  return { name, frames, bossKills, timeouts: g.stats.timeouts, score: g.score, bossHpAt90 };
}
const seekX = (tx) => (g) => {
  const dx = tx - g.player.x;
  g.input.dx = Math.abs(dx) > 3 ? Math.sign(dx) : 0;
};
const seekXY = (tx, ty) => (g) => {
  seekX(tx)(g);
  const dy = ty - g.player.y;
  g.input.dy = Math.abs(dy) > 3 ? Math.sign(dy) : 0;
};
function runCampProbes() {
  let dir = 1;
  return [
    campProbe('pin-center', seekX(W / 2)),
    campProbe('pin-rail-left', seekX(60)),
    campProbe('pin-rail-right', seekX(W - 60)),
    campProbe('shuffle-60-260-150f', (g, f) => seekX((Math.floor(f / 150) % 2) ? W - 60 : 60)(g)),
    campProbe('shuffle-110-210-300f', (g, f) => seekX((Math.floor(f / 300) % 2) ? 210 : 110)(g)),
    // r6.3 critic B breaks, kept as law:
    campProbe('shuffle-3spot-150f', (g, f) => seekX([60, W / 2, W - 60][Math.floor(f / 150) % 3])(g)),
    campProbe('drift-1.2', (g, f) => { // ~1.2px/f sawtooth — the ungoverned continuous-motion band
      if (g.player.x > W - 20) dir = -1; else if (g.player.x < 20) dir = 1;
      g.input.dx = (f % 3 === 0) ? dir : 0;
    }),
    campProbe('hover-under-spawn', seekXY(W / 2, 133)), // 56-frame P1 SPEED kill via the entrance-armor clobber
  ];
}

// Mortal probe runner — same arena, mortality on. Used for the stutter
// residual gate (r6 ship decision: the invulnerable stutter is a documented
// lab residual; the LAW is that its mortal twin must die with zero kills).
function mortalProbe(mover) {
  const g = makeGame(SEED); startRun(g);
  g.timeline = []; g.tlIndex = 0; g.gate = 'boss';
  spawnEnemy(g, 5, W / 2, -27);
  let frames = 0;
  while (!g.bossDown && g.state === 'play' && frames < 5400) {
    g.input.dy = 0; g.input.fire = true; g.input.bomb = false;
    mover(g, frames);
    update(g); frames++;
  }
  return {
    outcome: g.state === 'gameover' ? 'died' : (g.bossDown ? 'cleared' : 'capped'),
    bossKills: g.stats.killLog.filter((k) => k.t === 5).length,
    deaths: g.stats.deaths.length, score: g.score,
  };
}
const stutterMover = () => {
  let sdir = 1;
  return (g, f) => {
    if (g.player.x > W - 20) sdir = -1; else if (g.player.x < 20) sdir = 1;
    g.input.dx = (Math.floor(f / 15) % 2 === 0) ? sdir : 0;
  };
};

// Death-tank WATCH (advisory, not a gate): a MORTAL zero-dodge tracker that
// follows boss.x and spends lives (death-cancel + 150f invuln) is pursuit-
// shaped, genre-normal, and bounded by stock — but its take should be tracked
// so a future retune can't silently make death-tanking the best route.
// (r6.5 critic: cleared the arena with 2 deaths for 94,400.)
function mortalTrackerProbe() {
  const g = makeGame(SEED); startRun(g);
  g.timeline = []; g.tlIndex = 0; g.gate = 'boss';
  spawnEnemy(g, 5, W / 2, -27);
  let frames = 0;
  while (!g.bossDown && g.state === 'play' && frames < 5400) {
    let boss = null;
    for (let i = 0; i < g.enemies.count; i++) if (g.enemies.items[i].type === 5) boss = g.enemies.items[i];
    g.input.dy = 0; g.input.fire = true; g.input.bomb = false;
    if (boss) seekX(boss.x)(g); else g.input.dx = 0;
    update(g); frames++;
  }
  return {
    outcome: g.state === 'gameover' ? 'died' : (g.bossDown ? 'cleared' : 'capped'),
    bossKills: g.stats.killLog.filter((k) => k.t === 5).length,
    deaths: g.stats.deaths.length, score: g.score,
  };
}

// --- S6 top-band probe (r18, Jacob-authorized referee edit) --------------------
// Playtest 2026-08-29 (Jacob's friend): a player parked at y≈16 was never shot
// for the whole stage — boss included — because fire was gated on the enemy
// being 40px ABOVE the player. The parker is MORTAL, holds fire, never dodges
// bullets, but does what the human did: sidesteps enemy BODIES (contact is not
// the bug — silence is). LAW: over the full stage timeline it must die to a
// BULLET at least once at each park (center column, a rail, the y=40 camp).
function topParkProbe(name, tx, ty = 16) {
  const g = makeGame(SEED); startRun(g);
  let spawned = 0, prev = 0, near = 0;
  while (g.state === 'play' && g.frame < MAX_FRAMES) {
    const p = g.player;
    let ax = tx;
    for (let k = 0; k < g.enemies.count; k++) { // sidestep any body about to ram the park
      const e = g.enemies.items[k];
      if (Math.abs(e.y - ty) < 44 && Math.abs(e.x - p.x) < e.r + 26) { ax = p.x + (e.x >= p.x ? -40 : 40); break; }
    }
    seekXY(Math.max(16, Math.min(W - 16, ax)), ty)(g); g.input.fire = true; g.input.bomb = false;
    update(g);
    const b = g.eBullets.count; if (b > prev) spawned += b - prev; prev = b;
    for (let k = 0; k < g.eBullets.count; k++) { const q = g.eBullets.items[k]; if (Math.hypot(q.x - p.x, q.y - p.y) < 40) { near++; break; } }
  }
  const d = g.stats.deaths;
  return {
    name, outcome: g.state, frames: g.frame, deaths: d.length,
    bulletDeaths: d.filter((x) => x.c === 'bullet').length, contactDeaths: d.filter((x) => x.c === 'contact').length,
    firstBulletDeathSec: (() => { const f = d.find((x) => x.c === 'bullet'); return f ? +(f.f / 60).toFixed(1) : null; })(),
    bulletsSpawned: spawned, threatFrames: near, score: g.score, timeouts: g.stats.timeouts,
  };
}

// Boss-arena twin of the top-park (the friend's decisive observation: "the boss
// doesn't target you either"). Same arena as the camp probes, MORTAL, parked at
// the top center: the boss holds y≈92 (r 30), so a y=16 parker is 76px above it
// — no contact, no return fire under the old rule, three scoreless timeouts.
// LAW: the parker must take fire (threat frames > 0) and die to a bullet.
function topParkBossProbe(name, tx, ty = 16) {
  const g = makeGame(SEED); startRun(g);
  g.timeline = []; g.tlIndex = 0; g.gate = 'boss';
  spawnEnemy(g, 5, W / 2, -27);
  let frames = 0, near = 0, spawned = 0, prev = 0;
  while (!g.bossDown && g.state === 'play' && frames < 5400) {
    seekXY(tx, ty)(g); g.input.fire = true; g.input.bomb = false;
    update(g); frames++;
    const p = g.player, b = g.eBullets.count; if (b > prev) spawned += b - prev; prev = b;
    for (let k = 0; k < g.eBullets.count; k++) { const q = g.eBullets.items[k]; if (Math.hypot(q.x - p.x, q.y - p.y) < 40) { near++; break; } }
  }
  const d = g.stats.deaths;
  return {
    name, outcome: g.state === 'gameover' ? 'died' : (g.bossDown ? 'cleared' : 'capped'), frames,
    deaths: d.length, bulletDeaths: d.filter((x) => x.c === 'bullet').length, contactDeaths: d.filter((x) => x.c === 'contact').length,
    bulletsSpawned: spawned, threatFrames: near, timeouts: g.stats.timeouts, score: g.score,
  };
}

// --- S8 performance gate -----------------------------------------------------
function stressTest() {
  const g = makeGame(7); g.state = 'play'; g.timeline = []; startRun(g);
  g.timeline = []; g.tlIndex = 0;
  stressScene(g);
  const times = [];
  global.gc?.();
  const heap0 = process.memoryUsage().heapUsed;
  for (let f = 0; f < 600; f++) {
    const t0 = performance.now();
    update(g);
    times.push(performance.now() - t0);
    if (g.eBullets.count < 900) { // keep load topped up
      for (let i = 0; i < 50; i++) {
        const b = g.eBullets.spawn(); if (!b) break;
        b.x = (i * 37) % W; b.y = 10; b.vx = 0.5; b.vy = 2.5; b.kind = i & 1; b.r = 3; b.accel = 0; b.curve = 0; b.age = 0;
      }
    }
  }
  const heap1 = process.memoryUsage().heapUsed;
  times.sort((a, b) => a - b);
  return {
    p50: +times[300].toFixed(3), p99: +times[594].toFixed(3), max: +times[599].toFixed(3),
    heapDeltaKB: Math.round((heap1 - heap0) / 1024),
    budget: 16.6, pass: times[594] < 16.6,
  };
}

// --- determinism (S8) ---------------------------------------------------------
function determinism() {
  const h = (seed) => {
    const g = makeGame(seed); startRun(g);
    const bot = makeBot({ aggressive: true });
    while (g.state === 'play' && g.frame < 8000) { bot(g); update(g); }
    return `${g.frame}:${g.score}:${g.kills}:${g.eBullets.count}:${g.player.lives}`;
  };
  const a = h(42), b = h(42);
  return { runA: a, runB: b, pass: a === b };
}

// --- run everything -----------------------------------------------------------
console.log('SPEEDHELL sim — seed', SEED);
const stress = stressTest();
console.log('S8 stress:', JSON.stringify(stress));
const det = determinism();
console.log('S8 determinism:', det.pass ? 'PASS' : 'FAIL', det.runA);

const runs = [
  runBot('expert', { aggressive: true, lookahead: 14, reactDelay: 0 }),
  runBot('aggressive-human', { aggressive: true, lookahead: 10, reactDelay: 7 }),
  runBot('passive-human', { aggressive: false, lookahead: 10, reactDelay: 7 }),
  runBot('blind', { aggressive: false, lookahead: 4, reactDelay: 14 }),
];
for (const r of runs) {
  console.log(`${r.name.padEnd(16)} ${r.outcome.padEnd(9)} ${String(r.minutes).padStart(5)}m score=${String(r.score).padStart(8)} kills=${r.kills} speed=${(r.speedRate * 100) | 0}% deaths=${r.deaths.length} maxBul=${r.maxBullets} timeouts=${r.timeouts}`);
}

// s7_robust: the same expert bot on alternate seeds — the balance corridor must
// hold across RNG streams, not on the certified seed alone (r6 lesson).
const ROBUST_SEEDS = [0xBADA55, 0x5EED42, 0x1234567, 0xFACADE, 0xAB12CD, 0xFEEDF00D]; // last two: r6.2 critic's P3-timeout seeds, kept as regressions
const ROBUST_RUNS = ROBUST_SEEDS.map((s) => {
  const r = runBot('expert', { aggressive: true, lookahead: 14, reactDelay: 0 }, s);
  r.seedHex = s.toString(16);
  return r;
});
console.log('s7_robust seeds:', ROBUST_RUNS.map((r) => `${r.seedHex}:${r.outcome}/${r.timeouts}to/${r.livesLeft}L`).join(' '));
const CAMP_PROBES = runCampProbes();
console.log('s6_nocamp:', CAMP_PROBES.map((p) => `${p.name}:${p.bossKills}k/${p.timeouts}to`).join(' '));
const TOP_PARK = [topParkProbe('top-center-y16', W / 2), topParkProbe('top-rail-left-y16', 60), topParkProbe('top-center-y40', W / 2, 40), topParkBossProbe('boss-top-center-y16', W / 2)];
console.log('s6_topband:', TOP_PARK.map((p) => `${p.name}:${p.outcome}/${p.bulletDeaths}bd+${p.contactDeaths}cd/${p.threatFrames}tf/${p.bulletsSpawned}b`).join(' '));
const TRACKER_WATCH = mortalTrackerProbe();
console.log('s6 deathtank watch:', JSON.stringify(TRACKER_WATCH));
const STUTTER_INVULN = campProbe('stutter-15-15-invuln', stutterMover());
const STUTTER_MORTAL = mortalProbe(stutterMover());
console.log('s6 stutter residual: invuln', JSON.stringify(STUTTER_INVULN), 'mortal', JSON.stringify(STUTTER_MORTAL));

const dpsClose = pointBlankDps(PROBE_CLOSE), dpsFar = pointBlankDps(PROBE_FAR);
const aggro = runs[1], passive = runs[2];
// TTK from the bottom band — the "does closing in FEEL different" numbers
const eliteRangeTTK = ENEMY_DEFS[3].hp / dpsFar, midRangeTTK = ENEMY_DEFS[1].hp / dpsFar;
const checks = {
  s1_pointblank: {
    desc: 'point-blank DPS >= 1.8x DPS at range (playtest: bottom-camping killed fine)',
    probePx: { close: PROBE_CLOSE, far: PROBE_FAR },
    dpsClose: +dpsClose.toFixed(1), dpsFar: +dpsFar.toFixed(1),
    ratio: dpsFar ? +(dpsClose / dpsFar).toFixed(2) : Infinity,
    pass: dpsClose >= dpsFar * 1.8,
  },
  s1_scale: {
    desc: 'screen-relative scale per boghog Cave frame-analysis (playtest 3: "field seems too large"): ship 0.65-0.85 field-widths/s, ship sprite >= 5.5% of field width',
    widthsPerSec: +(PLAYER.speed * 60 / W).toFixed(2),
    shipPctOfWidth: +(18 / W * 100).toFixed(1), // renderer draws the hull 18px wide
    fieldW: W, fieldH: H,
    pass: PLAYER.speed * 60 / W >= 0.65 && PLAYER.speed * 60 / W <= 0.85 && 18 / W >= 0.055,
  },
  s1_ttk_felt: {
    desc: 'the point-blank gap must be FELT: elite range-TTK >= 2.2s (<=6s), mid >= 0.7s; zako still melts (playtest r2: "game feels easier, not better")',
    eliteRangeTTK: +eliteRangeTTK.toFixed(2), eliteCloseTTK: +(ENEMY_DEFS[3].hp / dpsClose).toFixed(2),
    midRangeTTK: +midRangeTTK.toFixed(2), zakoVolleys: Math.ceil(ENEMY_DEFS[0].hp / (PLAYER.shotDmg * 2)),
    pass: eliteRangeTTK >= 2.2 && eliteRangeTTK <= 6 && midRangeTTK >= 0.7
      && Math.ceil(ENEMY_DEFS[0].hp / (PLAYER.shotDmg * 2)) <= 2,
  },
  s7_pressure: {
    desc: 'aggression still eats bullets: aggressive-human avgBullets >= 24 (r2 dropped 21->18 and the game went soft)',
    aggressiveAvg: aggro.avgBullets, expertAvg: runs[0].avgBullets,
    pass: aggro.avgBullets >= 24,
  },
  s5_edges: {
    desc: 'no edge traps: enemy-frames spent clipped at screen edge <= 60 per run (playtest screenshot)',
    expert: runs[0].edgeFrames, aggressive: aggro.edgeFrames, passive: passive.edgeFrames,
    pass: runs[0].edgeFrames <= 60 && aggro.edgeFrames <= 60 && passive.edgeFrames <= 60,
  },
  s5_deadair: {
    desc: 'speed-kills buy density, not waiting: longest empty-screen streak <= 1.5s and total <= 6s (expert+aggressive)',
    expertMaxStreakSec: runs[0].deadAirMaxStreakSec, aggressiveMaxStreakSec: runs[1].deadAirMaxStreakSec,
    expertTotalSec: runs[0].deadAirSec, aggressiveTotalSec: runs[1].deadAirSec,
    pass: runs[0].deadAirMaxStreak <= 90 && runs[1].deadAirMaxStreak <= 90
      && runs[0].deadAirFrames <= 360 && runs[1].deadAirFrames <= 360,
  },
  s6_alignment: {
    desc: 'aggressive outscores passive ≥3x AND sees fewer bullets',
    scoreRatio: passive.score ? +(aggro.score / passive.score).toFixed(2) : Infinity,
    bulletRatio: aggro.avgBullets ? +(passive.avgBullets / aggro.avgBullets).toFixed(2) : 0,
    pass: aggro.score >= passive.score * 3 && passive.avgBullets > aggro.avgBullets,
  },
  s4_dynamic: {
    desc: 'passive play faces ≥1.6x bullets on screen',
    ratio: aggro.avgBullets ? +(passive.avgBullets / aggro.avgBullets).toFixed(2) : 0,
    pass: passive.avgBullets >= aggro.avgBullets * 1.6,
  },
  s6_nocamp: {
    desc: 'no boss phase KILLED by stationary, shuttling, drifting, or spawn-hover play (invulnerable probes = death-tank upper bound; mortal versions must die — r6.2/r6.3)',
    probes: CAMP_PROBES,
    pass: CAMP_PROBES.every((p) => p.bossKills === 0),
  },
  s6_stutter_residual: {
    desc: 'DOCUMENTED RESIDUAL (r6 ship decision): a 15f-sprint/15f-stop stutter threads the stillness reset, the graze account, and slow-EMA led-aim at once. Closing it cost honest-play greens on every measured config (r6.6 frontier). Measured shape on the ship tree: the mortal stutterer clips P1 (~17k, ~10% of honest take) then DIES without clearing. LAW: mortal form must die, never clear the boss (≤1 phase), and earn <15% of the certified expert score. Invulnerable number is tracked data.',
    invulnerable: STUTTER_INVULN,
    mortal: STUTTER_MORTAL,
    pass: STUTTER_MORTAL.outcome === 'died' && STUTTER_MORTAL.bossKills <= 1
      && STUTTER_MORTAL.score < runs[0].score * 0.15,
  },
  s6_deathtank_watch: {
    desc: 'ADVISORY (always passes): mortal zero-dodge boss-tracker take — genre-normal death-tanking, tracked so it can never silently become the best route',
    ...TRACKER_WATCH, advisory: true, pass: true,
  },
  s4_entrance_armor: {
    desc: 'boss takes ZERO damage during the entrance descent (r6.3 critic B: armorUntil clobbered in spawnEnemy — mortal 56f SPEED kill of P1 before the boss fires)',
    bossHpAt90: CAMP_PROBES.map((p) => ({ name: p.name, hp: p.bossHpAt90 })),
    fullHp: ENEMY_DEFS[5].hp,
    pass: CAMP_PROBES.every((p) => p.bossHpAt90 === null || p.bossHpAt90 >= ENEMY_DEFS[5].hp),
  },
  s6_topband: {
    desc: 'the top of the screen is not a shelter (r18): a MORTAL top-parker (fire held, sidesteps bodies, never dodges bullets) must die to a BULLET at least once over the full stage at y 16 (center, rail) and y 40, AND in the boss arena parked at y 16 — before r18 the boss (y≈92, r 30) could neither reach nor be reached by that parker: three scoreless timeouts',
    probes: TOP_PARK,
    pass: TOP_PARK.every((p) => p.bulletDeaths >= 1 && p.threatFrames > 0),
  },
  s7_robust: {
    desc: 'expert clears BY KILLS (0 timeouts, ≥1 life) on 4 ALTERNATE seeds — green-on-the-certified-seed-only is not clearable (r6 critic 2: boss-p3 timed out on 4/8 seeds while the certified seed stayed green)',
    runs: ROBUST_RUNS.map((r) => ({ seed: r.seedHex, outcome: r.outcome, timeouts: r.timeouts, timeoutLog: r.timeoutLog, lives: r.livesLeft, frames: r.frames })),
    pass: ROBUST_RUNS.every((r) => r.outcome === 'clear' && r.timeouts === 0 && r.livesLeft >= 1),
  },
  s7_clearable: {
    desc: 'expert bot clears BY KILLS (zero timeouts) with ≥1 life; blind bot dies mid-stage',
    expert: runs[0].outcome, expertLives: runs[0].livesLeft, expertTimeouts: runs[0].timeoutLog,
    blind: runs[3].outcome, blindFrames: runs[3].frames,
    pass: runs[0].outcome === 'clear' && runs[0].livesLeft >= 1 && runs[0].timeouts === 0
      && runs[3].outcome === 'gameover',
  },
};
console.log('checks:', JSON.stringify(checks, null, 1));

mkdirSync(join(ROOT, 'evidence'), { recursive: true });
writeFileSync(join(ROOT, 'evidence', 'metrics.json'),
  JSON.stringify({ seed: SEED, generated: 'sim.mjs', stress, determinism: det, runs, checks }, null, 2));
console.log('wrote evidence/metrics.json');
