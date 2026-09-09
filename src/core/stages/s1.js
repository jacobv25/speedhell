// Stage 1 — THE CRYPT. The stage module (r78 campaign infrastructure, plan
// docs/plans/campaign-five-stages.md §6): everything that is *this stage* —
// its timeline, its section table, its boss hook — lives here. The shared
// enemy/boss machinery (ENEMY_DEFS, updateEnemy, updateBoss, the camp
// governor, mayFire) stays in ../stage.js. buildTimeline() below is the
// r77 stage.js function MOVED, not edited: same events, same stageT numbers,
// same rng draws — stage 1 is byte-identical to its certificate by construction.
import { sfx, SFX, spawnEnemy, spawnItem, bulletCancelWall, W, H } from '../game.js';
import { updateBoss, advanceBossPhase } from '../stage.js';

export const id = 1;
export const name = 'THE CRYPT';

// Section table — the ONE source of the SEC_T anchors that main.js (practice
// row), renderer.js / the skins (background section + landmark scroll),
// booth.js and tools/booth-replay.mjs (section names) used to mirror by hand.
// `label` is the title-menu text, `name` the Booth prose. Index 0 = FULL RUN.
export const SECTIONS = [
  { t: 0, label: 'FULL RUN', name: 'intro' },
  { t: 120, label: 'S1 POPCORN', name: 'S1 popcorn intro' },
  { t: 720, label: 'S2 TURRET ALLEY', name: 'S2 turret alley' },
  { t: 1700, label: 'S3 MID GAUNTLET', name: 'S3 mid gauntlet' },
  { t: 2400, label: 'S4 MIDBOSS', name: 'S4 midboss' },
  { t: 2460, label: 'S5 RUSH', name: 'S5 rush' },
  { t: 2900, label: 'S6 ELITE PAIR', name: 'S6 elite pair' },
  { t: 3700, label: 'S7 RELEASE', name: 'S7 release' },
  { t: 3900, label: 'S8 BOSS', name: 'S8 boss' },
];
export const SEC_T = SECTIONS.map((s) => s.t);

// Boss hook — game.js dispatches the type-5 entity through the stage's boss
// module (update per frame; advance on a phase kill). Stage 1's boss IS the
// shared r6 ritual code in stage.js; later bosses are modules sharing it,
// never copies (plan §6). `phases` is the form count the clear flow expects.
export const boss = { update: updateBoss, advance: advanceBossPhase, phases: 3 };


