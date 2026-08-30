# How bullet hells display the player hitbox — research for SPEEDHELL's marker

*2026-08-30. Commissioned after Booth session 2: the growing pink focus dot read as the hitbox while the effective kill distance (player 3px + bullet 3px = 6px) was triple its size. [F] = verified in the fetched page; [S] = snippet only.*

## The verdict

**The genre never draws a marker smaller than the truth.** Every verified marker is location-accurate but size-generous; the true edge is always inside the drawn edge, so every surprise is a pleasant one. SPEEDHELL's shrinking pink dot violated this in the cheating direction. Fix applied: one dot at the full 6px effective radius (bullet radius folded in — valid because every SPEEDHELL bullet has the same 3px hit radius). Rule: *a bullet's centre touching your dot is a hit.*

## Touhou [F]

- The focused white dot (PCB 2003 onward) is a **10×10px sprite**; the true hitbox is **3.3–7px square** in older games and a **2–3px radius circle** from Ten Desires on — the marker overstates by ~1.5–3×. ZUN's manual (via a 2005 forum post): the circle "is not the hitbox, but rather shows where the hitbox is centered. The hitbox is even smaller."
- Bullets carry their own hitboxes, all well inside their sprites: "larger bullets have a smaller ratio of hitbox to image"; the real-hitbox patch author measured bullet hitboxes "usually two to three times smaller in radius than the visible." 2005 forum: "the non-white border of those balloons does not count."
- Modern model: circle-vs-circle (player r 2–3 vs per-bullet circles) — the same structure as SPEEDHELL.

## CAVE [F unless noted]

- Arcade CAVE traditionally shows **nothing**; the hitbox is implied by a cockpit/gem (DDP's is "behind the cockpit windows", found by frame-stepping MAME). Progear/ESPGaluda/Vasara show it on the character-select screen only. DOJ's iOS port has an "Evade Support (shows the ship's hitbox)" option; SaiDaiOuJou's display existed on the debug PCB only (true box 6×6, 4×4 Expert, shrinking to 4×4/2×2 while moving).
- Mushihimesama's focus circle: "the hitbox itself is only a few pixels in the exact center of that circle." Steam user: bullets look bigger than they hit, "that leads to the impression of 'faulty' hitboxes, when in fact it's a visual issue." The famous "1-pixel hitbox" is community shorthand, not data-mined [S; disputed — "often 5×5-ish or more"].
- Deathsmiles bakes the marker into the sprite permanently (glowing heart) [S].

## Modern indies [F unless noted]

- **Crimzon Clover**: always-on glowing gem; Steam complaints that Type III's gem "has poor contrast" — an always-on marker must also be high-contrast.
- **ZeroRanger**: never displayed; wiki documents a 3×3px box.
- **Blue Revolver**: optional overlay; player and bullets are both 2×2px boxes ("only a truly solid hit will actually count" — danbo). Overlay "isn't 100% pixel-perfect due to rounding."
- **Devil Engine**: accessibility toggle for a visible hitbox or outline [S]. **Jamestown**: no marker [S].
- **boghog** (Bullet Hell 101): players don't look at their ship — they track it peripherally via the shot stream and silhouette; "perfectly centering the hitbox is important because it keeps things consistent."

## The psychology [F]

Significant Bits, "The 1-Pixel Collision Box": "Players were also less likely to feel cheated if they came out on the positive end of some collision-fiddling"; the small box creates "the illusion of empowerment." The inverse — a bullet or marker whose truth extends beyond its art — is what players report as unfair (Gunbird 2's needle bullets: "you thought you had passed the entire bullet and end up touching its tails").

## No game displays the combined kill distance

The convention is: show only the player's hurtbox (generously), and let each bullet's *opaque core* carry its own hitbox with the rim/glow as free safe area. SPEEDHELL can do better than the convention because its bullet radius is uniform (3px): folding it into the player marker makes the single-dot rule exact, not approximate.

## What changed in SPEEDHELL (r20)

`drawPlayer`: the canopy diamond, the true-size white dot, and the growing pink focus centre are gone. One marker: a dark well (r 8) for value contrast, a filled dot at **r 6 = hitR + bullet radius** (soft violet-white; pure white + pink rim while focused). The hitbox tester's red circles (truth: 3px vs 3px) and the in-game dot agree by construction: the red circles touch exactly when a bullet's centre reaches the dot's edge.

## Sources

Touhou Wiki Hitbox (en.touhouwiki.net/wiki/Hitbox, via archive) · shmups.system11.org t=1284 "hitbox data for modern shmups" (via archive) · shrinemaiden.org topics 726 & 15400 · hardcoregaming101.net/dodonpachi-daioujou · shmups.wiki/library/DoDonPachi_SaiDaiOuJou · Steam Mushihimesama hitbox threads (app 377860) · steamcommunity app 285440 (Crimzon Clover contrast) · zeroranger.miraheze.org Gameplay · shmups.wiki/library/Blue_Revolver + Steam app 439490 threads · shmups.wiki Boghog's bullet hell 101 · significant-bits.com/the-1-pixel-collision-box · [S]: TVTropes Deathsmiles, NintendoLife Devil Engine, Destructoid Crimzon Clover, "1-pixel" forum claims, system11 t=45122 (archive never completed).
