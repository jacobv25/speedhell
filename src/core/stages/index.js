// The campaign table (r78, plan docs/plans/campaign-five-stages.md §6).
// STAGES[level] is the stage module the game plays at g.level: it exports
// buildTimeline(), SECTIONS / SEC_T, name, the boss hook and (r80, optional)
// enemyUpdate[type] — per-type update hooks a stage owns (stage 2: its
// midboss, its anchor, its boss parts). The game handles STAGES.length
// generically. r80: STAGES = [s1, s2] — the clear → receipt → briefing →
// nextStage flow, the stage select on the PRACTICE row and `?level=N` are LIVE.
// The array is deliberately a plain mutable array: tools/probes push at runtime.
import s1 from './s1.js';
import s2 from './s2.js';

export const STAGES = [s1, s2];
export const stageAt = (level) => STAGES[Math.max(0, Math.min(STAGES.length - 1, level | 0))];
