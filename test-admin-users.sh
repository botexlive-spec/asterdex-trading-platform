#!/bin/bash

echo "Testing admin users endpoint..."

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finaster.com","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:50}..."
echo ""

# Test users endpoint
echo "Calling /api/admin/users..."
curl -s "http://localhost:3001/api/admin/users?limit=5" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null
