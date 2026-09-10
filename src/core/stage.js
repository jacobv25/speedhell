// Shared enemy behaviors + boss machinery (every stage). Stage 1's spawn timeline: stages/s1.js (r78).
// Design rules in play: chunks escalate, no encounter repeats >2 [BOGHOG_CRAFT],
// top-lane flow / no simultaneous elites [WS05], bottom no-shoot band [WS04],
// no breather after midboss (gate resumes immediately) [BOGHOG_CRAFT/T2].
import { sfx, SFX, spawnEnemy, spawnItem, bulletCancelWall, spawnFx, FX, FAM, addPopup, W, H } from './game.js';
import { aimedFan, ring, arcWall, spray, bendyStream, twinSpiral, lanceVolley, ledFan } from './patterns.js';

// HP retuned r3 (playtest 2: "easier, not better"). The r2 halving made range
// play melt everything, so the 2x point-blank pipeline gap was imperceptible.
// Now HP is sized against the MEASURED pipeline: 57.6 dps at range, 120 close
// (r4 field shrink: probes are screen-relative, 27px/200px on the 320 field).
// Range play is a grind (elite ~2.3s), point-blank is the snappy kill (~1.1s)
// — the gap is the felt content, not a stat multiplier (S1 s1_ttk_felt).
// Zako stays 1-volley popcorn; big targets sized vs POINT-BLANK pursuit DPS
// so expert kills stay well inside timeouts (S7).
// Windows are sized from vulnAt (which starts during entry): descent to the
// deep holds eats ~90-110f, so mid/elite windows carry that plus the honest
// kill time — generous on popcorn, tight on elites relative to their ~19s
// on-screen life (S6).
//                 hp  value window r
export const ENEMY_DEFS = [
  /*0 zako   */ { hp: 2,   value: 200,   window: 75,  r: 10 },
  /*1 mid    */ { hp: 44,  value: 800,   window: 210, r: 14 },
  /*2 turret */ { hp: 24,  value: 500,   window: 150, r: 12 },
  /*3 elite  */ { hp: 220, value: 3000,  window: 380, r: 20 }, // r27: Jacob's variant verdict — HP 220 + side entry + escort ship as defaults
  /*4 midboss*/ { hp: 400, value: 8000,  window: 700, r: 26 }, // r25 EXPERIMENT (Jacob's explicit hp override): 3x — phase B must get to exist; boghog T1: boss HP is a pattern-duration knob,
  /*5 boss   */ { hp: 390, value: 12000, window: 600, r: 30 }, // r71: 3× (was 130) — Jacob's Lab verdict, open Q16; hp = P1 hp (spawn); value
  // r6: per-phase payout raised 9000→12000 — earned only by KILLING phases (late-kill
  // decay in scoreBossPhase melts it to ~0 at the timeout), so it widens the honest-vs-
  // passive score gap without touching the fight (S6 alignment)
  // r6 S3b: boss sub-part — rides the boss, hosts one of the phase's emitters,
  // and is a real speed-kill target (generous window; DDP "structure changes as
  // you win"). Small r so the under-boss point-blank spot never becomes a
  // contact trap. Dies with its phase (see updateEnemy case 6).
  /*6 part   */ { hp: 24,  value: 1000,  window: 300, r: 7 },
  // r80 STAGE 2 — the GROUND LAYER (plan §3 stage 2; research/raw-ground-layer-
  // findings.md). Zero new hp tiers: tank + wall = turret class, hull = elite
  // class, anchor = part class. Ground types are SEALED by proximity like every
  // non-boss enemy (r18 canon) and — like Toaplan/Psikyo tanks the plane flies
  // over — the tank and the hull have NO contact collision (game.js GROUND):
  // the deck is a place you stand on, not a thing that rams you. The bone wall
  // is the exception: it is a physical barrier (T3 "checkmate from physical
  // properties"), so it DOES collide.
  /*7 tank   */ { hp: 24,  value: 500,   window: 150, r: 12 }, // rail tank: scrolls with the stage, aimed pink prongs, angry at 4s (turret grammar on tracks)
  /*8 wall   */ { hp: 24,  value: 500,   window: 150, r: 14 }, // bone-wall segment: blocks its slot (contact), one hidden prong at y≈140, pays 3 loot on death
  /*9 hull   */ { hp: 220, value: 3000,  window: 380, r: 20 }, // ossuary barge core: armored until every deck turret is dead (DDP#4 chain-link), then a cyan gun opens
  /*10 anchor*/ { hp: 24,  value: 1000,  window: 300, r: 10 }, // the Hearse's chained anchor: a swinging physical hazard + the midboss's speed-kill sub-part (stages/s2.js)
];
// r80: the types the ship flies OVER (no contact collision — game.js reads it).
export const GROUND = { 7: 1, 9: 1 };

// Per-boss-phase sub-part geometry: [dx, dy] off the boss center. Offsets sit
// OUTSIDE the boss's r=30 collision circle horizontally, so parts are hittable
// from below (shots in the part's column reach it, not the hull).
const PART_GEO = [[36, 4], [38, 0], [38, -4]];
export function spawnParts(g, boss) {
  // P1: twin wing pods (the winged form). P2: one armor node (shed-armor form,
  // asymmetric on purpose). P3: twin bare-core relay nodes.
  const sides = boss.phase === 1 ? [1] : [-1, 1];
  for (const s of sides) {
    const p = spawnEnemy(g, 6, boss.x + PART_GEO[boss.phase][0] * s, boss.y + PART_GEO[boss.phase][1], { side: s });
    if (p) {
      p.phase = boss.phase; p.armorUntil = boss.armorUntil; // parts share the form's armor beat
      // r6.5: P2's armor node is the phase's ONLY led/aimed emitter (the boss
      // itself speaks pure spirals) — it carries more hp so slow-target
      // coverage survives deep into the phase; still a snappy point-blank kill
      if (boss.phase === 1) p.hp = 56;
    }
  }
}

export const MIDBOSS_TIMEOUT = 2100;          // r65: 35s (was 1400/23s) — Jacob's call after watching the certified fight; a timeout stays (S6: the post-bloom crosser pulse is an infinite point source)
export const BOSS_PHASE_HP = [110, 402, 405]; // r71: 3× (was 134/135) — "3x felt challenging… design for difficulty and challenge" (Jacob, 2026-09-08); // HP is a pattern-duration knob [BOGHOG T1]; index 0 unused
// (spawn hp is ENEMY_DEFS[5].hp). P2/P3 trimmed r6.3: the camp governor's bands hold campers to
// near-zero income (referee probes: 0 kills, pure timeouts), so HP now only needs to fit the honest
// expert's tail under the timeout across every robust seed, with kills under the 1200f decay knee.
export const BOSS_PHASE_TIMEOUT = 2100; // r72: 35s per phase (was 1450/24s) — at 3× hp a shooting player's P1 brushed 24s; the escalation clock (§5.2b) is the stalling tax now

// r18 fire gating — the canon's three gates, replacing the "enemy must be 40px
// ABOVE the player" rule that muted all 17 fire sites (boss included) for a
// player parked at the top (playtest: Jacob's friend; probe: 0 bullets in the
// whole alley, scoreless boss clear by timeout). No classic game gates fire by
// the player being above or beside an enemy; what they document is:
//   1. off-screen / top-edge enemies never fire (Raiden; Molinari; WS04 top dead zone)
//   2. a BOTTOM SCREEN BAND where enemies past the player's band go quiet — "the
//      player typically can't shoot backwards" (boghog WS04). A screen band, not
//      a halo around the player: a halo is exactly what made the top safe.
//   3. SEALING — no shot inside a close radius. Canon seals ground enemies (Yuge:
//      "we didn't want people to think the game was unfair"); we apply the floor
//      to every non-boss enemy because the rubric's S7 reaction floor (120ms)
//      demands it: 48px at needle speed 3.3 ≈ 15f ≈ 240ms. Point-blank on a
//      turret is quiet (its reward, Toaplan/CAVE) — but nothing ELSE is.
//   The boss is never sealed (Ikeda hunts safe spots; Psikyo bosses are ridden
//   at point-blank and still fire); its position pressure is the camp governor.
const SEAL_R2 = 48 * 48; // H is read at call time — game.js imports this module first (circular)
export function sealed(g, e) {
  const dx = e.x - g.player.x, dy = e.y - g.player.y;
  return dx * dx + dy * dy < SEAL_R2;
}
// r22: a timed-out boss/midboss FLEES — it must not look like a kill. Popup +
// a fixed fan of departure streaks via spawnFx. Deterministic: draws no rng.
export function fleeTelegraph(g, e) {
  addPopup(g, e.x, e.y, 'FLED +0', 1);
  for (let k = -2; k <= 2; k++) spawnFx(g, FX.SMOKE, e.x + k * 9, e.y + 4, k * 0.5, -2.6, 34, 4, FAM.WHITE);
  for (let k = -1; k <= 1; k++) spawnFx(g, FX.SPARK, e.x + k * 6, e.y, k * 0.9, -3.4, 22, 2, FAM.CYAN);
}

