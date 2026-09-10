// BASE SKIN — the r58 look (ART_BIBLE Round 1: named palette, family rims,
// pixel grid), lifted out of renderer.js unchanged so it can sit beside the
// four concept-direction skins (r60). This file is the reference every other
// skin is measured against; the referee harness always draws it.
//
// SKIN CONTRACT (renderer.js owns everything not listed here):
//   id, name                — registry key + Lab label
//   pal                     — { AIR, GROUND, HEAVY, SHIP, ITEM, UI, BOSS }; the bullet
//                             castes (ROUND / NEEDLE) are NOT skinnable — wiki §6.2
//   span[type]              — sprite-cache canvas size per enemy type (rotated extent + rim)
//   rimOf(type, phase)      — 1px outline colour per family (null = no rim)
//   drawBackground(ctx, g, bgScroll, sec, bossPhase, K, secT)   // r78: secT = the section's entry stageT (from the stage module)
//                           — the whole field behind items/enemies; MUST stay inside the
//                             washed band (S2-MUST-1): a landmark may be large, never bright
//   paintEnemy(c, type, phase, side, step, prop, hit, flick, extra, K)
//                           — paint one enemy sprite centred on the origin, nose DOWN (+y);
//                             rotate by step*K.STEP yourself for the flying types; sprites
//                             stay within ~1.2 × ENEMY_DEFS r (bible §6); hit ⇒ all white
//   paintShip(c, K)         — the player craft centred on the origin, ~28px span, NO dot
//                             (the renderer draws the hit dot — display contract §6.2)
//   paintItem(c, r, K)      — gold pickup disc of radius r
//   post(ctx, g, K)         — optional: after bullets, before popups. Alpha-capped overlays
//                             only (scanlines, halftone, glow); must never lower bullet contrast
// K (kit) = { poly, disc, STEP, STEPS, W, H, white }.
// Rules for every skin: no core, no bullets, no dot, no hitboxes; pink + cyan stay
// bullet-only; gold = value; enemy bodies read below bullet contrast (S2).

const AIR    = { out: '#2a2f45', shade: '#5c6584', base: '#8d97b4', hi: '#c9d1e8', glass: '#eef1f8' };
const GROUND = { out: '#2a2816', plate: '#34321f', shade: '#5f5c3e', base: '#9a9678', hi: '#c6c2a2', exhaust: '#d9c08a' };
const HEAVY  = { out: '#22242e', shade: '#474c60', base: '#7a8097', hi: '#aab1c8', stripe: '#8a5a52', core: '#f0e6c8' };
const SHIP   = { dark: '#4a3f78', shade: '#6b5aa8', edge: '#c9bdf5', hull: '#f0ecff', shot: '#c3a8ff', well: '#241f38', dot: '#e8e2ff' };
const ITEM   = { rim: '#0e0c04', gold: '#ffd24a', glint: '#fff6d0' };
const UI     = { text: '#cdd3e8', dim: '#8a8fa8', score: '#e8ecf8', lives: '#e8f6ff', white: '#ffffff',
                 gold: ITEM.gold, warn: '#ff4fa3', warnHi: '#ff8ec4', warnBand: '#14040a', warnText: '#ffe6f2',
                 hudBack: 'rgba(6,8,14,0.55)', bannerBack: 'rgba(6,8,14,0.72)', bombFlash: '#dff6ff' };
// Boss surface is Round 2 (bible §10); r57 only named what r56 drew.
const BOSS   = { hull: '#c8cde0', armor: '#3a3f55', burnA: '#e0604a', burnB: '#7a2a22', ember: '#ffb347', strut: '#8a8fa8', hot: '#fff6f0',
                 // r83 (stage 5's four-form finale): a FOURTH core slot. The art bible
                 // (§3 "never a fourth saturated hue", §10 "core colour per phase stays
                 // pink / cyan / gold") has no fourth hue to give, so form 4 does NOT get
                 // one — the hollow core burns in the boss row's OWN `ember`, which is
                 // already sanctioned there for the burn beat. No new hue enters the game
                 // and the exclusivity rule (pink/cyan = bullets, gold = value) holds.
                 cores: ['#ff4fa3', '#37d6e0', ITEM.gold, '#ffb347'] };

