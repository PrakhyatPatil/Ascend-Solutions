#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-$HOME/Ascend-Solutions}
STACK_DIR="$ROOT_DIR/infra/livekit-ec2"

if [ ! -f "$STACK_DIR/livekit.yaml" ]; then
  echo "Missing $STACK_DIR/livekit.yaml. Copy livekit.yaml.example and fill values first."
  exit 1
fi

if [ ! -f "$STACK_DIR/.env" ]; then
  echo "Missing $STACK_DIR/.env. Copy .env.example and fill values first."
  exit 1
fi

cd "$STACK_DIR"
docker compose build agent-bridge
docker compose up -d

echo "Stack is up. Check:"
echo "  docker ps"
echo "  curl http://localhost:8080/health"
