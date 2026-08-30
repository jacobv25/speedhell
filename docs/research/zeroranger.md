# ZeroRanger (System Erasure, 2018) — design research for SPEEDHELL

*2026-08-30. Web pass (14 searches, every load-bearing claim verified in fetched pages — [F]; [S] = snippet only) plus the local Mark MSX / boghog corpora. Companion to shmup-canon-three-holes-report.md and hitbox-display-report.md.*

## 1. The two-colour system (highest value for SPEEDHELL)

Not literally two colours: a **10-swatch fixed palette** — black, white, a 4-step green ramp (`#001d23 #003232 #004f4d #009479`), a 4-step orange ramp (`#ad2f17 #dd5928 #ff8000 #ffc073`) [F, wiki Palettes]. The semantic rule (TVTropes, verified): "green means safe, and orange means dangerous. The player ships, stage walls, and enemies (who… DON'T kill you on contact) are green, while enemy bullets and other sources of harm are orange."

**Hue = threat channel; value = identity channel.** Enemies, terrain and the player all share the safe ramp and differ by silhouette + value step; danger owns an entire hue exclusively. The ramps barely overlap in luminance, so orange pops even in greyscale. Enemy identity beyond that comes from Ikaruga's lesson, per the devs: "every enemy pattern is distinct from one another… minimize repetition" — pattern distinctness IS the identity system. Palette is an indexed post-process shader (alternates and the colourblind BLUE ORANGE are free); sprites drawn in MS Paint. Player hitbox 3×3px, unchanged even as the giant mecha — big green sprites are safe because hue + hitbox solve lethality, not sprite size. The HUD reuses the ramps as meters: the score counter itself is the extend indicator (dark→light orange = progress to the next life); the multiplier's colour is the entire "juice" display.

## 2. Stage structure and density

4 stages × two loops (the 8-stage arc; loop 2 is story-mandatory, remixing loop-1 material — midbosses return as true bosses, fake-outs). Per-stage lengths from a verified co-op longplay: **loop 1 escalates 2:20 → 4:15 → 6:15 → ~12:50** (stage 4 is a boss-rush finale); loop-2 stages run ~2:50–5:15; full 2-ALL ≈ 60 min. Every stage has ≥1 miniboss (no health bar, "Boss Break" scoring) plus a boss (health bars + timer). FINALBOSS is a one-off CAVE-parody bullet-hell dream stage — the only place bombs and infinite lives exist. **White Vanilla** (2020) is the score-attack arrange: sections remixed from the campaign, per-section grades, auto fast-forward on a cleared screen (speed-killing as the engine) — it began as an easy mode and was reworked into a mode.

Density philosophy: "emphasizes bullet/enemy pattern over bullet/enemy quantity" [S]; "layering setpieces and weapon unlocks and bosses in a way that always keeps things moving. Not a moment is wasted" [F, worldsbe.st]. Fully scripted spawns. Nobody has published enemy counts; the wiki has per-type HP/score tables.

## 3. Scoring and the continue economy

Score sources: tick damage (1/HP, unmultiplied), kill values × multiplier (cap ×6.4; melee kills push ×12.8 "OVERLOAD!!"), boss time bonus (remaining seconds × 100), life bonus (1,000/health; 8,888 for full 8), hidden SE-bonuses (1,000 doubling). The multiplier runs on an invisible "juice" meter shown only as its colour; kills/lock-ons/charge-absorbs refill it; empty juice halves the multiplier. Bosses drop the multiplier for the timer — **stages pay for chain upkeep, bosses pay for speed**. Speed-killing sections spawns golden 2× enemies; "overkill" (shooting a corpse until it flashes white) pays the enemy again.

**Continues as currency:** Green Orange starts with zero continues. Every game over pours that run's points into a Dharmachakra wheel; each fill = one continue (max 8, escalating cost), persisting across runs — *dying productively is progress*, and the meter teaches scoring. Extends are score-based and rubber-banded (threshold rises per life gained, falls when lives are lost). **The save wager:** at the end, all accumulated continues convert into lives for the TLB; lose them all and the save file is deleted (records survive). The continue bank you grind "for survival" is the thing the story asks you to stake. Wiki: "the intended way to experience ZeroRanger is to NOT back up your save."

## 4. Difficulty design

One difficulty at launch (the one recurring critical complaint). **Hidden rank**: bullet density/speed rise with time in proportion to current health, fall on hits and dropped multipliers; low-rank play slightly lowers enemy HP and spawns more 1-ups — "an inexperienced player who is dying a lot… will have an easier time compared to an experienced player trying to beat the game without Continues." Continues respawn at checkpoints, and the devs' stated rationale [F, wiki citing their podcast interview]: earned continues force novices to put in learning time (credit-feeders "conclude it's a bad, short game"), and checkpoint respawn "ensures that they are learning how to play that part of the game rather than skipping it." Stage select = start any run from any reached point with any weapons ever held — the practice structure. No bombs in the main game, deliberately; defence verbs live in the weapons (charge-absorb, sword-reflect, drill-erase) and all feed score.

## 5. Music

