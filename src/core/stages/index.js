// The campaign table (r78, plan docs/plans/campaign-five-stages.md §6).
// STAGES[level] is the stage module the game plays at g.level: it exports
// buildTimeline(), SECTIONS / SEC_T, name, the boss hook and (r80, optional)
// enemyUpdate[type] — per-type update hooks a stage owns (stage 2: its
// midboss, its anchor, its boss parts). The game handles STAGES.length
// generically. r80: STAGES = [s1, s2] — the clear → receipt → briefing →
// nextStage flow, the stage select on the PRACTICE row and `?level=N` are LIVE.
// r82: STAGES = [s1, s2, s3] (s3 = THE CANDLE SEA); `?level=2` plays it, and
// the PRACTICE row grows its ST3 entries with no further code (main.js reads
// STAGES[].SECTIONS). Stage 2's clear is now a 'stageclear' → briefing → s3.
// r84: STAGES = [s1, s2, s3, s4] (s4 = THE BLOOD GATE); `?level=3` plays it, the
// PRACTICE row grows its ST4 entries with no further code, and a stage-3 clear
// is now a 'stageclear' → briefing → s4. Stage 5 is still NOT registered — it is
// appended past the table by tools/probes/idol-probe.mjs or ?boss=idol, so the
// Idol now lands at level 4.
// The array is deliberately a plain mutable array: tools/probes push at runtime.
import s1 from './s1.js';
import s2 from './s2.js';
import s3 from './s3.js';
import s4 from './s4.js';

export const STAGES = [s1, s2, s3, s4];
export const stageAt = (level) => STAGES[Math.max(0, Math.min(STAGES.length - 1, level | 0))];
