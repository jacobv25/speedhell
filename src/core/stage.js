// Stage 1 — enemy behaviors + spawn timeline.
// Design rules in play: chunks escalate, no encounter repeats >2 [BOGHOG_CRAFT],
// top-lane flow / no simultaneous elites [WS05], bottom no-shoot band [WS04],
// no breather after midboss (gate resumes immediately) [BOGHOG_CRAFT/T2].
import { spawnEnemy, spawnItem, bulletCancelWall, W, H } from './game.js';
import { aimedFan, ring, arcWall, spray, bendyStream, twinSpiral } from './patterns.js';

// HP retuned r2 for the capped shot pipeline (range DPS roughly halved): big
// targets scaled ~0.55x so phase durations hold; "HP as low as role allows" (S4).
//                 hp  value window r
export const ENEMY_DEFS = [
  /*0 zako   */ { hp: 2,   value: 200,   window: 55,  r: 10 },
  /*1 mid    */ { hp: 12,  value: 800,   window: 120, r: 14 },
  /*2 turret */ { hp: 10,  value: 500,   window: 100, r: 12 },
  /*3 elite  */ { hp: 32,  value: 3000,  window: 260, r: 20 },
  /*4 midboss*/ { hp: 160, value: 8000,  window: 700, r: 26 },
  /*5 boss   */ { hp: 110, value: 9000,  window: 600, r: 30 }, // hp = P1 hp (spawn)
];

const MIDBOSS_TIMEOUT = 1400;          // ~23s — no milking (S6)
const BOSS_PHASE_HP = [140, 150, 200]; // HP is a pattern-duration knob [BOGHOG T1]; index 0 unused (spawn hp)
const BOSS_PHASE_TIMEOUT = 1450;       // ~24s per phase — passive dodging times out

// Enemies may not fire from the player's band or below (WS04 bottom no-shoot).
function mayFire(g, e) {
  return e.vulnAt >= 0 && e.y < g.player.y - 60 && e.y > 30;
}

