#!/bin/bash
cd /opt/medspa-copilot
pkill -f 'src/workers/start.ts' 2>/dev/null
sleep 1
nohup npx tsx --env-file=.env src/workers/start.ts >> /tmp/medspa-worker.log 2>&1 &
echo "worker launched pid $!"
