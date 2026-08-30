# What the canon does that SPEEDHELL doesn't: safe spots, density, and the ground layer

*Deep research for SPEEDHELL, 2026-08-29. Commissioned after two playtests exposed three holes — a player can park at the top of the screen and be safe for most of the game (the boss included); professionally made shmups have far more enemies; and they have far more to destroy (buildings, cars, crates, turrets on hulls). Three web research passes (~66 searches, ~135 pages fetched) plus the boghog and Mark MSX transcript corpora on disk. Citations: [A#] = safe-spot pass, [B#] = density pass, [C#] = ground-layer pass, [L] = local transcripts. Numbers marked (est.) are arithmetic on verified inputs.*

---

## Executive summary

1. **The top-of-screen safe spot is not a tuning problem; it is a rule the canon never had.** No classic game documents an "enemies only fire when the player is below them" rule. What they document is the opposite: *distance-gated* silencing of **ground** enemies only (Toaplan's Yuge: "We didn't want people to think the game was unfair" [A5]; boghog: "weaker ground enemies don't shoot if the player's sitting on top of them" [A34]), **aimed fire engineered to reach the player anywhere on screen** (Yuge: "We did tests to see whether the enemies could hit the ship at any given location on the screen" [A5]), off-screen enemies never firing [A41][A46], and a top **dead zone where enemies can't be damaged — not one where they can't shoot** [A34]. SPEEDHELL's `mayFire` generalizes the ground-only seal to all 17 fire sites including the boss. CAVE's Ikeda treats safe spots as defects: "I do my best to find and remove them" [A1].
2. **The top of the screen is dangerous in the canon because of physics and money, not silence.** It's where the hitboxes are (boghog: "their collision hitboxes still make that area very dangerous" [L]), where point-blank pays (Psikyo: "position yourself right on top of it to maximize point blank damage" [A36]; DOJ hyper medals come from point-blanking [A47]), where Psikyo taxes contact with a power-down instead of a death [A49][A52], and where enemies dive to and retreat from [A36]. Garegga scripts ambushes from below and the sides [A18].
3. **SPEEDHELL is 3–8× sparser than a classic stage 1 and 2–5× longer.** Arcade stage 1s run 1.5–3.5 minutes *including* the boss; Strikers 1945 II's is 47 s of stage plus a 67 s boss [B14]. Estimated kill rates: DoDonPachi 140–190/min [B36][B1], Ikaruga ≥125/min [B34], Star Soldier 60–95/min [B24]; SPEEDHELL ≈22/min over 4.5 min. Psikyo says why: "we make sure the stages are densely packed" [B19]. Our popcorn ratio (80%) is normal — the gap is quantity, not mix.
4. **The ground layer is a score economy and a memorization aid, not decoration.** Raiden's entire stage bonus is ground-derived medals [C6][C7]; Psikyo's gold comes from "destructible buildings or ground-based enemies" [C11]; Garegga's silos, pipes and houses pay 10,000–50,000 and gate medal caches [C2]; Batrider pays inert scenery ×10 under bomb [C4]; Star Soldier's tiles *are* its score system [C31][C32]. Toaplan spent "roughly 1/3 of our time" on ground and air placement [C49]. SPEEDHELL has zero scenery targets.
5. **Two findings change plans already on the books.** (a) DDP *removed* suicide bullets — Ikeda: "having to wait and stagger your shooting because of the danger of suicide bullets didn't fit the flow of the game" [A1] — so our loop-2 revenge-bullet plan needs Ketsui's fix: kills inside the seal radius release *nothing* (and in Ura pay *more*) [A35][A15], which turns revenge fire into a point-blank reward rather than an aggression tax. (b) Pillar 1 ("density over duration") is being violated by the stage's own length; the canon answer is Psikyo compression, not more minutes.

---

## 1. Why this research

Two playtests, one week apart, found the same class of problem from different angles. Turret alley could be cleared by sitting at the top and killing turrets before they fired (fixed as r17, but the fix was a symptom patch). Then a second player found the general case: park at y≈16 and nothing in the game fires — the boss holds y≈92 with a 30px hull, so a top-parker is never shot, never rammed, and can't be damaged either, and three phase timeouts clear the stage. Playing Strikers 1945 II, Soldier Blade and DoDonPachi afterwards, Jacob noticed two more gaps: those games have several times more enemies, and they have an entire destructible world under the enemies.

The original project research (the homage film studies and the design pillars) never asked "how does the canon gate enemy fire?" or "how many enemies is normal?" This pass asks those questions directly.

---

## 2. Hole 1 — Safe spots and fire gating

### 2.1 The rules the canon actually uses

**Distance-gated sealing, ground enemies only.** The earliest documented gate is Toaplan's. Asked about Tatsujin's ground enemies not firing when the player is close, Masahiro Yuge: "We didn't want people to think the game was unfair. If the player's deaths weren't satisfying, he wouldn't want to play again." [A5] Uemura on Kyuukyoku Tiger: "when you got close to a ground enemy they wouldn't fire at you… to avoid the situation where the player didn't know what killed him." [C30] The genre named it: "Getting inside of this range will stop the enemy from shooting completely. This is commonly referred to as bullet sealing." [A32] Boghog's Enemy Design workshop draws the boundary precisely: "Bullet ceiling is a nice anti-frustration mechanic where **ground enemies** will stop shooting if the player is close to them. Sometimes air enemies can be sealed too, but this isn't as common." [L]

**A bottom dead zone, for enemies that have passed you.** Same workshop: "Most games have a zone at the bottom of the screen where enemies will stop shooting, since the player typically can't shoot backwards — this prevents a lot of needless frustration." [L] This is the only canon rule that resembles SPEEDHELL's "enemy must be above the player" — and it's a band at the *bottom edge*, not a 40px halo around the player wherever they are.

**A top dead zone where enemies can't be *damaged*.** "A lot of games have a dead zone at the top of the screen where enemies cannot be damaged; this prevents players from shooting enemies before they appear on screen." [L][A34] The top dead zone is an anti-cheese against the *player*, not a shelter: parking at the ceiling forfeits kills without granting safety. (SPEEDHELL already has this — vulnerability begins at y>16.)

**Aimed fire is engineered to reach anywhere.** Yuge on Flying Shark: "We did tests to see whether the enemies could hit the ship at any given location on the screen. Then we were able to determine the details involving the vectors and direction of the enemy bullets." Residual safe angles were an artifact: "The directional cross the bullets used for aiming wasn't done perfectly, and the angles were not exactly evenly spaced." [A5] Star Soldier's "enemy attacks consist primarily of small aimed shots" and "the best strategy… is to eliminate enemies as quickly as possible before they progress to a point-blank range." [A28]

**Off-screen enemies don't fire.** Raiden: "enemies offscreen can't shoot at you. The caveat is flying back into the range of unexpected enemies and suddenly meeting a deadly bullet." [A41] Game Developer's shmup anatomy states it as a rule: "Off-screen enemies should not be able to shoot." [A46]

**Finding:** across Toaplan, CAVE, Raizing, Psikyo, Hudson and Seibu, no source documents a rule that mutes an enemy because the player is *above* or *beside* it. The canon's gates are distance (ground only), screen edges, and the top no-damage band.

### 2.2 The philosophy shift on safe spots

Toaplan 1988 designed them in. Yuge, asked whether Tatsujin's safe spots were intentional: "Yes, they were. Though there were also spots that we only became aware of later." [A5] CAVE 1997 treats them as defects. Ikeda: "Generally, I don't like them, and I do my best to find and remove them. If you're struggling with a tough pattern and the solution turns out to be staying in a safespot, then I personally think that's not very satisfying… getting out of a difficult situation in a STG should take an appropriate degree of effort and technique." [A1] On bosses: "Strong bosses should be intimidating." [A4] The documented boss safe spots that survive — Sengoku Ace's stage-5 boss ("stay exactly lined up with the center of the boss… everything he fires will miss") — are *directly under the boss at point-blank*, not at the top or an edge [A36]; the safe spot is the aggressive position.

### 2.3 Why the top is the expert lane, not a hiding spot

Assembled from verified pieces:

- **Physics.** Boghog's player model: "Players will tend to stay away from the top of the screen for several reasons: that's where most enemies will be — even if they don't shoot many bullets, their collision hitboxes still make that area very dangerous; basic straightforward shots limit the player's offense if they're not directly below the enemies; being close to enemies gives the player very little time to react to threats." [L] The Top Line pattern — "break the top of the screen into a bunch of lanes, around 5 or 7… spawn enemies on opposite sides of the screen or keep one lane's worth of distance between each spawn" — keeps traffic moving through that band; "it exists everywhere but Toaplan is the clearest example." [L]
- **Money.** Point-blank is "getting as close to an enemy as possible while shooting at them… in exchange for putting themselves at greater risk" [A32]. Psikyo: "Only popcorn kills you on collision in this game so for everything else you can position yourself right on top of it to maximize point blank damage. Particularly against bosses if you sit back and passively dodge you won't survive long so get in there and KILL." [A36] Strikers 1945 II ships gain damage "point blanking close to, or on top of enemies" [A21]; Gunbird's Marion is "very poor if she is forced to stay at the bottom" [A23]. DDP: "point-blanking an enemy so that both the Laser and aura are connecting to it will deal higher damage" [A13]; DOJ's hyper medals come from chaining and point-blanking [A47]; Ketsui's 5-chips only within ~1.5 ship lengths [A35].
- **A tax, not a wall.** Psikyo's contact rule: "Colliding with another plane will just power you down a notch" [A52]; "doesn't kill you but rather takes away one power level, instantly reducing enemy aggression" [A49]. The lane is playable and expensive.
- **The lane is contested by scripting.** Sengoku Ace stage 4: ships "swoop down from above and then back to the top of the screen"; the stage-4 boss is baited from the top and then ridden [A36]. Garegga stage 4: "a large green tank will ambush the player from below"; stage 5: platforms "simultaneously enter the screen from the sides"; stage 6: "ten small tanks will enter the screen from the side, five from the left and five from the right" [A18]. Raizing lets options "fire behind you" [A40] — rear threats are designed in. Boghog's own Gunvein: "the final stretch with the ships where they fly up from the bottom — that's what I wanted… to introduce some more dynamic elements." [L]
- **Rank makes aggression hotter.** Batrider's rank: "Enemies are more willing to attack you point-blank, charge straight at your craft" [A38]; Garegga: sealing *raises* rank ("Do not seal the bullets from the spinning turrets!!!") [A18].
- **Sealing only works on the weak.** It is defined for "weaker ground enemies" [A34]; Sengoku Ace's turret gauntlets still require dodging while directly under them [A36].

Mark MSX's frame for the failure is *entropy*: modern games "do not have consequence for the player being idle or not doing anything… something needs to be happening at all times even if the player isn't doing anything." [L]

### 2.4 Suicide (revenge) bullets and second loops — the numbers

- **DonPachi (1995) loop 2** is the template: four bullet types (small aimed with random angle; larger faster aimed; small with angle varying by player position; small aimed), "Stage 2-1 uses only Type 4; Stage 2-5 uses all types"; speed = base + rank; after a death "all revenge bullets become Type 4 at base speed only." [A12]
- **DoDonPachi (1997) removed them.** Ikeda's four reasons: "Dodonpachi is a game of intense, fast-paced shooting and dodging, and that pacing was very important to us. We determined that having to wait and stagger your shooting because of the danger of suicide bullets didn't fit the flow of the game. Second, it would make chaining too difficult in the 2nd loop. Third, suicide bullets were already being used by a lot of other games at the time. And fourth, I was tired of suicide bullets themselves." [A1] Loop 2 instead: "more aggressive enemies firing much larger amounts of bullets at a higher frequency." [A13]
- **Ketsui (2003) made sealing pay.** Omote loop: "enemies release Suicide bullets… You can stop suicide bullets from being released (seal) by being within a certain radius of enemies. If suicide bullets are sealed, then no chips are gained." Ura loop: "There is a greater number of suicide bullets and they are quicker. The distance which you can seal suicide bullets is decreased. When suicide bullets are sealed, the number that was due to be discharged will be added to your multiplier… End of round bonus DOUBLES." [A35][A15] The kill made from far away generates the volley; the point-blank kill is quiet and, in Ura, richer.
- **Psikyo loop 2** = maxed rank plus "enemies that are destroyed will release clusters of revenge bullets" [A20]; Strikers 1945 II: "most flying enemies will also shoot revenge bullets when they die" [A21]; Gunbird 2 drones' are "damn fast" [A39]. No published speeds. Batsugun escalates by *size* across loops 2–4 [A26]. Raiden uses bullet speed, not revenge bullets [A27]. Garegga uses rank, which sealing raises [A16].

---

## 3. Hole 2 — Enemy density

### 3.1 Stage length (verified from run chapter timestamps)

| Game | Stage 1 | Notes |
|---|---|---|
| Strikers 1945 II | **47 s stage + 67 s boss = 114 s** | Boss is 40–90% of every stage's clock [B14] |
| Strikers 1945 | "some being shorter than 60 seconds… bosses often taking up more time than the stages" [B17] | loop 15–20 min |
| Gunbird | 123 s incl. boss [B18] | |
| DoDonPachi | **80 s stage + 45 s boss = 125 s** [B1] | later stages 140–250 s |
| DaiOuJou / Ketsui / ESP Ra.De. | 149 / 152 / 192 s incl. boss [B4][B6][B8] | |
| Battle Garegga | 98–125 s incl. boss [B9][B10] | |
| Batrider | 65 s (Advanced) / 144 s (Normal) [B12][B13] | |
| Batsugun | 109 s [B20] | |
| Raiden | 175–203 s [B28][B29] | |
| Star Soldier (NES) | 111 s [B23] | boss escapes after 10 s [B24] |
| Ikaruga | 191–197 s [B32][B33] | |
| Soldier Blade / Blazing Lazers / Truxton | 295 / 306 / ~340 s [B27][B25][B22] | the only 5–6 min stage 1s |
| **SPEEDHELL** | **~270 s** | |

Psikyo's intent, 1997: Nakamura — "We've also shortened the time you spend in stages before the boss. It allows for variety and it makes the arcade operators happy, as well as the customers waiting for their turn to play." Yamada — "Of course, if the experience is simply short then players will feel cheated, so we make sure the stages are densely packed." [B19]

### 3.2 Enemy counts and rates (proxies — nobody publishes object tables)

- **DoDonPachi stage 1:** chain records "192 HIT after the midboss, then 60 HIT+" [B36]; even a broken run "does the first half of the level with one 73 chain and another 100 or so." HIT counts include laser ticks on large targets, so ~250 is an upper bound on kills but a fair proxy for spawns. (est.) 140–190 enemies/min over the 80 s stage. Ikeda: "I remember people at Cave saying there were too many tanks!" [B38] The chain's one failure point is "the scarcity of enemies at the mid boss point" [B36] — CAVE's designers thought in terms of *gaps*.
- **Ikaruga chapter 1:** max chain 134, each chain = 3 same-polarity kills ⇒ ≥402 enemies in ~190 s ⇒ ≥125/min [B34]. The "slow, methodical" outlier of the genre still ships >120 kills a minute.
- **Battle Garegga stage 1:** opens with "three sets of idle tanks, a set of 12 on the right followed by a set of 10 on the left and a set of 8 on the right (30 total)" — 30 destroyables in roughly the first 20 s [B41]; rank adds "more popcorn enemies" [B42].
- **Star Soldier:** 28 of 32 enemy types are 1–2-shot popcorn arriving in squads of 8; "the next enemy set will appear as soon as the previous set is destroyed" [B24]; (est.) 60–95/min.
- **Strikers 1945 II:** "One loop contains 134 medals" [B44] ⇒ ≥17 medal-bearing ground targets per stage on top of air popcorn; per-minute count unquantified.
- **Hardware ceiling:** CAVE 68000 boards have 1024 sprite entries per frame shared by everything [B48]; DDP's bullet ceiling is 245 (315 in the arrange) [B50]. On-screen *enemies* in practice are tens, not hundreds.

### 3.3 Ratio, overlap, doctrine

- Popcorn dominates by unit count everywhere (Star Soldier ~95%; Garegga stage 1 "predominantly ground-based" popcorn tanks [B41]). SPEEDHELL's 80:20 is normal.
- Boghog's Level Design workshop: "Shmup levels are timelines. Putting enemy spawns close together on the timeline creates overlap… if they kill wave number one quickly they'll have more time to reposition and less lingering bullets… Overlapping waves of lower HP enemies give the players more routing freedom and shift focus on dodge while still preserving very high intensity." And: "Sequences of elite enemy spawns… can get boring if not supported by smaller enemies like flying popcorn or ground tanks and turrets. Smaller enemies make everything more dynamic, so layering them around your main spawns will keep the players on their toes." [L]
- The EuroShmup show's prescription for a Western game trying to feel Japanese: "drop down the enemy health and then increase the enemy count… a bunch more small-to-medium HP enemies that attack the screen from different angles." [L]
- Molinari: "There should be 'popcorn' enemies in every level… The key here is quantity." [B46]

### 3.4 Verdict

SPEEDHELL (~100 enemies, ~270 s, ~22/min) is low on density and long on duration. To reach the *low end* of the classic band: either ~2.5× the enemy count in the same runtime (~250 enemies, ~55/min), or compress toward Psikyo's shape (~2–2.5 min of stage at 80–100/min, then a boss as long as the stage). Pillar 1 is "density over duration"; the stage's own length is currently the violation.

---

## 4. Hole 3 — The ground layer

### 4.1 Who has what, and what it pays

| Game | Scenery / ground targets | Pays | Fires? | Role |
|---|---|---|---|---|
| Battle Garegga | houses, silos, pipes, medal rails, tank hatches, hull sections; tanks/turrets | medals (100→10,000 chain), 10,000–50,000 flat, options, weapon fragments | scenery no; military yes | medal caches, bomb-gated [C1][C2][C3] |
| Batrider | cars 100, hydrants 3,000, huts 5,000, billboards, desks 30,000, monitors 50,000 — **×10 under aura/bomb** | conditional medals | scenery no | ~19% of 154 enemy-list entries are inert scenery [C4] |
| Raiden / II | crates, buildings, trees, rocks; tanks | medals 500 + 1,000 × bombs each at stage end; super medals 3,000; fairies from a specific tree | scenery no; tanks yes | **"Each stage bonus is based upon medals… by destroying crates, buildings, and other ground targets"** [C6][C7][C8][C9] |
| Strikers / Gunbird | buildings, trucks, tanks, battleship turrets and bridge, train parts | gold 200/500/1,000/2,000 by animation frame; 8,000 per train part | tanks/turrets yes | "Gold bars are found inside destructible buildings or ground-based enemies, and are very common in most levels" [C11][C12][C15] |
| DoDonPachi / DFK | bunker turrets, silos, the Toaplan logo, tanks, multi-turret ships | chain hits; laser "stall" on buildings; ura route via three silos | yes | chain fillers and chain stalls [C17][C18][C19] |
| Toaplan | houses ("for no reason other than to be a jerk" [C24]), colored levers → extends, bases | flat points, extends | tanks yes (sealed close) | extends; "the thrill of blowing stuff up" [C25][C50] |
| Star Soldier | tiles 100–400, eyeball pairs 2,000 / 80,000, P panels, six hidden Zegu tiles up to 2,000,000 | | no | **the score system** [C31][C32][C33] |
| RayForce | the entire background layer | ×1…×128 lock-on multiplier | yes | core scoring [C38] |

### 4.2 Why it matters — developer and critic commentary

- **Toaplan's Yuge**, asked about placing ground and air enemies: "I'd say it used up roughly 1/3 of our time, maybe. We started with the question 'what will players think of this?'… We'd want bullets to be fired at this point, so let's place cannons on the enemy here." [C49] "Naturally, STGs are about the thrill of blowing stuff up." [C50]
- **Seibu's Komazawa**: "The way enemy ships fly, the way tanks fire, and so on… every enemy and character in that game had a backstory"; "all our STGs feel like they take place in real environments." [C51][C52]
- **Boghog**: "Adding some interaction between the enemy layer and the background layer helps make your level feel like an actual physical space. This can be achieved with destructible scenery, hidden bonuses and various polish effects like ground explosions leaving behind craters." [C55] And on memorization: "Environments alleviate this by connecting the enemy spawns to memorable landmarks… if enemies spawn from ground hatches which are baked into the surrounding scenery it will be easier to simplify and remember their spawn points. Destructible background objects also serve as anchor points that action happens around." [L] Section themes explicitly include "a lot of destructible terrain mixed with the enemies." [L]
- **Ikeda**: enemy placement is among "the most important things" [C42]; DDP's HIT counter exists to "make you go 'whoaa!!'" — and buildings feed it.

### 4.3 The feel argument

Spectacle is documented as the point: Raiden II's "shrapnel and debris fly all over the place, and you can even see pieces of enemy aircraft falling to the ground" [C10]; Garegga's "each enemy goes down in different blazes of glory" and "nearly every inch of Slayer may be destroyed using a special weapon for bonus points" [C56][C2]; Strikers' battleships stripped deck by deck [homage study]; RayForce's "impressive amount of crap that goes on one hundred meters below you" [C39]. Boghog: "The shmup objectively cannot be good if it doesn't have good explosions." [L]

---

## 5. Synthesis — what SPEEDHELL should adopt

Ranked by leverage. Each item names the canon example and is flagged against the pillars: **no hp inflation**, **no difficulty menu**, **speed-kill natural meta**, **readable chaos**, **60 fps**.

### Hole 1 — Safe spots

**S1. Replace `mayFire`'s "enemy 40px above player" rule with the canon's three gates.** (a) *Sealing*: only **ground turrets** go quiet, and only inside a radius (~48px) — Toaplan/CAVE convention [A5][A34]. (b) *Bottom dead zone*: an enemy below y ≈ player + 60 that has passed the player stops firing (the "can't shoot backwards" fairness rule) [L] — a band at the bottom, not a halo. (c) *Off-screen enemies never fire* [A46]. Everything else — air popcorn, mids, elites, midboss, **boss** — fires at the player anywhere via `aimAt`, which already computes any angle; needles already draw along velocity, so fire from beside or below speaks the existing bullet language (**readable chaos**: keep the needle family; no new bullet color). Reaction floor: 48px at needle speed 3.3 ≈ 15 frames ≈ 240 ms, above the rubric's 120 ms. This is the single change that un-mutes the boss. **Referee**: every seed re-rolls; the bot's target filter uses the same skip and needs the matching edit; a top-band camp probe joins the S6 set. *Canon example that nails it*: Flying Shark's aim-anywhere vector tests [A5].

**S2. The boss is never sealed, and it sweeps the top.** Ikeda removes safe spots by hand [A1]; Sengoku Ace's bosses swoop into the top lane and are ridden, not hidden from [A36]. Concretely: exempt type 5 from any mute; give one phase a top-lane sweep (an authored swoop to y≈40 and back) so the ceiling is periodically hull. **No hp.**

**S3. Make the top band physically alive — the Top Line pattern.** Boghog: 5–7 lanes, alternating sides, one lane's gap between spawns, "keep the player mobile" [L]. Add per section: one side-entering popcorn group crossing at y 30–60 (Garegga stage 5/6 [A18]); later in the stage a diver group from the bottom (Garegga stage 4's "ambush from below" [A18]; Gunvein's ships "fly up from the bottom" [L]). Timeline-only. This is what makes the top the *risky expert lane* — the hitboxes are there.

**S4. Loop 2: adopt Ketsui's seal, not Psikyo's blanket revenge fire.** Ikeda dropped suicide bullets from DDP because they make you "wait and stagger your shooting" [A1] — a direct threat to Pillar 2. Ketsui's answer: kills *inside the seal radius* release no revenge bullets; kills from range do; in Ura, sealed volleys add to the multiplier [A35][A15]. For SPEEDHELL: revenge dots on every kill made from beyond ~48px; point-blank speed kills stay silent (and, optionally, pay the sealed count as cancel garnish). The player's mastered habit — close and kill fast — becomes the *defense*, and the bottom-camp kill is the one that fills the screen. **Speed-kill meta preserved and sharpened; no menu (earned loop); no hp.**

### Hole 2 — Density

**D1. Adopt Psikyo's shape: short, dense stage; long boss.** Strikers 1945 II: 47 s stage + 67 s boss [B14]; "we make sure the stages are densely packed" [B19]. Target: stage-proper ~120–150 s at 80–100 enemies/min (≈180–220 enemies), boss 60–75 s. This is Pillar 1 taken literally and it is the cheapest route to "feels professional" because it removes minutes rather than adding content. *Alternative*: keep 4.5 min and go to ~250 enemies (~55/min) — the low end of the classic band.

**D2. Drop hp, raise count — the EuroShmup prescription.** "Drop down the enemy health and then increase the enemy count… small-to-medium HP enemies that attack the screen from different angles." [L] Popcorn stays 2 hp; add popcorn *between* every heavy (DDP's chain-filler mortar — the designers' own failure mode was "scarcity of enemies at the mid boss point" [B36]). **No hp inflation** — the opposite.

**D3. Overlap on the timeline.** "Putting enemy spawns close together on the timeline creates overlap… heavy overlap puts a lot of pressure on players and forces them to move around very aggressively." [L] Every heavy spawn gets popcorn layered around it; the caravan pull already rewards fast kills with sooner waves. **60 fps**: enemy pool is 64, bullet pool 1,400; CAVE peaked at 245 bullets and tens of enemies — headroom exists, but the stress scene needs re-running at the new counts.

### Hole 3 — Ground layer

**G1. Inert destructible scenery that pays gold, Psikyo-style.** Buildings, vehicles, crates on the terrain that scrolls anyway; 1–2 hp; no fire; pay 150–500 gold (**garnish-priced, S6**); no speed-kill window (they aren't enemies, so they don't touch the chain — keeps scoring legible, Pillar 2). *Canon*: "Gold bars are found inside destructible buildings" [C11]; Batrider's cars/huts/desks [C4]. Cheap: one enemy type with `fires=false`, drawn in the terrain palette so it never reads as a threat (**readable chaos**).

**G2. Ground turrets that sit ON landmarks and seal at point-blank.** Turrets embedded in the slabs and the planned hull set-piece (homage L7/DDP adopt #4 already call for it) — the canon's seal rule then *rewards* closing on them (Toaplan [A5]), which is the Pillar 2 incentive made physical. They also give the top band hitboxes (S3).

**G3. Scenery as memorization anchors and section identity.** Boghog: "destructible background objects also serve as anchor points that action happens around" [L]; one section themed on "destructible terrain mixed with the enemies" [L]. Tie a wave to a landmark (enemies emerge from a hatch, turrets on the hull) so the stage becomes a route through *places* — the r5 section slabs are already the scaffolding.

**G4. Explosion budget.** "The shmup objectively cannot be good if it doesn't have good explosions" [L]; r8-fx already ships tiers — scenery kills should use the existing tiers, and hull sections should strip in sequence like Strikers' decks and Garegga's Slayer [C2].

### Sequencing (boghog pass-cooldown)

1. S1 + S2 (one referee event; playtest the top). 2. S3 + G2 together (both are "hitboxes at the top"). 3. D1/D2/D3 as one density pass — this is the big one and should be its own round with new referee bars. 4. G1/G3/G4 as the ground-layer pass. 5. S4 when loop 2 is built.

---

## 6. What we don't know

- **No published enemy counts** for any Psikyo, Raiden or Compile stage; DDP's figure is a chain-record proxy inflated by laser ticks; Star Soldier's rests on an assumed squad duration. The *order of magnitude* (60–190/min vs our 22) is robust; the exact multiplier is not.
- **Strikers 1945 planes entering from below** — Jacob's recollection, not verified by any fetched source. Garegga's below/side entries are verified [A18].
- **Star Soldier / Soldier Blade rear formations** — only indirect evidence (rear-shot power-ups, "enemies flying from every direction" [A51]).
- **Psikyo loop-2 revenge-bullet speeds** — no numbers anywhere; only "damn fast."
- **Boss "moves to cover the top" as a rule** — not stated by any source; the Sengoku Ace swoop is one example.
- **Ground/air object fractions** — no census exists; Batrider's enemy list (~19% inert scenery by type) is the closest thing.
- **Garegga rank effects** — the wiki says rank raises bullet speed; the disassembly page documents only HP scaling [A16][A17].
- **Mark MSX / STG Weekly** on safe spots specifically — nothing found online; the local corpus supplies entropy and the Psikyo "speed hell" framing.
- Stage lengths are single-run samples (±10–20 s); Garegga's stage 1 differs by 27 s between two runs by the same player.

---

## Sources

### A — Safe spots and fire gating
A1 https://shmuplations.com/dodonpachi/ — Dodonpachi 1998 interview (Ikeda) · A4 https://shmuplations.com/cave15th/ · A5 https://shmuplations.com/toaplan-chronicleQA/ — Yuge Q&A · A8 https://shmuplations.com/psikyo/ · A9 https://shmuplations.com/cavestghistory/ · A12 https://shmups.wiki/library/DonPachi · A13 https://shmups.wiki/library/DoDonPachi · A15 https://www.shmups.wiki/library/Ketsui:_Kizuna_Jigoku_Tachi · A16 https://shmups.wiki/library/Battle_Garegga · A17 https://shmups.wiki/library/Battle_Garegga/Advanced_Rank · A18 https://shmups.wiki/library/Battle_Garegga/Stages · A20 https://shmups.wiki/library/Strikers_1945 · A21 https://shmups.wiki/library/Strikers_1945_II · A23 https://shmups.wiki/library/Gunbird · A24 https://shmups.wiki/library/Gunbird_2 · A26 https://shmups.wiki/library/Batsugun · A27 https://shmups.wiki/library/Raiden · A28 https://shmups.wiki/library/Star_Soldier · A32 https://shmups.wiki/library/Help:Glossary · A34 https://shmups.wiki/library/Boghog's_bullet_hell_shmup_101 · A35 https://shmups.system11.org/viewtopic.php?t=5123 — Ketsui ST (Valgar) · A36 https://shmups.system11.org/viewtopic.php?t=46183 — Sengoku Ace 1-ALL manual · A38 https://shmups.system11.org/viewtopic.php?t=26814 — Batrider ST · A39 https://shmups.system11.org/viewtopic.php?f=1&t=7087 · A40 https://www.hardcoregaming101.net/battle-garegga/ · A41 https://www.hardcoregaming101.net/raiden/ · A42 https://www.hardcoregaming101.net/dodonpachi-daioujou/ · A46 https://www.gamedeveloper.com/design/the-anatomy-of-a-shmup · A47 http://1cclog.blogspot.com/2022/03/dodonpachi-daioujou-playstation-2.html · A49 http://1cclog.blogspot.com/2023/02/strikers-1945-playstation-2.html · A51 https://www.arcadeattack.co.uk/star-soldier-nes-review/ · A52 https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Strikers1945 (via archive.today) · A53 https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/StarSoldier (via archive.today)

### B — Density
B1 https://www.youtube.com/watch?v=2UXpVV-iSpo — DDP 1-ALL chapter list · B4 https://www.youtube.com/watch?v=aCGck-jHKHE · B6 https://www.youtube.com/watch?v=rwB9rsAqZOw · B8 https://www.youtube.com/watch?v=EHwq4OGeIAQ · B9 https://www.youtube.com/watch?v=8UdAt2XkkfM · B10 https://www.youtube.com/watch?v=iQHqmPgw_80 · B12 https://www.youtube.com/watch?v=AlSCscxDWLs · B13 https://www.youtube.com/watch?v=Cs80np4roSg · B14 https://www.youtube.com/watch?v=nStvM1e6USQ — S1945II no-miss 2-ALL · B17 https://shmups.wiki/library/Strikers_1945 · B18 https://www.youtube.com/watch?v=w-Uy_QpaLiA · B19 https://shmuplations.com/psikyo/ · B20 https://www.youtube.com/watch?v=3X0PPk59cQQ · B22 https://www.youtube.com/watch?v=yI6FgE-AlDo · B23 https://www.youtube.com/watch?v=GA_NntBybrQ · B24 https://strategywiki.org/wiki/Star_Soldier/Enemies · B25 https://www.youtube.com/watch?v=XHBsgroiWLA · B27 https://www.youtube.com/watch?v=dtJFPuqBOY4 · B28 https://www.youtube.com/watch?v=uBCXPk9uaF0 · B29 https://longplays.org/infusions/longplays/longplays.php?longplay_id=13268 · B32 https://www.youtube.com/watch?v=oz5rCakaHWU · B33 https://www.youtube.com/watch?v=Q_WmQt6mAJA · B34 https://shmups.wiki/library/Ikaruga · B36 https://shmups.system11.org/viewtopic.php?t=4820 — DDP chaining thread · B38 https://shmuplations.com/cave15th/ · B41 https://shmups.wiki/library/Battle_Garegga/Stages · B42 https://shmups.wiki/library/Battle_Garegga · B44 https://shmups.wiki/library/Strikers_1945_II · B46 https://www.gamedeveloper.com/design/the-anatomy-of-a-shmup · B48 https://raw.githubusercontent.com/mamedev/mame/master/src/mame/atlus/sprite013.cpp · B50 https://shmuplations.com/dodonpachi/

### C — Ground layer
C1 https://shmups.wiki/library/Battle_Garegga · C2 https://shmups.wiki/library/Battle_Garegga/Stages · C3 https://retroxp.beehiiv.com/p/past-meets-present-battle-garegga · C4 https://shmups.wiki/library/Armed_Police_Batrider/Enemy_list · C6 https://www.hardcoregaming101.net/raiden/ · C7 https://shmups.wiki/library/Raiden · C8 https://www.hardcoregaming101.net/raiden-ii/ · C9 https://shmups.wiki/library/Raiden_II · C10 http://1cclog.blogspot.com/2013/09/raiden-ii-playstation.html · C11 https://www.hardcoregaming101.net/strikers-1945/ · C12 https://shmups.wiki/library/Strikers_1945 · C15 https://shmups.wiki/library/Strikers_1945/Stages · C17 https://shmups.wiki/library/DoDonPachi · C18 https://www.hardcoregaming101.net/dodonpachi/ · C19 https://shmups.wiki/library/DoDonPachi_DaiFukkatsu · C24 https://www.hardcoregaming101.net/tiger-heli/ · C25 https://www.hardcoregaming101.net/truxton/ · C30 https://shmuplations.com/toaplan-uemura/ · C31 https://strategywiki.org/wiki/Star_Soldier/Gameplay · C32 https://strategywiki.org/wiki/Star_Soldier/Stage_secrets · C33 http://1cclog.blogspot.com/2016/02/star-soldier-nes.html · C38 https://shmups.wiki/library/RayForce · C39 https://www.hardcoregaming101.net/rayforce/ · C42 https://shmuplations.com/dodonpachi2/ · C49 https://shmuplations.com/toaplan-yuge/ · C50 https://shmuplations.com/toaplan-chronicleqa/ · C51 https://shmuplations.com/seibukaihatsu/ · C52 https://shmuplations.com/viperphase1/ · C55 https://shmups.wiki/library/Boghog's_bullet_hell_shmup_101 · C56 https://www.hardcoregaming101.net/battle-garegga/

### L — Local corpora (on disk)
~/Dev/boghog-research/transcripts — SHMUP WORKSHOP 04 "Enemy Design & Effects" (2023-01-23), 05 "Level Design" (2023-02-06), "How to Avoid the EuroShmup" (2021-04-03), "The Design of Gunvein" (2023-10-28). ~/Dev/mark-msx-research/transcripts — "10 Modern Game Design Trends that Hurt Longevity" (2024-06-20), "Top 10 Greatest Shmup Developers" (2024-04-13). SPEEDHELL docs/homage film studies (DDP, S1945II, BRDA).

*Full per-pass findings with every source's fetch status: scratchpad files `safespot-findings.md`, `density-findings.md`, `ground-layer-findings.md`, `local-corpus-findings.md`.*
