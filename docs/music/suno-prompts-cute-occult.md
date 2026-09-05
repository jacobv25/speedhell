# Suno prompts — cute-occult direction (v2, 2026-09-05)

Written for Jacob's Suno Studio after the r62 art verdict. Instrumental only.
v2 rewrites v1 after checking current Suno prompting guidance (sources at the
end): the STYLE field takes ~1,000 characters on v5/v5.5 and truncates silently,
weights the first tags hardest (genre → mood → instruments → BPM), works best at
5–8 tags and 80–200 words, and structure belongs in the LYRICS box as bracket
metatags, not in the style text. Numbers beat adjectives ("165 BPM", "3:00").
Loopable tracks want "seamless loop / no fade-out / consistent energy". Every
style below is under 700 characters so nothing gets cut.

How the game uses tracks (`src/audio.js`; memory: audio architecture):

- **Stage** plays from ~0:03 and never loops within a run (a clear is ~2:25).
  Ask for ≥ 3:00. Steady energy is right — the stage timeline supplies the drama.
- **Boss** enters at a full-energy section and loops back to it on the beat
  grid; a fight is 35–70 s. Ask for the drop by ~0:15 and loop-safe sections.
- **Title** is a new slot (the game is silent on the title today). 1:30–2:00 loop.

Turn ON the Instrumental toggle for all three. If your Studio build shows an
"Exclude styles" field, put `vocals, lyrics, lo-fi hip hop` there for the stage
and boss tracks. Paste the STYLE block into Styles and the LYRICS block into
Lyrics (it contains only section tags — no words to sing).

---

## 1. Title / menu — "Votive"

**STYLE**
> Cute-occult video game title theme, cosy-creepy, playful. Music box and
> detuned celesta lullaby melody in a minor key over a low pipe organ drone,
> soft heartbeat kick, distant wordless children's choir pad, faint NES-style
> square-wave arpeggios flickering like candles, bone xylophone clicks. 96 BPM,
> half-time feel. Warm, dusty, light tape hiss, wide stereo, lots of headroom.
> Seamless loop, consistent energy, no fade-out, no big ending. Instrumental,
> no vocals. Cult of the Lamb meets a Castlevania save room.

**LYRICS**
```
[Instrumental]
[Intro: organ drone and heartbeat, 4 bars]
[Theme: music box melody]
[Variation: celesta takes the melody, choir pad enters]
[Theme: music box melody with square-wave arpeggio]
[Loop back to Theme, no outro]
```

## 2. Stage 1 — "Skull Parade"

**STYLE**
> Japanese arcade shoot-em-up chiptune, cute-occult, mischievous and upbeat.
> 165 BPM four-on-the-floor. Punchy 8-bit drums, galloping Yamaha FM bass,
> bright square-wave lead with a witchy minor-key hook, harpsichord
> counter-riff, pipe organ stabs on the downbeats, ghostly wordless choir pad,
> tolling bell on section changes, marching snare rolls, tambourine. Steady
> energy throughout, no single climax, no fade-out. Crisp glossy arcade top
> end, gothic reverb on organ and bell only, tight dry low end. At least 3
> minutes. Instrumental, no vocals. A Halloween parade of skulls, not a horror
> film.

**LYRICS**
```
[Instrumental]
[Intro: organ chord and bell toll, 4 bars]
[Verse: square-wave lead over galloping FM bass]
[Chorus: pipe organ stabs, choir pad lift, octave bass]
[Verse: lead returns with harpsichord counter-riff]
[Breakdown: music box and heartbeat kick, 8 bars]
[Chorus: full stack with crash hits]
[Verse: extra counter-melody]
[Chorus]
[Outro: hold energy, cut clean, no fade]
```

## 3. Stage 1 boss — "The Reliquary Opens"

**STYLE**
> Japanese arcade shoot-em-up boss theme, cute-occult, dramatic, theatrical,
> relentless. 172 BPM. Hammering 8-bit drums, distorted square-wave bass
> ostinato, full pipe organ toccata riff, rhythmic wordless Latin-style choir
> chant, razor-sharp climbing arpeggios, harpsichord tremolo, clanging church
> bells on turnarounds, heartbeat kick in the breakdown. Drop hits within 15
> seconds. Every section loop-safe on the beat, consistent energy, no fade-out.
> Loud, punchy, cabinet-filling mix; gothic reverb on organ and choir only,
> drums and bass bone-dry. Instrumental, no vocals with words. Castlevania boss
> meets Cult of the Lamb; a giant eye opening in a cathedral.

**LYRICS**
```
[Instrumental]
[Intro: organ chord and single bell toll, 4 seconds]
[Drop: hammering drums, square bass ostinato, organ toccata, choir chant]
[Verse: arpeggios climb over the toccata]
[Bridge: tense counter-melody, heartbeat kick, whispering choir]
[Drop: toccata, arpeggios and chant stacked]
[Final: everything, church bells, slam]
[Loop back to Drop, no outro]
```

---

### If a first pass lands wrong

- Stage too spooky → drop "choir pad", keep organ + harpsichord + music box.
- Boss too orchestral → replace "pipe organ" with "detuned FM organ" and add
  "NES 2A03 drums"; keep the chant.
- Menu too sleepy → 110 BPM and add "soft chiptune arp pulse".
- Tempo drifts (the old stage track came out at 123 BPM despite asking for
  170) → state the BPM in the first sentence and delete any mood word that
  contradicts it ("dreamy", "lullaby" pull tempo down; keep those for the title
  only).
- Tags are hints, not commands. If a section tag is ignored, regenerate or
  simplify its wording rather than adding more tags.

### After generation

Drop the files in `assets/music/`, run the same analysis the old tracks have
(`docs/music/*.json`: tempo, first beat, segments) so `audio.js` gets the boss
entry point and loop target on the beat grid, then A/B against the current
tracks in a playtest before swapping.

### Sources

- Suno AI Prompt Guide 2026 — roo.beehiiv.com (1,000-char v5 limit, silent
  truncation, tag weighting, 5–8 tags)
- 50+ Tested Prompts & Styles for Suno v5 — Seven Sky Writes, Medium (genre →
  mood → instruments → BPM formula; numbers beat adjectives; 80–200 words)
- Where to Put Suno Prompts: Styles vs Lyrics — Jack Righteous (structure and
  local cues go in Lyrics)
- Suno Meta Tags Guide — sunometatagcreator.com; Suno Guide V5.5 —
  blakecrosley.com (bracket tags on their own line; probabilistic)
- Suno Instrumental Prompts That Stay Vocal-Free — hookgenius.app
- Suno for Game Developers / Gaming Music Prompts — hookgenius.app (seamless
  loop, no intro/outro, consistent energy, "loopable" for boss fights)
