# Making the player shot feel powerful — visual design of the basic shot in vertical shmups

*Research report, 2026-09-09, for SPEEDHELL (`~/Dev/speedhell`). Question from Jacob: the r75 bolt is "better but still a pea shooter — thoughts on making it even more juicy?" Scope: the BASIC shot's look and feel only — sprite, stream, muzzle, trail, impact, sound — not damage, cap or balance (those are locked: Pillar 5, standing conditions).*

## Executive summary

1. **The genre's own rulebook already says what to do, and we've done the smallest version of each item.** boghog's written "Bullet Hell Shmup Design 101" gives the order: speed → density → forgiving hitboxes; length that matches speed ("can be taken to ridiculous extremes and still look good"); "big, fat projectiles, huge messy streams… Chaos feels good!"; the stream is how the player *sees* the ship. [1] SPEEDHELL's r75 bolt is 5×20 px with an 8 px trail on a 427-px-tall field — proportionally shorter and neater than the references.
2. **The Lazy Devs "advanced shmup" code — the tutorial Jacob's explosions came from — uses effect durations 2–5× ours.** Read from the cart: fire every 2 frames at 30 fps, two bolts at x ±4 on a 128-px field, a 5-frame muzzle particle locked to the ship (≈10 frames at our 60 fps; ours is 2), a 5-frame hit-splash sprite on every hit (≈10 at 60; our blob lives 3), the enemy flashes 2 frames (≈4 at 60), a hit sound on every frame in which any shot lands, and the ship switches to a *firing frame* while shooting. [2]
3. **Vlambeer's "art of screenshake" list is the canonical juice checklist and about half of it applies to a shot stream** (animation, rate of fire, bigger bullets, muzzle flash, faster bullets, lower accuracy for dynamics, impact effect, hit reaction, permanence, weapon recoil). The half that doesn't — screenshake, hit pause, knockback — is either reserved for kills here (S4) or harmful to a 20-shots-per-second stream. [3][4]
4. **Readability is the hard limit, and the sources agree on how to keep it:** bright core next to a dark rim, the black-and-white test, enemy bullets always drawn on top, player family never sharing an enemy hue, outlines (double outline "for insurance"). [1][5]
5. **Ranked recipes for the 320×427 field** (below, §6): (1) longer, fatter bolt + longer trail; (2) a messier stream; (3) a real muzzle event with ship recoil; (4) a longer, layered impact; (5) hit-sound weight; (6) the firing frame. Everything renderer/audio-side except the impact spawn, which stays on the fx rng behind the existing `g.fxShot` gate.
6. **What we could not verify:** exact CAVE/Psikyo/Raizing shot sprite sizes and fire rates (no primary source reachable; forum lore only), the Vlambeer talk's own numbers (list taken from recreations), and anything specific about Gunvein's or Blue Revolver's shot art (the devlogs found don't cover it).

## 1. Where SPEEDHELL is today (r75, `feat/shot-look`)

| element | value | source |
|---|---|---|
| field | 320 × 427 px, pixel art | repo |
| ship | 28 px span | repo |
| shot speed | 9 px/frame at 60 fps (≈2.1 % of field height per frame) | repo |
| fire | every 3 frames, 2 bolts at x ±7, on-screen cap 6 (fires while ≤ 4 in flight) | repo |
| bolt sprite (r75) | 5 × 20 px: white 3-px head in a 1-px dark rim, violet body with a 1-px white spine, 2-px tail | r75 recap |
| trail | 8 px: two 2×4 ghosts at alpha 0.5 / 0.25 | r75 recap |
| muzzle | 2 frames (5×3 then 3×2 white) on both barrels | r75 recap |
| impact | opaque white disc r 2/3/4 px by hits-this-frame, 1-px violet rim, 3 frames; plus the r8 three sparks + one fire puff | r75 recap |
| hit feedback | enemy hit-flash (existing), `SFX.HIT` triangle 300→120 Hz, 0.04 s | repo |

Jacob's verdict on r75: "they all are improvements… but even though better than before still looks like a pea shooter."

## 2. What boghog's written 101 says (primary source) [1]

The Shooting section, in order of priority:

