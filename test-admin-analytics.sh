#!/bin/bash

echo "Testing admin analytics endpoint..."

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finaster.com","password":"admin123"}' | grep -o '"token":"[^"]*' | sed 's/"token":"//')

echo "Token: ${TOKEN:0:50}..."
echo ""

# Test analytics endpoint
echo "Calling /api/admin/analytics/overview..."
curl -s http://localhost:3001/api/admin/analytics/overview \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null
