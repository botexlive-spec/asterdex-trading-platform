# Team/Referral API Routes Documentation

## Overview
The Team API provides comprehensive endpoints for managing and querying team hierarchies in an MLM (Multi-Level Marketing) system. All routes use MySQL recursive CTEs (Common Table Expressions) to efficiently traverse the team tree up to 30 levels deep.

## Base URL
```
/api/team
```

## Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. GET /api/team/members
Get all team members with level-wise breakdown.

**Description:** Returns complete team hierarchy with detailed member information and aggregated statistics by level.

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "summary": {
    "direct_members": 5,
    "total_team": 45,
    "total_active": 38,
    "total_inactive": 7,
    "total_investment": 125000.00,
    "total_earnings": 45000.00,
    "total_withdrawal": 12000.00,
    "total_wallet_balance": 33000.00,
    "max_depth": 8
  },
  "levels": [
    {
      "level": 1,
      "count": 5,
      "active": 5,
      "inactive": 0,
      "total_investment": 25000.00,
      "total_earnings": 8000.00,
      "total_withdrawal": 2000.00,
      "total_wallet_balance": 6000.00
    },
    // ... more levels
  ],
  "members": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "sponsor_id": "sponsor_uuid",
      "referral_code": "REF12345",
      "wallet_balance": 5000.00,
      "total_earnings": 2500.00,
      "total_investment": 10000.00,
      "total_withdrawal": 1000.00,
      "current_rank": "silver",
      "left_volume": 50000.00,
      "right_volume": 45000.00,
      "phone_number": "+1234567890",
      "country": "US",
      "kyc_status": "approved",
      "email_verified": true,
      "is_active": true,
      "role": "user",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-20T14:25:00.000Z",
      "level": 1
    },
    // ... more members
  ]
}
```

**SQL Implementation:**
Uses recursive CTE with the following structure:
```sql
WITH RECURSIVE team_tree AS (
  -- Base case: direct referrals (level 1)
  SELECT *, 1 as level FROM users WHERE sponsor_id = ?

  UNION ALL

  -- Recursive case: children at each level
  SELECT u.*, tt.level + 1
  FROM users u
  INNER JOIN team_tree tt ON u.sponsor_id = tt.id
  WHERE tt.level < 30
)
SELECT * FROM team_tree ORDER BY level ASC, created_at ASC
```

---

### 2. GET /api/team/direct
Get only direct referrals (Level 1).

**Description:** Returns first-level referrals with comprehensive details and summary statistics.

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "count": 5,
  "summary": {
    "total_count": 5,
    "active_count": 5,
    "inactive_count": 0,
    "total_investment": 25000.00,
    "total_earnings": 8000.00
  },
  "members": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Jane Smith",
      "sponsor_id": "sponsor_uuid",
      "referral_code": "REF67890",
      "wallet_balance": 3000.00,
      "total_earnings": 1500.00,
      "total_investment": 5000.00,
      "total_withdrawal": 500.00,
      "current_rank": "bronze",
      "left_volume": 10000.00,
      "right_volume": 8000.00,
      "phone_number": "+1234567891",
      "country": "CA",
      "kyc_status": "pending",
      "email_verified": true,
      "is_active": true,
      "role": "user",
      "created_at": "2024-02-01T09:15:00.000Z",
      "updated_at": "2024-02-05T11:30:00.000Z"
    }
  ]
}
```

---

### 3. GET /api/team/stats
Get comprehensive team statistics summary.

**Description:** Returns aggregated statistics for entire team hierarchy without member details.

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "direct_members": 5,
  "total_team": 45,
  "total_active": 38,
  "total_inactive": 7,
  "team_investment": 125000.00,
  "team_earnings": 45000.00,
  "team_withdrawal": 12000.00,
  "team_wallet_balance": 33000.00,
  "max_depth": 8
}
```

**SQL Implementation:**
Uses recursive CTE with aggregate functions:
```sql
WITH RECURSIVE team_tree AS (
  -- Build complete hierarchy
  ...
)
SELECT
  COUNT(*) as total_count,
  SUM(CASE WHEN level = 1 THEN 1 ELSE 0 END) as direct_count,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
  COALESCE(SUM(total_investment), 0) as total_investment,
  -- ... more aggregates
  MAX(level) as max_depth
