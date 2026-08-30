# Enemy Density in Classic Japanese Shmups — Cited Findings (research agent output, verbatim)

Scope: stage length, enemy counts/rates, popcorn ratios, wave overlap, and a SPEEDHELL baseline comparison. Numbers marked **[est.]** are arithmetic on verified inputs; **[snippet only]** means the page could not be opened; **unverified** means no usable source was found.

Method note: 20 WebSearch queries were run. Stage timestamps were taken from YouTube chapter lists by fetching the watch-page HTML with curl and grepping the description. Each timestamp set is a single run by one player, so treat lengths as ±10–20 s; where two runs were found both are listed. shmups.system11.org / speedrun.com / strategywiki were reached through the archive CLI.

## 1. Stage length

All times are start-of-stage to start-of-next-stage (i.e. including the boss) unless a separate boss timestamp allowed a split.

**CAVE**
- **DoDonPachi** (arcade, C-L 1-ALL longplay [S1]): Stage 1 0:00 → midboss 0:48 → boss 1:20 → Stage 2 2:05. So **stage-proper ≈ 80 s, boss ≈ 45 s, total ≈ 125 s**. Stage 2: 94 s + boss (140 s total). Stage 3: 159 s + boss (254 s). Stage 4: 144 s + boss (211 s). Stage 5: 164 s + boss (229 s). Full 1-ALL 21:18 video; speedrun.com 1P Normal WR "16m 33s" (CaoJie, Arcade) [S2]. Two loops "around 50 minutes" [S3].
- **DoDonPachi DaiOuJou** (1-ALL White Label commentary [S4]): Stage 1 0:52 → 3:21 = **149 s**; Stage 2 193 s; Stage 3 232 s; Stage 4 274 s. World of Longplays 2-loop Black Label run: 45:35 total [S5].
- **Ketsui** (1-ALL commentary [S6]): Stage 1 4:37 → 7:09 = **152 s**; Stage 2 181 s; Stage 3 239 s; Stage 4 286 s; Stage 5 314 s. Second run [S7]: Stage 1 0:57 → boss 3:33 (156 s pre-boss) → Stage 2 4:24 (207 s total).
- **ESP Ra.De.** [S8]: Stage 1 0:44 → 3:56 = **192 s**; Stage 2 163 s; Stage 3 183 s; Stage 4 218 s; Stage 5 220 s.

**Raizing**
- **Battle Garegga**: Miyamoto C 1CC [S9]: Stage 1 0:00 → 2:05 = **125 s**; Stage 2 174 s; Stage 3 211 s; Stage 4 180 s; Stage 5 388 s; Stage 6 342 s; Stage 7 329 s. Second run (Miyamoto commentary 1CC [S10]): Stage 1 **98 s**; Stage 2 158 s; Stage 3 205 s; Stage 4 174 s; Stage 5 387 s; Stage 6 334 s. (Stage 1 varies partly because survival routes deliberately "Die to boss once to reduce rank" [S11].)
- **Armed Police Batrider** (Advanced course [S12]): Stage 1 0:33 → 1:38 = **65 s**; Stage 2 138 s; Stage 3 91 s; Stage 4 127 s; Stage 5 146 s; Stage 6 320 s. Second run (Normal course, safe-1CC guide [S13]): Stage 1 144 s, Stage 2 140 s, Stage 3 126 s.

