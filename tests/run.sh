#!/usr/bin/env bash
# Headless smoke suites: bundle each tests/*.test.ts with rolldown, run under node.
# These live outside both tsconfig projects — rolldown strips types, node runs them.
set -euo pipefail
cd "$(dirname "$0")/.."

out="node_modules/.tmp/tests"
mkdir -p "$out"

for t in tests/*.test.ts; do
  name="$(basename "$t" .test.ts)"
  node_modules/.bin/rolldown "$t" --file "$out/$name.mjs" --platform node > /dev/null
  node "$out/$name.mjs"
done
echo "── all test suites passed ──"
