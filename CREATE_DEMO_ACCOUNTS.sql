-- ============================================
-- CREATE DEMO ACCOUNTS FOR RENTFLOW AI
-- ============================================
-- This script creates sample prospective tenant accounts
-- and property applications for testing
-- 
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Create Prospective Tenant Accounts
-- ============================================

-- Prospective Tenant 1: Sarah Johnson
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    user_type,
    role,
    phone,
    is_active,
    created_at
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'sarah.johnson@example.com',
    'Sarah',
    'Johnson',
    'Sarah Johnson',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0101',
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type;

-- Prospective Tenant 2: Michael Chen
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    user_type,
    role,
    phone,
    is_active,
    created_at
) VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'michael.chen@example.com',
    'Michael',
    'Chen',
    'Michael Chen',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0102',
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type;

-- Prospective Tenant 3: Emily Rodriguez
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    user_type,
    role,
    phone,
    is_active,
    created_at
) VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'emily.rodriguez@example.com',
    'Emily',
    'Rodriguez',
    'Emily Rodriguez',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0103',
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type;

-- Prospective Tenant 4: James Williams
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    user_type,
    role,
    phone,
    is_active,
    created_at
) VALUES (
    'b0000000-0000-0000-0000-000000000004',
    'james.williams@example.com',
    'James',
    'Williams',
    'James Williams',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0104',
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type;

-- Prospective Tenant 5: Lisa Park
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    user_type,
    role,
    phone,
    is_active,
    created_at
) VALUES (
    'b0000000-0000-0000-0000-000000000005',
    'lisa.park@example.com',
    'Lisa',
    'Park',
    'Lisa Park',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0105',
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type;

-- ============================================
-- STEP 2: Get property IDs for applications
-- ============================================
-- Check existing properties (we'll use the first 3)
SELECT 
    id, 
    title, 
    monthly_rent_usdc,
    bedrooms,
    city
FROM properties 
ORDER BY created_at 
LIMIT 3;

-- ============================================
-- STEP 3: Create Property Applications
-- ============================================
-- Note: Replace property_id values with actual IDs from Step 2

-- Application 1: Sarah Johnson - High compatibility
INSERT INTO property_applications (
    id,
    property_id,
    applicant_id,
    status,
    
    -- Employment
    employment_status,
    employer_name,
    monthly_income_usdc,
    years_at_current_job,
    
    -- Rental history
    previous_landlord_name,
    previous_landlord_contact,
    years_at_previous_address,
    reason_for_moving,
    
    -- References (using applicant_references instead of references)
    applicant_references,
    
    -- AI Scores (high compatibility)
    ai_compatibility_score,
    ai_risk_score,
    ai_analysis,
    
    -- Additional info
    cover_letter,
    pets_description,
    emergency_contact,
    requested_move_in_date,
    
    created_at
) 
SELECT 
    'c1111111-1111-1111-1111-111111111111',
    p.id,
    'b0000000-0000-0000-0000-000000000001',
    'submitted',
    
    'full_time',
    'Tech Solutions Inc',
    5500.00,
    3.5,
    
    'John Smith',
    'john.smith@landlords.com',
    2.0,
    'Moving closer to work',
    
    '[{"name": "Dr. Amanda White", "relationship": "Supervisor", "phone": "+1-555-0201", "email": "a.white@techsolutions.com"}, {"name": "Robert Taylor", "relationship": "Previous Landlord", "phone": "+1-555-0202", "email": "r.taylor@realty.com"}]'::jsonb,
    
    92.5,
    12.3,
    '{"strengths": ["Strong income-to-rent ratio (3.67x)", "Stable employment history", "Excellent references"], "concerns": ["First-time renter in this area"], "recommendation": "Highly recommended - excellent candidate"}'::jsonb,
    
    'I am a software engineer looking for a quiet, comfortable place to call home. I have a stable job and excellent rental history. I take great pride in maintaining my living space.',
    'No pets',
    '{"name": "Karen Johnson", "relationship": "Mother", "phone": "+1-555-0301"}'::jsonb,
    CURRENT_DATE + INTERVAL '30 days',
    
    NOW() - INTERVAL '2 days'
FROM properties p
ORDER BY p.created_at
LIMIT 1;

-- Application 2: Michael Chen - Medium compatibility
INSERT INTO property_applications (
    id,
    property_id,
    applicant_id,
    status,
    employment_status,
    employer_name,
    monthly_income_usdc,
    years_at_current_job,
    previous_landlord_name,
    previous_landlord_contact,
    years_at_previous_address,
    reason_for_moving,
    applicant_references,
    ai_compatibility_score,
    ai_risk_score,
    ai_analysis,
    cover_letter,
    pets_description,
    emergency_contact,
    requested_move_in_date,
    created_at
)
SELECT 
    'c2222222-2222-2222-2222-222222222222',
    p.id,
    'b0000000-0000-0000-0000-000000000002',
    'under_review',
    'self_employed',
    'Chen Design Studio',
    4200.00,
    1.5,
    'Maria Garcia',
    'maria.g@rentals.com',
    1.5,
    'Studio too small, need more space',
    '[{"name": "Jennifer Lee", "relationship": "Business Partner", "phone": "+1-555-0203", "email": "j.lee@design.com"}]'::jsonb,
    78.5,
    25.8,
    '{"strengths": ["Creative professional", "Good income"], "concerns": ["Self-employed (income variability)", "Short employment tenure"], "recommendation": "Good candidate with minor concerns about income stability"}'::jsonb,
    'As a freelance designer, I am looking for a creative space that inspires my work. I have consistent client contracts and stable income.',
    'One cat (Luna, 2 years old, spayed)',
    '{"name": "David Chen", "relationship": "Brother", "phone": "+1-555-0302"}'::jsonb,
    CURRENT_DATE + INTERVAL '45 days',
    NOW() - INTERVAL '5 days'
FROM properties p
ORDER BY p.created_at
LIMIT 1 OFFSET 1;

-- Application 3: Emily Rodriguez - High compatibility, different property
INSERT INTO property_applications (
    id,
    property_id,
    applicant_id,
    status,
    employment_status,
    employer_name,
    monthly_income_usdc,
    years_at_current_job,
    previous_landlord_name,
    previous_landlord_contact,
    years_at_previous_address,
    reason_for_moving,
    applicant_references,
    ai_compatibility_score,
    ai_risk_score,
    ai_analysis,
    cover_letter,
    pets_description,
    emergency_contact,
    requested_move_in_date,
    created_at
)
SELECT 
    'c3333333-3333-3333-3333-333333333333',
    p.id,
    'b0000000-0000-0000-0000-000000000003',
    'submitted',
    'full_time',
    'City Hospital',
    6200.00,
    5.0,
    'Thomas Anderson',
    'thomas.a@properties.com',
    3.0,
    'Relocating for work promotion',
    '[{"name": "Dr. Sarah Mitchell", "relationship": "Supervisor", "phone": "+1-555-0204", "email": "s.mitchell@cityhospital.com"}, {"name": "Patricia Brown", "relationship": "Previous Landlord", "phone": "+1-555-0205", "email": "p.brown@realty.com"}]'::jsonb,
    95.0,
    8.5,
    '{"strengths": ["Excellent income ratio (4.13x)", "Long-term stable employment", "Healthcare professional", "Outstanding rental history"], "concerns": ["None significant"], "recommendation": "Exceptional candidate - highest priority"}'::jsonb,
    'I am a registered nurse with 8 years of experience. I am responsible, quiet, and take excellent care of my living space. Looking forward to becoming part of this community.',
    'No pets',
    '{"name": "Carlos Rodriguez", "relationship": "Father", "phone": "+1-555-0303"}'::jsonb,
    CURRENT_DATE + INTERVAL '20 days',
    NOW() - INTERVAL '1 day'
FROM properties p
ORDER BY p.created_at
LIMIT 1 OFFSET 2;

-- Application 4: James Williams - Lower compatibility
INSERT INTO property_applications (
    id,
    property_id,
    applicant_id,
    status,
    employment_status,
    employer_name,
    monthly_income_usdc,
    years_at_current_job,
    previous_landlord_name,
    previous_landlord_contact,
    years_at_previous_address,
    reason_for_moving,
    applicant_references,
    ai_compatibility_score,
    ai_risk_score,
    ai_analysis,
    cover_letter,
    pets_description,
    emergency_contact,
    requested_move_in_date,
    created_at
)
SELECT 
    'c4444444-4444-4444-4444-444444444444',
    p.id,
    'b0000000-0000-0000-0000-000000000004',
    'submitted',
    'part_time',
    'QuickMart Retail',
    2800.00,
    0.5,
    'Nancy White',
    'nancy.w@apartments.com',
    0.8,
    'First apartment, moving out from family',
    '[{"name": "Susan Williams", "relationship": "Mother", "phone": "+1-555-0206"}]'::jsonb,
    62.0,
    45.2,
    '{"strengths": ["Young professional", "Eager to establish rental history"], "concerns": ["Low income-to-rent ratio (1.87x)", "Short employment history", "Limited references", "First-time renter"], "recommendation": "Higher risk - consider requiring co-signer or larger deposit"}'::jsonb,
    'I just graduated from college and got my first job. I am responsible and excited to have my own place. My parents can co-sign if needed.',
    'No pets',
    '{"name": "Susan Williams", "relationship": "Mother", "phone": "+1-555-0304"}'::jsonb,
    CURRENT_DATE + INTERVAL '60 days',
    NOW() - INTERVAL '3 days'
FROM properties p
ORDER BY p.created_at
LIMIT 1;

-- Application 5: Lisa Park - Medium-high compatibility
INSERT INTO property_applications (
    id,
    property_id,
    applicant_id,
    status,
    employment_status,
    employer_name,
    monthly_income_usdc,
    years_at_current_job,
    previous_landlord_name,
    previous_landlord_contact,
    years_at_previous_address,
    reason_for_moving,
    applicant_references,
    ai_compatibility_score,
    ai_risk_score,
    ai_analysis,
    cover_letter,
    pets_description,
    emergency_contact,
    requested_move_in_date,
    created_at
)
SELECT 
    'c5555555-5555-5555-5555-555555555555',
    p.id,
    'b0000000-0000-0000-0000-000000000005',
    'approved',
    'full_time',
    'Education First Academy',
    4800.00,
    4.0,
    'Richard Johnson',
    'r.johnson@homes.com',
    2.5,
    'Downsizing after roommate moved',
    '[{"name": "Principal Margaret Davis", "relationship": "Employer", "phone": "+1-555-0207", "email": "m.davis@eduacademy.com"}, {"name": "Richard Johnson", "relationship": "Previous Landlord", "phone": "+1-555-0208", "email": "r.johnson@homes.com"}]'::jsonb,
    85.5,
    18.0,
    '{"strengths": ["Stable teaching career", "Good income ratio (3.2x)", "Reliable rental history", "Professional references"], "concerns": ["None significant"], "recommendation": "Very good candidate - approved"}'::jsonb,
    'I am a high school teacher looking for a peaceful place to live. I value quiet evenings and am very respectful of neighbors and property.',
    'One small dog (Max, 5 years old, trained)',
    '{"name": "Jennifer Park", "relationship": "Sister", "phone": "+1-555-0305"}'::jsonb,
    CURRENT_DATE + INTERVAL '15 days',
    NOW() - INTERVAL '7 days'
FROM properties p
ORDER BY p.created_at
LIMIT 1 OFFSET 1;

-- ============================================
-- STEP 4: Verify created accounts and applications
-- ============================================

-- Check prospective tenant accounts
SELECT 
    email,
    full_name,
    role,
    user_type,
    phone,
    '✅ Account Created' as status
FROM users 
WHERE role = 'prospective_tenant'
ORDER BY created_at DESC
LIMIT 5;

-- Check applications with AI scores
SELECT 
    pa.id,
    u.full_name as applicant,
    p.title as property,
    pa.status,
    pa.ai_compatibility_score,
    pa.ai_risk_score,
    pa.monthly_income_usdc,
    pa.employment_status,
    pa.created_at::date as applied_date,
    '✅ Application Created' as result
FROM property_applications pa
JOIN users u ON u.id = pa.applicant_id
JOIN properties p ON p.id = pa.property_id
ORDER BY pa.ai_compatibility_score DESC;

-- ============================================
-- Summary Statistics
-- ============================================
SELECT 
    COUNT(*) as total_applications,
    COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
    COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    ROUND(AVG(ai_compatibility_score), 2) as avg_compatibility,
    ROUND(AVG(ai_risk_score), 2) as avg_risk
FROM property_applications;

-- ============================================
-- COMPLETE! You can now:
-- ============================================
-- 1. View applications in Manager Dashboard
-- 2. Test prospective tenant accounts (password must be set in Supabase Auth)
-- 3. Review AI scoring and application details
-- ============================================
