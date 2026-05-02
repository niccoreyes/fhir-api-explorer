#!/bin/bash
# FAHLA 2026 Workshop Platform - Curl Tests

echo "================================"
echo "FAHLA Workshop Platform Tests"
echo "================================"
echo ""

BASE_URL="http://localhost:8080"

# Test 1: Entry page loads
echo "Test 1: Entry page loads"
curl -s $BASE_URL | grep -q "Aklan FHIR"
if [ $? -eq 0 ]; then
    echo "✅ Entry page accessible"
else
    echo "❌ Entry page failed"
fi
echo ""

# Test 2: CSS file loads
echo "Test 2: CSS file loads"
CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/css/workshop.css)
if [ "$CSS_STATUS" = "200" ]; then
    echo "✅ CSS file accessible (status: $CSS_STATUS)"
else
    echo "❌ CSS file failed (status: $CSS_STATUS)"
fi
echo ""

# Test 3: Workshop config JS loads
echo "Test 3: Workshop config JS loads"
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/js/workshop-config.js)
if [ "$JS_STATUS" = "200" ]; then
    echo "✅ Workshop config accessible (status: $JS_STATUS)"
else
    echo "❌ Workshop config failed (status: $JS_STATUS)"
fi
echo ""

# Test 4: Sync manager JS loads
echo "Test 4: Sync manager JS loads"
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/js/workshop-sync.js)
if [ "$JS_STATUS" = "200" ]; then
    echo "✅ Sync manager accessible (status: $JS_STATUS)"
else
    echo "❌ Sync manager failed (status: $JS_STATUS)"
fi
echo ""

# Test 5: Workshop app JS loads
echo "Test 5: Workshop app JS loads"
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/js/workshop-app.js)
if [ "$JS_STATUS" = "200" ]; then
    echo "✅ Workshop app accessible (status: $JS_STATUS)"
else
    echo "❌ Workshop app failed (status: $JS_STATUS)"
fi
echo ""

# Test 6: Check for key workshop elements
echo "Test 6: Check for key workshop elements"
HTML=$(curl -s $BASE_URL)
if echo "$HTML" | grep -q "caseSelection"; then
    echo "✅ Case selection found"
else
    echo "❌ Case selection not found"
fi

if echo "$HTML" | grep -q "workshopApp"; then
    echo "✅ Workshop app container found"
else
    echo "❌ Workshop app container not found"
fi

if echo "$HTML" | grep -q "clinicianView"; then
    echo "✅ Clinician view found"
else
    echo "❌ Clinician view not found"
fi

if echo "$HTML" | grep -q "developerView"; then
    echo "✅ Developer view found"
else
    echo "❌ Developer view not found"
fi

if echo "$HTML" | grep -q "architectureView"; then
    echo "✅ Architecture view found"
else
    echo "❌ Architecture view not found"
fi

if echo "$HTML" | grep -q "facilitatorView"; then
    echo "✅ Facilitator view found"
else
    echo "❌ Facilitator view not found"
fi
echo ""

# Test 7: Check for case cards
echo "Test 7: Check for case cards"
if echo "$HTML" | grep -q 'data-case="case1"'; then
    echo "✅ Case 1 card found"
else
    echo "❌ Case 1 card not found"
fi

if echo "$HTML" | grep -q 'data-case="case2"'; then
    echo "✅ Case 2 card found"
else
    echo "❌ Case 2 card not found"
fi
echo ""

# Test 8: Check for view tabs
echo "Test 8: Check for view tabs"
if echo "$HTML" | grep -q 'data-view="clinician"'; then
    echo "✅ Clinician tab found"
else
    echo "❌ Clinician tab not found"
fi

if echo "$HTML" | grep -q 'data-view="developer"'; then
    echo "✅ Developer tab found"
else
    echo "❌ Developer tab not found"
fi

if echo "$HTML" | grep -q 'data-view="architecture"'; then
    echo "✅ Architecture tab found"
else
    echo "❌ Architecture tab not found"
fi

if echo "$HTML" | grep -q 'data-view="facilitator"'; then
    echo "✅ Facilitator tab found"
else
    echo "❌ Facilitator tab not found"
fi
echo ""

echo "================================"
echo "Curl tests complete!"
echo "================================"
