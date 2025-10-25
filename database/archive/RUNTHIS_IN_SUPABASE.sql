-- ============================================================
-- RentFlow AI - Database Migration
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- Step 1: Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'prospective_tenant' 
CHECK (role IN ('prospective_tenant', 'manager', 'tenant'));

-- Update existing users to have appropriate roles
UPDATE users 
SET role = CASE 
    WHEN user_type = 'property_manager' THEN 'manager'
    WHEN user_type = 'tenant' THEN 'tenant'
    ELSE 'prospective_tenant'
END
WHERE role IS NULL OR role = 'prospective_tenant';

-- Step 2: Enhance properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_date DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_generated_description TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS application_count INTEGER DEFAULT 0;

-- Step 3: Create Property Applications Table
CREATE TABLE IF NOT EXISTS property_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Application Details
    status TEXT DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'under_review', 'approved', 'rejected', 'withdrawn', 'lease_signed'
    )),
    
    -- Applicant Information
    employment_status TEXT,
    employer_name TEXT,
    monthly_income_usdc DECIMAL(20,6),
    years_at_current_job DECIMAL(4,2),
    
    -- Rental History
    previous_landlord_name TEXT,
    previous_landlord_contact TEXT,
    years_at_previous_address DECIMAL(4,2),
    reason_for_moving TEXT,
    
    -- References
    applicant_references JSONB DEFAULT '[]'::jsonb,
    
    -- AI Scoring
    ai_compatibility_score DECIMAL(5,2),
    ai_risk_score DECIMAL(5,2),
    ai_analysis JSONB,
    
    -- Additional Info
    cover_letter TEXT,
    pets_description TEXT,
    emergency_contact JSONB,
    requested_move_in_date DATE,
    
    -- Manager Actions
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    manager_notes TEXT,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(property_id, applicant_id)
);

-- Step 4: Create Saved Properties Table (wishlist)
CREATE TABLE IF NOT EXISTS saved_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, property_id)
);

-- Step 5: Create Lease Documents Table (for digital signing)
CREATE TABLE IF NOT EXISTS lease_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    application_id UUID REFERENCES property_applications(id),
    
    -- Document Details
    document_type TEXT DEFAULT 'lease_agreement' CHECK (document_type IN (
        'lease_agreement', 'addendum', 'inspection_report', 'other'
    )),
    document_url TEXT,
    document_hash TEXT,
    
    -- Blockchain Integration
    blockchain_signature TEXT,
    blockchain_transaction_hash TEXT,
    blockchain_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Signing Status
    manager_signed BOOLEAN DEFAULT FALSE,
    manager_signed_at TIMESTAMP WITH TIME ZONE,
    manager_signature_hash TEXT,
    
    tenant_signed BOOLEAN DEFAULT FALSE,
    tenant_signed_at TIMESTAMP WITH TIME ZONE,
    tenant_signature_hash TEXT,
    
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_signatures', 'partially_signed', 'fully_signed', 'voided'
    )),
    
    -- AI Analysis
    ai_review_passed BOOLEAN,
    ai_review_notes JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create Property Views Table (analytics)
CREATE TABLE IF NOT EXISTS property_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    view_duration_seconds INTEGER,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_property ON property_applications(property_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON property_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON property_applications(status);
CREATE INDEX IF NOT EXISTS idx_saved_properties_user ON saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_property ON saved_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_documents_lease ON lease_documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_documents_status ON lease_documents(status);
CREATE INDEX IF NOT EXISTS idx_property_views_property ON property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_user ON property_views(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Step 8: Add triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_applications_updated_at') THEN
        CREATE TRIGGER update_property_applications_updated_at 
            BEFORE UPDATE ON property_applications
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lease_documents_updated_at') THEN
        CREATE TRIGGER update_lease_documents_updated_at 
            BEFORE UPDATE ON lease_documents
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

-- Step 9: Update existing properties to be published
UPDATE properties SET is_published = TRUE WHERE is_active = TRUE;

-- ============================================================
-- Migration Complete!
-- ============================================================
-- You should see:
-- ✅ property_applications table created
-- ✅ saved_properties table created
-- ✅ lease_documents table created
-- ✅ property_views table created
-- ✅ Users table updated with role column
-- ✅ Properties table updated with browsing fields
-- ✅ Indexes created for performance
-- ✅ Triggers set up for automation
-- ============================================================
