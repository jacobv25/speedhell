# SPEEDHELL — Design Pillars

*The game's constitution. Builders build to this; critics judge against it. Derived from
the mark-msx-research corpus (The Electric Underground) and boghog-research corpus
(SHMUP WORKSHOP + interviews). Sources tagged [MSX] / [BH].*

**Identity:** A Japanese-style vertical bullet-hell shmup in the Psikyo lineage —
"speed hell": fast bullets, aimed-heavy patterns, short dense runs, speed-kill scoring.
Browser (JS + Canvas2D), keyboard + gamepad. V1 = one full stage: waves → midboss →
waves → 3-phase boss, 1CC-able in ~4–5 minutes by a practiced player.

## Pillars

1. **Density over duration.** [MSX] Content is meaningful decisions per second, not
   runtime. Every second of the stage earns its place; forced downtime is a defect.
   Tension-release cycles are pacing, not padding. [BH WS05]

2. **The natural meta is speed-killing.** [MSX/BH] Scoring must align with what
   survival already wants — killing fast is safer AND worth more ("going fast to score
   in a racing game feels natural" [BH WS06]). Quick-kill bonuses are **binary, visible
   states** (SPEED BONUS or not), never opaque frame math [BH WS06]. The meta is
   authored in the game — no external rules needed to compete on score. [MSX]

3. **Difficulty is the content.** [MSX] One honest difficulty. No menu slider, no
   adaptive rubber-banding. The learning curve spreads across runs — a game over must
   teach something usable in the next run [BH WS05]. Expert bias: the better you play,
   the more the game gives you (harder + richer, not less).

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

No procedural generation, no roguelike meta, no upgrade shop, no difficulty menu, no
story beats mid-stage, no achievements. V1 has one loop; a second loop (harder repeat)
is the natural v2, per arcade convention.