- **Speed first.** "A fast bullet is a powerful bullet, especially if you combine it with an appropriate bullet splash effect." Speed = immediate feedback = position tracking.
- **Length must match speed.** "In animation, a good way to convey the feeling of speed is by using motion blur (smears, trails). Length will create the illusion of motion and make bullets feel even faster. This can be taken to ridiculous extremes and still look good. The opposite will likely read poorly — short sprites will clash with fast travel speed and create a disconnect."
- **Density second.** "Make big, fat projectiles, huge messy streams, cluster bullets together and don't concern yourself with making things too neat and organised… Players want to feel powerful… Dense bullet streams create this illusion." "CAVE's shots are rarely too 'pretty' or organised, but they work. Chaos feels good!"
- **The stream is visibility.** "Players… will roughly estimate the ship's position based on the stream of bullets they shoot out… giving players thick, fast, noticeable bullet streams can not only enhance your game's feel, but also the visibility."
- **Smoothness comes from visuals**, not inertia: "beef up your shot/rate, add an afterimage (see Symphony of the Night/Megaman ZX)… have the ship leave trails (see Danmaku Unlimited 3)."
- **Forgiveness.** Huge shot hitboxes, no gaps or dead zones, emitters low, hits land while sitting on top of an enemy.
- **Power without balance change.** "Increase projectile width and height, increase their speed, make them look more saturated, add details to the shots, make damage sounds more powerful."
- **Hit polish.** "Hit indicators… flashing, damage particles/effects or shaking. Subtle hit sound effects. The player needs to feel it when they're doing damage."

## 3. What the Lazy Devs advanced shmup actually does (primary source: the cart) [2]

Read from `cowshmup.p8` in the public tutorial repository (Pico-8: 128×128, 30 fps):

| element | tutorial value | at 60 fps / our field |
|---|---|---|
| fire cadence | `shotwait = 2` frames | 4 frames (ours 3) |
| bolts | 2, at `x ± 4` (8 px apart on a 128-px field = 6 % of width) | ours ±7 = 4.4 % of 320 |
| shot speed | 6 px/frame on 128 px (4.7 % of height per frame) | ours 9 px on 427 (2.1 %) |
| shot sprite | animated (`anilib[3]`, animation speed 2) — the bolt itself cycles frames | ours static |
| spread | side velocity `±0.2` px/frame on normal shots (0 in hyper) — the stream is *not* perfectly straight | ours 0 |
| muzzle | a 5-frame particle (`maxage=5`, `anilib[5]`) *locked to the ship* on every volley | ≈10 frames (ours 2) |
| ship | `shotframe = true` while firing — the ship shows a firing sprite | ours none |
| hit splash | a 5-frame sprite particle (`anilib[7]`) at `y+4` of the contact point on *every* hit | ≈10 frames (ours 3) |
| enemy hit flash | `e.flash = 2` frames (white palette) | ≈4 frames |
| hit sound | `sfx(6)` on any frame in which any shot landed (rate-limited by the frame, ducked under big sounds) | ours per event |
| fire sound | one sfx per volley; a different one in hyper | ours per volley |

Notes: the tutorial author's own notes file lists the animation slots as flame, muzzle, shot, splash — muzzle and splash are first-class animated sprites, not single rects.

## 4. The Vlambeer checklist (secondary sources: recreations of the talk) [3][4]

The talk's order, as reconstructed by two recreations: baseline → animation → lower time-to-kill → **increase rate of fire** → **increase bullet size** → **muzzle flash** → **faster bullet** → **lower accuracy for more dynamics** → **impact effect** → **hit reaction** → enemy knockback → **permanence** → camera lerp → screenshake → player knockback → hit pause → **weapon recoil** → random enemy explosion. One recreation quotes hit-stop at "40 to 80 milliseconds" and stresses scaling shake to the event: "a pistol does not shake the screen like a rocket." [4]

Applicable to a shot stream (bold above): rate, size, muzzle, speed, *inaccuracy* (the "messy stream"), impact, hit reaction, permanence, recoil. Not applicable or already reserved: screenshake and hit pause belong to kills in SPEEDHELL (rubric S4, r8 fx hitstop on BIG kills); the hit-stop literature is about single heavy impacts, not 20 hits per second. [6]

## 5. Readability rules that bound every recipe [1][5][7]

