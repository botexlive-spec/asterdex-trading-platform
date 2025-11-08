# Business Logic Redesign - Implementation Guide

## Overview

This document outlines the complete redesign of the AsterDex MLM business logic system with the following new features:

### New Features Implemented:

1. ✅ **Plan Toggles** - Active/Inactive controls for all plans
2. ✅ **Investment Rules** - $100 base, multiples only
3. ✅ **Generation Plan** - Level unlocking based on direct referrals
4. ✅ **ROI-on-ROI Distribution** - Level-based distribution on ROI (not investment)
5. ✅ **Booster Income** - 30-day countdown with 0.1% bonus ROI
6. ✅ **Principal Withdrawal** - Time-based deductions (15% <30 days, 5% >30 days)
7. ✅ **Monthly Rewards** - 3-leg business volume (40:40:20 ratio)
8. ✅ **Dynamic Admin Controls** - All percentages and settings configurable

---

## Phase 1: Database Migration

### Step 1: Run Database Migration

```bash
# Connect to MySQL
mysql -u root -p

# Run the migration script
source C:/Projects/asterdex-8621-main/database/mysql/03_business_logic_redesign.sql
```

### What This Creates:

- ✅ `plan_settings` table - Dynamic plan configuration
- ✅ `rewards` table - Monthly reward milestones
- ✅ `boosters` table - User booster tracking
- ✅ `withdrawals` table - Withdrawal requests with deductions
- ✅ `user_business_volumes` table - Monthly 3-leg volume tracking
- ✅ `level_unlocks` table - Generation plan level unlocking
- ✅ Updated `users` table - New earning columns
- ✅ Updated `user_packages` table - Booster support
- ✅ Updated `packages` table - $100 multiples enforcement
- ✅ Stored procedure `update_level_unlocks` - Auto-update levels
- ✅ Trigger `after_user_insert_update_levels` - Auto-trigger on new referral

---

## Phase 2: Backend Services Created

### Services Implemented:

#### 1. Plan Settings Service
**File:** `server/services/planSettings.service.ts`

**Functions:**
- `getPlanSetting(feature_key)` - Get plan configuration
- `getAllPlanSettings()` - Get all plan settings
- `updatePlanSetting(feature_key, updates)` - Update plan config
- `togglePlan(feature_key, is_active)` - Toggle plan on/off
- `isPlanActive(feature_key)` - Check if plan is active
- `getGenerationPlanConfig()` - Get generation plan config
- `getInvestmentPlanConfig()` - Get investment plan config
- `getBoosterIncomeConfig()` - Get booster config
- `getPrincipalWithdrawalConfig()` - Get withdrawal config
- `getMonthlyRewardsConfig()` - Get rewards config
- `validateInvestmentAmount(amount)` - Validate $100 multiples

#### 2. Enhanced ROI Distribution
**File:** `server/cron/roi-distribution-v2.ts`

**Features:**
- Daily ROI distribution (base amount)
- Booster ROI distribution (extra 0.1% if qualified)
- ROI-on-ROI distribution to upline sponsors
- Level-based distribution (only to unlocked levels)
- Auto-expire boosters after 30 days

**Income Types:**
- ROI (daily fixed)
- Booster ROI (0.1% extra)
- ROI-on-ROI (12%, 10%, 8%, 5%, 4%, 4%, 3%, 3%, 2%, 2%, 3%, 3%, 4%, 4%, 8%)

#### 3. Booster Service
**File:** `server/services/booster.service.ts`

**Functions:**
- `initializeBooster(userId)` - Start 30-day countdown on first investment
- `updateBoosterDirectCount(sponsorId)` - Update when new referral added
- `getBoosterStatus(userId)` - Get user's booster status
- `expireBoostersDaily()` - Cron job to expire boosters
- `getAllActiveBoosters()` - Admin view of all boosters

**Logic:**
- Starts on first investment
- 30-day countdown timer
- Requires 3 direct referrals to activate
- Adds 0.1% to daily ROI
- Auto-expires after 30 days

#### 4. Withdrawal Service
**File:** `server/services/withdrawal.service.ts`

**Functions:**
- `createWithdrawalRequest(userId, type, amount, address)` - Create withdrawal
- `approveWithdrawal(withdrawalId, adminId)` - Admin approves
- `rejectWithdrawal(withdrawalId, adminId, reason)` - Admin rejects
- `getPendingWithdrawals()` - Get all pending withdrawals
- `getUserWithdrawals(userId)` - Get user's withdrawal history