// FIELD family (bible §3): section place-identity (r5 S5-SHOULD-1) — each stage
// section gets its own subtle background accent — hue-shifted slabs/stars near
// the base wash values, plus one large landmark slab that scrolls through as
// the section plays. Keyed off g.stageT; values stay washed-out so the
// background never competes with the bullet layer (S2-MUST-1).
const FIELD_BG = '#0a0c14';
const SEC_SLAB = ['#12151f', '#101726', '#171820', '#181422', '#1d1418', '#1c1812', '#101c17', '#101a26', '#1d1220'];
const SEC_STAR = ['#161a28', '#141d30', '#1e2026', '#1f1a2e', '#261b20', '#25211a', '#16241e', '#152230', '#261a2a'];
const SEC_LAND = ['#161a26', '#141c2e', '#1e2028', '#211c30', '#291d22', '#28241c', '#182922', '#1a2632', '#2a1e2e'];
const SEC_LANDGEO = [ // landmark [x, w, h] — distinct silhouette per section
  [120, 80, 50], [30, 110, 46], [210, 70, 90], [60, 150, 40], [110, 100, 100],
  [200, 90, 56], [20, 130, 60], [90, 140, 36], [70, 180, 70],
];
// r80 STAGE 2 — THE BONE RAIL place ramp (L1, plan §3): one landmark per section,
// base-skin geometry in the FIELD band (bible §3: a landmark may be large, never
// bright). [x, w, h] per SECTIONS index: intro rail · catacomb mouth · ossuary
// canal · rail yard · the hull's dock (the barge itself is an enemy) · dock
// (the Hearse's stretch) · bell-tower approach · (boss: the arena restains).
const S2_LANDGEO = [
  [40, 240, 60], [70, 180, 90], [20, 280, 70], [30, 260, 80], [110, 100, 60],
  [110, 100, 60], [125, 70, 150], [90, 140, 36],
];
function landmark2(ctx, sec, x, y, w, h, land, slab, K) {
  const { W } = K;
  ctx.fillStyle = land;
  switch (sec) {
    case 0: // the rail: two long rails with sleepers
      ctx.fillRect(x + 20, y, 3, h); ctx.fillRect(x + w - 23, y, 3, h);
      ctx.fillStyle = slab; for (let yy = y + 4; yy < y + h; yy += 12) ctx.fillRect(x + 14, yy, w - 28, 3);
      break;
    case 1: // catacomb mouth: an arch of stacked blocks
      ctx.fillRect(x, y + 20, w, h - 20);
      ctx.fillStyle = slab; ctx.fillRect(x + 30, y + 34, w - 60, h - 34);
      ctx.fillStyle = land; for (let i = 0; i < 7; i++) ctx.fillRect(x + 10 + i * 24, y + 8 - (i === 3 ? 8 : Math.abs(i - 3) * 2), 20, 14);
      break;
    case 2: // ossuary canal: two banks of niches, a dark channel between
      ctx.fillRect(x, y, 70, h); ctx.fillRect(x + w - 70, y, 70, h);
      ctx.fillStyle = slab; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { ctx.fillRect(x + 8 + c * 20, y + 8 + r * 20, 12, 12); ctx.fillRect(x + w - 62 + c * 20, y + 8 + r * 20, 12, 12); }
      break;
    case 3: // rail yard: four converging rails
      for (let i = 0; i < 4; i++) { const rx = x + 20 + i * 70; ctx.fillRect(rx, y, 3, h); ctx.fillRect(rx + 14, y, 3, h); }
      ctx.fillStyle = slab; for (let yy = y; yy < y + h; yy += 10) ctx.fillRect(x, yy, w, 2);
      break;
    case 4: case 5: // the dock: two pylons with a crossbeam (the barge parks here)
      ctx.fillRect(x, y, 14, h); ctx.fillRect(x + w - 14, y, 14, h); ctx.fillRect(x, y + 6, w, 6);
      ctx.fillStyle = slab; ctx.fillRect(x + 20, y + 18, w - 40, h - 24);
      break;
    case 6: { // bell-tower approach: a tall tower, belfry arch, a bell
      ctx.fillRect(x, y + 20, w, h - 20); ctx.fillRect(x - 8, y + 12, w + 16, 10);
      ctx.fillStyle = slab; ctx.fillRect(x + 20, y + 40, w - 40, 44); ctx.fillRect(x + 14, y + 100, w - 28, h - 104);
      ctx.fillStyle = land; ctx.fillRect(x + w / 2 - 9, y + 50, 18, 20); ctx.fillRect(x + w / 2 - 12, y + 68, 24, 5);
      break;
    }
    default: ctx.fillRect(x, y, w, h); ctx.fillStyle = slab; ctx.fillRect(x + 10, y + 8, w - 20, h - 16);
  }
  void W;
}
// r82 STAGE 3 — THE CANDLE SEA place ramp (L1, plan §3): open sky over a sea of
// votives → the moth shrine → the candle field → the cocoon. This is the
// BRIGHTEST background in the game and the washed band is the hard constraint
// (S2-MUST-1, bible §3 "a landmark may be large, never bright"): every swatch
// below is warm wax, and NO channel exceeds 0x2e — the same ceiling every other
// stage's field obeys. The candles are dim motes, never lights; the bullet layer
// keeps the top of the value ladder untouched.
const S3_BG = '#100c10';
const S3_SLAB = ['#1e1a14', '#221c14', '#251e15', '#282016', '#2a2217', '#2c2418', '#241d16', '#1c1812'];
const S3_STAR = ['#2a2418', '#2e281a', '#2e2a1c', '#2e2a1e', '#2e2c20', '#2e2c1e', '#2a261a', '#242016'];
const S3_LAND = ['#241f18', '#282218', '#2b251a', '#2e2818', '#2e2a1c', '#2e2a1a', '#282218', '#221d16'];
const S3_LANDGEO = [ // [x, w, h] per SECTIONS index: votive sea · the drill's open water ·
  // the moth shrine · the candle field · the shrine plaza (the Moths' arena) ·
  // the deep field · THE COCOON (the boss's approach landmark, L2) · the arena.
  [20, 280, 46], [20, 280, 54], [80, 160, 110], [16, 288, 90],
  [50, 220, 76], [16, 288, 100], [96, 128, 150], [90, 140, 36],
];
function landmark3(ctx, sec, x, y, w, h, land, slab, K) {
  const { W } = K;
  const votives = (rows, cols, x0, y0, dx, dy) => { // a field of candle stubs: a 3px wax block with a 2px wick mote
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const px = x0 + c * dx + (r & 1) * (dx >> 1), py = y0 + r * dy;
      ctx.fillStyle = slab; ctx.fillRect(px, py + 3, 4, 7);
      ctx.fillStyle = land; ctx.fillRect(px + 1, py, 2, 3);
    }
  };
  switch (sec) {
    case 0: case 1: // the votive sea: rank on rank of candle stubs on open water
      ctx.fillStyle = slab; for (let i = 0; i < 3; i++) ctx.fillRect(x, y + i * 18, w, 2);
      votives(sec === 0 ? 3 : 4, 11, x + 8, y + 4, 26, 14);
      break;
    case 2: { // the moth shrine: a stepped plinth under an arch with a moth sigil
      ctx.fillStyle = land; ctx.fillRect(x + 24, y + 40, w - 48, h - 40);
      ctx.fillStyle = slab; ctx.fillRect(x + 12, y + h - 26, w - 24, 10); ctx.fillRect(x, y + h - 14, w, 12);
      ctx.fillStyle = land; ctx.fillRect(x + 30, y + 20, w - 60, 22);
      ctx.fillStyle = slab; // the sigil: two swept wings and a body
      ctx.fillRect(x + w / 2 - 2, y + 52, 4, 26);
      for (let i = 0; i < 4; i++) { ctx.fillRect(x + w / 2 - 8 - i * 7, y + 52 + i * 5, 6, 12 - i * 2); ctx.fillRect(x + w / 2 + 3 + i * 7, y + 52 + i * 5, 6, 12 - i * 2); }
      votives(1, 5, x + 14, y + h - 12, 28, 10);
      break;
    }
    case 3: case 5: { // the candle field: tall tapers of three heights, waxfall between
      ctx.fillStyle = slab; ctx.fillRect(x, y + h - 12, w, 12);
      for (let i = 0; i < 12; i++) {
        const px = x + 10 + i * 24, ph = 20 + ((i * 7) % 5) * (sec === 5 ? 13 : 9);
        ctx.fillStyle = slab; ctx.fillRect(px, y + h - 12 - ph, 7, ph);
        ctx.fillStyle = land; ctx.fillRect(px + 2, y + h - 16 - ph, 3, 5);
      }
      break;
    }
    case 4: { // the shrine plaza: a wide altar slab flanked by two candle banks
      ctx.fillStyle = land; ctx.fillRect(x + 40, y + 16, w - 80, h - 30);
      ctx.fillStyle = slab; ctx.fillRect(x + 52, y + 26, w - 104, h - 50);
      votives(2, 3, x + 6, y + 12, 14, 20); votives(2, 3, x + w - 46, y + 12, 14, 20);
      ctx.fillStyle = land; ctx.fillRect(x, y + h - 12, w, 8);
      break;
    }
    case 6: { // THE COCOON — the boss's approach landmark: a chrysalis slung on silk
      ctx.fillStyle = slab; for (const sx of [x + 18, x + w - 20]) ctx.fillRect(sx, y, 2, 46);
      ctx.fillStyle = land;
      const cx = x + (w >> 1), top = y + 40;
      ctx.fillRect(cx - 26, top + 22, 52, 60); ctx.fillRect(cx - 20, top + 6, 40, 18); ctx.fillRect(cx - 14, top, 28, 8);
      ctx.fillRect(cx - 20, top + 82, 40, 16); ctx.fillRect(cx - 12, top + 98, 24, 10);
      ctx.fillStyle = slab; for (let i = 0; i < 6; i++) ctx.fillRect(cx - 24 + (i & 1) * 6, top + 26 + i * 12, 42, 3); // the silk banding
      votives(1, 7, x + 6, y + h - 10, 18, 10);
      break;
    }
    default: ctx.fillStyle = land; ctx.fillRect(x, y, w, h); ctx.fillStyle = slab; ctx.fillRect(x + 10, y + 8, w - 20, h - 16);
  }
  void W;
}
// r6 S3b-SHOULD: arena restain per boss phase — deep blue → red-shifted →
// white-hot dawn (homage BRDA#6), all values inside the washed band.
const BOSS_BG = ['#0a0e1a', '#130a0e', '#141317', '#160b12'];
const BOSS_SLAB = ['#111b30', '#261416', '#28262c', '#2a1626'];
const BOSS_STAR = ['#15233c', '#2c181a', '#302e33', '#311a2b'];
// r83: a FOURTH entry each — stage 5's Idol restains once more (S3b-SHOULD, one
// restain per form). Indexes 0-2 are byte-identical, so stages 1-3 are untouched;
// index 3 is only ever reached by a four-form boss.
const BOSS_LAND = ['#16243e', '#2e1a1e', '#333038', '#361d30'];