**Psikyo**
- **Strikers 1945 II** (no-miss 2-ALL by HD., with separate boss stamps [S14]): Stage 1 0:03 → boss 0:50 → Stage 2 1:57 ⇒ **stage-proper 47 s, boss 67 s, total 114 s**. Stage 2: 71 s + 67 s boss. Stage 3: 55 s + 52 s. Stage 4: 70 s + 88 s. Stage 5: 57 s + 44 s. Stage 6: 89 s + 40 s. Stage 7: 75 s + 58 s. Stage 8: 69 s + boss. Loop-2 Stage 1: 49 s + boss. In every stage the boss is 40–90% of the stage's clock. A second run (PS1 1-ALL [S15]) gives Stage 1 137 s, Stage 2 135 s, Stage 3 100 s, Stage 4 95 s total. speedrun.com Any% (PS1) WR "11m 58s" for a full loop [S16].
- **Strikers 1945** (shmups.wiki [S17]): "The actual stages in Strikers 1945 are often quite brief, with some being shorter than 60 seconds, with the bosses often taking up more time than the stages themselves." "A single loop takes about 15 to 20 minutes on average."
- **Gunbird** (longplay [S18]): Stage 1 1:58 → 4:01 = **123 s**; Stage 2 113 s; Stage 3 92 s; Stage 4 153 s; Stage 5 113 s; Stage 6 122 s; Stage 7 154 s; loop 1 ≈ 14.5 min.
- Developer intent (1997 Psikyo interview [S19]): **Nakamura:** "We've also shortened the time you spend in stages before the boss. It allows for variety and it makes the arcade operators happy, as well as the customers waiting for their turn to play." **Yamada:** "Of course, if the experience is simply short then players will feel cheated, so we make sure the stages are densely packed."

**Toaplan**
- **Batsugun** (no-death 1CC [S20]): Stage 1 0:30 → 2:19 = **109 s**; Stage 2 135 s; Stage 3 139 s; Stage 4 364 s; whole run 20:35. mycophobia: "its original version lasting around 15 minutes in total" [S21].
- **Truxton/Tatsujin** (1-ALL [S22]): Stage 2 begins 5:58, so Stage 1 ≈ 5.5–6 min incl. intro; Stage 2 391 s; Stage 3 379 s; Stage 4 444 s; Stage 5 342 s; loop ≈ 33 min. A forum claim of "about 45 mins per loop" is [snippet only].

**Hudson / Compile**
- **Star Soldier** (NES, full session [S23]): Stage 1 0:00 → 1:51 = **111 s**; Stage 2 108 s; Stage 3 107 s; Stage 4 154 s (Big Star Brain); Stage 5 105 s; Stage 6 104 s … 16 stages. Boss timer: "If you do not succeed in this in the first 10 seconds of encountering the Star Brain, it will escape, and you will be sent back to the mid-way point in the stage" [S24].
- **Blazing Lazers** (longplay [S25]): Area 1 0:25 → 5:31 = **306 s**; Area 2 359 s; Area 3 226 s; 9 areas; speedrun.com 1CC WR 47m 46s [S26].
- **Soldier Blade** (no-death [S27]): Stage 1 0:45 → 5:40 = **295 s**; Stage 2 340 s; Stage 3 260 s; Stage 4 367 s.

**Seibu**
- **Raiden** (no-miss 1CC [S28]): Stage 1 0:11 → 3:34 = **203 s**; Stage 2 275 s; Stage 3 238 s; Stage 4 272 s; Stage 5 261 s; Stage 6 289 s; Stage 7 256 s; Stage 8 212 s to final boss. World of Longplays [S29]: "00:01:00 Stage 1 / 00:03:55 Stage 2 / 00:07:29 Stage 3 / 00:10:41 Stage 4" ⇒ Stage 1 **175 s**, Stage 2 214 s, Stage 3 192 s. speedrun.com (Jaguar) Any% 26m 46s [S30]. "Raiden has 8 stages and infinite loops" [S31].

**Treasure (contrast)**
- **Ikaruga** [S32]: Ch.1 0:00 → 3:17 = **197 s**; Ch.2 257 s; Ch.3 274 s; Ch.4 326 s; Ch.5 ≈ 425 s. Second run [S33]: Ch.1 191 s, Ch.2 263 s, Ch.3 285 s, Ch.4 343 s. shmups.wiki: "a full run through the game taking up about 25 minutes" [S34].
- **Radiant Silvergun**: "arcade mode can be completed in less than 27 minutes" [snippet only]; 6 stages [S35].

**Takeaway:** arcade Stage 1s cluster at **1.5–3.5 min including the boss**, with the stage-proper (pre-boss) part often **45–160 s**. Psikyo is the extreme (≈50–70 s of stage, then a boss as long as the stage). Only the Compile console games (Blazing Lazers, Soldier Blade) and Truxton run 5–6 min stages.

## 2. Enemy counts / enemies per minute

