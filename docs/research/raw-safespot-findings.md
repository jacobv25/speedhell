# Anti-camping & fire-gating in classic Japanese shmups — findings (research agent output, verbatim)

Method note: 24 WebSearch queries; ~45 pages fetched (shmuplations, shmups.wiki, HG101, 1cclog, blogs) plus 6 shmups.system11.org / TV Tropes pages pulled through the archive CLI. archive.today rate-limited mid-session, so three forum threads could not be read and are cited as snippet-only. Every quote below was seen in fetched text unless marked otherwise.

## 1. Do enemies fire when the player is above / beside / point-blank? Documented gating rules

**Proximity sealing is a deliberate, developer-confirmed rule (Toaplan, Tatsujin/Truxton).** Masahiro Yuge, Toaplan STG Chronicle Q&A, under Tatsujin:
> Q: "Ground enemies won't fire at you if you're within a certain proximity to them. How did this idea come about?"
> A: "We didn't want people to think the game was unfair. If the player's deaths weren't satisfying, he wouldn't want to play again." [5]

So the earliest documented gate is *distance*, not *angle*: sitting on top of a ground enemy silences it. shmups.wiki Glossary: "In many games, enemies have to be a certain distance away from the player before they will fire. Getting inside of this range will stop the enemy from shooting completely. This is commonly referred to as **bullet sealing**." [32] Boghog's 101 calls it "an anti-frustration mechanic that makes it so that weaker ground enemies don't shoot if the player's sitting on top of them/is very close to them." [34]

**Aimed shots that track any angle — Toaplan tested exactly this.** Yuge, under Hishouzame (Flying Shark): "We did tests to see whether the enemies could hit the ship at any given location on the screen. Then we were able to determine the details involving the vectors and direction of the enemy bullets." He adds: "The directional cross the bullets used for aiming wasn't done perfectly, and the angles were not exactly evenly spaced." [5] — aimed fire was engineered to reach the player anywhere, with residual safe angles an artifact of coarse angle tables, not intent.

**Off-screen enemies don't shoot (Raiden, and as a stated design rule).** HG101 on Raiden (1990): "To stave off enemy fire from one side of the screen, stay on the edge of the other side, as enemies offscreen can't shoot at you. The caveat is flying back into the range of unexpected enemies and suddenly meeting a deadly bullet." [41] Game Developer's "Anatomy of a Shmup": "Off-screen enemies should not be able to shoot" and "If an enemy appears out of thin air on-screen, allow time for the player to ready himself." [46]

**Raiden's aimed fire is what makes positioning a tool.** EmperorIng on arcade Raiden: "careful exploitation of enemy AI can get you as far as hard-memorization; ie, you don't necessarily need to know what's coming up ahead if you can lead aimed shots away from you. Obviously though, that means new enemies are the biggest threat." [37]

**Star Soldier (Hudson): aimed popcorn fire, and reaching point-blank is the failure state.** shmups.wiki: "enemy attacks consist primarily of small aimed shots" and "the best strategy for Star Soldier is to eliminate enemies as quickly as possible before they progress to a point-blank range." [28]

**Batrider rank explicitly turns on point-blank aggression.** Batrider ST (Icarus, system11): "Enemy Aggression: Enemies are more willing to attack you point-blank, charge straight at your craft, or engage in other aggressive behaviors." Also: fire rate, bullet speed, bullet count/tighter formations, resilience, item fall speed. [38]

**No source documents an "enemies only shoot when the player is below them" rule for any of these games.** What is documented is the opposite construction: distance-gated sealing for ground enemies (Toaplan → CAVE convention), and aimed vectors validated to hit anywhere on screen. Psikyo's stated rule is about fairness of death: Nakamura, "As a general rule in our games, players will only die when they hit a bullet." [8]

## 2. Enemies from the sides and from behind/below — who does it, where

**Battle Garegga (verified, stage-by-stage from shmups.wiki Stages):**
- Stage 4: "Shortly after the first orange tank, a large green tank will ambush the player from below." [18]
- Stage 5: flying platforms arrive as "a wave of three slow platforms from the top of the screen, a wave of six faster platforms from the top of the screen, and a wave where two platforms simultaneously enter the screen from the sides." [18]
- Stage 6: "Right before the start of the boss fight, ten small tanks will enter the screen from the side, five from the left and five from the right." [18]
- Stage 3 midboss carries "two rear side missile launchers"; its "turrets shoot aimed twin bullets." [18]
- Raizing gives the player a counter: options can be positioned "to fire behind you" (HG101) [40].