export const TURRET_PLATE = [[-9, -13], [9, -13], [13, -9], [13, 9], [9, 13], [-9, 13], [-13, 9], [-13, -9]];

function drawBackground(ctx, g, bgScroll, sec, bossPhase, K, secT = 0) {
  const { W, H } = K;
  const s3 = g.level === 2; // r82: THE CANDLE SEA runs its own warm field palette
  const i3 = Math.min(sec, S3_SLAB.length - 1);
  const bgC = bossPhase >= 0 ? BOSS_BG[bossPhase] : s3 ? S3_BG : FIELD_BG;
  const slabC = bossPhase >= 0 ? BOSS_SLAB[bossPhase] : s3 ? S3_SLAB[i3] : SEC_SLAB[sec];
  const starC = bossPhase >= 0 ? BOSS_STAR[bossPhase] : s3 ? S3_STAR[i3] : SEC_STAR[sec];
  const landC = bossPhase >= 0 ? BOSS_LAND[bossPhase] : s3 ? S3_LAND[i3] : SEC_LAND[sec];
  ctx.fillStyle = bgC;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  { // landmark slab: enters at the section boundary, scrolls with section progress
    const geo = g.level === 1 ? S2_LANDGEO : g.level === 2 ? S3_LANDGEO : SEC_LANDGEO; // r80/r82: stages 2 and 3 have their own place ramps
    const [lx, lw, lh] = geo[Math.min(sec, geo.length - 1)];
    const ly = Math.round((g.stageT - secT) * 0.55 - lh - 20);
    if (ly < H + 20) {
      if (g.level === 1) landmark2(ctx, sec, lx, ly, lw, lh, landC, slabC, K);
      else if (g.level === 2) landmark3(ctx, sec, lx, ly, lw, lh, landC, slabC, K);
      else {
        ctx.fillStyle = landC; ctx.fillRect(lx, ly, lw, lh);
        ctx.fillStyle = slabC; ctx.fillRect(lx + 10, ly + 8, lw - 20, lh - 16); // inset gives it structure
      }
    }
  }
  ctx.fillStyle = starC;
  for (let i = 0; i < 40; i++) {
    const sx = Math.floor((i * 137.5) % W);
    const sy = Math.floor(((i * 89.3) + bgScroll * (0.4 + (i % 3) * 0.3)) % (H + 40) - 20);
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, 8 + (i % 3) * 6);
  }
  ctx.fillStyle = slabC;
  for (let i = 0; i < 6; i++) {
    const sy = Math.floor(((i * 173) + bgScroll * 0.25) % (H + 120) - 60);
    ctx.fillRect(30 + (i * 97) % (W - 120), sy, 60, 34); // dim "terrain" slabs
  }
}

function rimOf(type, phase) {
  if (type === 0) return phase === 1 ? HEAVY.out : phase === 3 ? GROUND.out : AIR.out;
  if (type === 1) return AIR.out;
  if (type === 2 || type === 7 || type === 8 || type === 9) return GROUND.out; // r80: the ground layer is the GROUND family
  if (type === 11 || type === 12) return AIR.out;                              // r82: the file leader and the carrier fly with the popcorn (AIR)
  return HEAVY.out;                                                            // r82: a Twin Moth (13) is HEAVY — the moth family (bible §3)
}

