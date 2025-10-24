-- =========================================
-- FIX: Property Applications Table
-- Issue: "references" is a SQL reserved keyword
-- Solution: Use "applicant_references" instead
-- =========================================

-- Drop the table if it exists with wrong column name
DROP TABLE IF EXISTS property_applications CASCADE;

-- Create property_applications table with correct column names
CREATE TABLE property_applications (
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
    
    -- References (FIXED: using applicant_references instead of references)
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

-- Create indexes for performance
CREATE INDEX idx_applications_property ON property_applications(property_id);
CREATE INDEX idx_applications_applicant ON property_applications(applicant_id);
CREATE INDEX idx_applications_status ON property_applications(status);
CREATE INDEX idx_applications_created ON property_applications(created_at DESC);

-- Add comment to document the field name change
COMMENT ON COLUMN property_applications.applicant_references IS 'Array of reference objects. Named applicant_references to avoid SQL keyword conflict with REFERENCES';

-- Verify table was created
SELECT 
    'property_applications table created successfully!' as message,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'property_applications';