export function updateEnemy(g, e) {
  switch (e.type) {
    case 0: { // zako — popcorn; 'phase' 1 = diver variant (escalation twist)
      if (e.phase === 1 && e.age > 40 && e.age < 70) {
        e.vx += (g.player.x - e.x) * 0.002; // homes briefly, then commits
      }
      e.x += e.vx + Math.sin(e.age * 0.06) * e.side * 0.9;
      e.y += e.vy;
      break;
    }
    case 1: { // mid — enter, hold, aimed bursts; left alive it digs in and hoses (S4 dynamic)
      if (e.y < e.holdT) e.y += 2.2; else {
        e.fireT++;
        if (e.fireT % 70 === 20 && mayFire(g, e)) aimedFan(g, e.x, e.y + 8, 5, 0.55, 4.6);
        if (e.fireT === 230 && mayFire(g, e)) spray(g, e.x, e.y + 8, 10, 1.1, 2.6, 4.2);
        // leave-alive escalation: past the polite phase it parks and hoses hard
        if (e.fireT > 300 && e.fireT % 55 === 15 && mayFire(g, e)) spray(g, e.x, e.y + 8, 9, 1.2, 2.6, 4.4);
        if (e.fireT > 300 && e.fireT % 110 === 60 && mayFire(g, e)) aimedFan(g, e.x, e.y + 8, 7, 0.8, 5.0);
        if (e.fireT > 700) { e.vy -= 0.08; e.y += e.vy; e.x += e.side * 0.6; } // exits much later
      }
      break;
    }
    case 2: { // turret — scrolls; kill fast or be blanketed [T2]
      e.fireT++;
      const angry = e.vulnAt >= 0 && g.frame - e.vulnAt > e.window * 1.5;
      e.y += angry ? 0.45 : 0.7; // angry turrets dig in — they leave slower
      const every = angry ? 40 : 95;
      if (e.fireT % every === 30 && mayFire(g, e))
        aimedFan(g, e.x, e.y + 6, angry ? 6 : 3, angry ? 0.9 : 0.4, angry ? 4.6 : 3.4);
      break;
    }
    case 3: { // elite — area denial cycles, escalating per rep (WS03); overstays if ignored
      if (e.y < 130) { e.y += 1.8; break; }
      e.x += Math.sin(e.age * 0.012) * 1.1;
      e.fireT++;
      const rep = e.phase, k = Math.min(1 + rep * 0.12, 1.7);
      const cyc = e.fireT % 210;
      if (mayFire(g, e)) {
        if (cyc === 30) arcWall(g, e.x, e.y + 10, 13, 1.5, 2.6 * k, 3 + ((g.rng.next() * 7) | 0), 1);
        if (cyc === 100) aimedFan(g, e.x, e.y + 10, 7, 0.8, 4.8 * k);
        if (cyc === 170) ring(g, e.x, e.y, 16, 2.2 * k, g.rng.range(0, 0.4));
        if (rep >= 1 && cyc === 135) spray(g, e.x, e.y + 10, 7, 1.0, 2.8, 4.4); // rep-2+ extra hose
        if (cyc === 209) e.phase++;
      }
      if (e.age > 1150) { e.vy -= 0.06; e.y += e.vy; } // exits eventually, but ignoring it is expensive
      break;
    }
    case 4: { // midboss
      if (e.y < 110) { e.y += 1.6; return; }
      // tanh edge-dwell sweep (house style, see boss): parks at the rails so a
      // tracker gets stable time-on-target; a center-camper gets brief crossings
      e.x = W / 2 + Math.tanh(3.5 * Math.sin(e.age * 0.008)) / Math.tanh(3.5) * 105;
      e.fireT++;
      const half = e.hp < ENEMY_DEFS[4].hp * 0.45;
      if (mayFire(g, e)) {
        if (!half) { // phase A: aimed pressure + bendy obstacles
          if (e.fireT % 80 === 20) aimedFan(g, e.x - 18, e.y + 12, 5, 0.5, 4.6);
          if (e.fireT % 80 === 50) aimedFan(g, e.x + 18, e.y + 12, 5, 0.5, 4.6);
          if (e.fireT % 130 === 90) { bendyStream(g, e.x, e.y + 10, Math.PI / 2 - 0.5, 7, 1.8, 4.2); bendyStream(g, e.x, e.y + 10, Math.PI / 2 + 0.5, 7, 1.8, 4.2); }
        } else {     // phase B bleeds in: rings + bounded spray
          if (e.fireT % 90 === 10) ring(g, e.x, e.y, 20, 2.4, (e.fireT * 0.13) % 1);
          if (e.fireT % 60 === 40) spray(g, e.x, e.y + 12, 6, 0.9, 3.0, 4.6);
          // desperation layer — only campers who let it live this long ever see it
          if (e.fireT > 1100 && e.fireT % 70 === 5) { bendyStream(g, e.x - 20, e.y + 8, Math.PI / 2 - 0.4, 7, 1.7, 4.2); bendyStream(g, e.x + 20, e.y + 8, Math.PI / 2 + 0.4, 7, 1.7, 4.2); }
        }
      }
      // timeout: flees, no score, gate opens — the stage does not wait (S6, T2)
      if (e.vulnAt >= 0 && g.frame - e.vulnAt > MIDBOSS_TIMEOUT) {
        e.dead = 1; g.stats.timeouts++; g.stats.timeoutLog.push('midboss'); g.gate = null;
      }
      break;
    }
  }
}

