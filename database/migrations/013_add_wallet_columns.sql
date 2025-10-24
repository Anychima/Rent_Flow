-- Migration 013: Add wallet connection columns to users table
-- Purpose: Store Circle and Phantom wallet information for users
-- Date: 2025-10-24

BEGIN;

-- Add wallet columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS circle_wallet_id TEXT,
ADD COLUMN IF NOT EXISTS phantom_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS preferred_wallet_type TEXT CHECK (preferred_wallet_type IN ('circle', 'phantom'));

-- Add indexes for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_circle_wallet 
ON users(circle_wallet_id) WHERE circle_wallet_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_phantom_wallet 
ON users(phantom_wallet_address) WHERE phantom_wallet_address IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.circle_wallet_id IS 'Circle Developer Controlled Wallet ID for this user';
COMMENT ON COLUMN users.phantom_wallet_address IS 'Phantom wallet public address for this user';
COMMENT ON COLUMN users.preferred_wallet_type IS 'User preferred wallet type for transactions';

COMMIT;

-- Verify migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'circle_wallet_id'
  ) THEN
    RAISE NOTICE '✅ circle_wallet_id column added to users table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add circle_wallet_id column';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'phantom_wallet_address'
  ) THEN
    RAISE NOTICE '✅ phantom_wallet_address column added to users table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add phantom_wallet_address column';
  END IF;

  RAISE NOTICE '✅ MIGRATION 013 COMPLETE!';
  RAISE NOTICE 'Users can now connect Circle or Phantom wallets';
  RAISE NOTICE 'Wallet information will persist across sessions';
END $$;
