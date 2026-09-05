# SPEEDHELL — Critic Rubric

*The gauntlet's acceptance criteria. Each surface lists checks a blind critic verifies
against REAL EVIDENCE (screenshots, sim metrics, code) — never a builder's summary.
Sources: boghog SHMUP WORKSHOP 01–06 [WS#], Mark MSX corpus [MSX]. Verdicts are
pass/fail per check; a surface passes when all MUST checks pass.*

## Evidence kit (what critics receive)

- `evidence/shots/shot-*.png` + `manifest.json` — deterministic screenshots from
  `node test/shots.mjs` (headless Chrome replaying the CERTIFIED expert-bot run —
  the driver fails if the replay diverges from metrics.json): wave 3, turret
  section, midboss p2, rush section, boss p1/p2/p3 + phase-transition pairs,
  bomb cancel moment, banners/popups, focus hitbox, stress max-load. 2x
  nearest-neighbor upscale of the 320×427 field.
- `evidence/metrics.json` — from the headless sim: bullets-on-screen curve, frame-time
  histogram at max load, kill-timing distribution, per-wave speed-kill feasibility
  (scripted bot), score curves for passive vs aggressive bot, boss phase durations,
  timeout checks.
- Source files for the surface under review only (fresh-context critics).

## S1 — Movement & game feel [WS01]

- MUST: diagonal speed normalized (measured in sim: |v| equal cardinal vs diagonal).
- MUST: zero inertia/acceleration on ship movement — instant response.
- MUST: focused (slow) + unfocused speeds; transition behavior chosen deliberately
  (instant = twitchy Touhou-style — our pick for speed hell).
- MUST: player shots fast and tall — SCREEN-RELATIVE since the r4 field rescale:
  height ≥ 3% of field height, speed ≥ 1.1 field-heights/s (the old "≥18px,
  ≥12px/frame" figures assumed the 480×640 field); never able to outrun own bullets.
- MUST: on-screen player-shot limit produces measurable point-blank DPS gain
  (sim: DPS at 40px vs 300px range ≥ 1.8x).
- SHOULD: follow-through visuals — option/trail lag behind ship motion.

## S2 — Visibility [WS02]

- MUST: background value-contrast reduced (washed out) vs bullet layer; bullets pair
  a very dark rim/core with a very bright rim/core (checked on screenshots in both
  busiest scenes).
- MUST: bullet color language is consistent: round pink/magenta = the common
  bullet (any enemy, any pattern — static, random, or a popcorn/turret's aimed
  prong); needle cyan/white = AIMED fire from the special tier only (mid, elite,
  midboss, boss + parts). A needle therefore always means "a real gun has you".
  ≤ 3 bullet color families on screen. *(r59 rewrite, Jacob-authorized
  2026-09-04; r5–r58 read "needle = any aimed shot".)*
- MUST: enemy bullets never share a color family with score items or player shots.
- MUST: depth sort — bullets render above enemies, explosions below bullets; faster/
  smaller bullets above slower/bigger.
- MUST: no single-bullet spawns in open space — bullets arrive in groups/streams.
- SHOULD: aimed needles elongated in travel direction; curved bullets have trails.
- SHOULD: bullets animate (spin/pulse) subtly.

## S3 — Bullet patterns [WS03]

- MUST: pattern roster uses all three types deliberately — aimed (manipulable),
  static (positional), randomized-within-limits (reactive) — verified per encounter
  table in code + screenshots.
- MUST: every dense pattern readable as lanes with ≥2 viable lane choices carrying
  different risk/reward.
- MUST: boss patterns escalate across repetitions (speed/density up per cycle).
- MUST: micro-dodge AND macro-dodge both demanded somewhere in the stage; neither
  exclusively.
- MUST: no pattern requires reading > 2 focal points simultaneously without warning.
- SHOULD: patterns flow — each attack's exit position feeds the next attack's entry.

### S3b — Boss theatre (added r6, from docs/HOMAGE_STUDY.md L3/L6/L7)

- MUST: arrival ritual — a WARNING telegraph ≥ 1s before the boss gate, and the
  entrance plays over an emptied field (no live enemies/bullets at boss spawn).
- MUST: each phase is a FORM change, not a stat change — silhouette, movement
  style, and bullet dialect all visibly change per phase (shots p1/p2/p3).
- MUST: phase handoffs are telegraphed (burn/flash beat) AND spatially
  continuous (referee bossContinuity check ≤ 4.6 px/f).
- MUST: ≥ 1 destructible sub-part per phase; the part is itself a speed-kill
  target, and destroying it visibly changes the boss silhouette.
- MUST: the final phase is a desperation medley — it recombines the earlier
  phases' bullet dialects (and only those) under all S2 readability rules.
- MUST: boss-only bullet dialect — at least one pattern family per phase that
  never appears in stage sections ("stage or boss?" readable from bullets alone).
- SHOULD: the arena restains per phase (background accent shift, renderer-only,
  within S2-MUST-1's washed band).
- SHOULD: at least one attack per fight whose safe/optimal position is CLOSE to
  the boss, re-earned against boss movement (point-blank invitation).

## S4 — Enemy & wave design [WS04]

- MUST: role coverage — popcorn, mid, elite, turret all present with distinct
  silhouettes and HP tiers; HP as low as role allows ("keep the pace up").
- MUST: dynamic lifecycle — leaving mids/elites alive is measurably more dangerous
  (sim: bullets-on-screen with passive bot ≥ 1.6x aggressive bot).
- MUST: intro armor (brief invulnerability) so enemies are guaranteed their entrance;
  top-of-screen dead zone (no damage before on-screen).
- MUST: bottom-zone no-shoot rule — enemies below/beside the player's y-band don't
  fire (no unavoidable point-blank spawns).
- MUST: outro states — off-screened enemies stop firing and despawn cleanly (no
  bullet sources dragged through the stage).
- MUST: explosions punchy — ≤2 startup frames, cover the sprite, debris; hit-flash
  on damage.
- SHOULD: screen shake reserved for elite/boss deaths only.

## S5 — Level design [WS05]

- MUST: top-lane flow — strong-enemy spawns sequenced (never 2+ elites simultaneously),
  alternating sides, no vertical turret stacks, no edge-trap spawns.
- MUST: wave overlap engineered: at least one breathing section and one heavy-overlap
  section; overlap visible in the spawn timeline (code) and bullets-curve (metrics).
- MUST: themed sections (≥3 distinct: e.g. popcorn rush, turret alley, elite gauntlet)
  with repetition-with-twist (2–5 reps).
- MUST: tension-release — after each peak (midboss, rush) a release moment (cancel
  wall, item shower, ≤4s breather).
- MUST: a game-over teaches — deaths cluster at learnable moments (sim bot with
  1-frame-late dodging dies at consistent points), not random popcorn collisions.
- SHOULD: spawn points anchored to background landmarks.

## S6 — Scoring [WS06 + MSX]

- MUST: speed-kill core is binary and visible — kill within window ⇒ "SPEED" popup +
  2x value; window generous on popcorn, tight on elites.
- MUST: natural alignment — aggressive bot outscores passive bot ≥ 3x while ALSO
  facing fewer on-screen bullets (scoring and survival pull the same direction).
- MUST: no milking — midboss and every boss phase have timeouts; nothing respawns
  infinitely for points.
- MUST: clear hierarchy — one core mechanic (speed-kill), garnishes subordinate
  (bomb-cancel points, end-of-stage bonus for lives/bombs in stock).
- MUST: score legible without reading numbers — popups, chain fanfare (players "gauge
  performance without looking at any numbers").
- SHOULD: end-stage bonus rewards stock (lives/bombs kept), not grinding.

## S7 — Difficulty & balance [MSX]

- MUST: 1CC-able — scripted expert bot (frame-perfect within human reaction floor,
  120ms) clears with ≥1 life to spare; blind-run bot dies by mid-stage (it should).
- MUST: no unavoidable deaths — sim proves a dodge path exists (≥ hitbox*3 gap) for
  every pattern at spawn-adjacent positions.
- MUST: restart ≤ 2s from death to control.
- MUST: difficulty monotonically escalates across the stage except release moments.

## S8 — Performance (hard gate, every round)

- MUST: worst-case frame ≤ 16.6ms in sim stress scene (1,000 live bullets, 48 enemies,
  200 particles) on this Mac, measured over 600 frames, p99.
- MUST: zero allocations in the hot loop after warmup (pools for bullets, enemies,
  particles, popups) — verified by heap-delta check in sim.
- MUST: fixed timestep (60Hz logic) with render interpolation; logic deterministic
  under seed (same seed ⇒ identical metrics hash).

## Gauntlet protocol

Max **3 rounds per surface**; a 4th round requires Jacob's explicit go. Critics get
fresh context each round, evidence-first, and must cite the rubric check ID in every
verdict. Builder and critic are never the same agent. Jacob is the brake.
