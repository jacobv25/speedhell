// The campaign table (r78, plan docs/plans/campaign-five-stages.md §6).
// STAGES[level] is the stage module the game plays at g.level: it exports
// buildTimeline(), SECTIONS / SEC_T, name, and the boss hook. The game handles
// STAGES.length generically — with one entry every campaign path is dormant
// (nextStage is never reached; the title has no stage dimension) and stage 1
// plays exactly as certified. Stage 2+ append here, one per pass (§7).
// The array is deliberately a plain mutable array: tools/probes/campaign-probe.mjs
// pushes a duplicate of s1 at runtime to exercise the carry-over path.
import s1 from './s1.js';

export const STAGES = [s1];
export const stageAt = (level) => STAGES[Math.max(0, Math.min(STAGES.length - 1, level | 0))];
