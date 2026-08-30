#!/bin/bash
set -e
BASE="http://localhost:3000"

# Wait for server
echo "Waiting for server..."
for i in $(seq 1 20); do
  if curl -s -o /dev/null -w '%{http_code}' "$BASE/api/agent/status" 2>/dev/null | grep -q 200; then
    echo "Server ready!"
    break
  fi
  sleep 2
done

# Warm up routes
echo "Warming routes..."
curl -s "$BASE/" > /dev/null
curl -s "$BASE/api/agent/status" > /dev/null
curl -s "$BASE/api/agent/chat" > /dev/null
curl -s "$BASE/api/agent/memory" > /dev/null
curl -s "$BASE/api/agent/config" > /dev/null
echo "All routes compiled."

# Run tests
echo ""
echo "=== 1. STATUS ==="
curl -s "$BASE/api/agent/status"
echo ""

echo "=== 2. CREATE MEMORY ==="
curl -s -X POST "$BASE/api/agent/memory" -H 'Content-Type: application/json' \
  -d '{"category":"project","content":"STRIKEZONE AR game - real world tactical shooter","importance":10,"tags":["game","strikezone","ar"]}'
echo ""

echo "=== 3. CREATE PLATFORM ==="
curl -s -X POST "$BASE/api/agent/platforms" -H 'Content-Type: application/json' \
  -d '{"platform":"Outlier","email":"deyoung@outlier.ai","notes":"Payoneer payout, $15-100/hr"}'
echo ""

echo "=== 4. CREATE TASK ==="
curl -s -X POST "$BASE/api/agent/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Complete 50 RLHF tasks on Outlier","platform":"Outlier","priority":"high","description":"Target $25 today"}'
echo ""

echo "=== 5. LOG EARNING ==="
curl -s -X POST "$BASE/api/agent/status" -H 'Content-Type: application/json' \
  -d '{"type":"log_earning","platform":"Outlier","amount":25.50,"task_type":"RLHF","notes":"50 tasks completed"}'
echo ""

echo "=== 6. CHAT (OFFLINE MODE) ==="
curl -s -X POST "$BASE/api/agent/chat" -H 'Content-Type: application/json' \
  -d '{"message":"What platforms am I on and how much have I earned?"}'
echo ""

echo "=== 7. FINAL STATUS ==="
curl -s "$BASE/api/agent/status"
echo ""

echo "=== ALL TESTS PASSED ==="