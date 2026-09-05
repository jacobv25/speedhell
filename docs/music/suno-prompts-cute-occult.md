# Suno prompts — cute-occult direction (2026-09-05)

Written for Jacob's Suno Studio after the r62 art verdict. Instrumental only.
How the game uses tracks (`src/audio.js`, memory: audio architecture):

- **Stage** plays from ~0:03 and never loops within a run (a clear is ~2.5 min;
  the referee's expert run is 8685 frames ≈ 2:25). Ask for ≥ 3:00 so it never
  runs dry. Flat energy is fine — the stage timeline supplies the drama.
- **Boss** enters at a full-energy section (the current track's first 39 s are
  a quiet intro the game skips) and loops back to that section on the beat
  grid. A boss fight is 35–70 s. Ask for the drop to arrive by ~0:20 and for a
  section that loops cleanly.
- **Menu/title** is new — the game is silent on the title today (arcade pause
  = silence). A loopable 1:30–2:00 piece is enough.

The old tracks' prompts sold "Japanese arcade chiptune, 170 BPM, neon-bright".
The new world is a cosy-creepy crypt: skull acolytes, candles, moth wings,
sigils, a witch on a broom. Keep the arcade drive; swap neon for wax and bone.

---

## 1. Title / menu — "Votive"

> Instrumental title-screen loop for a cute-occult arcade shoot-em-up. Slow-burn
> 96 BPM, half-time feel. A music box and a detuned celesta carry a sweet minor
> lullaby melody over a low church organ drone and a soft heartbeat kick; a
> distant children's choir "ooh" pad and a single bowed saw hum underneath. Tiny
> chiptune arpeggios flicker in and out like candle flames. Occasional bone
> xylophone clicks and a reversed cymbal breath. Cosy-creepy, playful, not
> scary — Cult of the Lamb meets a Castlevania save room. Mix: warm, dusty, a
> little lo-fi tape hiss, wide stereo, plenty of headroom. Loops seamlessly.
> No vocals, no lyrics.

## 2. Stage 1 — "Skull Parade"

> Instrumental stage theme for a fast cute-occult bullet-hell arcade shooter.
> Brisk 165 BPM, driving four-on-the-floor with punchy chiptune drums and a
> galloping FM bass. Lead is a bright square-wave melody with a witchy, slightly
> mischievous minor-key hook, answered by a harpsichord counter-riff and a pipe
> organ stab on the downbeats. A ghostly choir "ah" pad and a tolling bell mark
> the section changes; a marching snare roll and tambourine keep the parade
> feel. Structure: 4-bar organ-and-bell intro, then A (lead + bass), B (organ
> stabs + choir lift, octave bass), a short breakdown on music box and
> heartbeat kick, then A' with extra counter-melody and crash hits; keep the
> energy steady rather than building to one climax. Cosy-creepy, cute, upbeat
> — a Halloween parade of skulls, not a horror film. Mix: crisp, glossy arcade
> top end, gothic reverb tails on organ and bell, tight low end. At least 3
> minutes. No vocals, no lyrics.

## 3. Stage 1 boss — "The Reliquary Opens"

> Instrumental boss theme for a cute-occult bullet-hell arcade shooter. 172 BPM,
> relentless. Opens with a 4-second organ chord and a single bell toll, then the
> drop hits by 0:15: hammering chiptune drums, a distorted square-wave bass
> ostinato, a full pipe organ toccata riff and a Latin-sounding choir chanting
> short syllables in rhythm (wordless, no real lyrics). Razor arpeggios climb
> over it; a harpsichord tremolo and church bells clang on the turnarounds.
> The middle section widens into a tense counter-melody with a heartbeat kick
> and whispering choir, then the final section stacks the toccata, the arps
> and the chant together and slams to the end. Every section should loop
> cleanly on the beat. Dramatic and theatrical, a giant eye opening in a
> cathedral, but still playful — Castlevania boss meets Cult of the Lamb. Mix:
> loud, punchy, cabinet-filling, gothic reverb on organ and choir only, drums
> and bass bone-dry. No vocals with words.

---

### Alternates to try if a first pass lands wrong

- Stage too spooky → drop the choir, keep organ + harpsichord + music box.
- Boss too orchestral → replace pipe organ with a detuned FM organ and push
  the chiptune drums; keep the chant.
- Menu too sleepy → 110 BPM, add a soft chiptune arp pulse.
- Ask Suno for "Japanese arcade shoot-em-up" in every prompt if the drums go
  soft; that phrase is what kept the old tracks tight.

### After generation

Drop the files in `assets/music/`, then run the analysis the old tracks have
(`docs/music/*.json`: tempo, first beat, segments) so `audio.js` gets the boss
entry point and loop target on the beat grid.
