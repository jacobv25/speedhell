#!/usr/bin/env python3
"""SPEEDHELL music lab — offline analysis for one track.

    python tools/music/analyze.py assets/music/insert-coin-skies.mp3 --bpm 172

Writes
  docs/music/<name>.analysis.json          beat grid, bar phase, sections, per-stem onsets (small, committed)
  assets/music/stems/<name>/<stem>.m4a     Demucs stems, AAC-encoded for the browser (large, gitignored)

Run inside the venv made by tools/music/setup.sh. Demucs is skipped (with a
warning) if the stems already exist; pass --restem to redo them.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
import librosa

ROOT = Path(__file__).resolve().parents[2]
STEMS = ["drums", "bass", "other", "vocals"]
SR = 44100
HOP = 512


def run_demucs(src: Path, out_dir: Path):
    tmp = Path(tempfile.mkdtemp(prefix="demucs-"))
    print(f"[demucs] separating {src.name} (this takes a minute)…", flush=True)
    subprocess.run([sys.executable, "-m", "demucs", "-n", "htdemucs", "-o", str(tmp), str(src)], check=True)
    got = tmp / "htdemucs" / src.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    for s in STEMS:
        wav = got / f"{s}.wav"
        m4a = out_dir / f"{s}.m4a"
        print(f"[ffmpeg] {wav.name} -> {m4a.relative_to(ROOT)}", flush=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "aac", "-b:a", "160k", str(m4a)], check=True)
        shutil.copy(wav, out_dir / f"{s}.wav")  # lossless copy for analysis (gitignored)
    shutil.rmtree(tmp, ignore_errors=True)


def onsets(y, sr, hop=HOP):
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    peaks = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop, units="frames", backtrack=False)
    t = librosa.frames_to_time(peaks, sr=sr, hop_length=hop)
    mx = float(env.max()) or 1.0
    return [[round(float(a), 3), round(float(env[p]) / mx, 3)] for a, p in zip(t, peaks)], env


def low_hits(y, sr, hop=HOP, cutoff=110.0):
    """Deep-percussion hits: onsets in the sub-band only (the '0:32 big bass' feel)."""
    from scipy.signal import butter, sosfilt
    sos = butter(4, cutoff / (sr / 2), btype="low", output="sos")
    low = sosfilt(sos, y)
    hits, _ = onsets(low, sr, hop)
    return hits


def sections(y, sr, beats_f, k=10):
    """Beat-synchronous chroma+MFCC, agglomerative boundaries. Crude but a useful scaffold."""
    C = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=HOP)
    M = librosa.feature.mfcc(y=y, sr=sr, hop_length=HOP, n_mfcc=13)
    Cs = librosa.util.sync(C, beats_f, aggregate=np.median)
    Ms = librosa.util.sync(M, beats_f, aggregate=np.median)
    X = np.vstack([librosa.util.normalize(Cs, axis=0), librosa.util.normalize(Ms, axis=0)])
    if X.shape[1] <= k: return []
    b = librosa.segment.agglomerative(X, k)
    return [round(float(librosa.frames_to_time(beats_f[i], sr=sr, hop_length=HOP)), 3) for i in b if i > 0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--restem", action="store_true")
    ap.add_argument("--no-stems", action="store_true", help="analysis only, from the mix")
    ap.add_argument("--bpm", type=float, default=None, help="tempo prior; beat trackers confuse 3:2 relatives (172 vs 115 on insert-coin-skies)")
    a = ap.parse_args()
    src = Path(a.src).resolve()
    name = src.stem
    stem_dir = ROOT / "assets" / "music" / "stems" / name
    if not a.no_stems and (a.restem or not all((stem_dir / f"{s}.wav").exists() for s in STEMS)):
        run_demucs(src, stem_dir)

    y, sr = librosa.load(str(src), sr=SR, mono=True)
    dur = float(len(y) / sr)
    print(f"[analyze] {name}: {dur:.2f}s", flush=True)

    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    tempo, beats_f = librosa.beat.beat_track(onset_envelope=env, sr=sr, hop_length=HOP, trim=False, **({"start_bpm": a.bpm} if a.bpm else {}))
    tempo = float(np.atleast_1d(tempo)[0])
    beats_t = librosa.frames_to_time(beats_f, sr=sr, hop_length=HOP)
    # regularise to a fixed grid (the game wants period + phase, not a wobbly list)
    period = float(np.median(np.diff(beats_t)))
    first = float(beats_t[0])
    n_beats = int((dur - first) / period) + 1
    grid = first + period * np.arange(n_beats)
    # bar phase: which of the 4 beat offsets has the strongest onsets (assumes 4/4)
    gf = librosa.time_to_frames(grid, sr=sr, hop_length=HOP)
    gf = gf[gf < len(env)]
    phase = int(np.argmax([env[gf[p::4]].mean() for p in range(4)]))

    out = {
        "file": src.name, "duration": round(dur, 3),
        "bpm": round(60.0 / period, 2), "beat_period": round(period, 5), "first_beat": round(first, 4),
        "bar_phase": phase, "beats_per_bar": 4, "n_beats": n_beats, "bpm_hint": a.bpm,
        "sections": sections(y, sr, beats_f),
        "onsets": {}, "low_hits": [],
        "note": "beat grid = first_beat + i*beat_period; bar starts at beat index bar_phase (mod 4). sections are a machine guess.",
    }
    out["onsets"]["mix"], _ = onsets(y, sr)
    if not a.no_stems:
        for s in STEMS:
            ys, _ = librosa.load(str(stem_dir / f"{s}.wav"), sr=SR, mono=True)
            out["onsets"][s], _ = onsets(ys, sr)
            if s == "drums": out["low_hits"] = low_hits(ys, sr)
            elif s == "bass": out["low_hits_bass"] = low_hits(ys, sr)
    dst = ROOT / "docs" / "music" / f"{name}.analysis.json"
    dst.write_text(json.dumps(out, separators=(",", ":")))
    print(f"[analyze] wrote {dst.relative_to(ROOT)}  bpm={out['bpm']} first_beat={out['first_beat']} bar_phase={phase} sections={len(out['sections'])}")


if __name__ == "__main__":
    main()