Hard "N enemies in stage 1" figures are rare; nobody publishes object tables. Below are the best proxies, each with its inflation caveat.

**DoDonPachi Stage 1 (chain-count proxy).** Forum record (Icarus, 2005) [S36]: "The chain records for stage 1 are 192HIT after the midboss, then 60HIT+. I've managed 191HIT - 57HIT for stage 1, using Type C-S." Dave_K. in the same thread: "chained the first half of stage 1 collecting all the bees (up to about 186 hits)"; another route "176 hits on the first half". Marc: "I usually do the first half of the level with one 73 chain and another 100 or so after I drop it" — i.e. even a broken run kills ~170+ things before the midboss.
Caveat: HIT counts include laser ticks on large targets ("stalling the bar by hitting large enemies with the Laser" [S37]; "smaller enemies fill the gauge a lot more" [S36]). And a max-chain route deliberately leaves enemies alive — it does not kill *more* things than exist, so ~250 hits is an upper bound on kills but a decent proxy for **spawn count**.
**[est.]** ~250 hits over the ~80 s pre-boss stage ≈ **190 hits/min**; if a quarter are laser ticks, ≈ **140 enemies/min**, i.e. ~180–200 destroyable objects in Stage 1. Ikeda on DDP: "I remember people at Cave saying there were too many tanks!" [S38]. 13 bees (hidden ground pickups) per stage [S39]. Later stages: "It is confirmed that stage 5 is possible to full-chain, getting 900+ hit chains" [S3] over a 164 s stage ⇒ **[est.]** ~330 hits/min (heavily laser-inflated). mycophobia: "In the latter half of the game you can make 200-300 hit combos just by surviving and not bombing" [S21].

**DoDonPachi DaiOuJou Stage 1.** A video titled "Dodonpachi Dai-Ou-Jou Stage 1 - 802 Hit Chain" exists [S40, title only]; DOJ's counter climbs on every laser frame, so 802 says nothing about enemy count. Unverified.

**Ketsui.** Chip/chain numbers are proximity-and-laser based, not enemy counts. Unverified.

**Ikaruga Ch.1 (the cleanest number in this report).** shmups.wiki max-chain table [S34]: Chapter 1 Normal (arcade) = **134**. A chain is "taking down three enemies of the same polarity in a row", so 134 chains ⇒ **≥ 402 enemies killed** in Chapter 1 (more exist — killing an off-polarity enemy breaks the chain, so max-chain routes skip some). Over ~190 s that is **[est.] ≥ 125–160 enemies/min**. Chapter 3 Normal = 289 chains ⇒ ≥ 867 enemies in ~275 s ⇒ ≥ 190/min. Ikaruga is the "slow, methodical" outlier of the set, and it is still >100 popcorn/min.

**Battle Garegga Stage 1.** shmups.wiki Stages page [S41]: opening is "three sets of idle tanks, a set of 12 on the right followed by a set of 10 on the left and a set of 8 on the right (30 total)", then minecart formations, then "one biplane"; stage is "Predominantly ground-based". Rank scaling: "more popcorn enemies spawn" as rank rises [S42]. Total unverified; **≥ 30 destroyables in roughly the first 20 s** is confirmed.

**Star Soldier (NES).** StrategyWiki enemy table [S24]: "There are 32 distinct types of enemies… Each enemy appears with a set number of squad members." 28 of the 32 types have "Count: 8" and "Damage: 1 shot" (three are 2-shot); the only heavies are Razaro (Count 1, 16 shots), Jericho (Count 2, 16 shots), Ruido (Count 4, 4 shots), Guha (Count 2), Eiku (Count 5). Spawn rule: "enemies in Star Soldier occur in a set progression, and the next enemy set will appear as soon as the previously set is destroyed or disappears… While most enemies come out one at a time, groups of enemies will attack on occasion." 1cclog [S43]: "no wave (or wave group) appears before the previous one has been obliterated or has left the screen." Stage 1 ≈ 111 s. **[est.]** if a squad of 8 lasts 5–8 s on screen (unverified assumption), a ~100 s stage-proper holds 12–20 squads ⇒ **~100–160 enemies/stage, ~60–95/min**, nearly all 1-shot popcorn.

