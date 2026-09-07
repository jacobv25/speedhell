# tools/music — the music lab

Pull a track apart (Demucs stems), lay it on a beat/bar grid, and mark the moments
the boss should answer. Output is a small cues file the game can read; the big
derived audio is gitignored and regenerable.

## Pieces

| path | what | committed? |
|---|---|---|
| `analyze.py` | Demucs → 4 stems, then librosa beat grid / bar phase / sections / per-stem onsets | yes |
| `setup.sh` | one-time Python env (`.venv/`, needs `uv` + `ffmpeg`) | yes (env no) |
| `lab.html` | browser tool: stem lanes with solo/mute, bar ruler, loop, slow playback, marker table | yes |
| `docs/music/<track>.analysis.json` | grid + onsets the lab draws | yes |
| `docs/music/<track>.cues.json` | **the deliverable** — Jacob's marks (time, bar, kind, label, notes) | yes |
| `assets/music/stems/<track>/*.m4a` | stems for the browser (+ `.wav` for analysis) | no |

## Use

```sh
sh tools/music/setup.sh                                  # once
tools/music/.venv/bin/python tools/music/analyze.py assets/music/insert-coin-skies.mp3 --bpm 172
node tools/booth-server.mjs 8002                         # serves the repo + the lab's save endpoint
open http://localhost:8002/tools/music/lab.html          # ?track=<name> for another track
```

Click once to unlock audio. `M` drops a mark at the playhead (snapped to the beat),
`shift+M` sets the selected mark's end, `save` writes `docs/music/<track>.cues.json`.
Marks also autosave in the browser, so a crashed server loses nothing.

## Cue kinds

`intro` (pre-fight talk) · `phase` (boss phase boundary) · `pattern` (a bullet
pattern the music suggests) · `transition` (feel change → switch pattern) ·
`cosmetic` (renderer-only pulse/flash) · `note`.

## Sync rule (don't break the referee)

The core never reads the audio clock. Cues are authored on the song's timeline and
the boss consumes them on its own frame clock (`game_t` = song time − `gameOffset`);
the audio element is nudged to the sim, never the reverse. Cosmetic cues may follow
the audio clock in the renderer.
