# SPEEDHELL — Session Handoff (2026-08-24)

## State: SOUND LANDED (r7-sfx) on top of ROUND 6 ✅

- 2026-08-24: Jacob's first post-r6 idea was SFX + music. Shipped as `src/audio.js`:
  procedural Web Audio SFX (shot/hit/kill/big-kill/phase/speed/rush/item/cancel/
  bomb/die/warning/midboss/boss/clear/gameover) + music: `assets/music/skyline-breaker.mp3`
  (stage) → WARNING ducks it → `insert-coin-skies.mp3` at the boss gate → fade on
  clear/gameover. Core stays DOM-free: it only pushes ids into a 32-slot ring
  (`g.sfx`/`g.sfxN`, reset each frame; `sfx(g, id)` in game.js) that main.js drains.
  M = mute (persisted). Sim 16/16 green, shots harness green after the change.
  NOT yet pushed to the public build / not yet playtested by Jacob with sound on —
  tune levels (MUSIC_VOL/SFX_VOL in audio.js) to his ear first.

## Previous state: ROUND 6 SHIPPED ✅ — public build is live with the boss theatre

- **d2d5818** closed round 6 after 6 iterations (Jacob authorized r6.4/r6.5/r6.6,
  then the referee arbitrated the ship tree: r6.5 balance + r6.6 housekeeping).
  Theatre upheld 4x by fresh critics; camp economy under 14 referee checks;
  the stutter class ships as a documented residual with its own law
  (s6_stutter_residual); mortal forms of every camp strategy die.
- **Public**: repo github.com/jacobv25/speedhell · play jacobv25.github.io/speedhell
  · portfolio card deployed on jacobv25's portfolio-site (all Jacob-approved).
- Jacob playtested r6.3-era tree: "plays pretty well." He has NEW IDEAS not yet
  captured — ASK HIM FIRST before briefing r7.

## Left to do (priority order)

1. **Jacob's new playtest ideas** — first one (sound) done; ask if there are more.
   Sound follow-ups: playtest levels, maybe a title-screen jingle/attract loop.
2. R7 stagecraft package (docs/HOMAGE_STUDY.md): set-piece hull hosting turret
   alley, release-as-boss-approach, chain-route audit.
3. R8 receipt package: itemized stage-clear tally.
4. Consolidated review of the camp governor (most complex subsystem in the
   codebase — flagged by builder and critics; post-ship cleanup candidate).
5. Later: loop 2 revenge-dot bullet-diff, countdown meter, boss briefing card,
   sound (Web Audio), r5 nits (gold popup outline, HUD-strip dim).

## Gotchas (hard-won)

- **The Mac sleeping kills agents mid-response** — every "stalled" agent this
  session was the machine dozing; resume via SendMessage recovers them. Use
  caffeinate for long autonomous runs.
- s6_nocamp/s4_entrance_armor are law now: any boss change must pass 8 camp
  probes + descent-HP check. s7_robust runs 6 seeds — green-on-one-seed can't
  happen again. s7_pressure sits at ~24.7 vs 24.0 — tightest tripwire.
- Builders never touch test/, docs/, evidence/. Referee changes land first,
  in separate commits. 2 fresh blind critics close a round; adversarial
  re-probes (critics writing their own exploit bots) are what caught
  everything the metrics missed — keep that pattern.
- Comment drift in the governor bit three critic rounds — comments were trued
  in the ship tree; keep them honest on any governor edit.
- `node test/sim.mjs` now takes minutes (6 robust seeds + 10 camp/mortal
  probes); the sim and shots harnesses are the referee — all 14 checks green
  at d2d5818, replay guard MATCH.

## Next first step

Ask Jacob for his playtest ideas, then brief r7 (stagecraft) with them folded
in. Verify green first: `cd ~/Dev/speedhell && node test/sim.mjs`.
