#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/Users/anik/dev/auniik/markedown/md-studio"
FRONTEND_DIR="$REPO_ROOT/ui"
STATIC_DIR="$REPO_ROOT/md_studio/static"

printf "Building frontend...\n"
( cd "$FRONTEND_DIR" && npm run build )

printf "Replacing static assets...\n"
rm -rf "$STATIC_DIR"
mkdir -p "$STATIC_DIR"
cp -R "$FRONTEND_DIR/build/client"/* "$STATIC_DIR"/

printf "Starting FastAPI example...\n"
exec python "$REPO_ROOT/examples/fastapi_example.py"