**Strikers 1945 II.** No per-stage count found. Fixed data: "One loop contains 134 medals" [S44] — medals come from specific ground/medal targets, so ≥ 134 medal-bearing targets per 8 stages (~17/stage) on top of air popcorn. Per-minute density is high but unquantified.

**Raiden Stage 1.** Fandom summary [snippet only]: "mostly non-aggressive enemies and a group of medium tanks halfway through." 1cclog (verified) notes later stages where "the screen is so filled with enemies that timing the collection of all those power-ups isn't an easy thing to do" [S45].

**DonPachi (predecessor, on-screen count).** mycophobia [S21]: "It feels like it takes forever for more than 3-5 enemies to be on screen at once when the game begins" — offered as a criticism of a *slow* opening.

## 3. Popcorn : mid : large ratio, peak on-screen, ground vs air

- **Ratio.** Star Soldier's roster is the only fully enumerated one: 28/32 types are 1–2-shot popcorn in 8-squads; 4 types are multi-shot heavies appearing 1–4 at a time [S24] — roughly **95% popcorn by unit count**. Garegga Stage 1 is ~30 idle tanks + minecart trains + one biplane before anything mid-sized [S41]. DDP Stage 1's chain sections are "small tanks… enough small tanks here to keep you busy until the second large tank comes out" [S36]. Ikaruga Ch.1 has ≥ 402 chainable enemies against one midboss and one boss [S34]. Design guidance agrees: Molinari, "The key here is quantity" [S46]; Slynyrd, "Higher HP enemies… are usually isolated instances and will need to stay on screen longer" while low-HP enemies "make brief appearances in groups" [S47].
- **Peak on screen (hardware ceiling).** MAME `sprite013.cpp` [S48]: "[ 1024 Zooming Sprites ] There are 2 or 4 0x4000 Sprite RAM Areas… 16 bytes per each sprites" ⇒ **1024 sprite entries per frame** on Cave 68000 boards, shared by enemies, bullets, player shots and explosions. `cave.cpp` [S49]: "Max sprite number is possibly less than 1024 (ex: Boss explosion scene at most of cave shmups on real hardware)". DDP bullet ceiling: Ichimura, "245. The campaign version, by the way, can put out 315" [S50]; HG101 repeats "up to 245 bullets onscreen at once" [S37]. On-screen *enemies* in practice are tens, not hundreds — Garegga's 12-tank cluster [S41] and Star Soldier's 8-squads [S24] are typical peaks.
- **Ground vs air.** Garegga Stage 1 "Predominantly ground-based… with one airborne biplane" [S41]. DDP Stage 1 mixes ground tanks/turrets (hence "too many tanks" [S38]) with air popcorn and a carrier midboss; 13 bees are ground pickups [S39]. Raiden's identity is ground tanks + aimed shots [S45]. Star Soldier's air squads dominate, with ground "blocks" as scenery targets [S43]. Toaplan/Cave ground enemies obey a sealing rule: "when you got close to a ground enemy they wouldn't fire at you" (Uemura [S51]); Boghog: "Weaker ground enemies don't shoot if the player's sitting on top of them" [S52].

## 4. Wave structure and overlap

