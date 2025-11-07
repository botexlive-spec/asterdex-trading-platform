-- ============================================================================
-- FIX RLS POLICIES - Allow users to read their own data
-- ============================================================================

-- 1. Enable RLS on tables (if not already enabled)
ALTER TABLE user_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mlm_transactions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own packages" ON user_packages;
DROP POLICY IF EXISTS "Users can view their own transactions" ON mlm_transactions;

-- 3. Create policies to allow users to read their own data
CREATE POLICY "Users can view their own packages"
ON user_packages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions"
ON mlm_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Verify policies were created
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_packages', 'mlm_transactions')
ORDER BY tablename, policyname;
