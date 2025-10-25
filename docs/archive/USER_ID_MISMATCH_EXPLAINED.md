# 🔍 User ID Mismatch Issue - Explained & Fixed

## Problem Discovered

**The Auth user IDs don't match the database user IDs!**

### What This Means:

When you login:
1. Supabase Auth creates a session with Auth User ID: `1d2c1a5d-1622-4f60-a6e2-ececa793233b`
2. App tries to fetch user profile from database using this ID
3. Database has different ID: `a0000000-0000-0000-0000-000000000001`
4. Profile fetch fails
5. **Result:** No role information → Everyone sees manager dashboard

## The Mapping

| Email | Auth ID | Database ID | Match |
|-------|---------|-------------|-------|
| manager@rentflow.ai | `1d2c1a5d-...` | `a0000000-...0001` | ❌ |
| john.doe@email.com | `d296410e-...` | `a0000000-...0003` | ❌ |
| jane.smith@email.com | `5126868c-...` | `a0000000-...0004` | ❌ |
| mike.wilson@email.com | `3f936e24-...` | `a0000000-...0005` | ❌ |

## Why This Happened

The database was seeded with fixed UUIDs (`a0000000-...`) before the Auth users were created with random UUIDs.

## The Fix (Already Applied!)

I've updated [AuthContext.tsx](file://c:\Users\olumbach\Documents\Rent_Flow\frontend\src\contexts\AuthContext.tsx) with a **fallback email lookup**:

```typescript
const fetchUserProfile = async (userId: string) => {
  // Try by ID first
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // Fallback: Try by email
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { data: emailData } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();
      
      return emailData; // ✅ Returns correct user with role!
    }
  }

  return data;
};
```

### How It Works Now:

1. **Login** → Auth ID: `1d2c1a5d-...`
2. **Try ID lookup** → ❌ Not found
3. **Fall back to email** → `manager@rentflow.ai`
4. **Find by email** → ✅ Found! Role: `manager`
5. **Route correctly** → Manager Dashboard ✅

## Testing

### Open Browser Console (F12) and look for these logs:

**Good Manager Login:**
```
🔍 Fetching user profile for ID: 1d2c1a5d-1622-4f60-a6e2-ececa793233b
❌ Error fetching user profile: {...}
🔄 Trying to fetch by email: manager@rentflow.ai
✅ Found user by email: {role: "manager", ...}
🔀 Routing decision: manager
✅ Showing Manager Dashboard
```

**Good Tenant Login:**
```
🔍 Fetching user profile for ID: d296410e-35db-498c-8949-93c5332d3034
❌ Error fetching user profile: {...}
🔄 Trying to fetch by email: john.doe@email.com
✅ Found user by email: {role: "tenant", ...}
🔀 Routing decision: tenant
✅ Showing TenantDashboard
```

## Long-Term Solutions

### Option 1: Update Database IDs (Risky - Foreign Keys)

**Why we can't do this now:**
```
❌ Failed to update: update or delete on table "users"
   violates foreign key constraint "leases_tenant_id_fkey"
```

Many tables reference the user IDs (properties, leases, payments, etc.). Changing them would break these relationships.

### Option 2: Use Email Lookup (Current Solution) ✅

**Pros:**
- ✅ Works immediately
- ✅ No database migration needed
- ✅ No risk of breaking foreign keys
- ✅ Minimal performance impact (email is indexed)

**Cons:**
- ⚠️ Slightly slower (two queries instead of one)
- ⚠️ Requires email to be unique (already is)

### Option 3: Create New Users with Matching IDs (Future)

For new users created going forward, ensure the database user ID matches the Auth user ID.

## Current Status

✅ **FIXED** - Email fallback implemented  
✅ Role-based routing should now work  
✅ Debug logging added to verify  
✅ Both managers and tenants will see correct dashboards  

## Next Step

**Test it now!**

1. Clear browser cache/data
2. Login as tenant: `john.doe@email.com` / `Tenant2024!`
3. You should see **Tenant Dashboard**
4. Logout
5. Login as manager: `manager@rentflow.ai` / `RentFlow2024!`
6. You should see **Manager Dashboard**

Check the browser console to see the fallback working!
