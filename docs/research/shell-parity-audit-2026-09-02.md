# SPEEDHELL Shell Audit — vs Blue Revolver, Gunvein, M2 ShotTriggers
*2026-09-02, audit agent (r41 shell). Requested by Jacob: "a lot of obvious
things have been missing — use what is used in shmups on Steam."*
Research corrections: DoDonPachi Resurrection's console port is Livewire, not
M2 (M2's DoDonPachi reference is DaiOuJou Re:Incarnation); "Garegga-isms" is
not a real M2 feature name (the real equivalents: HTML strategy manuals + the
Rank Graph gadget).

## Where SPEEDHELL already MEETS the standard
- Pause menu structure (resume/retry/quit, full kb+pad nav, edge-triggered).
- Rebinding, keyboard AND pad, reserved shell keys, steal rule, persistence.
- TATE both directions, persisted (Gunvein 360°, M2 direction-explicit).
- Volume sliders w/ release audition, mute, pause = silence.
- Practice granularity: every section incl. midboss/boss, retry re-enters
  (BR stage select, Gunvein Stage Practice); practice score exclusion matches
  the M2/Aleste integrity convention.
- Sub-2s retry from the death screen (the exact M2-praised QoL).
- One-card HOW TO, auto-once, never gating (M2 manual-not-tutorial cousin).
- Sane defaults + build tag (M2 "defaults are already right").

## MUST — release blockers (all three references)
1. Real title menu (BR: Game/Stage Select/Missions/Extras/Options; Gunvein:
   modes/missions/options/leaderboards; every M2 port). → r42 ships this.
2. Local hi-score table + name entry (BR initials + local table; Gunvein's
   top complaint at launch was "cannot even check my score"; M2 gadget bests).
3. Results "receipt" screen (BR ranking screen; M2 tallies; HOMAGE R8 spec).
4. Title-screen audio (every reference; parked r32 asset decision).

## SHOULD (2+ references)
5. Player-facing replays (BR in-game; M2 Replay Theater) — r28 tapes are
   byte-perfect, persist best/last tape + REPLAY title entry.
6. Attract mode on idle title from stored best tape (all M2 ports).
7. Side-panel gadgets in the pillarbox space (M2 signature; BR DA widescreen
   gadgets): speed-kill stopwatch, chain, personal best, boss HP — display only.
8. Scanline/CRT toggle (BR, Gunvein, M2 0–100% slider) — CSS overlay div.
9. Legibility options: bg brightness / flash intensity (BR, Gunvein) —
   renderer bg multiplier; bullet display contract untouched (design law).
10. Practice starting-resource config (Gunvein fragments; M2 custom modes) —
    second ◀▶ row for starting lives/bombs; practice already score-excluded.
11. (Steam milestone) Online leaderboards — split boards, practice runs off.

## COULD — M2-tier delights
12. Death-review practice ("osarai": restart 5s before each logged death —
    Ketsui Bonds of Growth). Tape infra makes this feasible.
13. Midboss/boss rush mission (Gunvein; M2 challenges) via startRun anchors.
14. Music room / gallery once the title menu exists.
15. In-game strategy page (M2 manual/BR Break Guide) — SPEEDHELL-specific only.
16. TATE control-link toggle (Gunvein) for rotated-image-unrotated-monitor.
17. Table personality: split-condition boards, profanity-censored initials (BR).

## Open developer question (flagged, not recommended)
All three references ship autofire options (M2: per-button, adjustable rates).
SPEEDHELL law: fire is held (BOGHOG_CRAFT). Stated stance somewhere, or silence?

## Non-gap
One honest difficulty (Pillar 3): reference difficulty selects deliberately
not carried over. The transferable M2 lesson: all accessibility lives in the
SHELL (practice, gadgets, receipts, manuals); the game is never altered —
already SPEEDHELL's architecture.

## Top 5, in order
1. Real title menu  2. Hi-score table + name entry  3. Results receipt
4. Title music  5. Attract mode from best-run tape
