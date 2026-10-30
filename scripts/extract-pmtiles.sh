#!/usr/bin/env bash
set -euo pipefail

# RouteX PMTiles extraction script
# Extracts regional and national overview vector map slices from Protomaps daily builds.

if [ $# -lt 1 ]; then
  echo "Usage: $0 <PROTOMAPS_BUILD_URL>"
  echo "Example: $0 https://build.protomaps.com/20261030.pmtiles"
  exit 1
fi

INPUT_URL="$1"
OUTPUT_DIR="public/maps"

if ! command -v pmtiles &> /dev/null; then
  echo "Error: 'pmtiles' CLI not found."
  echo "Please install pmtiles (go-pmtiles release for Mac ARM):"
  echo "  https://github.com/protomaps/go-pmtiles/releases"
  echo "or install via homebrew / go install."
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "=== Extracting Himalaya region (Himachal, Uttarakhand, J&K / Ladakh south) ==="
echo "Bbox: 74, 28.5, 81, 37 | Maxzoom: 12"
pmtiles extract "$INPUT_URL" "$OUTPUT_DIR/himalaya.pmtiles" --bbox=74,28.5,81,37 --maxzoom=12

echo "=== Extracting Northeast India region ==="
echo "Bbox: 87.5, 21.5, 97.5, 29.5 | Maxzoom: 12"
pmtiles extract "$INPUT_URL" "$OUTPUT_DIR/northeast.pmtiles" --bbox=87.5,21.5,97.5,29.5 --maxzoom=12

echo "=== Extracting India overview ==="
echo "Bbox: 68, 6, 98, 38 | Maxzoom: 8"
pmtiles extract "$INPUT_URL" "$OUTPUT_DIR/india-overview.pmtiles" --bbox=68,6,98,38 --maxzoom=8

echo ""
echo "=== PMTiles Extraction Complete ==="
echo "Extracted files in $OUTPUT_DIR:"
ls -lh "$OUTPUT_DIR"/*.pmtiles

