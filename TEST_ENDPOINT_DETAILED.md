# Detailed Endpoint Testing Guide

## Problem
The `/api/applications` endpoint returns "Unknown error" even though the table exists.

## Most Likely Cause
The backend code is trying to query a column that doesn't exist, or the table structure doesn't match what the backend expects.

## Step 1: Check Backend Terminal Logs

**IMPORTANT**: Look at your backend terminal (where you ran `npm run dev` in the backend folder).

When you run this command:
```powershell
(Invoke-WebRequest -Uri "http://localhost:3001/api/applications" -UseBasicParsing).Content
```

The backend terminal should show detailed error logs like:
```
📋 Fetching all applications...
❌ Error from Supabase: [ACTUAL ERROR MESSAGE HERE]
❌ Error fetching all applications: [ERROR DETAILS]
```

**ACTION**: Please copy the EXACT error message from your backend terminal and share it.

## Step 2: Verify Table Structure in Supabase

Run this in Supabase SQL Editor to see your actual table structure:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'property_applications' 
ORDER BY ordinal_position;
```

**Look for**:
- Is there a column named `references`? (WRONG - SQL keyword)
- Is there a column named `applicant_references`? (CORRECT)

## Step 3: Check if Table Has Foreign Key Issues

The error might be related to foreign keys. Run this:

```sql
-- Check if the table exists and can be queried
SELECT COUNT(*) as total_applications 
FROM property_applications;

-- Check if foreign keys are valid
SELECT 
    pa.id,
    pa.property_id,
    pa.applicant_id,
    p.id as property_exists,
    u.id as user_exists
FROM property_applications pa
LEFT JOIN properties p ON p.id = pa.property_id
LEFT JOIN users u ON u.id = pa.applicant_id
LIMIT 5;
```

## Step 4: Test Simplified Query

Try this simplified query in Supabase to see if basic SELECT works:

```sql
-- Test 1: Basic select
SELECT * FROM property_applications LIMIT 1;

-- Test 2: With property join (what backend does)
SELECT 
    pa.*,
    p.title as property_title
FROM property_applications pa
LEFT JOIN properties p ON p.id = pa.property_id
LIMIT 1;

-- Test 3: With user join
SELECT 
    pa.*,
    u.email as applicant_email
FROM property_applications pa
LEFT JOIN users u ON u.id = pa.applicant_id
LIMIT 1;

-- Test 4: Full query (what backend actually runs)
SELECT 
    pa.*
FROM property_applications pa
ORDER BY pa.created_at DESC;
```

## Step 5: Common Fixes

### Fix A: Column Name Issue (Most Likely)
If you see a `references` column instead of `applicant_references`:

```sql
ALTER TABLE property_applications 
RENAME COLUMN references TO applicant_references;
```

### Fix B: Missing Columns
If columns are missing, run this to add them:

```sql
ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS applicant_references JSONB DEFAULT '[]'::jsonb;
```

### Fix C: RLS (Row Level Security) Policy Issue
If RLS is blocking queries, temporarily disable it:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'property_applications';

-- If rowsecurity = true, disable it for testing:
ALTER TABLE property_applications DISABLE ROW LEVEL SECURITY;
```

## Step 6: After Fix, Restart Backend

After making any database changes:

1. Stop backend server (Ctrl+C)
2. Restart: `npm run dev`
3. Test again:
```powershell
(Invoke-WebRequest -Uri "http://localhost:3001/api/applications" -UseBasicParsing).Content
```

Expected: `{"success":true,"data":[]}`

## What We Need From You

Please provide:

1. **Backend terminal error logs** (the detailed error message when you test the endpoint)
2. **Table structure output** (result of the column_name query above)
3. **Screenshot** of Supabase showing the property_applications table structure (optional but helpful)

This will help us identify the exact issue!
