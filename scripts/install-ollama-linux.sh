#!/usr/bin/env bash
set -euo pipefail

echo "[GRID] Linux: installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

echo "[GRID] Starting Ollama service..."
(ollama serve >/dev/null 2>&1 &) || true
sleep 2

echo "[GRID] Health check..."
if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "[GRID] Ollama is running."
else
  echo "[GRID] Ollama API not reachable yet."
fi

echo "[GRID] Done."