- **Overlap is the core rule.** Boghog's Bullet Hell Shmup 101 [S52]: "Enemies must spawn in relatively quick succession so that the player won't be able to linger in one area for long." Enemy roles: "Pressure enemies… force them to move around"; "Area denial enemies… block off parts of the screen"; "Direct challenge enemies… usually elites". Popcorn are "little obstacles clustered on the path to the player's destination." "The Toaplan Pattern" splits the screen into lanes (5–7) and spawns "each enemy on the opposite side of the screen from the previous one to force the player to move & create a kind of sense of rhythm."
- **Popcorn bridges the chain (CAVE).** Chain gauge drains in "about two seconds" (Icarus [S36]; TAS forum says "64 frames" [S3]). Bridging quotes from the DDP thread [S36]: "There should be enough small tanks here to keep you busy until the second large tank comes out"; "Using Laser will also leave more enemies on screen, which is good for chaining"; and the failure mode, "there's no way of keeping the chain running for the entire level due to the scarcity of enemies at the mid boss point". Stage 1's two chain segments (192 / 60) split exactly at that midboss gap.
- **Psikyo: short + dense + long boss.** [S19] above; plus 1cclog on Strikers 1945: "procrastinate a boss fight to capitalize on the popcorn waves that appear regularly" [S54] — bosses themselves spawn popcorn.
- **Hudson: strictly sequential waves.** Star Soldier never overlaps waves [S43]; density comes from squad size (8) and instant respawn of the next set [S24].
- **Molinari (Gamasutra)** [S46]: "There should be 'popcorn' enemies in every level… The key here is quantity" — they "fill in empty holes of time between waves of more viable forces".
- **Ikeda (CAVE)** on what gets the design time: "the most important things are getting the difficulty balance correct, the enemy placement, and the right balance for the danmaku patterns" [S55]; "Dodonpachi is a game of intense, fast-paced shooting and dodging, and that pacing was very important to us" [S50].

## 5. SPEEDHELL vs. Stage 1 baselines

SPEEDHELL: one ~4.5 min stage, ~100 enemies (80 popcorn / 12 turrets / 4 mid / 2 elite / 1 midboss / 1 boss) ⇒ **~22 enemies/min, ~18 popcorn/min**.

| Game (Stage 1) | Stage length | Enemy count (proxy) | Enemies/min | Source |
|---|---|---|---|---|
| DoDonPachi | 80 s stage + 45 s boss = 125 s | ~250 chain hits (192+60) ⇒ [est.] ~180–250 spawns | [est.] 140–190 | S1, S36, S37 |
| DDP DaiOuJou | 149 s incl. boss | unverified | — | S4 |
| Ketsui | 152–156 s pre-boss / 207 s | unverified | — | S6, S7 |
| ESP Ra.De. | 192 s incl. boss | unverified | — | S8 |
| Battle Garegga | 98–125 s incl. boss | ≥30 tanks in opening; total unverified | ≥ ~90 in first 20 s [est.] | S9, S10, S41 |
| Batrider | 65 s (Advanced) / 144 s (Normal) | unverified | — | S12, S13 |
| Strikers 1945 II | 47 s stage + 67 s boss | unverified ("densely packed") | — | S14, S19 |
| Gunbird | 123 s incl. boss | unverified | — | S18 |
| Batsugun | 109 s incl. boss | unverified | — | S20 |
| Truxton | ~5.5–6 min | unverified | — | S22 |
| Star Soldier (NES) | 111 s incl. boss | 8-unit squads, sequential; [est.] 100–160 | [est.] 60–95 | S23, S24 |
| Blazing Lazers | 306 s | unverified | — | S25 |
| Soldier Blade | 295 s | unverified | — | S27 |
| Raiden | 175–203 s incl. boss | unverified | — | S28, S29 |
| Ikaruga (contrast) | 191–197 s incl. boss | ≥ 402 (134 chains × 3) | ≥ 125–160 | S32, S34 |
| **SPEEDHELL** | **~270 s** | **~100** | **~22** | — |

**Verdict:** SPEEDHELL is **low on density and long on duration** relative to arcade Stage 1s.
- Length: 4.5 min is 2–5× a Psikyo/CAVE/Raizing Stage 1 and ~1.5× a Raiden/Ikaruga Stage 1; it matches Compile console stages (5–6 min), not arcade ones.
- Rate: the two games with defensible counts (DDP est. 140–190/min; Ikaruga ≥125/min) run **6–8× SPEEDHELL's 22/min**; even the conservative Star Soldier estimate (60–95/min) is 3–4×. Garegga opens with 30 targets in ~20 s — more than a third of SPEEDHELL's entire popcorn budget.
- Composition: SPEEDHELL's 80:20 popcorn:non-popcorn is in the normal band. The gap is quantity, not mix.
- If the goal is "always something to shoot" at arcade pacing, the evidence points to either **~2.5× the enemy count in the same 4.5 min (~250 total, ~55/min)** to reach the low end of the classic band, or shortening the stage toward ~2.5 min while keeping ~100 enemies (~40/min). Ikaruga proves a slow-feeling game still ships >120 kills/min; SPEEDHELL at 22/min will read as sparse to players calibrated on these games.