export function mayFire(g, e) {
  if (e.vulnAt < 0 || e.y <= 20) return false;
  if (e.type === 5 || e.type === 4) return true; // r19: the midboss is a boss — never sealed (r18 let a hugger mute its whole fight, bloom included)
  if (e.y > H - 60) return false;
  return !sealed(g, e);
}

export function updateEnemy(g, e) {
  g.emitter = e; // r59: patterns.js reads the firing enemy's type for the needle tier
  switch (e.type) {
    case 0: { // zako — popcorn; 'phase' 1 = diver variant (escalation twist)
      if (e.phase === 1 && e.age > 40 && e.age < 70) {
        // homes briefly, then commits — but only at targets INSIDE the
        // playfield, with capped vx, so wall-hugging players can't drag
        // divers off-screen (s5_edges, playtest 2 screenshot)
        const tx = Math.max(37, Math.min(W - 37, g.player.x));
        e.vx += (tx - e.x) * 0.002;
        e.vx = Math.max(-1.35, Math.min(1.35, e.vx));
      }
      // diver commit-shot: a short aimed prong as it locks in — pressure that
      // only exists on-route, where the aggressive player is (s7_pressure)
      if (e.phase === 1 && e.age === 74 && mayFire(g, e)) aimedFan(g, e.x, e.y + 6, 4, 0.5, 2.9);
      // shooter zako (holdT flag, every 3rd in a group): one aimed prong on the
      // way down — popcorn that bites keeps the waves alive without touching
      // any grind fight (s7_pressure, playtest 2 "feels easier, not better")
      if (e.phase === 0 && e.holdT === 1 && e.age === 55 && mayFire(g, e)) aimedFan(g, e.x, e.y + 6, 3, 0.45, 2.7);
      // r19 overlap pass — top-band traffic. phase 2 = side CROSSER: enters at
      // the top band's height from a side, crosses the lanes where a top-parker
      // or a point-blanker stands, dives at the far edge (boghog WS05 Top Line
      // — "spawning enemies on opposite sides of the screen"; Garegga st.5/6
      // side entries; S3 of the canon report). phase 3 = RISER: enters from the
      // bottom on a rail, climbs past the player's band from behind, hangs at
      // the apex (the kill window), then falls back as ordinary popcorn
      // (Garegga st.4 "ambush from below"; Gunvein's ships from the bottom).
      // Slow first 40f: a corner-hugger at the rail still has ~16f before
      // contact (S7 floor). Both deterministic — no rng, referee stream-safe.
      if (e.phase === 2) {
        if ((e.vx > 0 && e.x > W - 34) || (e.vx < 0 && e.x < 34)) { e.vx *= 0.5; e.vy = 2.1; }
        if (e.holdT === 1 && e.age === 45 && mayFire(g, e)) aimedFan(g, e.x, e.y + 6, 3, 0.45, 2.7);
      } else if (e.phase === 3) {
        if (e.age < 40) e.vy = -1.0;
        else if (e.y > 95 && e.age < 200) e.vy = -2.4;
        else if (e.age < 200) e.vy = 0;
        else e.vy = 1.6;
        if (e.holdT === 1 && e.age === 130 && mayFire(g, e)) aimedFan(g, e.x, e.y + 6, 3, 0.45, 2.7);
      }
      e.x += e.vx + Math.sin(e.age * 0.06) * e.side * 0.6;
      // soft wall: steer back inside rather than clipping the edge (s5_edges).
      // The vx guard must exceed the ±0.6 sine wobble, or the wobble out-drifts
      // the push and the zako surfs the edge anyway.
      if (e.x < 20 && e.vx < 0.75) e.vx += 0.25;
      else if (e.x > W - 20 && e.vx > -0.75) e.vx -= 0.25;
      e.y += e.vy;
      break;
    }
    case 1: { // mid — enter, hold, aimed bursts; left alive it digs in and hoses (S4 dynamic)
      if (e.phase === 1) { // committed exit: up and out, never re-descends (was a
        // ping-pong with the hold line that dragged mids along the edge — s5_edges)
        e.vy -= 0.053; e.y += e.vy; e.x += e.side * 0.4;
        break;
      }
      // r12 (mock, playtest pending): the mid's own voice. r10's entry fan was
      // the turret's sentence at higher volume (turret aimedFan 3/0.4/2.3 vs mid
      // 4/0.5/3.1 — same demand, learned 30s earlier). New sentence: SPRAY on
      // entry (pink terrain that lingers), then once parked a 160f cycle of
      // DOUBLE-TAP (two 2-needle prongs 12f apart, each aimed at fire time — the
      // second tracks your dodge: turret says "step aside", mid says "keep
      // moving") alternating with another spray. Needles stay needles, rounds
      // stay rounds (L6 castes); lances/led/spirals stay boss, bendy stays
      // midboss, laned wall stays elite. r10's race survives: kill before
      // age 65 and the terrain never exists. Sprays draw rng (stream shifts).
      // r13 ramp (playtest: r12 still speed-killable before anything dangerous):
      // sprays start at age 45 and repeat mid-descent, 10 pinks each; the parked
      // cycle tightened 160f -> 100f with the double-tap landing almost on park.
      if ((e.age === 45 || e.age === 85) && mayFire(g, e)) spray(g, e.x, e.y + 8, 10, 1.0, 1.6, 2.7);
      if (e.y < e.holdT) e.y += 1.5; else {
        e.fireT++;
        if (e.fireT % 100 === 10 && mayFire(g, e)) aimedFan(g, e.x, e.y + 8, 2, 0.12, 3.4); // tap 1
        if (e.fireT % 100 === 22 && mayFire(g, e)) aimedFan(g, e.x, e.y + 8, 2, 0.12, 3.4); // tap 2 (re-aimed)
        if (e.fireT % 100 === 60 && mayFire(g, e)) spray(g, e.x, e.y + 8, 10, 1.0, 1.6, 2.7);
        // leave-alive escalation: past the polite phase it parks and hoses hard —
        // this is the S4 dynamic-lifecycle contrast: a speed-killed mid shows only
        // the polite fans; an ignored one owns the screen
        if (e.fireT > 300 && e.fireT % 45 === 15 && mayFire(g, e)) spray(g, e.x, e.y + 8, 10, 1.2, 1.7, 2.9);
        if (e.fireT > 300 && e.fireT % 90 === 60 && mayFire(g, e)) aimedFan(g, e.x, e.y + 8, 7, 0.8, 3.3);
        // exits before the midboss arrives — a lingering mid may not drag its
        // hose into the gate fight (that stacking was pure noise, not a choice)
        if (e.fireT > 560) e.phase = 1;
      }
      break;
    }
    case 2: { // turret — scrolls; kill fast or be blanketed [T2]
      e.fireT++;
      // r80: a DECK turret (holdT 2, stage 2's hull) rides its hull instead of
      // scrolling: position slaved to the live type-9 core at its (vx, vy)
      // offset; if the hull is gone (killed or scrolled off) the turret goes
      // with it. Stage 1 never sets holdT on a turret — this branch is dead there.
      if (e.holdT === 2) {
        let hull = null;
        for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === 9 && !o.dead) { hull = o; break; } }
        if (!hull) { e.dead = 1; break; }
        e.x = hull.x + e.vx; e.y = hull.y + e.vy;
        const angryM = e.vulnAt >= 0 && g.frame - e.vulnAt > 240;
        if (e.vulnAt >= 0 && e.phase === 0) { e.phase = 1; if (!sealed(g, e)) aimedFan(g, e.x, e.y + 6, 3, 0.4, 2.3); }
        const everyM = angryM ? 34 : 85;
        if (e.fireT % everyM === 30 && mayFire(g, e)) aimedFan(g, e.x, e.y + 6, angryM ? 7 : 3, angryM ? 1.0 : 0.4, angryM ? 3.1 : 2.3);
        break;
      }
      // anger at 4s on-screen (decoupled from the SCORING window — that knob is
      // for speed-kill feel, this one is behavior): a router who works the
      // turret queue never sees it; ignoring it hands the turret the screen (S4)
      const angry = e.vulnAt >= 0 && g.frame - e.vulnAt > 240;
      e.y += angry ? 0.4 : 0.47; // anger = more fire, not more dwell — a lingering
      // angry turret must still clear the screen on schedule (S4 outro)
      // r17 arrival shot: the turret arrives ARMED — its polite fan fires the
      // frame it becomes vulnerable (y≈17), bypassing mayFire's 40px-below mute.
      // Playtest + probe: a top camper (y 40-60, on-column) saw ZERO bullets in
      // the whole alley — the mute silenced everything it hovered over, turrets
      // scrolling past below could never fire, and each turret died 7-9f after
      // vulnerability (~47f before the first fan the mute allowed). Now the fast
      // kill costs a sidestep (17-50px away, 7-20f at 2.3) — a race, same grammar
      // as the r10 mid / r11 elite entries. Same sentence (3/0.4/2.3), just said
      // on arrival; kill-fast-or-be-blanketed [T2] unchanged. No rng. e.phase
      // latches it (unused on type 2).
      // r18: the arrival shot keeps its top-edge bypass but honours the seal —
      // a point-blank arrival kill is quiet by canon; the top is no longer silent.
      if (e.vulnAt >= 0 && e.phase === 0) { e.phase = 1; if (!sealed(g, e)) aimedFan(g, e.x, e.y + 6, 3, 0.4, 2.3); }
      const every = angry ? 34 : 85;
      if (e.fireT % every === 30 && mayFire(g, e))
        aimedFan(g, e.x, e.y + 6, angry ? 7 : 3, angry ? 1.0 : 0.4, angry ? 3.1 : 2.3);
      break;
    }
    case 3: { // elite — area denial cycles, escalating per rep (WS03); overstays if ignored
      if (e.holdT === 1) { // committed exit (same ping-pong fix as the mid: the
        // y<130 entry branch used to re-descend it forever — s4 outro, s5_edges)
        e.vy -= 0.04; e.y += e.vy;
        break;
      }
      // parks DEEP (y 150): a space-controller you must coexist with, not top-lane
      // scenery — and deep targets are where the capped pipeline actually delivers,
      // so the grind-it-down option is real (S1 economy; boghog: one enemy that
      // controls space + popcorn flying in)
      // r11 entry signature: the elite's laned arc wall fires ON THE WAY DOWN
      // (age 70, y≈68) so the pattern is FELT inside the speed-kill window —
      // before, a fast kill (the rewarded play) skipped every pattern it had
      // (2.3s mute descent + ~1.1s point-blank kill). Fixed center lane, no rng.
      if (e.age === 70 && mayFire(g, e)) arcWall(g, e.x, e.y + 10, 11, 1.5, 1.7, 5, 1);
      if (e.y < 150) { e.y += 1.2; break; }
      // patrols the full width (house tanh sweep, Psikyo strafe): its column
      // crosses yours whether you chase or not — every crossing is a grind
      // window, and a committed tracker keeps it on-column between crossings
      {
        const sx = W / 2 + Math.tanh(3.5 * Math.sin(e.age * 0.0055 + e.side * 1.3)) / Math.tanh(3.5) * 87;
        e.x += Math.max(-1.5, Math.min(1.5, sx - e.x));
      }
      e.fireT++;
      // r26 variant D (Booth): escort popcorn during elite #1 — the midboss
      // escort formula; the speed kill stays possible but happens in traffic.
      if (g.tune.eliteEscort && e.phase === 0 && e.vulnAt >= 0 && e.fireT % 150 === 60) {
        const k = ((e.fireT / 150) | 0) % 2;
        const a = spawnEnemy(g, 0, k ? W - 16 : 16, 36, { vx: k ? -1.7 : 1.7, vy: 0.3, side: k ? 1 : -1, holdT: 1 });
        const b = spawnEnemy(g, 0, k ? 16 : W - 16, 52, { vx: k ? 1.7 : -1.7, vy: 0.3, side: k ? -1 : 1, holdT: 0 });
        if (a) a.phase = 2; if (b) b.phase = 2;
      }
      // rep 0 is grindable — a router who commits can finish it inside 2 cycles
      // (that's the ~2.4s range grind / ~1.2s point-blank kill, S1). Ring joins
      // at rep 1, hose at rep 2, then super-linear: only players who LEAVE it
      // alive ever meet rep 3+ (S4 dynamic lifecycle).
      const rep = e.phase, k = Math.min(1 + rep * 0.12 + Math.max(0, rep - 2) * 0.15, 2.1);
      const cyc = e.fireT % 210;
      if (mayFire(g, e)) {
        // gap biased near CENTER — the lane under the elite is viable, so
        // committing to the grind is a real option (the aimed fan still runs
        // you off it: risk buys time-on-target, same grammar as boss P1)
        if (cyc === 30) arcWall(g, e.x, e.y + 10, rep >= 3 ? 13 : 11, 1.5, 1.7 * k, 5 + ((g.rng.next() * 3) | 0), 1);
        // rep 0 fan is narrow — a committed grinder can micro-dodge it and hold
        // the column; the wide version is the price of letting it cycle (S4)
        if (cyc === 100) aimedFan(g, e.x, e.y + 10, rep ? 7 : 5, rep ? 0.8 : 0.65, 3.2 * k);
        if (rep >= 1 && cyc === 170) ring(g, e.x, e.y, 14, 1.5 * k, g.rng.range(0, 0.4));
        if (rep >= 2 && cyc === 135) spray(g, e.x, e.y + 10, 7, 1.0, 1.9, 2.9); // leave-alive hose
        if (rep >= 3 && cyc === 65) arcWall(g, e.x, e.y + 10, 13, 1.5, 1.6 * k, 5 + ((g.rng.next() * 3) | 0), 1); // overstay tax
        if (cyc === 209) e.phase++;
      }
      if (e.age > 1150) e.holdT = 1; // exits eventually, but ignoring it is expensive
      break;
    }
    case 4: { // midboss
      if (e.y < 73) { e.y += 1.05; return; }
      // tanh edge-dwell sweep (house style, see boss): parks at the rails so a
      // tracker gets stable time-on-target; a center-camper gets brief crossings
      // r20 fix (Booth flag): the sweep runs off e.age, which is ~89 at park, so
      // the first parked frame used to SNAP the hull from centre to a rail — a
      // "teleport" Jacob had seen "since day 1". Glide from centre onto the
      // same sweep over the first 60 parked frames: after that the trajectory
      // is identical to before (referee-neutral past the glide), no rng.
      const sx = W / 2 + Math.tanh(3.5 * Math.sin(e.age * 0.008)) / Math.tanh(3.5) * 70;
      e.x = W / 2 + (sx - W / 2) * Math.min(1, e.fireT / 60);
      e.fireT++;
      const half = e.hp < (g.tune.midbossHp || ENEMY_DEFS[4].hp) * 0.45; // r26: 45% of the TUNED max
      if (mayFire(g, e)) {
        // r14 flip beat: phase B is hp-triggered but its patterns were
        // clock-triggered (%130) — at point-blank DPS the whole phase lasts
        // ~0.5s, so a committed player MATHEMATICALLY could not see act two
        // (measured: 1.4s floor kill). The form change now announces itself:
        // the frame hp crosses 45%, the B ring fires immediately (boghog T2
        // "phases bleed into each other"; T1 "HP is a pattern-duration knob";
        // MSX expert bias: better play gets more, not less). e.phase latches
        // it (unused on type 4). Deterministic — ring draws no rng.
        if (half && e.phase === 0) { e.phase = 1; ring(g, e.x, e.y, 20, 1.6, (e.fireT * 0.13) % 1); }
        // r9 arrival bloom: the fight OPENS at its densest — three slow, laned
        // arc walls (~4.5s to cross the field). A point-blank kill inside the
        // bloom detonates it (cancel = the release moment, BOGHOG_CRAFT L29);
        // a slower kill sees it long gone. Density comes from the player's
        // aggression, never from letting the midboss live (pillar 2). No rng:
        // fixed lane so the referee's stream order is untouched. Waits for the
        // screen to hold only the midboss: a straggler mid/elite killed a frame
        // later would cancel the bloom for free (measured: 44 → 0 on seed C0FFEE).
        if (!e.bloomed && g.enemies.count === 1) {
          e.bloomed = 1;
          arcWall(g, e.x, e.y + 10, 13, 2.6, 1.0, 6, 1);
          arcWall(g, e.x, e.y + 10, 13, 2.6, 1.25, 6, 1);
          arcWall(g, e.x, e.y + 10, 13, 2.6, 1.5, 6, 1);
        }
        if (!half) { // phase A: aimed pressure + bendy obstacles
          if (e.fireT % 70 === 20) aimedFan(g, e.x - 18, e.y + 12, 5, 0.5, 3.1);
          if (e.fireT % 70 === 50) aimedFan(g, e.x + 18, e.y + 12, 5, 0.5, 3.1);
          if (e.fireT % 130 === 90) { bendyStream(g, e.x, e.y + 10, Math.PI / 2 - 0.5, 7, 1.2, 2.8); bendyStream(g, e.x, e.y + 10, Math.PI / 2 + 0.5, 7, 1.2, 2.8); }
          // leave-alive ramp: a killer is long into phase B by now — only slow
          // play meets this hose (time-based, since campers never drop it to
          // phase B's hp trigger at all — S4 contrast, r3)
          if (e.fireT > 780 && e.fireT % 32 === 5) spray(g, e.x, e.y + 12, 11, 1.1, 1.9, 3.1);
        } else {     // phase B bleeds in: rings + bounded spray
          if (e.fireT % 130 === 10) ring(g, e.x, e.y, 20, 1.6, (e.fireT * 0.13) % 1);
          if (e.fireT % 75 === 40) spray(g, e.x, e.y + 12, 6, 0.9, 2.0, 3.1);
          // desperation layer — only campers who let it live this long ever see it
          if (e.fireT > 950 && e.fireT % 70 === 5) { bendyStream(g, e.x - 20, e.y + 8, Math.PI / 2 - 0.4, 7, 1.1, 2.8); bendyStream(g, e.x + 20, e.y + 8, Math.PI / 2 + 0.4, 7, 1.1, 2.8); }
        }
      }
      // r19 escort: the gate freezes the timeline, so the midboss was fought in a
      // vacuum (playtest: "way too easy to speedkill… doesn't even feel like a
      // challenging section"). Psikyo bosses spawn popcorn; boghog: "one enemy
      // that controls space + popcorn flying in". After the bloom (which needs
      // the clean screen), a crosser pair enters the top band every 150f —
      // the point-blank speed kill now happens in traffic. No rng.
      if (e.bloomed && e.fireT % 150 === 60) {
        const k = ((e.fireT / 150) | 0) % 2;
        const a = spawnEnemy(g, 0, k ? W - 16 : 16, 36, { vx: k ? -1.7 : 1.7, vy: 0.3, side: k ? 1 : -1, holdT: 1 });
        const b = spawnEnemy(g, 0, k ? 16 : W - 16, 52, { vx: k ? 1.7 : -1.7, vy: 0.3, side: k ? -1 : 1, holdT: 0 });
        if (a) a.phase = 2; if (b) b.phase = 2;
      }
      // timeout: flees, no score, gate opens — the stage does not wait (S6, T2)
      if (e.vulnAt >= 0 && g.frame - e.vulnAt > MIDBOSS_TIMEOUT) {
        e.dead = 1; g.stats.timeouts++; g.stats.timeoutLog.push('midboss'); g.gate = null;
        fleeTelegraph(g, e); // r22: a silent despawn read as a kill — announce the flee
      }
      break;
    }
    case 7: { // r80 RAIL TANK — the turret's sentence on tracks (WS04 "turrets and
      // tanks don't fly off"). Scrolls with the stage; the barrel aims at the ship
      // (renderer); one polite 2-round prong every 75f, angry at 4s (4-round,
      // every 40f, faster). Sealed by proximity like a turret, and the ship flies
      // OVER it (GROUND: no contact) — sitting on a tank is the canon reward;
      // the column's OTHER tanks are the pressure. side = lateral drift toward
      // the ship's column on the rail (0 = a fixed rail). No rng.
      e.fireT++;
      const angryT = e.vulnAt >= 0 && g.frame - e.vulnAt > 240;
      e.y += e.vy || 0.55;
      if (e.phase === 1) { // r81 swarm flank entry (kit.js tankFile): rolls inward along its rail to bobX, then it is a rail tank like any other
        e.x += e.vx;
        if ((e.vx > 0 && e.x >= e.bobX) || (e.vx < 0 && e.x <= e.bobX)) { e.x = e.bobX; e.vx = 0; e.phase = 0; }
      }
      if (e.side === 2) { const tx = Math.max(40, Math.min(W - 40, g.player.x)); e.x += Math.max(-0.35, Math.min(0.35, (tx - e.x) * 0.01)); } // half-track: creeps toward your column
      const everyT = angryT ? 40 : (e.holdT === 1 ? 55 : 75); // r81 swarm tier (holdT 1, kit.js): a brisker polite cadence (Q27); every other tank is r80's
      if (e.fireT % everyT === 40 && (e.phase === 0 || (e.x > 12 && e.x < W - 12)) && mayFire(g, e)) aimedFan(g, e.x, e.y + 6, angryT ? 4 : 2, angryT ? 0.7 : 0.25, angryT ? 2.9 : 2.5); // a flank tank still off the field's edge fires nothing (canon gate 1)
      break;
    }
    case 8: { // r80 BONE WALL segment — destructible terrain (WS05 theme; Garegga
      // houses / Star Soldier tiles by way of the research doc). Scrolls at 0.8;
      // its one hidden gun fires ONCE as it crosses y 140 (~3.3s after spawn):
      // a 3-round aimed prong — "kill fast or be blanketed" [T2] per segment,
      // sealed if you are on it. Below that it is a silent physical barrier:
      // the ship must be in a lane (or have breached one) before it arrives.
      // Loot on death is in game.js killEnemy (3 items, garnish-priced). No rng.
      e.fireT++;
      e.y += 0.8;
      if (e.phase === 0 && e.y >= 140) { e.phase = 1; if (mayFire(g, e)) aimedFan(g, e.x, e.y + 8, 3, 0.4, 2.3); }
      break;
    }
    case 9: { // r80 THE HULL — an ossuary barge (elite class) carrying a turret deck
      // (HOMAGE R7 / L1 structural: guns bolted ON the landmark). Enters, parks at
      // y 120 for ~13s, then scrolls off. Its core is ARMORED (armorUntil = ∞ at
      // spawn, timeline) until every deck turret (type 2, holdT 2) is dead —
      // killing the deck chain-links into the core kill (DDP#4): the armor drops,
      // the 380f elite window starts, and the core's hidden gun opens: cyan
      // 4-needle aimed fans every 75f (it IS the special tier). Sealed by
      // proximity; no contact (GROUND). fireT counts parked frames. No rng.
      if (e.y < 120) { e.y += 1.0; break; }
      e.fireT++;
      if (e.armorUntil > g.frame + 1e6) { // still sealed shut: any deck turret alive?
        let deck = 0;
        for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === 2 && o.holdT === 2 && !o.dead) deck++; }
        if (deck === 0) { e.armorUntil = g.frame; e.phase = 1; } // the deck is down → the core opens (vulnAt stamps next frame)
      }
      if (e.phase === 1 && e.fireT % 75 === 20 && mayFire(g, e)) aimedFan(g, e.x, e.y + 12, 4, 0.5, 3.0);
      if (e.fireT > 800) e.y += 0.9; // leaves with whatever is still bolted to it (outro, S4)
      break;
    }
    case 10: { // r80 THE ANCHOR — the Hearse's chained sub-part. Its motion is the
      // Hearse's business (stages/s2.js enemyUpdate[10] owns it); this case only
      // exists so a stray anchor with no owner despawns scorelessly.
      let hearse = null;
      for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === 4 && !o.dead) { hearse = o; break; } }
      if (!hearse) e.dead = 1;
      break;
    }
    case 6: { // r6 boss sub-part: position slaved to the boss every frame; hosts
      // one of the phase's emitters, so killing it REDUCES the phase's output
      // (DDP: the structure changes as you win). Dies with its phase.
      let boss = null;
      for (let i = 0; i < g.enemies.count; i++) {
        const o = g.enemies.items[i];
        if (o.type === 5) { boss = o; break; }
      }
      if (!boss || boss.dead || boss.phase !== e.phase) { e.dead = 1; break; } // phase over → part despawns scorelessly
      e.x = boss.x + PART_GEO[e.phase][0] * e.side;
      e.y = boss.y + PART_GEO[e.phase][1];
      e.fireT++;
      if (!mayFire(g, e)) break;
      // r6.5: parts fire LED (net-velocity from the boss's own player ema) —
      // the boss's direct-aimed beats supply the mix, so neither standing
      // still nor slow drifting is a safe answer to the pair (S3b, critic B)
      const vL = (g.player.x - boss.pxEma) * 0.04;
      if (e.phase === 0) {        // wing pod: extra lance volleys (P1's boss-only dialect)
        if (e.fireT % 100 === (e.side < 0 ? 35 : 85)) lanceVolley(g, e.x, e.y + 8, 4, 3.1, 0.015, vL);
      } else if (e.phase === 1) { // armor node: P2's ONLY spray emitter — kill it and
        // the phase strips down to pure spirals (felt output reduction)
        if (e.fireT % 56 === 40) spray(g, e.x, e.y + 8, 8, 0.5, 2.0, 3.1, vL); // narrowed
        // r6.5 so the led aim keeps density at the intercept point (a 1.0-spread
        // led spray diluted to ~9% in-fire vs a slow crosser — measured)
      } else {                    // core relay node: aimed lance beats over P3's medley
        // (in-family — the lance IS the medley's P1 signature; aimed fire keeps
        // the fight dancing, which also keeps honest play off the camp governor)
        if (e.fireT % 120 === (e.side < 0 ? 30 : 90)) lanceVolley(g, e.x, e.y + 8, 4, 3.0, 0.015, vL);
      }
      break;
    }
  }
}

