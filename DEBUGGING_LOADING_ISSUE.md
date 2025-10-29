# 🐛 Debugging: App Loads Endlessly / Shows Empty

## **Issue Description:**
- App loads endlessly (infinite spinner)
- After refresh, page shows empty/no properties
- Happens on home page and everywhere

---

## **✅ What's Working:**
1. ✅ Backend is running on port 3001 (PID 35516)
2. ✅ Frontend is running on port 3000 (PID 25448)
3. ✅ Both servers are up and responding

---

## **❌ Potential Root Causes:**

### **1. Stuck Loading State in AuthContext**
**Symptom:** App never stops showing the loading spinner  
**Location:** `frontend/src/contexts/AuthContext.tsx`

**Check in Browser Console:**
```javascript
// Open browser console (F12) and look for these logs:
"✅ [AuthContext] Auth initialization complete, setting loading to false"
"✅ [AuthContext] Loading set to false after profile handling"
```

If you DON'T see these logs, the loading state is stuck.

---

### **2. Supabase Environment Variables Missing**
**Symptom:** App can't connect to Supabase database  
**Location:** Frontend environment variables

**Fix:**
Check if these exist in your browser console:
```javascript
console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('REACT_APP_SUPABASE_KEY:', process.env.REACT_APP_SUPABASE_KEY);
```

Should show:
```
REACT_APP_SUPABASE_URL: https://saiceqyaootvkdenxbqx.supabase.co
REACT_APP_SUPABASE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### **3. API Calls Failing**
**Symptom:** Backend endpoints returning errors  
**Check:** Browser Network tab (F12 → Network)

**What to look for:**
- Red failed requests to `http://localhost:3001/api/...`
- 500 Internal Server Error
- CORS errors
- Timeout errors

---

### **4. Database Connection Issue**
**Symptom:** Supabase can't reach PostgreSQL  
**Check:** Backend logs

---

## **🔧 Quick Fixes to Try:**

### **Fix 1: Clear All Cache**
```javascript
// Run in browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### **Fix 2: Hard Refresh**
- Press `Ctrl + Shift + R` (Windows)
- Or `Cmd + Shift + R` (Mac)

### **Fix 3: Check Environment Variables**
```bash
# In frontend directory:
cd c:\Users\olumbach\Documents\Rent_Flow\frontend
cat .env.local
```

Should contain:
```
REACT_APP_SUPABASE_URL=https://saiceqyaootvkdenxbqx.supabase.co
REACT_APP_SUPABASE_KEY=your-anon-key-here
```

### **Fix 4: Restart Both Servers**
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Restart backend
cd c:\Users\olumbach\Documents\Rent_Flow\backend
npm run dev

# Restart frontend (new terminal)
cd c:\Users\olumbach\Documents\Rent_Flow\frontend
npm start
```

### **Fix 5: Check for Infinite Loop**
Open browser console and watch for repeated logs like:
```
🔍 [AuthContext] Fetching user profile for Auth ID: ...
🔍 [AuthContext] Fetching user profile for Auth ID: ...
🔍 [AuthContext] Fetching user profile for Auth ID: ...
```

If this repeats endlessly, there's an infinite loop.

---

## **📝 Debug Checklist:**

Run these in browser console (F12):

1. **Check loading state:**
```javascript
// Should be false after 2-3 seconds
console.log('Loading:', document.querySelector('[class*="animate-spin"]') !== null);
```

2. **Check user state:**
```javascript
// Check React DevTools → Components → AuthProvider
// Look for: loading, user, userProfile
```

3. **Check API Health:**
```javascript
fetch('http://localhost:3001/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

4. **Check Supabase Connection:**
```javascript
// In console:
fetch('https://saiceqyaootvkdenxbqx.supabase.co/rest/v1/')
  .then(r => console.log('Supabase reachable:', r.status))
  .catch(e => console.error('Supabase unreachable:', e));
```

---

## **🎯 Most Likely Fix:**

Based on the symptoms, the most likely issue is **#3: API Calls Failing**.

**What to do:**
1. Open browser (http://localhost:3000)
2. Press F12 to open DevTools
3. Click "Network" tab
4. Reload the page
5. Look for any RED (failed) requests
6. Click on the failed request
7. Check the "Response" tab for error message

**Share the error message and we can fix it immediately!**

---

## **📞 Next Steps:**

Please check your browser console and share:
1. Any error messages (red text)
2. Screenshot of Network tab showing failed requests
3. Last few log lines from console

This will tell us exactly what's wrong! 🔍
