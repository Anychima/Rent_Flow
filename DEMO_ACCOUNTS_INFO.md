# 🎭 Demo Accounts & Sample Applications

## ✅ Created Accounts

### 👤 Prospective Tenant Accounts (5 accounts)

| Name | Email | Password | Role | Phone |
|------|-------|----------|------|-------|
| Sarah Johnson | `sarah.johnson@example.com` | `demo123` | prospective_tenant | +1-555-0101 |
| Michael Chen | `michael.chen@example.com` | `demo123` | prospective_tenant | +1-555-0102 |
| Emily Rodriguez | `emily.rodriguez@example.com` | `demo123` | prospective_tenant | +1-555-0103 |
| James Williams | `james.williams@example.com` | `demo123` | prospective_tenant | +1-555-0104 |
| Lisa Park | `lisa.park@example.com` | `demo123` | prospective_tenant | +1-555-0105 |

### 📝 How to Set Passwords in Supabase

**Important**: The SQL script creates user records in the database, but you need to create Auth accounts separately.

#### Option 1: Auto-create with password script (Quick)

Run this in Supabase SQL Editor after running the main script:

```sql
-- Note: This requires direct access to auth schema
-- If you get permission errors, use Option 2 instead

-- This will work if you have service_role access
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    aud,
    role
) VALUES
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'sarah.johnson@example.com', crypt('demo123', gen_salt('bf')), NOW(), NOW(), NOW(), '', 'authenticated', 'authenticated'),
    ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'michael.chen@example.com', crypt('demo123', gen_salt('bf')), NOW(), NOW(), NOW(), '', 'authenticated', 'authenticated'),
    ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'emily.rodriguez@example.com', crypt('demo123', gen_salt('bf')), NOW(), NOW(), NOW(), '', 'authenticated', 'authenticated'),
    ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'james.williams@example.com', crypt('demo123', gen_salt('bf')), NOW(), NOW(), NOW(), '', 'authenticated', 'authenticated'),
    ('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'lisa.park@example.com', crypt('demo123', gen_salt('bf')), NOW(), NOW(), NOW(), '', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;
```

#### Option 2: Manual signup (Recommended if Option 1 fails)

1. Go to your RentFlow app: `http://localhost:3000`
2. Click "Sign Up"
3. For each account:
   - Enter the email from table above
   - Enter password: `demo123`
   - Enter the full name from table
   - Click "Create Account"
4. Check email for verification link (or disable email verification in Supabase settings)

---

## 📋 Sample Applications Created

### Application 1: Sarah Johnson - ⭐ HIGH COMPATIBILITY
- **Property**: First property in database
- **Status**: `submitted`
- **AI Compatibility Score**: 92.5/100
- **AI Risk Score**: 12.3/100
- **Employment**: Full-time at Tech Solutions Inc
- **Income**: $5,500/month
- **Income Ratio**: 3.67x rent
- **Experience**: 2 years rental history
- **References**: 2 excellent references
- **Pets**: No pets
- **Move-in**: 30 days from now
- **AI Recommendation**: "Highly recommended - excellent candidate"

---

### Application 2: Michael Chen - ⭐ MEDIUM COMPATIBILITY
- **Property**: Second property in database
- **Status**: `under_review`
- **AI Compatibility Score**: 78.5/100
- **AI Risk Score**: 25.8/100
- **Employment**: Self-employed (Chen Design Studio)
- **Income**: $4,200/month
- **Income Ratio**: Variable (self-employed)
- **Experience**: 1.5 years rental history
- **References**: 1 business reference
- **Pets**: One cat (Luna)
- **Move-in**: 45 days from now
- **AI Recommendation**: "Good candidate with minor concerns about income stability"

---

### Application 3: Emily Rodriguez - ⭐⭐ EXCEPTIONAL
- **Property**: Third property in database
- **Status**: `submitted`
- **AI Compatibility Score**: 95.0/100
- **AI Risk Score**: 8.5/100
- **Employment**: Full-time at City Hospital (Registered Nurse)
- **Income**: $6,200/month
- **Income Ratio**: 4.13x rent
- **Experience**: 3 years rental history, healthcare professional
- **References**: 2 outstanding references
- **Pets**: No pets
- **Move-in**: 20 days from now
- **AI Recommendation**: "Exceptional candidate - highest priority"

---

### Application 4: James Williams - ⚠️ HIGHER RISK
- **Property**: First property in database
- **Status**: `submitted`
- **AI Compatibility Score**: 62.0/100
- **AI Risk Score**: 45.2/100
- **Employment**: Part-time at QuickMart Retail
- **Income**: $2,800/month
- **Income Ratio**: 1.87x rent (below 3x threshold)
- **Experience**: 0.8 years rental history (first-time renter)
- **References**: 1 family reference only
- **Pets**: No pets
- **Move-in**: 60 days from now
- **AI Recommendation**: "Higher risk - consider requiring co-signer or larger deposit"

