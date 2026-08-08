# Boghog Craft Notes (interview digest)

*Distilled 2026-08-08 from boghog-research transcripts: [T1] Lazy Devs Gunvein design
interview (2023-10-28), [T2] Behind the Bullets Gunvein commentary (2024-03-14),
[T3] Game Design Archive EP52 (2026-06-19). Companion to CRITIC_RUBRIC.md — these are
the interview-sourced rules; WS# rules live in the rubric.*

## Directly load-bearing for SPEEDHELL (per the digest's own synthesis)

- Chunk-with-escalation; never repeat the same encounter more than twice, and vary the
  repeats (extra popcorn, faster arrival). [T1]
- Score items as routing signage — "boost pads in a racing game." [T2]
- Midboss: destructible-parts routing layer if possible; **no breather after it dies** —
  back on route within a second (Psikyo compression; stage-3/final bosses are the only
  gravitas pauses). [T2]
- Boss HP is a pattern-duration knob, not durability; if HP must be short, use the
  intro-speed trick (bullets fast-in → stall → re-accelerate) so the shape is instantly
  on screen. [T1]
- The novice test: after routes burn in, deliberately wait ~1s after each spawn before
  moving, to dull reflexes — that's the new-player safety net. [T1]

## Patterns
- Emitter param set: bullet type, speed(+speed2 interpolation, intro speed), shot count,
  shot delay, rotation deg/speed, aim toggle, loop vs burst. [T1]
- Aimed forces movement; static clutter is what kills — classic aimed-vs-static dynamic. [T3]
- Balance RNG so the player switches between macro and micro dodging on the fly; no
  settled rhythm on climax patterns. [T2]
- His hard-pattern bar: "I balance it so that I never feel comfortable dodging it myself." [T2]
- Bullet cancels license near-unfair patterns (jump-scare → relief); cancel circle should
  grow outward from the kill, not clear instantly. [T1]
- Deliberate anti-readability tools (use knowingly, sparingly): sprite not rotated to
  trajectory; layered stop/overtake/re-accelerate; noise bullets crossing lanes. [T2]

## Enemies & waves
- Think in niches, not counts; one enemy that controls space + popcorn flying in. [T1]
- The checkmate: threats must be able to combine into genuinely no-out situations, built
  from physical properties (hitboxes, movement, spacing), not stats. [T3]
- Escalate behaviour across the stage, not just counts (e.g. ships from the bottom later). [T2]
- Speed-kill enforcement is legitimate: some turrets are "kill fast or be blanketed." [T2]
- Musical layering: base layer carries the player; add instruments; crescendo → relax. [T1]

## Boss
- Phases should bleed into each other (kill phase 1 at the right moment → enter phase 2
  in position). [T2]
- No gimmick → buy interest with pattern variety; zigzag difficulty is acceptable. [T2]
- Generous bomb economy licenses RNG; target feel: "never really out of it, but 4 seconds
  from losing everything." [T2]
- Post-death scare attack: looks scarier than it is. [T2]

## Feel & tech
- Focus/unfocus from Cave frame analysis: ~3 vs 1.5–2 px — speeds close together; halving
  feels bad. Tune transition time separately (snap = commitment, ramp = nuance). [T1]
- Ship speed is reaction leeway, not escape. [T1]
- Small hitboxes are theatre; gaps are huge but it looks like grazing. [T1]
- Never fully automate the shot button — the kinetic element matters. [T1]
- Score popups tick up rapidly. [T1]
- Don't build a million-bullet engine — Cave peaked ~200 bullets, alternated collision
  checks across frames. [T3]
- Sync key events to music beats loosely; nail the driving-forward feel, not every note. [T1]

## Difficulty
- Start hard, scale back — difficulty is a stress test that exposes the crappy parts. [T1]
- Don't design around your own ideal route; discover the route, then emphasize it while
  keeping leeway. [T1]
- Balance = counters, not numbers; build pros/cons into the move itself. [T3]
- Practice tools are the real accessibility fix (stage/section select, save states) — not
  mode bloat. Plan state serialization from day one. [T3]
- Drift note: by [T3] he regrets not making Expert harder and rejects easy-mode
  proliferation; [T1]-era he required 1CC-ing his own game, later dropped that bar.

## Process
- Player abilities first — they dictate everything. Then enemies in the void, then level
  layout, then 50/50 co-development. Scoring last. [T1]
- Work in passes with cooldown between, not continuous tweaking; "levels are never
  finished, you just run out of time." [T1]
- Fast iteration loop is a first-class requirement (30–60s launch). [T1]
- Anchor structure: strong opening, mid-game set-piece climax, strong finish. [T1]
