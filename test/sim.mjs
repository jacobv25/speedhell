// Headless sim harness — produces evidence/metrics.json for gauntlet critics.
// Runs the real game logic (no DOM) with scripted bots. Usage: node test/sim.mjs
import { makeGame, startRun, update, stressScene, spawnEnemy, W, H, PLAYER } from '../src/core/game.js';
import { ENEMY_DEFS } from '../src/core/stage.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 0xC0FFEE;
const MAX_FRAMES = 30000;

// --- bots ------------------------------------------------------------------
// Greedy dodge: sample candidate moves, project bullets N frames, pick the move
// maximizing minimum clearance. reactDelay models human reaction (S7: 120ms ≈ 7f).
function makeBot({ aggressive, lookahead = 12, reactDelay = 0 }) {
  let delayed = 0;
  return (g) => {
    const p = g.player, i = g.input;
    i.fire = true; i.bomb = false; i.focus = false;
    if (reactDelay > 0 && (delayed = (delayed + 1) % (reactDelay + 1)) !== 0) return;

    let target = W / 2;
    if (aggressive && g.enemies.count > 0) {
      let best = 1e9;
      for (let k = 0; k < g.enemies.count; k++) {
        const e = g.enemies.items[k];
        if (e.vulnAt < 0 || e.y > p.y - 40) continue;
        const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 0.3;
        if (d < best) { best = d; target = e.x; }
      }
    }
    let bestScore = -1e9, bestDx = 0, bestDy = 0;
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
      const spd = PLAYER.speed;
      let px = p.x, py = p.y, minClear = 1e9;
      for (let f = 1; f <= lookahead; f++) {
        px = Math.max(12, Math.min(W - 12, px + dx * spd * ((dx && dy) ? 0.707 : 1)));
        py = Math.max(16, Math.min(H - 16, py + dy * spd * ((dx && dy) ? 0.707 : 1)));
        for (let b = 0; b < g.eBullets.count; b++) {
          const q = g.eBullets.items[b];
          const bx = q.x + q.vx * f, by = q.y + q.vy * f;
          const d = Math.hypot(bx - px, by - py) - q.r - PLAYER.hitR;
          if (d < minClear) minClear = d;
        }
        for (let e = 0; e < g.enemies.count; e++) {
          const q = g.enemies.items[e];
          const d = Math.hypot(q.x - px, q.y - py) - q.r - PLAYER.hitR;
          if (d < minClear) minClear = d;
        }
      }
      const clearScore = Math.min(minClear, 60);
      const homeY = -Math.abs((H - 110) - py) * 0.15;
      const homeX = -Math.abs(target - px) * (aggressive ? 0.35 : 0.08);
      const s = clearScore * 3 + homeY + homeX;
      if (s > bestScore) { bestScore = s; bestDx = dx; bestDy = dy; }
    }
    i.dx = bestDx; i.dy = bestDy;
    // panic bomb when boxed in (checkmate detector, not an auto-win)
    let nearest = 1e9;
    for (let b = 0; b < g.eBullets.count; b++) {
      const q = g.eBullets.items[b];
      const d = Math.hypot(q.x - p.x, q.y - p.y) - q.r;
      if (d < nearest) nearest = d;
    }
    if (nearest < 10 && bestScore < 20) i.bomb = true;
  };
}

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
// measure damage per second. Rubric S1: DPS at 40px >= 1.8x DPS at 300px.
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
    const t = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss'][k.t];
    byType[t] = byType[t] || { n: 0, speed: 0 };
    byType[t].n++; byType[t].speed += k.s;
  }
  return byType;
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

const dpsClose = pointBlankDps(40), dpsFar = pointBlankDps(300);
const aggro = runs[1], passive = runs[2];
// TTK from the bottom band — the "does closing in FEEL different" numbers
const eliteRangeTTK = ENEMY_DEFS[3].hp / dpsFar, midRangeTTK = ENEMY_DEFS[1].hp / dpsFar;
const checks = {
  s1_pointblank: {
    desc: 'point-blank DPS >= 1.8x DPS at range (playtest: bottom-camping killed fine)',
    dpsAt40: +dpsClose.toFixed(1), dpsAt300: +dpsFar.toFixed(1),
    ratio: dpsFar ? +(dpsClose / dpsFar).toFixed(2) : Infinity,
    pass: dpsClose >= dpsFar * 1.8,
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