One named cue per stage/miniboss/boss/jingle; loop-2 themes are corrupted remixes of loop-1's. Verified sync tricks: boss theme "skips to a more intense section when the boss has one health bar left"; key-shift on final phases; a triumphant escape theme replaces the panicked one **only if you played from 1-1** (full-run reward); one fake-credits track deliberately "crashes" on cue. Composer = designer (Lahtinen); Undertale "reinforced audio priority."

## 6. Reception

Steam **95% of 1,634** (Overwhelmingly Positive); Metacritic ~90. RPS: "a lovingly assembled mix-tape featuring the best bits across all of shmup history." system11 on the 2014 demo: "The level design is one of the finest I have ever seen in a vertical shooter. It's easily on par with Ikaruga" (Plasmo). **Mark MSX**: "one of my favorite shmups and probably my favorite indie… a stone-cold classic… essential for all shmup fans and also a great gateway into the genre."

## 7. Local corpus (Mark MSX / boghog, on disk)

- MSX (Game Critique Is Dead): "ZeroRanger is very well made for beginners because it is designed to do so, and designed in an effective manner — whereas a lot of EuroShmups are easy, but their easy difficulty is not teaching you anything."
- boghog/Danbo (EuroShmup show): bump forgiveness ("collide… it will just wiggle your ship around… if you get slapped around too much in a row, then you die"); lives cap ~8 with frequent extends **plus a scoring bonus for carrying lives** ("hoarding lives… that's part of scoring"); boghog, 2-ALLs in both: "DoDonPachi is harder, but I had a lot more fun with ZeroRanger because of the life system… the punishment is a little slap on the face; DoDonPachi breaks your neck and throws you off a cliff." White Vanilla's fast-forward noted as the discrete cousin of a continuous kill-speed scroll (= SPEEDHELL's caravan pull).

## What SPEEDHELL should steal

1. **Hue = threat, value = identity.** Two 4-step desaturated ramps for our two enemy families; audit that the bullet hues never luminance-overlap them; phase changes reveal shape (cores, eyes), not colour. Our enemy-identity battle is a value/silhouette problem — 10 swatches carried a 60-minute game.
2. **Palette as post-process** — indexed palette shader makes colourblind + unlockable palettes nearly free.
3. **Score pays survival, visibly** — score-counter-as-extend-meter, rubber-banded extend thresholds; our speed-kill economy deserves a HUD that shows aggression buying survival.
4. **Boss timer (seconds × 100) + multiplier/timer exclusivity** — stages pay chains, bosses pay speed. Fits our phase clocks exactly.
5. **Checkpoint continues that teach** — earned continues + checkpoint respawn + start-from-any-reached-point as the practice structure (boghog: "practice tools are the real accessibility fix").
6. **Music cut to game state** — last-bar intensity jump, final-phase key shift, full-run-only triumph track; our sfx ring can drive all three without beat-sync.
7. **Rank with ZeroRanger polarity** — rises with health/time, falls on hits: one difficulty that self-tunes (kin to our camp governor).
8. **Overkill windows** — post-death damage doubles a corpse's value: pure aggression reward, one white flash of art.

## What to refuse

1. **The save wager** — it's the *story*; deleting progress punishes the repeat runs a score game lives on. Steal the shape (stake a banked resource on a TLB attempt) not the deletion.
2. **Two-loop campaign structure** — only the remix idea transfers (a corrupted second visit of our one stage = the loop-2/EX variant).
3. **Juice-decay chaining as primary scoring** — would fight speed-kill scoring; take Boss Break texture at most.
4. **No-bombs purism** — their defence verbs are weapons; ours is the cancel economy. Adopt the principle (defence must also score), not the loadout.
5. **Reference-overdose tone** — load-bearing for a mix-tape game; a nod or two for us.

## Contradictions / thin evidence

Max continues 8 (wiki+TVTropes) vs "nine" (canonfire) — weight favours 8. Dithering rules undocumented (ramp reading derived from verified hex). Shot-recolour option [S]. Vocal-drop placements unpinned. G Darius influence = community inference. Electric Underground's in-video arguments untranscribed (only the description verified). No published per-stage enemy counts. Follow-up sources that exist: the devs' podcast interview ("Episode XVIII"), Lazy Devs "The Design of ZeroRanger" (Nov 2023, 1h37m), Aalto Games Now! talk (2025).

## Sources

zeroranger.miraheze.org — Palettes, Gameplay, Green Orange, Multiplier, ZeroRanger (Development), White Vanilla, Enemies, Music, Patch Notes[S] [F via curl] · TVTropes VideoGame/ZeroRanger [F via archive] · worldsbe.st/tl-dr-zeroranger [F] · honestgamers.com/14189 [F] · Steam store app 809020 [F] · YouTube full-story longplay _ZJViEBD64I (timestamps) [F] · canonfire.net 041 [F] · Steam discussions (save wager) [F/S] · en.wikipedia.org/wiki/ZeroRanger [F] · goldplatedgames.com review [F] · eebrozgi.bandcamp.com ORANGE SOUNDS [S] · Electric Underground review video -jlSMNzjbMs (description) [F] · system11 t=49762 scoreboard [F via archive] · gamesnow.aalto.fi 2025 talk [F] · Lazy Devs p6Q6NxvNeHA (description) [F] · local: mark-msx-research + boghog-research transcripts.
