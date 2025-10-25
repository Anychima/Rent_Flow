# 🏠 Tenant Portal Access Guide

Complete guide to setting up and accessing the tenant portal in RentFlow AI.

---

## 🚪 How to Access the Tenant Portal

### **Option 1: Via Manager Dashboard (Quick Access)**

1. **Login as Manager** at http://localhost:3000
   - Email: `manager@rentflow.ai`
   - Password: `RentFlow2024!`

2. **Click "🏠 Tenant Portal"** button in the top-right header (indigo button)

3. This opens the **Tenant Portal Login Screen**

### **Option 2: Direct Access (Coming Soon)**
Currently, the tenant portal is accessed through the manager dashboard. A standalone tenant login page can be added for production.

---

## 👤 Setting Up Tenant Accounts

### **Step 1: Create Tenant User in Supabase**

1. Go to https://supabase.com/dashboard
2. Open your **RentFlow AI** project
3. Navigate to **Authentication** → **Users**
4. Click **Add user**
5. Enter tenant details:
   - **Email**: `tenant1@example.com`
   - **Password**: `TenantPass123!`
   - ✅ Check "Auto Confirm User"
6. Click **Create user**
7. **Copy the UUID** of the created user

### **Step 2: Add Tenant to Database**

1. Go to **Table Editor** → **users** table
2. Click **Insert row**
3. Fill in the data:
   ```
   id: [paste UUID from step 1]
   email: tenant1@example.com
   full_name: John Doe
   user_type: tenant
   phone: (555) 123-4567
   wallet_address: [optional Solana wallet]
   is_active: true
   ```
4. Click **Save**

### **Step 3: Create an Active Lease**

For tenants to access the portal, they need an active lease:

1. Go to **Table Editor** → **leases** table
2. Click **Insert row**
3. Fill in the data:
   ```
   property_id: [select from existing properties]
   tenant_id: [paste tenant UUID from step 1]
   start_date: 2024-01-01
   end_date: 2024-12-31
   monthly_rent_usdc: 1500.00
   security_deposit_usdc: 3000.00
   rent_due_day: 1
   status: active
   ```
4. Click **Save**

---

## 🔐 Tenant Login Process

### **Login Screen**

The tenant portal offers **2 login methods**:

#### **Method 1: Email Login**
1. Enter tenant email address
2. Click **Login**
3. System validates tenant credentials
4. Loads tenant dashboard

#### **Method 2: Wallet Login**
1. Enter Solana wallet address
2. Click **Login**
3. System validates wallet ownership
4. Loads tenant dashboard

> **Note**: Currently uses email/wallet lookup. Password authentication can be added for production.

---

## 📊 What Tenants Can See

After logging in, tenants get access to:

### **🏡 Lease Information Card**
- Property name and address
- Monthly rent amount (in USDC)
- Lease start and end dates
- Active lease status badge

### **📊 Overview Tab**
- **Maintenance Requests**: Total count
- **Completed Payments**: Number of paid invoices
- **Pending Payments**: Outstanding payments

### **🔧 Maintenance Tab**
- **View** all maintenance requests
- **Submit** new maintenance requests with:
  - Title and description
  - Category (10 options: plumbing, electrical, HVAC, etc.)
  - Priority (low, medium, high, urgent)
- **Track** status of existing requests
- Color-coded status badges (pending, approved, in progress, completed)

### **💳 Payments Tab**
- **View** complete payment history
- **See** payment status (pending, processing, completed, failed)
- **Pay Now** button for pending payments
- Transaction hash display
- Due dates and paid dates

---

## 🎨 Tenant Portal Features

### **Dashboard Layout**
```
┌─────────────────────────────────────────────────┐
│  Welcome, John Doe!             [Logout]        │
│  tenant1@example.com                            │
├─────────────────────────────────────────────────┤
│  🏡 Modern Downtown Apartment                   │
│  123 Main St, San Francisco, CA                 │
│                                                  │
│  Monthly Rent: $1,500 USDC    ✓ Active Lease   │
│  Lease: Jan 1 - Dec 31, 2024                    │
└─────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  📊 Overview  │  🔧 Maintenance  │  💳 Payments  │
├──────────────────────────────────────────────────┤
│                                                   │
│  [Tab Content Here]                              │
│                                                   │
└───────────────────────────────────────────────────┘
```

### **Maintenance Request Submission**
```
┌──────────────────────────────────────────┐
│  Submit Maintenance Request              │
├──────────────────────────────────────────┤
│  Title: [Leaking faucet]                 │
│                                           │
│  Description:                             │
│  [Kitchen faucet dripping continuously]   │
│                                           │
│  Category: [Plumbing ▼]                   │
│  Priority: [Medium ▼]                     │
│                                           │
│  [Submit Request]  [Cancel]               │
└──────────────────────────────────────────┘
```

