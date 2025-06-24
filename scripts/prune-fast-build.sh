#!/usr/bin/env bash
# Temporary script for testing
# Delete everything *after* the cut-off items so the build finishes in ~20 min.

set -euo pipefail

# albums (YAML files)
find "$HSMUSIC_DATA/album" -type f -name '*.yaml'          \
  | sort | awk '/ad-astra.yaml/ {exit} {print}' \
  | xargs --no-run-if-empty rm -f

# album-art folders
find "$HSMUSIC_MEDIA/album-art" -maxdepth 1 -mindepth 1 -type d \
  | sort | awk '/ad-astra$/ {exit} NR>1 {print}' \
  | xargs --no-run-if-empty rm -rf

# album-additional folders
find "$HSMUSIC_MEDIA/album-additional" -maxdepth 1 -mindepth 1 -type d \
  | sort | awk '/act-8-volume-1$/ {exit} NR>1 {print}' \
  | xargs --no-run-if-empty rm -rf
