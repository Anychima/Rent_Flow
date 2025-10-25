-- =========================================
-- STEP 1: Check current table structure
-- =========================================
-- Run this first to see what columns exist:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'property_applications' 
ORDER BY ordinal_position;

-- =========================================
-- STEP 2: If you see 'references' column, run this fix:
-- =========================================
-- This will rename the column without losing data
ALTER TABLE property_applications 
RENAME COLUMN references TO applicant_references;

-- =========================================
-- STEP 3: Verify the fix worked
-- =========================================
-- Run this to confirm the column is now 'applicant_references':
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'property_applications' 
AND column_name LIKE '%reference%';

-- =========================================
-- Expected Output After Fix:
-- =========================================
-- column_name             | data_type
-- ----------------------- | ---------
-- applicant_references    | jsonb
-- =========================================

-- =========================================
-- ALTERNATIVE: If table doesn't exist or is corrupted
-- =========================================
-- Drop and recreate (WARNING: This will delete all application data!)
-- Uncomment the lines below ONLY if needed:

-- DROP TABLE IF EXISTS property_applications CASCADE;

-- CREATE TABLE property_applications (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
--     applicant_id UUID REFERENCES users(id) ON DELETE CASCADE,
--     status TEXT DEFAULT 'submitted',
--     employment_status TEXT,
--     employer_name TEXT,
--     monthly_income_usdc DECIMAL(20,6),
--     years_at_current_job DECIMAL(4,2),
--     previous_landlord_name TEXT,
--     previous_landlord_contact TEXT,
--     years_at_previous_address DECIMAL(4,2),
--     reason_for_moving TEXT,
--     applicant_references JSONB DEFAULT '[]'::jsonb,
--     ai_compatibility_score DECIMAL(5,2),
--     ai_risk_score DECIMAL(5,2),
--     ai_analysis JSONB,
--     cover_letter TEXT,
--     pets_description TEXT,
--     emergency_contact JSONB,
--     requested_move_in_date DATE,
--     reviewed_by UUID REFERENCES users(id),
--     reviewed_at TIMESTAMP WITH TIME ZONE,
--     manager_notes TEXT,
--     rejection_reason TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     UNIQUE(property_id, applicant_id)
-- );

-- CREATE INDEX idx_applications_property ON property_applications(property_id);
-- CREATE INDEX idx_applications_applicant ON property_applications(applicant_id);
-- CREATE INDEX idx_applications_status ON property_applications(status);
