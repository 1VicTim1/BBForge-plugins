#!/usr/bin/env bash
# Packs every folder in packages/ into dist/<id>-<version>.zip, signs it and rebuilds index.json.
#   BBFORGE_PACK         path to bbforge-pack (default: from PATH)
#   BBFORGE_SIGNING_KEY  signing key (default: ~/.config/bbforge/signing-key.json); "none" packs unsigned
set -euo pipefail
cd "$(dirname "$0")"
pack=${BBFORGE_PACK:-$(command -v bbforge-pack || true)}
if [[ -z "$pack" ]]; then
  echo "bbforge-pack не найден: cargo install --path <BBForge>/crates/bbforge-pack или укажите BBFORGE_PACK" >&2
  exit 1
fi
key=${BBFORGE_SIGNING_KEY:-$HOME/.config/bbforge/signing-key.json}
sign=()
if [[ "$key" != none ]]; then sign=(--key "$key"); fi
mkdir -p dist
for dir in packages/*/; do
  "$pack" pack "$dir" --out dist "${sign[@]}"
done
"$pack" index dist --out index.json --prefix dist