// r6.3: distance from x to the nearest latched (banned) band center.
function latchDist(e, x) {
  let d = e.latchX > -1e8 ? Math.abs(x - e.latchX) : 1e9;
  if (e.latchX2 > -1e8) d = Math.min(d, Math.abs(x - e.latchX2));
  return d;
}
// r6.4: which side of a banned band the sweep target is pushed to. Normally the
// BOSS's current side (no flap-crossings); near a field edge, the side with open
// field — a 1.2px/f crawler otherwise herds the boss into the clamp corner and
// gets served continuously there (critic B's drift probe, P3).
export function bandSide(e, bandC) {
  if (bandC < 90) return 55;
  if (bandC > W - 90) return -55;
  return e.x >= bandC ? 55 : -55;
}

// r6.3: P1 dwell spot for a rationed phase — the candidate farthest from every
// banned band. A 2-spot rail shuffler bans both rails and the boss holds the
// middle; a center camper bans the middle and the rails stay in play.
export function pickSafeX(e) {
  const cands = [52, 106, 160, 214, 268];
  let best = 160, bestD = -1;
  for (const c of cands) {
    const d = latchDist(e, c);
    if (d > bestD) { bestD = d; best = c; }
  }
  return best;
}

// r80: the camp governor, MOVED verbatim out of updateBoss (stage 1) so every
// boss module shares it (plan §6: bosses share the r6 ritual code, never copy it).
// Returns the three facts the phase blocks read: latched / parked / vLead.
  // r6.3 camp governor (critic 3, F1-F3). What the referee's probes share —
  // and honest play never does — is STILLNESS: pinned and shuttle campers hold
  // input-still at their stops, while a live player is perpetually dodging the
  // boss's own aimed fire. Co-movement "pursuit" detection failed empirically
  // (the dodging expert's net track reads ~0% pursuit), so the governor keys
  // on posture instead:
  //  - campT accrues only while STILL (|Δpx| < 0.7/f): being served (gap<48)
  //    or holding a parked column waiting for delivery. Any dodging decays it,
  //    so pursuit and point-blank play are never taxed (F1, F3).
  //  - each trip LATCHES the spot as a banned band — TWO bands remembered, so
  //    a 2-spot shuffler banks both stops (F2) — and ratchets the phase's
  //    serve ration 55 → 25 → 12 → 6 → 2 (floor 2 once the grind account is spent).
  //  - refund: while latched the boss is BY CONSTRUCTION never over a banned
  //    stop, so closeness can only mean the player CAME TO the relocated boss.
  //    ~60f of demonstrated tracking (trackT, gap<40 while latched) clears the
  //    bands and the ration. A blind shuffler's stops stay ≥55px from the
  //    latched boss forever, so it can never demonstrate tracking; a live
  //    player who follows the relocation keeps shooting the whole time.