export function updateBoss(g, e) {
  const phase = e.phase, rep = e.fireT / 240 | 0;
  const k = Math.min(1 + rep * 0.08, 1.5); // escalation per cycle (S3)
  if (e.age < 90) { e.y += 2.0; return; }  // gravitas entrance — the one allowed pause
  // (descends to y≈140: fights inside the capped-pipeline's effective range, so
  // closing on the boss is rewarded the same way it is against everything else)
  e.fireT++;
  const t = e.fireT % 240;

  if (phase === 0) {         // P1: aimed needle pressure + laned walls (gap readable, lanes viable)
    // rail-hopping: at each dwell's end the boss hops to the rail on the FAR side
    // of the player. A camper is never under it; a chaser always is. Time-on-target
    // is bought by pursuit, not position — anti-camp from physics, not stats (S6).
    const railX = W / 2 + e.side * 150;
    if (Math.abs(e.x - railX) > 3) e.x += Math.sign(railX - e.x) * 3.2;
    else if (--e.holdT <= 0) { e.side = g.player.x < W / 2 ? 1 : -1; e.holdT = 300; }
    if (mayFire(g, e)) {
      if (t % 60 === 20) aimedFan(g, e.x, e.y + 14, 5 + Math.min(rep, 4), 0.6, 4.8 * k);
      // wall lane biased AWAY from the boss's rail: the wall shoves you off its
      // column, and only deliberately fighting back in buys time-on-target —
      // campers who just ride the lane end up misaligned (anti-camp, S6).
      if (t === 110) arcWall(g, e.x, e.y + 10, 13 + rep, 1.9, 2.4 * k, (e.x < W / 2 ? 9 : 1) + ((g.rng.next() * 3) | 0), 2);
      if (t === 200) arcWall(g, e.x, e.y + 10, 13 + rep, 1.9, 2.4 * k, (e.x < W / 2 ? 9 : 1) + ((g.rng.next() * 3) | 0), 2);
    }
  } else if (phase === 1) {  // P2: twin spirals + bounded spray on a wide slow sweep —
    // the whole screen is its lane; you chase it or you don't hurt it (anti-camp).
    e.x = W / 2 + Math.tanh(3.5 * Math.sin(e.age * 0.006)) / Math.tanh(3.5) * 150;
    if (mayFire(g, e)) {
      if (t % 30 === 10) twinSpiral(g, e.x, e.y + 8, (e.fireT * 0.11) % 6.28, 2 + (rep > 2 ? 1 : 0), 2.6 * k, 1, 0.012);
      if (t % 120 === 60) spray(g, e.x, e.y + 14, 8 + Math.min(rep, 4), 1.0, 3.2, 4.8);
    }
  } else {                   // P3: rhythm-broken finale — rings, bendy, fast aimed,
    // riding the full-width sweep: stay on it or watch it time out (anti-camp).
    e.x = W / 2 + Math.tanh(3.5 * Math.sin(e.age * 0.005)) / Math.tanh(3.5) * 150;
    if (mayFire(g, e)) {
      if (t === 20) ring(g, e.x, e.y, 22 + rep * 3, 2.5 * k, g.rng.range(0, 0.3));
      if (t === 80) { bendyStream(g, e.x - 26, e.y, Math.PI / 2 - 0.7, 8 + rep, 1.6, 4.6); bendyStream(g, e.x + 26, e.y, Math.PI / 2 + 0.7, 8 + rep, 1.6, 4.6); }
      if (t === 125 || t === 165) aimedFan(g, e.x, e.y + 14, 7 + Math.min(rep, 3), 0.5, 5.8 * k);
      if (t === 210) spray(g, e.x, e.y + 10, 9 + Math.min(rep, 4), 1.3, 2.8, 5.0);
    }
  }

  // per-phase timeout: advance without reward, bullets stay (no milking, S6)
  if (e.vulnAt >= 0 && g.frame - e.vulnAt > BOSS_PHASE_TIMEOUT) {
    g.stats.timeouts++; g.stats.timeoutLog.push('boss-p' + (e.phase + 1));
    advanceBossPhase(g, e, false);
  }
}

export function advanceBossPhase(g, e, killed) {
  g.stats.bossPhaseFrames.push(e.fireT);
  if (killed) {
    bulletCancelWall(g, e.x, e.y);
    for (let i = 0; i < 10; i++) spawnItem(g, e.x + g.rng.range(-50, 50), e.y + g.rng.range(-20, 40), 1000);
  } else {
    // timeout: bullets stay, no reward
  }
  // final phase resolved: scoring already granted by scoreBossPhase, so despawn
  // silently (dead=1) either way; gate opens, clear sequence begins.
  if (e.phase >= 2) { e.dead = 1; g.gate = null; g.bossDown = true; return; }
  e.phase++; e.fireT = 0;
  e.hp = BOSS_PHASE_HP[e.phase];
  e.vulnAt = -1; e.armorUntil = g.frame + 60; // brief armor while next phase telegraphs
}

