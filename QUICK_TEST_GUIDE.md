# 🚀 Quick Test Guide - Role-Based Access

## What Changed?

✅ **Tenants now login directly** - No more "Tenant Portal" button!  
✅ **Automatic routing** - Your role determines what you see  
✅ **Maintenance requests work** - Fixed the backend issue  

---

## How to Test

### Step 1: Start the Application

```bash
npm run dev
```

Wait for both frontend and backend to start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

---

### Step 2: Test as Tenant

1. **Open browser:** http://localhost:3000

2. **Login with tenant credentials:**
   ```
   Email: john.doe@email.com
   Password: Tenant2024!
   ```

3. **You should see:**
   - ✅ "Tenant Portal" header
   - ✅ Your lease information
   - ✅ Three tabs: Overview, Maintenance, Payments

4. **Test Maintenance Request:**
   - Click "Maintenance" tab
   - Click "+ New Request" button
   - Fill in the form:
     - Title: `Broken AC`
     - Description: `Air conditioner not cooling`
     - Category: `HVAC`
     - Priority: `High`
   - Click "Submit Request"
   - **Expected Result:** ✅ Success message appears!

5. **Sign out** (top right button)

---

### Step 3: Test as Manager

1. **Login with manager credentials:**
   ```
   Email: manager@rentflow.ai
   Password: RentFlow2024!
   ```

2. **You should see:**
   - ✅ Full manager dashboard
   - ✅ Multiple tabs: Dashboard, Properties, Leases, etc.
   - ✅ All properties and maintenance requests

3. **Check the maintenance request:**
   - Click "Maintenance" tab
   - You should see the "Broken AC" request from John Doe
   - Status should be "pending"

---

## What's Different?

### Before:
```
1. Login as manager
2. Click "Tenant Portal" button
3. Login again as tenant
4. Try to submit maintenance request
5. ❌ Request fails (backend error)
```

### Now:
```
1. Login as tenant
2. Automatically see tenant dashboard
3. Submit maintenance request
4. ✅ Request succeeds!
```

---

## Troubleshooting

### If maintenance submission fails:

1. **Check backend logs** (terminal where `npm run dev` is running)
2. **Look for error messages** related to `requestor_id`
3. **Verify the backend is running** on port 3001

### If you don't see the tenant dashboard:

1. **Clear browser cache:** Ctrl + Shift + Delete
2. **Hard refresh:** Ctrl + F5
3. **Check browser console:** F12 → Console tab
4. **Verify you're using a tenant account** (not manager)

---

## Demo Accounts

### Manager Account:
- Email: `manager@rentflow.ai`
- Password: `RentFlow2024!`
- **Sees:** Full manager dashboard

### Tenant Accounts (all same password):
- Email: `john.doe@email.com`
- Email: `jane.smith@email.com`
- Email: `mike.wilson@email.com`
- Password: `Tenant2024!`
- **Sees:** Tenant-only dashboard

---

## Success Criteria

✅ Tenant login shows tenant dashboard immediately  
✅ Manager login shows manager dashboard immediately  
✅ Maintenance request submission works for tenants  
✅ No "Tenant Portal" button needed  
✅ Each role sees appropriate interface  

---

## Next Actions

After testing, you can:
1. Add more properties (as manager)
2. Create more leases for tenants
3. Test payment workflows
4. Try the voice notifications feature

Enjoy the improved experience! 🎉
