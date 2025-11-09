#!/bin/bash

echo "Logging in to get token..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finaster.com","password":"admin123"}' | grep -o '"token":"[^"]*' | sed 's/"token":"//')

echo "Token: ${TOKEN:0:50}..."
echo ""

echo "================================================================================"
echo "1. Team Endpoint"
echo "================================================================================"
curl -s "http://localhost:3001/api/team?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null | head -20
echo ""

echo "================================================================================"
echo "2. Binary Tree Endpoint"
echo "================================================================================"
curl -s "http://localhost:3001/api/binary/tree?userId=00000000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null | head -20
echo ""

echo "================================================================================"
echo "3. Wallet Balance Endpoint"
echo "================================================================================"
curl -s "http://localhost:3001/api/wallet/balance" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null
echo ""

echo "================================================================================"
echo "4. Packages Endpoint"
echo "================================================================================"
curl -s "http://localhost:3001/api/packages" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null | head -25
echo ""

echo "================================================================================"
echo "5. Admin Dashboard"
echo "================================================================================"
curl -s "http://localhost:3001/api/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null | head -25
echo ""

echo "================================================================================"
echo "6. Genealogy Tree"
echo "================================================================================"
curl -s "http://localhost:3001/api/genealogy/tree" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null | head -20
echo ""

echo "================================================================================"
echo "7. Transactions"
echo "================================================================================"
curl -s "http://localhost:3001/api/transactions?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null | head -20
echo ""

echo "================================================================================"
echo "8. Rewards Data"
echo "================================================================================"
curl -s "http://localhost:3001/api/rewards/user" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null | head -20
echo ""

echo "================================================================================"
echo "ALL ENDPOINT TESTS COMPLETE"
echo "================================================================================"