export function campGovernor(g, e) {
  const pVx = g.player.x - g.player.prevX;
  const gap = Math.abs(g.player.x - e.x);
  e.pxEma += (g.player.x - e.pxEma) * 0.04;
  const parked = Math.abs(g.player.x - e.pxEma) < 20; // holding a spot (~0.4s)
  const still = Math.abs(pVx) < 0.7;
  // r6.4 crawl detector (critic B's 1.2px/f sawtooth): machine-crawl = moving
  // frames that NEVER reverse direction (humans and bots flip every few frames;
  // the sawtooth flips only at field edges) at slow net speed — the fast-ema
  // lag reads net speed: crawler ~30px, a traverse-following tracker ~90px,
  // a hovering fighter <20px. Only the crawler band is flagged.
  {
    const dir = pVx > 0.7 ? 1 : pVx < -0.7 ? -1 : 0;
    if (dir !== 0) {
      if (dir === -e.lastDir) e.monoT = 0; // reversal: humans flip constantly
      else e.monoT++;
      e.lastDir = dir; // (r6.4 bugfix: the reset branch must record the new
      // direction too, or one flip zeroes monoT forever and the detector is dead)
      e.stillRun = 0;
    } else if (++e.stillRun >= 15) e.monoT = 0;
    // ^ r6.5: a REAL dwell (15+ consecutive still frames) breaks a monotonic
    // run — the honest bot's dwell-separated same-direction follows were
    // chaining past 60 (measured 20% mono60 on facade P1, false crawl flags).
    // KNOWN SEAM (r6.6 arbitration): the fixed 15f threshold is a laundering
    // window — a blind 15f-sprint/15f-stop stutterer sits exactly on it and
    // zeroes its own crawl evidence. Attempts to close it (gap-gating,
    // proportional draining, dual-horizon lead) traded away honest-play greens
    // and were rejected; the invulnerable stutter probe ships as a documented
    // residual, and its MORTAL twin dies to this boss's fire regardless.
  }
  const emaLag = Math.abs(g.player.x - e.pxEma);
  const crawl = e.monoT > 25 && emaLag >= 20 && emaLag < 60
    && (Math.abs(g.player.x - e.x) >= 30 || e.monoT > 60);
  // ^ the gap≥30 standoff spares honest hug-follows, but an ESCORTED crawler
  // (the mid-field sweep co-moving with it at its own speed, gap<30 for a whole
  // half-period) is caught by monoT>60. Honest play DOES log monoT runs past 60
  // (measured 71-74 on the expert) — the catch is safe because crawl also
  // requires emaLag ∈ [20,60): the expert's long one-way runs are full-speed
  // chases (lag ~90) or end in dwells at the boss (lag <20, and the 15f
  // dwell-reset above clears them); only slow sustained transit lands in both.
  // ^ the lag window separates the kinematic classes: hovering fighter <20,
  // machine crawl 20-60, full-speed chase ≥60 (a hop-follow is exempt); the
  // gap≥30 standoff gate spares an honest hug-follow AT the boss — a crawler's
  // pass spends its serve time crossing the 30-48 shell and beyond, a fighter
  // holds the column at <30
  // r6.4 graze layer (critic B: a 1.2px/f sawtooth and a 3-spot shuffler slid
  // between the posture detectors). The one thing every such probe does — and
  // no surviving player can — is stand IN FIRE: their trajectories ignore
  // bullets, and their mortal twins die on exactly these frames. Any bullet
  // touching graze range opens a ~0.5s in-fire window; damage dealt from
  // in-fire play bills a per-phase grind account (grindHp), and once it's
  // spent the phase stops serving that play outright: ration floor 2, no trip
  // immunity, no tracking refunds. Honest dodging rarely grazes, and its
  // in-fire damage stays far under the account.
  {
    let grazed = false;
    const px = g.player.x, py = g.player.y;
    for (let i = 0; i < g.eBullets.count; i++) {
      const b = g.eBullets.items[i];
      const dx = b.x - px, dy = b.y - py, rr = b.r + 5;
      if (dx * dx + dy * dy < rr * rr) { grazed = true; break; }
    }
    e.grazeT = grazed ? 30 : Math.max(0, e.grazeT - 1);
  }
  const dHp = e.prevHp - e.hp; e.prevHp = e.hp;
  if (dHp > 0 && e.grazeT > 0) e.grindHp += dHp;
  const grindSpent = e.grindHp > 25; // measured: honest bots bill ~0 here (they
  // never deal damage from inside fire); every exploit probe bills 27-84/phase
  let latched = e.latchX > -1e8;
  if (latched && !grindSpent) {
    // tracking credit: near the boss and NOT in transit (a shuffler's travel
    // leg blasting through the boss's column at full speed earned refunds —
    // measured 4 in P1; an engaged player HOVERS, mixing still and dodge frames).
    // gap bar sits just inside the 55px exclusion band: a banded camper's
    // parked frames are geometrically ≥55 away and can never earn credit.
    e.trackT = Math.max(0, e.trackT + (gap < 52 && Math.abs(pVx) < 2.5 && emaLag < 45 && e.monoT < 40 ? 1.5 : -0.5));
    // ^ r6.5 credit bounds: lag<45 admits P2's honest slow-FOLLOW (lag 24-48 —
    // the old <24 bar starved it: 0 refunds, P2 timeouts on 2 seeds) while
    // monoT<40 blocks a crawler mid-leg (its runs never reverse; an honest
    // follower's dodge reverses every few dozen frames), and the grind gate
    // below (led-aim fills a camper's account, honest stays 0) backstops both.
    // ^ credit bounds (r6.5 final form): emaLag < 45 admits both honest credit
    // modes — hovering at the boss (lag <20) and P2's slow sweep-FOLLOW (lag
    // 24-48; an earlier <24 bar starved it: 0 refunds, P2 timeouts) — while
    // monoT < 40 keeps a crawler mid-leg out (its runs never reverse), and the
    // refund's grind gate below backstops whatever slips the kinematics.
    if (e.trackT >= 50 + 25 * e.latchT && e.grindHp < 6) { // tracking demonstrated
      // AND the grind account is clean: refunds are for players who never deal
      // damage from inside fire (measured: honest bots bill ~0 grindHp, every
      // exploit probe bills 27-93). r6.5: each refund in a phase costs 25 MORE
      // tracking credit (latchT counts refunds, reset per phase) — an engaged
      // player's credit flows at +1.5/f and affords it; a probe's credit only
      // trickles during boss-near-stop coincidences and rarely affords a second
      // re-prime of its serve ration.
      e.latchX = -1e9; e.latchX2 = -1e9; e.latchN = 0; e.trackT = 0; e.campT = 0;
      e.latchT++;
      latched = false;
    }
  } else e.trackT = 0;
  if (still && gap < 48) e.campT += 0.6; // still while served (soft: an honest
  // hover under a slow sweep shares this posture — the hard evidence for camping
  // is waiting/crawling/in-fire play, which accrue at full or better rates)
  else if (still && parked) e.campT += 1.5; // parked WAITING for delivery — trips
  // before the boss ever arrives, so pins/shufflers get banded pre-serve
  else if (crawl && gap < 48) e.campT += 1.5; // machine-crawl being served
  else if (e.grazeT > 0 && gap < 48) e.campT += 1.5; // fighting from inside fire
  else e.campT = Math.max(0, e.campT - (crawl ? 0 : 3));
  // ^ a flagged crawler gets no forgiveness between serves (its 2-still-1-move
  // cadence decay-washed to nothing otherwise, critic B's drift probe); everyone
  // else keeps the fast decay. (A mean-gap 'remote' bar once lived here and was
  // abandoned: measured, it flickered across serves and overlapped displaced
  // honest play — its dead pxEma2 plumbing was deleted in r6.6 housekeeping.)
  // ration ratchet is band-count-independent (r6.4 critic B: two bands were one
  // short vs a 3-spot shuffler): latchN never resets without a tracking refund,
  // so a phase that keeps relocating serves thinner and thinner slices.
  const ration = grindSpent ? 2
    : e.latchN === 0 ? 55 : e.latchN === 1 ? 25 : e.latchN === 2 ? 12 : e.latchN === 3 ? 6 : 2;
  if (e.campT > ration) { // over budget
    e.campT = 0;
    // trip IMMUNITY while demonstrably tracking (trackT ≥ 8): an engaged
    // player absorbing a trip keeps the boss in place — re-banding a tracker's
    // CURRENT spot only chased the boss off its own pursuer (measured stalls;
    // at floor rations the chase cycle outpaced credit accumulation, so the
    // bar sits at the first few frames of legitimate close-hover). ANY grind
    // billing (≥6hp dealt from in-fire play) voids the immunity — in-fire
    // "tracking" is not play, and honest accounts measure 0.
    if (!latched || e.trackT < 8 || e.grindHp >= 6) {
      // bands update only from non-TRANSIT positions (r6.4): a graze-trip caught
      // mid-travel (full-speed lag ~90) would latch a transient x, pulling a band
      // OFF a shuffler's real stop and re-opening it — but a slow crawler
      // (lag ~29) must still band, or it escapes banding entirely (measured)
      if (emaLag < 45) {
        if (e.latchX > -1e8 && Math.abs(g.player.x - e.latchX) > 55) e.latchX2 = e.latchX;
        e.latchX = g.player.x; latched = true;
      }
      e.latchN++;
      if (e.phase === 0) e.holdT = Math.min(e.holdT, 1); // P1: this dwell ends now
    }
  }
  // r6.5 led-aim input: the target's NET x-velocity, read off the boss's own
  // player-position ema (a drifter's 1.2px/f reads exactly; a hoverer reads ~0)
  const vLead = (g.player.x - e.pxEma) * 0.04;
  return { latched, parked, vLead };
}

