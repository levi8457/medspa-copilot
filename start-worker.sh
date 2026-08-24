#!/bin/bash
set -euo pipefail

cd /opt/medspa-copilot
pkill -f 'src/workers/start.ts' 2>/dev/null || true
sleep 1
nohup pnpm exec tsx --env-file=.env src/workers/start.ts >> /tmp/medspa-worker.log 2>&1 &
echo "worker launched pid $!"
