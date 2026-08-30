// SPEEDHELL dev sandbox — the same core + renderer as the game, driven with an
// EMPTY timeline: you spawn enemies, fire patterns, tune the ship and watch.
// Browser-only, imported by sandbox.html alone. Never imported by the game
// (src/main.js) or the referee (test/), and it never edits the core: every
// knob here is either a public core call (spawnEnemy, patterns.*, PLAYER) or
// sandbox-side bookkeeping done between frames.
import { makeGame, startRun, update, spawnEnemy, bulletCancelWall, explode, TIER, FAM, PLAYER, W, H } from './core/game.js';
import { advanceBossPhase } from './core/stage.js';
import * as P from './core/patterns.js';
import { draw, resetHud } from './render/renderer.js';
import * as audio from './audio.js';
import { makeBot } from '../test/bot.mjs';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------- state
const S = {
  paused: false, stepOnce: false, speed: 1, mode: 'spawn',
  god: true, infLives: true, infBombs: false, hitboxes: false, labels: false, sfx: true,
  bot: null, emitter: { x: W / 2, y: 80 }, repeat: false, repeatEvery: 60, lastFire: 0,
  spiralStep: 0, later: [], // scheduled sandbox actions: { at: frame, fn }
  fps: 0, fpsN: 0, fpsT: performance.now(),
};
let g = makeGame(1), bgScroll = 0;

function newScene(seed = seedValue()) {
  g = makeGame(seed); startRun(g);
  g.timeline = []; g.tlIndex = 0; // controlled scene: the referee's own trick (stressScene / pointBlankDps)
  S.later.length = 0; S.spiralStep = 0;
  resetHud();
  logLine(`// scene reset, seed ${seed}`);
}
function seedValue() {
  const v = $('seed').value.trim();
  return /^\d+$/.test(v) ? (Number(v) >>> 0) : hash(v);
}
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

// ---------------------------------------------------------------- log
function logLine(s) {
  const ta = $('log');
  ta.value += s + '\n'; ta.scrollTop = ta.scrollHeight;
}
const num = (v) => Number.isInteger(v) ? String(v) : (+v.toFixed(3)).toString();

