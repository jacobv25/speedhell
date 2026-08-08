# SPEEDHELL

A Japanese-style vertical bullet-hell shmup in the Psikyo "speed hell" lineage —
fast bullets, aimed-heavy patterns, speed-kill scoring. Browser, zero dependencies.

Built with the **gauntlet-loop** method: builders and fresh-context blind critics judge
every surface against `docs/CRITIC_RUBRIC.md`, whose rules are distilled from the
`~/Dev/mark-msx-research` (critic theory) and `~/Dev/boghog-research` (developer craft)
corpora. Design constitution: `docs/DESIGN_PILLARS.md`, craft notes: `docs/BOGHOG_CRAFT.md`.

## Play

Open `index.html` in a browser (no build, no server needed — ES modules require
`file://` module support; if blocked, `python3 -m http.server` in this dir).

Arrows/WASD move · Z/space shot · Shift focus · X bomb · R restart · P pause. Gamepad supported.

## Verify (the referee)

```
node test/sim.mjs    # bots + stress + determinism → evidence/metrics.json
```

`test/sim.mjs` and `docs/CRITIC_RUBRIC.md` are the referee: **builder agents must
never edit them** — that's grading your own homework.

## Architecture

- `src/core/` — DOM-free deterministic game logic (fixed 60Hz, seeded RNG, object
  pools, hard caps). Imports cleanly into Node for the sim harness.
- `src/render/` — Canvas2D layer, rubric S2 visibility rules.
- `test/sim.mjs` — scripted bots (expert/aggressive/passive/blind), S8 stress gate,
  determinism check, rubric metric checks.
- `evidence/` — metrics + screenshots consumed by gauntlet critics.
