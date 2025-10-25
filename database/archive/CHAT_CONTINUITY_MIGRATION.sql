-- ============================================================
-- CHAT CONTINUITY & WALLET INFO MIGRATION
-- ============================================================
-- Allows chat to continue from application to lease
-- Stores wallet information for payments
-- ============================================================

-- Step 1: Add lease_id to messages table
SELECT '📝 STEP 1: Adding lease_id to messages table' as section;
SELECT '=' as separator;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES leases(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_messages_lease ON messages(lease_id);

-- Add comment for documentation
COMMENT ON COLUMN messages.lease_id IS 'Reference to lease for tenant-manager communication after lease signing. When lease is signed, application messages are migrated here.';

SELECT '✅ lease_id column added to messages table' as status;
SELECT '=' as separator;

-- Step 2: Add wallet information to leases table
SELECT '💰 STEP 2: Adding wallet info to leases table' as section;
SELECT '=' as separator;

ALTER TABLE leases
ADD COLUMN IF NOT EXISTS manager_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS manager_wallet_type TEXT CHECK (manager_wallet_type IN ('phantom', 'circle')),
ADD COLUMN IF NOT EXISTS manager_wallet_id TEXT,
ADD COLUMN IF NOT EXISTS tenant_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS tenant_wallet_type TEXT CHECK (tenant_wallet_type IN ('phantom', 'circle')),
ADD COLUMN IF NOT EXISTS tenant_wallet_id TEXT;

-- Add comments
COMMENT ON COLUMN leases.manager_wallet_address IS 'Manager blockchain wallet address for receiving payments';
COMMENT ON COLUMN leases.manager_wallet_type IS 'Type of wallet used by manager (phantom or circle)';
COMMENT ON COLUMN leases.manager_wallet_id IS 'Circle wallet ID if manager uses Circle wallet';
COMMENT ON COLUMN leases.tenant_wallet_address IS 'Tenant blockchain wallet address for making payments';
COMMENT ON COLUMN leases.tenant_wallet_type IS 'Type of wallet used by tenant (phantom or circle)';
COMMENT ON COLUMN leases.tenant_wallet_id IS 'Circle wallet ID if tenant uses Circle wallet';

SELECT '✅ Wallet columns added to leases table' as status;
SELECT '=' as separator;

-- Step 3: Verify changes
SELECT '🔍 STEP 3: Verification' as section;
SELECT '=' as separator;

SELECT 'Messages table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('application_id', 'lease_id')
ORDER BY ordinal_position;

SELECT 'Leases table wallet columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leases' 
  AND column_name LIKE '%wallet%'
ORDER BY ordinal_position;

SELECT '=' as separator;

-- Step 4: Success message
SELECT '✅ MIGRATION COMPLETE!' as status;
SELECT '📋 Chat can now continue from applications to leases' as message_1;
SELECT '💳 Wallet information can be stored with leases' as message_2;
SELECT '🚀 Ready to implement payment flow improvements' as message_3;
SELECT '=' as separator;