// ---------------------------------------------------------------- enemies
// Presets are thin wrappers over spawnEnemy with the same opts the real timeline
// uses, so a sandbox enemy behaves exactly like its stage twin.
const ENEMIES = [
  { name: 'zako', type: 0, opts: (side) => ({ vx: -side * 0.47, vy: 1.6, side }) },
  { name: 'zako · shooter', type: 0, opts: (side) => ({ vx: -side * 0.47, vy: 1.6, side, holdT: 1 }) },
  { name: 'zako · diver', type: 0, opts: (side) => ({ vx: -side * 0.47, vy: 1.6, side }), post: (e) => { e.phase = 1; } },
  { name: 'mid (holds y130)', type: 1, opts: (side) => ({ side, holdT: 130 }) },
  { name: 'turret', type: 2 },
  { name: 'elite', type: 3, opts: (side) => ({ side }) },
  { name: 'elite · rep 2 (hose)', type: 3, opts: (side) => ({ side }), post: (e) => { e.phase = 2; } },
  { name: 'elite · rep 3 (overstay)', type: 3, opts: (side) => ({ side }), post: (e) => { e.phase = 3; } },
  { name: 'midboss', type: 4, fixed: [W / 2, -20] },
  { name: 'boss · P1', type: 5, fixed: [W / 2, -27] },
  { name: 'boss · P2', type: 5, fixed: [W / 2, -27], post: (e) => bossAtPhase(e, 1) },
  { name: 'boss · P3', type: 5, fixed: [W / 2, -27], post: (e) => bossAtPhase(e, 2) },
];
function bossAtPhase(e, phase) {
  // skip the 90f entrance (P1's pods never deploy) and walk the phase ladder
  // with the real handoff — parts, hp, armor and sweep sync all come from core
  e.age = 90; e.y = 93;
  for (let i = 0; i < phase; i++) advanceBossPhase(g, e, false);
}
function spawnPreset(idx, x, y) {
  const d = ENEMIES[idx];
  const side = x < W / 2 ? -1 : 1;
  if (d.fixed) [x, y] = d.fixed;
  const opts = d.opts ? d.opts(side) : {};
  const e = spawnEnemy(g, d.type, x, y, opts);
  if (!e) { logLine('// enemy pool full (64)'); return null; }
  if (d.post) d.post(e);
  const o = Object.entries(opts).map(([k, v]) => `${k}: ${num(v)}`).join(', ');
  logLine(`spawnEnemy(g, ${d.type}, ${num(x)}, ${num(y)}${o ? `, { ${o} }` : ''});${d.post ? ` // ${d.name}` : ''}`);
  return e;
}
function later(frames, fn) { S.later.push({ at: g.frame + frames, fn }); }

// ---------------------------------------------------------------- patterns
const PATTERNS = {
  aimedFan:    { p: { n: 4, spread: 0.5, speed: 3.0 }, fire: (x, y, o) => P.aimedFan(g, x, y, o.n, o.spread, o.speed) },
  ring:        { p: { n: 14, speed: 1.5, phase: 0 }, fire: (x, y, o) => P.ring(g, x, y, o.n, o.speed, o.phase) },
  arcWall:     { p: { n: 11, spread: 1.5, speed: 1.7, gapIndex: 5, gapWidth: 1 }, fire: (x, y, o) => P.arcWall(g, x, y, o.n, o.spread, o.speed, o.gapIndex, o.gapWidth) },
  spray:       { p: { n: 10, spread: 1.1, sMin: 1.7, sMax: 2.8 }, fire: (x, y, o) => P.spray(g, x, y, o.n, o.spread, o.sMin, o.sMax) },
  bendyStream: { p: { angleDeg: 90, n: 7, sMin: 1.2, sMax: 2.8 }, fire: (x, y, o) => P.bendyStream(g, x, y, o.angleDeg * Math.PI / 180, o.n, o.sMin, o.sMax) },
  lanceVolley: { p: { n: 5, speed: 3.3, accel: 0.015 }, fire: (x, y, o) => P.lanceVolley(g, x, y, o.n, o.speed, o.accel) },
  ledFan:      { p: { n: 5, spread: 0.6, speed: 3.2, vLead: 1.0 }, fire: (x, y, o) => P.ledFan(g, x, y, o.n, o.spread, o.speed, o.vLead) },
  twinSpiral:  { p: { count: 3, speed: 1.6, dir: 1, curve: 0.02, stepInc: 0.15 }, fire: (x, y, o) => { P.twinSpiral(g, x, y, S.spiralStep, o.count, o.speed, o.dir, o.curve); S.spiralStep += o.stepInc; } },
};
const pparams = {}; // live values per pattern
for (const k in PATTERNS) pparams[k] = { ...PATTERNS[k].p };

function firePattern(x = S.emitter.x, y = S.emitter.y, quiet = false) {
  const name = $('pattern').value, o = pparams[name];
  PATTERNS[name].fire(x, y, o);
  if (!quiet) logLine(`P.${name}(g, ${num(x)}, ${num(y)}, ${Object.entries(o).map(([k, v]) => `/*${k}*/ ${num(v)}`).join(', ')});`);
}
function renderPatternParams() {
  const name = $('pattern').value, box = $('pparams');
  box.innerHTML = '';
  for (const k in pparams[name]) {
    const lab = document.createElement('label'); lab.textContent = k;
    const inp = document.createElement('input'); inp.type = 'number'; inp.step = 'any'; inp.value = pparams[name][k];
    inp.oninput = () => { pparams[name][k] = +inp.value; };
    box.append(lab, inp);
  }
}

// ---------------------------------------------------------------- player / ship
const SHIP_DEFAULT = { ...PLAYER };
const SHIPS = { // sketches — the game has one ship; these mutate PLAYER live
  'default': { ...SHIP_DEFAULT },
  'heavy (slow, big shots)': { ...SHIP_DEFAULT, speed: 3.0, focusSpeed: 1.8, shotDmg: 5, shotEvery: 4, shotLimit: 4 },
  'needle (fast, thin stream)': { ...SHIP_DEFAULT, speed: 4.3, focusSpeed: 2.7, shotDmg: 2, shotEvery: 2, shotLimit: 8 },
  'wide hitbox test': { ...SHIP_DEFAULT, hitR: 6 },
};
function applyShip(vals) { Object.assign(PLAYER, vals); renderShipParams(); logLine(`Object.assign(PLAYER, ${JSON.stringify(vals)});`); }
function renderShipParams() {
  const box = $('ship-params'); box.innerHTML = '';
  for (const k in PLAYER) {
    const lab = document.createElement('label'); lab.textContent = k;
    const inp = document.createElement('input'); inp.type = 'number'; inp.step = 'any'; inp.value = PLAYER[k];
    inp.oninput = () => { PLAYER[k] = +inp.value; };
    box.append(lab, inp);
  }
}

const BOTS = {
  expert: () => makeBot({ aggressive: true }),
  human: () => makeBot({ aggressive: true, reactDelay: 7 }),
  passive: () => makeBot({ aggressive: false }),
};

// ---------------------------------------------------------------- input
const keys = {};
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  audio.unlock();
  const k = e.key.toLowerCase();
  if (k === 'p') togglePause();
  if (k === '.') { S.paused = true; S.stepOnce = true; syncButtons(); }
  if (k === '[' || k === ']') {
    const opts = [...$('speed').options].map((o) => +o.value);
    let i = opts.indexOf(S.speed) + (k === ']' ? 1 : -1);
    i = Math.max(0, Math.min(opts.length - 1, i)); S.speed = opts[i]; $('speed').value = String(S.speed);
  }
  if (k === 'h') { S.hitboxes = !S.hitboxes; syncButtons(); }
  if (k === 'l') { S.labels = !S.labels; syncButtons(); }
  if (k === 'c') clearField();
  if (k === 'm') audio.toggleMute();
  // r8-fx bench: 1-5 fire an explosion tier at the emitter mark (POP/MED/BIG/PHASE/PLAYER),
  // 6 parks a turret under the mark to judge "covers the sprite", J toggles hitstop
  if (k >= '1' && k <= '5') {
    const tier = +k - 1, NAMES = ['POP', 'MED', 'BIG', 'PHASE', 'PLAYER'];
    const fam = tier === TIER.PLAYER ? FAM.WHITE : FAM.ORANGE, r = [10, 12, 20, 30, 12][tier];
    explode(g, S.emitter.x, S.emitter.y, tier, fam, r);
    if (tier >= TIER.BIG) { g.shake = g.shakeMax = [0, 0, 14, 16, 20][tier]; g.hitstop = g.fxHitstop; }
    logLine(`// fx tier ${NAMES[tier]} → particles ${g.particles.count}/400`);
  }
  if (k === '6') { const e = spawnEnemy(g, 2, S.emitter.x, S.emitter.y); if (e) e.vulnAt = g.frame; logLine('// turret parked under the mark'); }
  if (k === 'j') { g.fxHitstop = g.fxHitstop ? 0 : 3; logLine(`// hitstop ${g.fxHitstop ? 'ON (3f)' : 'off'}`); }
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
// panel buttons must not keep focus: space/enter would re-click them instead of firing
addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') e.target.blur(); });

function pollInput() {
  if (S.bot) { S.bot(g); return; }
  const i = g.input;
  i.dx = (keys['arrowright'] || keys['d'] ? 1 : 0) - (keys['arrowleft'] || keys['a'] ? 1 : 0);
  i.dy = (keys['arrowdown'] || keys['s'] ? 1 : 0) - (keys['arrowup'] || keys['w'] ? 1 : 0);
  i.focus = !!keys['shift'];
  i.fire = !!(keys['z'] || keys[' ']);
  i.bomb = !!keys['x'];
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads || []) {
    if (!gp || !gp.connected || !gp.buttons.length) continue;
    if (Math.abs(gp.axes[0] || 0) > 0.35) i.dx = Math.sign(gp.axes[0]);
    if (Math.abs(gp.axes[1] || 0) > 0.35) i.dy = Math.sign(gp.axes[1]);
    if (gp.buttons[14]?.pressed) i.dx = -1; if (gp.buttons[15]?.pressed) i.dx = 1;
    if (gp.buttons[12]?.pressed) i.dy = -1; if (gp.buttons[13]?.pressed) i.dy = 1;
    i.fire = i.fire || gp.buttons[0]?.pressed || gp.buttons[2]?.pressed;
    i.bomb = i.bomb || gp.buttons[1]?.pressed || gp.buttons[3]?.pressed;
    i.focus = i.focus || gp.buttons[4]?.pressed || gp.buttons[5]?.pressed || gp.buttons[6]?.pressed || gp.buttons[7]?.pressed;
    break;
  }
}

