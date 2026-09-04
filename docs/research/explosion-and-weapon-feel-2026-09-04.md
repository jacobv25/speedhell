# Explosion and weapon feel — Lazy Devs recipe × Mark MSX on DoDonPachi DaiOuJou

*Commissioned 2026-09-04 while Jacob A/B'd the r51/r52 Lab explosion looks and
played DOJ (ddpdojb, MAME core) side by side. Sources: four Lazy Devs Pico-8
episodes (auto-transcripts, timestamps [mm:ss]) and two Electric Underground
DOJ reviews (transcripts filed in `~/Dev/mark-msx-research/transcripts/`).
Everything quoted is [F] — read from the fetched transcript.*

## 1. Mark MSX on why DOJ feels good (Re:Incarnation review, 2023-12-17)

The passage Jacob remembered is 03:17–05:30. Verbatim-ish:

> "This game is incredibly rich and interesting visually because it
> understands the concept of being **visually rewarding — everything you do
> in this game looks good.** When you blow up a tiny little tank it doesn't
> just vanish into a puff of smoke, it **explodes on top of an explosion, its
> parts break into pieces, it has different damage animations** — there's a
> lot of rich detail that makes killing things feel right." [03:27–03:57]

> "There's nothing more satisfying than when you fire up that hyper mechanic
> and you feel so powerful. I've talked about this in other reviews: **you
> want the player to feel powerful** — none of that Euro-shmup garbage where
> you give them little peashooters. DOJ hyper, you are dominating the screen,
> things are exploding, there's **explosions on top of the explosions, giant
> enemies, giant laser beam** — everything just looks so maximum and right and
> good." [03:57–04:27]

> "New players who don't understand what the hyper is even doing want to use
> it because it is just so awesome — and that added detail of having things
> **speed up and shoot at you faster** gives it an even more visceral, exciting
> feel." [04:55–05:15]

Two more that matter for us:

> Desaturated backgrounds: "it really makes the bullets pop … one little trick
> boghog showed me: take a screenshot and put it in black and white — when you
> look at DOJ even in black and white those bullets stand out." [05:44–06:39]
> (This is our S2 rule already; the B&W screenshot is a free test we should
> run on the chunky look, see §4.)

> Sound: "you hear the laser, you hear the explosion, then you hear the
> kick-ass tunes — everything blends into this visual-auditory magical
> experience." [08:57–09:08]

> "Difficulty creates meaning. It feels good when you get around the giant
> cannon, it feels good when you get through the rails without dying."
> [21:11–21:20] — the feel of power is earned against thorns, not handed out.

The PS2 review (2021-11-15) is a port review; its feel content is that the
port team "had three super players going at this game night and day to make
sure … the slowdown worked correctly, that it felt right." [02:45–03:05]

## 2. What DOJ actually does on screen (the mechanics behind the quotes)

Read straight off the arcade game (Jacob has it running); none of this is
sprite-count magic, it is *sequencing*:

- **Destruction is a sequence, not a frame.** Mid and large enemies show
  damage states (smoke, scorch, a turret popping off) *before* death, then a
  chain of explosion pops walks across the hull over roughly a second, then
  the sprite breaks into pieces that fall out, then a big terminal burst. Small
  popcorn gets one burst clearly larger than the sprite. This is "explosions
  on top of explosions" and "parts break into pieces" — presentation of a
  hp bar as *visible structural failure*.
- **Every hit is answered.** Shot and laser impacts draw a bright flare at the
  contact point and the enemy flashes; the laser has a fat impact blob that
  sits on the target. The player never wonders whether damage is landing.
- **Weapons are visually huge relative to their numbers.** The base shot is a
  wide fan of fat bullets; the laser is a thick beam; hyper makes both
  enormous and doubles the sound. The *feeling* of power is mostly
  pixels-on-screen and audio weight, and it is rationed (the hyper is a
  resource, and it makes enemies fire faster — power has a price).
- **Kill audio is heavy.** Low, thick explosion samples layered per size.
- **Backgrounds are desaturated so bullets own the saturation.** (S2.)

## 3. The Lazy Devs recipe (what r52 "chunky" implements)

