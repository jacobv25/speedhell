// SPEEDHELL core — DOM-free, deterministic, fixed 60Hz logic.
// Runs identically in browser and Node (sim harness imports this file).
import { makeRng } from './rng.js';
import { makePool } from './pool.js';
import { buildTimeline, updateEnemy, updateBoss, advanceBossPhase, ENEMY_DEFS, BOSS_PHASE_TIMEOUT } from './stage.js';

export const W = 320, H = 427;
export const STEP = 1 / 60;

// Field shrunk r4 (playtest 3: "field seems too large"): 480x640 -> 320x427 with
// sprite pixel sizes UNCHANGED — the canvas stretch renders everything larger.
// Ship is now 0.69 field-widths/s (genre band 0.65-0.85, boghog Cave analysis)
// and 5.6% of field width. All world speeds scaled x2/3 with the field so
// relative dynamics (bullet band, descent times, speed-kill windows) hold.
// focusSpeed close to full speed per boghog's Cave frame analysis (~1.6x ratio,
// "halving feels bad") [BOGHOG_CRAFT]. Transition is instant: twitchy, speed-hell.
// Shot economy is the point-blank incentive (S1, playtest r2): the on-screen cap
// (6) binds hard at range — beyond ~90px the pipeline saturates and throughput is
// cap/flight-time limited (~57 dmg/s at 200px) — while point-blank the cap never
// binds and the fire rate delivers the full 120 dmg/s. Real physics, no multiplier.
export const PLAYER = {
  speed: 3.7, focusSpeed: 2.3, hitR: 3,
  shotSpeed: 9, shotLimit: 6, shotEvery: 3, shotDmg: 3,
};

export function makeGame(seed = 1) {
  const g = {
    seed, rng: makeRng(seed), frame: 0,
    state: 'title', // title | play | dead-wait | clear | gameover
    player: {
      x: W / 2, y: H - 53, prevX: W / 2, prevY: H - 53,
      alive: true, invuln: 0, focus: false, fireCd: 0,
      lives: 3, bombs: 2, bombActive: 0, bombCd: 0,
    },
    input: { dx: 0, dy: 0, focus: false, fire: false, bomb: false },
    score: 0, chain: 0, speedKills: 0, kills: 0,
    stageT: 0, timeline: null, tlIndex: 0, gate: null, bossDown: false,
    warn: 0, // r6 S3b arrival ritual: frames of WARNING remaining before the boss gate

    clearBonus: 0, clearAt: 0, endFrame: 0,
    // pools — capacities are hard caps (rubric S8)
    pBullets: makePool(64, () => ({ x: 0, y: 0, vy: 0, alive: 0 })),
    eBullets: makePool(1400, () => ({ x: 0, y: 0, vx: 0, vy: 0, kind: 0, r: 3, accel: 0, curve: 0, age: 0 })),
    enemies: makePool(64, () => ({
      type: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, r: 10, age: 0,
      vulnAt: 0, armorUntil: 0, holdT: 0, phase: 0, fireT: 0, side: 1, value: 0, window: 0, dead: 0,
      sweepOff: 0, // boss-phase sweep phase offset (r5: continuous phase handoff)
      campT: 0, // r6 boss serve budget: continuous frames spent serving the player's column
      prevHp: 0, // r6: last frame's hp (boss damage-stream detection for the serve budget)
      latchX: -1e9, // r6.3: x latched at an over-serve relocation (-1e9 = none); cleared
      // ONLY by genuine pursuit (co-movement with the boss) — never by displacement
      latchX2: -1e9, // r6.3: the PREVIOUS latched band (a 2-spot shuffler banks two bands)
      latchN: 0, // r6.3: relocations this phase — ratchets the serve ration 55→25→12→6→2
      trackT: 0, // r6.3: demonstrated-tracking credit while latched (staying under the relocated boss)
      pxEma: 0, // r6.3: fast EMA of player x (~0.4s) — 'parked' posture detector
      lastDir: 0, // r6.4: last nonzero x-direction of the player (crawl detector)
      monoT: 0, // r6.4: moving-frames without a direction reversal (crawl detector)
      stillRun: 0, // r6.5: consecutive still frames (a real dwell resets monoT)
      latchT: 0, // r6.5: refunds granted this phase (each further refund costs +25 credit)
      grazeT: 0, // r6.4: frames since a bullet grazed the player's core (in-fire window)
      grindHp: 0, // r6.4: per-phase hp dealt from IN-FIRE play — the grind account
    })),
    items: makePool(200, () => ({ x: 0, y: 0, vy: 0, val: 0 })),
    particles: makePool(400, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, hue: 0 })),
    popups: makePool(32, () => ({ x: 0, y: 0, life: 0, text: '', big: 0 })),
    shake: 0, flash: 0, cancelFlash: 0,
    // instrumentation (read by sim + critics; cheap fixed-size)
    stats: {
      maxEBullets: 0, deaths: [], killLog: [], bulletCurve: [],
      scoreCurve: [], bossPhaseFrames: [], timeouts: 0, timeoutLog: [],
    },
  };
  return g;
}