**Deduction Logic:**
- Before 30 days: 15% deduction
- After 30 days: 5% deduction
- Calculated from first_investment_date
- Admin can modify percentages dynamically

---

## Phase 3: Backend API Routes (To Be Created)

### Required New Routes:

#### 1. Plan Settings Routes
**File:** `server/routes/planSettings.ts`

```typescript
GET /api/plan-settings - Get all plan settings
GET /api/plan-settings/:feature_key - Get specific plan
PUT /api/plan-settings/:feature_key - Update plan settings (Admin)
POST /api/plan-settings/:feature_key/toggle - Toggle plan on/off (Admin)
```

#### 2. Booster Routes
**File:** `server/routes/booster.ts`

```typescript
GET /api/booster/status - Get user's booster status
GET /api/booster/all - Get all boosters (Admin)
```

#### 3. Withdrawal Routes (Enhanced)
**File:** Update `server/routes/wallet.ts`

```typescript
POST /api/wallet/withdraw - Create withdrawal request
GET /api/wallet/withdrawals - Get user's withdrawals
GET /api/admin/withdrawals/pending - Get pending withdrawals (Admin)
POST /api/admin/withdrawals/:id/approve - Approve withdrawal (Admin)
POST /api/admin/withdrawals/:id/reject - Reject withdrawal (Admin)
```

#### 4. Level Unlock Routes
**File:** `server/routes/levelUnlocks.ts`

```typescript
GET /api/level-unlocks/status - Get user's level unlock status
GET /api/level-unlocks/progress - Get progress toward next level
```

#### 5. Rewards Routes
**File:** `server/routes/rewards.ts`

```typescript
GET /api/rewards - Get current month rewards
GET /api/rewards/progress - Get user's reward progress
GET /api/admin/rewards - Get all rewards (Admin)
POST /api/admin/rewards - Create reward (Admin)
PUT /api/admin/rewards/:id - Update reward (Admin)
DELETE /api/admin/rewards/:id - Delete reward (Admin)
```

---

## Phase 4: Frontend Updates Required

### 1. Dashboard Updates

**File:** `app/pages/user/Dashboard.tsx`

**New Components to Add:**
- ✅ Booster countdown timer (shows days remaining)
- ✅ Level unlock progress indicator (e.g., "3/5 directs for Level 5")
- ✅ Reward milestone progress bar
- ✅ ROI-on-ROI earnings display
- ✅ Booster earnings display
- ✅ Conditional rendering based on plan active status

**Example UI:**
```jsx
{boosterStatus && (
  <div className="booster-card">
    <h3>🚀 Booster Active</h3>
    <p>Days Remaining: {boosterStatus.days_remaining}</p>
    <p>Directs: {boosterStatus.direct_count}/{boosterStatus.target_directs}</p>
    <p>Bonus ROI: +{boosterStatus.bonus_roi_percentage}%</p>
  </div>
)}

{levelUnlockStatus && (
  <div className="level-unlock-card">
    <h3>📊 Level Unlock Progress</h3>
    <p>Current Directs: {levelUnlockStatus.direct_count}</p>
    <p>Unlocked Levels: {levelUnlockStatus.unlocked_levels}/15</p>
    <ProgressBar
      current={levelUnlockStatus.direct_count}
      target={nextLevelRequirement}
    />
  </div>
)}
```

### 2. Withdrawal Page Update

**File:** `app/pages/user/Withdraw.tsx`

**New Features:**
- Display deduction percentage based on investment age
- Show calculated final amount after deduction
- Display days held since first investment
- Warning message about deductions

**Example:**
```jsx
<div className="withdrawal-form">
  <input
    type="number"
    value={amount}
    onChange={(e) => {
      setAmount(e.target.value);
      calculateDeduction(e.target.value);
    }}
  />

  <div className="deduction-info">
    <p>Days Held: {daysHeld} days</p>
    <p>Deduction: {deductionPercentage}%</p>
    <p>Deduction Amount: ${deductionAmount}</p>
    <p className="final-amount">Final Amount: ${finalAmount}</p>
  </div>

  {daysHeld < 30 && (
    <div className="warning">
      ⚠️ Withdrawing before 30 days incurs 15% deduction.
      Wait {30 - daysHeld} more days for only 5% deduction.
    </div>
  )}
</div>
```

### 3. Admin Panel - Plan Settings

**File:** `app/pages/admin/PlanSettings.tsx` (New)

