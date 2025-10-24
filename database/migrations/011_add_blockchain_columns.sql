-- Migration 011: Add Blockchain Tracking Columns
-- Purpose: Track on-chain lease storage and signatures
-- Network: Solana Devnet

BEGIN;

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.migration_log (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  description TEXT
);

-- Add blockchain columns to leases table
ALTER TABLE leases
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS lease_hash TEXT,
ADD COLUMN IF NOT EXISTS on_chain BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manager_signature_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS tenant_signature_tx_hash TEXT;

-- Add index for blockchain lookups
CREATE INDEX IF NOT EXISTS idx_leases_blockchain_tx 
ON leases(blockchain_tx_hash) WHERE blockchain_tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leases_lease_hash 
ON leases(lease_hash) WHERE lease_hash IS NOT NULL;

-- Add blockchain columns to payments table
ALTER TABLE rent_payments
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS on_chain BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blockchain_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add index for payment blockchain lookups
CREATE INDEX IF NOT EXISTS idx_rent_payments_blockchain_tx 
ON rent_payments(blockchain_tx_hash) WHERE blockchain_tx_hash IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN leases.blockchain_tx_hash IS 'Solana transaction hash for lease creation';
COMMENT ON COLUMN leases.lease_hash IS 'SHA256 hash of lease data stored on-chain';
COMMENT ON COLUMN leases.on_chain IS 'Whether lease has been recorded on blockchain';
COMMENT ON COLUMN leases.manager_signature_tx_hash IS 'Solana transaction hash for manager signature';
COMMENT ON COLUMN leases.tenant_signature_tx_hash IS 'Solana transaction hash for tenant signature';

COMMENT ON COLUMN rent_payments.blockchain_tx_hash IS 'Solana transaction hash for payment';
COMMENT ON COLUMN rent_payments.on_chain IS 'Whether payment has been confirmed on blockchain';
COMMENT ON COLUMN rent_payments.blockchain_confirmed_at IS 'Timestamp when blockchain confirmed the payment';

-- Log migration
INSERT INTO public.migration_log (migration_name, executed_at)
VALUES ('011_add_blockchain_columns', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leases' 
    AND column_name = 'blockchain_tx_hash'
  ) THEN
    RAISE NOTICE '✅ blockchain_tx_hash column added to leases table';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leases' 
    AND column_name = 'lease_hash'
  ) THEN
    RAISE NOTICE '✅ lease_hash column added to leases table';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rent_payments' 
    AND column_name = 'blockchain_tx_hash'
  ) THEN
    RAISE NOTICE '✅ blockchain_tx_hash column added to rent_payments table';
  END IF;

  RAISE NOTICE '✅ MIGRATION 011 COMPLETE!';
END $$;
