// HOW TO PLAY — one card (r35, polish phase). Corpus-cleared shape: MSX legacy
// skill says never re-teach the genre (no dodge/shoot tutorial, nothing
// forced); HOMAGE_STUDY sanctions the "one-card briefing" (Psikyo#9). So: one
// skippable card teaching ONLY what is SPEEDHELL-specific — the display
// contract (wiki §6.2) and the speed-kill rule (§2.1) — auto-shown once ever,
// then reachable with H from the title. Never gates play. Browser-only.
import { binds } from './options.js';
import { drawShip, drawRoundBullet, drawNeedle, drawShot } from './render/renderer.js';

const seen = () => { try { return localStorage.getItem('speedhell.howto') === 'seen'; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem('speedhell.howto', 'seen'); } catch { /* ok */ } };

const $ = (id) => document.getElementById(id);
let open = false;
export function isHowToOpen() { return open; }

const keyLabel = (k) => (k === ' ' ? 'space' : k.length === 1 ? k.toUpperCase() : k);
const fmt = (act) => binds()[act].map(keyLabel).join('/');

export function openHowTo() {
  open = true;
  $('howtoKeys').textContent =
    `arrows/WASD move · ${fmt('fire')} shot · ${fmt('focus')} focus · ${fmt('bomb')} bomb`;
  $('howto').classList.remove('hide');
}
export function closeHowTo() { open = false; markSeen(); $('howto').classList.add('hide'); } // exported r38: pad A/B/START dismisses

// r57 (ART_BIBLE Round 1): the card no longer hand-copies pixels — it calls the
// renderer's own drawShip / drawRoundBullet / drawNeedle, so the ship and both
// bullet castes mirror the live art BY CONSTRUCTION (wiki §6.2 sync rule, r35).
// Any renderer redesign flows here automatically; only the layout is local.
// The ship at 3x: big ship, 6px effective dot (focus look — white dot, pink rim).
function drawShipCard(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.save(); ctx.translate(48, 52); ctx.scale(3, 3);
  drawShip(ctx, 0, 0, true);
  ctx.restore();
}

// Both bullet castes at 3x: white = the true 3px hit circle; pink ring / cyan
// body are graze. r77: plus YOUR shot (the shipped 6×28 bolt, renderer
// drawShot — the r76 `heavy` sprite, no muzzle / trail on the card) at the
// right, so the card also shows what the player family looks like next to
// the two enemy castes (S2: never the same hue as a needle).
function drawBulletCard(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.save(); ctx.translate(22, 48); ctx.scale(3, 3);
  drawRoundBullet(ctx, 0, 0, 0);
  ctx.restore();
  ctx.save(); ctx.translate(52, 48); ctx.scale(3, 3);
  drawNeedle(ctx, 0, 0, Math.PI / 2);
  ctx.restore();
  ctx.save(); ctx.translate(82, 38); ctx.scale(3, 3);
  drawShot(ctx, 0, 0);
  ctx.restore();
}

// r78 target-briefing card (plan §4 rule 10, Psikyo#9 "one card naming the
// next boss"; §11 story placement: text lives in a pre-run card — this IS that
// card, reused). Minimal text: "STAGE N — <name>". Shown ≤ 2 s between stages
// by main.js's stage-clear flow; never gates input (there is none to gate — it
// closes itself on a frame budget). Dormant until a second stage exists.
let briefing = false;
export function isBriefingOpen() { return briefing; }
export function openBriefing(title, sub) {
  briefing = true;
  $('briefTitle').textContent = title; $('briefSub').textContent = sub;
  $('briefing').classList.remove('hide');
}
export function closeBriefing() { briefing = false; $('briefing').classList.add('hide'); }

export function initHowTo() {
  drawShipCard($('howtoShip').getContext('2d'));
  drawBulletCard($('howtoBullet').getContext('2d'));
  $('howtoClose').onclick = closeHowTo;
  // capture + stopImmediatePropagation: while the card is up it owns the
  // keyboard (registered before options.js, so it wins the capture phase)
  addEventListener('keydown', (e) => {
    if (!open) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const k = e.key.toLowerCase();
    if (k === 'enter' || k === 'escape' || k === 'h' || binds().fire.includes(k)) closeHowTo();
  }, true);
  if (!seen()) openHowTo(); // once ever; H on the title brings it back
}
