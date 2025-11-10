# COMPLETE FUNCTIONAL TEST MAP — FINASTER MLM PLATFORM (v3.1 PRODUCTION)

**Document Purpose:** Comprehensive QA testing reference for all menus, features, and dashboard cards
**Last Updated:** 2025-11-10
**Platform:** Finaster MLM Web Application
**Tech Stack:** React + TypeScript + MySQL Backend API

---

## TABLE OF CONTENTS

1. [Admin Panel Menu Map](#admin-panel-menu-map)
2. [User Panel Menu Map](#user-panel-menu-map)
3. [Dashboard Cards Reference](#dashboard-cards-reference)
4. [API Endpoint Summary](#api-endpoint-summary)
5. [Testing Priority Matrix](#testing-priority-matrix)
6. [Mobile Testing Notes](#mobile-testing-notes)
7. [Key Test Scenarios](#key-test-scenarios)

---

## ADMIN PANEL MENU MAP

### 1. Admin Dashboard
- **Icon:** 📊
- **Route:** `/admin/dashboard`
- **File:** `app/pages/admin/AdminDashboard.tsx`
- **Purpose:** Overview of platform statistics, user growth, financial metrics, recent activities
- **Key Features:**
  - Total users count card
  - Active users count card
  - Total investment card
  - Total earnings card
  - User growth chart (last 30 days)
  - Recent user registrations table
  - Financial summary widgets
- **API Dependencies:**
  - `GET /api/admin/dashboard/stats`
  - `GET /api/admin/users?limit=10&sort=created_at:desc`
  - `GET /api/admin/dashboard/user-growth`
- **Testing Notes:**
  - Verify all stat cards load without 404 errors
  - Check chart renders correctly with real data
  - Verify date filters work correctly
  - Test real-time updates (if implemented)
- **Test Priority:** ⭐⭐⭐ CRITICAL (First page admins see)

---

### 2. User Management
- **Icon:** 👥
- **Route:** `/admin/users`
- **File:** `app/pages/admin/UserManagement.tsx`
- **Purpose:** View, search, filter, edit, activate/deactivate user accounts
- **Key Features:**
  - User list table with pagination
  - Search by name, email, referral code
  - Filter by status (active/inactive), KYC status, rank
  - View user details modal
  - Edit user information (name, email, phone, country)
  - Activate/deactivate user accounts
  - View user's team structure
  - View user's investment history
  - View user's earning breakdown
  - Export user list to CSV
- **API Dependencies:**
  - `GET /api/admin/users?page=1&limit=50&search=&status=&kyc_status=`
  - `GET /api/admin/users/:id`
  - `PUT /api/admin/users/:id`
  - `POST /api/admin/users/:id/activate`
  - `POST /api/admin/users/:id/deactivate`
  - `GET /api/admin/users/:id/investments`
  - `GET /api/admin/users/:id/earnings`
- **Testing Notes:**
  - Test search functionality with various inputs
  - Test all filters independently and combined
  - Verify pagination works correctly
  - Test user edit validation rules
  - Check activate/deactivate permissions
  - Verify export generates correct CSV format
- **Test Priority:** ⭐⭐⭐ CRITICAL

---

### 3. KYC Management
- **Icon:** 🆔
- **Route:** `/admin/kyc`
- **File:** `app/pages/admin/KYCManagement.tsx`
- **Purpose:** Review and approve/reject user identity verification submissions
- **Key Features:**
  - KYC submission list with status filters
  - Pending submissions dashboard card
  - View submitted documents (ID, address proof, selfie)
  - Document zoom/preview functionality
  - Approve KYC with admin notes
  - Reject KYC with rejection reason
  - View KYC history for each user
  - Filter by status (pending, approved, rejected)
  - Search by user email/name
- **API Dependencies:**
  - `GET /api/kyc?status=pending`
  - `GET /api/kyc/:submissionId`
  - `POST /api/kyc/:submissionId/approve`
  - `POST /api/kyc/:submissionId/reject`
  - `GET /api/admin/users/:id/kyc-history`
- **Testing Notes:**
  - Test document image loading and zoom
  - Verify approval updates user status immediately
  - Test rejection sends notification to user
  - Check admin notes are saved correctly
  - Verify only pending KYCs can be approved/rejected
  - Test re-submission flow after rejection
- **Test Priority:** ⭐⭐⭐ CRITICAL (Compliance requirement)

---

### 4. Package Management
- **Icon:** 📦
- **Route:** `/admin/packages`
- **File:** `app/pages/admin/PackageManagement.tsx`
- **Purpose:** Create, edit, delete investment packages with ROI settings
- **Key Features:**
  - Package list table
  - Create new package form
  - Edit existing package
  - Delete package (with active investment check)
  - Set package details: name, amount, daily ROI %, total return %, duration
  - Set minimum/maximum investment limits
  - Enable/disable package visibility
  - View active investments count per package
  - Package performance metrics
- **API Dependencies:**
  - `GET /api/admin/packages`
  - `POST /api/admin/packages`
  - `PUT /api/admin/packages/:id`
  - `DELETE /api/admin/packages/:id`
  - `GET /api/admin/packages/:id/investments`
- **Testing Notes:**
  - Test package creation with validation rules
  - Verify cannot delete package with active investments
  - Test ROI calculation preview
  - Check duplicate package name prevention
  - Verify minimum > maximum validation
  - Test toggle visibility affects user panel
- **Test Priority:** ⭐⭐⭐ CRITICAL (Revenue core)

---

### 5. Financial Management
- **Icon:** 💰
- **Route:** `/admin/financial`
- **File:** `app/pages/admin/FinancialManagement.tsx`
- **Purpose:** Manage deposits, withdrawals, wallet adjustments, transaction history
- **Key Features:**
  - Pending deposits list
  - Pending withdrawals list
  - Approve/reject deposit requests
  - Approve/reject withdrawal requests
  - Manual wallet adjustment (add/deduct balance)
  - Transaction history with filters
  - Export financial reports
  - View payment proof images for deposits
  - Set withdrawal limits and fees
- **API Dependencies:**
  - `GET /api/admin/financial/deposits?status=pending`
  - `GET /api/admin/financial/withdrawals?status=pending`
  - `POST /api/admin/financial/deposits/:id/approve`
  - `POST /api/admin/financial/deposits/:id/reject`
  - `POST /api/admin/financial/withdrawals/:id/approve`
  - `POST /api/admin/financial/withdrawals/:id/reject`
  - `POST /api/admin/financial/wallet-adjustment`
  - `GET /api/admin/financial/transactions`
- **Testing Notes:**
  - Test approval immediately updates user wallet
  - Verify rejection sends notification to user
  - Test manual adjustment creates audit log
  - Check payment proof image display
  - Verify transaction filters work correctly
  - Test CSV export format and data accuracy
  - Check withdrawal fee calculation
- **Test Priority:** ⭐⭐⭐ CRITICAL (Money handling)

---

### 6. Commission Management
- **Icon:** 💵
- **Route:** `/admin/commissions`
- **File:** `app/pages/admin/CommissionManagement.tsx`
- **Purpose:** Configure commission rates, view commission payouts, generate reports
- **Key Features:**
  - Commission settings form
  - Direct referral commission rate
  - Level-based commission rates (up to 10 levels)
  - Binary match bonus percentage
  - Commission payout history
  - User-wise commission breakdown
  - Total commissions paid summary
  - Commission rate change history
- **API Dependencies:**
  - `GET /api/admin/commissions/settings`
  - `PUT /api/admin/commissions/settings`
  - `GET /api/admin/commissions/history`
  - `GET /api/admin/commissions/user/:userId`
  - `GET /api/admin/commissions/stats`
- **Testing Notes:**
  - Test commission rate changes apply to future calculations
  - Verify historical commissions are not recalculated
  - Test level commission cascade calculation
  - Check binary match bonus applies correctly
  - Verify commission cap limits (if any)
  - Test report generation for date ranges
- **Test Priority:** ⭐⭐⭐ CRITICAL (MLM core logic)

---

### 7. Income Simulator
- **Icon:** 🧮
- **Route:** `/admin/income-simulator`
- **File:** `app/pages/admin/IncomeSimulator.tsx`
- **Purpose:** Simulate potential earnings based on team growth scenarios
- **Key Features:**
  - Input: personal investment amount
  - Input: number of direct referrals
  - Input: levels of team depth
  - Input: average investment per team member
  - Calculate: total ROI earnings
  - Calculate: direct referral commissions
  - Calculate: level commissions
  - Calculate: binary match bonus
  - Calculate: total projected income
  - Visual chart of income breakdown
  - Compare multiple scenarios side-by-side
- **API Dependencies:**
  - `POST /api/admin/income-simulator/calculate` (client-side calculation may be used)
- **Testing Notes:**
  - Test calculation accuracy with known scenarios
  - Verify all commission types are included
  - Test edge cases (0 referrals, max levels)
  - Check chart displays all income types
  - Verify scenario comparison works correctly
  - Test save/load simulation scenarios
- **Test Priority:** ⭐⭐ HIGH (Sales/training tool)

---

### 8. Rank Management
- **Icon:** 🏆
- **Route:** `/admin/ranks`
- **File:** `app/pages/admin/RankManagement.tsx`
- **Purpose:** Define rank levels, requirements, and rewards in MLM structure
- **Key Features:**
  - Rank list table
  - Create new rank
  - Edit rank requirements
  - Delete rank
  - Set rank criteria: minimum personal investment, team size, team volume
  - Set rank rewards: bonus amount, commission boost %
  - View users at each rank
  - Rank achievement history
  - Automatic rank upgrade checking
- **API Dependencies:**
  - `GET /api/admin/ranks`
  - `POST /api/admin/ranks`
  - `PUT /api/admin/ranks/:id`
  - `DELETE /api/admin/ranks/:id`
  - `GET /api/admin/ranks/:id/users`
  - `GET /api/admin/ranks/achievement-history`
- **Testing Notes:**
  - Test rank requirement validation (prevent impossible criteria)
  - Verify rank upgrade automation works correctly
  - Test users receive rank rewards immediately
  - Check rank achievement notifications sent
  - Verify rank order cannot be changed once users assigned
  - Test cascade effect of rank changes on existing users
- **Test Priority:** ⭐⭐⭐ CRITICAL (MLM structure)

---

### 9. Binary Tree
- **Icon:** 🌳
- **Route:** `/admin/binary`
- **File:** `app/pages/admin/BinaryTree.tsx`
- **Purpose:** Visualize and manage binary MLM tree structure, placements, and volumes
- **Key Features:**
  - Binary tree visualization (left/right legs)
  - Search user in tree
  - View node details (user info, left/right volume)
  - Manual placement tool (admin can place users)
  - Binary settings: match bonus %, max daily matches, carryover enabled
  - Volume calculation and recalculation
  - Weaker leg identification
  - Binary reports (match bonus history)
  - Carryover volume tracking
- **API Dependencies:**
  - `GET /api/admin/binary/tree/:userId`
  - `GET /api/admin/binary/nodes`
  - `GET /api/admin/binary/settings`
  - `PUT /api/admin/binary/settings`
  - `POST /api/admin/binary/placement`
  - `GET /api/admin/binary/reports`
  - `POST /api/admin/binary/recalculate`
- **Testing Notes:**
  - Test tree loads without timeout for large teams
  - Verify manual placement updates volumes correctly
  - Test volume recalculation affects all parent nodes
  - Check match bonus calculation accuracy
  - Verify carryover logic works correctly
  - Test binary settings changes apply immediately
  - Check left/right volume visual indicators
- **Test Priority:** ⭐⭐⭐ CRITICAL (Binary MLM core)

---

### 10. Team Report (Admin)
- **Icon:** 📊
- **Route:** `/admin/team-report`
- **File:** `app/pages/admin/TeamReport.tsx`
- **Purpose:** Generate and view team structure reports for any user
- **Key Features:**
  - Select user to view their team
  - Team hierarchy visualization
  - Level-wise breakdown (up to 30 levels)
  - Team statistics: total members, active/inactive, total investment
  - Member list with details
  - Export team report to CSV
  - Filter by level, status, date joined
  - Search within team
- **API Dependencies:**
  - `GET /api/team/members` (for selected user)
  - `GET /api/admin/users/:userId/team-stats`
  - `GET /api/admin/users/:userId/team-members`
- **Testing Notes:**
  - Test report generation for users with large teams
  - Verify level calculations are accurate
  - Test CSV export includes all team members
  - Check filters work correctly
  - Verify search finds members at any level
  - Test date range filters
- **Test Priority:** ⭐⭐ HIGH

---

### 11. Reports
- **Icon:** 📈
- **Route:** `/admin/reports`
- **File:** `app/pages/admin/Reports.tsx`
- **Purpose:** Generate various business intelligence reports
- **Key Features:**
  - User registration report (daily/monthly)
  - Investment report (by package, by date)
  - Earnings report (ROI, commissions, binary)
  - Withdrawal report
  - Active users report
  - KYC status report
  - Revenue summary report
  - Date range filters for all reports
  - Export reports to CSV/PDF
  - Visual charts for each report
- **API Dependencies:**
  - `GET /api/admin/reports/registrations`
  - `GET /api/admin/reports/investments`
  - `GET /api/admin/reports/earnings`
  - `GET /api/admin/reports/withdrawals`
  - `GET /api/admin/reports/active-users`
  - `GET /api/admin/reports/kyc`
  - `GET /api/admin/reports/revenue`
- **Testing Notes:**
  - Test all report types generate correctly
  - Verify date filters work for all reports
  - Test CSV export format and accuracy
  - Check chart displays match table data
  - Verify report calculations are accurate
  - Test large data sets don't timeout
- **Test Priority:** ⭐⭐⭐ CRITICAL (Business insights)

---

### 12. Enhanced Reports
- **Icon:** 📊
- **Route:** `/admin/reports-enhanced`
- **File:** `app/pages/admin/ReportsEnhanced.tsx`
- **Purpose:** Advanced analytics with interactive charts and custom queries
- **Key Features:**
  - Custom report builder
  - Advanced filtering options
  - Interactive data visualization
  - Drill-down capabilities
  - Comparison tools (period over period)
  - Predictive analytics
  - Real-time data updates
  - Custom KPI dashboard
  - Scheduled report delivery
- **API Dependencies:**
  - `POST /api/admin/reports/custom-query`
  - `GET /api/admin/reports/analytics`
  - `GET /api/admin/reports/kpi`
- **Testing Notes:**
  - Test custom query builder validation
  - Verify interactive charts allow drill-down
  - Test scheduled reports are delivered via email
  - Check comparison tools calculate correctly
  - Verify real-time updates work without refresh
  - Test export of custom reports
- **Test Priority:** ⭐⭐ HIGH (Advanced feature)

---

### 13. Communications
- **Icon:** 📧
- **Route:** `/admin/communications`
- **File:** `app/pages/admin/Communications.tsx`
- **Purpose:** Send emails, SMS, notifications, announcements, and news to users
- **Key Features:**
  - **Push Notifications:**
    - Send bulk notifications
    - Target users (all, active, inactive)
    - Notification history
  - **Email Campaigns:**
    - Send bulk emails
    - Email templates
    - Email history with open/click rates
    - Schedule emails
  - **SMS:**
    - Send bulk SMS
    - SMS history
    - SMS credits tracking
  - **Announcements:**
    - Create announcement banners
    - Set priority (info, warning, urgent)
    - Set display location (banner, popup)
    - Schedule start/end dates
    - Target specific user groups
  - **News Articles:**
    - Create news articles
    - Rich text editor
    - Image uploads
    - Publish/draft/archive status
    - View article analytics
- **API Dependencies:**
  - `GET /api/admin/communications/notifications`
  - `POST /api/admin/communications/notifications/bulk`
  - `GET /api/admin/communications/emails/history`
  - `POST /api/admin/communications/emails/bulk`
  - `POST /api/admin/communications/sms/bulk`
  - `GET /api/admin/communications/announcements` (placeholder)
  - `POST /api/admin/communications/announcements` (placeholder)
  - `GET /api/admin/communications/news` (placeholder)
  - `POST /api/admin/communications/news` (placeholder)
  - `GET /api/admin/communications/stats`
- **Testing Notes:**
  - **Backend Status:** Notifications, Emails, SMS have backend APIs. Announcements & News are placeholders.
  - Test notification delivery to targeted users
  - Verify email templates render correctly
  - Test SMS credit deduction
  - Check scheduled announcements appear/disappear correctly
  - Verify news articles publish properly
  - Test rich text editor formatting
  - Check communication stats are accurate
- **Test Priority:** ⭐⭐⭐ CRITICAL (User engagement)

---

### 14. Support Management
- **Icon:** 🎫
- **Route:** `/admin/support`
- **File:** `app/pages/admin/SupportManagement.tsx`
- **Purpose:** Manage user support tickets and inquiries
- **Key Features:**
  - Ticket list with status filters
  - Open/closed/pending ticket counts
  - View ticket details and conversation history
  - Reply to tickets
  - Change ticket status
  - Assign tickets to admin users
  - Ticket priority levels
  - Search tickets by user, subject, ID
  - Ticket categories
  - Response time tracking
- **API Dependencies:**
  - `GET /api/admin/support/tickets`
  - `GET /api/admin/support/tickets/:id`
  - `POST /api/admin/support/tickets/:id/reply`
  - `PUT /api/admin/support/tickets/:id/status`
  - `PUT /api/admin/support/tickets/:id/assign`
- **Testing Notes:**
  - Test ticket status updates notify user
  - Verify replies are sent via email
  - Test ticket assignment permissions
  - Check search finds tickets correctly
  - Verify response time metrics are accurate
  - Test ticket escalation flow
- **Test Priority:** ⭐⭐⭐ CRITICAL (Customer support)

---

### 15. Audit Logs
- **Icon:** 📋
- **Route:** `/admin/audit`
- **File:** `app/pages/admin/AuditLogs.tsx`
- **Purpose:** View all system actions for security and compliance tracking
- **Key Features:**
  - Audit log table with pagination
  - Filter by action type (login, deposit, withdrawal, user edit, etc.)
  - Filter by user
  - Filter by date range
  - View detailed log entry
  - Export audit logs to CSV
  - Search logs by description
  - IP address tracking
  - User agent tracking
- **API Dependencies:**
  - `GET /api/admin/audit-logs?page=1&limit=100&action_type=&user_id=&start_date=&end_date=`
  - `GET /api/admin/audit-logs/:id`
- **Testing Notes:**
  - Verify all critical actions are logged
  - Test filters work correctly
  - Check audit logs cannot be deleted/edited
  - Verify IP and user agent are captured
  - Test log retention policy (if implemented)
  - Check CSV export includes all fields
- **Test Priority:** ⭐⭐⭐ CRITICAL (Compliance/security)

---

### 16. System Configuration
- **Icon:** 🔧
- **Route:** `/admin/configuration`
- **File:** `app/pages/admin/Configuration.tsx`
- **Purpose:** Configure system-wide settings and parameters
- **Key Features:**
  - Platform name and branding
  - Contact information
  - Maintenance mode toggle
  - Registration open/closed
  - Email configuration (SMTP settings)
  - SMS gateway configuration
  - Payment gateway settings
  - Security settings (password policy, 2FA)
  - Currency settings
  - Timezone settings
  - Backup and restore
- **API Dependencies:**
  - `GET /api/admin/configuration`
  - `PUT /api/admin/configuration`
  - `POST /api/admin/configuration/test-email`
  - `POST /api/admin/configuration/test-sms`
- **Testing Notes:**
  - Test maintenance mode blocks user access
  - Verify email test sends correctly
  - Test SMS test sends correctly
  - Check currency changes update all displays
  - Verify password policy is enforced
  - Test backup creates downloadable file
  - Check restore from backup works
- **Test Priority:** ⭐⭐⭐ CRITICAL (System control)

---

### 17. System Settings
- **Icon:** ⚙️
- **Route:** `/admin/settings`
- **File:** `app/pages/admin/SystemSettings.tsx`
- **Purpose:** General system settings and preferences
- **Key Features:**
  - Site settings (title, description, logo)
  - Social media links
  - Legal pages (terms, privacy policy)
  - API keys management
  - Webhook configuration
  - Cache management
  - Database optimization
  - Log management
- **API Dependencies:**
  - `GET /api/admin/settings`
  - `PUT /api/admin/settings`
  - `POST /api/admin/settings/clear-cache`
  - `POST /api/admin/settings/optimize-db`
- **Testing Notes:**
  - Test logo upload and display
  - Verify social links work correctly
  - Test API key encryption/decryption
  - Check cache clear affects performance
  - Verify DB optimization completes successfully
  - Test webhook URL validation
- **Test Priority:** ⭐⭐ HIGH

---

### 18. Plan Settings
- **Icon:** 🎛️
- **Route:** `/admin/plan-settings`
- **File:** `app/pages/admin/PlanSettings.tsx`
- **Purpose:** Enable/disable specific features and plans (Investment, Robot, Binary, Staking, etc.)
- **Key Features:**
  - Toggle Investment Plan (enable/disable)
  - Toggle Robot Plan (trading bot feature)
  - Toggle Binary Plan (binary MLM tree)
  - Toggle Staking Plan
  - Toggle Mining Plan
  - Toggle Lottery Plan
  - View active plan summary
  - Plan-specific settings for each module
  - Feature visibility control
- **API Dependencies:**
  - `GET /api/plan-settings/active-plans/summary`
  - `PUT /api/admin/plan-settings/investment`
  - `PUT /api/admin/plan-settings/robot`
  - `PUT /api/admin/plan-settings/binary`
  - `PUT /api/admin/plan-settings/staking`
  - `PUT /api/admin/plan-settings/mining`
  - `PUT /api/admin/plan-settings/lottery`
- **Testing Notes:**
  - Test disabling plan hides menu in user panel
  - Verify plan toggle updates immediately
  - Test plan-specific settings validation
  - Check disabled plans don't allow new investments
  - Verify existing investments continue if plan disabled
  - Test multiple plans can be active simultaneously
- **Test Priority:** ⭐⭐⭐ CRITICAL (Feature control)

---

## USER PANEL MENU MAP

### 1. Home
- **Icon:** 🏠
- **Route:** `/`
- **File:** `app/pages/user/Home.tsx`
- **Purpose:** Landing page with platform introduction and quick actions
- **Key Features:**
  - Hero section with CTA buttons
  - Platform features overview
  - Package highlights
  - Testimonials
  - FAQ section
  - Quick registration link
- **API Dependencies:** None (static content)
- **Testing Notes:**
  - Verify all CTA buttons navigate correctly
  - Test responsive design on mobile
  - Check images load properly
  - Verify registration link works for non-logged users
- **Test Priority:** ⭐⭐ HIGH (First impression)

---

### 2. Dashboard
- **Icon:** 📊
- **Route:** `/dashboard`
- **File:** `app/pages/user/Dashboard.tsx`
- **Purpose:** User's main dashboard with overview of account, earnings, and activities
- **Key Features:**
  - **Dashboard Cards:**
    - Wallet Balance
    - Total Investment
    - Total Earnings (ROI + Commissions + Binary)
    - Today's Earnings
    - Active Packages
    - Team Size (Direct + Total)
    - Binary Volume (Left + Right)
    - Current Rank
  - Recent transactions table
  - Earnings chart (last 30 days)
  - Quick action buttons (deposit, withdraw, invest)
  - Referral link with copy button
  - Notifications panel
- **API Dependencies:**
  - `GET /api/dashboard/stats`
  - `GET /api/dashboard/transactions?limit=10`
  - `GET /api/dashboard/earnings-chart`
  - `GET /api/team/stats`
  - `GET /api/user/profile`
- **Testing Notes:**
  - Verify all cards load without 404 errors
  - Test real-time balance updates after transactions
  - Check earnings chart displays correctly
  - Verify referral link copies to clipboard
  - Test quick action buttons navigate correctly
  - Check notifications display properly
- **Test Priority:** ⭐⭐⭐ CRITICAL (Main user page)

---

### 3. Packages (Investment Plan)
- **Icon:** 📦
- **Route:** `/packages`
- **File:** `app/pages/user/Packages.tsx`
- **Purpose:** View and purchase investment packages
- **Plan Dependency:** Visible only if `investment_plan` is enabled in Plan Settings
- **Key Features:**
  - Package cards with details (amount, ROI %, duration, total return)
  - Active investments list
  - Investment history
  - Purchase package modal
  - Package comparison tool
  - ROI calculator
  - Package maturity countdown
  - Daily earnings from each package
- **API Dependencies:**
  - `GET /api/packages` (public packages)
  - `GET /api/user/investments/active`
  - `GET /api/user/investments/history`
  - `POST /api/user/investments/purchase`
- **Testing Notes:**
  - Verify only available packages are shown
  - Test purchase validation (minimum balance check)
  - Check ROI calculation preview accuracy
  - Verify investment creates transaction record
  - Test maturity date calculation
  - Check daily earnings are credited correctly
  - Verify package visibility respects plan settings
- **Test Priority:** ⭐⭐⭐ CRITICAL (Revenue generator)

---

### 4. Trading Robot (Robot Plan)
- **Icon:** 🤖
- **Route:** `/robot`
- **File:** `app/pages/user/Robot.tsx`
- **Purpose:** Automated trading bot with AI-powered strategies
- **Plan Dependency:** Visible only if `robot_plan` is enabled
- **Key Features:**
  - Robot status (active/inactive)
  - Start/stop robot
  - Select trading strategy
  - Set risk level (low, medium, high)
  - Set investment amount for robot
  - Robot performance dashboard
  - Trade history
  - Profit/loss tracking
  - Real-time trading status
- **API Dependencies:**
  - `GET /api/robot/status`
  - `POST /api/robot/start`
  - `POST /api/robot/stop`
  - `PUT /api/robot/settings`
  - `GET /api/robot/performance`
  - `GET /api/robot/trade-history`
- **Testing Notes:**
  - Test robot starts with valid settings
  - Verify robot stops immediately when requested
  - Check strategy changes apply correctly
  - Test risk level affects trade decisions
  - Verify trade history is accurate
  - Check profit/loss calculations
  - Test robot respects plan settings
- **Test Priority:** ⭐⭐ HIGH (If enabled)

---

### 5. Wallet (with sub-menu)

#### 5.1 Wallet Overview
- **Icon:** 👁️
- **Route:** `/wallet`
- **File:** `app/pages/user/Wallet.tsx`
- **Purpose:** View wallet balance and transaction history
- **Key Features:**
  - Current balance card
  - Available balance (after pending withdrawals)
  - Total deposits
  - Total withdrawals
  - Transaction history with filters
  - Filter by type (deposit, withdrawal, commission, ROI, etc.)
  - Search transactions
  - Export transactions to CSV
- **API Dependencies:**
  - `GET /api/user/wallet/balance`
  - `GET /api/user/wallet/transactions?page=1&type=&start_date=&end_date=`
- **Testing Notes:**
  - Verify balance updates in real-time
  - Test transaction filters work correctly
  - Check CSV export accuracy
  - Verify available balance calculation
  - Test search finds transactions
- **Test Priority:** ⭐⭐⭐ CRITICAL

#### 5.2 Deposit
- **Icon:** ⬇️
- **Route:** `/wallet/deposit`
- **File:** `app/pages/user/Deposit.tsx`
- **Purpose:** Request deposit to wallet
- **Key Features:**
  - Enter deposit amount
  - Select payment method (crypto, bank transfer, etc.)
  - View deposit instructions
  - Upload payment proof
  - Pending deposit requests list
  - Deposit history
- **API Dependencies:**
  - `GET /api/user/wallet/payment-methods`
  - `POST /api/user/wallet/deposit`
  - `GET /api/user/wallet/deposits?status=pending`
  - `GET /api/user/wallet/deposits/history`
- **Testing Notes:**
  - Test deposit request creates pending entry
  - Verify payment proof upload works
  - Check deposit appears in admin pending list
  - Test deposit approval updates balance
  - Verify deposit rejection sends notification
  - Check deposit limits enforcement
- **Test Priority:** ⭐⭐⭐ CRITICAL (Money in)

#### 5.3 Withdraw
- **Icon:** ⬆️
- **Route:** `/wallet/withdraw`
- **File:** `app/pages/user/Withdraw.tsx`
- **Purpose:** Request withdrawal from wallet
- **Key Features:**
  - Enter withdrawal amount
  - Select withdrawal method
  - Enter withdrawal address/account details
  - View withdrawal fee and net amount
  - Minimum withdrawal limit warning
  - Pending withdrawal requests list
  - Withdrawal history
- **API Dependencies:**
  - `GET /api/user/wallet/withdrawal-methods`
  - `GET /api/user/wallet/withdrawal-limits`
  - `POST /api/user/wallet/withdraw`
  - `GET /api/user/wallet/withdrawals?status=pending`
  - `GET /api/user/wallet/withdrawals/history`
- **Testing Notes:**
  - Test withdrawal validation (minimum, maximum, balance check)
  - Verify fee calculation is correct
  - Check withdrawal request creates pending entry
  - Test withdrawal approval reduces balance
  - Verify rejection sends notification
  - Check daily withdrawal limit enforcement
  - Test KYC requirement for withdrawals
- **Test Priority:** ⭐⭐⭐ CRITICAL (Money out)

---

### 6. Team (with sub-menu)

#### 6.1 My Team
- **Icon:** 🌳
- **Route:** `/team`
- **File:** `app/pages/user/Team.tsx`
- **Purpose:** View referral team structure and statistics
- **Key Features:**
  - Team summary card (direct, total, active/inactive)
  - Level-wise breakdown
  - Team member list with details
  - Filter by level (1-30)
  - Search team members
  - View member investment and earnings
  - Team investment total
  - Team earnings total
- **API Dependencies:**
  - `GET /api/team/members`
  - `GET /api/team/stats`
  - `GET /api/team/level/:level`
- **Testing Notes:**
  - Verify team loads without 404 errors (FIXED)
  - Test level filter works correctly
  - Check team calculations are accurate
  - Verify search finds members at any level
  - Test large teams load without timeout
  - Check team stats match member list
- **Test Priority:** ⭐⭐⭐ CRITICAL (MLM core)

#### 6.2 Team Report
- **Icon:** 📈
- **Route:** `/team-report`
- **File:** `app/pages/user/TeamReport.tsx`
- **Purpose:** Detailed team performance report with charts
- **Key Features:**
  - Team growth chart (last 30/60/90 days)
  - Level distribution chart
  - Active vs inactive members chart
  - Investment by level chart
  - Earnings by level chart
  - Export team report to PDF
  - Date range filters
- **API Dependencies:**
  - `GET /api/team/report?start_date=&end_date=`
  - `GET /api/team/growth-chart`
- **Testing Notes:**
  - Test all charts render correctly
  - Verify date filters work
  - Check PDF export includes all data
  - Test chart interactions
  - Verify calculations match raw data
- **Test Priority:** ⭐⭐ HIGH

#### 6.3 Referrals
- **Icon:** 🔗
- **Route:** `/referrals`
- **File:** `app/pages/user/Referrals.tsx`
- **Purpose:** View direct referrals only (Level 1)
- **Key Features:**
  - Direct referral count
  - Referral list with join date
  - Referral link with copy button
  - QR code for referral link
  - Referral commission earned
  - Share referral link (social media)
- **API Dependencies:**
  - `GET /api/team/direct`
  - `GET /api/user/referral-link`
  - `GET /api/user/referral-stats`
- **Testing Notes:**
  - Verify referral link is unique
  - Test copy to clipboard works
  - Check QR code scans correctly
  - Test social share buttons work
  - Verify referral commission calculation
- **Test Priority:** ⭐⭐⭐ CRITICAL (Growth driver)

#### 6.4 Genealogy
- **Icon:** 📊
- **Route:** `/genealogy`
- **File:** `app/pages/user/Genealogy.tsx`
- **Purpose:** Visual tree diagram of team structure
- **Key Features:**
  - Interactive tree visualization
  - Expand/collapse nodes
  - View node details on click
  - Search member in tree
  - Zoom in/out
  - Filter by active/inactive
  - Color coding by status/rank
- **API Dependencies:**
  - `GET /api/team/genealogy/:userId`
- **Testing Notes:**
  - Test tree loads for large teams without freezing
  - Verify expand/collapse animations
  - Check search highlights correct node
  - Test zoom controls work
  - Verify node details display correctly
  - Check color coding is consistent
- **Test Priority:** ⭐⭐ HIGH

---

### 7. Binary (Binary Plan)
- **Icon:** ⚖️
- **Route:** `/binary`
- **File:** `app/pages/user/Binary.tsx`
- **Purpose:** View user's binary tree placement and volumes
- **Plan Dependency:** Visible only if `binary_plan` is enabled
- **Key Features:**
  - Binary tree visualization (user's position)
  - Left leg volume
  - Right leg volume
  - Weaker leg indicator
  - Match bonus history
  - Carryover volumes
  - Placement sponsor information
  - Binary earnings summary
- **API Dependencies:**
  - `GET /api/user/binary/tree`
  - `GET /api/user/binary/volumes`
  - `GET /api/user/binary/match-history`
- **Testing Notes:**
  - Test tree displays user's position correctly
  - Verify left/right volumes are accurate
  - Check weaker leg calculation
  - Test match bonus history
  - Verify carryover logic is visible
  - Check binary respects plan settings
- **Test Priority:** ⭐⭐⭐ CRITICAL (If binary enabled)

---

### 8. Earnings (with sub-menu)

#### 8.1 Earnings Overview
- **Icon:** 💰
- **Route:** `/earnings`
- **File:** `app/pages/user/Earnings.tsx`
- **Purpose:** Overview of all earnings types
- **Key Features:**
  - Total earnings card
  - ROI earnings card
  - Commission earnings card
  - Binary earnings card
  - Earnings breakdown chart
  - Recent earnings transactions
  - Earnings history table
  - Filter by earning type and date
- **API Dependencies:**
  - `GET /api/user/earnings/summary`
  - `GET /api/user/earnings/breakdown`
  - `GET /api/user/earnings/history`
- **Testing Notes:**
  - Verify all earning types are displayed
  - Test chart shows correct proportions
  - Check earnings history filters work
  - Verify totals match individual types
  - Test date range filters
- **Test Priority:** ⭐⭐⭐ CRITICAL

#### 8.2 ROI Earnings
- **Icon:** 📈
- **Route:** `/earnings/roi`
- **File:** `app/pages/user/ROIEarnings.tsx`
- **Purpose:** Track daily ROI from active packages
- **Key Features:**
  - Total ROI earned
  - Daily ROI breakdown by package
  - ROI earning history
  - Expected ROI (projected)
  - Package performance comparison
- **API Dependencies:**
  - `GET /api/user/earnings/roi`
  - `GET /api/user/earnings/roi-daily`
- **Testing Notes:**
  - Verify daily ROI matches package settings
  - Test ROI credited daily at scheduled time
  - Check expired packages stop generating ROI
  - Verify projections are accurate
- **Test Priority:** ⭐⭐⭐ CRITICAL

#### 8.3 Commission Earnings
- **Icon:** 💵
- **Route:** `/earnings/commissions`
- **File:** `app/pages/user/CommissionEarnings.tsx`
- **Purpose:** Track referral and level commissions
- **Key Features:**
  - Total commission earned
  - Direct referral commissions
  - Level commissions (by level)
  - Commission history
  - Top earning referrals
- **API Dependencies:**
  - `GET /api/user/earnings/commissions`
  - `GET /api/user/earnings/commissions-by-level`
- **Testing Notes:**
  - Verify commission rates match admin settings
  - Test commissions credited when referral invests
  - Check level commissions cascade correctly
  - Verify commission history is accurate
- **Test Priority:** ⭐⭐⭐ CRITICAL

#### 8.4 Binary Earnings
- **Icon:** ⚖️
- **Route:** `/earnings/binary`
- **File:** `app/pages/user/BinaryEarnings.tsx`
- **Purpose:** Track binary match bonus earnings
- **Key Features:**
  - Total binary earnings
  - Match bonus history
  - Carryover volumes
  - Daily match count
  - Weaker leg performance
- **API Dependencies:**
  - `GET /api/user/earnings/binary`
  - `GET /api/user/binary/match-history`
- **Testing Notes:**
  - Verify match bonus calculations
  - Test daily match limit enforcement
  - Check carryover logic
  - Verify weaker leg identification
- **Test Priority:** ⭐⭐⭐ CRITICAL (If binary enabled)

---

### 9. Profile & Settings (with sub-menu)

#### 9.1 Profile
- **Icon:** 👤
- **Route:** `/profile`
- **File:** `app/pages/user/Profile.tsx`
- **Purpose:** View and edit user profile information
- **Key Features:**
  - View profile details
  - Edit name, email, phone, country
  - Upload profile picture
  - View account creation date
  - View referral code
  - View sponsor information
  - Account status (active/inactive)
  - Email verification status
  - KYC status badge
- **API Dependencies:**
  - `GET /api/user/profile`
  - `PUT /api/user/profile`
  - `POST /api/user/profile/upload-picture`
- **Testing Notes:**
  - Test profile update validation
  - Verify email change requires verification
  - Check profile picture upload works
  - Test profile fields save correctly
  - Verify cannot change immutable fields (referral code, sponsor)
- **Test Priority:** ⭐⭐⭐ CRITICAL

#### 9.2 KYC Verification
- **Icon:** 🆔
- **Route:** `/kyc`
- **File:** `app/pages/user/KYC.tsx`
- **Purpose:** Submit identity verification documents
- **Key Features:**
  - KYC status display (not submitted, pending, approved, rejected)
  - Upload ID proof (passport, national ID, driver's license)
  - Upload address proof (utility bill, bank statement)
  - Upload selfie with ID
  - View uploaded documents
  - View rejection reason (if rejected)
  - Re-submit after rejection
  - KYC approval benefits info
- **API Dependencies:**
  - `GET /api/user/kyc/status`
  - `POST /api/user/kyc/upload-document`
  - `POST /api/user/kyc/submit`
  - `GET /api/user/kyc/documents`
- **Testing Notes:**
  - Test document upload validation (size, type)
  - Verify submission creates pending entry
  - Check cannot submit if already pending/approved
  - Test rejection allows re-submission
  - Verify approval updates user status
  - Check KYC required for withdrawals
- **Test Priority:** ⭐⭐⭐ CRITICAL (Compliance)

#### 9.3 Security
- **Icon:** 🔒
- **Route:** `/security`
- **File:** `app/pages/user/Security.tsx`
- **Purpose:** Manage account security settings
- **Key Features:**
  - Change password
  - Enable/disable 2FA (Two-Factor Authentication)
  - View active sessions
  - Logout all sessions
  - View login history
  - Security alerts settings
- **API Dependencies:**
  - `POST /api/user/security/change-password`
  - `POST /api/user/security/enable-2fa`
  - `POST /api/user/security/disable-2fa`
  - `GET /api/user/security/sessions`
  - `POST /api/user/security/logout-all`
  - `GET /api/user/security/login-history`
- **Testing Notes:**
  - Test password change validation (old password check)
  - Verify 2FA setup with QR code
  - Check 2FA required at login after enable
  - Test logout all sessions works
  - Verify login history shows IP and device
- **Test Priority:** ⭐⭐⭐ CRITICAL (Security)

#### 9.4 Notifications
- **Icon:** 🔔
- **Route:** `/notifications`
- **File:** `app/pages/user/Notifications.tsx`
- **Purpose:** View and manage notifications
- **Key Features:**
  - Notification list (unread, read, all)
  - Mark as read
  - Mark all as read
  - Delete notification
  - Notification preferences (email, SMS, push)
  - Filter by type
  - Notification history
- **API Dependencies:**
  - `GET /api/user/notifications`
  - `PUT /api/user/notifications/:id/read`
  - `POST /api/user/notifications/mark-all-read`
  - `DELETE /api/user/notifications/:id`
  - `GET /api/user/notification-preferences`
  - `PUT /api/user/notification-preferences`
- **Testing Notes:**
  - Test mark as read updates UI immediately
  - Verify delete removes notification
  - Check preferences affect future notifications
  - Test filter by type works
  - Verify notification count badge updates
- **Test Priority:** ⭐⭐ HIGH

---

## DASHBOARD CARDS REFERENCE

### Admin Dashboard Cards
1. **Total Users** - `GET /api/admin/dashboard/stats` (total_users)
2. **Active Users** - `GET /api/admin/dashboard/stats` (active_users)
3. **Total Investment** - `GET /api/admin/dashboard/stats` (total_investment)
4. **Total Earnings Paid** - `GET /api/admin/dashboard/stats` (total_earnings)
5. **Pending KYC** - `GET /api/admin/dashboard/stats` (pending_kyc)
6. **Pending Deposits** - `GET /api/admin/dashboard/stats` (pending_deposits)
7. **Pending Withdrawals** - `GET /api/admin/dashboard/stats` (pending_withdrawals)
8. **User Growth Chart** - `GET /api/admin/dashboard/user-growth`
9. **Recent Registrations** - `GET /api/admin/users?limit=10&sort=created_at:desc`

### User Dashboard Cards
1. **Wallet Balance** - `GET /api/user/wallet/balance`
2. **Total Investment** - `GET /api/dashboard/stats` (total_investment)
3. **Total Earnings** - `GET /api/dashboard/stats` (total_earnings)
4. **Today's Earnings** - `GET /api/dashboard/stats` (today_earnings)
5. **Active Packages** - `GET /api/dashboard/stats` (active_packages)
6. **Team Size** - `GET /api/team/stats` (direct_members, total_team) ✅ FIXED
7. **Binary Volume** - `GET /api/user/binary/volumes` (left_volume, right_volume)
8. **Current Rank** - `GET /api/user/profile` (current_rank)
9. **Earnings Chart** - `GET /api/dashboard/earnings-chart`
10. **Recent Transactions** - `GET /api/dashboard/transactions?limit=10`

---

## API ENDPOINT SUMMARY

### Authentication & User
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh-token`
- `GET /api/user/profile`
- `PUT /api/user/profile`
- `GET /api/user/referral-link`

### Dashboard
- `GET /api/dashboard/stats`
- `GET /api/dashboard/transactions`
- `GET /api/dashboard/earnings-chart`

### Wallet
- `GET /api/user/wallet/balance`
- `GET /api/user/wallet/transactions`
- `POST /api/user/wallet/deposit`
- `POST /api/user/wallet/withdraw`
- `GET /api/user/wallet/deposits`
- `GET /api/user/wallet/withdrawals`

### Packages & Investments
- `GET /api/packages`
- `POST /api/user/investments/purchase`
- `GET /api/user/investments/active`
- `GET /api/user/investments/history`

### Team & Referrals
- `GET /api/team/members` ✅ FIXED
- `GET /api/team/direct` ✅ FIXED
- `GET /api/team/stats` ✅ FIXED
- `GET /api/team/level/:level`
- `GET /api/team/genealogy/:userId`

### Binary Tree
- `GET /api/user/binary/tree`
- `GET /api/user/binary/volumes`
- `GET /api/user/binary/match-history`
- `GET /api/admin/binary/tree/:userId`
- `GET /api/admin/binary/nodes`
- `GET /api/admin/binary/settings`
- `PUT /api/admin/binary/settings`
- `POST /api/admin/binary/placement`
- `POST /api/admin/binary/recalculate`

### Earnings
- `GET /api/user/earnings/summary`
- `GET /api/user/earnings/breakdown`
- `GET /api/user/earnings/history`
- `GET /api/user/earnings/roi`
- `GET /api/user/earnings/commissions`
- `GET /api/user/earnings/binary`

### KYC
- `GET /api/user/kyc/status`
- `POST /api/user/kyc/upload-document`
- `POST /api/user/kyc/submit`
- `GET /api/kyc` (admin)
- `GET /api/kyc/:submissionId` (admin)
- `POST /api/kyc/:submissionId/approve` (admin)
- `POST /api/kyc/:submissionId/reject` (admin)

### Admin - Users
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PUT /api/admin/users/:id`
- `POST /api/admin/users/:id/activate`
- `POST /api/admin/users/:id/deactivate`

### Admin - Financial
- `GET /api/admin/financial/deposits`
- `GET /api/admin/financial/withdrawals`
- `POST /api/admin/financial/deposits/:id/approve`
- `POST /api/admin/financial/deposits/:id/reject`
- `POST /api/admin/financial/withdrawals/:id/approve`
- `POST /api/admin/financial/withdrawals/:id/reject`
- `POST /api/admin/financial/wallet-adjustment`

### Admin - Packages
- `GET /api/admin/packages`
- `POST /api/admin/packages`
- `PUT /api/admin/packages/:id`
- `DELETE /api/admin/packages/:id`

### Admin - Commissions
- `GET /api/admin/commissions/settings`
- `PUT /api/admin/commissions/settings`
- `GET /api/admin/commissions/history`

### Admin - Ranks
- `GET /api/admin/ranks`
- `POST /api/admin/ranks`
- `PUT /api/admin/ranks/:id`
- `DELETE /api/admin/ranks/:id`

### Admin - Communications
- `GET /api/admin/communications/notifications` ✅ BACKEND READY
- `POST /api/admin/communications/notifications/bulk` ✅ BACKEND READY
- `POST /api/admin/communications/emails/bulk` ✅ BACKEND READY
- `POST /api/admin/communications/sms/bulk` ✅ BACKEND READY
- `GET /api/admin/communications/stats` ✅ BACKEND READY
- `GET /api/admin/communications/announcements` ⚠️ PLACEHOLDER
- `POST /api/admin/communications/announcements` ⚠️ PLACEHOLDER
- `GET /api/admin/communications/news` ⚠️ PLACEHOLDER
- `POST /api/admin/communications/news` ⚠️ PLACEHOLDER

### Admin - Reports
- `GET /api/admin/reports/registrations`
- `GET /api/admin/reports/investments`
- `GET /api/admin/reports/earnings`
- `GET /api/admin/reports/withdrawals`

### Admin - Support
- `GET /api/admin/support/tickets`
- `GET /api/admin/support/tickets/:id`
- `POST /api/admin/support/tickets/:id/reply`
- `PUT /api/admin/support/tickets/:id/status`

### Admin - Configuration
- `GET /api/admin/configuration`
- `PUT /api/admin/configuration`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

### Admin - Plan Settings
- `GET /api/plan-settings/active-plans/summary` ✅ FIXED
- `PUT /api/admin/plan-settings/investment`
- `PUT /api/admin/plan-settings/robot`
- `PUT /api/admin/plan-settings/binary`

---

## TESTING PRIORITY MATRIX

### 🔴 CRITICAL (Must test first - P0)
1. Authentication (Login/Register/Logout)
2. Admin Dashboard - All stat cards
3. User Dashboard - All stat cards
4. Wallet - Deposit/Withdraw
5. Packages - Purchase flow
6. Financial Management - Approve/Reject deposits/withdrawals
7. User Management - View/Edit users
8. KYC Management - Approve/Reject
9. Team Management - View team members ✅ FIXED
10. Binary Tree - View and calculations
11. Commission Management - Settings and payouts
12. Earnings - All types (ROI, Commission, Binary)
13. Profile & Security - Password change, 2FA
14. Plan Settings - Enable/Disable features

### 🟡 HIGH (Test after critical - P1)
1. Package Management - Create/Edit/Delete
2. Rank Management
3. Reports - All report types
4. Team Report
5. Genealogy Tree
6. Communications - Notifications, Emails, SMS
7. Support Management
8. Audit Logs
9. System Configuration

### 🟢 MEDIUM (Test when time permits - P2)
1. Enhanced Reports
2. Income Simulator
3. Robot Trading (if enabled)
4. News Articles Management
5. Announcements Management
6. Notification Preferences
7. Session Management
8. Login History

### 🔵 LOW (Nice to have - P3)
1. Home Page (public)
2. FAQ Section
3. Social Media Links
4. Profile Picture Upload
5. CSV Exports
6. Chart Interactions

---

## MOBILE TESTING NOTES

### Critical Mobile Tests
1. **Responsive Navigation**
   - Hamburger menu works on mobile
   - All menu items accessible
   - Sub-menus expand/collapse correctly

2. **Dashboard Cards**
   - Cards stack vertically on mobile
   - All data visible without horizontal scroll
   - Charts responsive and readable

3. **Forms**
   - Input fields properly sized
   - Dropdowns work on touch devices
   - File upload works on mobile
   - Date pickers use native controls

4. **Tables**
   - Horizontal scroll enabled for wide tables
   - Action buttons accessible
   - Filters work on mobile

5. **Tree Visualizations**
   - Zoom/pan gestures work
   - Node details readable
   - Touch targets large enough (44px minimum)

6. **Modals**
   - Full screen on mobile
   - Close button accessible
   - Content scrollable

---

## KEY TEST SCENARIOS

### User Registration & Onboarding
1. User registers with referral link
2. User verifies email
3. User completes profile
4. User submits KYC
5. Admin approves KYC
6. User makes first deposit
7. User purchases first package
8. User starts earning ROI

### Investment Flow
1. User deposits funds
2. Admin approves deposit
3. User purchases package
4. Daily ROI credited automatically
5. User views earnings in dashboard
6. User withdraws earnings
7. Admin approves withdrawal

### Referral & Team Growth
1. User shares referral link
2. New user registers with link
3. New user appears in sponsor's team
4. New user invests
5. Sponsor receives commission
6. Commission appears in sponsor's earnings
7. Team stats update correctly

### Binary Tree Flow (if enabled)
1. User placed in binary tree
2. User's investment adds volume
3. Volume propagates to upline
4. Match bonus calculated daily
5. Weaker leg identified
6. Carryover volumes tracked
7. Binary earnings credited

### Admin Operations
1. Admin views dashboard stats
2. Admin approves pending KYC
3. Admin approves pending deposit
4. Admin approves pending withdrawal
5. Admin creates new package
6. Admin adjusts user wallet
7. Admin sends bulk notification
8. Admin generates report

---

## BACKEND INTEGRATION STATUS

### ✅ Fully Integrated (Backend APIs Ready)
- Authentication
- Dashboard Stats
- User Profile
- Team Members ✅ FIXED
- Wallet Operations
- Packages & Investments
- Binary Tree
- KYC
- Admin User Management
- Admin Financial Management
- Admin Binary Management
- Communications (Notifications, Emails, SMS)
- Plan Settings ✅ FIXED

### ⚠️ Partial Integration (Some APIs Missing)
- Communications (Announcements & News - placeholders only)
- Reports (some report types may be incomplete)
- Support Management (may need expansion)

### ❌ Not Yet Implemented (Frontend Only)
- Trading Robot (if enabled - may be client-side mock)
- Some advanced chart features
- Some export features may be client-side only

---

## NOTES FOR QA TEAM

1. **Environment Setup**
   - Backend: `http://localhost:3001/api`
   - Frontend: `http://localhost:5173`
   - Database: MySQL 8.4 (finaster_mlm)

2. **Test Credentials**
   - Admin: `admin@finaster.com` / [password from DB]
   - User: `user@finaster.com` / [password from DB]

3. **Known Issues Fixed**
   - ✅ Team API endpoints 404 errors (Fixed)
   - ✅ Plan Settings API endpoint 404 error (Fixed)
   - ✅ API path consistency issues (Fixed)

4. **Testing Tools**
   - Browser DevTools Network tab for API monitoring
   - React DevTools for component state
   - MySQL Workbench for database verification

5. **Regression Testing**
   - After fixing 404 errors, verify all dashboard cards load
   - Test that API calls use correct `/api` prefix
   - Verify no duplicate `/api` in URLs

---

**END OF DOCUMENT**

*This comprehensive test map should be updated as new features are added or existing features are modified.*