canvas.addEventListener('mousedown', (ev) => {
  const r = canvas.getBoundingClientRect();
  const x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height;
  audio.unlock(); document.activeElement?.blur(); // clicking the field hands the keys back to the game
  if (S.mode === 'spawn') spawnPreset(+$('enemy').value, x, y);
  else if (S.mode === 'fire') { S.emitter = { x, y }; firePattern(x, y); }
  else { g.player.x = g.player.prevX = x; g.player.y = g.player.prevY = y; }
});

// ---------------------------------------------------------------- actions
function clearField() {
  g.enemies.clear(); g.eBullets.clear(); g.items.clear(); g.popups.clear();
  S.later.length = 0;
  logLine('// clear field');
}
function togglePause() { S.paused = !S.paused; audio.pauseMusic(S.paused); syncButtons(); }
function killAll() { // scored kills, via the core's own path: drop hp so the next shot/bomb tick lands
  for (let i = 0; i < g.enemies.count; i++) { const e = g.enemies.items[i]; if (e.vulnAt >= 0) e.hp = 0.1; }
  g.player.bombActive = Math.max(g.player.bombActive, 1); // bomb tick resolves them this frame, no cancel/points
  logLine('// kill all (hp→0.1 + 1f bomb tick)');
}
function stageJump(t) {
  g = makeGame(seedValue()); startRun(g); resetHud(); // real timeline
  g.stageT = t;
  while (g.tlIndex < g.timeline.length && g.timeline[g.tlIndex].t < t) g.tlIndex++;
  S.later.length = 0;
  logLine(`// stage jump: stageT=${t} (tlIndex ${g.tlIndex}/${g.timeline.length})`);
}

