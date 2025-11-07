# ⏰ DAILY ROI CRON JOB SETUP

**Purpose:** Automatically distribute ROI to users every day at midnight

---

## 🎯 QUICK SETUP (5 minutes)

### Method 1: Using pg_cron (Recommended)

**Enable pg_cron extension:**

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Schedule Daily ROI Distribution:**

```sql
-- Schedule to run every day at midnight UTC
SELECT cron.schedule(
  'daily-roi-distribution',           -- Job name
  '0 0 * * *',                         -- Every day at 00:00 (midnight)
  'SELECT distribute_daily_roi();'     -- Function to execute
);
```

**Verify Cron Job Created:**

```sql
-- Check scheduled jobs
SELECT * FROM cron.job;

-- Should show:
-- jobname: daily-roi-distribution
-- schedule: 0 0 * * *
-- command: SELECT distribute_daily_roi();
-- active: true
```

**Schedule Binary Volume Updates (Optional but Recommended):**

```sql
-- Update binary volumes every hour
SELECT cron.schedule(
  'hourly-binary-volume-update',
  '0 * * * *',                          -- Every hour at :00
  'SELECT update_binary_volumes();'
);
```

---

## 🔍 TEST THE CRON JOB

### Manual Test (Before Scheduling):

```sql
-- Test the function works
SELECT distribute_daily_roi();

-- Check results
SELECT
  COUNT(*) as transactions_created,
  SUM(amount) as total_roi_distributed
FROM mlm_transactions
WHERE transaction_type = 'roi_distribution'
  AND created_at > NOW() - INTERVAL '1 minute';
```

### Force Immediate Execution:

```sql
-- Manually trigger the cron job (for testing)
SELECT cron.schedule(
  'test-roi-now',
  '* * * * *',                    -- Every minute (for testing only!)
  'SELECT distribute_daily_roi();'
);

-- Wait 1 minute, then remove test job:
SELECT cron.unschedule('test-roi-now');
```

---

## 📊 MONITORING CRON JOBS

### Check Job Execution History:

```sql
-- View cron job run history
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### Check For Errors:

```sql
-- Find failed cron jobs
SELECT *
FROM cron.job_run_details
WHERE status != 'succeeded'
ORDER BY start_time DESC;
```

---

## 🛠️ CRON SCHEDULE EXAMPLES

```
# ┌───────────── minute (0 - 59)
# │ ┌───────────── hour (0 - 23)
# │ │ ┌───────────── day of month (1 - 31)
# │ │ │ ┌───────────── month (1 - 12)
# │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
# │ │ │ │ │
# * * * * *

# Common schedules:
'0 0 * * *'      # Daily at midnight
'0 */6 * * *'    # Every 6 hours
'0 0 * * 0'      # Every Sunday at midnight
'0 1 * * *'      # Daily at 1:00 AM
'0 0 1 * *'      # First day of every month
'*/15 * * * *'   # Every 15 minutes
'0 * * * *'      # Every hour
```

---

## ⚡ ALTERNATIVE: Supabase Edge Functions

If pg_cron is not available, use Supabase Edge Functions:

### Create Edge Function:

```typescript
// supabase/functions/daily-roi/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call the distribute_daily_roi function
    const { data, error } = await supabaseClient.rpc('distribute_daily_roi')

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, message: 'ROI distributed successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Schedule via GitHub Actions:

```yaml
# .github/workflows/daily-roi.yml

name: Daily ROI Distribution

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:      # Allow manual trigger

jobs:
  distribute-roi:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://dsgtyrwtlpnckvcozfbc.functions.supabase.co/daily-roi
```

---

## 🧪 TESTING & VERIFICATION

### Daily Verification Query:

```sql
-- Check today's ROI distributions
SELECT
  COUNT(DISTINCT user_id) as users_paid,
  COUNT(*) as transactions,
  SUM(amount) as total_distributed
FROM mlm_transactions
WHERE transaction_type = 'roi_distribution'
  AND DATE(created_at) = CURRENT_DATE;
```

### Monitor User Earnings Growth:

```sql
-- Track total earnings over time
SELECT
  DATE(created_at) as distribution_date,
  COUNT(DISTINCT user_id) as users,
  SUM(amount) as daily_total
FROM mlm_transactions
WHERE transaction_type = 'roi_distribution'
GROUP BY DATE(created_at)
ORDER BY distribution_date DESC
LIMIT 30;
```

---

## ⚠️ IMPORTANT NOTES

### Timezone Considerations:

```sql
-- pg_cron runs in UTC by default
-- To run at midnight in your timezone (e.g., PST = UTC-8):
-- Use: '0 8 * * *' for midnight PST
-- Use: '0 5 * * *' for midnight EST

-- Or set timezone in function:
SET timezone = 'America/Los_Angeles';
```

### Error Handling:

The `distribute_daily_roi()` function is designed to be idempotent:
- ✅ Safe to run multiple times per day
- ✅ Only distributes once per package per day
- ✅ Checks `last_roi_date` to prevent duplicates
- ✅ Handles package expiration automatically

---

## 🎯 VERIFICATION CHECKLIST

After setup, verify:

- [ ] pg_cron extension enabled
- [ ] Cron job scheduled (check `cron.job`)
- [ ] Function executes successfully (manual test)
- [ ] Transactions created in `mlm_transactions`
- [ ] User `total_earnings` updated
- [ ] Package `total_roi_earned` incremented
- [ ] `last_roi_date` updated to today
- [ ] No duplicate distributions for same day

---

## 🔄 MAINTENANCE

### Update Cron Schedule:

```sql
-- Remove old schedule
SELECT cron.unschedule('daily-roi-distribution');

-- Add new schedule
SELECT cron.schedule(
  'daily-roi-distribution',
  '0 1 * * *',  -- New time: 1:00 AM instead of midnight
  'SELECT distribute_daily_roi();'
);
```

### Pause/Resume Cron:

```sql
-- Pause (soft delete)
UPDATE cron.job
SET active = false
WHERE jobname = 'daily-roi-distribution';

-- Resume
UPDATE cron.job
SET active = true
WHERE jobname = 'daily-roi-distribution';
```

### Remove Cron:

```sql
-- Permanently remove
SELECT cron.unschedule('daily-roi-distribution');
```

---

## 📊 EXPECTED DAILY RESULTS

With your current setup:
- **Users with active packages:** ~1
- **Daily ROI per package:** $500 (if 5% of $10,000)
- **Expected daily distribution:** $500+
- **Monthly cumulative:** $15,000+

---

## ✅ SUCCESS CRITERIA

Cron setup is complete when:
- [x] pg_cron extension enabled
- [x] Job scheduled and active
- [x] Manual test succeeds
- [x] Transactions appear in database
- [x] Job runs automatically at midnight
- [x] No errors in `cron.job_run_details`

---

**Ready to Schedule?** Run the SQL commands above in Supabase SQL Editor!