---

### Application 5: Lisa Park - ⭐ APPROVED
- **Property**: Second property in database
- **Status**: `approved` ✅
- **AI Compatibility Score**: 85.5/100
- **AI Risk Score**: 18.0/100
- **Employment**: Full-time teacher at Education First Academy
- **Income**: $4,800/month
- **Income Ratio**: 3.2x rent
- **Experience**: 2.5 years rental history
- **References**: 2 professional references
- **Pets**: One small dog (Max)
- **Move-in**: 15 days from now
- **AI Recommendation**: "Very good candidate - approved"

---

## 🎯 Testing Scenarios

### Manager Dashboard Testing
1. Login as `manager@rentflow.ai`
2. Go to "Applications" tab
3. You should see all 5 applications sorted by AI score
4. Review each application:
   - See AI compatibility and risk scores
   - Review applicant details
   - Check employment and rental history
   - View AI analysis and recommendations
5. Test actions:
   - Approve Lisa Park's application (already approved)
   - Move Michael Chen to "under_review"
   - Add manager notes to applications

### Prospective Tenant Testing
1. Login as `sarah.johnson@example.com` (password: `demo123`)
2. Should see "My Applications" page
3. View her submitted application
4. Check application status
5. See AI scores (if visible to applicants)

### Application Filtering
- **By Status**: submitted (3), under_review (1), approved (1)
- **By AI Score**: High (95, 92.5, 85.5), Medium (78.5), Low (62)
- **By Risk**: Low risk (8.5, 12.3, 18), Medium (25.8), High (45.2)

---

## 📊 Expected Manager Dashboard View

After running the SQL, your Manager Dashboard should show:

**Applications Tab:**
```
┌─────────────────────────────────────────────────────────────┐
│ Total Applications: 5                                        │
│ Pending Review: 3 | Under Review: 1 | Approved: 1           │
└─────────────────────────────────────────────────────────────┘

Applications (sorted by AI score):

1. 🌟 Emily Rodriguez - City Hospital Nurse
   Score: 95.0 | Risk: 8.5 | Status: Submitted
   "Exceptional candidate - highest priority"

2. ⭐ Sarah Johnson - Software Engineer  
   Score: 92.5 | Risk: 12.3 | Status: Submitted
   "Highly recommended - excellent candidate"

3. ✅ Lisa Park - Teacher
   Score: 85.5 | Risk: 18.0 | Status: APPROVED
   "Very good candidate - approved"

4. 👤 Michael Chen - Freelance Designer
   Score: 78.5 | Risk: 25.8 | Status: Under Review
   "Good candidate with minor income concerns"

5. ⚠️  James Williams - Retail Worker
   Score: 62.0 | Risk: 45.2 | Status: Submitted
   "Higher risk - needs co-signer"
```

---

## 🚀 How to Use

### Step 1: Run SQL Script
1. Open Supabase Dashboard → SQL Editor
2. Copy content from `CREATE_DEMO_ACCOUNTS.sql`
3. Click "Run"
4. Check output for success messages

### Step 2: Create Auth Accounts
- Use Option 1 (auto-script) or Option 2 (manual signup)
- Password for all demo accounts: `demo123`

### Step 3: Test Manager View
1. Login as `manager@rentflow.ai`
2. Go to Applications tab
3. See all 5 applications with AI scores
4. Test filtering, sorting, and actions

### Step 4: Test Tenant View  
1. Logout
2. Login as `sarah.johnson@example.com`
3. View your application
4. Check application status and details

---

## 💡 Tips

- **AI Scores are realistic**: Based on income ratios, employment stability, and rental history
- **Applications span different statuses**: Test the full workflow
- **References are detailed**: JSON format with names, relationships, contacts
- **Emergency contacts included**: Full application data for testing
- **Move-in dates vary**: From 15 to 60 days from now

---

## 🔧 Troubleshooting

### Applications not showing?
- Check backend console for errors
- Verify `/api/applications` endpoint works
- Check property IDs in SQL match your database

### Can't login as prospective tenants?
- Auth accounts need to be created (see Option 1 or 2 above)
- Check Supabase Auth → Users tab
- Verify email addresses match

### AI scores not displaying?
- Check that `ai_compatibility_score` and `ai_risk_score` columns exist
- Verify applications were inserted successfully
- Check browser console for errors

---

## 📁 Files

- **`CREATE_DEMO_ACCOUNTS.sql`** - Full SQL script to create accounts and applications
- **`DEMO_ACCOUNTS_INFO.md`** - This file with login details and testing scenarios

Enjoy testing! 🎉
