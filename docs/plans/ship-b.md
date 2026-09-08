# Plan — Ship B: wide shot, slower ("plant and sweep")

*Written 2026-09-07 for a builder agent. Branch: start from `art/skins` (r62+),
new branch `design/ship-b`. Read `CLAUDE.md` first (rules on design changes,
the wiki, BUILD, referee files), then `docs/DESIGN_PILLARS.md`,
`docs/DESIGN_WIKI.md` §2 (scoring), §6 (player pipeline), §11 (modes),
`src/core/game.js` (PLAYER + the player block in `update`), `test/bot.mjs`,
`test/sim.mjs` (read-only), `src/main.js` (title menu), `src/results.js`.*

## Goal and exact result

A second selectable ship whose identity is HOW it delivers damage, not how
much. Ship A (the broom witch) darts and pierces: two straight bolts, fast
ship. Ship B plants and sweeps: a three-way spread, slower ship, faster
focus. Same point-blank damage as A, lower single-target damage at range,
much better coverage of a popcorn line.

Exact result the player feels: with B, lines of popcorn die together and
speed-kills on swarms come easy, but elites, the midboss and the boss only
die inside their speed-kill windows if you close to point-blank — the
point-blank invitation (wiki §2, S1) becomes mandatory for B and stays
optional for A. Two ships, two routes through the same stage. Both ships must
clear with the expert bot and score within a band of each other, or one is
the dead option the Mark MSX corpus warns about (DaiOuJou: "everyone plays
the Expert ship").

## Corpus clearance (state it in the wiki entry — the CLAUDE.md rule)

- **MSX:** ship types are depth only when each has purpose (DOJ Expert-ship
  complaint; his praise for the "shot type arrange"). Never a stat copy.
- **Boghog** [T1]: "ship speed is reaction leeway, not escape" — B's lower
  speed costs leeway and must be paid back by coverage, not by hp or bombs.
- **Wiki §11 rule:** every mode/ship is an honest design with its own scoring
  identity, never a number scaled down. Standing conditions: no hp-inflation,
  no scoring-math changes, loot stays garnish.
- **Pillar 6 / rubric S2:** player shots stay in the violet-white family; the
  spread must not add a colour.
- **HOMAGE:** DDP Type A/C and Deathsmiles' character shots are the lineage.

Scoring rules are Jacob's decision: this plan ships B's numbers as a
*measured option*. Do steps 1–3 (core + probe) FIRST and report the numbers
before doing the shell/art steps, so Jacob can retune the spread before UI
and sprites are built around it.

## Non-negotiable constraints

1. **Ship A is byte-identical.** With `g.ship === 0` (the default), the sim's
   expert run must reproduce `evidence/metrics.json` exactly (frames, score,
   kills, outcome). The referee, `test/sim.mjs`, `docs/CRITIC_RUBRIC.md` and
   `evidence/` are never edited by you; the recert that adds Ship B to the
   referee is a separate, Jacob-authorized commit.
2. **Core stays DOM-free and deterministic.** Ship choice is a field on `g`
   set before `startRun`; no new rng consumption for ship A's path.
3. **Same total damage per volley (6) and same point-blank dps (120)** as A.
   Do not touch `ENEMY_DEFS` hp/value/window. Do not touch bombs or lives.
4. **Shot colour family unchanged** (violet-white). Spread bolts are the same
   sprite, angled by their velocity.
5. **Ship select lives in the title menu, not the Lab** (wiki §11: modes are
   named designs). Persist the choice like the practice row does.
6. **Bump `BUILD`**; wiki: new §6.4 "Ships", §11 note, changelog entry with
   the corpus clearance above and the measured table; say explicitly which
   sections changed.

## Numbers to start from (Jacob retunes after the probe)

| | Ship A (today) | Ship B (start here) |
|---|---|---|
| move speed | 3.7 | 3.2 |
| focus speed | 2.3 | 2.5 |
| bolts per volley | 2, straight, x ± 7 | 3: centre straight + two at vx ± 2.2 (≈ 14°) |
| damage per bolt | 3, 3 | 3 centre, 1.5 each side (total 6) |
| shot every | 3 f | 3 f |
| on-screen cap | 6 (fires while ≤ cap − 2) | 9 (fires while ≤ cap − 3) — same number of volleys in flight |
| shot speed | 9 | 9 |

Why these: at range a single target of hit radius ≥ 7 catches both of A's
bolts (6 dmg/volley) but only B's centre bolt (3 dmg/volley) — B is half of A
against one enemy at range and equal at point-blank, where all three connect.
At 100 px the side bolts sit ±24 px out, so a 55 px band is covered: a popcorn
line dies as a line. Speed −0.5 is the leeway cost; focus +0.2 is the
"plant" identity.

## Implementation

### 1. Core (`src/core/game.js`)

- Replace the single `PLAYER` constant's *variable* fields with a `SHIPS`
  table: `export const SHIPS = [{ id: 'witch', name: 'WITCH', speed: 3.7,
  focusSpeed: 2.3, shotLimit: 6, volley: [[-7, 0, 3], [7, 0, 3]] }, { id:
  'priestess', name: 'PRIESTESS', speed: 3.2, focusSpeed: 2.5, shotLimit: 9,
  volley: [[0, 0, 3], [-4, -2.2, 1.5], [4, 2.2, 1.5]] }]` where a volley entry
  is `[xOffset, vx, dmg]`. Keep `PLAYER` for the shared fields (`hitR`,
  `shotSpeed`, `shotEvery`) so nothing else breaks (renderer imports
  `PLAYER.hitR`).
- `makeGame`: `g.ship = 0`. `startRun(g, atT, ship = g.ship)` sets it.
- Player block in `update`: read `const S = SHIPS[g.ship]`; speed/focus from
  S; the fire condition becomes `g.pBullets.count <= S.shotLimit −
  S.volley.length`; spawn each volley entry with `b.x = p.x + xo; b.vx = vx;
  b.vy = −PLAYER.shotSpeed; b.dmg = dmg`. Bolt update adds `b.x += b.vx` and
  culls at `x < −20 || x > W + 20`. The pool's item shape gains `vx, dmg`
  (`makePool(…, () => ({ x, y, vx: 0, vy: 0, dmg: 3 }))`).
- Collision: wherever player bullets damage enemies (`e.hp -= PLAYER.shotDmg`
  or similar — grep `shotDmg`), use `b.dmg`. Ship A's bolts carry `dmg: 3`,
  `vx: 0`, so its arithmetic is unchanged — verify with the determinism check
  below (float paths must be identical: adding `+ 0` to x is fine; do not
  reorder operations).
- Anything else that reads `PLAYER.speed/focusSpeed/shotLimit` (grep) —
  route through `SHIPS[g.ship]`. `test/bot.mjs` may read `PLAYER.speed` for
  lookahead: keep it working for both (pass the ship's speed).

### 2. Probe (`tools/probes/ship-b-probe.mjs`, new; you may edit `tools/`)

Runs the sim's four bot configs (copy the four `makeBot` option sets from
`test/sim.mjs` verbatim, with a comment saying so) on seed `0xC0FFEE` for
ship 0 and ship 1, plus the s7_robust alternate seeds if cheap. Prints per
ship × bot: outcome, frames, score, kills, speed-kill rate, deaths, and a
**per-enemy-type speed-kill table** (type → attempts, made, rate) — that is
the honesty check for windows. Also prints the Ship-A-vs-metrics.json
identity check (must say IDENTICAL). Keep it under 150 lines; it is a
builder tool, not referee infrastructure.

**Stop here and report** (table + identity check) before step 3. If the
expert bot cannot clear with B, or B's elite/midboss/boss speed-kill rate is
< 60 % of A's, propose a retune (side-bolt damage 2/2 with centre 2, or vx
± 1.6) with numbers — do not tune enemy windows.