// r80: the r6 ritual's shared beats, MOVED verbatim out of updateBoss so a
// second boss module shares them instead of copying boss 1 (plan §6).
// bossEntrance: the 90f armored descent; returns true while still entering.
// `parts` = the stage's part-spawner (stage 1: spawnParts below).
export function bossEntrance(g, e, parts) {
  if (e.age < 90) { // gravitas entrance — the one allowed pause. The wing pods
    // deploy on the last beat, so the spawn-frame field is bare (S3b arrival
    // ritual: no live enemies but the boss itself at spawn).
    e.y += 1.33;
    if (e.age === 89 && e.phase === 0) parts(g, e);
    return true;
  }
  return false;
}
// (descends to y≈93: fights inside the capped-pipeline's effective range, so
// closing on the boss is rewarded the same way it is against everything else)
// r6 S3b burn telegraph: during the 60f handoff armor the outgoing form BURNS —
// ember spray from logic (deterministic; renderer adds the red tint/flicker).
export function bossBurn(g, e) {
  if (e.phase > 0 && g.frame < e.armorUntil && (g.frame & 3) === 0) {
    for (let i = 0; i < 3; i++) { // r8-fx: small burn-red flame licks (reads as burning, not confetti)
      if (!spawnFx(g, FX.FIRE, e.x + g.fxRng.range(-24, 24), e.y + g.fxRng.range(-20, 20),
        g.fxRng.range(-0.8, 0.8), g.fxRng.range(-2.4, -0.6), 16 + g.fxRng.range(0, 12), 3 + g.fxRng.range(0, 3), FAM.BURN)) break;
    }
  }
}
// The P2/P3 full-width tanh sweep with the governor's banned bands as WALLS
// (r6.4) — the same statements P2 and P3 ran inline, omega = 0.006 / 0.005.
export function bandedSweep(e, latched, omega) {
  e.holdT += Math.max(-0.4, Math.min(0.4, -e.holdT));
  e.vy += Math.max(-0.25, Math.min(0.25, 100 - e.vy));
  let tx = W / 2 + e.holdT + Math.tanh(3.5 * Math.sin(e.age * omega + e.sweepOff)) / Math.tanh(3.5) * e.vy;
  // r6.4: bands are WALLS, not detours — the boss stays on its side of every
  // banned stop until a refund drops the bands. (The old push only redirected
  // targets INSIDE a band; a raw target beyond it made the boss glide
  // THROUGH the camper's stop, ~23 dmg per crossing — the last income leak
  // for mid-field stops.) bandSide picks the boss's side, or open field near
  // an edge so a crawler can't corner the boss against the clamp.
  if (latched) { const s = bandSide(e, e.latchX); if (s > 0 ? tx < e.latchX + 55 : tx > e.latchX - 55) tx = e.latchX + s; }
  if (e.latchX2 > -1e8) { const s = bandSide(e, e.latchX2); if (s > 0 ? tx < e.latchX2 + 55 : tx > e.latchX2 - 55) tx = e.latchX2 + s; }
  tx = Math.max(52, Math.min(W - 52, tx)); // parts ride at ±38: keep them off the edge band (s5_edges)
  e.x += Math.max(-4.4, Math.min(4.4, tx - e.x)); // continuity governor
}
// per-phase timeout: advance without reward, bullets stay (no milking, S6)
export function bossTimeout(g, e, parts) {
  if (e.vulnAt >= 0 && g.frame - e.vulnAt > BOSS_PHASE_TIMEOUT) {
    g.stats.timeouts++; g.stats.timeoutLog.push('boss-p' + (e.phase + 1));
    fleeTelegraph(g, e); // r22 (Booth report: "after killing the boss his laser
    // kept flying at me and killed me" — an unrecorded run's P3 TIMED OUT and
    // the silent despawn read as a kill, leaving the lances as a betrayal).
    // The scoring law is untouched: pays nothing, cancels nothing. The flee is
    // now LEGIBLE: popup + deterministic departure fx, zero rng, zero gameplay
    // delta — referee byte-identical.
    advanceBossPhase(g, e, false, 1, parts);
  }
}

