# Concept art (references only — never shipped)

Image-model concept sheets used as *inspiration* for the hand-coded art rounds
(`docs/ART_BIBLE.md`). Nothing in this folder is loaded by the game: every
shipped sprite is drawn by code in `src/render/renderer.js`. Keep it that way —
the whole point is that the game contains zero image assets (see the Steam note
in the wiki changelog, 2026-09-04).

## Pipeline

1. Prompts live in the round's scratchpad; the style block is repeated in each.
2. `codex exec --skip-git-repo-check -s workspace-write "<prompt>"` from inside the
   dated folder — Codex's built-in `image_gen` tool (ChatGPT auth, no API key)
   writes the PNG; the prompt tells it the filename and to verify the file.
3. `sips -Z 1200 -s format jpeg -s formatOptions 80 x.png --out x.jpg` for the
   committed copy; PNGs stay out of git.
4. Jacob picks; a Claude builder hand-codes the pick per the bible, citing the
   sheet in the round brief (`docs/art-rounds/`).

## Sets

- `2026-09-04-parodius/` — direction pivot Jacob set 2026-09-04: Parodius-style
  silliness (penguins, moai, octopi, mascots) plus beautiful, fully clothed anime
  heroines in the 90s Konami/Psikyo arcade illustration style. Four sheets:
  enemy lineup, boss three forms, section landmarks, heroine + ship + logo.
- `2026-09-04-neon-vector/` — Geometry Wars / Resogun / Sektori lineage: glowing
  wireframe shapes on black, additive bloom. Jacob's verdict on the Parodius set:
  "not terrible but too close to Parodius"; this and synthwave were the two
  picks from the pop-culture survey (cute-occult was the recommendation).
- `2026-09-04-synthwave/` — 80s outrun: sunset gradients, grids, chrome. World
  palette deliberately indigo / violet / orange / gold so hot pink + cyan stay
  bullet-only.
- `2026-09-04-cute-occult/` — Cult of the Lamb / Hollow Knight lineage (the
  survey's recommendation): flat cute critters, thick outlines, candles and sigils.
- `2026-09-04-kawaii/` — Kirby / Sanrio pastel mascots on a night-sky field.
- `2026-09-04-rubber-hose/` — 1930s Fleischer / Cuphead ink-and-wash cartoon.
- `2026-09-04-graphic-pop/` — Persona 5 / Jet Set Radio poster graphics: halftone,
  hard shadows, red / mustard / black.
Jacob asked for all six survey directions (2026-09-04) to compare side by side.
