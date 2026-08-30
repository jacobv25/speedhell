# playtest/ — Booth sessions

The Booth (`booth.html` + `src/booth.js`, served by `tools/booth-server.mjs`)
is the pause-and-talk playtest mode. Files here are its record:

- `notes.jsonl` — one line per flag or answer from the player, with the game
  state snapshot at the flagged frame (section, enemies, bullets, lives…).
- `replies.jsonl` — one line per reply from Claude, shown in the Booth panel.
  Format: `{"flag": 3, "text": "…"}`.
- `recordings/<session>-run<N>.json` — seed + packed inputs for a run. The core
  is deterministic, so `node tools/booth-replay.mjs <file> <tick>` rebuilds
  the exact flagged frame.

Start: `node tools/booth-server.mjs` then open http://localhost:8002/booth.html.
Tab flags the moment (freezes the game), Esc resumes, ⌘⏎ sends.

Interview rules (see `~/Dev/claude-visualizations/playtest-interview-mode-report.md`):
raw feeling first in the player's words; word list is optional scaffolding;
ask the expectation gap; never "why", never name a system first, never ask for
the fix during the interview; "I don't know" is a valid answer.