export function startRun(g) {
  const seed = g.seed;
  Object.assign(g, makeGame(seed));
  g.state = 'play';
  g.timeline = buildTimeline();
  return g;
}

function addPopup(g, x, y, text, big = 0) {
  const p = g.popups.spawn(); if (!p) return;
  // De-conflict at spawn (r5 S6-legibility): no two live popups may share a
  // baseline. Keep on-field, below the HUD block, and nudge down 14px past any
  // live popup occupying the same slot (bounded by the 32-popup pool).
  x = Math.max(40, Math.min(W - 40, x));
  if (y < 58) y = 58;
  // bound: clearing one popup's ±13 band can take two 14px steps, so a ladder
  // of n live popups needs up to 2n pushes plus one final clear check
  for (let guard = 0; guard <= g.popups.count * 2; guard++) {
    let hit = false;
    for (let i = 0; i < g.popups.count; i++) {
      const o = g.popups.items[i];
      if (o !== p && Math.abs(o.y - y) < 13 && Math.abs(o.x - x) < 60) { hit = true; break; }
    }
    if (!hit) break;
    y += 14;
  }
  p.x = x; p.y = y; p.life = 50; p.text = text; p.big = big;
}

function burst(g, x, y, n, hue, power = 1) {
  for (let i = 0; i < n; i++) {
    const p = g.particles.spawn(); if (!p) return;
    const a = g.rng.range(0, Math.PI * 2), s = g.rng.range(0.5, 3.5) * power;
    p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
    p.max = p.life = (14 + g.rng.range(0, 12)) | 0; p.hue = hue;
  }
}

export function spawnEnemy(g, type, x, y, opts = {}) {
  const e = g.enemies.spawn(); if (!e) return null;
  const d = ENEMY_DEFS[type];
  e.type = type; e.x = x; e.y = y; e.vx = opts.vx || 0; e.vy = opts.vy || 0;
  e.hp = d.hp; e.r = d.r; e.age = 0; e.phase = 0; e.fireT = 0; e.dead = 0;
  e.side = opts.side || 1; e.holdT = opts.holdT || 0;
  e.value = d.value; e.window = d.window; e.sweepOff = 0; e.campT = 0; e.prevHp = d.hp;
  e.latchX = -1e9; e.latchX2 = -1e9; e.latchN = 0; e.trackT = 0; e.pxEma = g.player.x;
  e.grazeT = 0; e.grindHp = 0; e.lastDir = 0; e.monoT = 0; e.latchT = 0; e.stillRun = 0;
  e.vulnAt = -1; e.armorUntil = 0; // vuln set once on-screen (top dead zone + intro armor)
  // r6.4: the boss's entrance armor lives HERE, not in the timeline event, so
  // every spawn path (referee camp probes included) gets the untouchable 90f
  // descent. (r6.3 shipped this line BEFORE the armorUntil reset above — the
  // armor never existed and every strategy shaved free descent HP, critic B.)
  if (type === 5) e.armorUntil = g.frame + 95;
  return e;
}

