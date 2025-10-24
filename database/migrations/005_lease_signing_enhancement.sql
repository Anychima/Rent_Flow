-- Migration: Enhance Leases Table for Digital Signing
-- This migration adds fields needed for the digital lease signing workflow

-- Add new columns to leases table
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

-- Update existing status column to align with new lease_status
-- Keep the old status for backward compatibility
COMMENT ON COLUMN leases.status IS 'Legacy status field - use lease_status instead';
COMMENT ON COLUMN leases.lease_status IS 'Current lease workflow status';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leases_application ON leases(application_id);
CREATE INDEX IF NOT EXISTS idx_leases_lease_status ON leases(lease_status);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_signature ON leases(tenant_signature_date);

-- Add comments for documentation
COMMENT ON COLUMN leases.application_id IS 'Reference to the approved application that generated this lease';
COMMENT ON COLUMN leases.lease_document_url IS 'URL to the generated PDF lease document';
COMMENT ON COLUMN leases.lease_document_hash IS 'SHA-256 hash of the lease document for integrity verification';
COMMENT ON COLUMN leases.tenant_signature IS 'Tenant wallet signature or digital signature';
COMMENT ON COLUMN leases.landlord_signature IS 'Landlord/Manager wallet signature';
COMMENT ON COLUMN leases.signature_transaction_hash IS 'Blockchain transaction hash for the signature event';
COMMENT ON COLUMN leases.special_terms IS 'JSON object containing any special lease terms or conditions';

-- Sample special_terms structure:
-- {
--   "pet_policy": "One small dog allowed, $25/month pet rent",
--   "parking": "One assigned parking spot #42",
--   "utilities_included": ["water", "trash"],
--   "additional_clauses": ["No smoking anywhere on property"]
-- }
