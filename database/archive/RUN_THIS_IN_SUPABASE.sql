-- ========================================
-- RentFlow AI - Database Update Script
-- Run this ONCE in Supabase SQL Editor
-- ========================================
-- This script adds:
-- 1. Missing lease table columns for lease generation
-- 2. Chat support for landlord-applicant communication
-- ========================================

-- ==========================================
-- PART 1: Fix Leases Table
-- ==========================================

-- Add new columns to leases table for digital signing workflow
ALTER TABLE leases
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES property_applications(id),
ADD COLUMN IF NOT EXISTS lease_document_url TEXT,
ADD COLUMN IF NOT EXISTS lease_document_hash TEXT,
ADD COLUMN IF NOT EXISTS tenant_signature TEXT,
ADD COLUMN IF NOT EXISTS tenant_signature_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS landlord_signature TEXT,
ADD COLUMN IF NOT EXISTS landlord_signature_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signature_transaction_hash TEXT,
ADD COLUMN IF NOT EXISTS signature_blockchain_network TEXT DEFAULT 'solana',
ADD COLUMN IF NOT EXISTS lease_status TEXT DEFAULT 'draft' CHECK (lease_status IN (
    'draft',           -- Generated but not signed
    'pending_tenant',  -- Waiting for tenant signature
    'pending_landlord',-- Waiting for landlord signature  
    'fully_signed',    -- Both parties signed
    'active',          -- Lease is active
    'expired',         -- Lease term ended
    'terminated'       -- Lease terminated early
)),
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS special_terms JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_leases_application ON leases(application_id);
CREATE INDEX IF NOT EXISTS idx_leases_lease_status ON leases(lease_status);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_signature ON leases(tenant_signature_date);

-- Add comments for documentation
COMMENT ON COLUMN leases.application_id IS 'Reference to the approved application that generated this lease';
COMMENT ON COLUMN leases.lease_status IS 'Current lease workflow status';
COMMENT ON COLUMN leases.special_terms IS 'JSON object containing any special lease terms or conditions';

-- ==========================================
-- PART 2: Add Chat Support
-- ==========================================

-- Add application_id to messages table for pre-lease communication
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES property_applications(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_application ON messages(application_id);

-- Add comment for documentation
COMMENT ON COLUMN messages.application_id IS 'Reference to application for pre-lease landlord-applicant communication';

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Verify leases table structure
SELECT 'Leases table columns:' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leases' 
  AND column_name IN ('application_id', 'lease_status', 'special_terms', 'generated_at')
ORDER BY ordinal_position;

-- Verify messages table structure
SELECT 'Messages table columns:' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name = 'application_id'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Database update completed successfully!' AS status;
SELECT '📝 You can now use the lease generation and chat features.' AS message;