### 3. Shell: ship select (`src/main.js`, `index.html`, `src/results.js`)

- Title menu: a `SHIP  ◀ WITCH ▶` row next to `PRACTICE` (same ◀▶ pattern as
  `practiceSel`), persisted via the options `store` key `speedhell.ship`,
  pad-navigable (r42 rules). `startRun(g, t, shipSel)` on START and on
  PRACTICE.
- HUD: the renderer already tags PRACTICE; add a 9 px ship tag beside it
  only if Jacob asks — otherwise the receipt is enough.
- Receipt + hi-score table (`results.js`): stamp the ship name on the run
  (like `labStamp`) and store it on score rows; the board stays one table
  (Deathsmiles convention) with a ship column. Seed rows (r48) show `—`.
- Booth recordings / `?lab` URL config: include `ship` so a replay reproduces.

### 4. Renderer + skins (renderer-only)

- `drawShip(ctx, x, y, focus, ship)`; `drawPlayer` passes `g.ship`; the
  sprite cache key becomes `'ship' + ship`. Skin contract: `paintShip(c, K,
  ship)` — update the header in `skins/base.js` and every skin (base draws
  A's craft with a swapped edge colour for B; cute-occult gets a real second
  craft: a moth-winged priestess on a censer/lantern, ~28 px span, bible §6,
  big around the tiny dot; the other skins may reuse base's swap).
- Player bolts: `drawShip`'s sibling loop in `draw()` draws `pBullets` as
  vertical 4×20 rects; for B rotate by `atan2(vy, vx)` when `vx !== 0`
  (snap translate to integers, bible §2). Colours unchanged.
- HOW TO card (`src/howto.js`): shows the SELECTED ship (pass the stored
  choice); the bullet card is unchanged.
- Peek: `tools/artpeek.html?ship=1` support so the gallery shows both crafts.

### 5. Audio (optional, small)

`SFX.SHOT` may get a slightly lower pitch for ship B (audio.js reads
`g.ship` at drain time). Skip if it costs more than 10 lines.

### 6. Docs + BUILD

- `src/version.js` BUILD rN.
- Wiki: **§6.4 Ships** (table above with final numbers, the identity
  statement, the probe results per ship × bot, the per-type speed-kill
  table, the corpus clearance), **§11** a line that ships are the first
  "mode-like" choice and live in the title menu, **changelog** entry (dated,
  BUILD, "referee recert pending: Ship B needs its own bot runs in
  `test/sim.mjs` — Jacob-authorized").
- `docs/ART_BIBLE.md` §6 size ladder: add the second craft row (28 px, hit
  3). `docs/art-rounds/skin-cute-occult.md`: note the second craft.

## Tests / acceptance

- **Ship A identity:** probe's ship-0 expert run == `evidence/metrics.json`
  expert (outcome, frames, score, kills). Also `node test/sim.mjs` may be
  run for the S8 determinism print — then `git checkout evidence/` so no
  referee file changes are staged.
- **Ship B honesty:** expert clears; aggressive-human clears; score within
  ±15 % of A for the expert bot (report the number even if outside);
  per-type speed-kill rate for elite/midboss/boss ≥ 60 % of A's; popcorn
  rate ≥ A's. Report all of it.
- `node test/shell.mjs` passes; the title row navigates with keyboard and
  pad; the choice persists across reloads; receipt shows the ship.
- Peek sheet with `?ship=1` in `docs/img/` showing the second craft in
  cute-occult; bolt sprites angled; draw time unchanged (≤ 16.6 ms).
- `git diff --stat test/sim.mjs docs/CRITIC_RUBRIC.md evidence/` is EMPTY.

## Out of scope

Bombs, lives, hp, enemy windows, scoring formulas (standing conditions).
A third ship. Character art beyond one code-drawn craft (Jacob may Codex a
concept sheet later; Round-style art pass then).

## Recap format for Jacob

The probe table (ship × bot) and the per-type speed-kill table; the final
Ship B numbers; files touched; BUILD rN; wiki sections changed; what is
pending his authorization (referee recert; any retune of the starting numbers).
