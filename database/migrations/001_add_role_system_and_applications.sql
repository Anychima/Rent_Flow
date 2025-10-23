-- Migration: Add Role System and Property Applications
-- Date: 2025-10-23
-- Purpose: Enable public browsing, role-based signup, and application management

-- Step 1: Add role field to users table
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
WHERE role IS NULL;

-- Step 2: Make properties browsable by public (add is_published field)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS available_date DATE,
ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_generated_description TEXT,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS application_count INTEGER DEFAULT 0;

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
    references JSONB DEFAULT '[]',
    
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
CREATE INDEX idx_applications_property ON property_applications(property_id);
CREATE INDEX idx_applications_applicant ON property_applications(applicant_id);
CREATE INDEX idx_applications_status ON property_applications(status);
CREATE INDEX idx_saved_properties_user ON saved_properties(user_id);
CREATE INDEX idx_saved_properties_property ON saved_properties(property_id);
CREATE INDEX idx_lease_documents_lease ON lease_documents(lease_id);
CREATE INDEX idx_lease_documents_status ON lease_documents(status);
CREATE INDEX idx_property_views_property ON property_views(property_id);
CREATE INDEX idx_property_views_user ON property_views(user_id);
CREATE INDEX idx_users_role ON users(role);

-- Step 8: Add triggers for updated_at
CREATE TRIGGER update_property_applications_updated_at 
    BEFORE UPDATE ON property_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lease_documents_updated_at 
    BEFORE UPDATE ON lease_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Create function to auto-update application counts
CREATE OR REPLACE FUNCTION update_property_application_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE properties 
    SET application_count = (
        SELECT COUNT(*) 
        FROM property_applications 
        WHERE property_id = NEW.property_id
    )
    WHERE id = NEW.property_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_application_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON property_applications
    FOR EACH ROW EXECUTE FUNCTION update_property_application_count();

-- Step 10: Create function to update view count
CREATE OR REPLACE FUNCTION update_property_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE properties 
    SET view_count = view_count + 1
    WHERE id = NEW.property_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_view_count_trigger
    AFTER INSERT ON property_views
    FOR EACH ROW EXECUTE FUNCTION update_property_view_count();

-- Step 11: Add sample data for testing
-- Update existing properties to be published
UPDATE properties SET is_published = TRUE WHERE is_active = TRUE;

COMMENT ON TABLE property_applications IS 'Stores rental applications from prospective tenants';
COMMENT ON TABLE saved_properties IS 'User wishlist/favorites for properties';
COMMENT ON TABLE lease_documents IS 'Digital lease documents with blockchain signatures';
COMMENT ON TABLE property_views IS 'Analytics for property browsing behavior';
