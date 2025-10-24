-- Check if the users involved in the chat exist
-- Run this to diagnose the FK constraint violation

-- Step 1: Get the application details
SELECT 
  'Application Details' as check_type,
  id as application_id,
  applicant_id,
  property_id,
  status
FROM public.property_applications
WHERE id = '92c4a94d-8b60-47ff-a527-5aac673f8ccb';

-- Step 2: Check if applicant exists in users table
SELECT 
  'Applicant in Users Table?' as check_type,
  id,
  email,
  role,
  user_type
FROM public.users
WHERE id IN (
  SELECT applicant_id 
  FROM public.property_applications 
  WHERE id = '92c4a94d-8b60-47ff-a527-5aac673f8ccb'
);

-- Step 3: Check who owns the property (the manager)
SELECT 
  'Property Owner (Manager) in Users Table?' as check_type,
  u.id,
  u.email,
  u.role,
  u.user_type
FROM public.users u
JOIN public.properties p ON p.owner_id = u.id
WHERE p.id IN (
  SELECT property_id 
  FROM public.property_applications 
  WHERE id = '92c4a94d-8b60-47ff-a527-5aac673f8ccb'
);

-- Step 4: Show ALL users to identify IDs
SELECT 
  'All Users' as check_type,
  id,
  email,
  role,
  user_type,
  is_active
FROM public.users
ORDER BY email;

-- Step 5: Final diagnosis
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id IN (
        SELECT applicant_id FROM public.property_applications 
        WHERE id = '92c4a94d-8b60-47ff-a527-5aac673f8ccb'
      )
    ) THEN '❌ APPLICANT NOT IN USERS TABLE - This is the FK violation!'
    WHEN NOT EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.properties p ON p.owner_id = u.id
      WHERE p.id IN (
        SELECT property_id FROM public.property_applications 
        WHERE id = '92c4a94d-8b60-47ff-a527-5aac673f8ccb'
      )
    ) THEN '❌ PROPERTY OWNER NOT IN USERS TABLE - This is the FK violation!'
    ELSE '✅ Both users exist - FK should work'
  END as diagnosis;
