FROM node:22-slim

# Install FFmpeg, Python3 and pip
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install --break-system-packages edge-tts Pillow

WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Create output directory with proper permissions
RUN mkdir -p ./output && chmod 777 ./output

# HF Spaces uses port 7860 by default
ENV PORT=7860
EXPOSE 7860

CMD ["node", "src/index.js"]
