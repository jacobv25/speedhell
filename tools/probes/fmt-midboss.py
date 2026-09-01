import sys, json
for ln in sys.stdin:
    ln = ln.strip()
    if not ln: continue
    d = json.loads(ln)
    f = d['midbossKillFramesFromVuln']
    w = 'no kill' if f is None else ('SPEED (in window)' if f <= 700 else 'window MISSED')
    secs = 0 if f is None else f / 60
    print(f"  {d['name']:18s} kill {f}f ({secs:.1f}s) {w} | avg enemies {d['avgEnemiesInGate']} | deaths {d['deathsInGate']} | timeouts {d['timeouts']}")