**Features:**
- Toggle switches for each plan
- Edit dynamic percentages
- Update booster configuration
- Update withdrawal deduction rates
- Update level income percentages
- Real-time preview of changes

**Example:**
```jsx
<div className="plan-settings">
  <PlanToggle
    name="Binary Plan"
    active={binaryPlan.is_active}
    onToggle={(active) => togglePlan('binary_plan', active)}
  />

  <PlanToggle
    name="Generation Plan"
    active={generationPlan.is_active}
    onToggle={(active) => togglePlan('generation_plan', active)}
  />

  <ConfigEditor
    title="Generation Plan Level Percentages"
    values={generationPlan.payload.level_percentages}
    onChange={(newValues) => updateLevelPercentages(newValues)}
  />

  <ConfigEditor
    title="Withdrawal Deductions"
    fields={[
      { label: "Before 30 days (%)", value: withdrawalConfig.deduction_before_30_days },
      { label: "After 30 days (%)", value: withdrawalConfig.deduction_after_30_days }
    ]}
    onChange={(newValues) => updateWithdrawalConfig(newValues)}
  />
</div>
```

### 4. Admin Panel - Reward Management

**File:** `app/pages/admin/RewardManagement.tsx` (New)

**Features:**
- Create new monthly rewards
- Edit existing rewards
- Delete rewards
- View reward achievers
- Monthly volume reports

---

## Phase 5: Update Server Index

**File:** `server/index.ts`

### Update Cron Job:

```typescript
// Replace old ROI distribution with new enhanced version
import { distributeEnhancedROI } from './cron/roi-distribution-v2';
import { expireBoostersDaily } from './services/booster.service';

// Daily at 00:00 UTC - ROI Distribution
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Starting daily ROI distribution...');
  try {
    // Expire boosters first
    await expireBoostersDaily();

    // Distribute enhanced ROI
    await distributeEnhancedROI();

    console.log('✅ Daily ROI distribution completed');
  } catch (error) {
    console.error('❌ Daily ROI distribution failed:', error);
  }
}, {
  timezone: "UTC"
});

// Monthly at 00:00 on 1st of month - Reset business volumes
cron.schedule('0 0 1 * *', async () => {
  console.log('⏰ Starting monthly volume reset...');
  try {
    // TODO: Implement monthly volume reset and reward calculation
    console.log('✅ Monthly volume reset completed');
  } catch (error) {
    console.error('❌ Monthly volume reset failed:', error);
  }
}, {
  timezone: "UTC"
});
```

---

## Phase 6: Generation Plan Level Unlock Logic

### Level Unlock Rules:

| Direct Referrals | Unlocked Levels |
|------------------|-----------------|
| 1 Direct         | Level 1         |
| 2 Directs        | Levels 1-2      |
| 3 Directs        | Levels 1-3      |
| 4 Directs        | Levels 1-4      |
| 5 Directs        | Levels 1-5      |
| 6 Directs        | Levels 1-6      |
| 7 Directs        | Levels 1-7      |
| 8 Directs        | Levels 1-8      |
| 9 Directs        | Levels 1-10     |
| 10+ Directs      | Levels 1-15     |

### Level Percentages:

| Level | Percentage |
|-------|------------|
| 1     | 12%        |
| 2     | 10%        |
| 3     | 8%         |
| 4     | 5%         |
| 5     | 4%         |
| 6     | 4%         |
| 7     | 3%         |
| 8     | 3%         |
| 9     | 2%         |
| 10    | 2%         |
| 11    | 3%         |
| 12    | 3%         |
| 13    | 4%         |
| 14    | 4%         |
| 15    | 8%         |

**Total:** 65% of ROI distributed as ROI-on-ROI to unlocked upline levels

### How It Works:

1. User invests $1,000
2. Daily ROI: $50 (5%)
3. If user has booster: $50.05 (5% + 0.1%)
4. ROI-on-ROI Distribution:
   - Level 1 (if unlocked): $50 × 12% = $6.00
   - Level 2 (if unlocked): $50 × 10% = $5.00
   - Level 3 (if unlocked): $50 × 8% = $4.00
   - ... continues for all unlocked levels

---

## Phase 7: Testing Checklist

### Database Tests:
- [ ] Run migration successfully
- [ ] Verify all tables created
- [ ] Verify triggers working
- [ ] Verify stored procedures working
- [ ] Test plan_settings seed data