**Psikyo (Sengoku Ace, same house style; verified from a 1-ALL guide):**
- Stage 2: "a very large tank will rush down the screen and exit on the left side while firing" — passes through the player's lane. [36]
- Stage 4: "two large rectangular ships will swoop down from above and then back to the top of the screen" — enemies that dive to the player's altitude and retreat to the top. [36]
- Stage 3: a scripted "left-right-left-right process [that] only lasts about ten seconds" of turrets popping out and a big tank appearing. [36]

**Strikers 1945 planes entering from below — NOT verified.** Treat as unverified.

**Hudson / Star Soldier rear formations — thin.** Indirect: Star Soldier's second power-up "adds an additional stream to the main shot an a single rear shot (2-way)" [48]; max power is "five lines of fire (one forward and four diagonally in the front and back)" [28]; TV Tropes: "Homing Projectile: some of the enemies fire blue energy balls that magnetically lock on to the player's ship unless you move away from them" [53]; Arcade Attack: "throughout there are enemies flying from every direction waiting to crash into you." [51] Unverified: specific rear formations in Soldier Blade.

**DonPachi: side spawns are positioned relative to the visible window, so the player can steer them.** shmups.wiki DonPachi: airborne enemies "position relative to visible screen boundaries," and by sitting at the screen edge players can "control enemy spawn positions to a certain extent." [12]

## 3. Boss targeting, top-covering, and documented boss safe spots

**Ikeda (CAVE) on safe spots — hunts and removes them.** Dodonpachi 1998 interview:
> "Generally, I don't like them, and I do my best to find and remove them. If you're struggling with a tough pattern and the solution turns out to be staying in a safespot, then I personally think that's not very satisfying."
> "I believe it's possible for safespots to be used interestingly, and they do have the merit of being easily understandable solutions… However, I think that getting out of a difficult situation in a STG should take an appropriate degree of effort and technique." [1]
On final bosses (Cave 15th): "For final bosses, whose difficulty is supposed to be their appeal, I think it's a problem if you can just dodge it easily. Strong bosses should be intimidating." [4]

**Toaplan (Tatsujin) — safe spots were intentional, plus accidental ones.** Yuge: Q: "Were the various safespots intentionally added?" A: "Yes, they were. Though there were also spots that we only became aware of later." [5] Toaplan 1988 designs safe spots in as a memorizer's reward; CAVE 1997 treats them as defects.

**Documented boss safe spots:** Raiden final boss (used, location undescribed) [37]; DonPachi 4th boss first form, ship-dependent [12]; Sengoku Ace stage-5 boss: "If you stay still centered under him everything he fires will miss" — directly under the boss, i.e. at point-blank, not at the top or edge [36]. DDP stage 4/5 claims snippet-only [58].

**Do bosses aim anywhere / move to cover the top?** Psikyo boss guides are built around riding the boss: "Only popcorn kills you on collision in this game so for everything else you can position yourself right on top of it to maximize point blank damage. Particularly against bosses if you sit back and passively dodge you won't survive long so get in there and KILL." Stage 4 yellow boss: "fly up to the top of the screen and he will swoop down with a beam attack. Fly down as he is beaming and ride on top of his head." Final stage: "Position yourself at the top of the screen… Point blank while riding his head until he begins to fire and immediately bomb." [36] — the top is a scripted expert lane that the boss itself sweeps. Strikers 1945 II: ships gain damage "point blanking close to, or on top of enemies" [21]. No fetched source describes a boss that specifically moves to cover the top as an anti-camping rule; the Sengoku Ace swoop-and-beam is the one verified example of a boss entering the player's vertical lane.

## 4. Suicide / revenge bullets on second loops — mechanics and numbers

**DonPachi (1995), loop 2 — the template.** Four bullet types cycle as enemies die: Type 1 small, aimed with random angle variation; Type 2 larger, faster, aimed directly; Type 3 small, angle varying per player position; Type 4 small, aimed directly. "Stage 2-1 uses only Type 4; Stage 2-5 uses all types." Speed = base + rank modifier; "If the player dies, all revenge bullets become Type 4 at base speed only." [12]

**DoDonPachi (1997) — suicide bullets deliberately removed.** Ikeda: "There are four reasons. First, Dodonpachi is a game of intense, fast-paced shooting and dodging, and that pacing was very important to us. We determined that having to wait and stagger your shooting because of the danger of suicide bullets didn't fit the flow of the game. Second, it would make chaning too difficult in the 2nd loop. Third, suicide bullets were already being used by a lot of other games at the time. And fourth, I was tired of suicide bullets themselves and the way they make you play." [1] Loop 2 instead: "more aggressive enemies firing much larger amounts of bullets at a higher frequency" [13].

