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
//   drawBackground(ctx, g, bgScroll, sec, bossPhase, K)
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
                 cores: ['#ff4fa3', '#37d6e0', ITEM.gold] };

// FIELD family (bible §3): section place-identity (r5 S5-SHOULD-1) — each stage
// section gets its own subtle background accent — hue-shifted slabs/stars near
// the base wash values, plus one large landmark slab that scrolls through as
// the section plays. Keyed off g.stageT; values stay washed-out so the
// background never competes with the bullet layer (S2-MUST-1).
const FIELD_BG = '#0a0c14';
const SEC_T = [0, 120, 720, 1700, 2400, 2460, 2900, 3700, 3900];
const SEC_SLAB = ['#12151f', '#101726', '#171820', '#181422', '#1d1418', '#1c1812', '#101c17', '#101a26', '#1d1220'];
const SEC_STAR = ['#161a28', '#141d30', '#1e2026', '#1f1a2e', '#261b20', '#25211a', '#16241e', '#152230', '#261a2a'];
const SEC_LAND = ['#161a26', '#141c2e', '#1e2028', '#211c30', '#291d22', '#28241c', '#182922', '#1a2632', '#2a1e2e'];
const SEC_LANDGEO = [ // landmark [x, w, h] — distinct silhouette per section
  [120, 80, 50], [30, 110, 46], [210, 70, 90], [60, 150, 40], [110, 100, 100],
  [200, 90, 56], [20, 130, 60], [90, 140, 36], [70, 180, 70],
];
// r6 S3b-SHOULD: arena restain per boss phase — deep blue → red-shifted →
// white-hot dawn (homage BRDA#6), all values inside the washed band.
const BOSS_BG = ['#0a0e1a', '#130a0e', '#141317'];
const BOSS_SLAB = ['#111b30', '#261416', '#28262c'];
const BOSS_STAR = ['#15233c', '#2c181a', '#302e33'];
const BOSS_LAND = ['#16243e', '#2e1a1e', '#333038'];

export const TURRET_PLATE = [[-9, -13], [9, -13], [13, -9], [13, 9], [9, 13], [-9, 13], [-13, 9], [-13, -9]];

function drawBackground(ctx, g, bgScroll, sec, bossPhase, K) {
  const { W, H } = K;
  const bgC = bossPhase >= 0 ? BOSS_BG[bossPhase] : FIELD_BG;
  const slabC = bossPhase >= 0 ? BOSS_SLAB[bossPhase] : SEC_SLAB[sec];
  const starC = bossPhase >= 0 ? BOSS_STAR[bossPhase] : SEC_STAR[sec];
  const landC = bossPhase >= 0 ? BOSS_LAND[bossPhase] : SEC_LAND[sec];
  ctx.fillStyle = bgC;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  { // landmark slab: enters at the section boundary, scrolls with section progress
    const [lx, lw, lh] = SEC_LANDGEO[sec];
    const ly = Math.round((g.stageT - SEC_T[sec]) * 0.55 - lh - 20);
    if (ly < H + 20) {
      ctx.fillStyle = landC; ctx.fillRect(lx, ly, lw, lh);
      ctx.fillStyle = slabC; ctx.fillRect(lx + 10, ly + 8, lw - 20, lh - 16); // inset gives it structure
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
  if (type === 2) return GROUND.out;
  return HEAVY.out;
}

// r20 enemy identity pass: identity from SHAPE, SIZE, MOTION and LAYER — never
// saturated colour. AIR = aircraft silhouettes, GROUND = squat plate + aiming
// barrel. Sprites drawn nose-DOWN (+y); rotate by step for the flying types.
function paintEnemy(ctx, type, phase, side, step, prop, hit, flick, extra, K) {
  const { poly, disc, STEP } = K;
  const F = (c) => { ctx.fillStyle = hit ? UI.white : c; };
  const S = (c) => F(flick ? BOSS.armor : c); // surface fill: armor shimmer applies
  switch (type) {
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
      ctx.save(); ctx.rotate(barrel); S(GROUND.shade); ctx.fillRect(0, -2, 15, 4); S(GROUND.hi); ctx.fillRect(4, -2, 11, 1); ctx.restore();
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
      else { poly(ctx, [[0, -9], [8, 0], [0, 9], [-8, 0]]); F(BOSS.cores[2]); poly(ctx, [[0, -5], [4, 0], [0, 5], [-4, 0]]); F(UI.white); ctx.fillRect(-1, -1, 2, 2); }
      break;
    }
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
  span: [32, 48, 40, 66, 72, 100, 32],
  rimOf, drawBackground, paintEnemy, paintShip, paintItem, post: null,
};
