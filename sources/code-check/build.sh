#!/usr/bin/env bash
# Builds packages/code-check/main.js: acorn (MIT, see LICENSE-acorn.txt) + checks.js.
set -euo pipefail
cd "$(dirname "$0")"
out=../../packages/code-check
mkdir -p "$out"
{
  echo "// Сгенерировано sources/code-check/build.sh — правьте checks.js."
  echo "const acorn = (() => { const exports = {}; const module = { exports };"
  cat vendor-acorn.js
  echo "return exports; })();"
  cat checks.js
} > "$out/main.js"
cp LICENSE-acorn.txt "$out/LICENSE-acorn.txt"