export function spawnItem(g, x, y, val = 500) {
  const it = g.items.spawn(); if (!it) return;
  it.x = x; it.y = y; it.vy = -1.0; it.val = val;
}

function killEnemy(g, e, idx) {
  const aliveFrames = g.frame - e.vulnAt;
  const speed = e.vulnAt >= 0 && aliveFrames <= e.window;
  let v = e.value;
  if (speed) {
    v *= 2; g.chain++; g.speedKills++;
    addPopup(g, e.x, e.y, 'SPEED', 1);
    if (g.chain % 5 === 0) { // rush shower: garnish, subordinate to core (S6)
      for (let k = 0; k < 6; k++) spawnItem(g, e.x + g.rng.range(-20, 20), e.y + g.rng.range(-13, 13), g.chain * 20);
      addPopup(g, e.x, e.y - 24, 'RUSH x' + g.chain, 1);
    }
  } else {
    g.chain = 0;
    addPopup(g, e.x, e.y, '+' + v, 0);
  }
  g.score += v; g.kills++;
  g.stats.killLog.push({ t: e.type, f: aliveFrames, s: speed ? 1 : 0 });
  const big = e.type === 3 || e.type === 4; // elite/midboss get the shake (S4);
  // boss sub-parts (type 6) pop like popcorn — shake stays reserved (S4-SHOULD)
  burst(g, e.x, e.y, big ? 60 : 16, e.type === 1 ? 200 : 30, big ? 2 : 1);
  if (big) g.shake = 14;
  if (e.type === 4) { // midboss down: relief wall + shower, gate opens — no breather (T2)
    bulletCancelWall(g, e.x, e.y);
    for (let i = 0; i < 8; i++) spawnItem(g, e.x + g.rng.range(-27, 27), e.y + g.rng.range(-7, 20), 800);
    g.gate = null;
  }
  // elite/mid down: section relief — killing the space-controller clears its
  // denial field (speed-kill = safety, pillar 2). This is the S4 dynamic
  // lifecycle made physical: killers keep a clean screen, leavers drown.
  // Garnish-priced like the S7 release wall so it can't out-earn the core (S6).
  if (e.type === 3 || e.type === 1) bulletCancelWall(g, e.x, e.y, 30);
  g.enemies.killAt(idx);
}

// Boss phases score like kills but the entity persists until the last phase.
function scoreBossPhase(g, e) {
  const dur = e.vulnAt >= 0 ? g.frame - e.vulnAt : 1e9;
  const speed = dur <= e.window;
  // r6 late-kill decay (Psikyo pays boss GOLD by kill time): full value through
  // 1200f of the phase (every honest expert kill across the certified + robust
  // seeds lands under it), sliding to ~nothing at the 1450f timeout — a phase
  // ground down at the buzzer pays like the timeout it almost was, so slow
  // grinding is never a payday and camp-luck can't spike a passive score (S6).
  const fade = Math.max(0, Math.min(1, (BOSS_PHASE_TIMEOUT - dur) / 250));
  let v = Math.round(ENEMY_DEFS[5].value * fade / 10) * 10;
  if (speed) { v *= 2; g.chain++; g.speedKills++; addPopup(g, e.x, e.y, 'SPEED', 1); }
  g.score += v; g.kills++;
  g.stats.killLog.push({ t: 5, f: e.vulnAt >= 0 ? g.frame - e.vulnAt : -1, s: speed ? 1 : 0 });
  burst(g, e.x, e.y, 70, 30, 2.2); g.shake = 16;
  advanceBossPhase(g, e, true, fade);
}