**DoDonPachi DaiOuJou (2002) — they came back, rank-scaled.** Loop 2 "even crazier… all extra lives you have in stock are taken away" [47]; rank "only increased by using Hypers… the speed and quantity of enemy bullets will increase dramatically while Hyper Mode is active" [42].

**Ketsui (2003) — Omote vs Ura, numbers.** Valgar's ST thread [35]:
- Omote loop: "Instead of releasing chips, enemies release Suicide bullets. Suicide Bullets are PINK. Chip Number is ALWAYS 1. You can stop suicide bullets from being released (seal) by being within a certain radius of enemies. If suicide bullets are sealed, then no chips are gained."
- Ura: "Suicide bullets are BLUE. There is a greater number of suicide bullets and they are quicker. The distance which you can seal suicide bullets is decreased. When suicide bullets are sealed, the number that was due to be discharged will be added to your multiplyer… End of round bonus DOUBLES."
- Wiki: "In the omate loop, sealed bullets do not contribute to the total, but in the ura loop they do." [15] First-loop 5-chip radius "within 1 1/2 ship lengths" [35].
Ketsui therefore pays you to seal at point-blank in Ura — the anti-camping incentive is monetized rather than merely punitive.

**Psikyo loop 2.** Strikers 1945: "denser and faster bullet patterns… enemies that are destroyed will release clusters of revenge bullets"; rank "is already at max." [20] Strikers 1945 II: "most flying enemies will also shoot revenge bullets when they die"; rank maxed [21]. Gunbird / Gunbird 2: "The second loop features significantly denser bullet patterns, and enemies will now release revenge bullets on death." [23][24] Gunbird 2 "the suicide bullets from the drones are damn fast." [39] No numeric speeds published.

**Batsugun (Toaplan, 1993).** "Loop 2… introduces suicide bullets from defeated enemies. Loop 3… Suicide bullets become larger. Loop 4… much larger when spawned, and then reduce to the size in loop 3." [26]

**Raiden loops** — no suicide bullets; "Higher loops considerably increase enemy bullet speed" [27].

**Battle Garegga — rank, not suicide bullets.** "As rank increases, more popcorn enemies spawn, enemies gain more health, enemies shoot more frequently, enemy bullets travel faster, and items fall off the screen faster." Rank rises with time, shots fired, items, special weapons, and bullet sealing; dying lowers it. [16] Stage 3: "Do not seal the bullets from the spinning turrets!!! They shoot so many bullets so rapidly that they can cause rank to increase at a frighteningly quick pace." [18] Yagawa: "income at the arcades is equivalent with the amount of time one spends playing." [9]

## 5. Developer / community commentary on "no safe spot" and the dangerous top

- **Ikeda, CAVE**: "We ask ourselves to what extent the bullet pattern in question can be visually understood. Then we ask how long it can be endured… It's just that process, repeated again and again." [4]
- **Yuge, Toaplan**: "there are many sections where if you initially make them too easy to learn, they become boring after you've memorized them." [5]
- **Nakamura/Yamada, Psikyo**: "players will only die when they hit a bullet"; "The first half of our games are relatively easy… in the latter half we design them so that memorization is important"; "nothing else should share the same colors as enemy bullets." [8]
- **Boghog (101)**: level design should test "aggressive point blanking at the top of the screen and defensive dodging at the bottom"; "They will get close to high HP enemies to do extra damage… Usually when said enemy is preparing to shoot. Then they'll tend to go back down to dodge the volley"; "Aimed… Good for pressure, allows conscious manipulation by the player. Static… Good for creating obstacles"; "Obvious safe spots that let you quickly kill enemies can also be very rewarding"; "Dead zone at the top of the screen… a small space near the very top where enemies cannot be killed or damaged." [34]
- **Game Developer "Anatomy of a Shmup"**: "There should always be a way out of every situation"; Radiant Silvergun/Ikaruga reward aggression with extra spawns. [46]
- **Sengoku Ace guide**: "the name of the game is aggression. You want to kill the most dangerous things on screen as quickly as you possibly can." [36]
- **Mark MSX / STG Weekly**: nothing fetched online (local transcripts on disk cover entropy and Psikyo "speed hell").

## 6. Why the TOP is the expert lane, not a hiding spot (Psikyo / CAVE)

