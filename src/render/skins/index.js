// Skin registry (r60). One file per concept direction; the Lab row `skin` and
// ?skin= on the peek harness switch between them live. Adding a skin = one
// import + one entry here. renderer.js owns the contract (see base.js header).
import base from './base.js';
import cuteOccult from './cute-occult.js';
import neonVector from './neon-vector.js';
import synthwave from './synthwave.js';
import graphicPop from './graphic-pop.js';
export const SKINS = { base, 'cute-occult': cuteOccult, 'neon-vector': neonVector, synthwave, 'graphic-pop': graphicPop };
export const SKIN_IDS = Object.keys(SKINS);
