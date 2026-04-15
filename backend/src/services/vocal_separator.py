#!/usr/bin/env python3
"""
High-quality vocal / instrumental separator using STFT-based spectral masking.
No ML models required — uses numpy/scipy/soundfile.

Algorithm:
  1. Load stereo audio as float32
  2. Compute STFT for left & right channels
  3. Build a soft mask: vocals are center-panned (correlated L/R),
     instruments have different L/R phase/magnitude
  4. Apply tuned Wiener-filter style soft mask
  5. ISTFT and write stems

Usage: python3 vocal_separator.py <input> <vocals_out> <instrumental_out>
"""

import sys, os
import numpy as np
import soundfile as sf
from scipy.signal import stft, istft as scipy_istft

# ── STFT parameters ──────────────────────────────────────────────────────────
WINDOW    = "hann"
NPERSEG   = 2048          # FFT window size
NOVERLAP  = NPERSEG * 3 // 4   # 75% overlap
TARGET_SR = 44100          # resample target (ffmpeg handles this before calling us)

# ── Soft mask sharpness ───────────────────────────────────────────────────────
# Higher = more aggressive (more bleed-free but more artefacts)
# 2.5 is a safe mid-point; you can go 3.5 for harder separation
ALPHA = 2.5
BETA  = 2.0   # Wiener exponent


def load_stereo(path):
    """Load audio, always return (2, N) float32 at native sample rate."""
    data, sr = sf.read(path, dtype="float32", always_2d=True)
    # data shape: (N, channels)
    data = data.T  # → (channels, N)
    if data.shape[0] == 1:
        data = np.vstack([data, data])
    elif data.shape[0] > 2:
        data = data[:2]
    return data, sr


def compute_stft(mono, sr):
    f, t, Z = stft(mono, fs=sr, window=WINDOW, nperseg=NPERSEG, noverlap=NOVERLAP)
    return f, t, Z


def resynth(Z, sr, length):
    _, x = scipy_istft(Z, fs=sr, window=WINDOW, nperseg=NPERSEG, noverlap=NOVERLAP)
    # Trim / pad to match original length
    if len(x) > length:
        x = x[:length]
    elif len(x) < length:
        x = np.pad(x, (0, length - len(x)))
    return x.astype(np.float32)


def separate(input_path, vocals_path, instrumental_path):
    print(f"[SEP] Loading: {input_path}", flush=True)
    stereo, sr = load_stereo(input_path)
    L, R = stereo[0], stereo[1]
    N = L.shape[0]

    print(f"[SEP] Sample rate={sr}, samples={N}, duration={N/sr:.1f}s", flush=True)

    # ── Compute STFTs ─────────────────────────────────────────────────────────
    _, _, ZL = compute_stft(L, sr)
    _, _, ZR = compute_stft(R, sr)

    ML = np.abs(ZL)   # magnitude left
    MR = np.abs(ZR)   # magnitude right

    # ── Mid / Side magnitudes ─────────────────────────────────────────────────
    # Mid  = correlated (center-panned) content — mostly vocals
    # Side = decorrelated content — mostly instruments spread across stereo field
    mid  = (ML + MR) / 2.0
    side = np.abs(ML - MR) / 2.0 + 1e-8

    # ── Soft vocal mask (Wiener-style) ────────────────────────────────────────
    # Vocals dominate where mid >> side
    vocal_ratio  = (mid ** BETA) / (mid ** BETA + (ALPHA * side) ** BETA + 1e-10)
    instr_ratio  = 1.0 - vocal_ratio

    # ── Apply masks ───────────────────────────────────────────────────────────
    ZL_vox  = vocal_ratio * ZL
    ZR_vox  = vocal_ratio * ZR
    ZL_inst = instr_ratio * ZL
    ZR_inst = instr_ratio * ZR

    # ── Reconstruct time-domain signals ──────────────────────────────────────
    print("[SEP] Reconstructing vocals...", flush=True)
    vox_L  = resynth(ZL_vox,  sr, N)
    vox_R  = resynth(ZR_vox,  sr, N)

    print("[SEP] Reconstructing instrumental...", flush=True)
    inst_L = resynth(ZL_inst, sr, N)
    inst_R = resynth(ZR_inst, sr, N)

    # ── Normalise to prevent clipping ─────────────────────────────────────────
    def norm(arr):
        peak = np.max(np.abs(arr))
        return arr / peak * 0.95 if peak > 0 else arr

    vocals_stereo       = norm(np.stack([vox_L,  vox_R],  axis=1))
    instrumental_stereo = norm(np.stack([inst_L, inst_R], axis=1))

    # ── Write output ──────────────────────────────────────────────────────────
    print(f"[SEP] Writing vocals     → {vocals_path}", flush=True)
    sf.write(vocals_path,       vocals_stereo,       sr, subtype="PCM_16")

    print(f"[SEP] Writing instrumental → {instrumental_path}", flush=True)
    sf.write(instrumental_path, instrumental_stereo, sr, subtype="PCM_16")

    print("[SEP] Done.", flush=True)
    return True


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: vocal_separator.py <input_wav> <vocals_out.wav> <instrumental_out.wav>",
              file=sys.stderr)
        sys.exit(1)

    inp  = sys.argv[1]
    vox  = sys.argv[2]
    inst = sys.argv[3]

    try:
        separate(inp, vox, inst)
    except Exception as e:
        print(f"[SEP] Error: {e}", file=sys.stderr)
        import traceback; traceback.print_exc()
        sys.exit(1)
