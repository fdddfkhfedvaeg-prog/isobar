#!/usr/bin/env bash
# Launch Lexicon NL: ./start.sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 serve.py "$@"
elif command -v python >/dev/null 2>&1; then
  exec python serve.py "$@"
elif command -v npx >/dev/null 2>&1; then
  echo "Python not found — falling back to npx serve on http://localhost:8765"
  exec npx --yes serve -l 8765 .
else
  echo "Need Python 3 or Node.js. Alternatively just open index.html (works offline via data/lexicon.js)."
  exit 1
fi
