-- Migration: Fix Payment and Micropayment Tables
-- Date: 2025-10-22
-- Purpose: Add missing payment_type column and ensure micropayments table exists

-- 1. Add payment_type column to rent_payments if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rent_payments' 
        AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE rent_payments 
        ADD COLUMN payment_type TEXT DEFAULT 'rent' 
        CHECK (payment_type IN ('rent', 'security_deposit', 'late_fee', 'other'));
        
        RAISE NOTICE 'Added payment_type column to rent_payments table';
    ELSE
        RAISE NOTICE 'payment_type column already exists in rent_payments table';
    END IF;
END $$;

-- 2. Create micropayments table if it doesn't exist
CREATE TABLE IF NOT EXISTS micropayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    amount_usdc DECIMAL(20,6) NOT NULL,
    purpose TEXT NOT NULL,
    transaction_hash TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    blockchain_network TEXT DEFAULT 'solana',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for micropayments if they don't exist
CREATE INDEX IF NOT EXISTS idx_micropayments_from_user ON micropayments(from_user_id);
CREATE INDEX IF NOT EXISTS idx_micropayments_to_user ON micropayments(to_user_id);
CREATE INDEX IF NOT EXISTS idx_micropayments_status ON micropayments(status);
CREATE INDEX IF NOT EXISTS idx_micropayments_created_at ON micropayments(created_at);

-- 4. Add comment to describe the micropayments table
COMMENT ON TABLE micropayments IS 'Micropayments table for small USDC transfers between users (max $10)';

-- 5. Verify changes
DO $$
DECLARE
    payment_type_exists BOOLEAN;
    micropayments_exists BOOLEAN;
BEGIN
    -- Check payment_type column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rent_payments' 
        AND column_name = 'payment_type'
    ) INTO payment_type_exists;
    
    -- Check micropayments table
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'micropayments'
    ) INTO micropayments_exists;
    
    RAISE NOTICE '=== Migration Verification ===';
    RAISE NOTICE 'payment_type column exists: %', payment_type_exists;
    RAISE NOTICE 'micropayments table exists: %', micropayments_exists;
    
    IF payment_type_exists AND micropayments_exists THEN
        RAISE NOTICE '✅ Migration completed successfully!';
    ELSE
        RAISE WARNING '⚠️ Migration may be incomplete';
    END IF;
END $$;
