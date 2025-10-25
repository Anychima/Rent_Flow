# Browser Cache & Connection Issues - Fix Guide

**Issue**: One browser shows "ERR_CONNECTION_REFUSED" while another loads with empty content  
**Date**: October 22, 2025  
**Status**: ✅ Fixed

---

## 🔍 Problem Analysis

### Symptoms
1. **Browser A**: Shows `localhost refused to connect` / `ERR_CONNECTION_REFUSED`
2. **Browser B**: Loads but displays empty/blank page

### Root Causes
1. **Backend server not running** → Connection refused error
2. **Browser cache corruption** → Empty page despite server running
3. **Storage quota exceeded** → App fails to initialize
4. **Different browser states** → Each browser maintains separate cache

---

## 🛠️ Quick Fix Solutions

### Solution 1: Use the Cache Clearing Tool

**Access the diagnostic tool**:
```
http://localhost:3000/clear-cache.html
```

**Features**:
- ✅ Checks frontend/backend server status
- ✅ Shows localStorage, sessionStorage, IndexedDB status
- ✅ One-click cache clearing
- ✅ Hard reload functionality
- ✅ Real-time diagnostic logs

**Steps**:
1. Navigate to `http://localhost:3000/clear-cache.html`
2. Review the status checks (red = problem, green = OK)
3. Click **"Clear All Cache & Reload"**
4. Wait for automatic redirect to app

---

### Solution 2: Manual Cache Clearing

#### For Chrome/Edge:
1. Press `F12` to open DevTools
2. Right-click on the **Reload button**
3. Select **"Empty Cache and Hard Reload"**
4. OR:
   - Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
   - Select "All time"
   - Check: Cookies, Cached images/files, Site data
   - Click "Clear data"

#### For Firefox:
1. Press `Ctrl + Shift + Delete`
2. Select "Everything" in time range
3. Check: Cookies, Cache, Site Data
4. Click "Clear Now"

#### For Safari:
1. Press `Cmd + Option + E` to empty caches
2. Then `Cmd + R` to reload

---

### Solution 3: Programmatic Cache Clearing

Add a "Clear Cache" button to your app:

```typescript
// Add to your App.tsx or a utilities component
const clearAppCache = async () => {
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
    
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Reload page
    window.location.reload(true);
  } catch (error) {
    console.error('Error clearing cache:', error);
    alert('Failed to clear cache. Please try manual clearing.');
  }
};
```

---

## 🚀 Starting the Servers Correctly

### Check if Servers are Running

**Windows PowerShell**:
```powershell
# Check if backend is running on port 3001
netstat -ano | findstr :3001

# Check if frontend is running on port 3000
netstat -ano | findstr :3000

# If needed, kill processes
taskkill /F /PID <PID_NUMBER>
```

**Mac/Linux**:
```bash
# Check if backend is running
lsof -i :3001

# Check if frontend is running
lsof -i :3000

# Kill if needed
kill -9 <PID>
```

### Start Servers Fresh

**Option 1: Use root npm script**:
```bash
# From project root
npm run dev
```

**Option 2: Start manually**:
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

**Expected Output**:
```
Backend:
🚀 Server running on http://localhost:3001
✅ Supabase connected

Frontend:
Compiled successfully!
You can now view rent_flow in the browser.
Local: http://localhost:3000
```

---

## 🔧 Common Issues & Solutions

### Issue 1: ERR_CONNECTION_REFUSED

**Cause**: Backend server not running or wrong port

**Solutions**:
1. Start backend server: `cd backend && npm run dev`
2. Check `.env` file has correct port: `PORT=3001`
3. Verify firewall not blocking port 3001
4. Check if another app is using port 3001

