# Plan — Idea 1: adaptive music (the stage cues the song)

*Written 2026-09-07 for a builder agent. Branch: start from `art/skins` (r62+).
Read `CLAUDE.md`, then `src/audio.js`, `src/main.js`, `docs/DESIGN_WIKI.md`
§10 (the Lab), and `tools/music/README.md` before touching anything.*

## Goal and exact result

Big stage moments jump the stage track to a matching musical section, snapped
to the next bar line, so every run hears the same musical story at the same
story beats no matter how fast the player clears. Today this exists for ONE
event: the boss track enters at 0:38.94 on its beat grid when the boss spawns
(`MUSIC.boss.start`). This plan generalises it to a small cue map.

What the player hears when it works: the midboss appears and the music lifts on
the downbeat; the s5 rush begins and the song is at its peak; the s7 release
is always the calm section; the boss track still takes over at the boss.
Nothing about the game changes — only which part of the song is playing.

## Non-negotiable constraints

1. **The core never reads the audio clock.** `src/core/` stays DOM-free and
   deterministic. All of this lives in `src/audio.js` + `src/main.js`. The sim
   (`test/sim.mjs`) never plays audio, so the referee is untouched.
2. **Presentation only.** No scoring, timeline, spawn, bullet or enemy change.
   No `g.rng`. Reading `g.stageT`, `g.state` and `g.enemies` from the shell is
   fine (main.js already does).
3. **Lab lifecycle (wiki §10).** Ship it as a Lab row `musicCues` with choices
   `off` (default until Jacob decides) / `on`. Default OFF so the referee and
   every existing playtest recording behave exactly as today.
4. **Builders never edit** `test/sim.mjs`, `docs/CRITIC_RUBRIC.md`, `evidence/`.
5. **Bump `BUILD`** in `src/version.js` (rN); wiki changelog line + a §10 Lab
   entry; say explicitly in your recap whether any other wiki section changed.
6. Keep the r30 rule: music volume rides `HTMLMediaElement.volume`, never a
   `MediaElementSource` gain (Safari bug — see the comment block in audio.js).

## Inputs you need first

- **The final stage track.** Jacob is generating a gothic cover of Skyline
  Breaker with Suno (`docs/music/suno-prompts-cute-occult.md` §2). Until it
  lands, build and test against the current `assets/music/skyline-breaker.mp3`
  (123 BPM, first beat 3.692 s, beat 0.4876 s; `docs/music/skyline-breaker.mp3.json`).
  Design the cue map as data so swapping the track = swapping one JSON.
- **Beat grid + sections** come from `tools/music/analyze.py` (Demucs + librosa;
  `sh tools/music/setup.sh` once; needs `uv` + `ffmpeg`). NOTE: `tools/music/`
  exists on disk but is UNTRACKED in git — commit `analyze.py`, `setup.sh`,
  `README.md`, `lab.html` as part of this work (the `.venv/` and stems are
  gitignored already). Its README describes a cues-file format
  (`docs/music/<track>.cues.json`, kinds intro/phase/pattern/transition/
  cosmetic/note); reuse that format — do not invent a second one.

## The cue map (data, not code)

`docs/music/<stage-track>.cues.json` gets `transition` cues, one per stage
moment. Stage moments the shell can detect each frame:

| cue id | trigger (shell-side) | musical section to jump to |
|---|---|---|
| `s1` | run start (`playMusic('stage')`) | track start (existing `start`) |
| `midboss` | first frame an enemy with `type === 4` exists | a lift / B-section |
| `rush` | `g.stageT` crosses `SEC_T[5]` = 2460 | the peak section |
| `release` | `g.stageT` crosses `SEC_T[7]` = 3700 | the calm section before the boss |
| (boss) | already handled: `SFX.BOSS` → `playMusic('boss')` | — |

Guardrails: max 4 cues; only jump to sections ≥ 8 bars long; never jump
backwards into a section that is shorter than the remaining distance to the
next cue (avoid double-jumps). `SEC_T` values mirror `src/render/renderer.js`
and `test/shots.html` — import or copy them with a comment, don't retype.