function cancelAllBullets(g, perBullet = 100) {
  let n = g.eBullets.count;
  if (n === 0) return 0;
  for (let i = n - 1; i >= 0; i--) {
    const b = g.eBullets.items[i];
    if ((i & 3) === 0) burst(g, b.x, b.y, 1, 190, 0.6);
    g.eBullets.killAt(i);
  }
  g.score += n * perBullet;
  g.cancelFlash = 20;
  return n;
}

export function bulletCancelWall(g, x, y, perBullet = 100) { // release moment (S5)
  const n = cancelAllBullets(g, perBullet);
  if (n > 0) addPopup(g, x, y, 'CANCEL +' + (n * perBullet), 1);
}

function playerDie(g, cause) {
  const p = g.player;
  g.stats.deaths.push({ f: g.frame, x: p.x | 0, y: p.y | 0, c: cause });
  burst(g, p.x, p.y, 80, 0, 2.5);
  g.shake = 20; g.chain = 0;
  cancelAllBullets(g, 0); // safety clear, no points
  p.lives--;
  if (p.lives < 0) { g.state = 'gameover'; g.endFrame = g.frame; return; }
  p.x = W / 2; p.y = H - 53; p.invuln = 150; p.bombs = 2; p.bombActive = 0;
}

function fireBomb(g) {
  const p = g.player;
  if (p.bombs <= 0 || p.bombCd > 0) return;
  p.bombs--; p.bombCd = 90; p.bombActive = 60; p.invuln = Math.max(p.invuln, 180);
  // bomb-cancel points are a garnish, subordinate to speed-kill core (S6)
  const n = cancelAllBullets(g, 30);
  addPopup(g, p.x, p.y - 40, n > 0 ? 'BOMB +' + (n * 30) : 'BOMB', 1);
  g.flash = 12;
}

