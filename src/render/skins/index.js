// Skin registry (r60). One file per concept direction; the Lab row `skin` and
// ?skin= on the peek harness switch between them live. Adding a skin = one
// import + one entry here. renderer.js owns the contract (see base.js header).
import base from './base.js';
import cuteOccult from './cute-occult.js';
import synthwave from './synthwave.js';
// r64: neon-vector and graphic-pop retired (Jacob's call after the r61 playtest);
// their briefs + peek sheets stay in docs/art-rounds + docs/img as the record.
// synthwave stays until its approaching-landmark technique is ported (Round 3).
export const SKINS = { base, 'cute-occult': cuteOccult, synthwave };
export const SKIN_IDS = Object.keys(SKINS);