export function updateBoss(g, e) {
  g.emitter = e; // r59: needle-tier context (see patterns.js fire)
  const phase = e.phase; let rep = e.fireT / 240 | 0;
  // escalation per cycle (S3); super-linear past rep 3 — killers resolve phases
  // by rep 2-4, so the steep tail is what riding a timeout costs (S4/S6, r3)
  // r73 EXPERIMENT (Lab `bossParts`, open Q17): parts bite back. Jacob: "I don't
  // think killing the parts should make the boss easier. In DoDonPachi and in
  // Blue Revolver, destroying the parts often makes the fight harder!" Variant
  // 1/3: each dead part advances the escalation clock one rep (fireT += 240
  // keeps t, bumps rep → faster + denser for the rest of the phase). Variant 3
  // also answers the kill with a retaliation ring. Variant 2/3: the core
  // INHERITS the dead part's emitter, denser (see the phase blocks).
  const bite = g.tune.partBite | 0;
  if (bite && e.partKills > e.partSeen) {
    const n = e.partKills - e.partSeen; e.partSeen = e.partKills;
    if (bite === 1 || bite === 3) { e.fireT += 240 * n; rep = e.fireT / 240 | 0; }
    if (bite === 3 && mayFire(g, e)) ring(g, e.x, e.y, 16, 1.6, g.rng.range(0, 0.3));
  }
  const k = Math.min(1 + (e.fireT / 240 | 0) * 0.08 + Math.max(0, (e.fireT / 240 | 0) - 3) * 0.22, 2.2);
  if (bossEntrance(g, e, spawnParts)) return; // r80: moved verbatim (see bossEntrance)
  bossBurn(g, e);                             // r80: moved verbatim (see bossBurn)
  const { latched, parked, vLead } = campGovernor(g, e); // r80: moved verbatim (see campGovernor)
  e.fireT++;
  const t = e.fireT % 240;

  if (phase === 0) {         // P1: aimed needle pressure + laned walls (gap readable, lanes viable)
    // rail-hopping: at each dwell's end the boss hops to the rail on the FAR side
    // of the player. A camper is never under it; a chaser always is. Time-on-target
    // is bought by pursuit, not position — anti-camp from physics, not stats (S6).
    // hop traverse is FAST (faster than the ship): a center-camper only sees the
    // boss column for ~17f per crossing — not a free damage window (r4: at slow
    // hop speed the passive bot ground P1 down from camp). Dwells are where the
    // damage is, and dwells demand pursuit.
    // while latched, dwell only at spots clear of every banned band (r6.3 —
    // the far-rail rule alone DELIVERED the boss to a rail shuffler's next stop)
    const railX = latched ? pickSafeX(e) : W / 2 + e.side * 100;
    if (Math.abs(e.x - railX) > 3) e.x += Math.sign(railX - e.x) * 4.2;
    else if (--e.holdT <= 0) {
      // hop to the rail on the FAR side of the player — but never dwell twice on
      // the same rail (r4: vs a cross-field player "far" re-picks the same rail
      // forever and the boss parks — the r3 pursuit-lockout trap in new clothes;
      // measured hp frozen a full phase). Forcing the cross also sweeps aimed
      // fans over campers: anti-camp from motion, not position.
      const far = g.player.x < W / 2 ? 1 : -1;
      // r6.2 rail-gap fix (critic 2): vs a LATCHED player (over-served and still
      // sitting on the same spot) the boss simply stays on the far rail — a rail
      // camper is served at most one dwell, then only crossing scraps. The
      // never-same-rail alternation (r4 pursuit-lockout fix) is for players who
      // actually move, and they keep it.
      e.side = (far === e.side && !(parked || latched)) ? -e.side : far;
      e.holdT = 210;
    }
    if (mayFire(g, e)) {
      // r6.5: the fan is the led/direct MIX itself (ledFan interleaves needles
      // aimed at where the target is and where its drift is taking it)
      if (t % 46 === 20) ledFan(g, e.x, e.y + 14, 4 + Math.min(rep, 4), 0.6, 3.2 * k, vLead);
      // P1 boss-only dialect (r6 S3b/L6): the accelerating lance, also carried by
      // the wing pods — kill the pods and P1 drops to one lance beat per cycle
      if (t === 70) lanceVolley(g, e.x, e.y + 14, 5 + Math.min(rep, 2), 3.3 * Math.min(k, 1.5));
      // wall lane biased TOWARD the boss's column: riding the lane IS pursuit —
      // it parks you under the boss where the aimed fans are hottest (risk buys
      // time-on-target). r3 fix: the old away-bias + far-rail hop deterministically
      // locked pursuers out (measured 0 damage across all of P1 — a milking trap,
      // the opposite of anti-camp). Camping is still punished by the hop itself:
      // the boss is never above a stationary player for more than one dwell.
      if (t === 110) arcWall(g, e.x, e.y + 10, 13 + rep, 1.9, 1.6 * k, (e.x < W / 2 ? 2 : 8) + ((g.rng.next() * 3) | 0), 2);
      if (t === 200) arcWall(g, e.x, e.y + 10, 13 + rep, 1.9, 1.6 * k, (e.x < W / 2 ? 2 : 8) + ((g.rng.next() * 3) | 0), 2);
      // timeout-rider tax: rep 5+ exists only for players stalling the phase out
      // (killers resolve by rep 3-4) — extra EMISSIONS, not just speed: faster
      // bullets leave the screen sooner, so speed-k alone never densifies (r3)
      if (rep >= 4 && t === 155) arcWall(g, e.x, e.y + 10, 13 + rep, 1.9, 1.6 * k, 5 + ((g.rng.next() * 3) | 0), 2);
      if (bite >= 2 && e.partKills >= 1 && t % 100 === 35) lanceVolley(g, e.x - 20, e.y + 14, 5, 3.3 * Math.min(k, 1.5), 0.015, vLead); // r73 inherit: the dead pod's lance, from the core, 5 not 4
      if (bite >= 2 && e.partKills >= 2 && t % 100 === 85) lanceVolley(g, e.x + 20, e.y + 14, 5, 3.3 * Math.min(k, 1.5), 0.015, vLead);
    }
  } else if (phase === 1) {  // P2: shed-armor form — PURE twin spirals on a wide slow
    // sweep (the phase's boss-only dialect, undiluted); the spray lives in the
    // armor node sub-part, so killing the node strips P2 to spirals alone (r6).
    // The whole screen is its lane; you chase it or you don't hurt it (anti-camp).
    // r6.3 starve geometry (critic 3, F2): the sweep itself stays NORMAL — the
    // guarantee lives entirely in the hard ±55px band exclusion below, so a
    // latched pursuer only has to re-track the ordinary sweep (an earlier
    // receding-sweep variant starved the honest expert too). holdT/vy relax
    // back to the default center/amplitude.
    bandedSweep(e, latched, 0.006); // r80: moved verbatim (see bandedSweep)
    if (mayFire(g, e)) {
      if (t % 28 === 10) twinSpiral(g, e.x, e.y + 8, (e.fireT * 0.11) % 6.28, 3 + (rep > 2 ? 1 : 0) + (rep > 3 ? 1 : 0), 1.35 * k, 1, 0.012);
      if (rep >= 3 && t % 30 === 22) twinSpiral(g, e.x, e.y + 8, (e.fireT * 0.13 + 1.7) % 6.28, 2, 1.6 * k, -1, 0.012); // timeout-rider tax: counter-spiral
      if (rep >= 4 && t % 60 === 0) spray(g, e.x, e.y + 14, 10, 1.1, 2.0, 3.1); // timeout-rider tax
      if (bite >= 2 && e.partKills >= 1 && t % 56 === 40) spray(g, e.x, e.y + 14, 10, 0.7, 2.0, 3.1, vLead); // r73 inherit: the dead node's spray from the core, wider + 10
    }
  } else {                   // P3: desperation MEDLEY (r6 S3b) — bare-core form
    // recombining ONLY the earlier signatures: P1's lances (mirrored, scissoring
    // at the player), P2's spirals, plus the stripped core's radial ring beat.
    // Riding the full-width sweep: stay on it or watch it time out (anti-camp).
    // starve geometry same as P2: bands carry the guarantee, sweep stays normal
    bandedSweep(e, latched, 0.005); // r80: moved verbatim (see bandedSweep)
    // r6.2 (critic 1 partial, S3b-2): P3's movement STYLE is its own — the full
    // sweep gains a slow vertical LUNGE between two heights (fireT-keyed, so the
    // bob starts from rest at the t23 flip: the boss holds y≈91-93 there and the
    // first bob step is ~0.3px/f — the handoff reads seamless). P1 hops rails,
    // P2 glides flat, P3 breathes forward and back while sweeping.
    e.y = 93 + Math.sin(e.fireT * 0.013) * 22;
    if (mayFire(g, e)) {
      if (t === 20) ring(g, e.x, e.y, 14 + Math.min(rep, 4) * 2, 1.45 * k, g.rng.range(0, 0.3)); // bare-core beat —
      // slowed r6.2: at 1.7k the rings orbited even the reactDelay-0 expert (meanEmaD 95,
      // P3 stalls); at 1.45k point-blank pursuit threads between beats (critic 2 f1)
      if (t === 60 || t === 150) { // P1's dialect, doubled from the core's flanks —
        // r6.5 mix: left lance direct, right lance LED (denies still AND drift)
        lanceVolley(g, e.x - 26, e.y + 8, 5 + Math.min(rep, 3), 3.3 * Math.min(k, 1.5));
        lanceVolley(g, e.x + 26, e.y + 8, 5 + Math.min(rep, 3), 3.3 * Math.min(k, 1.5), 0.015, vLead);
      }
      if (t === 105) lanceVolley(g, e.x, e.y + 10, 4, 3.1 * Math.min(k, 1.5), 0.015, vLead); // off-beat
      // core lance, led: sustained pressure between the flank pairs
      // core lance, led: sustained pressure between the flank pairs
      if (t % 30 === 8) twinSpiral(g, e.x, e.y + 8, (e.fireT * 0.11) % 6.28, 2 + (rep > 2 ? 1 : 0), 1.4 * k, 1, 0.012); // P2's dialect
      if (rep >= 3 && (t === 100 || t === 190)) ring(g, e.x, e.y, 14, 1.5, g.rng.range(0, 0.3)); // timeout-rider tax
      if (bite >= 2 && e.partKills >= 1 && t % 120 === 30) lanceVolley(g, e.x - 12, e.y + 10, 5, 3.1 * Math.min(k, 1.5), 0.015, vLead); // r73 inherit: dead relay's aimed lance, from the core
      if (bite >= 2 && e.partKills >= 2 && t % 120 === 90) lanceVolley(g, e.x + 12, e.y + 10, 5, 3.1 * Math.min(k, 1.5), 0.015, vLead);
    }
  }

  bossTimeout(g, e, spawnParts); // r80: moved verbatim (see bossTimeout)
}

