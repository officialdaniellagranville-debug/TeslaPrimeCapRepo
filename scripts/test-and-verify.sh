#!/bin/bash
# Start server in background, wait, run all tests, report

cd /home/z/my-project
pkill -f 'next' 2>/dev/null
sleep 2

npx next dev -p 3000 -H 0.0.0.0 > /tmp/nx.log 2>&1 &
NXPID=$!

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w '' http://0.0.0.0:3000/api/agent/status 2>/dev/null; then
    break
  fi
  sleep 2
done

PASS=0
FAIL=0

check() {
  local name="$1" result="$2"
  if echo "$result" | grep -q "$3"; then
    echo "PASS: $name"
    PASS=$((PASS+1))
  else
    echo "FAIL: $name - got: $(echo $result | head -c 200)"
    FAIL=$((FAIL+1))
  fi
}

# Test 1: Status
S=$(curl -s http://0.0.0.0:3000/api/agent/status)
check "Status API" "$S" 'NEXUS'
check "Status hasApiKey" "$S" 'false'

# Test 2: Memory CRUD
R=$(curl -s -X POST http://0.0.0.0:3000/api/agent/memory -H 'Content-Type: application/json' -d '{"category":"test","content":"automated test memory","importance":7,"tags":["auto","test"]}')
check "Create Memory" "$R" 'true'

M=$(curl -s http://0.0.0.0:3000/api/agent/memory)
check "Get Memories" "$M" 'automated test memory'

# Test 3: Platform CRUD
R=$(curl -s -X POST http://0.0.0.0:3000/api/agent/platforms -H 'Content-Type: application/json' -d '{"platform":"Mindrift","email":"test@mindrift.com","notes":"Weekly Payoneer"}')
check "Create Platform" "$R" 'true'

P=$(curl -s http://0.0.0.0:3000/api/agent/platforms)
check "Get Platforms" "$P" 'Mindrift'

# Test 4: Task CRUD
R=$(curl -s -X POST http://0.0.0.0:3000/api/agent/tasks -H 'Content-Type: application/json' -d '{"title":"Do 20 writing tasks","platform":"Mindrift","priority":"high"}')
check "Create Task" "$R" 'true'

# Test 5: Log Earning
R=$(curl -s -X POST http://0.0.0.0:3000/api/agent/status -H 'Content-Type: application/json' -d '{"type":"log_earning","platform":"Mindrift","amount":35.00,"task_type":"Writing"}')
check "Log Earning" "$R" 'true'

# Test 6: Chat (offline mode)
R=$(curl -s -X POST http://0.0.0.0:3000/api/agent/chat -H 'Content-Type: application/json' -d '{"message":"how much have I earned and on what platforms?"}')
check "Chat Response" "$R" 'NEXUS'
check "Chat Found Memory" "$R" '35'

# Test 7: Updated Status
S=$(curl -s http://0.0.0.0:3000/api/agent/status)
check "Memory Count" "$S" 'memoryCount'
check "Platform Count" "$S" 'platformCount'
check "Earnings" "$S" 'totalEarned'

# Test 8: Page HTML
H=$(curl -s http://0.0.0.0:3000/)
check "Page HTML" "$H" 'NEXUS'
check "Page Has Manifest" "$H" 'manifest.json'

# Cleanup
echo ""
echo "Results: $PASS passed, $FAIL failed"
kill $NXPID 2>/dev/null