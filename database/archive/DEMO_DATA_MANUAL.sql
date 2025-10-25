-- ==============================================
-- DEMO DATA - Run this in Supabase SQL Editor
-- ==============================================
-- Creates 5 prospective tenant accounts with applications
-- Auth passwords need to be set separately
-- ==============================================

-- First, get the auth user IDs from the accounts we created
-- These IDs will be used for the applications

-- Sarah Johnson: 3da5f183-68a8-459c-a3bb-50d2c99b8783
-- Michael Chen: 90853b6f-0f00-4249-873b-34c805f8a07b  
-- Emily Rodriguez: 4c11f625-993f-4675-b3d8-fd7f785b4c4f
-- James Williams: 273cc439-cf94-4c99-b013-23345842d103
-- Lisa Park: 9d1af697-53b5-464f-ae88-42de01150edf

-- ============================================
-- STEP 1: Create/Update User Database Records
-- ============================================

-- Sarah Johnson
INSERT INTO users (id, email, full_name, user_type, role, phone, wallet_address, is_active)
VALUES (
    '3da5f183-68a8-459c-a3bb-50d2c99b8783',
    'sarah.johnson@example.com',
    'Sarah Johnson',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0101',
    'DEMO_3da5f183',
    true
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'prospective_tenant',
    user_type = 'prospective_tenant',
    phone = EXCLUDED.phone;

-- Michael Chen
INSERT INTO users (id, email, full_name, user_type, role, phone, wallet_address, is_active)
VALUES (
    '90853b6f-0f00-4249-873b-34c805f8a07b',
    'michael.chen@example.com',
    'Michael Chen',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0102',
    'DEMO_90853b6f',
    true
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'prospective_tenant',
    user_type = 'prospective_tenant',
    phone = EXCLUDED.phone;

-- Emily Rodriguez  
INSERT INTO users (id, email, full_name, user_type, role, phone, wallet_address, is_active)
VALUES (
    '4c11f625-993f-4675-b3d8-fd7f785b4c4f',
    'emily.rodriguez@example.com',
    'Emily Rodriguez',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0103',
    'DEMO_4c11f625',
    true
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'prospective_tenant',
    user_type = 'prospective_tenant',
    phone = EXCLUDED.phone;

-- James Williams
INSERT INTO users (id, email, full_name, user_type, role, phone, wallet_address, is_active)
VALUES (
    '273cc439-cf94-4c99-b013-23345842d103',
    'james.williams@example.com',
    'James Williams',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0104',
    'DEMO_273cc439',
    true
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'prospective_tenant',
    user_type = 'prospective_tenant',
    phone = EXCLUDED.phone;

-- Lisa Park
INSERT INTO users (id, email, full_name, user_type, role, phone, wallet_address, is_active)
VALUES (
    '9d1af697-53b5-464f-ae88-42de01150edf',
    'lisa.park@example.com',
    'Lisa Park',
    'prospective_tenant',
    'prospective_tenant',
    '+1-555-0105',
    'DEMO_9d1af697',
    true
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'prospective_tenant',
    user_type = 'prospective_tenant',
    phone = EXCLUDED.phone;

-- ============================================
-- STEP 2: Create Property Applications
-- ============================================

-- Get property IDs (adjust offsets if needed)
DO $$
DECLARE
    prop1_id UUID;
    prop2_id UUID;
    prop3_id UUID;
BEGIN
    -- Get first 3 properties
    SELECT id INTO prop1_id FROM properties ORDER BY created_at LIMIT 1 OFFSET 0;
    SELECT id INTO prop2_id FROM properties ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT id INTO prop3_id FROM properties ORDER BY created_at LIMIT 1 OFFSET 2;

    -- Application 1: Sarah Johnson - High score
    INSERT INTO property_applications (
        id, property_id, applicant_id, status,
        employment_status, employer_name, monthly_income_usdc, years_at_current_job,
        previous_landlord_name, previous_landlord_contact, years_at_previous_address, reason_for_moving,
        applicant_references, ai_compatibility_score, ai_risk_score, ai_analysis,
        cover_letter, pets_description, emergency_contact, requested_move_in_date, created_at
    ) VALUES (
        'c1111111-1111-1111-1111-111111111111',
        prop1_id,
        '3da5f183-68a8-459c-a3bb-50d2c99b8783',
        'submitted',
        'full_time', 'Tech Solutions Inc', 5500.00, 3.5,
        'John Smith', 'john.smith@landlords.com', 2.0, 'Moving closer to work',
        '[{"name": "Dr. Amanda White", "relationship": "Supervisor", "phone": "+1-555-0201", "email": "a.white@techsolutions.com"}]'::jsonb,
        92.5, 12.3,
        '{"strengths": ["Strong income-to-rent ratio", "Stable employment"], "concerns": [], "recommendation": "Highly recommended"}'::jsonb,
        'I am a software engineer looking for a quiet, comfortable place to call home.',
        'No pets',
        '{"name": "Karen Johnson", "relationship": "Mother", "phone": "+1-555-0301"}'::jsonb,
        CURRENT_DATE + INTERVAL '30 days',
        NOW() - INTERVAL '2 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Application 2: Michael Chen - Medium score
    INSERT INTO property_applications (
        id, property_id, applicant_id, status,
        employment_status, employer_name, monthly_income_usdc, years_at_current_job,
        previous_landlord_name, previous_landlord_contact, years_at_previous_address, reason_for_moving,
        applicant_references, ai_compatibility_score, ai_risk_score, ai_analysis,
        cover_letter, pets_description, emergency_contact, requested_move_in_date, created_at
    ) VALUES (
        'c2222222-2222-2222-2222-222222222222',
        prop2_id,
        '90853b6f-0f00-4249-873b-34c805f8a07b',
        'under_review',
        'self_employed', 'Chen Design Studio', 4200.00, 1.5,
        'Maria Garcia', 'maria.g@rentals.com', 1.5, 'Need more space',
        '[{"name": "Jennifer Lee", "relationship": "Business Partner", "phone": "+1-555-0203"}]'::jsonb,
        78.5, 25.8,
        '{"strengths": ["Creative professional"], "concerns": ["Self-employed income variability"], "recommendation": "Good candidate with minor concerns"}'::jsonb,
        'As a freelance designer, I am looking for a creative space.',
        'One cat (Luna, 2 years old)',
        '{"name": "David Chen", "relationship": "Brother", "phone": "+1-555-0302"}'::jsonb,
        CURRENT_DATE + INTERVAL '45 days',
        NOW() - INTERVAL '5 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Application 3: Emily Rodriguez - Exceptional
    INSERT INTO property_applications (
        id, property_id, applicant_id, status,
        employment_status, employer_name, monthly_income_usdc, years_at_current_job,
        previous_landlord_name, previous_landlord_contact, years_at_previous_address, reason_for_moving,
        applicant_references, ai_compatibility_score, ai_risk_score, ai_analysis,
        cover_letter, pets_description, emergency_contact, requested_move_in_date, created_at
    ) VALUES (
        'c3333333-3333-3333-3333-333333333333',
        prop3_id,
        '4c11f625-993f-4675-b3d8-fd7f785b4c4f',
        'submitted',
        'full_time', 'City Hospital', 6200.00, 5.0,
        'Thomas Anderson', 'thomas.a@properties.com', 3.0, 'Relocating for promotion',
        '[{"name": "Dr. Sarah Mitchell", "relationship": "Supervisor", "phone": "+1-555-0204"}]'::jsonb,
        95.0, 8.5,
        '{"strengths": ["Excellent income ratio", "Healthcare professional", "Outstanding history"], "concerns": [], "recommendation": "Exceptional candidate"}'::jsonb,
        'I am a registered nurse with 8 years of experience. Very responsible and quiet.',
        'No pets',
        '{"name": "Carlos Rodriguez", "relationship": "Father", "phone": "+1-555-0303"}'::jsonb,
        CURRENT_DATE + INTERVAL '20 days',
        NOW() - INTERVAL '1 day'
    ) ON CONFLICT (id) DO NOTHING;

    -- Application 4: James Williams - Lower score
    INSERT INTO property_applications (
        id, property_id, applicant_id, status,
        employment_status, employer_name, monthly_income_usdc, years_at_current_job,
        previous_landlord_name, previous_landlord_contact, years_at_previous_address, reason_for_moving,
        applicant_references, ai_compatibility_score, ai_risk_score, ai_analysis,
        cover_letter, pets_description, emergency_contact, requested_move_in_date, created_at
    ) VALUES (
        'c4444444-4444-4444-4444-444444444444',
        prop1_id,
        '273cc439-cf94-4c99-b013-23345842d103',
        'submitted',
        'part_time', 'QuickMart Retail', 2800.00, 0.5,
        'Nancy White', 'nancy.w@apartments.com', 0.8, 'First apartment',
        '[{"name": "Susan Williams", "relationship": "Mother", "phone": "+1-555-0206"}]'::jsonb,
        62.0, 45.2,
        '{"strengths": ["Young professional"], "concerns": ["Low income ratio", "First-time renter"], "recommendation": "Higher risk - needs co-signer"}'::jsonb,
        'Just graduated from college. I am responsible and my parents can co-sign.',
        'No pets',
        '{"name": "Susan Williams", "relationship": "Mother", "phone": "+1-555-0304"}'::jsonb,
        CURRENT_DATE + INTERVAL '60 days',
        NOW() - INTERVAL '3 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Application 5: Lisa Park - Approved
    INSERT INTO property_applications (
        id, property_id, applicant_id, status,
        employment_status, employer_name, monthly_income_usdc, years_at_current_job,
        previous_landlord_name, previous_landlord_contact, years_at_previous_address, reason_for_moving,
        applicant_references, ai_compatibility_score, ai_risk_score, ai_analysis,
        cover_letter, pets_description, emergency_contact, requested_move_in_date, created_at
    ) VALUES (
        'c5555555-5555-5555-5555-555555555555',
        prop2_id,
        '9d1af697-53b5-464f-ae88-42de01150edf',
        'approved',
        'full_time', 'Education First Academy', 4800.00, 4.0,
        'Richard Johnson', 'r.johnson@homes.com', 2.5, 'Downsizing after roommate moved',
        '[{"name": "Principal Margaret Davis", "relationship": "Employer", "phone": "+1-555-0207"}]'::jsonb,
        85.5, 18.0,
        '{"strengths": ["Stable teaching career", "Good income ratio", "Reliable history"], "concerns": [], "recommendation": "Very good candidate - approved"}'::jsonb,
        'I am a high school teacher looking for a peaceful place. Very respectful of neighbors.',
        'One small dog (Max, 5 years old, trained)',
        '{"name": "Jennifer Park", "relationship": "Sister", "phone": "+1-555-0305"}'::jsonb,
        CURRENT_DATE + INTERVAL '15 days',
        NOW() - INTERVAL '7 days'
    ) ON CONFLICT (id) DO NOTHING;

END $$;

-- ============================================
-- STEP 3: Verify Results
-- ============================================

SELECT 
    '✅ Users Created' as step,
    COUNT(*) as count
FROM users  
WHERE email IN (
    'sarah.johnson@example.com',
    'michael.chen@example.com',
    'emily.rodriguez@example.com',
    'james.williams@example.com',
    'lisa.park@example.com'
);

SELECT 
    '✅ Applications Created' as step,
    COUNT(*) as count
FROM property_applications
WHERE id IN (
    'c1111111-1111-1111-1111-111111111111',
    'c2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'c4444444-4444-4444-4444-444444444444',
    'c5555555-5555-5555-5555-555555555555'
);

-- View all applications with scores
SELECT 
    u.full_name as applicant,
    p.title as property,
    pa.status,
    pa.ai_compatibility_score,
    pa.ai_risk_score,
    pa.monthly_income_usdc,
    pa.created_at::date as applied_date
FROM property_applications pa
JOIN users u ON u.id = pa.applicant_id
JOIN properties p ON p.id = pa.property_id
WHERE pa.id IN (
    'c1111111-1111-1111-1111-111111111111',
    'c2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'c4444444-4444-4444-4444-444444444444',
    'c5555555-5555-5555-5555-555555555555'
)
ORDER BY pa.ai_compatibility_score DESC;

-- ============================================
-- ALL DONE! Login credentials:
-- ============================================
-- Email: sarah.johnson@example.com | Password: demo123
-- Email: michael.chen@example.com | Password: demo123
-- Email: emily.rodriguez@example.com | Password: demo123
-- Email: james.williams@example.com | Password: demo123
-- Email: lisa.park@example.com | Password: demo123
-- ============================================
