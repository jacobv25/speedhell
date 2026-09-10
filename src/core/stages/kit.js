// Timeline kit for stage modules (r80). The helpers stage 1 wrote inline in
// stages/s1.js buildTimeline() — at / zakoGroup / crossers / risers — lifted
// here with the SAME arithmetic so a later stage speaks the same grammar, plus
// the stage-2 additions (tank files, bone walls, one-side risers). s1.js keeps
// its own inline copy on purpose: the plan's rule is that stage 1 stays
// byte-identical to its certificate (§4 rule 14), so the file is not edited
// to import this — a Jacob-authorized consolidation can do that at a recert.
// Every helper is deterministic (no rng) — spawn geometry only.
import { spawnEnemy, W, H } from '../game.js';

export function makeKit() {
  const tl = [];
  const at = (t, fn) => tl.push({ t, fn });
  // popcorn group: n zako from `side` sweeping INWARD, every 11f; every 3rd a shooter
  const zakoGroup = (t, side, n, opts = {}) => {
    for (let i = 0; i < n; i++) at(t + i * 11, (g) => {
      const x = side < 0 ? 40 + i * 5 : W - 40 - i * 5;
      const e = spawnEnemy(g, 0, x, -13, {
        vx: -side * (0.47 + (opts.spd || 0)), vy: 1.6 + (opts.spd || 0), side,
        holdT: i % 3 === 1 ? 1 : 0,
      });
      if (opts.diver && e) e.phase = 1;
    });
  };
  // crossers: n popcorn entering from `side` at the top band's height, 14f apart
  const crossers = (t, side, n, y = 38) => {
    for (let i = 0; i < n; i++) at(t + i * 14, (g) => {
      const e = spawnEnemy(g, 0, side < 0 ? 16 : W - 16, y + (i % 3) * 7, { vx: -side * 1.7, vy: 0.3, side, holdT: i % 3 === 1 ? 1 : 0 });
      if (e) e.phase = 2;
    });
  };
  // risers (stage 1's): n popcorn from the bottom on ALTERNATING rails, 18f apart
  const risers = (t, n) => {
    for (let i = 0; i < n; i++) at(t + i * 18, (g) => {
      const e = spawnEnemy(g, 0, i % 2 ? W - 40 : 40, H + 13, { vx: 0, vy: -1.0, side: i % 2 ? 1 : -1, holdT: i % 3 === 1 ? 1 : 0 });
      if (e) e.phase = 3;
    });
  };
  // r80 one-side risers (Jacob, wiki Q21 addendum: "coming in at the same time at
  // the far sides of the screen doesn't feel good"): all n climb ONE lane edge
  // (x 60 / W−60, not the screen edge), 18f apart; the other side comes later.
  const risersOneSide = (t, n, side) => {
    for (let i = 0; i < n; i++) at(t + i * 18, (g) => {
      const e = spawnEnemy(g, 0, side < 0 ? 60 : W - 60, H + 13, { vx: 0, vy: -1.0, side, holdT: i % 3 === 1 ? 1 : 0 });
      if (e) e.phase = 3;
    });
  };
  // r80 tank file: n rail tanks (type 7) in a STAIRCASE from `side` — each 45px
  // further across and 40f later (WS05: never a vertical tank stack; a diagonal
  // line reads as a route). opts.spd adds scroll speed; opts.half = half-tracks
  // that creep toward your column (behaviour escalation, T2).
  // r81 `swarm` (Lab `s2tanks` → g.tune.s2tanks, wiki §13.9 / Q27 — Jacob: "many
  // more tanks, approaching from the sides with lower HP"): the SAME n events
  // (no extra timeline entries — the caravan pull reads the next event's t, so
  // the current shape stays byte-identical) each spawn a PAIR from one flank at
  // mid-height (y 96/120/144), sides alternating per event (WS05 Toaplan: spawn
  // on opposite sides, never both at once — Q21). They roll inward along a rail
  // (vx 1.8) to `bobX` — the leader crosses farthest, its trailer stops 64 px
  // short, so the file lands as a diagonal again — then scroll with the stage
  // (stage.js case 7, phase 1 → 0). The swarm tank is ONE tier carried on the
  // entity: hp 12 (LOWER by design — popcorn 2 · swarm tank 12 · turret 24 —
  // never inflation; value / window untouched), flank entry, and holdT 1 = a
  // polite prong every 55 f instead of 75 (case 7); angry at 4 s as every tank.
  // opts.flank marks the files the knob reshapes; without it a file keeps r80's shape under either knob.
  const tankFile = (t, side, n, opts = {}) => {
    for (let i = 0; i < n; i++) at(t + i * 40, (g) => {
      if (g.tune.s2tanks && opts.flank) { // only the files that ask for it (s2.js: S1 + S5) — S2's tanks behind the wall stay r80: a wall AND a flank file is two strong things at once (WS05)
        const s = i % 2 ? -side : side, y = 96 + (i % 3) * 24, far = s < 0 ? W - 56 - i * 22 : 56 + i * 22;
        for (let k = 0; k < 2; k++) {
          const e = spawnEnemy(g, 7, s < 0 ? -14 - k * 34 : W + 14 + k * 34, y, { vx: -s * 1.8, vy: 0.55 + (opts.spd || 0), side: opts.half ? 2 : 0 });
          if (!e) continue;
          e.phase = 1; e.bobX = far + s * k * 64; e.hp = e.prevHp = 12; e.holdT = 1; // holdT 1 = the swarm tier (stage.js case 7: fires every 55 f)
        }
        return;
      }
      const x = side < 0 ? 60 + i * 45 : W - 60 - i * 45;
      spawnEnemy(g, 7, x, -16, { vy: 0.55 + (opts.spd || 0), side: opts.half ? 2 : 0 });
    });
  };
  // r80 bone wall: a row of type-8 segments across 10 slots (x 25 + 30·i) with
  // `lane` = the slot indexes left OPEN (a 90px gap, never at the screen edge —
  // WS05 "nothing too near the edges"). All spawn on the same frame: a wall.
  const boneWall = (t, lane) => at(t, (g) => {
    for (let i = 0; i < 10; i++) if (lane.indexOf(i) < 0) spawnEnemy(g, 8, 25 + 30 * i, -16);
  });
  return { tl, at, zakoGroup, crossers, risers, risersOneSide, tankFile, boneWall };
}