// ---------------------------------------------------------------- panel wiring
for (const b of document.querySelectorAll('[data-mode]')) b.onclick = () => { S.mode = b.dataset.mode; syncButtons(); };
for (const b of document.querySelectorAll('[data-music]')) b.onclick = () => { audio.unlock(); b.dataset.music ? audio.playMusic(b.dataset.music) : audio.stopMusic(); };
$('clear').onclick = clearField;
$('reset').onclick = () => newScene();
$('pause').onclick = togglePause;
$('step').onclick = () => { S.paused = true; S.stepOnce = true; syncButtons(); };
$('speed').onchange = (e) => { S.speed = +e.target.value; };
$('backdrop').onchange = (e) => { g.stageT = +e.target.value; };
ENEMIES.forEach((d, i) => $('enemy').add(new Option(d.name, i)));
$('enemy').value = '5';
$('spawnTop').onclick = () => spawnPreset(+$('enemy').value, W / 2, -16);
$('killAll').onclick = killAll;
$('cancel').onclick = () => { bulletCancelWall(g, W / 2, H / 2); logLine('bulletCancelWall(g, W / 2, H / 2);'); };
$('waveZ').onclick = () => {
  const side = g.player.x < W / 2 ? 1 : -1;
  for (let i = 0; i < 6; i++) later(i * 11, () => spawnEnemy(g, 0, side < 0 ? 40 + i * 5 : W - 40 - i * 5, -13, { vx: -side * 0.47, vy: 1.6, side, holdT: i % 3 === 1 ? 1 : 0 }));
  logLine(`// zakoGroup(now, ${side}, 6) — six zako, 11f apart, every 3rd a shooter`);
};
for (const k in PATTERNS) $('pattern').add(new Option(k, k));
$('pattern').onchange = renderPatternParams; renderPatternParams();
$('fireNow').onclick = () => firePattern();
$('repeat').onchange = (e) => { S.repeat = e.target.checked; };
$('repeatEvery').oninput = (e) => { S.repeatEvery = Math.max(1, +e.target.value | 0); };
$('god').onclick = () => { S.god = !S.god; syncButtons(); };
$('infLives').onclick = () => { S.infLives = !S.infLives; syncButtons(); };
$('infBombs').onclick = () => { S.infBombs = !S.infBombs; syncButtons(); };
$('bot').onchange = (e) => { S.bot = e.target.value ? BOTS[e.target.value]() : null; if (!S.bot) g.input.fire = false; };
for (const k in SHIPS) $('ship').add(new Option(k, k));
$('ship').onchange = (e) => applyShip(SHIPS[e.target.value]);
$('shipReset').onclick = () => { $('ship').value = 'default'; applyShip(SHIP_DEFAULT); };
renderShipParams();
$('hitboxes').onclick = () => { S.hitboxes = !S.hitboxes; syncButtons(); };
$('labels').onclick = () => { S.labels = !S.labels; syncButtons(); };
$('sfx').onclick = () => { S.sfx = !S.sfx; syncButtons(); };
$('jumpGo').onclick = () => stageJump(+$('jump').value);
$('copyLog').onclick = () => navigator.clipboard?.writeText($('log').value);
$('clearLog').onclick = () => { $('log').value = ''; };