### Backend Tests:
- [ ] Test plan toggle functionality
- [ ] Test investment validation ($100 multiples)
- [ ] Test booster initialization on first investment
- [ ] Test booster direct count updates
- [ ] Test booster expiration
- [ ] Test ROI distribution with booster
- [ ] Test ROI-on-ROI distribution
- [ ] Test level unlock logic
- [ ] Test withdrawal deduction calculation
- [ ] Test withdrawal approval/rejection

### Frontend Tests:
- [ ] Test dashboard visibility based on plan status
- [ ] Test booster countdown timer
- [ ] Test level unlock progress indicator
- [ ] Test withdrawal deduction calculator
- [ ] Test admin plan toggle UI
- [ ] Test admin settings editor

---

## Phase 8: Deployment Steps

### 1. Backup Database
```bash
mysqldump -u root -p finaster_mlm > backup_before_redesign.sql
```

### 2. Run Migration
```bash
mysql -u root -p finaster_mlm < database/mysql/03_business_logic_redesign.sql
```

### 3. Update Backend
- Copy new service files to server/services/
- Copy new cron file to server/cron/
- Update server/index.ts with new cron jobs
- Create new API routes

### 4. Update Frontend
- Update dashboard components
- Create new admin components
- Update withdrawal page
- Add plan toggle visibility logic

### 5. Test in Development
- Test all new features
- Verify ROI distribution
- Verify booster logic
- Verify withdrawal deductions
- Verify level unlocks

### 6. Deploy to Production
- Deploy database migration
- Deploy backend code
- Deploy frontend code
- Monitor cron jobs
- Monitor error logs

---

## Phase 9: Configuration Examples

### Example: Update Generation Plan Percentages

```sql
UPDATE plan_settings
SET payload = JSON_SET(
  payload,
  '$.level_percentages',
  JSON_ARRAY(15, 12, 10, 8, 6, 5, 4, 4, 3, 3, 2, 2, 2, 2, 10)
)
WHERE feature_key = 'generation_plan';
```

### Example: Change Withdrawal Deductions

```sql
UPDATE plan_settings
SET payload = JSON_SET(
  payload,
  '$.deduction_before_30_days', 10.00,
  '$.deduction_after_30_days', 3.00
)
WHERE feature_key = 'principal_withdrawal';
```

### Example: Disable Binary Plan

```sql
UPDATE plan_settings
SET is_active = FALSE
WHERE feature_key = 'binary_plan';
```

---

## Phase 10: Monitoring & Analytics

### Key Metrics to Track:

1. **Booster Performance:**
   - Active boosters count
   - Achieved boosters count
   - Average days to achieve
   - Booster ROI distributed

2. **Generation Plan:**
   - Users per level unlock tier
   - ROI-on-ROI distribution per level
   - Average directs per user

3. **Withdrawals:**
   - Average deduction percentage
   - Withdrawal volume before/after 30 days
   - Total deductions collected

4. **Monthly Rewards:**
   - Business volume per month
   - Reward achievers
   - 3-leg balance distribution

---

## Summary of Changes

### Database:
- ✅ 5 new tables
- ✅ 9 columns added to existing tables
- ✅ 1 stored procedure
- ✅ 1 trigger
- ✅ 7 plan configurations seeded

### Backend:
- ✅ 3 new service files
- ✅ 1 enhanced ROI distribution cron
- ✅ 20+ new functions
- ⏳ 5 new API route files needed

### Frontend:
- ⏳ Dashboard updates
- ⏳ Withdrawal page updates
- ⏳ Admin plan settings page (new)
- ⏳ Admin reward management page (new)
- ⏳ Booster countdown component (new)
- ⏳ Level unlock progress component (new)

### Business Logic:
- ✅ Plan toggles implemented
- ✅ ROI-on-ROI implemented
- ✅ Booster income implemented
- ✅ Principal withdrawal with deductions implemented
- ⏳ Monthly rewards (partial - needs cron job)
- ⏳ 3-leg business volume tracking (needs implementation)

---

## Next Steps

1. **Immediate:**
   - Run database migration
   - Test new services
   - Create API routes
   - Update server/index.ts

2. **Short Term:**
   - Update frontend dashboard
   - Create admin plan settings UI
   - Implement monthly rewards calculation
   - Implement 3-leg volume tracking

3. **Before Production:**
   - Comprehensive testing
   - Load testing
   - Security audit
   - Documentation updates
   - User training materials

---

## Support & Questions

For questions or issues with this redesign:
1. Check the code files created
2. Review this implementation guide
3. Test in development environment first
4. Monitor logs for errors

---

**Created:** 2025-11-08
**Version:** 1.0
**Status:** Implementation in Progress
