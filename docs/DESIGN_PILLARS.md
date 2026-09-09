# SPEEDHELL — Design Pillars

*The game's constitution. Builders build to this; critics judge against it. Derived from
the mark-msx-research corpus (The Electric Underground) and boghog-research corpus
(SHMUP WORKSHOP + interviews). Sources tagged [MSX] / [BH].*

**Identity:** A Japanese-style vertical bullet-hell shmup in the Psikyo lineage —
"speed hell": fast bullets, aimed-heavy patterns, short dense runs, speed-kill scoring.
Browser (JS + Canvas2D), keyboard + gamepad. V1 = a **five-stage campaign** on the
Psikyo clock (amended 2026-09-09 — Jacob: "we are expanding this into five stages"; was
"one full stage"): every stage is waves → midboss → waves → a multi-form boss, 1'30"–2'15"
for an expert, about ten minutes to 1CC loop 1. Stage 1 shipped first as the vertical
slice and is the template; each further stage adds one new enemy niche, one place, one
boss dialect — never a stage multiplier (plan: `docs/plans/campaign-five-stages.md`).

## Pillars

1. **Density over duration.** [MSX] Content is meaningful decisions per second, not
   runtime. Every second of the stage earns its place; forced downtime is a defect.
   Tension-release cycles are pacing, not padding. [BH WS05]

2. **The natural meta is speed-killing.** [MSX/BH] Scoring must align with what
   survival already wants — killing fast is safer AND worth more ("going fast to score
   in a racing game feels natural" [BH WS06]). Quick-kill bonuses are **binary, visible
   states** (SPEED BONUS or not), never opaque frame math [BH WS06]. The meta is
   authored in the game — no external rules needed to compete on score. [MSX]

3. **Difficulty is the content.** [MSX] Every mode is an honest difficulty: either
   a distinct design with its own scoring identity (an arrange — CAVE's Original/
   Maniac/Ultra, ZeroRanger's White Vanilla) or a novice mode that keeps the
   skeleton — patterns, layouts, systems — intact (Crimzon Clover, Touhou scaling)
   [MSX]. No menu slider that scales one design down, no adaptive rubber-banding.
   Modes are built hard-first and scaled back [BH T1], never before the arcade mode
   is finished, and practice tools come before any easy mode [BH T3]. The learning
   curve spreads across runs — a game over must teach something usable in the next
   run [BH WS05]. Expert bias: the better you play, the more the game gives you
   (harder + richer, not less). *(Amended 2026-09-04 from "one honest difficulty";
   wiki §11 + changelog.)*

4. **Performance play, true failure.** [MSX] Lives are the only currency; score dies
   with the credit. No checkpoints, no meta-progression, no unlock homework. Death is
   abrupt and emotional, not tedium. Restart-to-run takes < 2 seconds.

5. **Imperfect tools and real checkmates.** [MSX] Player shots capped on screen
   (point-blanking risk/reward [BH WS01]); bombs are scarce and cancel bullets into
   points (panic button with a price). Some states are lost — no comeback mechanic
   papers over a bad position.

6. **Readable chaos.** [BH WS02] The screen may be full but never illegible: washed-out
   background, high value-contrast bullets, consistent bullet language, telegraphed
   trajectories. If a death can't be understood on replay, the pattern is wrong.

7. **60fps is a design rule, not an aspiration.** Fixed timestep, pooled objects, zero
   per-frame allocation, ≤16.6ms worst case at max bullet load. A pattern that breaks
   frame budget fails review regardless of how it looks. (Hard limits are set by us,
   not hardware — the lesson of Cave slowdown hardcoding [MSX].)

## Non-goals

No procedural generation, no roguelike meta, no upgrade shop, no difficulty slider, no
story beats mid-stage, no achievements. V1 has one loop; a second loop (harder repeat)
is the first v2 mode, per arcade convention (mode roadmap: wiki §11).