// --- timeline ------------------------------------------------------------
// Sections (chunk themes, ≤2 reps each, escalating): popcorn intro → turret
// alley → mid gauntlet → MIDBOSS (gate) → rush → elite pair → release → BOSS.
export function buildTimeline() {
  const tl = [];
  const at = (t, fn) => tl.push({ t, fn });
  const zakoGroup = (t, side, n, opts = {}) => {
    for (let i = 0; i < n; i++) at(t + i * 11, (g) => {
      const x = side < 0 ? 60 + i * 8 : W - 60 - i * 8;
      const e = spawnEnemy(g, 0, x, -20, { vx: side * (0.7 + (opts.spd || 0)), vy: 2.4 + (opts.spd || 0), side });
      if (opts.diver && e) e.phase = 1;
    });
  };

  // S1 popcorn intro — teach speed-kill (rep1, rep2 slightly faster: ≤2 reps)
  zakoGroup(120, -1, 6); zakoGroup(240, 1, 6);
  zakoGroup(420, -1, 7, { spd: 0.4 }); zakoGroup(420, 1, 7, { spd: 0.4 });

  // S2 turret alley — alternating columns, popcorn layered (WS05 top-lane flow)
  for (let r = 0; r < 2; r++) {
    const base = 720 + r * 420;
    at(base, (g) => { spawnEnemy(g, 2, 90, -16); spawnEnemy(g, 2, 200, -60); });
    at(base + 120, (g) => { spawnEnemy(g, 2, W - 90, -16); spawnEnemy(g, 2, W - 200, -60); });
    zakoGroup(base + 180, r === 0 ? 1 : -1, 6, r === 1 ? { diver: true } : {});
  }

  // S3 mid gauntlet — sequenced sides suggest the route (never simultaneous)
  const midAt = (t, x, side, hold) => at(t, (g) => spawnEnemy(g, 1, x, -18, { side, holdT: hold }));
  midAt(1700, 120, -1, 110); midAt(1810, W - 120, 1, 130);
  midAt(1950, W / 2 - 60, -1, 100); midAt(2060, W / 2 + 60, 1, 140);
  zakoGroup(1880, -1, 5); zakoGroup(2100, 1, 5);

  // S4 midboss — gate; killing it fast means the rush starts immediately (T2)
  at(2400, (g) => { g.gate = 'midboss'; spawnEnemy(g, 4, W / 2, -30); });

  // S5 rush — heavy overlap tension peak (WS05): divers + turrets + popcorn
  zakoGroup(2460, -1, 8, { spd: 0.5 }); zakoGroup(2520, 1, 8, { spd: 0.5 });
  at(2580, (g) => { spawnEnemy(g, 2, 140, -16); spawnEnemy(g, 2, W - 140, -16); });
  zakoGroup(2640, -1, 8, { diver: true, spd: 0.3 }); zakoGroup(2700, 1, 8, { diver: true, spd: 0.3 });

  // S6 elite pair — rep1 solo, rep2 + turrets (twist), never simultaneous elites
  at(2900, (g) => spawnEnemy(g, 3, W / 2 - 80, -24));
  at(3260, (g) => { spawnEnemy(g, 3, W / 2 + 80, -24); spawnEnemy(g, 2, 80, -16); spawnEnemy(g, 2, W - 80, -16); });

  // S7 release — cancel wall + item shower + ~3s breather (WS05 tension-release)
  // Items here are routing signage, not a payday [BOGHOG T2] — low value, free wall pays little.
  at(3700, (g) => {
    bulletCancelWall(g, W / 2, H / 2, 30);
    for (let i = 0; i < 14; i++) spawnItem(g, 60 + i * 26, -10 - (i % 3) * 24, 150);
  });

  // S8 boss — gate until the run resolves
  at(3900, (g) => { g.gate = 'boss'; spawnEnemy(g, 5, W / 2, -40); });

  tl.sort((a, b) => a.t - b.t);
  return tl;
}
