# Database Setup Instructions

## ⚠️ IMPORTANT: Run This Before Testing New Features

The new application system requires database schema changes. Follow these steps to apply the migration:

## Option 1: Supabase SQL Editor (Recommended)

### Step-by-Step:

1. **Open Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Login with your credentials
   - Select project: `saiceqyaootvkdenxbqx`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query" button

3. **Load Migration File**
   - Open file: `database/migrations/001_add_role_system_and_applications.sql`
   - Copy ALL contents (206 lines)
   - Paste into the SQL Editor

4. **Execute Migration**
   - Click "RUN" button (or press Ctrl+Enter)
   - Wait for execution to complete
   - Check for success message

5. **Verify Tables Created**
   - Go to "Table Editor" in sidebar
   - You should see new tables:
     - `property_applications`
     - `saved_properties`
     - `lease_documents`
     - `property_views`

---

## Option 2: Command Line (If psql is available)

```bash
# Set password (replace with your actual password)
$env:PGPASSWORD='your-password-here'

# Run migration
psql -h db.saiceqyaootvkdenxbqx.supabase.co `
     -U postgres `
     -d postgres `
     -f database/migrations/001_add_role_system_and_applications.sql
```

---

## What This Migration Does

### 1. Updates `users` Table
- Adds `role` column (prospective_tenant, manager, tenant)
- Sets default: 'prospective_tenant'
- Updates existing users based on user_type

### 2. Updates `properties` Table
Adds fields:
- `is_published` (BOOLEAN) - Public visibility
- `available_date` (DATE) - When property is available
- `pet_friendly` (BOOLEAN)
- `parking_available` (BOOLEAN)
- `ai_generated_description` (TEXT) - AI-enhanced description
- `view_count` (INTEGER) - Analytics
- `application_count` (INTEGER) - Auto-updated

### 3. Creates `property_applications` Table
Tracks rental applications with:
- Applicant information
- Employment details
- Rental history
- References
- AI compatibility scores
- AI risk assessment
- Manager review notes
- Status tracking (submitted, under_review, approved, rejected, etc.)

### 4. Creates `saved_properties` Table
User wishlist/favorites:
- Links users to saved properties
- Optional notes
- Creation timestamp

### 5. Creates `lease_documents` Table
Digital lease signing:
- Document storage
- Blockchain signatures (manager + tenant)
- Transaction hashes
- Signing status tracking
- AI review results

### 6. Creates `property_views` Table
Analytics tracking:
- Property views
- User ID (if authenticated)
- Session ID
- IP address and user agent
- Referrer tracking
- View duration

### 7. Creates Indexes
For optimal performance on:
- Applications by property
- Applications by applicant
- Applications by status
- Saved properties by user
- Lease documents by lease ID
- Property views tracking
- Users by role

### 8. Sets Up Triggers
Automatic updates:
- `updated_at` timestamps
- Application count per property
- View count per property

---

## Verification Steps

After running the migration, verify it worked:

### Test 1: Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'property_applications',
    'saved_properties',
    'lease_documents',
    'property_views'
  );
```

Should return 4 rows.

### Test 2: Check Role Column
```sql
SELECT DISTINCT role FROM users;
```

Should return: prospective_tenant, manager, tenant (or some subset)

### Test 3: Check Property Fields
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'properties' 
  AND column_name IN (
    'is_published',
    'view_count',
    'application_count'
  );
```

Should return 3 rows.

---

## Troubleshooting

### Error: "relation already exists"
- **Cause:** Table was already created
- **Solution:** Safe to ignore or drop table first:
  ```sql
  DROP TABLE IF EXISTS property_applications CASCADE;
  -- Then re-run migration
  ```

### Error: "column already exists"
- **Cause:** Column was added in previous attempt
- **Solution:** Safe to ignore. Check if column has correct type:
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'users' AND column_name = 'role';
  ```

### Error: Permission denied
- **Cause:** Not using service role key
- **Solution:** Ensure you're logged in as database owner or use service role

---

## Rolling Back (If Needed)

To undo the migration:

```sql
-- Drop new tables
DROP TABLE IF EXISTS property_views CASCADE;
DROP TABLE IF EXISTS lease_documents CASCADE;
DROP TABLE IF EXISTS saved_properties CASCADE;
DROP TABLE IF EXISTS property_applications CASCADE;

-- Remove columns from users
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Remove columns from properties
ALTER TABLE properties 
  DROP COLUMN IF EXISTS is_published,
  DROP COLUMN IF EXISTS available_date,
  DROP COLUMN IF EXISTS pet_friendly,
  DROP COLUMN IF EXISTS parking_available,
  DROP COLUMN IF EXISTS ai_generated_description,
  DROP COLUMN IF EXISTS view_count,
  DROP COLUMN IF EXISTS application_count;
```

---

## Next Steps After Migration

Once migration is complete:

1. ✅ Backend API is already updated and running
2. ✅ Test endpoints with Postman or curl
3. 🔨 Build frontend components
4. 🔨 Update routing
5. 🔨 Test full user flow

---

## Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Verify you're using the correct project
3. Ensure you have admin/owner permissions
4. Review error messages carefully
5. Check `PROGRESS_SUMMARY.md` for implementation details

**Migration File Location:** 
`database/migrations/001_add_role_system_and_applications.sql`

**Questions?** Review the `IMPLEMENTATION_GUIDE.md` for detailed architecture.
