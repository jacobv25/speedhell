# tools/probes — scratch measurement probes (rescued from session scratchpads)

Not referee checks — ad-hoc instruments built during Booth-driven rounds.
All import the core by ABSOLUTE path (adjust if the repo moves).

- `midboss-probe.mjs` — expert + aggressive-human midboss fight: kill frames
  from vulnerability, avg enemies/bullets in the gate, deaths. Used to aim the
  r25 hp experiment (bots are unreliable here: they chase escort popcorn).
- `camper-probe.mjs <y> <pure|dodgy> <seed>` — turret-alley camper: bullets
  seen, deaths, kill ages (the r16-r18 top-band investigation).
- `seam-probe2.mjs` — "nothing shootable" seconds across the S1→S2 seam (r21).
- `fmt-midboss.py` — formatter for midboss-probe output.
- `stem-layers-probe.mjs [seed]` — r74 stem layers (lab `musicLayers`): fake
  Web Audio + virtual clock; row off = today's element path (0 fetches, 0 music
  nodes); row on = 3 layer sources at one t0, sections once in order with every
  ramp on a 125 BPM bar line, pause/burst/stop/slider/mute/duck, element→stems
  hand-off, decoded-PCM budget. Needs no stems on disk (the decode is faked).
