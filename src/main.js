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

function pollInput() {
  const i = g.input;
  i.dx = (keys['arrowright'] || keys['d'] ? 1 : 0) - (keys['arrowleft'] || keys['a'] ? 1 : 0);
  i.dy = (keys['arrowdown'] || keys['s'] ? 1 : 0) - (keys['arrowup'] || keys['w'] ? 1 : 0);
  i.focus = !!keys['shift'];
  i.fire = !!(keys['z'] || keys[' ']);   // held, not automated [BOGHOG_CRAFT]
  i.bomb = !!keys['x'];
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads && pads[0];
  if (gp) {
    if (Math.abs(gp.axes[0]) > 0.35) i.dx = Math.sign(gp.axes[0]);
    if (Math.abs(gp.axes[1]) > 0.35) i.dy = Math.sign(gp.axes[1]);
    if (gp.buttons[14]?.pressed) i.dx = -1; if (gp.buttons[15]?.pressed) i.dx = 1;
    if (gp.buttons[12]?.pressed) i.dy = -1; if (gp.buttons[13]?.pressed) i.dy = 1;
    i.fire = i.fire || gp.buttons[0]?.pressed;
    i.bomb = i.bomb || gp.buttons[1]?.pressed;
    i.focus = i.focus || gp.buttons[6]?.pressed || gp.buttons[7]?.pressed;
    if (gp.buttons[9]?.pressed && g.state === 'title') { startRun(g); resetHud(); }
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
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
