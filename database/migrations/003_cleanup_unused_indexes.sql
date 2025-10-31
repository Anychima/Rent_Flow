-- Migration: Review and potentially remove unused indexes
-- IMPORTANT: Only run this AFTER verifying these indexes are truly unused in production
-- Check query patterns first before dropping any indexes

-- First, let's check which indexes are actually unused
-- Run this query first to verify:
-- SELECT schemaname, tablename, indexname 
-- FROM pg_stat_user_indexes 
-- WHERE idx_scan = 0 AND schemaname = 'public'
-- ORDER BY tablename, indexname;

-- Based on Performance Advisor suggestions, consider dropping these IF confirmed unused:

-- WARNING: Do NOT drop these yet - verify first!
-- Uncomment only after confirming they're truly unused

-- DROP INDEX IF EXISTS public.users_some_unused_index; -- Replace with actual index name
-- DROP INDEX IF EXISTS public.leases_unused_index_1; -- Replace with actual index name  
-- DROP INDEX IF EXISTS public.leases_unused_index_2; -- Replace with actual index name
-- DROP INDEX IF EXISTS public.rent_payments_unused_index; -- Replace with actual index name
-- DROP INDEX IF EXISTS public.properties_unused_index; -- Replace with actual index name

-- Instead, let's add indexes that WILL be used:

-- Index for filtering properties by status and owner
CREATE INDEX IF NOT EXISTS idx_properties_active_owner ON public.properties(is_active, owner_id) WHERE is_active = true;

-- Index for lease queries by status and dates
CREATE INDEX IF NOT EXISTS idx_leases_status_dates ON public.leases(status, start_date, end_date);

-- Index for active leases lookup
CREATE INDEX IF NOT EXISTS idx_leases_active ON public.leases(property_id, tenant_id) WHERE status = 'active';

-- Partial index for pending payments
CREATE INDEX IF NOT EXISTS idx_payments_pending ON public.rent_payments(tenant_id, due_date) WHERE status = 'pending';

-- Index for user lookups by email (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Index for user lookups by role
CREATE INDEX IF NOT EXISTS idx_users_role_active ON public.users(role, is_active) WHERE is_active = true;

COMMENT ON INDEX idx_properties_active_owner IS 'Optimized index for active property listings by owner';
COMMENT ON INDEX idx_leases_status_dates IS 'Index for lease filtering by status and date range';
COMMENT ON INDEX idx_leases_active IS 'Partial index for active lease lookups';
COMMENT ON INDEX idx_payments_pending IS 'Partial index for pending payment queries';
