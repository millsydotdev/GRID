#!/usr/bin/env bash
set -euo pipefail

echo "[GRID] macOS: ensuring Homebrew..."
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi

echo "[GRID] Installing/upgrading Ollama via Homebrew..."
brew install ollama >/dev/null 2>&1 || brew upgrade ollama >/dev/null 2>&1 || true

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

