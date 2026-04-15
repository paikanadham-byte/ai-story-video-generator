#!/usr/bin/env python3
"""
High-quality vocal / instrumental separator using a two-stage algorithm:

Stage 1 — REPET (Repeating Pattern Extraction Technique):
  Music instruments repeat (verse/chorus cycles). Vocals don't.
  Find the dominant repeating period in the spectrogram, build a median
  repeating model for each frequency band, and soft-mask it out.

Stage 2 — Center-channel refinement (Mid/Side):
  After REPET, vocals that remain are typically center-panned while
  residual instrument bleed is spread wider. A second Wiener soft-mask
  refines the separation using stereo correlation.

Net result: dramatically less vocal bleed in the instrumental track vs.
simple phase-cancellation or single-stage mid/side masking.

Requires only: numpy, scipy, soundfile (no ML models).
Usage: python3 vocal_separator.py <input.wav> <vocals.wav> <instrumental.wav>
"""

import sys
import numpy as np
import soundfile as sf
from scipy.signal import stft, istft as scipy_istft

# ── STFT parameters ──────────────────────────────────────────────────────────
WINDOW   = "hann"
NPERSEG  = 4096            # larger window = better frequency resolution for vocals
NOVERLAP = NPERSEG * 3 // 4

# ── REPET parameters ─────────────────────────────────────────────────────────
MIN_PERIOD_FRAMES = 8      # shortest repeating period (in STFT frames)
MAX_PERIOD_FRAMES = 400    # longest repeating period to consider
REPET_MASK_POWER  = 2.0    # Wiener exponent for REPET soft mask

# ── Mid/Side refinement parameters ───────────────────────────────────────────
MS_ALPHA = 3.0             # how aggressively favouring center == vocals
MS_BETA  = 2.0             # Wiener exponent for mid/side soft mask

# ── Final blend ──────────────────────────────────────────────────────────────
REPET_WEIGHT = 0.65        # weight of REPET mask in the combined mask
MS_WEIGHT    = 0.35        # weight of mid/side mask


# ─────────────────────────────────────────────────────────────────────────────
# I/O helpers
# ─────────────────────────────────────────────────────────────────────────────

def load_stereo(path):
    """Load WAV → always (2, N) float32."""
    data, sr = sf.read(path, dtype="float32", always_2d=True)
    data = data.T          # (N, ch) → (ch, N)
    if data.shape[0] == 1:
        data = np.vstack([data, data])
    elif data.shape[0] > 2:
        data = data[:2]
    return data, sr


def do_stft(mono, sr):
    _, _, Z = stft(mono, fs=sr, window=WINDOW, nperseg=NPERSEG, noverlap=NOVERLAP)
    return Z                # complex (freq_bins, time_frames)


def do_istft(Z, sr, length):
    _, x = scipy_istft(Z, fs=sr, window=WINDOW, nperseg=NPERSEG, noverlap=NOVERLAP)
    x = x[:length] if len(x) > length else np.pad(x, (0, max(0, length - len(x))))
    return x.astype(np.float32)


def normalise(stereo_arr):
    """Peak-normalise a (N, 2) array to 0.95 FS."""
    peak = np.max(np.abs(stereo_arr))
    return stereo_arr / peak * 0.95 if peak > 1e-8 else stereo_arr


# ─────────────────────────────────────────────────────────────────────────────
# REPET stage
# ─────────────────────────────────────────────────────────────────────────────

def beat_spectrum(S):
    """
    Compute beat spectrum from a magnitude spectrogram S (freq × time).
    Returns the mean normalised autocorrelation across frequency bands.
    """
    S_norm  = S / (np.linalg.norm(S, axis=1, keepdims=True) + 1e-8)
    # Full autocorrelation for each frequency bin via FFT
    n_fft   = 2 ** int(np.ceil(np.log2(2 * S_norm.shape[1] - 1)))
    S_fft   = np.fft.rfft(S_norm, n=n_fft, axis=1)
    acorr   = np.fft.irfft(S_fft * np.conj(S_fft), axis=1)[:, :S_norm.shape[1]]
    # Average over frequency bins → 1-D beat spectrum
    bs      = acorr.mean(axis=0)
    # Normalise by zero-lag
    bs     /= bs[0] + 1e-8
    return bs


