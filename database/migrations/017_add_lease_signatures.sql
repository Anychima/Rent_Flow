-- Add blockchain and signature fields to leases table
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS blockchain_transaction_hash TEXT,
ADD COLUMN IF NOT EXISTS tenant_signature TEXT,
ADD COLUMN IF NOT EXISTS landlord_signature TEXT,
ADD COLUMN IF NOT EXISTS tenant_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS landlord_signed_at TIMESTAMP WITH TIME ZONE;

-- Create index for blockchain lookups
CREATE INDEX IF NOT EXISTS idx_leases_blockchain_tx ON leases(blockchain_transaction_hash);
CREATE INDEX IF NOT EXISTS idx_leases_blockchain_id ON leases(blockchain_lease_id);