function syncButtons() {
  for (const b of document.querySelectorAll('[data-mode]')) b.classList.toggle('on', b.dataset.mode === S.mode);
  $('pause').classList.toggle('on', S.paused); $('pause').textContent = S.paused ? 'resume' : 'pause';
  $('god').classList.toggle('on', S.god); $('infLives').classList.toggle('on', S.infLives);
  $('infBombs').classList.toggle('on', S.infBombs); $('hitboxes').classList.toggle('on', S.hitboxes);
  $('labels').classList.toggle('on', S.labels); $('sfx').classList.toggle('on', S.sfx);
}

// ---------------------------------------------------------------- frame loop
function tick() {
  const p = g.player;
  pollInput();
  if (S.god) p.invuln = Math.max(p.invuln, 2); // update decrements to 1 → collisions skip; draw hides the blink
  if (S.infBombs) p.bombs = 2;
  update(g);
  if (S.sfx) audio.drain(g);
  bgScroll += 1.05;
  // sandbox scheduler (wave presets)
  for (let i = S.later.length - 1; i >= 0; i--) if (g.frame >= S.later[i].at) { const j = S.later[i]; S.later.splice(i, 1); j.fn(); }
  if (S.repeat && g.frame - S.lastFire >= S.repeatEvery) { S.lastFire = g.frame; firePattern(S.emitter.x, S.emitter.y, true); }
  // keep the run alive: the sandbox never ends
  if (g.state === 'gameover' && S.infLives) {
    g.state = 'play'; p.lives = 3; p.bombs = 2; p.bombActive = 0;
    p.x = W / 2; p.y = H - 53; p.invuln = 150; logLine('// death (lives restored)');
  }
  if (g.state === 'clear') { g.state = 'play'; }
  if (g.bossDown) { g.bossDown = false; g.clearAt = 0; logLine('// boss down'); }
}

const STEP_MS = 1000 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  acc += (now - last) * S.speed; last = now;
  if (acc > 200) acc = 200;
  if (S.paused) { acc = 0; if (S.stepOnce) { S.stepOnce = false; tick(); } }
  else while (acc >= STEP_MS) { tick(); acc -= STEP_MS; }

  const p = g.player, inv = p.invuln;
  if (S.god) p.invuln = 0; // no invuln blink under god mode
  draw(g, ctx, bgScroll);
  p.invuln = inv;
  overlay();
  readout(now);
  requestAnimationFrame(frame);
}