1. **Point-blank is where the damage and score are.** Glossary: point-blank = "getting as close to an enemy as possible while shooting at them… in exchange for putting themselves at greater risk" [32]. Psikyo: riding point-blank kills bosses "in seconds" [36]; Strikers II ships gain damage "on top of enemies" [21]; Gunbird's Marion is weak "if she is forced to stay at the bottom." [23] CAVE: DDP "point-blanking an enemy so that both the Laser and aura are connecting to it will deal higher damage" [13]; DOJ "hyper medals are generated based on your ability to chain and to point blank enemies." [47] Ketsui: 5-chips only within ~1.5 ship lengths [35]; Ura pays for sealed bullets. [35][15]
2. **Contact at the top is a cost, not a death (Psikyo) — so the lane is playable but taxed.** TV Tropes Strikers 1945: "Collision Damage: Averted. Colliding with another plane will just power you down a notch." [52] 1cclog: "colliding against a flying enemy… doesn't kill you but rather takes away one power level, instantly reducing enemy aggression." [49] Sengoku Ace: "Only popcorn kills you on collision." [36] Rank "determined almost entirely by your powerup level" [36].
3. **Rank/hyper makes the aggressive position hotter.** DOJ hyper [42]; Garegga: sealing raises rank [16][18]; Batrider: high rank makes enemies "more willing to attack you point-blank, charge straight at your craft." [38]
4. **Sealing only works on the weak; ground turrets and the strong keep firing.** Sealing is defined for "weaker ground enemies" [34]; Sengoku Ace stage 3/7 turret gauntlets require dodging "two patterns. One requires you to stay still directly under them, the other requires you to dodge left or right" [36].
5. **Enemies dive into and retreat from the top; the lane is contested by the game's own scripting.** [36]
6. **Suicide bullets, where they exist, punish kills made from far away and reward kills made in the seal radius** — Ketsui, DOJ loop 2 — so the "safe" bottom-of-screen kill generates the revenge volley, and the top-lane kill is the quiet one. [35][15]
7. **The dead zone at the very top is an anti-cheese, not a shelter**: enemies there can't be damaged, so parking at the ceiling forfeits the kill without granting safety. [34]

## Contradictions / thin evidence
- Safe spots: Toaplan intentional [5] vs CAVE removes [1] — a documented change of philosophy across a decade.
- A search snippet claimed DDP has revenge bullets with random speeds; the fetched DDP wiki has no such section [13]; details match DonPachi [12]. Ikeda confirms DDP dropped them [1].
- Garegga rank effects: main wiki says rank raises fire rate and bullet speed [16]; the Advanced Rank page documents only HP scaling [17].
- Ketsui rank: Valgar says "No rank in Ketsui"; sven666 disagrees [35]. Unresolved.
- Strikers 1945 planes from below / behind — unverified. Star Soldier / Soldier Blade rear formations — unverified beyond indirect evidence.
- Boss "moves to cover the top" as an anti-camping device — no source states this as a rule.
- Psikyo loop-2 bullet speeds — no published numbers.

