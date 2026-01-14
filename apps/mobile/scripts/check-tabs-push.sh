#!/usr/bin/env bash
set -euo pipefail

if rg -n "router\.push\([\"']\/\(tabs\)\/" apps/mobile/app apps/mobile/src 2>/dev/null; then
  echo "ERROR: Do not use router.push() for tab routes. Use goTab() instead."
  exit 1
fi

echo "OK: No router.push() used for tab routes."
