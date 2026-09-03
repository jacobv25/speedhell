// HOW TO PLAY — one card (r35, polish phase). Corpus-cleared shape: MSX legacy
// skill says never re-teach the genre (no dodge/shoot tutorial, nothing
// forced); HOMAGE_STUDY sanctions the "one-card briefing" (Psikyo#9). So: one
// skippable card teaching ONLY what is SPEEDHELL-specific — the display
// contract (wiki §6.2) and the speed-kill rule (§2.1) — auto-shown once ever,
// then reachable with H from the title. Never gates play. Browser-only.
import { binds } from './options.js';

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

function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); }

// ⚠ KEEP IN SYNC: these two draw functions are hand-copied from
// src/render/renderer.js (drawPlayer + the enemy-bullet block). Jacob expects
// ship/bullet redesigns before release — when the renderer art changes, THIS
// CARD MUST CHANGE IN THE SAME COMMIT (matching notes sit on both renderer
// blocks). A stale card teaches a false display contract.
// The ship at 3x — the EXACT r20 art (renderer.js drawPlayer): big ship, 6px
// effective dot. Mirroring the real pixels is the point: the card must never
// lie about the contract it teaches.
function drawShipCard(ctx) {
  ctx.save(); ctx.translate(48, 52); ctx.scale(3, 3);
  ctx.fillStyle = '#6b5aa8';
  poly(ctx, [[-14, 12], [-4, 4], [4, 4], [14, 12], [10, 15], [-10, 15]]);
  ctx.fillStyle = '#f0ecff';
  poly(ctx, [[0, -17], [4, -8], [13, 11], [5, 8], [0, 12], [-5, 8], [-13, 11], [-4, -8]]);
  ctx.fillStyle = '#c9bdf5';
  poly(ctx, [[4, -8], [13, 11], [11, 11], [3, -6]]); poly(ctx, [[-4, -8], [-13, 11], [-11, 11], [-3, -6]]);
  ctx.fillStyle = '#4a3f78'; ctx.fillRect(-2, 12, 4, 4);
  ctx.fillStyle = '#241f38'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); // dark well (3+5)
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill(); // the 6px truth
  ctx.strokeStyle = '#ff4fa3'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.stroke();
  ctx.restore();
}

// Both bullet castes at 3x (renderer.js enemy-bullet block): white = the true
// 3px hit circle; pink ring / cyan body are graze.
function drawBulletCard(ctx) {
  ctx.save(); ctx.translate(30, 48); ctx.scale(3, 3);
  ctx.fillStyle = '#20060f'; ctx.beginPath(); ctx.arc(0, 0, 5.6, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff4fa3'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe6f2'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(64, 48); ctx.scale(3, 3); ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#031418'; ctx.fillRect(-7, -3, 14, 6);
  ctx.fillStyle = '#37d6e0'; ctx.fillRect(-6, -2, 12, 4);
  ctx.fillStyle = '#e8feff'; ctx.fillRect(-3, -2, 7, 4);
  ctx.restore();
}

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
