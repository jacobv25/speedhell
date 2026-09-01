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
