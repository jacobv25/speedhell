# Skin: cute-occult (r60 art round)

One file: `src/render/skins/cute-occult.js`. Peek sheet: `docs/img/r6x-skin-cute-occult.png`.
**Max-load draw: 1.76 ms** (budget 16.6). Other moments: s2 0.51 · s4 0.42 · p2 0.34 ms.
`node --check` clean. Nothing outside the skin file changed.

## What came from each sheet

**enemies.jpg** — the whole enemy family is the sheet's cast, one craft per behaviour:
the horned imp skull (popcorn *fighter*), the tall horned reaper with the swept bone
horns and the spike tail (*diver*), the eye-tipped lance with trailing blades
(*crosser*), the hooded rocket acolyte with the red plume (*riser*), the twin-cannon
acolyte whose gun pods wear their own little skulls (*mid*), the candle-spike gun on
a stone plinth (*turret*), the moth-wing barge — candled wing bar, spire with an eye,
skull cannon pods on struts, dried-red banners (*elite*), and the far-right horned
reliquary with the slit eye, crescent moons and skulls on chains (*midboss*, whose
phase B opens the lid and lights the iris).

**boss.jpg** — three forms, three silhouettes, modules visible on each: **P1** winged
reliquary cathedral (scalloped horn shields with wing-eyes, gilded halo, two gun
towers with barrel clusters, votive candles, twin exhausts, skulls on chains);
**P2** the flat manta with the six-module row along the leading edge, blood drips off
the trailing edge, four nozzles and the tail skull; **P3** the bare radiant core —
twelve bone spikes around a wine/gold eye on two angled engine pods. Boss parts
(type 6) are pieces of the form they came from: a horn shard, a torn-off gun module,
a spike shard.

**backgrounds.jpg** — the washed band is the crypt: hanging chains (dotted parallax
columns), votive motes, scrolling ritual circles (a dashed pentagram + rings, all
precomputed integer marks), and one code-drawn landmark per section: votive wall ·
bone cathedral spire · skull tower · blood gate · moth shrine · ossuary wall · chain
bridge · closed-eye reliquary · great altar with a sigil disc.

**ship-logo.jpg** — the broom-craft: bone skull figurehead on the shaft, swept
violet cloak wings, straw bristles trailing, 28 px span, no dot (the renderer's).
Because the hit dot covers the middle 16 px, the readable information is pushed to
the tips — skull at the nose, wings at ±14, bristles at the tail.

## What I changed and why

- **Bone is the family colour, not the brightness.** Skull masks are `AIR.base`
  with a single 1 px `hi` top edge and dark sockets, so a screen full of popcorn
  still sits below the bullet cores (S2). Sockets carry a 1 px dried-red ember
  instead of a bright eye.
- **Candle gold is a 2 px note only** (`GROUND.flame/flameHi`, both duller than
  `ITEM.gold`) — wick tips on turret, elite, midboss and boss. It never becomes a
  field.
- **Turret barrel is drawn before the dome** so the skull stays the read while the
  gun still emerges from under the chin; `angry` flares a wine collar ring wide
  enough to halo the skull (the base skin's rust stripe was invisible under it).
- **Boss eye iris shrunk** to r5–r8 after the first peek: the emitter hue must read
  as a tell, not a lamp.
- **Background lifted, vignette softened** (0.40 → 0.30) after the first peek: the
  crypt was so dark the sigils and landmarks vanished.

## Deviations, stated explicitly

1. **Pink / cyan on the boss.** The boss eye iris and the type-6 part windows carry
   `BOSS.cores` = pink / cyan / gold, exactly as `base.js` does (renderer case 6:
   "the one sanctioned body use"). Everywhere else pink and cyan are bullet-only,
   including all backgrounds. If the round wants that closed too, swap `core` for
   `HEAVY.wineHi` in `eye()` and the three part windows.
2. **Boss span is 112** (base 100) so the P1 horn shields and P2 wingtips fit; that
   is 100 px of body + rim, inside bible §6's "84–110 with modules" for decorative
   thin extents. Midboss span 76 (base 72) for the horn tips.
3. **Background uses a fourth low-sat family** — dim warm wax (`#2b1e12`) for
   candles. It is inside the washed band (≤ `#2c` per channel) and is value, not
   hue, at that darkness; on screen there are still ≤ 3 saturated hues (bone,
   dried red, candle gold) besides the bullets.
4. **`post` is a vignette** — one cached radial gradient, corner alpha ≈ 0.30,
   darkening only. It cannot lower bullet contrast; ~0.05 ms.

## Look at these first

- **The max-load panel**: bone popcorn en masse is the one place this skin could
  crowd the bullet layer. I think it clears, but that is the call to make.
- **The three boss forms side by side** — do they read as one machine changing
  form, or three unrelated things? (P3 is deliberately the brightest of the three;
  it is the bare core.)
- **Diver vs fighter at native scale in motion.** Both are skull-headed; the diver
  is separated by the horns and the spike, which is a silhouette read, not a colour
  one, and it rotates.
- **The turret's angry state** — the peek's gallery shows both turret cells angry
  (the harness's `g.frame = 300` trips the 240-frame timer), so the calm plinth is
  only visible in the s2 panel.