export function update(g) {
  if (g.state !== 'play') return;
  g.frame++;
  if (!g.gate) {
    g.stageT++; // gates: timeline holds for midboss/boss, resumes instantly
    // Caravan pull (S5, WS06 lineage): speed-killing a wave pulls the next one in
    // sooner. Empty screen + no gate + next event still far ⇒ fast-forward the
    // timeline 4x. Deterministic (pure stageT math); the 30-frame guard preserves
    // each wave's telegraph space so arrivals never pop in unannounced.
    // r6: never fast-forward through the WARNING ritual — the emptied field IS
    // the telegraph (S3b arrival ritual needs its full >=1s on the clock).
    if (g.enemies.count === 0 && !g.warn && !g.bossDown && g.tlIndex < g.timeline.length
      && g.timeline[g.tlIndex].t - g.stageT > 30) g.stageT += 3;
  }
  const p = g.player, inp = g.input;

  // --- player movement: instant response, normalized diagonals (S1) ---
  p.prevX = p.x; p.prevY = p.y;
  let dx = inp.dx, dy = inp.dy;
  if (dx !== 0 && dy !== 0) { const inv = 1 / Math.SQRT2; dx *= inv; dy *= inv; }
  const spd = inp.focus ? PLAYER.focusSpeed : PLAYER.speed;
  p.x = Math.max(12, Math.min(W - 12, p.x + dx * spd));
  p.y = Math.max(16, Math.min(H - 16, p.y + dy * spd));
  p.focus = inp.focus;
  if (p.invuln > 0) p.invuln--;
  if (p.bombCd > 0) p.bombCd--;
  if (inp.bomb) fireBomb(g);

  // --- player shots: on-screen cap → point-blank reward (S1) ---
  if (p.fireCd > 0) p.fireCd--;
  if (inp.fire && p.fireCd === 0 && g.pBullets.count <= PLAYER.shotLimit - 2) {
    for (const off of [-7, 7]) {
      const b = g.pBullets.spawn(); if (!b) break;
      b.x = p.x + off; b.y = p.y - 10; b.vy = -PLAYER.shotSpeed;
    }
    p.fireCd = PLAYER.shotEvery;
  }
  for (let i = g.pBullets.count - 1; i >= 0; i--) {
    const b = g.pBullets.items[i];
    b.y += b.vy;
    if (b.y < -20) g.pBullets.killAt(i);
  }

  // --- stage timeline ---
  const tl = g.timeline;
  while (g.tlIndex < tl.length && tl[g.tlIndex].t <= g.stageT) {
    tl[g.tlIndex].fn(g); g.tlIndex++;
  }

  // --- enemies ---
  for (let i = g.enemies.count - 1; i >= 0; i--) {
    const e = g.enemies.items[i];
    e.age++;
    // vulnerability: on-screen + 30f intro armor (S4); speed-kill clock starts here
    if (e.vulnAt < 0 && e.y > 16 && e.age > 30 && g.frame >= e.armorUntil) e.vulnAt = g.frame;
    if (e.type === 5) updateBoss(g, e); else updateEnemy(g, e);
    // outro: off-screen enemies despawn silently, fire nothing (S4)
    if (e.dead || e.y > H + 40 || e.y < -80 || e.x < -60 || e.x > W + 60) {
      if (e.dead === 2) killEnemy(g, e, i); // marked killed by script (timeout phases use dead=1: no score)
      else g.enemies.killAt(i);
      continue;
    }
    // player shots vs enemy
    if (e.vulnAt >= 0) {
      for (let j = g.pBullets.count - 1; j >= 0; j--) {
        const b = g.pBullets.items[j];
        const dxx = b.x - e.x, dyy = b.y - e.y;
        if (dxx * dxx + dyy * dyy < (e.r + 6) * (e.r + 6)) {
          g.pBullets.killAt(j);
          e.hp -= PLAYER.shotDmg;
          burst(g, b.x, b.y, 1, 45, 0.5);
          if (g.player.bombActive > 0) e.hp -= 0.5;
          if (e.hp <= 0) { if (e.type === 5) scoreBossPhase(g, e); else killEnemy(g, e, i); break; }
        }
      }
    }
  }
  if (p.bombActive > 0) {
    p.bombActive--;
    // bomb ticks all enemies lightly (dead-flagged skip: a final-phase boss
    // killed by shots this same frame must not be re-killed and re-paid — the
    // double-path double-paid P3 on a robust seed, r6.2)
    for (let i = g.enemies.count - 1; i >= 0; i--) {
      const e = g.enemies.items[i];
      if (e.vulnAt >= 0 && !e.dead) {
        e.hp -= 0.4;
        if (e.hp <= 0) { if (e.type === 5) scoreBossPhase(g, e); else killEnemy(g, e, i); }
      }
    }
  }

  // --- enemy bullets ---
  for (let i = g.eBullets.count - 1; i >= 0; i--) {
    const b = g.eBullets.items[i];
    b.age++;
    if (b.accel) { const s = 1 + b.accel; b.vx *= s; b.vy *= s; }
    if (b.curve) { const c = Math.cos(b.curve), s = Math.sin(b.curve); const vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; }
    b.x += b.vx; b.y += b.vy;
    if (b.x < -16 || b.x > W + 16 || b.y < -16 || b.y > H + 16) { g.eBullets.killAt(i); continue; }
    if (p.invuln === 0) {
      const dxx = b.x - p.x, dyy = b.y - p.y, rr = b.r + PLAYER.hitR;
      if (dxx * dxx + dyy * dyy < rr * rr) {
        g.eBullets.killAt(i);
        playerDie(g, 'bullet'); // flushes the pool — stop iterating it
        if (g.state !== 'play') return;
        break;
      }
    }
  }
  // enemy contact
  if (p.invuln === 0) {
    for (let i = 0; i < g.enemies.count; i++) {
      const e = g.enemies.items[i];
      const dxx = e.x - p.x, dyy = e.y - p.y, rr = e.r + PLAYER.hitR;
      if (dxx * dxx + dyy * dyy < rr * rr) { playerDie(g, 'contact'); break; }
    }
    if (g.state !== 'play') return;
  }

  // --- items (magnet + fall) ---
  for (let i = g.items.count - 1; i >= 0; i--) {
    const it = g.items.items[i];
    it.vy = Math.min(it.vy + 0.053, 1.6);
    const dxx = p.x - it.x, dyy = p.y - it.y, d2 = dxx * dxx + dyy * dyy;
    if (d2 < 53 * 53) { const d = Math.sqrt(d2) || 1; it.x += (dxx / d) * 4; it.y += (dyy / d) * 4; }
    else it.y += it.vy;
    if (d2 < 12 * 12) { g.score += it.val; g.items.killAt(i); continue; }
    if (it.y > H + 12) g.items.killAt(i);
  }

  // --- fx ---
  for (let i = g.particles.count - 1; i >= 0; i--) {
    const q = g.particles.items[i];
    q.x += q.vx; q.y += q.vy; q.vx *= 0.94; q.vy *= 0.94;
    if (--q.life <= 0) g.particles.killAt(i);
  }
  for (let i = g.popups.count - 1; i >= 0; i--) {
    const q = g.popups.items[i];
    // float up, but hold below the HUD block (y 58) and queue behind any popup
    // just above — popups never mush into the score/chain text or each other (r5)
    let rise = q.y > 58;
    if (rise) for (let j = 0; j < g.popups.count; j++) {
      if (j === i) continue;
      const o = g.popups.items[j];
      if (o.y < q.y && q.y - o.y < 13 && Math.abs(o.x - q.x) < 60) { rise = false; break; }
    }
    if (rise) q.y -= 0.5;
    if (--q.life <= 0) g.popups.killAt(i);
  }
  if (g.shake > 0) g.shake--;
  if (g.flash > 0) g.flash--;
  if (g.cancelFlash > 0) g.cancelFlash--;
  if (g.warn > 0) {
    g.warn--;
    // the WARNING ritual holds the timeline via a gate (so the emptied field is
    // ritual, not dead air); release it the moment the warning expires
    if (g.warn === 0 && g.gate === 'warning') g.gate = null;
  }

  // --- stage clear (boss down → tally after a beat) ---
  if (g.bossDown && !g.clearAt) g.clearAt = g.frame + 150;
  if (g.clearAt && g.frame >= g.clearAt) {
    g.clearBonus = p.lives * 1000 + p.bombs * 500; // stock bonus, garnish-sized (S6)
    g.score += g.clearBonus;
    g.state = 'clear'; g.endFrame = g.frame;
  }

  // --- instrumentation (fixed cadence, bounded size) ---
  g.stats.maxEBullets = Math.max(g.stats.maxEBullets, g.eBullets.count);
  if (g.frame % 60 === 0) {
    g.stats.bulletCurve.push(g.eBullets.count);
    g.stats.scoreCurve.push(g.score);
  }
}

// Debug/stress API for the sim harness (rubric S8 gate).
export function stressScene(g) {
  g.state = 'play'; g.timeline = []; g.tlIndex = 0;
  for (let i = 0; i < 48; i++) spawnEnemy(g, i % 4, 20 + (i % 12) * 24, 40 + ((i / 12) | 0) * 27);
  for (let i = 0; i < 1000; i++) {
    const b = g.eBullets.spawn(); if (!b) break;
    const a = g.rng.range(0, Math.PI * 2);
    b.x = g.rng.range(0, W); b.y = g.rng.range(0, H / 2);
    b.vx = Math.cos(a) * 2; b.vy = Math.abs(Math.sin(a) * 2) + 1;
    b.kind = i & 1; b.r = 3; b.accel = 0; b.curve = 0; b.age = 0;
  }
  for (let i = 0; i < 200; i++) burst(g, g.rng.range(0, W), g.rng.range(0, H), 1, 30, 1);
  g.player.invuln = 999999;
}
