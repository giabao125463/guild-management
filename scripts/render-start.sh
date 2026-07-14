#!/usr/bin/env sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node "$ROOT/node_modules/prisma/build/index.js" migrate deploy --schema "$ROOT/apps/api/prisma/schema.prisma"
exec node "$ROOT/apps/api/dist/main.js"
