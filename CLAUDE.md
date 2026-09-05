# CLAUDE.md — SPEEDHELL

Read `README.md` first, then `docs/DESIGN_PILLARS.md` (constitution) and
`docs/DESIGN_WIKI.md` (how the systems actually work, and the open questions).
Any renderer / art change also reads `docs/ART_BIBLE.md` (draft drawing rules) and
stays inside it — or says explicitly where and why it doesn't.

## Rules

- **Every design question or change must be cleared against both corpora BEFORE
  implementing:** `docs/BOGHOG_CRAFT.md` + the boghog WS# rules in
  `docs/CRITIC_RUBRIC.md`, and the Mark MSX doctrine
  (`~/.claude/skills/mark-msx/references/philosophy.md`; deeper corpus in
  `~/Dev/mark-msx-research`), plus `docs/DESIGN_PILLARS.md` and
  `docs/HOMAGE_STUDY.md`. State what each lens says — including where it pushes
  back — and cite the specific principles in the wiki changelog entry. A change
  neither corpus supports needs Jacob's explicit override. Standing conditions
  already set: no hp-inflation fixes; no collect-streaks/medal-ladders or any
  opaque scoring math (MSX/Pillar 2); loot stays garnish-priced (S6); boghog
  pass-cooldown — settle the current pass in playtest before opening another.
- **After any design change, check whether `docs/DESIGN_WIKI.md` needs updating.**
  A design change is anything that alters scoring values or windows, enemy/boss
  behavior or movement, the camp governor, cancels/items/bombs, the stage
  timeline, or the player pipeline. If the wiki describes the thing you changed,
  update that section (numbers, file:line pointers, rationale) and append a dated
  line to its "Changelog of decisions" — in the same commit or the one right after.
  If it doesn't need updating, say so explicitly in your recap. The wiki is what
  Jacob references later and sends to outside critics; a stale wiki is worse than
  none.
- **Builders never edit `test/sim.mjs`, `docs/CRITIC_RUBRIC.md`, or `evidence/`.**
  Referee recerts are separate, Jacob-authorized commits. Referee metrics are
  sensitive to the rng stream — when a check goes red, run HEAD as a control
  before attributing it to your change.
- **Scoring rules are Jacob's decisions.** Present changes as options with
  measured numbers (headless sim), implement what he picks, commit when asked.
- Keep `src/core/` DOM-free and deterministic; fx randomness uses `g.fxRng`,
  never `g.rng`.
- **Bump `BUILD` in `src/version.js` with every design change** (rN, matching the
  wiki changelog). It renders in the page footer so playtests can confirm which
  build the browser loaded.
