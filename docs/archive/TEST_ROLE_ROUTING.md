# 🧪 Testing Role-Based Routing

## Issue Fixed

**Problem:** Tenants and managers were seeing the same dashboard

**Root Cause:** 
1. Auth user ID from Supabase Auth didn't match database user ID
2. User profile wasn't fully loaded before routing decision
3. No fallback to look up users by email

**Solutions Applied:**
1. ✅ Added fallback email lookup in AuthContext
2. ✅ Added loading state to wait for userProfile
3. ✅ Added debug logging to track routing decisions

---

## How to Test

### Step 1: Clear Browser Data

**Important:** Clear your browser cache and local storage first!

```
1. Press F12 (open DevTools)
2. Go to "Application" tab
3. Click "Clear site data"
4. Refresh the page
```

### Step 2: Test Tenant Login

1. **Open:** http://localhost:3000
2. **Login as:**
   ```
   Email: john.doe@email.com
   Password: Tenant2024!
   ```

3. **Check Console Logs (F12 → Console):**
   ```
   🔍 Fetching user profile for ID: [some-uuid]
   ✅ User profile loaded: {role: "tenant", ...}
   🔀 Routing decision: tenant
   ✅ Showing TenantDashboard
   ```

4. **You Should See:**
   - ✅ "Tenant Portal" header (not "RentFlow AI")
   - ✅ Three tabs: Overview, Maintenance, Payments
   - ✅ Your lease information
   - ✅ **NO** properties, leases, analytics tabs

5. **Sign Out**

### Step 3: Test Manager Login

1. **Login as:**
   ```
   Email: manager@rentflow.ai
   Password: RentFlow2024!
   ```

2. **Check Console Logs:**
   ```
   🔍 Fetching user profile for ID: [some-uuid]
   ✅ User profile loaded: {role: "manager", ...}
   🔀 Routing decision: manager
   ✅ Showing Manager Dashboard
   ```

3. **You Should See:**
   - ✅ "RentFlow AI" header
   - ✅ Full navigation: Dashboard, Properties, Leases, Payments, Analytics, Maintenance, Notifications
   - ✅ Property management features
   - ✅ All data (not just tenant-specific)

---

## Debug Console Logs

### Good Tenant Login:
```javascript
🔍 Fetching user profile for ID: 1d2c1a5d-1622-4f60-a6e2-ececa793233b
✅ User profile loaded: {
  id: "a0000000-0000-0000-0000-000000000003",
  email: "john.doe@email.com",
  role: "tenant",
  user_type: "tenant"
}
🔀 Routing decision: tenant
✅ Showing TenantDashboard
```

### Good Manager Login:
```javascript
🔍 Fetching user profile for ID: 1d2c1a5d-1622-4f60-a6e2-ececa793233b
✅ User profile loaded: {
  id: "a0000000-0000-0000-0000-000000000001",
  email: "manager@rentflow.ai", 
  role: "manager",
  user_type: "property_manager"
}
🔀 Routing decision: manager
✅ Showing Manager Dashboard
```

### Fallback Email Lookup (if ID doesn't match):
```javascript
🔍 Fetching user profile for ID: 1d2c1a5d-1622-4f60-a6e2-ececa793233b
❌ Error fetching user profile: {...}
🔄 Trying to fetch by email: john.doe@email.com
✅ Found user by email: {role: "tenant", ...}
```

---

## Visual Differences

### Tenant Dashboard:
```
┌─────────────────────────────────────┐
│ Tenant Portal         👤 Sign Out │
├─────────────────────────────────────┤
│ Overview | Maintenance | Payments  │
├─────────────────────────────────────┤
│                                     │
│  Your Lease                         │
│  ├─ Property: Sunset Apartments     │
│  ├─ Rent: 1500 USDC                │
│  └─ Lease End: 2025-12-31          │
│                                     │
│  Quick Stats                        │
│  ├─ Pending Payments: 0            │
│  ├─ Maintenance Requests: 2        │
│  └─ Payments Made: 5               │
│                                     │
└─────────────────────────────────────┘
```

### Manager Dashboard:
```
┌─────────────────────────────────────┐
│ RentFlow AI          👤 Sign Out   │
├─────────────────────────────────────┤
│ Dashboard | Properties | Leases |  │
│ Payments | Analytics | Maintenance │
│ | Notifications                     │
├─────────────────────────────────────┤
│                                     │
│  📊 Stats                           │
│  ├─ Total Properties: 5            │
│  ├─ Active Leases: 3               │
│  ├─ Pending Requests: 2            │
│  └─ Total Revenue: $4,500          │
│                                     │
│  Recent Activity                    │
│  Properties Table                   │
│  [All Properties Listed]           │
│                                     │
└─────────────────────────────────────┘
```

---

## Troubleshooting

### Problem: Still seeing manager dashboard as tenant

**Solution:**
1. Check browser console for errors
2. Look for the routing decision log
3. Verify the role is "tenant" not "manager"
4. Clear browser cache completely
5. Hard refresh: Ctrl + Shift + R

### Problem: "Loading user profile..." stays forever

**Solution:**
1. Check if backend is running on port 3001
2. Check Supabase connection in .env
3. Verify user exists in database:
   ```sql
   SELECT email, role, user_type FROM users WHERE email = 'john.doe@email.com';
   ```

### Problem: Console shows "Error fetching user profile"

**Solution:**
1. Check the fallback email lookup is working
2. Verify Supabase RLS policies allow reading users table
3. Check that REACT_APP_SUPABASE_KEY is set correctly

---

## Success Criteria

✅ Tenant login → Shows "Tenant Portal" header  
✅ Tenant sees only 3 tabs (Overview, Maintenance, Payments)  
✅ Manager login → Shows "RentFlow AI" header  
✅ Manager sees all 7 tabs  
✅ Console logs show correct role detection  
✅ No errors in console  

---

## Next Steps After Testing

If everything works:
- ✅ Remove debug console.log statements (for production)
- ✅ Add unit tests for routing logic
- ✅ Document the role-based access system
- ✅ Test all tenant features (maintenance, payments)

If something doesn't work:
- 📋 Share the console logs
- 📋 Share what you're seeing vs. what you expect
- 📋 I'll help debug!
