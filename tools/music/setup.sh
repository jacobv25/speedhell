#!/bin/sh
# One-time: Python env for tools/music/analyze.py (Demucs stems + librosa). Needs uv + ffmpeg.
#   sh tools/music/setup.sh && tools/music/.venv/bin/python tools/music/analyze.py assets/music/insert-coin-skies.mp3 --bpm 172
set -e
cd "$(dirname "$0")"
[ -d .venv ] || uv venv -p 3.12 .venv
uv pip install -p .venv/bin/python "torch==2.13.0" "demucs==4.1.0" "librosa==1.0.0" numpy "scipy==1.18.1" soundfile  # pinned to what worked 2026-09-05
echo "ok: tools/music/.venv"
