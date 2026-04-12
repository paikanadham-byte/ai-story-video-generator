#!/usr/bin/env python3
"""Edge-TTS helper script for the AI Story Video Generator.
Usage: python3 tts_helper.py <voice> <output_path> [--rate RATE] [--pitch PITCH]
Text is read from stdin.
"""
import sys
import asyncio
import edge_tts

async def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print("Usage: tts_helper.py <voice> <output_path> [--rate RATE] [--pitch PITCH]", file=sys.stderr)
        sys.exit(1)

    voice = args[0]
    output_path = args[1]

    rate = "+0%"
    pitch = "+0Hz"
    i = 2
    while i < len(args):
        if args[i] == "--rate" and i + 1 < len(args):
            rate = args[i + 1]
            i += 2
        elif args[i] == "--pitch" and i + 1 < len(args):
            pitch = args[i + 1]
            i += 2
        else:
            i += 1

    text = sys.stdin.read().strip()
    if not text:
        print("Error: no text provided on stdin", file=sys.stderr)
        sys.exit(1)

    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(output_path)

asyncio.run(main())