// r20 enemy identity pass: identity from SHAPE, SIZE, MOTION and LAYER — never
// saturated colour. AIR = aircraft silhouettes, GROUND = squat plate + aiming
// barrel. Sprites drawn nose-DOWN (+y); rotate by step for the flying types.
// r80: `lvl` (11th arg) = g.level for the stage-owned types (4 midboss, 5 boss,
// 6 part) — stage 2's Hearse and Bell are drawn here in base geometry; the
// other skins fall back to this painter for them (renderer drawEnemy).
// r81: `tell` (12th arg) = the sealed tell (renderer drawEnemy): the ground gun is
// muted by proximity this frame — cap its muzzle, drop the barrel's highlight.
function paintEnemy(ctx, type, phase, side, step, prop, hit, flick, extra, K, lvl = 0, tell = 0) {
  const { poly, disc, STEP } = K;
  const F = (c) => { ctx.fillStyle = hit ? UI.white : c; };
  const S = (c) => F(flick ? BOSS.armor : c); // surface fill: armor shimmer applies
  if (lvl === 1 && (type === 4 || type === 5)) { paintStage2Boss(ctx, type, phase, side, prop, hit, flick, extra, K, F, S); return; }
  if (lvl === 2 && type === 5) { paintStage3Boss(ctx, phase, prop, flick, extra, K, F); return; }
  // r83: stage 5's THE IDOL. Today STAGES = [s1, s2, s3], so the module is only
  // ever at level 3 (the ?boss=idol dev flag / tools/s5peek.html / the probe) —
  // hence `lvl >= 3`. When stage 4 registers, its painter is added ABOVE this
  // line at lvl 3 and the Idol slides to lvl 4 with no edit here.
  if (lvl >= 3 && type === 5) { paintStage5Boss(ctx, phase, side, prop, flick, extra, K, F); return; }
  switch (type) {
    case 11: { // r82 FORMATION LEADER — the head of a file: a zako's silhouette
      // grown one notch (r 12) with a swept delta and a bright CREST, so the
      // one body you must pick out of seven reads at a glance (WS04 priority /
      // S4 "distinct silhouettes"). `extra` 1 = the window has expired and the
      // file has TURNED: the crest goes wine-red — the miss is announced.
      ctx.rotate(step * STEP);
      const turned = extra === 1;
      S(AIR.shade); poly(ctx, [[0, 15], [12, -2], [7, -9], [-7, -9], [-12, -2]]);
      S(AIR.base); poly(ctx, [[0, 13], [5, -1], [4, -10], [0, -12], [-4, -10], [-5, -1]]);
      S(AIR.hi); poly(ctx, [[0, 14], [12, -2], [10, -2], [0, 11]]); poly(ctx, [[0, 14], [-12, -2], [-10, -2], [0, 11]]);
      S(turned ? HEAVY.stripe : AIR.hi); ctx.fillRect(-1, -13, 2, 6); ctx.fillRect(-3, -11, 6, 2); // the crest
      S(AIR.glass); ctx.fillRect(-1, 1, 2, 3);
      break;
    }
    case 12: { // r82 CARRIER — a bulbous transport with belly doors: the pods drop
      // from them. Wider and rounder than the mid's twin boom so "this one makes
      // more of them" reads from the shape. `extra` 1 = left alive past its polite
      // phase (the doors hang open and the metronome has doubled — S4 lifecycle).
      ctx.rotate(step * STEP);
      const open = extra === 1;
      S(AIR.shade); poly(ctx, [[-17, -2], [17, -2], [14, 7], [-14, 7]]);            // wing
      S(AIR.shade); ctx.fillRect(-5, -14, 10, 4);
      S(AIR.base); poly(ctx, [[0, 14], [8, 6], [9, -6], [0, -13], [-9, -6], [-8, 6]]); // hull
      S(AIR.hi); ctx.fillRect(-17, -2, 34, 1); poly(ctx, [[0, -13], [9, -6], [7, -6], [0, -11]]);
      S(HEAVY.shade); ctx.fillRect(-7, 4, 14, 6);                                    // the pod bay
      S(open ? HEAVY.core : HEAVY.base); ctx.fillRect(-5, 5, 4, 4); ctx.fillRect(1, 5, 4, 4);
      S(AIR.glass); ctx.fillRect(-2, -6, 4, 4);
      S(AIR.hi); if (prop) { ctx.fillRect(-14, 1, 6, 1); ctx.fillRect(8, 1, 6, 1); }
      break;
    }
    case 13: { // r82 A TWIN MOTH — the midboss PAIR's body: broad scalloped wings,
      // a furred thorax, feathered antennae; HEAVY (the moth family, bible §3).
      // `side` mirrors it, so the pair is a true reflection. `extra` 1 = ENRAGED
      // (its twin is dead): the thorax burns wine and the eyes open.
      const rage = extra === 1;
      S(HEAVY.shade); poly(ctx, [[0, -4], [-30, -18], [-38, -2], [-26, 14], [-8, 8]]);   // left wing
      S(HEAVY.shade); poly(ctx, [[0, -4], [30, -18], [38, -2], [26, 14], [8, 8]]);       // right wing
      S(HEAVY.base); poly(ctx, [[0, -2], [-24, -14], [-30, -3], [-20, 9], [-7, 6]]);
      S(HEAVY.base); poly(ctx, [[0, -2], [24, -14], [30, -3], [20, 9], [7, 6]]);
      S(HEAVY.hi); poly(ctx, [[0, -4], [-30, -18], [-27, -16], [-2, -5]]); poly(ctx, [[0, -4], [30, -18], [27, -16], [2, -5]]);
      S(rage ? HEAVY.stripe : HEAVY.shade); ctx.fillRect(-13, -1, 8, 2); ctx.fillRect(5, -1, 8, 2); // the wings' eye-spots
      S(HEAVY.base); poly(ctx, [[0, 18], [5, 6], [5, -12], [0, -16], [-5, -12], [-5, 6]]); // thorax
      S(rage ? HEAVY.stripe : HEAVY.shade); ctx.fillRect(-4, -8, 8, 2); ctx.fillRect(-4, -3, 8, 2); ctx.fillRect(-3, 2, 6, 2);
      S(HEAVY.hi); ctx.fillRect(-2, -16, 4, 3);
      S(HEAVY.shade); for (let i = 0; i < 4; i++) { ctx.fillRect(-6 - i * 2, -19 - i * 2, 3, 2); ctx.fillRect(3 + i * 2, -19 - i * 2, 3, 2); } // antennae
      S(rage ? HEAVY.core : AIR.glass); ctx.fillRect(-3, -13, 2, 2); ctx.fillRect(1, -13, 2, 2);
      break;
    }
    case 7: { // r80 RAIL TANK — tracked box, khaki dome, barrel aims at the ship; rust when angry
      const angry = extra >= K.STEPS, barrel = (extra % K.STEPS) * STEP;
      if (!hit) { ctx.save(); ctx.translate(2, 3); S(GROUND.out); ctx.fillRect(-12, -10, 24, 20); ctx.restore(); }
      S(GROUND.shade); ctx.fillRect(-13, -10, 6, 20); ctx.fillRect(7, -10, 6, 20);       // tracks
      S(GROUND.hi); for (let y = -9; y < 10; y += 4) { ctx.fillRect(-13, y, 6, 1); ctx.fillRect(7, y, 6, 1); }
      S(GROUND.plate); ctx.fillRect(-8, -8, 16, 16);                                     // hull
      S(GROUND.shade); disc(ctx, 0, -1, 6);
      S(angry ? HEAVY.stripe : GROUND.base); disc(ctx, -1, -2, 4);
      ctx.save(); ctx.rotate(barrel); if (tell) { S(GROUND.shade); ctx.fillRect(0, -2, 9, 4); S(GROUND.out); ctx.fillRect(8, -2, 1, 4); } else { S(GROUND.shade); ctx.fillRect(0, -2, 14, 4); S(GROUND.hi); ctx.fillRect(3, -2, 10, 1); } ctx.restore(); // r81 tell: the barrel RETRACTS (14 → 9), muzzle capped, no highlight
      break;
    }
    case 8: { // r80 BONE WALL segment — three courses of bone bricks, a skull set in the middle
      S(GROUND.plate); ctx.fillRect(-15, -12, 30, 24);
      S(GROUND.base);
      for (let r = 0; r < 3; r++) { const y = -11 + r * 8, o = (r & 1) * 7; for (let c = -1; c < 2; c++) ctx.fillRect(-13 + o + c * 14, y, 12, 6); }
      S(GROUND.hi); for (let r = 0; r < 3; r++) ctx.fillRect(-13, -11 + r * 8, 26, 1);
      S(GROUND.shade); ctx.fillRect(-4, -3, 3, 3); ctx.fillRect(1, -3, 3, 3); ctx.fillRect(-1, 1, 2, 2); // the skull's sockets
      if (tell) { S(GROUND.out); ctx.fillRect(-3, 4, 6, 1); } // r81 tell: the hidden gun's mouth shut
      break;
    }
    case 9: { // r80 THE HULL — an ossuary barge: a wide deck (decorative — the hittable core is the reliquary at the centre, r 20)
      S(GROUND.plate); poly(ctx, [[-76, -22], [76, -22], [82, 0], [76, 28], [-76, 28], [-82, 0]]);   // the deck
      S(GROUND.shade); for (let x = -70; x <= 70; x += 14) ctx.fillRect(x, -20, 2, 46);              // ribs
      S(GROUND.shade); ctx.fillRect(-76, -22, 152, 2); ctx.fillRect(-76, 26, 152, 2);
      S(GROUND.hi); ctx.fillRect(-76, -22, 152, 1);
      S(HEAVY.shade); disc(ctx, 0, 0, 20);                                                          // the core: a reliquary drum
      S(HEAVY.base); disc(ctx, -1, -1, 16);
      if (phase === 1) { S(HEAVY.stripe); disc(ctx, 0, 0, 9); S(tell ? GROUND.out : HEAVY.core); disc(ctx, 0, 0, 5); }  // opened: the gun's window (r81 tell: capped dark)
      else { S(HEAVY.shade); ctx.fillRect(-14, -2, 28, 4); ctx.fillRect(-2, -14, 4, 28); }           // armored: barred shut
      S(HEAVY.hi); ctx.fillRect(-10, -14, 8, 2);
      break;
    }
    case 10: { // r80 THE ANCHOR — shank, stock, flukes; the chain is the renderer's
      S(HEAVY.shade); ctx.fillRect(-2, -10, 4, 18);
      S(HEAVY.base); poly(ctx, [[0, 11], [11, 3], [9, -1], [0, 7], [-9, -1], [-11, 3]]);
      S(HEAVY.hi); ctx.fillRect(-6, -10, 12, 2);
      S(HEAVY.stripe); disc(ctx, 0, -12, 2);
      break;
    }
    case 0: { // popcorn family — each behaviour variant is its own craft
      ctx.rotate(step * STEP);
      if (phase === 2) {            // CROSSER: dart interceptor
        S(AIR.shade); poly(ctx, [[0, 12], [8, -5], [0, -10], [-8, -5]]);
        S(AIR.base); poly(ctx, [[0, 13], [3, -3], [0, -9], [-3, -3]]);
        S(AIR.hi); poly(ctx, [[0, 12], [8, -5], [7, -5], [0, 10]]);
        S(AIR.glass); ctx.fillRect(-1, 1, 2, 3);
      } else if (phase === 3) {     // RISER: stubby climber with exhaust
        S(GROUND.shade); poly(ctx, [[0, 9], [8, 2], [8, -3], [-8, -3], [-8, 2]]);
        S(GROUND.base); poly(ctx, [[0, 11], [4, 0], [4, -8], [-4, -8], [-4, 0]]);
        S(GROUND.hi); ctx.fillRect(-4, -8, 8, 1);
        S(AIR.glass); ctx.fillRect(-1, 2, 2, 3);
        if (extra && prop) { S(GROUND.exhaust); poly(ctx, [[-3, -8], [3, -8], [0, -15]]); }
      } else {                      // FIGHTER — and its diver twin (phase 1)
        const c = phase === 1 ? HEAVY : AIR;
        S(c.shade); ctx.fillRect(-9, -2, 18, 4);
        S(c.shade); ctx.fillRect(-4, -8, 8, 2);
        S(c.base); poly(ctx, [[0, 10], [3, 2], [3, -8], [0, -10], [-3, -8], [-3, 2]]);
        S(c.hi); ctx.fillRect(-9, -2, 18, 1);
        S(AIR.glass); ctx.fillRect(-1, 0, 2, 3);
        S(c.hi); if (prop) ctx.fillRect(-4, 9, 8, 1); else ctx.fillRect(-1, 7, 2, 4);
      }
      break;
    }
    case 1: { // MID — twin-boom heavy fighter
      ctx.rotate(step * STEP);
      S(AIR.shade); ctx.fillRect(-15, -4, 30, 5);
      S(AIR.shade); ctx.fillRect(-10, -13, 3, 10); ctx.fillRect(7, -13, 3, 10);
      S(AIR.base); ctx.fillRect(-13, -13, 26, 2);
      S(AIR.base); poly(ctx, [[0, 13], [4, 3], [4, -9], [0, -11], [-4, -9], [-4, 3]]);
      S(AIR.base); ctx.fillRect(-11, -6, 5, 9); ctx.fillRect(6, -6, 5, 9);
      S(AIR.hi); ctx.fillRect(-15, -4, 30, 1);
      S(AIR.glass); ctx.fillRect(-2, 2, 4, 4);
      S(AIR.hi); if (prop) { ctx.fillRect(-12, 3, 7, 1); ctx.fillRect(5, 3, 7, 1); }
      break;
    }
    case 2: { // TURRET — solid under-plate, khaki dome, barrel aims at the ship; rust when angry
      const angry = extra >= K.STEPS, barrel = (extra % K.STEPS) * STEP;
      if (!hit) { ctx.save(); ctx.translate(2, 3); S(GROUND.out); poly(ctx, TURRET_PLATE); ctx.restore(); }
      S(GROUND.plate); poly(ctx, TURRET_PLATE);
      S(GROUND.shade); disc(ctx, 0, 0, 9);
      S(angry ? HEAVY.stripe : GROUND.base); disc(ctx, -1, -1, 7);
      ctx.save(); ctx.rotate(barrel); if (tell) { S(GROUND.shade); ctx.fillRect(0, -2, 10, 4); S(GROUND.out); ctx.fillRect(9, -2, 1, 4); } else { S(GROUND.shade); ctx.fillRect(0, -2, 15, 4); S(GROUND.hi); ctx.fillRect(4, -2, 11, 1); } ctx.restore(); // r81 tell: the barrel RETRACTS (15 → 10), muzzle capped, no highlight
      S(GROUND.hi); ctx.fillRect(-4, -5, 3, 2);
      break;
    }
    case 3: { // ELITE — heavy bomber
      ctx.rotate(step * STEP);
      S(HEAVY.shade); poly(ctx, [[-22, -4], [22, -4], [18, 4], [-18, 4]]);
      S(HEAVY.shade); ctx.fillRect(-9, -18, 18, 3);
      S(HEAVY.base); poly(ctx, [[0, 20], [7, 8], [7, -14], [3, -19], [-3, -19], [-7, -14], [-7, 8]]);
      S(HEAVY.base); for (const x of [-17, -10, 5, 12]) ctx.fillRect(x, -6, 5, 11);
      S(HEAVY.stripe); ctx.fillRect(-22, -1, 6, 2); ctx.fillRect(16, -1, 6, 2);
      S(HEAVY.hi); ctx.fillRect(-22, -4, 44, 1);
      S(AIR.glass); ctx.fillRect(-2, 8, 4, 5);
      S(HEAVY.hi); if (prop) for (const x of [-17, -10, 5, 12]) ctx.fillRect(x - 1, 5, 7, 1);
      break;
    }
    case 4: { // MIDBOSS — flying-wing gunship; phase B exposes a pale core
      S(HEAVY.shade); poly(ctx, [[0, -22], [30, -4], [30, 6], [12, 18], [-12, 18], [-30, 6], [-30, -4]]);
      S(HEAVY.base); poly(ctx, [[0, -20], [28, -4], [28, 3], [11, 15], [-11, 15], [-28, 3], [-28, -4]]);
      S(HEAVY.base); poly(ctx, [[0, 24], [8, 10], [8, -16], [0, -20], [-8, -16], [-8, 10]]);
      S(HEAVY.stripe); ctx.fillRect(-28, -2, 8, 2); ctx.fillRect(20, -2, 8, 2);
      S(phase === 1 ? HEAVY.core : HEAVY.shade); poly(ctx, [[0, 12], [5, 2], [0, -8], [-5, 2]]);
      S(HEAVY.hi); poly(ctx, [[0, -20], [28, -4], [27, -3], [0, -19], [-27, -3], [-28, -4]]);
      S(HEAVY.hi); if (prop) { ctx.fillRect(-22, 8, 8, 1); ctx.fillRect(14, 8, 8, 1); }
      break;
    }
    case 5: { // BOSS — three forms (r6 S3b); burn-in on handoff; surface = Round 2
      const burning = extra > 0;
      const body = burning ? (extra === 2 ? BOSS.burnA : BOSS.burnB) : (flick ? BOSS.armor : BOSS.hull);
      const core = burning ? BOSS.ember : (BOSS.cores[phase] || UI.white);
      F(body);
      if (phase === 0) {
        poly(ctx, [[0, -30], [28, -12], [22, 26], [-22, 26], [-28, -12]]);
        poly(ctx, [[-24, -8], [-42, 2], [-24, 12]]);
        poly(ctx, [[24, -8], [42, 2], [24, 12]]);
        F(core); poly(ctx, [[0, -16], [14, 10], [-14, 10]]);
      } else if (phase === 1) {
        poly(ctx, [[-36, -4], [-16, -18], [16, -18], [36, -4], [24, 18], [-24, 18]]);
        F(core); ctx.fillRect(-20, -4, 40, 8);
      } else {
        poly(ctx, [[0, -24], [17, 0], [0, 20], [-17, 0]]);
        F(burning ? BOSS.ember : BOSS.strut);
        ctx.fillRect(-26, -3, 9, 6); ctx.fillRect(17, -3, 9, 6);
        F(core); poly(ctx, [[0, -13], [9, 0], [0, 11], [-9, 0]]);
        F(BOSS.hot); ctx.fillRect(-2, -3, 4, 6);
      }
      break;
    }
    case 6: { // boss sub-part — carries its emitter's bullet hue (the one sanctioned body use)
      S(BOSS.hull);
      if (phase === 0) { poly(ctx, [[0, -9], [side * 13, -2], [side * 9, 6], [0, 8]]); F(BOSS.cores[0]); ctx.fillRect(side * 3 - 2, -2, 4, 4); }
      else if (phase === 1) { ctx.fillRect(-8, -8, 16, 16); F(BOSS.cores[1]); ctx.fillRect(-4, -3, 8, 6); }
      else if (phase === 2) { poly(ctx, [[0, -9], [8, 0], [0, 9], [-8, 0]]); F(BOSS.cores[2]); poly(ctx, [[0, -5], [4, 0], [0, 5], [-4, 0]]); F(UI.white); ctx.fillRect(-1, -1, 2, 2); }
      // r83: a FOURTH part shape for stage 5's form 4 (the relay). Unreachable on
      // stages 1-3, whose bosses never hold a phase-3 part.
      else { poly(ctx, [[0, -8], [7, -3], [7, 3], [0, 8], [-7, 3], [-7, -3]]); F(BOSS.cores[3]); disc(ctx, 0, 0, 3); F(UI.white); ctx.fillRect(-1, -1, 2, 2); }
      break;
    }
  }
}