- Bright next to dark: "very bright elements (the glowing cores) right next to dark elements (borders)". Test in black and white. [1]
- Outlines: "outlines are almost certainly necessary. For insurance, I sometimes use a double outline made of a bright and dark color." Two-frame flashing: "the more the frames contrast the more intense the effect." [5]
- Depth: enemy bullets always on top of player shots, items and explosions. [1] (SPEEDHELL draws player shots below enemy bullets — keep.)
- Colour: the player family never shares an enemy hue (SPEEDHELL S2: violet-white vs pink/cyan). [repo]
- "The whole thing doesn't need to flash white (it really hurts the eyes with bosses), but there needs to be some indication of it taking damage." [7]
- The cap: nothing may mask a 3-px enemy bullet core or the 6-px kill dot (SPEEDHELL §6.2 display contract).

## 6. Recipes for the 320×427 field, ranked by expected impact

Ranking = how much of the "pea shooter" reading each removes, weighted by source agreement. All values are starting points for a Lab A/B, not verdicts.

1. **Length and width to match the speed (bolt + trail = one 40–48 px streak).** Bolt 5×20 → **7×28 px** (3-px white head widened to 4, rim kept), trail 8 → **16–20 px** of stepped ghosts (4 ghosts at alpha 0.6/0.4/0.25/0.12, 2–3 px wide, integer snapped). At 9 px/frame a bolt then covers its own length in ~3 frames — the "smear" reading boghog describes. Sources: [1] length ∝ speed "to ridiculous extremes"; [3] bigger bullets. Cost: draw time ~+0.05 ms; readability unchanged (trail alpha under 0.6, bolt still under enemy bullets).
2. **A messier stream.** Per boghog and Vlambeer's "lower accuracy for more dynamics" and the tutorial's `±0.2` side velocity: give each bolt **±1 px x-jitter at spawn and ±0.15 px/frame drift** (render-only — the *hit* position must stay on the true straight line so DPS and hitboxes are untouched; drift is drawn, not simulated), and alternate which barrel spawns 1 frame early so the two rails don't fire in lockstep. Turns two straight rails into a stream. Sources: [1] "don't concern yourself with making things too neat"; [2] `sx = ±0.2`; [3].
3. **A real muzzle event + recoil.** 2 frames → **6 frames, three sizes** (7×4 → 5×3 → 3×2, white then violet), on both barrels, plus the ship sprite **recoils 1 px down for 2 frames** per volley (Vlambeer weapon recoil; Lazy Devs `shotframe` firing sprite). At 3-frame cadence the muzzle becomes a constant flicker at the nose — which is exactly the "the gun is firing" read the references have. Source: [2] 5-frame muzzle at 30 fps; [3].
4. **Longer, layered impact.** Blob 3 → **6 frames**, decaying 8→6→4→3→2→1 px, plus **2 sparks kicked upward** (the r8 sparks kick down; the tutorial's splash sits *above* the contact point at `y+4` — in screen terms, the splash rides on the enemy) and a 1-frame **enemy hit-flash reinforced to 2 frames** for popcorn (tutorial: 2 frames at 30 fps). Permanence: leave a 1-px scorch dot on the hull sprite for 10 frames (renderer-side, sprite cache untouched). Sources: [2] 5-frame splash; [1] "every hit is answered" (the research note of 2026-09-04); [3] impact + permanence.
5. **Hit-sound weight.** Tutorial rule: one hit sound per frame in which *any* shot landed, so point-blank becomes a buzz. SPEEDHELL's `SFX.HIT` is 0.04 s at 300→120 Hz; propose **a 2-layer hit**: the existing tick plus a 25-ms low click (150 Hz) mixed at −6 dB, and rate-limit to one per frame. Sources: [1] "make damage sounds more powerful", "subtle hit sound effects"; [2].
6. **Animated bolt.** The tutorial's shot sprite cycles 2 frames; give the bolt a **2-frame core shimmer** (spine 1 px ↔ 2 px). Cheap; SLYNYRD's "more contrast = more intense" applies. [2][5]
7. **Not recommended:** screenshake or hit-stop on shots (reserved for BIG kills; rapid-fire stop reads as stutter [6]); changing rate, cap, speed or damage (Pillar 5; boghog: power-ups "lie" — feel comes from width, length, saturation, detail, sound, not numbers [1]).

Suggested Lab shape: extend `shotLook` with a third choice **`heavy`** = recipes 1–6 together; keep `bolt` as the r75 middle step so Jacob can feel each jump. Ship B's angled bolts get the same sprite rotated.

## 7. What we don't know / where sources disagree

- **CAVE/Psikyo/Raizing sprite sizes and rates.** No primary source reachable; only the shmups.wiki hardware notes (DDP's 270-enemy-bullet cap, 57.55 Hz) and forum descriptions. [8] Treat "CAVE's shots are messy and fat" [1] as the usable claim, not any number.
- **The Vlambeer talk's own numbers** come from recreations and blog summaries, not a transcript. [3][4]
- **Gunvein / Blue Revolver / Danmaku Unlimited 3 shot art**: the devlogs and threads found discuss readability overhauls and colour coding (DU3: blue = player, pink/purple = enemy) but not shot construction. [9][10]
- **Hit-stop for rapid fire**: the hit-stop literature is fighting-game and single-impact; there is no source that measures it on a shot stream. [6]
- **Sound**: no source gives hit-sound layering numbers; §6.5 is an inference from the tutorial's per-frame rule and boghog's "make damage sounds more powerful".

## Sources

1. boghog, *Bullet Hell Shmup Design 101* (Google Doc; logged in the repo as `docs/research/bullet-hell-design-101.md`; mirrored at https://shmups.wiki/library/Boghog's_bullet_hell_shmup_101).
2. Lazy Devs Academy, *Pico-8 Hero — Advanced Shmup* tutorial code, `cowshmup.p8` and `notes.txt`, https://github.com/Krystman/lazydevs-pico8-advanced-shmup (read via the GitHub API, 2026-09-09); video series https://www.youtube.com/playlist?list=PLea8cjCua_P1o-xiQRf_QzqS2pMVlGnse (episodes #08 Shooting, #24 Bullets, #26 Splash).
3. DK Liao, "The art of screenshake" recreation (technique list), https://blog.chosenconcept.dev/posts/2022/11/0012-the-art-of-screenshake/ — after Jan Willem Nijman (Vlambeer), *The Art of Screenshake*, INDIGO Classes 2013, https://www.youtube.com/watch?v=AJdEqssNZ-U.
4. Search-summarised recreations of the same talk (hit-stop 40–80 ms; scale shake to the event), e.g. https://theengineeringofconsciousexperience.com/jan-willem-nijman-vlambeer-the-art-of-screenshake/ and https://crypticcreation.wordpress.com/2017/03/10/the-art-of-screenshake/.
5. SLYNYRD, *Pixelblog 31 — Shmup Design Part 1* (projectile outlines, double outline, two-frame flashing), https://www.slynyrd.com/blog/2020/12/14/pixelblog-31-shmup-sprite-design; *Pixelblog 32 — Part 2* (vulcan/laser/homing archetypes; "a slow fire rate should be compensated with power"), https://www.slynyrd.com/blog/2021/2/15/pixelblog-32-shmup-design-part-2.
6. Celia Wagar, "Hitstop/Hitfreeze/Hitlag/Hitpause", CritPoints, https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/.
7. Michael Molinari, "The Anatomy of a Shmup", Game Developer, 2010-02-18, https://www.gamedeveloper.com/design/the-anatomy-of-a-shmup.
8. Shmups Wiki, *DoDonPachi* / *DoDonPachi DaiOuJou* pages and the shmups.system11.org bullet-limit threads, https://shmups.wiki/library/DoDonPachi_DaiOuJou, https://shmups.system11.org/viewtopic.php?f=9&t=69466.
9. Blue Revolver greenlight thread (graphical overhaul for readability), https://shmups.system11.org/viewtopic.php?f=9&t=52710; Shmups Wiki, *Blue Revolver*, https://shmups.wiki/library/Blue_Revolver.
10. Shmups Wiki, *Danmaku Unlimited 3* (blue = player, pink/purple = enemy), https://shmups.wiki/library/Danmaku_Unlimited_3; Gunvein Q&A thread (no shot-art content), https://steamcommunity.com/app/2025840/discussions/0/4521134679765698637/.
11. SPEEDHELL repo: `docs/research/explosion-and-weapon-feel-2026-09-04.md` (DOJ "weapons visually huge", "every hit is answered"), `docs/BOGHOG_WORKSHOP.md` "Player shots", wiki §8 Q22, the r75 recap on `feat/shot-look`.