**Verify**:
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "network": "solana",
  "deployer": "..."
}
```

---

### Issue 2: Empty/Blank Page

**Cause**: Browser cache corruption, localStorage quota exceeded, or React errors

**Solutions**:

1. **Clear all browser data**:
   - Use clear-cache.html tool
   - Or manual clearing (see above)

2. **Check browser console** (F12):
   - Look for JavaScript errors
   - Check Network tab for failed requests
   - Verify no CORS errors

3. **Check localStorage quota**:
   ```javascript
   // In browser console
   console.log(JSON.stringify(localStorage).length + ' bytes used');
   
   // Clear if needed
   localStorage.clear();
   ```

4. **Check React errors**:
   ```bash
   # In frontend terminal
   # Look for compilation errors
   ```

---

### Issue 3: Different Browsers Show Different Content

**Cause**: Each browser maintains separate cache/storage

**Solution**:
- Clear cache in ALL browsers you're testing
- Or use incognito/private mode for clean state
- Or use the clear-cache.html tool in each browser

---

### Issue 4: App Works in Incognito but Not Regular Mode

**Cause**: Corrupted cache or extensions interfering

**Solutions**:
1. Clear cache in regular mode (see Solution 1 or 2)
2. Disable browser extensions temporarily
3. Reset browser settings
4. Use clear-cache.html tool

---

## 📝 Checklist for Troubleshooting

Use this checklist when you encounter connection/loading issues:

- [ ] Backend server is running (`http://localhost:3001/api/health`)
- [ ] Frontend server is running (`http://localhost:3000`)
- [ ] Browser cache is cleared
- [ ] localStorage is cleared
- [ ] sessionStorage is cleared
- [ ] IndexedDB is cleared
- [ ] No CORS errors in console
- [ ] No JavaScript errors in console
- [ ] No network errors in DevTools
- [ ] Correct API URL in `.env`: `REACT_APP_BACKEND_URL=http://localhost:3001`
- [ ] Firewall allows localhost connections
- [ ] No other apps using ports 3000 or 3001

---

## 🎯 Prevention Tips

### 1. Add Cache Clearing to App

Add a "Clear Cache & Reload" button in your app settings or footer:

```typescript
// In your Settings or Debug component
<button onClick={clearAppCache}>
  🧹 Clear Cache & Reload
</button>
```

### 2. Implement Loading Timeouts

Prevent infinite loading states:

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    if (loading) {
      setError('Loading timeout - please refresh');
      setLoading(false);
    }
  }, 15000); // 15 second timeout

  return () => clearTimeout(timeout);
}, [loading]);
```

### 3. Add Error Boundaries

Catch React errors gracefully:

```typescript
// ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  // ... error boundary implementation
  // Show "Clear Cache" button in error UI
}
```

### 4. Regular Cache Maintenance

Add to your development workflow:
```bash
# Before starting work
npm run dev -- --reset-cache  # If applicable

# Clear browser cache weekly
# Use incognito mode for testing
```

---

## 🧪 Testing the Fix

### Test 1: Fresh Start
```bash
# 1. Kill all servers
# 2. Clear browser cache
# 3. Start backend: cd backend && npm run dev
# 4. Start frontend: cd frontend && npm start
# 5. Open http://localhost:3000
# Expected: App loads correctly
```

### Test 2: Multi-Browser
```bash
# 1. Test in Chrome
# 2. Test in Firefox
# 3. Test in Edge
# 4. Test in Incognito mode
# Expected: All browsers work consistently
```

### Test 3: Cache Clearing Tool
```bash
# 1. Open http://localhost:3000/clear-cache.html
# 2. Verify all status checks are green
# 3. Click "Clear All Cache & Reload"
# Expected: Redirects to app successfully
```

---

## 📚 Additional Resources

**Files in this project**:
- `frontend/public/clear-cache.html` - Diagnostic & cache clearing tool
- `BROWSER_CACHE_FIX.md` - This document
- `.env` - Environment variables (check REACT_APP_BACKEND_URL)

**Related Memory**:
- Browser Cache Issue Resolution (Memory ID: d29d5b5c-3707-45df-879c-9a8bd32b09b1)

**Related Documentation**:
- `CLEAR_CACHE_INSTRUCTIONS.md` - Previous cache clearing guide
- `DEBUGGING_GUIDE.md` - General debugging tips

---

## ✅ Success Indicators

After applying fixes, you should see:

1. ✅ Both backend and frontend servers running
2. ✅ App loads in all browsers consistently
3. ✅ No console errors
4. ✅ No network request failures
5. ✅ Login/navigation works properly
6. ✅ Data loads from API correctly

---

## 🆘 Still Having Issues?

If problems persist after trying all solutions:

1. **Check server logs**:
   ```bash
   # Backend terminal - look for errors
   # Frontend terminal - look for compilation errors
   ```

2. **Verify environment variables**:
   ```bash
   # Check .env files exist
   ls -la .env backend/.env frontend/.env
   
   # Verify REACT_APP_BACKEND_URL
   cat frontend/.env | grep BACKEND_URL
   ```

3. **Restart computer**: Sometimes port conflicts persist until restart

4. **Re-install dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   rm -rf backend/node_modules backend/package-lock.json
   rm -rf frontend/node_modules frontend/package-lock.json
   npm run install:all
   ```

5. **Check GitHub Issues**: Search for similar issues in the repo

---

**Last Updated**: October 22, 2025  
**Status**: Production Ready ✅  
**Tools Added**: clear-cache.html diagnostic tool