function overlay() {
  ctx.save();
  ctx.font = '8px monospace'; ctx.textAlign = 'left';
  if (S.mode === 'fire') { // emitter mark
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1;
    const { x, y } = S.emitter;
    ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
  }
  if (S.hitboxes) {
    ctx.lineWidth = 1;
    for (let i = 0; i < g.enemies.count; i++) {
      const e = g.enemies.items[i];
      ctx.strokeStyle = e.vulnAt >= 0 ? '#ff4fa3' : '#6b7190';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.stroke(); // contact / hit circle
      ctx.setLineDash([2, 3]); ctx.strokeStyle = '#37d6e0';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6, 0, 7); ctx.stroke(); ctx.setLineDash([]); // player-shot hit radius
    }
    ctx.strokeStyle = '#ffffff';
    for (let i = 0; i < g.eBullets.count; i++) { const b = g.eBullets.items[i]; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(g.player.x, g.player.y, PLAYER.hitR, 0, 7); ctx.stroke();
    ctx.setLineDash([1, 4]); ctx.strokeStyle = '#8a7a30';
    ctx.beginPath(); ctx.arc(g.player.x, g.player.y, 53, 0, 7); ctx.stroke(); ctx.setLineDash([]); // item magnet radius
  }
  if (S.labels) {
    for (let i = 0; i < g.enemies.count; i++) {
      const e = g.enemies.items[i];
      let s = `t${e.type} hp${Math.max(0, e.hp).toFixed(0)}`;
      if (e.vulnAt < 0) { s += ' ARMOR'; ctx.fillStyle = '#8a8fa8'; }
      else {
        const left = e.window - (g.frame - e.vulnAt);
        s += left >= 0 ? ` SPD ${left}f` : ` late ${-left}f`;
        ctx.fillStyle = left >= 0 ? '#57e389' : '#ff8a5c';
      }
      if (e.type === 3 || e.type === 5) s += ` ph${e.phase}`;
      if (e.type === 5) s += ` camp${e.campT | 0} n${e.latchN}`;
      if (e.type === 5) ctx.fillText(s, e.x - 30, e.y + e.r + 12); // under the hull, clear of the part labels
      else ctx.fillText(s, e.x + e.r + 2, e.y - 2);
    }
  }
  ctx.restore();
}

function readout(now) {
  S.fpsN++;
  if (now - S.fpsT > 500) { S.fps = Math.round(S.fpsN * 1000 / (now - S.fpsT)); S.fpsN = 0; S.fpsT = now; }
  const p = g.player, warn = (v, lim) => v >= lim * 0.9 ? ' class="warn"' : '';
  $('readout').innerHTML = [
    ['fps', S.fps], ['frame', g.frame], ['stageT', g.stageT], ['state', g.state + (g.gate ? ' · gate ' + g.gate : '')],
    ['enemies', `<b${warn(g.enemies.count, 64)}>${g.enemies.count}</b>/64`], ['bullets', `<b${warn(g.eBullets.count, 1400)}>${g.eBullets.count}</b>/1400 (max ${g.stats.maxEBullets})`],
    ['shots', `${g.pBullets.count}/${PLAYER.shotLimit}`], ['particles', `${g.particles.count}/400`],
    ['score', g.score], ['chain', g.chain], ['speed kills', `${g.speedKills}/${g.kills}`],
    ['player', `${p.x | 0},${p.y | 0}${p.focus ? ' focus' : ''}${p.invuln > 2 ? ' inv' + p.invuln : ''}`],
    ['lives/bombs', `${p.lives}/${p.bombs}`], ['deaths', g.stats.deaths.length],
  ].map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('');
}

newScene(1);
syncButtons();
// devtools handle: __sandbox.g() is the live game; spawn/fire/stageJump script the scene
window.__sandbox = { g: () => g, S, PLAYER, spawnPreset, firePattern, stageJump, clearField, newScene, ENEMIES, PATTERNS };
requestAnimationFrame(frame);

// build tag (see src/version.js)
import('./version.js').then(({ BUILD }) => { document.title += ' \u00b7 ' + BUILD; });
