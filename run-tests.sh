#!/bin/bash

# SmarpStream Regression Test Runner
# This script helps verify basic functionality

echo "=========================================="
echo "SmarpStream Regression Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test 1: Check if server is running
echo "Test 1: Checking if server is running..."
if curl -s http://localhost:5001/api/deployment-time > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - Server is running"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Server is not running on port 5001"
    echo "  Please start the server with: npm start"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Check if build exists
echo "Test 2: Checking if client build exists..."
if [ -d "client/build" ] && [ -f "client/build/index.html" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Client build exists"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Client build not found"
    echo "  Please run: npm run build"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Check if required files exist
echo "Test 3: Checking required files..."
REQUIRED_FILES=(
    "server/index.js"
    "client/src/App.tsx"
    "client/src/App.css"
    "server/session-names.js"
    "package.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file (MISSING)"
        FAILED=$((FAILED + 1))
    fi
done

if [ $FAILED -eq 0 ]; then
    PASSED=$((PASSED + 1))
fi
echo ""

# Test 4: Check for critical code patterns
echo "Test 4: Checking critical code patterns..."

# Check if chat history is stored in session
if grep -q "messages.*\[\]" server/index.js && grep -q "session.messages" server/index.js; then
    echo -e "  ${GREEN}✓${NC} Chat history storage implemented"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗${NC} Chat history storage not found"
    FAILED=$((FAILED + 1))
fi

# Check if disconnect confirmation exists
if grep -q "showConfirmModal" client/src/App.tsx && grep -q "ConfirmModal" client/src/App.tsx; then
    echo -e "  ${GREEN}✓${NC} Disconnect confirmation modal exists"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗${NC} Disconnect confirmation modal not found"
    FAILED=$((FAILED + 1))
fi

# Check if session-joined handler exists for chat history
if grep -q "session-joined" client/src/App.tsx; then
    echo -e "  ${GREEN}✓${NC} Session-joined handler exists"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗${NC} Session-joined handler not found"
    FAILED=$((FAILED + 1))
fi

# Check if video element creation has proper error handling
if grep -q "oncanplay\|onloadedmetadata" client/src/App.tsx; then
    echo -e "  ${GREEN}✓${NC} Video element event handlers exist"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗${NC} Video element event handlers not found"
    FAILED=$((FAILED + 1))
fi

# Check if audio tracks are enabled
if grep -q "track.enabled.*true" client/src/App.tsx && grep -q "getAudioTracks" client/src/App.tsx; then
    echo -e "  ${GREEN}✓${NC} Audio track enabling logic exists"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗${NC} Audio track enabling logic not found"
    FAILED=$((FAILED + 1))
fi

# Check if file input reset exists
if grep -q "fileInputRef\|e.target.value.*=.*''" client/src/App.tsx; then
    echo -e "  ${GREEN}✓${NC} File input reset logic exists"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗${NC} File input reset logic not found"
    FAILED=$((FAILED + 1))
fi

# Check if reconnection cleanup exists
if grep -q "user-left\|user-joined" client/src/App.tsx && grep -q "removeChild\|remove()" client/src/App.tsx; then
    echo -e "  ${GREEN}✓${NC} Reconnection cleanup logic exists"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗${NC} Reconnection cleanup logic not found"
    FAILED=$((FAILED + 1))
fi

echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Failed: $FAILED${NC}"
fi

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}All automated tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run manual tests from REGRESSION_TESTS.md"
    echo "2. Test on multiple browsers (Chrome, Firefox, Safari, Edge)"
    echo "3. Test on mobile devices (iOS and Android)"
    exit 0
else
    echo ""
    echo -e "${YELLOW}Some automated tests failed.${NC}"
    echo "Please review the failures above and fix them before proceeding."
    exit 1
fi