## Contradictions / thin evidence

- **Chain hits ≠ enemy count.** DDP HIT counts include laser ticks on large/ground targets and buildings; ~250 is an upper-bound proxy. DOJ/Ketsui counters are worse (per-frame laser hits), so no counts given.
- **Stage lengths are single-run samples.** Garegga Stage 1 differs by 27 s between two Miyamoto runs (98 vs 125 s); Batrider Stage 1 differs by course (65 vs 144 s); Strikers 1945 II Stage 1 is 114 s (arcade 2-ALL) vs 137 s (PS1). Raiden Stage 1 is 175 s (longplay) vs 203 s (no-miss run).
- **Star Soldier per-stage count** rests on an unverified assumption of 5–8 s per squad.
- **Truxton loop length**: video shows ~33 min/loop; a forum post claims "about 45 mins per loop" [snippet only].
- **Radiant Silvergun** "under 27 minutes" and **Raiden Stage 1** enemy description are snippet-only.
- **Boghog's video phrasing** ("one enemy that controls space…") unverified verbatim online; the wiki doc's "area denial" + "popcorn" framing is the verified equivalent. (Local transcript WS05 confirms: "sequences of elite enemy spawns… supported by smaller enemies like flying popcorn or ground tanks and turrets".)
- **Sprite ceiling**: "1024 sprites" is MAME's reading; cave.cpp says the real limit is "possibly less than 1024". No first-party CAVE statement found.
- No Yagawa/Raizing interview on wave counts was found.

## Sources