## Sources
1. https://shmuplations.com/dodonpachi/ — Dodonpachi 1998 interview (Ikeda/Kouyama/Ichimura) [fetched & verified]
2. https://shmuplations.com/dodonpachi2/ — Dodonpachi 1997 interview [fetched; nothing on topic]
3. https://shmuplations.com/ikeda/ — Ikeda 2004 [fetched; nothing specific]
4. https://shmuplations.com/cave15th/ — Cave 15th Anniversary interview [fetched & verified]
5. https://shmuplations.com/toaplan-chronicleQA/ — Toaplan STG Chronicle Q&A (Yuge) [fetched & verified]
6. https://shmuplations.com/toaplan-chronicle/ — Toaplan 2012 (Uemura/Yuge) [fetched & verified]
7. https://shmuplations.com/toaplan-vv/ — V-V 1993 interview [fetched & verified]
8. https://shmuplations.com/psikyo/ — Psikyo STG 1997 interview (Nakamura/Yamada) [fetched & verified]
9. https://shmuplations.com/cavestghistory/ — Cave Shooting History (Yagawa on rank) [fetched & verified]
10. https://shmuplations.com/scorer4/ — T3-Kamui Garegga interview [fetched; nothing on topic]
11. https://shmuplations.com/ibara/ — Ibara 2006 + Yagawa bonus [fetched & verified]
12. https://shmups.wiki/library/DonPachi [fetched & verified]
13. https://shmups.wiki/library/DoDonPachi [fetched & verified]
14. https://shmups.wiki/library/DoDonPachi_DaiOuJou [fetched; hyper bullet-speed line only]
15. https://www.shmups.wiki/library/Ketsui:_Kizuna_Jigoku_Tachi [fetched & verified]
16. https://shmups.wiki/library/Battle_Garegga [fetched & verified]
17. https://shmups.wiki/library/Battle_Garegga/Advanced_Rank [fetched & verified]
18. https://shmups.wiki/library/Battle_Garegga/Stages [fetched & verified]
19. https://shmups.wiki/library/Battle_Garegga/Strategy [fetched; little on topic]
20. https://shmups.wiki/library/Strikers_1945 [fetched & verified]
21. https://shmups.wiki/library/Strikers_1945_II [fetched & verified]
22. https://shmups.wiki/library/Strikers_1945/Stages [fetched; nothing on topic]
23. https://shmups.wiki/library/Gunbird [fetched & verified]
24. https://shmups.wiki/library/Gunbird_2 [fetched & verified]
25. https://shmups.wiki/library/Psikyo [fetched & verified]
26. https://shmups.wiki/library/Batsugun [fetched & verified]
27. https://shmups.wiki/library/Raiden [fetched & verified]
28. https://shmups.wiki/library/Star_Soldier [fetched & verified]
29. https://shmups.wiki/library/Soldier_Blade [fetched; nothing on topic]
30. https://shmups.wiki/library/Tatsujin [fetched; nothing on topic]
31. https://shmups.wiki/library/Armed_Police_Batrider [fetched & verified]
32. https://shmups.wiki/library/Help:Glossary [fetched & verified]
33. https://shmups.wiki/library/Help:Dodging_strategy [fetched & verified]
34. https://shmups.wiki/library/Boghog's_bullet_hell_shmup_101 [fetched & verified]
35. https://shmups.system11.org/viewtopic.php?t=5123 — ST: Ketsui (Valgar) [archive CLI, fetched & verified]
36. https://shmups.system11.org/viewtopic.php?t=46183 — SD: Sengoku Ace 1-ALL Flight Manual (ACSeraph) [archive CLI, fetched & verified]
37. https://shmups.system11.org/viewtopic.php?f=2&t=42751&start=30 — Raiden hi-score thread p.2 [archive CLI, fetched & verified]
38. https://shmups.system11.org/viewtopic.php?t=26814 — ST: Armed Police Batrider (Icarus) [archive CLI, fetched & verified]
39. https://shmups.system11.org/viewtopic.php?f=1&t=7087 — "hardest Psikyo Shmup" [archive CLI, fetched & verified]
40. https://www.hardcoregaming101.net/battle-garegga/ [fetched & verified]
41. https://www.hardcoregaming101.net/raiden/ [fetched & verified]
42. https://www.hardcoregaming101.net/dodonpachi-daioujou/ [fetched & verified]
43. https://www.hardcoregaming101.net/strikers-1945/ [fetched & verified]
44. https://www.hardcoregaming101.net/strikers-1945-ii/ [fetched; little on topic]
45. https://arcadeheroes.com/2023/06/30/remembering-batsugun-one-of-the-subgenre-defining-danmaku-games/ [fetched & verified]
46. https://www.gamedeveloper.com/design/the-anatomy-of-a-shmup [fetched & verified]
47. http://1cclog.blogspot.com/2022/03/dodonpachi-daioujou-playstation-2.html [fetched & verified]
48. http://1cclog.blogspot.com/2016/02/star-soldier-nes.html [fetched & verified]
49. http://1cclog.blogspot.com/2023/02/strikers-1945-playstation-2.html [fetched & verified]
50. http://1cclog.blogspot.com/2019/02/gunbird-playstation-2.html [fetched & verified]
51. https://www.arcadeattack.co.uk/star-soldier-nes-review/ [fetched & verified]
52. https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Strikers1945 [archive CLI, fetched & verified]
53. https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/StarSoldier [archive CLI, fetched & verified]
54. https://steamcommunity.com/sharedfiles/filedetails/?id=3216867268 — "(Almost) All About Strikers 1945" [snippet only]
55. https://shmups.system11.org/viewtopic.php?t=9097 — "Psikyo evolution" [snippet only]
56. https://shmups.system11.org/viewtopic.php?t=51658 — "Raiden considered a bullet hell?" [snippet only]
57. https://shmups.system11.org/viewtopic.php?t=9970 — Raiden III boss help [snippet only]
58. DDP stage 4/5 safe-spot claim — search snippet, page not identified [snippet only]
59. https://shmups.system11.org/viewtopic.php?t=11315 — Star Soldier GD [attempted; archive returned empty]
60. https://slateman.net/beestorm/database/bosses/ [fetched; no tactical content]
61. https://en.wikipedia.org/wiki/Battle_Garegga [snippet only]
