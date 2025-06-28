#!/bin/bash

# Food Coop API Test Script
# This script tests all the main API endpoints

BASE_URL="http://localhost:3000"
TOKEN=""

echo "🧪 Testing Food Coop API Endpoints"
echo "=================================="

# Test 1: Health Check
echo -e "\n1️⃣ Testing Health Check..."
curl -s "$BASE_URL/health" | jq '.'

# Test 2: Register a new user
echo -e "\n2️⃣ Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }')

echo "$REGISTER_RESPONSE" | jq '.'

# Extract token from registration response
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token from registration"
    exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."

# Test 3: Login
echo -e "\n3️⃣ Testing User Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

# Update token from login response
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

# Test 4: Get user profile (requires auth)
echo -e "\n4️⃣ Testing Get User Profile..."
curl -s "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Test 5: Get user settings
echo -e "\n5️⃣ Testing Get User Settings..."
curl -s "$BASE_URL/api/users/settings" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Test 6: Update user settings
echo -e "\n6️⃣ Testing Update User Settings..."
curl -s -X PUT "$BASE_URL/api/users/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailNotifications": true,
    "checkFrequency": "10min",
    "timezone": "America/New_York"
  }' | jq '.'

# Test 7: Create shift preference
echo -e "\n7️⃣ Testing Create Shift Preference..."
curl -s -X POST "$BASE_URL/api/shifts/preferences" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shiftType": "STOCKING",
    "days": ["Monday", "Wednesday"],
    "timeRangeStart": "17:00",
    "timeRangeEnd": "22:00"
  }' | jq '.'

# Test 8: Get shift preferences
echo -e "\n8️⃣ Testing Get Shift Preferences..."
curl -s "$BASE_URL/api/shifts/preferences" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Test 9: Get available shifts
echo -e "\n9️⃣ Testing Get Available Shifts..."
curl -s "$BASE_URL/api/shifts/available" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Test 10: Update user profile
echo -e "\n🔟 Testing Update User Profile..."
curl -s -X PUT "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test User",
    "notificationEmail": "updated@example.com"
  }' | jq '.'

# Test 11: Get notifications
echo -e "\n1️⃣1️⃣ Testing Get Notifications..."
curl -s "$BASE_URL/api/users/notifications" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Test 12: Test 404 route
echo -e "\n1️⃣2️⃣ Testing 404 Route..."
curl -s "$BASE_URL/doesnotexist" | jq '.'

echo -e "\n✅ API Testing Complete!"
echo "All endpoints have been tested with authentication flow." 