// r80 STAGE 2's midboss + boss in base geometry (cute-occult creatures are a
// later pass). THE HEARSE (type 4): a coffin carriage on wheels with two lantern
// posts; phase B (1) exposes the pale core. THE BELL (type 5): P0 a belfry with
// the bell hung in its arch · P1 the bell on two strut legs (the walker) · P2 the
// bare clapper. Burn-in and phase core hues exactly as boss 1's painter.
function paintStage2Boss(ctx, type, phase, side, prop, hit, flick, extra, K, F, S) {
  const { poly, disc } = K;
  if (type === 4) {
    S(GROUND.shade); disc(ctx, -22, 12, 6); disc(ctx, 22, 12, 6);                 // wheels
    S(GROUND.hi); disc(ctx, -23, 11, 2); disc(ctx, 21, 11, 2);
    S(HEAVY.shade); poly(ctx, [[-32, -8], [32, -8], [30, 10], [-30, 10]]);          // carriage
    S(HEAVY.base); poly(ctx, [[-26, -6], [26, -6], [24, 6], [-24, 6]]);             // the coffin lid
    S(HEAVY.stripe); ctx.fillRect(-26, -1, 52, 2);
    S(HEAVY.hi); ctx.fillRect(-26, -6, 52, 1);
    S(HEAVY.shade); ctx.fillRect(-22, -16, 3, 9); ctx.fillRect(19, -16, 3, 9);      // lantern posts
    S(prop ? GROUND.exhaust : GROUND.hi); ctx.fillRect(-23, -18, 5, 4); ctx.fillRect(18, -18, 5, 4); // lanterns
    S(phase === 1 ? HEAVY.core : HEAVY.shade); poly(ctx, [[0, 4], [6, 0], [0, -4], [-6, 0]]); // the core, bared in phase B
    return;
  }
  const burning = extra > 0;
  const body = burning ? (extra === 2 ? BOSS.burnA : BOSS.burnB) : (flick ? BOSS.armor : BOSS.hull);
  const core = burning ? BOSS.ember : (BOSS.cores[phase] || UI.white);
  if (phase === 0) {       // BELL TOWER
    F(burning ? body : BOSS.armor); ctx.fillRect(-28, -34, 56, 62);                  // tower
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 11 - 4, -40, 8, 8);              // battlements
    F(FIELD_BG); ctx.fillRect(-18, -22, 36, 40); ctx.fillRect(-12, -30, 24, 10);    // the arch
    F(body); poly(ctx, [[-14, 8], [14, 8], [11, -8], [4, -16], [-4, -16], [-11, -8]]); // the bell
    F(core); ctx.fillRect(-14, 6, 28, 4);                                            // the bell's mouth band
    F(BOSS.strut); ctx.fillRect(-1, -28, 2, 12);                                     // the rope
  } else if (phase === 1) { // BELL WALKER
    F(body); poly(ctx, [[-30, 6], [30, 6], [24, -20], [10, -32], [-10, -32], [-24, -20]]);
    F(core); ctx.fillRect(-30, 4, 60, 6);
    F(burning ? BOSS.ember : BOSS.strut); poly(ctx, [[-22, 8], [-14, 8], [-26, 34], [-34, 34]]); poly(ctx, [[14, 8], [22, 8], [34, 34], [26, 34]]); // strut legs
    F(BOSS.hot); ctx.fillRect(-3, -26, 6, 6);
  } else {                  // THE CLAPPER — bare core
    F(body); poly(ctx, [[0, -26], [14, -4], [10, 18], [-10, 18], [-14, -4]]);
    F(burning ? BOSS.ember : BOSS.strut); ctx.fillRect(-26, -3, 9, 6); ctx.fillRect(17, -3, 9, 6);
    F(core); poly(ctx, [[0, -14], [8, 0], [0, 12], [-8, 0]]);
    F(BOSS.hot); ctx.fillRect(-2, -3, 4, 6);
  }
}