Pick the actual section times by listening in `tools/music/lab.html`
(`node tools/booth-server.mjs 8002`, open `/tools/music/lab.html?track=<name>`,
`M` drops a beat-snapped mark, `save` writes the cues file). Until Jacob's
final track exists, mark the current Skyline Breaker as a stand-in.

## Implementation, phase 1 (audio elements, ~half a day)

Keep the existing `<audio>` element per track; add bar-snapped seeking.

1. `src/audio.js`
   - `MUSIC[k]` gains `grid: { firstBeat, beat, bar: 4 }` (from the analysis
     JSON) and `cues: { midboss: t, rush: t, release: t }` (from the cues JSON;
     load it at unlock time with `fetch`, fall back to no cues on 404).
   - `export function cueMusic(id)`: if the Lab row is off, or no current stage
     track, or the cue is unknown → return. Otherwise compute the next bar line
     ≥ now + 60 ms on the grid (`firstBeat + n·beat·bar`), and `setTimeout`
     a seek to the cue time **quantised to the same bar phase** (so the seek
     target is also on a bar line: `cue + ((now − cue) mod barLen)` style —
     jump *forward in the song to the same beat position*). Arm only one
     pending jump; a newer cue replaces it.
   - The seek itself: a 1-beat crossfade using a SECOND element of the same
     source (`tracks.stageB`): start B at the cue target at level 0, fade A→0
     and B→1 over `beat` seconds via the existing `fadeTo` ticker, then swap
     which element is "current". That hides the element-seek jitter (tens of
     ms) and any waveform discontinuity.
   - `loopTo` stays; the `ended` handler must reference the active element.
   - Pause/resume (`pauseMusic`) must pause/resume whichever element is live
     and cancel a pending jump; `stopMusic` cancels it too.
2. `src/main.js`
   - After `update(g)` each frame (inside the same `if` that calls
     `audio.drain(g)`): detect `stageT` crossing `SEC_T[5]` / `SEC_T[7]` (keep a
     `lastStageT`) and the first midboss (`type === 4`) → `audio.cueMusic(id)`.
     Reset the "fired" set on `startRun`.
   - Practice/section select (r36) starts mid-stage: on `startRun(g, t)` with
     t ≥ a cue's trigger, jump immediately (no wait) so practice starts in the
     right section.
3. `src/lab.js`: row `{ id: 'musicCues', label: 'music cues', def: 'off',
   choices: [['off','current'],['on','stage moments cue the song']] }` →
   `audio.setMusicCues(v === 'on')`.
4. `src/version.js` BUILD bump; wiki §10 Lab entry + changelog.

## Phase 2 (only if phase 1's seams are audible)

Move music to decoded Web Audio buffers (`decodeAudioData` → `AudioBufferSourceNode`
+ `GainNode`, pure Web Audio so the r30 Safari issue does not apply): schedule
the next section's source at the exact bar-line `ac.currentTime`, crossfade
with gain automation over one beat. ~30 MB PCM per 3-minute track; fine on
desktop. Same public API (`playMusic/cueMusic/stopMusic/pauseMusic/duckMusic`),
so main.js does not change. Decide after Jacob listens to phase 1.

## Tests / acceptance

- `node test/shell.mjs` passes (it prints the Lab rows — the new row must
  appear only with `?lab`).
- Lab OFF: behaviour byte-identical to today (no seeks ever scheduled). Prove
  it by logging: zero `cueMusic` seeks in a full run with the row off.
- Lab ON, headless-ish check: add a tiny probe under `tools/probes/` that
  drives `makeGame`+`update` with a fake audio clock and asserts each cue fires
  once, in order, and that every scheduled seek target lands on a bar line
  (`(target − firstBeat) mod barLen < 5 ms`).
- Manual: full run with the row ON; the jumps land on downbeats; pause during a
  pending jump cancels it; practice start in s7 starts on the release section.
- Determinism: `git diff --stat src/core` is EMPTY.

## Out of scope

Beat-driven spawns or bullets (parked for good — the speed-kill caravan
fast-forwards `stageT`; see memory/wiki). Boss-track cues (already exists).
Idea 2 (beat pulses) is a separate plan: `docs/plans/beat-pulse.md`.

## Recap format for Jacob

Files touched; the cue table with the times you chose and why; BUILD rN;
wiki sections changed (or "none beyond §10 + changelog"); what you could not
verify without the final track.
