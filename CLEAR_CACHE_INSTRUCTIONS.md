# 🧼 How to Fix "Loading Timeout" in Your Browser

## The Problem
- ✅ Works in **incognito mode**
- ❌ Doesn't work in **normal browser**
- **Cause:** Corrupted browser cache

---

## Quick Fix (Easiest)

### Option 1: Use the New Button (After Page Reloads)
1. The page will reload with a new **"Clear Cache & Reload"** button
2. Click the blue **"🧼 Clear Cache & Reload"** button
3. This will:
   - Clear localStorage
   - Clear sessionStorage  
   - Clear IndexedDB (Supabase auth)
   - Force a hard reload
4. The app should work!

---

## Manual Fix (If Button Doesn't Appear)

### Option 2: Clear Browser Data Manually

**In Chrome/Edge:**
1. Press `Ctrl + Shift + Delete`
2. Select:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
3. Time range: **All time**
4. Click **"Clear data"**
5. Go back to `http://localhost:3000`

**In Firefox:**
1. Press `Ctrl + Shift + Delete`
2. Select:
   - ✅ Cookies
   - ✅ Cache
3. Time range: **Everything**
4. Click **"Clear Now"**
5. Go back to `http://localhost:3000`

---

## Nuclear Option (If Still Not Working)

### Option 3: Clear Site Data via DevTools

1. Press `F12` to open DevTools
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. In the left sidebar, find **Storage** section
4. Click **"Clear site data"** or **"Clear storage"**
5. Confirm
6. Close DevTools
7. Refresh the page (`Ctrl + R`)

---

## Alternative: Use Incognito Until Cache Expires

Since it works in incognito mode, you can:
1. Use incognito window for now
2. Your normal browser cache will eventually expire
3. Or use the clear cache methods above

---

## Why This Happens

When you're developing, the browser caches:
- Old JavaScript code
- Old auth tokens
- Old API responses
- Old Supabase sessions

Incognito mode starts fresh each time, so it works.
Your normal browser has old cached data that conflicts.

---

## What the New Button Does

```javascript
// Clear localStorage
localStorage.clear();

// Clear sessionStorage
sessionStorage.clear();

// Clear IndexedDB (where Supabase stores auth)
window.indexedDB.databases().then(dbs => {
  dbs.forEach(db => {
    if (db.name) {
      window.indexedDB.deleteDatabase(db.name);
    }
  });
});

// Force reload (bypasses cache)
window.location.reload();
```

---

## Expected Result

After clearing cache:
- ✅ Login screen appears
- ✅ Can login as John Doe
- ✅ Dashboard loads successfully
- ✅ Payments tab shows 2 payments
- ✅ Maintenance tab works
- ✅ No more "Loading Timeout"

---

## Still Not Working?

If it STILL doesn't work after clearing cache:

1. **Check browser console** (F12 → Console)
   - Look for red errors
   - Screenshot and share

2. **Try different browser**
   - Chrome, Firefox, Edge
   - See if same issue

3. **Restart development server**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

4. **Check if you have multiple tabs open**
   - Close all localhost:3000 tabs
   - Open just one fresh tab

---

**The page will auto-reload with the new "Clear Cache" button. Just click it and you're done!** 🎉