1. https://www.youtube.com/watch?v=2UXpVV-iSpo — "Dodonpachi (Arcade) - (C-L | 1-All | Longplay)", 21:18, chapter list [fetched & verified via curl]
2. https://www.speedrun.com/dodonpachi [fetched & verified]
3. https://tasvideos.org/Forum/Topics/10902 — DoDonPachi TAS forum [fetched & verified]
4. https://www.youtube.com/watch?v=aCGck-jHKHE — DOJ 1-ALL White Label commentary (A-Exy) [fetched & verified via curl]
5. https://longplays.org/infusions/longplays/longplays.php?cat_id=1135&longplay_id=2252 — DOJ BL longplay 45:35 [fetched & verified]
6. https://www.youtube.com/watch?v=rwB9rsAqZOw — Ketsui 1-ALL commentary [fetched & verified via curl]
7. https://www.youtube.com/watch?v=hUBnMEUjmlQ — "How to safely 1CC Ketsui" [fetched & verified via curl]
8. https://www.youtube.com/watch?v=EHwq4OGeIAQ — ESP Ra.De. 1cc commentary [fetched & verified via curl]
9. https://www.youtube.com/watch?v=8UdAt2XkkfM — "Battle Garegga - Miyamoto C - 1CC" [fetched & verified via curl]
10. https://www.youtube.com/watch?v=iQHqmPgw_80 — Garegga 1CC w/ commentary (Miyamoto) [fetched & verified via curl]
11. https://buffis.com/shmups/battle-garegga-1cc/ [fetched & verified]
12. https://www.youtube.com/watch?v=AlSCscxDWLs — Batrider Advanced ALL clear [fetched & verified via curl]
13. https://www.youtube.com/watch?v=Cs80np4roSg — "How to safely 1CC: Armed Police Batrider" [fetched & verified via curl]
14. https://www.youtube.com/watch?v=nStvM1e6USQ — "Strikers 1945 II - no-miss 2-ALL Hayate 3,330,300 by HD." [fetched & verified via curl]
15. https://www.youtube.com/watch?v=g-s3i_9K0IM — Strikers 1945 II PS1 1-ALL [fetched & verified via curl]
16. https://www.speedrun.com/strikers_1945_ii [fetched & verified via archive CLI]
17. https://shmups.wiki/library/Strikers_1945 [fetched & verified]
18. https://www.youtube.com/watch?v=w-Uy_QpaLiA — Gunbird longplay [fetched & verified via curl]
19. https://shmuplations.com/psikyo/ — Psikyo STG 1997 developer interview [fetched & verified]
20. https://www.youtube.com/watch?v=3X0PPk59cQQ — Batsugun no-death 1cc [fetched & verified via curl]
21. https://mycophobia.org/dodonpachi.html [fetched & verified]
22. https://www.youtube.com/watch?v=yI6FgE-AlDo — Tatsujin/Truxton 1-ALL [fetched & verified via curl]
23. https://www.youtube.com/watch?v=GA_NntBybrQ — Star Soldier (Famicom) full session [fetched & verified via curl]
24. https://strategywiki.org/wiki/Star_Soldier/Enemies [fetched & verified via archive CLI]
25. https://www.youtube.com/watch?v=XHBsgroiWLA — Blazing Lazers longplay [fetched & verified via curl]
26. https://www.speedrun.com/blazing_lazers [fetched & verified via archive CLI]
27. https://www.youtube.com/watch?v=dtJFPuqBOY4 — Soldier Blade no-death [fetched & verified via curl]
28. https://www.youtube.com/watch?v=uBCXPk9uaF0 — Raiden no-miss 1CC [fetched & verified via curl]
29. https://longplays.org/infusions/longplays/longplays.php?longplay_id=13268 — Raiden longplay [fetched & verified]
30. https://www.speedrun.com/raiden [fetched & verified via archive CLI]
31. https://shmups.wiki/library/Raiden [fetched & verified]
32. https://www.youtube.com/watch?v=oz5rCakaHWU — Ikaruga 1cc 31,731,950 [fetched & verified via curl]
33. https://www.youtube.com/watch?v=Q_WmQt6mAJA — Ikaruga 1CC Normal [fetched & verified via curl]
34. https://shmups.wiki/library/Ikaruga [fetched & verified]
35. https://shmups.wiki/library/Radiant_Silvergun [fetched & verified]; "<27 minutes" claim from search snippet only
36. https://shmups.system11.org/viewtopic.php?t=4820 — "RQ: chaining in Dodonpachi" [fetched & verified via archive CLI]
37. https://www.hardcoregaming101.net/dodonpachi/ [fetched & verified]
38. https://shmuplations.com/cave15th/ [fetched & verified]
39. https://shmups.wiki/library/DoDonPachi [fetched & verified]
40. https://www.dailymotion.com/video/x9y6b6 — "Dodonpachi Dai-Ou-Jou Stage 1 - 802 Hit Chain" [snippet/title only]
41. https://shmups.wiki/library/Battle_Garegga/Stages [fetched & verified]
42. https://shmups.wiki/library/Battle_Garegga [fetched & verified]
43. http://1cclog.blogspot.com/2016/02/star-soldier-nes.html [fetched & verified]
44. https://shmups.wiki/library/Strikers_1945_II [fetched & verified]
45. http://1cclog.blogspot.com/2010/01/raiden-playstation.html [fetched & verified]
46. https://www.gamedeveloper.com/design/the-anatomy-of-a-shmup — Michael Molinari [fetched & verified]
47. https://www.slynyrd.com/blog/2020/12/14/pixelblog-31-shmup-sprite-design [fetched & verified]
48. https://raw.githubusercontent.com/mamedev/mame/master/src/mame/atlus/sprite013.cpp [fetched & verified]
49. https://raw.githubusercontent.com/mamedev/mame/master/src/mame/atlus/cave.cpp [fetched & verified]
50. https://shmuplations.com/dodonpachi/ — 1998 developer interview [fetched & verified]
51. https://shmuplations.com/toaplan-uemura/ [fetched & verified]
52. https://shmups.wiki/library/Boghog's_bullet_hell_shmup_101 [fetched & verified]
53. https://www.youtube.com/watch?v=RENI2gk0ZJA — "Level Design [SHMUP WORKSHOP 05]" [snippet only; local transcript on disk verifies]
54. http://1cclog.blogspot.com/2013/01/strikers-1945-saturn.html [fetched & verified]
55. https://shmuplations.com/dodonpachi2/ — 1997 developer interview [fetched & verified]
