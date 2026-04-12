# AI Story Video Generator

A full-stack web app that generates cinematic videos from a single text prompt using AI.

## Architecture

```
ai-story-video-generator/
├── backend/                    # Express + Socket.IO server
│   ├── src/
│   │   ├── config/             # Environment config
│   │   ├── routes/
│   │   │   ├── generate.js     # POST /api/generate — start pipeline
│   │   │   ├── jobs.js         # GET  /api/jobs — list/check jobs
│   │   │   └── media.js        # GET  /api/media/search — search stock media
│   │   ├── services/
│   │   │   ├── scriptEngine.js # LLM script generation (OpenAI)
│   │   │   ├── mediaFetcher.js # Pexels + Pixabay + Unsplash fetcher
│   │   │   ├── ttsEngine.js    # Text-to-speech (OpenAI TTS)
│   │   │   ├── videoRenderer.js# FFmpeg scene render + concatenation
│   │   │   └── pipeline.js     # Orchestrates the full pipeline
│   │   ├── utils/
│   │   │   ├── helpers.js      # Utility functions
│   │   │   └── jobStore.js     # In-memory job tracking
│   │   ├── websocket.js        # Socket.IO setup + emitters
│   │   └── index.js            # Server entry point
│   ├── output/                 # Generated videos (gitignored)
│   ├── music/                  # Optional background music files
│   ├── .env.example
│   └── package.json
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── StoryInput.jsx  # Input form with all options
│   │   │   ├── ProgressScreen.jsx
│   │   │   └── VideoPreview.jsx
│   │   ├── api/client.js       # API client functions
│   │   ├── App.jsx
│   │   ├── index.css           # Full dark theme styles
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Prerequisites

- **Node.js** ≥ 18
- **FFmpeg** installed and available on PATH
- API keys for:
  - [OpenAI](https://platform.openai.com/api-keys) — LLM + TTS
  - [Pexels](https://www.pexels.com/api/) — Stock video
  - [Pixabay](https://pixabay.com/api/docs/) — Stock video/images
  - [Unsplash](https://unsplash.com/developers) — Stock images

## Setup

### 1. Clone & install

```bash
# Backend
cd backend
cp .env.example .env    # Edit with your API keys
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure API keys

Edit `backend/.env` and fill in your keys:

```
OPENAI_API_KEY=sk-...
PEXELS_API_KEY=...
PIXABAY_API_KEY=...
UNSPLASH_ACCESS_KEY=...
```

### 3. Install FFmpeg (if not already installed)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows (via chocolatey)
choco install ffmpeg
```

### 4. Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173**

## API Reference

### `POST /api/generate`

Start video generation.

| Field        | Type   | Required | Description                                      |
| ------------ | ------ | -------- | ------------------------------------------------ |
| `storyIdea`  | string | Yes      | Story prompt (10–5000 chars)                     |
| `genre`      | string | No       | horror, romance, documentary, motivational, cinematic |
| `voiceStyle` | string | No       | male_deep, male_warm, female_warm, female_bright, neutral, storyteller |
| `sceneCount` | number | No       | 10–60 (default 25)                              |
| `resolution` | string | No       | "720p" or "1080p" (default "1080p")             |
| `musicMood`  | string | No       | calm, epic, dark, upbeat, romantic               |

**Response:**
```json
{
  "jobId": "uuid",
  "message": "Video generation started",
  "wsChannel": "job:uuid"
}
```

### `GET /api/generate/:jobId/status`

Poll job status.

### `GET /api/jobs`

List all jobs.

### `GET /api/media/search?q=query`

Search stock media across all providers.

### `GET /api/media/voices`

List available TTS voices.

### WebSocket Events

Connect via Socket.IO, then emit `subscribe` with the `jobId`.

| Event      | Payload                                        |
| ---------- | ---------------------------------------------- |
| `progress` | `{ jobId, step, detail, progress }`            |
| `complete` | `{ jobId, videoUrl, subtitlesUrl, script, duration }` |
| `error`    | `{ jobId, error }`                             |

## Pipeline Flow

```
User Prompt
    │
    ▼
┌─────────────────┐
│  Script Engine   │  LLM generates structured JSON script (20–60 scenes)
└────────┬────────┘
         │
    ▼         ▼
┌────────┐  ┌────────┐
│ Media  │  │  TTS   │  Fetch stock video/images + generate voiceover
│ Fetch  │  │ Engine │  (processed in batches)
└───┬────┘  └───┬────┘
    │           │
    ▼           ▼
┌─────────────────┐
│  Scene Renderer  │  FFmpeg: overlay audio on video + add subtitles
│  (per scene)     │  (scene-by-scene for memory efficiency)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Concatenation   │  FFmpeg concat + optional background music
└────────┬────────┘
         │
         ▼
    Final MP4 + SRT
```

## Features

- **AI Script Generation** — Structured scene-by-scene scripts via OpenAI
- **Multi-source Media** — Pexels video, Pixabay video/images, Unsplash images
- **Text-to-Speech** — 6 voice styles via OpenAI TTS HD
- **FFmpeg Rendering** — Scene-by-scene for memory efficiency
- **Auto Subtitles** — Burned into video + SRT file export
- **Live Progress** — Real-time WebSocket updates
- **720p / 1080p Export** — Selectable resolution
- **Background Music** — Optional mood-based music overlay
- **Modern UI** — Dark theme, CapCut-inspired interface

## Background Music (Optional)

Place MP3 files in `backend/music/` named by mood:

```
backend/music/calm.mp3
backend/music/epic.mp3
backend/music/dark.mp3
backend/music/upbeat.mp3
backend/music/romantic.mp3
```

## Environment Variables

| Variable              | Description                        | Default         |
| --------------------- | ---------------------------------- | --------------- |
| `OPENAI_API_KEY`      | OpenAI API key                     | —               |
| `OPENAI_MODEL`        | LLM model                         | gpt-4o          |
| `PEXELS_API_KEY`      | Pexels API key                     | —               |
| `PIXABAY_API_KEY`     | Pixabay API key                    | —               |
| `UNSPLASH_ACCESS_KEY` | Unsplash access key                | —               |
| `TTS_PROVIDER`        | TTS service                        | openai          |
| `TTS_DEFAULT_VOICE`   | Default voice                      | onyx            |
| `PORT`                | Backend port                       | 3001            |
| `FRONTEND_URL`        | CORS origin                        | http://localhost:5173 |
| `FFMPEG_PATH`         | Custom FFmpeg binary path          | system default  |
| `OUTPUT_DIR`          | Output directory                   | ./output        |
| `MAX_CONCURRENT_RENDERS` | Parallel render limit           | 2               |

## License

MIT