export function advanceBossPhase(g, e, killed, fade = 1, parts = spawnParts) { // r80: `parts` = the stage's part-spawner (default: stage 1's)
  g.stats.bossPhaseFrames.push(e.fireT);
  if (killed) {
    bulletCancelWall(g, e.x, e.y);
    // r6 late-kill decay: the item shower shrinks with the kill's lateness
    // (fade from scoreBossPhase) — a buzzer-grind pays like a timeout (S6)
    const n = Math.round(10 * fade);
    for (let i = 0; i < n; i++) spawnItem(g, e.x + g.rng.range(-33, 33), e.y + g.rng.range(-13, 27), 1000);
  } else {
    // timeout: bullets stay, no reward
  }
  // final phase resolved: scoring already granted by scoreBossPhase, so despawn
  // silently (dead=1) either way; gate opens, clear sequence begins.
  if (e.phase >= 2) { e.dead = 1; g.gate = null; g.bossDown = true; g.bossKilled = killed; return; }
  e.phase++; e.fireT = 0; e.partKills = 0; e.partSeen = 0; // r73: parts are per phase
  e.hp = g.tune.bossHp ? Math.round(BOSS_PHASE_HP[e.phase] * g.tune.bossHp) : BOSS_PHASE_HP[e.phase]; // r70 Lab experiment: phase hp multiplier (open Q16)
  e.prevHp = e.hp; e.campT = 0; e.latchX = -1e9; e.latchX2 = -1e9; e.latchN = 0;
  e.grindHp = 0; e.latchT = 0; // fresh serve ration + grind account + refund price
  // per form (moveT carries across the handoff: a live player stays credited)
  e.vulnAt = -1; e.armorUntil = g.frame + 60; // brief armor while next phase telegraphs
  // r5 S3-SHOULD-1: sync the incoming phase's free-running sweep to the boss's
  // CURRENT x, so the handoff is continuous at the flip frame (referee: any
  // single-frame |Δx| > 4.6px is a teleport). Solve
  //   tanh(3.5·sin(θ)) / tanh(3.5) · 100 = x − W/2
  // for θ and bias the sweep clock by (θ − ω·age). Structural for BOTH
  // transitions, any seed: x is clamped into the sweep's ±100 range (P1 rails
  // dwell ≤3px outside it) — the residual step lands at the sweep extremum,
  // where sweep velocity is ~0, so the worst first-frame step stays ≤ ~3px.
  const omega = e.phase === 1 ? 0.006 : 0.005; // must match the P2/P3 sweeps above
  // holdT is P1's dwell timer but the sweep phases' CENTER offset, and vy their
  // AMPLITUDE (r6.2 rail-gap fix): reset both entering P2; entering P3 they
  // carry over, so the solve below runs against the sweep's ACTUAL geometry.
  if (e.phase === 1) { e.holdT = 0; e.vy = 100; }
  const u = Math.max(-1, Math.min(1, (e.x - W / 2 - e.holdT) / e.vy)) * Math.tanh(3.5);
  const theta = Math.asin(Math.max(-1, Math.min(1, Math.atanh(u) / 3.5)));
  e.sweepOff = theta - e.age * omega;
  // r6: the incoming form's sub-part(s) ride in with the new phase; the old
  // phase's parts despawn themselves (updateEnemy case 6 checks boss.phase).
  parts(g, e);
}

// --- timeline ------------------------------------------------------------
// r78: buildTimeline() moved verbatim to stages/s1.js (the stage module) —
// this file keeps the machinery every stage shares: ENEMY_DEFS, updateEnemy,
// mayFire, the camp governor, updateBoss / advanceBossPhase. The cross-stage
// table is stages/index.js (STAGES); game.js builds g.timeline from
// STAGES[g.level].buildTimeline().