// r82 STAGE 3's boss in base geometry (cute-occult creatures are a later pass;
// every other skin falls back here — renderer drawEnemy). THE MOTH QUEEN's three
// FORMS (S3b MUST: silhouette, movement and dialect all change):
//   P0 THE COCOON     — a hanging chrysalis, silk-banded, slung from two lines;
//                       the egg chamber glows at its base.
//   P1 THE MOTH       — the imago: the widest silhouette in the game, wings out.
//   P2 THE EMBER CORE — the bare, stripped body with the ember burning through.
// Burn-in and the per-phase core hues are boss 1's painter's, exactly.
function paintStage3Boss(ctx, phase, prop, flick, extra, K, F) {
  const { poly, disc } = K;
  const burning = extra > 0;
  const body = burning ? (extra === 2 ? BOSS.burnA : BOSS.burnB) : (flick ? BOSS.armor : BOSS.hull);
  const core = burning ? BOSS.ember : (BOSS.cores[phase] || UI.white);
  if (phase === 0) {          // THE COCOON
    F(BOSS.strut); ctx.fillRect(-20, -46, 2, 16); ctx.fillRect(18, -46, 2, 16);      // the silk lines
    F(body); poly(ctx, [[0, -34], [16, -22], [20, 6], [10, 28], [-10, 28], [-20, 6], [-16, -22]]);
    F(flick ? BOSS.hull : BOSS.armor); for (let i = 0; i < 5; i++) ctx.fillRect(-19 + (i & 1) * 4, -24 + i * 11, 36, 3); // silk banding
    F(core); poly(ctx, [[0, 30], [9, 18], [0, 8], [-9, 18]]);                        // the egg chamber
    F(BOSS.hot); ctx.fillRect(-2, 18, 4, 5);
  } else if (phase === 1) {   // THE MOTH
    F(body); poly(ctx, [[0, -6], [-34, -26], [-48, -6], [-34, 20], [-10, 12]]);
    F(body); poly(ctx, [[0, -6], [34, -26], [48, -6], [34, 20], [10, 12]]);
    F(flick ? BOSS.hull : BOSS.armor); ctx.fillRect(-30, -8, 14, 4); ctx.fillRect(16, -8, 14, 4);
    F(body); poly(ctx, [[0, 28], [8, 12], [8, -18], [0, -24], [-8, -18], [-8, 12]]); // thorax
    F(core); ctx.fillRect(-8, -6, 16, 10);
    F(BOSS.strut); for (let i = 0; i < 4; i++) { ctx.fillRect(-9 - i * 3, -27 - i * 3, 4, 3); ctx.fillRect(5 + i * 3, -27 - i * 3, 4, 3); } // antennae
    F(BOSS.hot); if (prop) { ctx.fillRect(-24, 10, 10, 2); ctx.fillRect(14, 10, 10, 2); }
  } else {                    // THE EMBER CORE
    F(body); poly(ctx, [[0, -26], [13, -8], [11, 16], [0, 24], [-11, 16], [-13, -8]]);
    F(burning ? BOSS.ember : BOSS.strut); ctx.fillRect(-27, -4, 10, 7); ctx.fillRect(17, -4, 10, 7); // the burnt wing roots
    F(core); disc(ctx, 0, -2, 9);
    F(BOSS.hot); disc(ctx, 0, -2, 4);
  }
}

