# SUNO PROMPTS — v3 ONLY (Deathsmiles gothic rock). Older versions deleted.

Form settings for all three: v5.5, Advanced tab, **Instrumental toggle OFF**
(the wordless female vocal is wanted). Paste STYLE into Styles, LYRICS into
Lyrics. Don't tap the suggestion chips under Styles.

---

## 1. TITLE / MENU — "Votive"

**STYLE**
```
Gothic video game title theme, haunting, elegant, melancholy. Wordless female soprano "ah" vocal floating over a harpsichord arpeggio and a low pipe organ drone, string quartet swells, soft heartbeat kick, a single clean electric guitar line answering the voice, music box on the turnaround. 92 BPM, half-time. Warm cathedral reverb, wide stereo, plenty of headroom, no distortion. Seamless loop, consistent energy, no fade-out, no big ending. Deathsmiles meets Castlevania: Symphony of the Night save room.
```

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

---

## 2. STAGE 1 — COVER of Skyline Breaker (preferred; Jacob 2026-09-05: the original "felt very introductory")

Use Suno **Cover** on `assets/music/skyline-breaker.mp3`. Keep Audio Influence
high (melody survives), Style Influence moderate. Output must stay ~3:00+ (the
stage never loops in a run); Extend if it comes out short.

**Variant A — Instrumental toggle ON (start here)**
```
Gothic arcade rock cover, keep the original melody, structure and 123 BPM tempo. First-stage energy: bright, brisk, introductory, not heavy. Harpsichord carries the main melody, clean electric guitar doubles it, pipe organ chords under the chorus, string section swells, tolling bell on section changes, real rock drum kit with light double-kick fills, chiptune square-wave arps as sparkle. One short tasteful guitar lead near the end, no shredding. Steady energy, no fade-out. Crisp, glossy arcade mix; cathedral reverb on organ and strings only; drums and guitar dry. Deathsmiles meets Castlevania stage one.
```

**Variant B — with the wordless vocal, Instrumental toggle OFF**
```
Gothic arcade rock cover, keep the original melody, structure and 123 BPM tempo. First-stage energy: bright, brisk, introductory, not heavy. Harpsichord carries the main melody, clean electric guitar doubles it, haunting wordless female soprano "ah" pad behind the chorus, pipe organ chords, string section swells, tolling bell on section changes, real rock drum kit with light double-kick fills, chiptune square-wave arps as sparkle. One short tasteful guitar lead near the end, no shredding. Steady energy, no fade-out. Crisp, glossy arcade mix; cathedral reverb on organ, strings and voice only; drums and guitar dry. No lyrics. Deathsmiles meets Castlevania stage one.
```
Lyrics box for B:
```
[Female vocals: wordless, haunting, in the background]
Ah… ah… ah…
```

---

## 2b. STAGE 1 — from scratch — "Skull Parade" (fallback; the first take went too hard for stage 1)

**STYLE**
```
Japanese arcade shoot-em-up gothic rock, Deathsmiles style, upbeat and mischievous. 165 BPM driving rock drum kit with double-kick fills, palm-muted electric guitar riff, harpsichord counter-melody, pipe organ stabs on the downbeats, string section hits, haunting wordless female soprano "ah" backing vocal, tolling bell on section changes, chiptune square-wave arps as sparkle. One face-melting electric guitar solo section with fast tapping and pinch harmonics. Steady energy throughout, no fade-out. Crisp, loud, glossy arcade mix; cathedral reverb on organ, strings and voice only; guitar and drums tight and dry. At least 3 minutes. No lyrics, no spoken words.
```

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

---

## 3. STAGE 1 BOSS — "The Reliquary Opens" (Jacob: the first gothic generation "could work great for the boss music" — this is the fallback if it needs a redo)

**STYLE**
```
Japanese arcade shoot-em-up boss theme, gothic metal, Deathsmiles style, relentless, theatrical. 172 BPM. Hammering double-kick drums, distorted down-picked electric guitar riff, pipe organ toccata, harpsichord tremolo, string section stabs, haunting wordless female soprano "ah" wailing over the riff, church bells on turnarounds, razor chiptune arpeggios. Two face-melting guitar solo sections: fast alternate picking, tapping, whammy dives, pinch harmonics. Drop within 15 seconds. Every section loop-safe on the beat, consistent energy, no fade-out. Loud, punchy, cabinet-filling; cathedral reverb on organ, strings and voice only; guitar, bass and drums bone-dry. No lyrics, no spoken words. A giant eye opening in a cathedral.
```

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
---

## Notes (read only if a generation lands wrong)

Direction (Jacob, 2026-09-05): "more deathsmiles inspired than cult of the
lamb … i like the haunting female vocals in the background … i miss the
insane, face melting guitar solos that are in Insert Coin Skies." Reference is
CAVE's Deathsmiles (Manabu Namiki): gothic-baroque arcade rock — harpsichord,
pipe organ and strings driven by electric guitar and a real drum kit, chip
accents on top.

Prompting rules applied (sources below): style field ≤ ~1,000 characters and
truncates silently (these are 507 / 665 / 732); genre → mood → instruments →
BPM; 5–8 tags; structure as bracket tags in the Lyrics box; numbers over
adjectives; loop cues spelled out. The "Ah…" lines keep the vocal wordless.

How the game uses tracks (`src/audio.js`): stage plays from ~0:03 and never
loops in a run (a clear is ~2:25) → ≥ 3:00, steady energy. Boss enters at a
full-energy section and loops back to it on the beat grid; a fight is 35–70 s
→ drop by ~0:15, loop-safe sections. Title is a new slot → 1:30–2:00 loop.

If a first pass lands wrong:

- Guitar too polite → move "face-melting electric guitar solo" to the second
  sentence of the style; add "Yngwie Malmsteen neoclassical" as a reference.
- Vocals turn into words → regenerate; then thin the "Ah…" lines to one per
  section; then Exclude styles (if shown): `lyrics, spoken words, rap`.
- Too much orchestra, not enough arcade → add "NES 2A03 drums" and "Yamaha FM
  bass"; drop "string section".
- Tempo drifts (the old stage track came out at 123 BPM despite asking for
  170) → BPM in the first sentence; delete any mood word that pulls slow.
- Tags are hints, not commands. If a section tag is ignored, regenerate or
  simplify its wording rather than adding more tags.

After generation: drop the files in `assets/music/`, run the same analysis the
old tracks have (`docs/music/*.json`: tempo, first beat, segments) so
`audio.js` gets the boss entry point and loop target on the beat grid, then A/B
against the current tracks in a playtest before swapping.

Sources: Suno AI Prompt Guide 2026 (roo.beehiiv.com); 50+ Tested Prompts for
Suno v5 (Seven Sky Writes, Medium); Where to Put Suno Prompts (Jack Righteous);
Suno Meta Tags Guide (sunometatagcreator.com); Suno Guide V5.5
(blakecrosley.com); Suno for Game Developers / Gaming Music Prompts
(hookgenius.app).