def find_period(bs):
    """Find the dominant repeating period (in frames) from the beat spectrum."""
    lo, hi = MIN_PERIOD_FRAMES, min(MAX_PERIOD_FRAMES, len(bs) // 2)
    if lo >= hi:
        return None
    candidates = bs[lo:hi]
    # Find first strong peak (must exceed mean + 0.5 * std)
    threshold = candidates.mean() + 0.5 * candidates.std()
    peaks = np.where(candidates >= threshold)[0]
    if len(peaks) == 0:
        # Fall back: argmax in window
        return int(np.argmax(candidates)) + lo
    return int(peaks[0]) + lo


def repet_mask(S):
    """
    Given magnitude spectrogram S (freq × time),
    return a soft mask [0,1] that isolates the REPEATING (instrument) component.
    """
    freq_bins, T = S.shape

    bs     = beat_spectrum(S)
    period = find_period(bs)

    if period is None or period < MIN_PERIOD_FRAMES:
        print(f"[SEP] REPET: no clear period found, using period=64", flush=True)
        period = 64

    print(f"[SEP] Detected repeating period: {period} frames", flush=True)

    # Build repeating model: for each column t, median of columns
    # at t − k·period, t, t + k·period  (all valid indices)
    model = np.zeros_like(S)
    for t in range(T):
        indices = list(range(t % period, T, period))
        model[:, t] = np.median(S[:, indices], axis=1)

    # Soft mask: where model ≈ S, content is repeating (instruments)
    instr_mask = (model ** REPET_MASK_POWER) / (
        model ** REPET_MASK_POWER + (S - model).clip(0) ** REPET_MASK_POWER + 1e-10
    )
    # Clip to [0, 1]
    instr_mask = np.clip(instr_mask, 0.0, 1.0)
    return instr_mask      # high → instrument, low → vocal


# ─────────────────────────────────────────────────────────────────────────────
# Mid/Side refinement stage
# ─────────────────────────────────────────────────────────────────────────────

def ms_vocal_mask(ML, MR):
    """
    Mid/Side based soft mask for centre-panned vocal detection.
    Returns vocal_mask in [0, 1].  High → vocal.
    """
    mid  = (ML + MR) / 2.0
    side = np.abs(ML - MR) / 2.0 + 1e-8
    vocal_mask = (mid ** MS_BETA) / (
        mid ** MS_BETA + (MS_ALPHA * side) ** MS_BETA + 1e-10
    )
    return np.clip(vocal_mask, 0.0, 1.0)


# ─────────────────────────────────────────────────────────────────────────────
# Main separation routine
# ─────────────────────────────────────────────────────────────────────────────

def separate(input_path, vocals_path, instrumental_path):
    print(f"[SEP] Loading: {input_path}", flush=True)
    stereo, sr = load_stereo(input_path)
    L, R = stereo[0], stereo[1]
    N = L.shape[0]
    print(f"[SEP] Sample rate={sr}, samples={N}, duration={N/sr:.1f}s", flush=True)

    # ── STFT ──────────────────────────────────────────────────────────────────
    ZL = do_stft(L, sr)    # (freq, time) complex
    ZR = do_stft(R, sr)
    ML = np.abs(ZL)
    MR = np.abs(ZR)

    # ── Mono magnitude for REPET ──────────────────────────────────────────────
    S_mono = (ML + MR) / 2.0

    # ── Stage 1: REPET — identify repeating (instrument) vs non-repeating (vocal) ──
    print("[SEP] Stage 1: computing REPET beat spectrum...", flush=True)
    repet_instr_mask = repet_mask(S_mono)   # high = instrument
    repet_vocal_mask = 1.0 - repet_instr_mask

    # ── Stage 2: Mid/Side refinement ──────────────────────────────────────────
    print("[SEP] Stage 2: mid/side refinement...", flush=True)
    ms_vox_mask = ms_vocal_mask(ML, MR)     # high = vocal

    # ── Combine masks ─────────────────────────────────────────────────────────
    # Vocal = weighted average of REPET and mid/side vocal masks
    vocal_mask = REPET_WEIGHT * repet_vocal_mask + MS_WEIGHT * ms_vox_mask
    instr_mask = 1.0 - vocal_mask

    # Apply hard floor: ensure instrumental mask is at least low near clear center vocals
    instr_mask = np.clip(instr_mask, 0.0, 1.0)
    vocal_mask = np.clip(vocal_mask, 0.0, 1.0)

    # ── Apply masks to STFT ───────────────────────────────────────────────────
    ZL_vox  = vocal_mask * ZL
    ZR_vox  = vocal_mask * ZR
    ZL_inst = instr_mask * ZL
    ZR_inst = instr_mask * ZR

    # ── Reconstruct ───────────────────────────────────────────────────────────
    print("[SEP] Reconstructing vocals...", flush=True)
    vox_L  = do_istft(ZL_vox,  sr, N)
    vox_R  = do_istft(ZR_vox,  sr, N)

    print("[SEP] Reconstructing instrumental...", flush=True)
    inst_L = do_istft(ZL_inst, sr, N)
    inst_R = do_istft(ZR_inst, sr, N)

    vocals_out = normalise(np.stack([vox_L,  vox_R],  axis=1))
    instr_out  = normalise(np.stack([inst_L, inst_R], axis=1))

    # ── Write ─────────────────────────────────────────────────────────────────
    print(f"[SEP] Writing vocals       → {vocals_path}", flush=True)
    sf.write(vocals_path, vocals_out, sr, subtype="PCM_16")

    print(f"[SEP] Writing instrumental → {instrumental_path}", flush=True)
    sf.write(instrumental_path, instr_out, sr, subtype="PCM_16")

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