// r83 STAGE 5's final boss in base geometry (cute-occult creatures are a later
// pass; every other skin falls back here — renderer drawEnemy). THE IDOL's FOUR
// FORMS (S3b MUST 2: silhouette, movement and dialect all change per form):
//   P0 THE IDOL              — a seated stone effigy on a plinth: broad, hooded,
//                              utterly still, one lidded eye for a core.
//   P1 THE DEMON             — it tears off the altar: horned skull, folded
//                              wings, the censer hung under it (the chain and
//                              its bob are drawn by the renderer, not here).
//   P2 THE PRIESTESS'S MIRROR — the SHIP'S SILHOUETTE at boss scale.
//   P3 THE HOLLOW CORE       — the stripped body, burnt wing roots, ember.
//
// ART-BIBLE DEVIATION, DECLARED (CLAUDE.md: a renderer change stays inside the
// bible or says where and why it does not). Form 3 draws the PLAYER'S SHAPE on
// an enemy, which the bible does not cover, and three of its rules pull against
// it: §3 exclusivity ("violet only on the player"), §6's ladder (a boss "reads
// as the biggest thing on screen", 84-110 span, vs the ship's 28), and §1's
// "big things are slow and strong". The resolution keeps all three:
//   · the SHAPE is the ship's; the PALETTE is the boss's (bone hull, boss armor,
//     the form's core hue) — not one violet pixel, so S2-MUST-3 holds and the
//     player still reads their own ship by colour at a glance;
//   · it is drawn at BOSS SCALE (~86 px span, three times the ship), so the size
//     ladder is intact and the silhouette reads as an idol wearing your shape,
//     never as a second player ship;
//   · it is the only form whose motion matches the player's (3.7 px/f), which is
//     the point — the lie about the threat class is the story beat.
// Burn-in and the per-form core hues are boss 1's painter's, exactly.
function paintStage5Boss(ctx, phase, side, prop, flick, extra, K, F) {
  const { poly, disc } = K;
  const burning = extra > 0;
  const body = burning ? (extra === 2 ? BOSS.burnA : BOSS.burnB) : (flick ? BOSS.armor : BOSS.hull);
  const core = burning ? BOSS.ember : (BOSS.cores[phase] || UI.white);
  if (phase === 0) {            // THE IDOL — a seated effigy, dead still
    F(BOSS.armor); ctx.fillRect(-40, 14, 80, 14);                                     // the plinth
    F(flick ? BOSS.hull : BOSS.strut); ctx.fillRect(-40, 12, 80, 3);
    F(body); poly(ctx, [[0, -30], [24, -18], [30, 10], [-30, 10], [-24, -18]]);        // the hooded body
    F(body); poly(ctx, [[-34, -6], [-24, -14], [-24, 8]]); poly(ctx, [[34, -6], [24, -14], [24, 8]]); // the shoulder wings (braziers ride here)
    F(flick ? BOSS.hull : BOSS.armor); poly(ctx, [[0, -26], [15, -14], [15, 2], [-15, 2], [-15, -14]]); // the cowl's shadow
    F(core); poly(ctx, [[0, -16], [11, -8], [0, 0], [-11, -8]]);                       // the lidded eye
    F(BOSS.hot); ctx.fillRect(-2, -10, 4, 3);
    F(flick ? BOSS.armor : BOSS.strut); for (let i = -1; i <= 1; i++) ctx.fillRect(i * 12 - 3, 4, 6, 6); // votive niches
  } else if (phase === 1) {     // THE DEMON — horned, wings folded, censer below
    F(burning ? BOSS.ember : BOSS.strut); poly(ctx, [[-14, -20], [-26, -38], [-8, -26]]); poly(ctx, [[14, -20], [26, -38], [8, -26]]); // horns
    F(body); poly(ctx, [[-30, 2], [-16, -22], [16, -22], [30, 2], [18, 20], [-18, 20]]); // the skull
    F(body); poly(ctx, [[-28, -6], [-46, 4], [-30, 16]]); poly(ctx, [[28, -6], [46, 4], [30, 16]]); // the folded wings
    F(flick ? BOSS.hull : BOSS.armor); ctx.fillRect(-18, 6, 36, 4);                     // the jaw line
    F(core); poly(ctx, [[-13, -8], [-3, -2], [-13, 4]]); poly(ctx, [[13, -8], [3, -2], [13, 4]]); // the two eyes
    F(BOSS.hot); ctx.fillRect(-2, 12, 4, 4);                                            // the censer's mouth (the chain hangs from here)
  } else if (phase === 2) {     // THE PRIESTESS'S MIRROR — the ship's shape, boss-scaled
    // paintShip's outline at ~3.1× (span 28 → 86), boss palette, nose DOWN
    // (every enemy sprite is drawn nose-+y and this one must not read as the
    // player's nose-up ship). Bible deviation declared above.
    F(flick ? BOSS.hull : BOSS.armor); poly(ctx, [[-43, -37], [-12, -12], [12, -12], [43, -37], [31, -46], [-31, -46]]); // the engine block, mirrored to the top
    F(body); poly(ctx, [[0, 52], [12, 25], [40, -34], [15, -25], [0, -37], [-15, -25], [-40, -34], [-12, 25]]);          // the hull
    F(flick ? BOSS.armor : BOSS.strut); poly(ctx, [[12, 25], [40, -34], [34, -34], [9, 18]]); poly(ctx, [[-12, 25], [-40, -34], [-34, -34], [-9, 18]]); // the wing edges
    F(core); poly(ctx, [[0, 24], [10, 6], [0, -12], [-10, 6]]);                          // where the player's dot would be — the core, in the form's hue
    F(BOSS.hot); ctx.fillRect(-3, 2, 6, 6);
    F(flick ? BOSS.hull : BOSS.armor); ctx.fillRect(side * 20 - 4, 30, 8, 5);            // the option pod's mount, on the live side
    if (prop) { F(BOSS.ember); ctx.fillRect(-26, -40, 9, 3); ctx.fillRect(17, -40, 9, 3); } // the mirror's thrust, pointing the wrong way
  } else {                      // THE HOLLOW CORE — bare, burning
    F(body); poly(ctx, [[0, -26], [14, -6], [11, 16], [0, 24], [-11, 16], [-14, -6]]);
    F(burning ? BOSS.ember : BOSS.strut); ctx.fillRect(-28, -4, 11, 7); ctx.fillRect(17, -4, 11, 7); // the burnt wing roots
    F(flick ? BOSS.hull : BOSS.armor); for (let i = 0; i < 3; i++) ctx.fillRect(-12 + i * 9, -20 + i * 2, 5, 2);
    F(core); disc(ctx, 0, -1, 10);
    F(BOSS.hot); disc(ctx, 0, -1, 4);
  }
}

