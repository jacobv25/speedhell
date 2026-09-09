# Source note — "Bullet Hell Shmup Design 101" (the written 101)

*Logged 2026-09-09 at Jacob's request. Source: Google Doc
`https://docs.google.com/document/d/1iM9Fc2DsPppedlJVDYQ3g1VB5sFfilomGIYFIwJka9w`
(public, ~6,300 words, author not stated in the doc; it is the written
companion of the SHMUP WORKSHOP video series — same framing "know which rules
you're breaking and why", same "Toaplan pattern", same three pattern types —
so we treat it as boghog's own text and the PRIMARY source where the video
digest `docs/BOGHOG_WORKSHOP.md` relied on auto-captions). Cite as **[BH101
§Section]**. The doc's images are not reproduced; this note is a digest plus
what it adds or corrects versus our digest. Read the doc itself for the art.*

## Digest by section (what the doc says)

**Movement & space.** Play-area size is relative to object/hitbox size; tiny
danmaku hitboxes make large areas that *funnel you into many bullets* ("more
than twice the bullets" for the same challenge). Tune move speed and shot
width to the area: narrow → slower ships, narrow shots (Gunbird 2, Dragon
Blaze); wide → faster ships, wide/multi-directional weapons (Mars Matrix).
Movement: control, consistency, awareness are the top priority; same speed on
every axis, normalise diagonals; **no inertia, ever**; if it "doesn't feel
smooth" the cause is visuals — beef up the shot rate, afterimage, banking
matched to speed, trails, option inertia. Focus mode ≈ ⅔ speed, usually
interpolated (Touhou instant). Ship archetypes: fast + narrow, slow + wide.
**Players read the ship's position off the bullet stream**, silhouette and
nearby HUD — thick, fast, noticeable streams are visibility, not just feel;
centre the hitbox.

**Shooting.** "You become the game's animator." Skew things in the player's
favour subtly; punish big mistakes, forgive small ones. Order of polish:
(1) **speed** — force, immediate feedback, position tracking; sprite LENGTH
must match travel speed ("can be taken to ridiculous extremes and still look
good"; short sprites at high speed read wrong); (2) **density** — big fat
projectiles, huge messy streams, clustered, not neat ("Chaos feels good!"),
which also helps the player estimate position and imagine more than is
drawn; (3) huge shot hitboxes and enemy hurtboxes, no dead zones or gaps in
the stream, emitters low, **hits land while sitting on top of an enemy**.
**Shot limit**: closer = faster fire = more DPS — the natural proximity
dynamic; high rate + low on-screen count → aggressive games, the opposite →
dodging games; DDP's aura is another proximity-damage form worth trying.
**Power-ups lie**: ×1.1 per level is normal; make shots *feel* stronger by
width, height, speed, saturation, detail, damage sounds, or extra emitters at
lower per-shot damage.

**Lives, bombs, recovery.** Strict stock forces tight design; health bars are
taboo but Guwange/Deathsmiles/Akai Katana use them well. Death: cancel bullets
briefly, then a few seconds of invincibility *without* cancelling (so the
player can read the screen and reposition); generous invincibility prevents
chain deaths. Bombs: defensive (panic) and offensive; a few-frame
**death buffer** where a bomb pressed just before death nullifies it.

**Bullet patterns.** Visibility = **VALUE** (light/dark), test with a B&W
filter; bullets put bright cores next to dark rims; low-contrast midtone
backgrounds free the extremes for what matters; reds/pinks/purples avoid
clashing with explosions and gold items. **Chunk** bullets into lines and
groups — single strays feel unfair; odd trajectories need trails; wobble
animation gives bullets identity. **Depth sorting**: enemy bullets above
everything; smaller/faster bullets over bigger/slower; singles and small
chunks over big readable chunks. Three pattern types — aimed (pressure,
manipulable), static (obstacles, designer control), random (freshness,
handle with care); fixed emitters = clean, moving emitters = distortion.
**Lanes**: micro-challenges the player opts into, each with pros/cons; never
block off huge chunks of the screen.

**Enemies.** Three roles: **pressure, area denial, direct challenge** (the
video added *obstacle* and *funnel*; the doc keeps three). Dynamic design:
killing fast must be hugely beneficial and leaving alive dangerous — "the
last thing you want is enemies which are hard to kill but not very dangerous";
Ketsui vs Tyrian 2000. Three states per enemy: **Optimal kill / Average kill
/ Slow kill (safety net)**. Priority is emergent: high hp, dense patterns,
wide aimed cones, high fire rate. Rules of thumb: popcorn hp only what its
job needs; approaching for a kill must never be disproportionately
dangerous; ignoring must never beat killing; high-hp enemies drifting down
make "under them" deadly; big hitboxes, slow predictable movement; cheat with
"vulnerable only after the first shot" to guarantee a volley at low hp.
Polish: hit indicators (flash / particles / shake), subtle hit sfx, big meaty
explosions "significantly bigger than the enemy". Minor mechanics: bullet
sealing, top dead zone, ceasefire zone.

**Level design.** **Flow is the core goal**: an uninterrupted sequence of
smooth movement, guided by soft incentives and clear telegraphing; movement
frequent, smooth, varied (zigzag sweeps, tap-dodging, point-blanking at the
top, defensive dodging at the bottom), using the whole screen. Zigzags beat
vertical tank stacks; **avoid enemies near the borders (traps)**; **"Spawning
two or more higher HP enemies at the exact same time creates confusion in
the player as they won't know which to prioritise. Spawning them one-by-one
with slight delays in between creates an obvious route."** Player
behaviours: they sit near centre-Y; they close on a high-hp enemy as it
prepares to shoot, then drop back to dodge; as long as popcorn keeps
spawning they stream side to side; diagonal / up-down dodging on one side is
a last resort. **Toaplan pattern**: 5–7 lanes, none at the edges; spawn each
enemy opposite the previous; gaps sized by hp; best with high-priority
enemies — the core layer. **Layered design**: overlap in quick succession so
nobody lingers; overlap makes waves interact (fast kill → cleaner screen for
the next wave; slow kill → recover under it); popcorn as obstacles clustered
around the core spawns. Pacing: controlled repetition with variety;
intensity variation so peaks stand out; set pieces and props as landmarks;
background interaction (destructible scenery, hidden bonuses, craters).

**Scoring.** Systems = sets of **conflicting goals** (score vs survival; can't
grab every item; finite resources). Incentives must be **tangible** and
natural (audio-visual feedback, conditioned behaviours, behaviours the rules
already produce — caravan games reward fast kills); the ideal: players fall
into scoring by playing, gauge performance without reading numbers.
**Linear vs exponential** (metaphors): linear reflects skill holistically and
minimises frustration; exponential = high risk/reward, "one more try", clear
feedback; most games cap multipliers to bend exponential back toward linear.
**Aggressive vs defensive**: *defensive* = the game attacks you (DDP chain
timer; passivity punished); *aggressive* = you attack the game (Giga Wing;
passivity unrewarded); Guwange is both. **Depth vs clarity**: a hierarchy of
goals, discrete states, **inverted risk/reward** (riskier, more complex moves
pay *less*), emphasise the core visually and mute the garnish; simple plan
up front, nuances discovered later.

## What it adds or corrects versus `docs/BOGHOG_WORKSHOP.md`

- **Terminology:** the doc says *aggressive/defensive* where the digest says
  *positive/negative* (same split: DDP = defensive/negative, Giga Wing =
  aggressive/positive). Use the doc's words when quoting; keep the mapping.
- **Enemy roles are three** in the doc (pressure / area denial / direct
  challenge); the video's five (adds obstacle, funnel) is an elaboration.
- **New, precise lines the captions didn't carry:** sprite length ∝ travel
  speed; "hits land while sitting on top"; emitters low, no gaps in the
  stream; ×1.1 power-up lie; death buffer for bombs; deaths cancel briefly
  then *don't* (reposition on a readable screen); depth-sorting rules for
  bullets; the three kill states (optimal / average / slow); "never better to
  ignore than to kill"; high-hp enemies drifting down; the four player
  behaviours; "no lanes at the edges"; the Toaplan pattern as the *core layer*
  with popcorn as obstacles around it.
- **Flow paralysis line, verbatim** (Jacob's 2026-09-09 point, wiki Q21) — the
  doc scopes it to "higher HP enemies", which confirms that opposite-side
  popcorn pairs are fine and the S6 elite overlap / S3 four-mid presence are
  the real breaches.

## Where it bites SPEEDHELL right now

- **Q22 shot look** (`feat/shot-look`, r75): the doc is the strongest source
  — sprite length vs 9 px/f travel (our 20 px bolt is at the short end for its
  speed: "can be taken to ridiculous extremes"), fat messy density over
  neatness, the stream as *visibility* of the ship, low emitters, hit while
  sitting on top (we have enemy r + 6 — check the top-of-enemy case), muzzle
  and trail as the "afterimage" trick. If Jacob wants "thicker", the doc says
  longer and messier first.
- **Q21 flow:** verbatim support; the fix shape (one-by-one with slight
  delays) is the doc's own.
- **Ship B** (`design/ship-b`): the doc's archetype is "slower, weaker ships
  with wide shots" — weaker at range by design; and "narrow areas benefit
  from narrow shots" — our 320-px field is narrow, which is why a wide shot
  reads harder here than in wide-field games. Retune target stays Jacob's
  (easier on popcorn, harder on the boss) but expect the doc to push back on
  making B strong at range.
- **Enemy kill states:** our windows encode optimal/average; the "slow
  kill / safety net" state is the midboss + boss timeout and the elite's
  leave-alive ramp — worth naming in wiki §3 with the doc's words.
- **Depth sorting:** check `renderer.js` bullet draw order against "smaller,
  faster over bigger, slower; singles over chunks" (we draw needles vs rounds
  by kind, not by size/speed) — open item, not measured.
- **Referee bot** matches the doc's player behaviour #2 since the r65 fix
  (close on big targets), and fails #3 for elites (it never closes on them).