// --- timeline ------------------------------------------------------------
// Sections (chunk themes, ≤2 reps each, escalating): popcorn intro → turret
// alley → mid gauntlet → MIDBOSS (gate) → rush → elite pair → release → BOSS.
export function buildTimeline() {
  const tl = [];
  const at = (t, fn) => tl.push({ t, fn });
  const zakoGroup = (t, side, n, opts = {}) => {
    for (let i = 0; i < n; i++) at(t + i * 11, (g) => {
      const x = side < 0 ? 40 + i * 5 : W - 40 - i * 5;
      // sweep INWARD from the spawn edge (playtest screenshot: they were
      // drifting off the left edge — WS05 forbids edge traps)
      const e = spawnEnemy(g, 0, x, -13, {
        vx: -side * (0.47 + (opts.spd || 0)), vy: 1.6 + (opts.spd || 0), side,
        holdT: i % 3 === 1 ? 1 : 0, // every 3rd is a shooter (see updateEnemy)
      });
      if (opts.diver && e) e.phase = 1;
    });
  };

  // r19 overlap pass — top-band traffic helpers (see updateEnemy phase 2/3).
  // crossers: n popcorn entering from `side` at the top band's height, 14f
  // apart, stacked 7px so they read as a file. risers: n popcorn from the
  // bottom on alternating rails, 18f apart. Spawn x=16 (not off-screen) so the
  // s5_edges detector never reads an entry as an edge trap.
  const crossers = (t, side, n, y = 38) => {
    for (let i = 0; i < n; i++) at(t + i * 14, (g) => {
      const e = spawnEnemy(g, 0, side < 0 ? 16 : W - 16, y + (i % 3) * 7, { vx: -side * 1.7, vy: 0.3, side, holdT: i % 3 === 1 ? 1 : 0 });
      if (e) e.phase = 2;
    });
  };
  const risers = (t, n) => {
    for (let i = 0; i < n; i++) at(t + i * 18, (g) => {
      const e = spawnEnemy(g, 0, i % 2 ? W - 40 : 40, H + 13, { vx: 0, vy: -1.0, side: i % 2 ? 1 : -1, holdT: i % 3 === 1 ? 1 : 0 });
      if (e) e.phase = 3;
    });
  };

  // S1 popcorn intro — teach speed-kill (rep1, rep2 slightly faster: ≤2 reps)
  zakoGroup(120, -1, 6); zakoGroup(240, 1, 6);
  zakoGroup(420, -1, 7, { spd: 0.27 }); zakoGroup(420, 1, 7, { spd: 0.27 });

  // r21 seam bridge (Booth session 1, flag 1: a 2.5-3s empty screen between the
  // intro's last kill and the turrets becoming vulnerable — "the bummer part is
  // this lull where I am waiting for the next wave", Bored). Bridge with
  // popcorn, do NOT move the turrets: their arrival "really starts jamming"
  // with the music and that beat is protected. DDP's grammar — popcorn is
  // mortar between bricks; their own chain's one gap was "the scarcity of
  // enemies at the mid boss point" (docs/research/canon-three-holes.md).
  zakoGroup(560, 1, 5); zakoGroup(645, -1, 4);

  // S2 turret alley — alternating columns, popcorn layered (WS05 top-lane flow)
  for (let r = 0; r < 2; r++) {
    const base = 720 + r * 420;
    at(base, (g) => { spawnEnemy(g, 2, 60, -16); spawnEnemy(g, 2, 133, -40); });
    at(base + 120, (g) => { spawnEnemy(g, 2, W - 60, -16); spawnEnemy(g, 2, W - 133, -40); });
    zakoGroup(base + 180, r === 0 ? 1 : -1, 6, r === 1 ? { diver: true } : {});
    crossers(base + 60, r === 0 ? 1 : -1, 5, 88); // r21 (Booth flag: "the top sides doesn't feel right"): mid-side entry at Garegga side-tank height — they cross the lane you fight the turrets from. Mid-gauntlet crossers keep y 44 for the Booth to compare.
  }

  // S3 mid gauntlet — sequenced sides suggest the route (never simultaneous)
  // mids hold DEEP (y 120-153): threatening, and inside the pipeline's strong
  // band so committed players can actually delete them (S1 economy, r3)
  const midAt = (t, x, side, hold) => at(t, (g) => spawnEnemy(g, 1, x, -12, { side, holdT: hold }));
  midAt(1700, 80, -1, 127); midAt(1810, W - 80, 1, 140);
  midAt(1950, W / 2 - 40, -1, 120); midAt(2060, W / 2 + 40, 1, 153);
  zakoGroup(1880, -1, 5); zakoGroup(2100, 1, 5);
  crossers(1760, 1, 5, 44); crossers(2000, -1, 5, 44); // r19: the mids' descent lane has traffic

  // S4 midboss — gate; killing it fast means the rush starts immediately (T2)
  at(2400, (g) => { g.gate = 'midboss'; spawnEnemy(g, 4, W / 2, -20); });

  // S5 rush — heavy overlap tension peak (WS05): divers + turrets + popcorn
  zakoGroup(2460, -1, 8, { spd: 0.33 }); zakoGroup(2520, 1, 8, { spd: 0.33 });
  risers(2470, 4); // r19: "ships from the bottom later" — the rush is where escalation from behind begins
  at(2580, (g) => { spawnEnemy(g, 2, 93, -16); spawnEnemy(g, 2, W - 93, -16); });
  zakoGroup(2640, -1, 8, { diver: true, spd: 0.2 }); zakoGroup(2700, 1, 8, { diver: true, spd: 0.2 });
  risers(2660, 4);

  // S6 elite pair — rep1 solo, rep2 + turrets (twist), never simultaneous elites
  at(2900, (g) => { // r26 variant B: side arrival — spawns at the flank at
    // combat height and glides centre-ward on its own tanh patrol clamp
    if (g.tune.eliteEntry === 'side') spawnEnemy(g, 3, -22, 150, { side: -1 });
    else spawnEnemy(g, 3, W / 2 - 53, -16, { side: -1 });
  });
  at(3260, (g) => {
    // r25 fix (Booth flag: "slight lull" mid-S6): the elite case escalates per
    // rep (ring at rep 1, hose at rep 2 — S4, wiki §3) but NOTHING ever set an
    // elite's phase, so rep was always 0 and elite #2 was a copy of #1 with a
    // 1.8s silent stretch per 210f cycle. Elite #2 is now genuinely rep 1.
    const e3 = spawnEnemy(g, 3, W / 2 + 53, -16, { side: 1 }); if (e3) e3.phase = 1;
    spawnEnemy(g, 2, 53, -16); spawnEnemy(g, 2, W - 53, -16);
  });
  risers(3290, 4); // r19: rep-2 twist — the elite's grind lane is attacked from behind

  // S7 release — cancel wall + item shower + ~3s breather (WS05 tension-release)
  // Items here are routing signage, not a payday [BOGHOG T2] — low value, free wall pays little.
  at(3700, (g) => {
    bulletCancelWall(g, W / 2, H / 2, 30);
    for (let i = 0; i < 14; i++) spawnItem(g, 40 + i * 17, -10 - (i % 3) * 16, 150);
  });

  // S8a WARNING ritual (r6 S3b, homage L3): scoreless sweep of any stragglers +
  // full scoreless bullet cancel, then >=1s of WARNING over a guaranteed-empty
  // field before the gate. warn suppresses the caravan pull (game.js), so the
  // 70 stageT ticks to the gate are 70 real frames.
  at(3830, (g) => {
    for (let i = g.enemies.count - 1; i >= 0; i--) g.enemies.killAt(i);
    for (let i = g.eBullets.count - 1; i >= 0; i--) g.eBullets.killAt(i);
    g.warn = 70; g.gate = 'warning'; // gate: the ritual is a beat, not dead air
    sfx(g, SFX.WARNING);
    g.cancelFlash = Math.max(g.cancelFlash, 12); // soft blink sells the sweep
  });

  // S8 boss — gate until the run resolves; P1's wing pods deploy at entrance
  // end (updateBoss). Entrance armor spans the whole 90f descent — set in
  // spawnEnemy (r6.3) so every spawn path gets the untouchable entrance.
  at(3900, (g) => { g.gate = 'boss'; spawnEnemy(g, 5, W / 2, -27); });

  tl.sort((a, b) => a.t - b.t);
  return tl;
}

export default { id, name, SECTIONS, SEC_T, boss, buildTimeline };