// The ship: big around a tiny core (boghog WS01), 28px span. The renderer adds
// the dark rim + hull-light top edge and draws the hit dot over it.
function paintShip(c, K) {
  const { poly } = K;
  c.fillStyle = SHIP.shade; poly(c, [[-14, 12], [-4, 4], [4, 4], [14, 12], [10, 15], [-10, 15]]);
  c.fillStyle = SHIP.hull;  poly(c, [[0, -17], [4, -8], [13, 11], [5, 8], [0, 12], [-5, 8], [-13, 11], [-4, -8]]);
  c.fillStyle = SHIP.edge;  poly(c, [[4, -8], [13, 11], [11, 11], [3, -6]]); poly(c, [[-4, -8], [-13, 11], [-11, 11], [-3, -6]]);
  c.fillStyle = SHIP.dark;  c.fillRect(-2, 12, 4, 4);
}

function paintItem(c, r, K) {
  const { disc } = K;
  c.fillStyle = ITEM.rim; disc(c, 0, 0, r);
  c.fillStyle = ITEM.gold; disc(c, 0, 0, Math.round(r * 0.78));
  c.fillStyle = ITEM.glint; const hl = Math.max(2, Math.round(r * 0.3)); c.fillRect(-Math.round(r * 0.4), -Math.round(r * 0.4), hl, hl);
}

export default {
  id: 'base', name: 'classic (r58)',
  pal: { AIR, GROUND, HEAVY, SHIP, ITEM, UI, BOSS },
  span: [32, 48, 40, 66, 72, 100, 32, 40, 40, 176, 34, 30, 40, 52], // r80: + tank, wall, hull (the deck is 164 wide), anchor. r82: + leader, carrier, Moth (bible §6's ladder: 26 / 34 / 44 at r 12 / 14 / 20, plus the rim)
  rimOf, drawBackground, paintEnemy, paintShip, paintItem, post: null,
};
