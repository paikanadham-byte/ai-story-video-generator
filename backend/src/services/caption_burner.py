#!/usr/bin/env python3
"""
Burn SRT subtitles into a video using PIL for text rendering.
Creates transparent subtitle overlay frames, then composites via FFmpeg overlay.

Usage: python3 caption_burner.py <input_video> <srt_file> <output_video> [--width 1920] [--height 1080]
"""

import sys
import os
import re
import tempfile
import subprocess
import shutil
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow not installed. Run: pip3 install Pillow", file=sys.stderr)
    sys.exit(1)


def parse_srt(srt_path):
    """Parse SRT file into list of {index, start, end, text}."""
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    blocks = re.split(r"\n\n+", content)
    subs = []
    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 3:
            continue
        try:
            idx = int(lines[0])
        except ValueError:
            continue
        timing = lines[1]
        text = "\n".join(lines[2:])
        match = re.match(
            r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})",
            timing,
        )
        if not match:
            continue
        g = [int(x) for x in match.groups()]
        start = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000.0
        end = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000.0
        subs.append({"index": idx, "start": start, "end": end, "text": text})
    return subs


def find_font():
    """Find a suitable font for rendering captions."""
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSMono.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in font_paths:
        if os.path.exists(p):
            return p
    return None


def create_caption_image(text, width, height, font_path=None, font_size=42):
    """Create a transparent PNG with centered caption text at the bottom."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    try:
        if font_path:
            font = ImageFont.truetype(font_path, font_size)
            font_bold = ImageFont.truetype(font_path, font_size)
        else:
            font = ImageFont.load_default()
            font_bold = font
    except Exception:
        font = ImageFont.load_default()
        font_bold = font

    # Word wrap
    words = text.replace("\n", " ").split()
    lines = []
    current_line = ""
    max_width = width - 120  # padding

    for word in words:
        test = f"{current_line} {word}".strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_width:
            if current_line:
                lines.append(current_line)
            current_line = word
        else:
            current_line = test
    if current_line:
        lines.append(current_line)

    if not lines:
        return img

    # Calculate total text height
    line_height = font_size + 8
    total_height = len(lines) * line_height
    y_start = height - total_height - 80  # 80px from bottom

    # Draw background box
    padding = 16
    max_line_width = 0
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        if lw > max_line_width:
            max_line_width = lw

    box_x1 = (width - max_line_width) // 2 - padding
    box_y1 = y_start - padding // 2
    box_x2 = (width + max_line_width) // 2 + padding
    box_y2 = y_start + total_height + padding // 2

    # Semi-transparent background
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rounded_rectangle(
        [box_x1, box_y1, box_x2, box_y2],
        radius=12,
        fill=(0, 0, 0, 180),
    )
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    # Draw text
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        x = (width - lw) // 2
        y = y_start + i * line_height

        # White text with slight shadow
        draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 120))
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))

    return img


def burn_captions(input_video, srt_path, output_video, width=1920, height=1080):
    """Burn SRT captions into video using PIL + FFmpeg overlay."""
    subs = parse_srt(srt_path)
    if not subs:
        print("No subtitles found, copying input as-is", file=sys.stderr)
        shutil.copy2(input_video, output_video)
        return

    font_path = find_font()
    tmpdir = tempfile.mkdtemp(prefix="captions_")

    try:
        # Generate an overlay PNG for each subtitle
        overlay_inputs = []
        for sub in subs:
            img = create_caption_image(sub["text"], width, height, font_path)
            png_path = os.path.join(tmpdir, f"sub_{sub['index']:04d}.png")
            img.save(png_path)
            overlay_inputs.append({
                "path": png_path,
                "start": sub["start"],
                "end": sub["end"],
            })

        # Build FFmpeg command with overlay filters
        cmd = ["ffmpeg", "-y", "-i", input_video]

        # Add each overlay image as input
        for ov in overlay_inputs:
            cmd.extend(["-i", ov["path"]])

        # Build filter chain
        n = len(overlay_inputs)
        if n == 0:
            shutil.copy2(input_video, output_video)
            return

        filters = []
        prev = "0:v"
        for i, ov in enumerate(overlay_inputs):
            out = f"v{i}" if i < n - 1 else "vout"
            enable = f"between(t,{ov['start']:.3f},{ov['end']:.3f})"
            filters.append(
                f"[{prev}][{i+1}:v]overlay=0:0:enable='{enable}'[{out}]"
            )
            prev = out

        filter_str = ";".join(filters)
        cmd.extend([
            "-filter_complex", filter_str,
            "-map", "[vout]",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-movflags", "+faststart",
            output_video,
        ])

        print(f"Burning {n} captions into video...", file=sys.stderr)
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr[-500:]}", file=sys.stderr)
            # Fallback: embed as soft subs
            print("Falling back to soft subtitle embedding...", file=sys.stderr)
            embed_soft_subs(input_video, srt_path, output_video)
        else:
            print("Captions burned successfully!", file=sys.stderr)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def embed_soft_subs(input_video, srt_path, output_video):
    """Fallback: embed SRT as mov_text subtitle track."""
    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-i", srt_path,
        "-c:v", "copy",
        "-c:a", "copy",
        "-c:s", "mov_text",
        "-metadata:s:s:0", "language=eng",
        "-disposition:s:0", "default",
        output_video,
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=120)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Burn SRT captions into video")
    parser.add_argument("input_video")
    parser.add_argument("srt_file")
    parser.add_argument("output_video")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--soft-only", action="store_true", help="Only embed soft subs, skip burning")
    args = parser.parse_args()

    if args.soft_only:
        embed_soft_subs(args.input_video, args.srt_file, args.output_video)
    else:
        burn_captions(args.input_video, args.srt_file, args.output_video, args.width, args.height)
