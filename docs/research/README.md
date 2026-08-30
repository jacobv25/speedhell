# docs/research/ — the research corpus

Deep-research deliverables commissioned by Jacob, 2026-08-29/30. Each report is
self-contained with numbered sources and per-claim fetch status ([F] = quote or
number verified in the fetched page; [S] = snippet only — treat as unconfirmed).
`raw-*.md` files are the per-pass findings the synthesized reports were built
from, kept because they carry every source's fetch status and the contradiction
lists. The `visualize` HTML page for the canon research lives in
`~/Dev/claude-visualizations/2026-08-29-*-shmup-canon-three-holes.html` (pruned
folder — the repo copies here are canonical).

## Reports

- **canon-three-holes.md** — how classic Japanese shmups handle the three holes
  playtests exposed: safe spots / fire gating (no classic game mutes an enemy
  because the player is above it; sealing is ground-only + distance), enemy
  density (SPEEDHELL ~22/min vs canon 60–190/min), destructible ground layer.
  Drove r18 (mayFire rewrite), r19 (overlap pass), and the S/D/G roadmap.
- **hitbox-display.md** — genre conventions for displaying the player hitbox
  (markers are never smaller than the truth; Touhou 10×10 over 3.3–7px). Drove
  the r20 display contract (wiki §6.2).
- **playtest-interviewing.md** — Nielsen think-aloud / RTA, Gow's word-list
  commentary protocol, Hopson's mid-playtest feedback methods. Drove the Booth
  (booth.html) and the interview rules Claude follows in it.
- **zeroranger.md** — ZeroRanger deep-dive: the 10-swatch hue=threat /
  value=identity palette, stage lengths (2:20→6:15 loop 1), the
  continues-as-currency economy and save wager, hidden rank, music state-cuts,
  steal/refuse list. Informs the boss-art ramps, D-pass framing, clear-tally
  and loop-2 design.

## State of the roadmap these feed (as of r20, 2026-08-30)

Done: r18 fire gating + s6_topband probe · r19 overlap (crossers/risers/
midboss escort + unseal) · r20 enemy identity art + display contract + Booth
tooling. Open, in planned order: (1) seam pass — S1→S2 lull + crosser entry
position (Booth session 1/2 flags); (2) density pass (canon says 60–190/min,
ZeroRanger says pattern-over-quantity — the shape question is compression vs
multiplication); (3) boss art to the two-family ramps (see zeroranger.md §1);
(4) parked decisions for the Mark/boghog consults: s4_dynamic + s6_alignment
recert bars, bullet hit radius 3→2 leniency, suicide-for-bombs meta (wiki
§8.8), loop 2 as Ketsui-style seal (wiki changelog 2026-08-29 decision).

## Follow-up sources that exist but were not mined

System Erasure podcast interview ("Episode XVIII: The Chosen One", SoundCloud) ·
Lazy Devs "The Design of ZeroRanger" video interview (Nov 2023, 1h37m) ·
boghog SHMUP WORKSHOP 01 video (transcript IS local: ~/Dev/boghog-research) ·
system11 threads t=45122 (hitbox design debate) and "Smallest Hitbox" (archive
rate-limited, never fetched) · Electric Underground's ZeroRanger review video
(only its description verified).

Local corpora on disk (primary sources): ~/Dev/mark-msx-research and
~/Dev/boghog-research transcripts; SPEEDHELL docs/homage/ film studies.
