# 🔐 Demo Account Setup Guide

This guide will help you set up the demo manager account to login to RentFlow AI.

---

## Option 1: Using Supabase Dashboard (Recommended)

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Login to your account
3. Select the **RentFlow AI** project

### Step 2: Create Demo User
1. In the left sidebar, click **Authentication**
2. Click the **Users** tab
3. Click **Add user** button (green + icon)
4. Fill in the form:
   - **Email**: `manager@rentflow.ai`
   - **Password**: `RentFlow2024!`
   - **Auto Confirm User**: ✅ Check this box
   - **User Metadata** (optional): 
     ```json
     {
       "full_name": "Demo Manager",
       "role": "manager"
     }
     ```
5. Click **Create user**

### Step 3: Add User to Database
1. In the left sidebar, click **Table Editor**
2. Select the `users` table
3. Click **Insert row** button
4. Fill in the data:
   - **id**: Copy the UUID from the auth user you just created
   - **email**: `manager@rentflow.ai`
   - **full_name**: `Demo Manager`
   - **user_type**: `property_manager`
   - **role**: `manager` (optional, will auto-sync)
   - **wallet_address**: `8kr6b3uuYx4MgvY8BW9ETogd3cc5ibTj3g8oVZCkKyiz` (or leave blank)
   - **is_active**: `true`
5. Click **Save**

### Step 4: Test Login
1. Go to http://localhost:3000
2. Login with:
   - Email: `manager@rentflow.ai`
   - Password: `RentFlow2024!`

✅ You should now be logged into the RentFlow AI dashboard!

---

## Option 2: Using Supabase SQL Editor

### Step 1: Get Service Role Key
1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy the **service_role** key (it's secret, don't share it!)
3. Add it to your `.env` file:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### Step 2: Run Setup Script
```bash
npm run setup:demo
```

This script will:
- Create the auth user account
- Add user to the database
- Set the password to `RentFlow2024!`

---

## Option 3: Manual SQL Insert

If you prefer SQL, you can run this in the **SQL Editor**:

```sql
-- First, create the auth user in Supabase Dashboard
-- Then run this to add to users table:

INSERT INTO users (id, email, full_name, user_type, wallet_address, is_active)
VALUES (
  'YOUR-AUTH-USER-UUID-HERE',  -- Replace with actual UUID from auth.users
  'manager@rentflow.ai',
  'Demo Manager',
  'property_manager',  -- user_type for property manager
  '8kr6b3uuYx4MgvY8BW9ETogd3cc5ibTj3g8oVZCkKyiz',
  true
);
```

---

## 🔑 Demo Credentials

Once setup is complete, use these credentials to login:

**Manager Account:**
- **Email**: `manager@rentflow.ai`
- **Password**: `RentFlow2024!`
- **Role**: Property Manager (full access)

**What You Can Do:**
- ✅ View and manage all properties
- ✅ Create and edit leases
- ✅ Process USDC payments
- ✅ Handle maintenance requests
- ✅ View analytics dashboard
- ✅ Access AI-powered features
- ✅ Manage voice notifications
- ✅ Access tenant portal

---

## 🔒 Security Notes

⚠️ **Important for Production:**
1. Change the default password immediately
2. Use strong, unique passwords
3. Enable two-factor authentication (2FA)
4. Never commit credentials to Git
5. Rotate API keys regularly
6. Use environment-specific credentials

---

## 🆘 Troubleshooting

### "User not allowed" Error
- Make sure you're using the **service_role** key, not the **anon** key
- Check that the key is in your `.env` file
- Verify the Supabase project URL is correct

### "Email already exists" Error
- The user was already created
- Try logging in with the existing credentials
- Or delete the user from Supabase Dashboard and recreate

### "Cannot login" Error
- Verify the email is confirmed (check **Auto Confirm User**)
- Check that the password is correct: `RentFlow2024!`
- Clear browser cache and cookies
- Try incognito/private browsing mode

### "User not in database" Error
- Make sure you completed Step 3 (Add User to Database)
- Check the UUID matches between `auth.users` and `public.users`
- Verify RLS policies allow the user to access data

---

## 📞 Need Help?

If you're still having issues:
1. Check the browser console for errors (F12)
2. Check the backend logs for authentication errors
3. Verify all environment variables are set correctly
4. Make sure the database migrations have run
5. Check that RLS policies are properly configured

---

## ✅ Quick Verification

After setup, you should be able to:

1. **Login**: ✅ Access http://localhost:3000 and login
2. **Dashboard**: ✅ See the property management dashboard
3. **Properties**: ✅ View the properties list
4. **Navigation**: ✅ Switch between tabs (Properties, Leases, Payments, etc.)
5. **Data**: ✅ See seeded demo data (if you ran `npm run seed:db`)

---

**Happy managing!** 🏠✨