### **Payment Initiation**
```
┌─────────────────────────────────────────┐
│  Payment: $1,500 USDC                   │
│  Due: December 1, 2024                  │
│                                          │
│  Status: 🟡 Pending                     │
│                                          │
│  [Pay Now] ← Click to pay with USDC    │
└─────────────────────────────────────────┘
```

---

## 🔧 Complete Setup Example

Here's a full example to set up a working tenant account:

### **1. Create Tenant User**
```
Email: sarah@example.com
Password: SafePassword123!
```

### **2. Add to Users Table**
```sql
INSERT INTO users (id, email, full_name, user_type, phone, wallet_address, is_active)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  'sarah@example.com',
  'Sarah Johnson',
  'tenant',
  '(555) 987-6543',
  NULL,  -- optional wallet address
  true
);
```

### **3. Create Active Lease**
```sql
INSERT INTO leases (
  property_id, 
  tenant_id, 
  start_date, 
  end_date, 
  monthly_rent_usdc, 
  security_deposit_usdc,
  rent_due_day,
  status
)
VALUES (
  'b0000000-0000-0000-0000-000000000001', -- Property UUID
  'b1111111-1111-1111-1111-111111111111', -- Tenant UUID
  '2024-01-01',
  '2024-12-31',
  1500.00,
  3000.00,
  1,
  'active'
);
```

### **4. Test Login**
1. Go to http://localhost:3000
2. Login as manager (or click Tenant Portal button)
3. In tenant portal login screen:
   - Email: `sarah@example.com`
   - Or Wallet: [tenant's Solana wallet]
4. Click **Login**

✅ Sarah can now access her tenant dashboard!

---

## 🎯 Tenant Portal Capabilities

### **What Tenants Can Do:**
✅ View lease information and property details  
✅ See monthly rent and lease period  
✅ Submit maintenance requests  
✅ Track maintenance request status  
✅ View payment history  
✅ Initiate USDC rent payments  
✅ See transaction confirmations  
✅ Check payment due dates  

### **What Tenants Cannot Do:**
❌ View other properties  
❌ See other tenants' information  
❌ Modify lease terms  
❌ Access manager dashboard  
❌ View analytics data  
❌ Approve maintenance requests  
❌ Access voice notifications (manager feature)  

---

## 🚀 Quick Start Guide

### **For Testing (5 minutes)**

1. **Use existing seed data** (if you ran `npm run seed:db`):
   - Tenant users already exist in database
   - Just need to create auth users in Supabase

2. **Create auth user for existing tenant**:
   - Email: `tenant1@example.com`
   - Password: `Tenant123!`
   - UUID: `a0000000-0000-0000-0000-000000000003` (from seed data)

3. **Login to portal**:
   - Access via manager dashboard
   - Click "🏠 Tenant Portal"
   - Enter `tenant1@example.com`
   - Click Login

---

## 🔒 Security Features

- ✅ **Row Level Security (RLS)**: Tenants only see their own data
- ✅ **Role-based Access**: Tenant role restrictions enforced
- ✅ **Lease Validation**: Must have active lease to access
- ✅ **Payment Authorization**: Can only pay own rent
- ✅ **Maintenance Scope**: Only see own requests

---

## 🆘 Troubleshooting

### **"No active lease found"**
- Verify lease exists in `leases` table
- Check lease status is `active`
- Verify `tenant_id` matches the logged-in user

### **"Invalid credentials"**
- Verify user exists in `auth.users`
- Check email is correct
- Verify role is set to `tenant`
- Ensure user is active (`is_active = true`)

### **"Cannot submit maintenance request"**
- Must have an active lease
- Check `property_id` is set correctly
- Verify backend API is running on port 3001

### **"Payment failed"**
- Check Circle API configuration
- Verify wallet address is valid
- Ensure transaction hash is generated
- Check network connection

---

## 📞 Support

For issues with tenant portal access:
1. Check browser console (F12) for errors
2. Verify backend is running: http://localhost:3001/api/health
3. Check database connections in Supabase
4. Review RLS policies for `users` and `leases` tables

---

## 🎉 Demo Tenants

If you ran the seed script, these tenants exist (just need auth setup):

**Tenant 1:**
- Name: Demo Tenant 1
- UUID: `a0000000-0000-0000-0000-000000000003`
- Email: Create as `tenant1@example.com`

**Tenant 2:**
- Name: Demo Tenant 2
- UUID: `a0000000-0000-0000-0000-000000000004`
- Email: Create as `tenant2@example.com`

Both have active leases in the seed data!

---

**Ready to explore the tenant experience!** 🏠✨
