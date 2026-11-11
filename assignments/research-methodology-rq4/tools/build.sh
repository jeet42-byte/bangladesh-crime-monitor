#!/usr/bin/env bash
# Regenerate charts and all Word documents from data/study.json and papers/*.md
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/charts.py
node tools/build_docx.js
# drop ZIP folder entries (some cloud editors reject them)
for f in output/*.docx; do zip -d "$f" '*/' >/dev/null 2>&1 || true; done
