#!/bin/sh
if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
  exit 0
fi
node /workspace/serve-cube.mjs >/tmp/cube-preview.log 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/ && exit 0
  sleep 0.3
done
exit 1
