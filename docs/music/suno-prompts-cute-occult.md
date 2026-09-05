# Suno prompts — cute-occult direction (v3, 2026-09-05)

For Jacob's Suno Studio (v5.5, Advanced tab). v3 after the first generations:
Jacob — "castlevania is a fine inspo but i dont think cult of the lamb fits.
more deathsmiles inspired … i like the haunting female vocals in the background
… i miss the insane, face melting guitar solos that are in Insert Coin Skies."

So the reference is CAVE's **Deathsmiles** (Manabu Namiki): gothic-baroque
arcade rock — harpsichord, pipe organ and strings *driven by* electric guitar
and a real drum kit, with chip accents on top. Haunting wordless female vocals
stay. Every stage and boss track gets a shredding guitar solo section.

Prompting rules kept from v2 (sources at the end): style field ≤ ~1,000 chars
(truncates silently), genre → mood → instruments → BPM, 5–8 tags, structure as
bracket tags in the Lyrics box, numbers over adjectives, loop cues spelled out.
All three styles below are under 750 characters.

**Vocals:** the tracks WANT wordless female vocals, so leave the Instrumental
toggle OFF for the stage and boss. The Lyrics box carries only "ah" syllables
under the vocal sections, so Suno sings without words. If a generation invents
lyrics anyway, regenerate; if it keeps doing it, add `spoken words, lyrics,
rap` to Exclude styles (if your build shows that field).

How the game uses tracks (`src/audio.js`): **stage** plays from ~0:03 and never
loops in a run (a clear is ~2:25) → ask for ≥ 3:00, steady energy; **boss**
enters at a full-energy section and loops back to it on the beat grid, a fight
is 35–70 s → drop by ~0:15, loop-safe sections; **title** is a new slot → a
1:30–2:00 seamless loop.

---

## 1. Title / menu — "Votive"

**STYLE** (Instrumental toggle OFF — the vocal is the point)
> Gothic video game title theme, haunting, elegant, melancholy. Wordless female
> soprano "ah" vocal floating over a harpsichord arpeggio and a low pipe organ
> drone, string quartet swells, soft heartbeat kick, a single clean electric
> guitar line answering the voice, music box on the turnaround. 92 BPM,
> half-time. Warm cathedral reverb, wide stereo, plenty of headroom, no
> distortion. Seamless loop, consistent energy, no fade-out, no big ending.
> Deathsmiles meets Castlevania: Symphony of the Night save room.

**LYRICS**
```
[Intro: organ drone and heartbeat, 4 bars]
[Theme: harpsichord arpeggio, clean guitar line]
[Female vocals: wordless, haunting]
Ah… ah… ah…
[Variation: strings swell, music box on the turnaround]
Ah… ah…
[Loop back to Theme, no outro]
```

## 2. Stage 1 — "Skull Parade"

**STYLE**
> Japanese arcade shoot-em-up gothic rock, Deathsmiles style, upbeat and
> mischievous. 165 BPM driving rock drum kit with double-kick fills, palm-muted
> electric guitar riff, harpsichord counter-melody, pipe organ stabs on the
> downbeats, string section hits, haunting wordless female soprano "ah"
> backing vocal, tolling bell on section changes, chiptune square-wave arps as
> sparkle. One face-melting electric guitar solo section with fast tapping and
> pinch harmonics. Steady energy throughout, no fade-out. Crisp, loud, glossy
> arcade mix; cathedral reverb on organ, strings and voice only; guitar and
> drums tight and dry. At least 3 minutes. No lyrics, no spoken words.

**LYRICS**
```
[Intro: organ chord, bell toll, drum fill, 4 bars]
[Verse: palm-muted guitar riff, harpsichord counter-melody]
[Chorus: organ stabs, string hits, guitar lead melody]
[Female vocals: wordless, haunting, in the background]
Ah… ah… ah…
[Verse: riff returns, square-wave arps on top]
[Guitar Solo: fast, shredding, tapping, pinch harmonics, 16 bars]
[Chorus: full stack, crash hits]
Ah… ah…
[Verse: extra counter-melody]
[Chorus]
Ah… ah… ah…
[Outro: hold energy, cut clean, no fade]
```

## 3. Stage 1 boss — "The Reliquary Opens"

**STYLE**
> Japanese arcade shoot-em-up boss theme, gothic metal, Deathsmiles style,
> relentless, theatrical. 172 BPM. Hammering double-kick drums, distorted
> down-picked electric guitar riff, pipe organ toccata, harpsichord tremolo,
> string section stabs, haunting wordless female soprano "ah" wailing over the
> riff, church bells on turnarounds, razor chiptune arpeggios. Two face-melting
> guitar solo sections: fast alternate picking, tapping, whammy dives, pinch
> harmonics. Drop within 15 seconds. Every section loop-safe on the beat,
> consistent energy, no fade-out. Loud, punchy, cabinet-filling; cathedral
> reverb on organ, strings and voice only; guitar, bass and drums bone-dry. No
> lyrics, no spoken words. A giant eye opening in a cathedral.

**LYRICS**
```
[Intro: organ chord and single bell toll, 4 seconds]
[Drop: double-kick drums, down-picked riff, organ toccata]
[Female vocals: wordless, wailing, haunting]
Ah… ah… ah…
[Verse: chiptune arpeggios climb over the riff]
[Guitar Solo: shredding, tapping, whammy dives, 16 bars]
[Bridge: harpsichord tremolo, string stabs, heartbeat kick, whispered ah]
Ah…
[Drop: riff, toccata and vocal stacked]
[Guitar Solo: faster, higher, pinch harmonics, 8 bars]
[Final: everything, church bells, slam]
Ah… ah… ah…
[Loop back to Drop, no outro]
```

---

### If a first pass lands wrong

- Guitar too polite → move "face-melting electric guitar solo" to the second
  sentence of the style, and add "Yngwie Malmsteen neoclassical" as a
  reference phrase.
- Vocals turn into words → regenerate; then reduce the "Ah…" lines to one per
  section; then Exclude styles: `lyrics, spoken words, rap`.
- Too much orchestra, not enough arcade → add "NES 2A03 drums" and "Yamaha FM
  bass" to the instruments and drop "string section".
- Tempo drifts (the old stage track came out at 123 BPM despite asking for
  170) → BPM in the first sentence, delete any mood word that pulls slow.
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
  mood → instruments → BPM; numbers beat adjectives; 80–200 words)
- Where to Put Suno Prompts: Styles vs Lyrics — Jack Righteous (structure and
  local cues go in Lyrics)
- Suno Meta Tags Guide — sunometatagcreator.com; Suno Guide V5.5 —
  blakecrosley.com (bracket tags on their own line; probabilistic)
- Suno for Game Developers / Gaming Music Prompts — hookgenius.app (seamless
  loop, no intro/outro, consistent energy, "loopable" for boss fights)
