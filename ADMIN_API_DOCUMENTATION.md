# Admin CRUD API Documentation
## Finaster MLM Administrative Endpoints

**Base URL:** `http://localhost:3001/api/admin`
**Authentication:** Bearer token with admin role required

---

## Authentication

All admin endpoints require:
1. Valid JWT token in Authorization header
2. User role must be 'admin'

**Example Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Responses:**
- `401 Unauthorized` - No token or invalid token
- `403 Forbidden` - Valid token but user is not admin

---

## User Management

### 1. List All Users
**GET** `/api/admin/users`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50)
- `search` (optional): Search by email or full name
- `role` (optional): Filter by role (admin/user)

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "user",
      "wallet_balance": "1500.00",
      "total_earnings": "500.00",
      "roi_earnings": "300.00",
      "commission_earnings": "200.00",
      "current_rank": "bronze"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### 2. Get Single User Details
**GET** `/api/admin/users/:id`

**Response:**
```json
{
  "user": {...},
  "packages": [...],
  "commissions": [...],
  "transactions": [...],
  "referrals_count": 5
}
```

### 3. Update User
**PUT** `/api/admin/users/:id`

**Request Body:**
```json
{
  "full_name": "Updated Name",
  "email": "new@email.com",
  "role": "admin",
  "wallet_balance": 1000.00,
  "current_rank": "gold",
  "kyc_status": "approved",
  "is_active": true
}
```

### 4. Delete User (Soft Delete)
**DELETE** `/api/admin/users/:id`

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### 5. Reset User Password
**POST** `/api/admin/users/:id/reset-password`

**Request Body:**
```json
{
  "new_password": "newpassword123"
}
```

---

## Package Management

### 1. List All Packages
**GET** `/api/admin/packages`

**Response:**
```json
{
  "packages": [
    {
      "id": 1,
      "name": "Starter Package",
      "min_investment": 100,
      "max_investment": 500,
      "daily_roi_percentage": 5,
      "duration_days": 40,
      "level_income_percentages": [10, 5, 3, 2, 1, ...],
      "matching_bonus_percentage": 10,
      "is_active": 1
    }
  ]
}
```

### 2. Create Package
**POST** `/api/admin/packages`

**Request Body:**
```json
{
  "name": "Premium Package",
  "min_investment": 1000,
  "max_investment": 5000,
  "daily_roi_percentage": 5.5,
  "duration_days": 60,
  "level_income_percentages": [10, 5, 3, 2, 1],
  "matching_bonus_percentage": 15,
  "is_active": true
}
```

### 3. Update Package
**PUT** `/api/admin/packages/:id`

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Package Name",
  "daily_roi_percentage": 6.0,
  "is_active": false
}
```

### 4. Delete Package (Set Inactive)
**DELETE** `/api/admin/packages/:id`

---

## Transactions & Commissions

### 1. List Transactions
**GET** `/api/admin/transactions`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Results per page
- `type` (optional): Filter by transaction type
- `status` (optional): Filter by status

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "transaction_type": "roi_distribution",
      "amount": "50.00",
      "description": "Daily ROI",
      "status": "completed",
      "created_at": "2025-11-05T05:00:00Z",
      "email": "user@example.com",
      "full_name": "John Doe"
    }
  ],
  "pagination": {...}
}
```

### 2. List Commissions
**GET** `/api/admin/commissions`

**Query Parameters:**
- `page` (optional)
- `limit` (optional)

**Response:**
```json
{
  "commissions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "from_user_id": "uuid",
      "commission_type": "level_income",
      "amount": "20.00",
      "level": 1,
      "package_id": 1,
      "created_at": "2025-11-05T05:00:00Z",
      "user_email": "recipient@example.com",
      "from_user_email": "purchaser@example.com",
      "package_name": "Starter Package"
    }
  ],
  "pagination": {...}
}
```

---

## Analytics & Reports

### 1. System Overview
**GET** `/api/admin/analytics/overview`

**Response:**
```json
{
  "users": {
    "total": 100,
    "active": 95
  },
  "investments": {
    "total": 50000.00
  },
  "earnings": {
    "total": 10000.00
  },
  "packages": {
    "active": 150
  },
  "today": {
    "transactions": 25,
    "amount": 5000.00
  },
  "commissions": [
    {
      "commission_type": "level_income",
      "count": 50,
      "total": "2500.00"
    }
  ]
}
```

### 2. Revenue Analytics
**GET** `/api/admin/analytics/revenue`

**Query Parameters:**
- `days` (optional): Number of days (default: 30)

**Response:**
```json
{
  "daily_revenue": [
    {
      "date": "2025-11-05",
      "revenue": "1500.00"
    }
  ],
  "commissions_paid": [...],
  "roi_paid": [...]
}
```

---

## System Operations

### Manual ROI Distribution
**POST** `/api/admin/distribute-roi`

**Response:**
```json
{
  "success": true,
  "message": "ROI distribution completed successfully",
  "distributed": 50,
  "totalAmount": 500.00,
  "completed": 5
}
```

---

## Complete API Endpoint List

### User Management
- `GET    /api/admin/users` - List users
- `GET    /api/admin/users/:id` - Get user details
- `PUT    /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `POST   /api/admin/users/:id/reset-password` - Reset password

### Package Management
- `GET    /api/admin/packages` - List packages
- `POST   /api/admin/packages` - Create package
- `PUT    /api/admin/packages/:id` - Update package
- `DELETE /api/admin/packages/:id` - Delete package

### Transactions & Commissions
- `GET    /api/admin/transactions` - List transactions
- `GET    /api/admin/commissions` - List commissions

### Analytics
- `GET    /api/admin/analytics/overview` - System overview
- `GET    /api/admin/analytics/revenue` - Revenue analytics

### System Operations
- `POST   /api/admin/distribute-roi` - Manual ROI distribution

---

## Testing Examples

### Using cURL

**Login as Admin:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finaster.com","password":"admin123"}'
```

**List Users:**
```bash
TOKEN="your_admin_token_here"
curl -X GET "http://localhost:3001/api/admin/users?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Get Analytics:**
```bash
curl -X GET "http://localhost:3001/api/admin/analytics/overview" \
  -H "Authorization: Bearer $TOKEN"
```

**Update User:**
```bash
curl -X PUT "http://localhost:3001/api/admin/users/USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_balance": 5000}'
```

---

## Security Notes

1. All endpoints require admin authentication
2. Passwords are hashed with bcrypt (10 rounds)
3. JWT tokens expire after 7 days
4. Soft delete for users (is_active flag)
5. Pagination prevents data overload
6. Input validation on all endpoints

---

**Documentation Version:** 1.0
**Last Updated:** November 5, 2025