Four episodes distilled (Better Explosions #15, Shockwaves #16, Advanced
Explosions #10, Blob Grapes #12): matter thrown outward that *stalls* (launch
fast, friction 0.85–0.9/frame); one blob per spoke that cools white → yellow
→ orange → dark red → grey smoke on its own offset clock and dies by
shrinking to zero; shaded opaque blobs (offset concentric circles, dark rim
→ highlight, centre blob on top); a structured six-spoke grape at a random
angle; grapes stacked and staggered so new puffs emerge from collapsing ones
(his stated plan, built in r52); a static two-frame flash; a constant-width
white shockwave under the particles; pixel-snapped positions. His stated
principles: "chunky and massive, it has volume … I want to see the violence
of the explosion, fast movements, but not too big" (#15 41:48); "the flash
should be brief, the smoke should persist" (#15 28:31); "the explosion is
kind of the thing that drives a shmup" (#10 06:04). None of the four episodes
use screen shake, hitstop or sound — the feel is motion, colour, volume.

## 4. SPEEDHELL against both (gap list)

| DOJ / Lazy Devs element | SPEEDHELL today | Gap |
|---|---|---|
| Burst-then-stall motion, colour clock, shaded opaque blobs, grape structure, 2f flash, ring under | r52 chunky (Lab) | built, awaiting verdict |
| Hit-flash on damage | 2-frame white flash (r8-fx, S4-MUST) | ✓ |
| Hit impact flare at contact point | 1–2 sparks + one tiny fire puff per hit | weak — DOJ's flare is a *blob* the size of the bullet |
| Pre-death damage states (smoke, scorch, parts off) | none — enemies are pristine until they vanish | **biggest gap** for mids/elites/midboss |
| Chain of pops walking the hull before the terminal burst | classic PHASE tier only (boss); chunky stacks grapes 5f apart | mids/elites get nothing |
| Sprite breaks into pieces | generic debris rects | debris is not *the sprite* |
| Explosion clearly bigger than sprite | ≥1.5× at every tier (r8-fx) | ✓ (boghog) |
| Weapon reads big; power moment rationed | shots: tall thin bolts, cap 6 on screen (Pillar 5); no hyper; speed-kill is the reward | the *natural meta* moment (speed kill, rush shower, cancel wall) is under-dressed |
| Heavy kill audio per size | KILL / KILL_BIG procedural | thin vs DOJ; audio pass is queued anyway |
| Desaturated bg, bullets own saturation | S2 rule, enforced | ✓ — run boghog's B&W screenshot test on chunky |

## 5. Options for the Lab (Jacob decides; nothing built)

All presentation, fx-rng only, referee-neutral; each is a Lab row with a
"current" default so testers A/B it, and each has a sunset per wiki §10.

1. **Destruction sequence for MED/BIG tiers** (DOJ "parts break into pieces"):
   at hp < 50 % a smoke trail + scorch tint; at hp < 25 % a part pops off as
   debris; on death a 3-pop chain across the sprite (10–14 f) *then* the
   terminal grape. Renderer + a tiny core hook (hp fraction is already known).
   Corpus: boghog "varied patterns, extra debris"; HOMAGE L7 destructible
   parts; S4-MUST punchy. Pushback: S2 — smoke must stay under bullets.
2. **Hit impact blob**: an opaque bullet-sized flare at the contact point that
   lives 3 f, scaled by shots landing per frame (point-blank looks like a
   laser). Answers "is my damage landing". Cheap.
3. **Sprite-shaped debris**: debris rects sized/tinted per enemy family so a
   turret sheds plate chunks and a fighter sheds wing slivers.
4. **Dress the natural meta, not the gun** (the Pillar 2/5-safe reading of
   "feel powerful"): a speed kill spawns one grape tier up; the rush shower
   (every 5th speed kill) gets the PHASE-style hull chain + the KILL_BIG sound;
   cancel walls get a per-bullet pop instead of a fade. Power is *earned* on
   the stopwatch, which is exactly MSX's "difficulty creates meaning" and why
   DOJ rations the hyper. No DPS change, no shot-cap change (Pillar 5).
5. **Kill audio weight** (queued audio pass): layer a low thump under KILL and
   KILL_BIG, pitch by tier — Mark's "you hear the laser, you hear the
   explosion" is half the feel and none of the Lazy Devs episodes cover it.

Recommended order: 4 then 1 — 4 is the one that is *about SPEEDHELL* rather
than about DOJ, and 1 is where Mark's own words point ("parts break into
pieces, different damage animations").

## 6. Verification note

The boghog black-and-white test is free with `tools/peek.mjs`: screenshot the
chunky strip, desaturate, confirm bullets still separate from the fireball.
Do it before any explosion look ships.
