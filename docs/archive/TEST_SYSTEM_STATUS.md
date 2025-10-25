# System Status Check

Run these commands to verify everything is working:

## 1. Check Backend is Running

```powershell
# Test backend health
(Invoke-WebRequest -Uri "http://localhost:3001/api/dashboard/stats" -UseBasicParsing).Content
```

**Expected**: `{"success":true,"data":{...}}`

---

## 2. Check Applications Endpoint

```powershell
# Test applications endpoint (was failing before)
(Invoke-WebRequest -Uri "http://localhost:3001/api/applications" -UseBasicParsing).Content
```

**Expected**: `{"success":true,"data":[]}`

---

## 3. Check Properties Endpoint

```powershell
# Test properties endpoint
(Invoke-WebRequest -Uri "http://localhost:3001/api/properties" -UseBasicParsing).Content
```

**Expected**: `{"success":true,"data":[...]}`

---

## 4. Check User Role in Database

Run in **Supabase SQL Editor**:

```sql
SELECT 
    email,
    user_type,
    role,
    CASE 
        WHEN role = 'manager' THEN '✅ CORRECT'
        ELSE '❌ WRONG'
    END as status
FROM users 
WHERE email = 'manager@rentflow.ai';
```

**Expected**:
```
email: manager@rentflow.ai
role: manager
status: ✅ CORRECT
```

---

## 5. Browser Console Check

After logging in, browser console should show:

```
==================================================
🔀 [App.tsx] Routing Decision for User:
   Email: manager@rentflow.ai
   Profile Role: manager
==================================================
✅ [App.tsx] Role is MANAGER - Showing Manager Dashboard
```

---

## ✅ All Systems Go

If all 5 checks pass:
- ✅ Backend is running
- ✅ Endpoints are working  
- ✅ Database role is correct
- ✅ Frontend is routing correctly
- ✅ Dashboard should display properly

---

## 🔴 If Any Check Fails

### Backend not running (Check 1, 2, 3 fail)
```powershell
cd backend
npm run dev
```

### Applications endpoint fails (Check 2)
- Check backend terminal for Supabase errors
- Verify table exists in Supabase
- Run `VERIFY_AND_FIX_TABLE.sql` from earlier

### Wrong role (Check 4)
- Run `CHECK_USER_ROLE.sql` to fix

### Wrong routing (Check 5)
- Clear browser cache
- Sign out and sign in again
- Check if role fix was applied
