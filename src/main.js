// Browser bootstrap: input, fixed 60Hz logic, render on RAF.
import { makeGame, startRun, update, W, H } from './core/game.js';
import { draw, resetHud } from './render/renderer.js';

const canvas = document.getElementById('game');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');

let g = makeGame((Math.random() * 0xffffffff) >>> 0);
let paused = false, bgScroll = 0;

const keys = {};
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Enter' && g.state === 'title') { startRun(g); resetHud(); }
  if (e.key.toLowerCase() === 'r' && (g.state === 'gameover' || g.state === 'clear' || g.state === 'play')) {
    g.seed = (Math.random() * 0xffffffff) >>> 0; startRun(g); resetHud(); // restart <2s (S7)
  }
  if (e.key.toLowerCase() === 'p') paused = !paused;
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// Arcade-stick friendly mapping (8BitDo Arcade Stick etc.):
// on a stick all 8 "shoulder" positions are face buttons, so map generously —
// A/X fire, B/Y bomb, any of L1/R1/L2/R2 focus. Works with the stick's toggle
// in either D-pad (buttons 12-15) or Left-Analog (axes 0/1) mode.
let padName = null, prevSelect = false;
export function activePad() { return padName; }

function pollInput() {
  const i = g.input;
  i.dx = (keys['arrowright'] || keys['d'] ? 1 : 0) - (keys['arrowleft'] || keys['a'] ? 1 : 0);
  i.dy = (keys['arrowdown'] || keys['s'] ? 1 : 0) - (keys['arrowup'] || keys['w'] ? 1 : 0);
  i.focus = !!keys['shift'];
  i.fire = !!(keys['z'] || keys[' ']);   // held, not automated [BOGHOG_CRAFT]
  i.bomb = !!keys['x'];
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of pads || []) if (p && p.connected && p.buttons.length) { gp = p; break; }
  padName = gp ? gp.id : null;
  if (gp) {
    if (Math.abs(gp.axes[0] || 0) > 0.35) i.dx = Math.sign(gp.axes[0]);
    if (Math.abs(gp.axes[1] || 0) > 0.35) i.dy = Math.sign(gp.axes[1]);
    if (gp.buttons[14]?.pressed) i.dx = -1; if (gp.buttons[15]?.pressed) i.dx = 1;
    if (gp.buttons[12]?.pressed) i.dy = -1; if (gp.buttons[13]?.pressed) i.dy = 1;
    i.fire = i.fire || gp.buttons[0]?.pressed || gp.buttons[2]?.pressed;
    i.bomb = i.bomb || gp.buttons[1]?.pressed || gp.buttons[3]?.pressed;
    i.focus = i.focus || gp.buttons[4]?.pressed || gp.buttons[5]?.pressed
                       || gp.buttons[6]?.pressed || gp.buttons[7]?.pressed;
    if (gp.buttons[9]?.pressed && g.state === 'title') { startRun(g); resetHud(); }
    // select = instant restart (credit-feed feel; edge-triggered)
    const sel = !!gp.buttons[8]?.pressed;
    if (sel && !prevSelect && g.state !== 'title') {
      g.seed = (Math.random() * 0xffffffff) >>> 0; startRun(g); resetHud();
    }
    prevSelect = sel;
  }
}

const STEP_MS = 1000 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  acc += now - last; last = now;
  if (acc > 200) acc = 200; // avoid spiral after tab-out
  while (acc >= STEP_MS) {
    pollInput();
    if (!paused) { update(g); bgScroll += 1.6; }
    acc -= STEP_MS;
  }
  draw(g, ctx, bgScroll);
  if (g.state === 'title') { // pad detection readout — press any button to wake it
    ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = padName ? '#57e389' : '#8a8fa8';
    ctx.fillText(padName ? ('PAD: ' + padName.slice(0, 52)) : 'no gamepad — press a button on the stick', W / 2, H / 2 + 44);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