FROM team_tree
```

---

### 4. GET /api/team/level/:level
Get members at a specific level.

**Description:** Returns all team members at a specific hierarchy level (1-30).

**URL Parameters:**
- `level` (required): Integer between 1 and 30

**Example Request:**
```
GET /api/team/level/3
```

**Response:**
```json
{
  "success": true,
  "level": 3,
  "count": 12,
  "summary": {
    "total_count": 12,
    "active_count": 10,
    "inactive_count": 2,
    "total_investment": 35000.00,
    "total_earnings": 12000.00
  },
  "members": [
    {
      "id": "uuid",
      "email": "level3user@example.com",
      "full_name": "Mike Johnson",
      "sponsor_id": "level2_sponsor_uuid",
      "referral_code": "REF34567",
      "wallet_balance": 2500.00,
      "total_earnings": 1200.00,
      "total_investment": 4000.00,
      "total_withdrawal": 300.00,
      "current_rank": "starter",
      "left_volume": 5000.00,
      "right_volume": 4500.00,
      "phone_number": "+1234567892",
      "country": "UK",
      "kyc_status": "approved",
      "email_verified": true,
      "is_active": true,
      "role": "user",
      "created_at": "2024-03-10T14:20:00.000Z",
      "updated_at": "2024-03-15T16:45:00.000Z",
      "level": 3
    }
  ]
}
```

**Error Response (Invalid Level):**
```json
{
  "error": "Invalid level parameter",
  "message": "Level must be a number between 1 and 30"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```
or
```json
{
  "error": "Invalid token"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid level parameter",
  "message": "Level must be a number between 1 and 30"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch team members",
  "message": "Detailed error message (development only)"
}
```

---

## Data Fields Description

### User/Member Fields
- `id`: Unique user identifier (UUID)
- `email`: User's email address
- `full_name`: User's full name
- `sponsor_id`: ID of the user who referred this member
- `referral_code`: Unique referral code for this user
- `wallet_balance`: Current wallet balance (DECIMAL 15,2)
- `total_earnings`: Cumulative earnings (DECIMAL 15,2)
- `total_investment`: Total amount invested (DECIMAL 15,2)
- `total_withdrawal`: Total amount withdrawn (DECIMAL 15,2)
- `current_rank`: Current MLM rank (e.g., starter, bronze, silver, gold)
- `left_volume`: Binary tree left leg volume (DECIMAL 15,2)
- `right_volume`: Binary tree right leg volume (DECIMAL 15,2)
- `phone_number`: Contact phone number
- `country`: Country code
- `kyc_status`: KYC verification status (not_submitted, pending, approved, rejected)
- `email_verified`: Email verification status (boolean)
- `is_active`: Account active status (boolean)
- `role`: User role (user, admin)
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `level`: Hierarchy level/depth (1-30)

---

## Technical Implementation Details

### Recursive CTE Architecture
All endpoints use MySQL's `WITH RECURSIVE` feature to efficiently query hierarchical data:

1. **Base Case**: Selects direct referrals (level 1)
2. **Recursive Case**: Joins each level's members to find their children
3. **Termination**: Stops at level 30 to prevent infinite recursion

### Performance Considerations
- Queries are optimized with proper indexing on `sponsor_id`
- CAST operations ensure consistent decimal precision
- Level limiting (30 levels max) prevents performance degradation
- Connection pooling handles concurrent requests efficiently

### Database Schema Requirements
Required columns in `users` table:
- `id` (PRIMARY KEY)
- `sponsor_id` (FOREIGN KEY to users.id, indexed)
- `email`, `full_name`, `referral_code`
- `wallet_balance`, `total_earnings`, `total_investment`, `total_withdrawal`
- `current_rank`, `left_volume`, `right_volume`
- `phone_number`, `country`, `kyc_status`
- `email_verified`, `is_active`, `role`
- `created_at`, `updated_at`

---

## Usage Examples

### JavaScript/TypeScript (Frontend)
```typescript
// Fetch all team members
const response = await fetch('/api/team/members', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log('Total team size:', data.summary.total_team);

// Fetch direct referrals only
const directResponse = await fetch('/api/team/direct', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const directData = await directResponse.json();
console.log('Direct referrals:', directData.count);

// Fetch team statistics
const statsResponse = await fetch('/api/team/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const stats = await statsResponse.json();
console.log('Team investment:', stats.team_investment);

// Fetch level 3 members
const level3Response = await fetch('/api/team/level/3', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const level3Data = await level3Response.json();
console.log('Level 3 members:', level3Data.count);
```

### cURL Examples
```bash
# Get all team members
curl -X GET http://localhost:3001/api/team/members \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get direct referrals
curl -X GET http://localhost:3001/api/team/direct \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get team stats
curl -X GET http://localhost:3001/api/team/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get level 5 members
curl -X GET http://localhost:3001/api/team/level/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Logging
All endpoints include comprehensive logging:
- Request initiation with user ID
- Success confirmations with result counts
- Error logging with stack traces
- Structured log format: `[Team API] <message>`

---

## Security
- JWT authentication required on all endpoints
- User can only access their own team hierarchy
- SQL injection prevented via parameterized queries
- Error messages sanitized in production environment

---

## Version
- API Version: 1.0
- Last Updated: 2025-01-08
- MySQL Version: 8.0+ (requires recursive CTE support)
