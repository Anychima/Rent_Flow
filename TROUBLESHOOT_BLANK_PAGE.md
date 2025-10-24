# 🔍 Troubleshooting Blank Page

## Step 1: Check Browser Console

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Look for **RED errors**
4. Copy and share any errors you see

Common errors and fixes:

### Error: "Module not found"
```bash
cd frontend
npm install
npm start
```

### Error: "Cannot read property of undefined"
- Check if backend is running at `http://localhost:3001`
- Check browser Network tab for failed API calls

### Error: "Unexpected token"
- Build error - need to fix TypeScript errors
- Run: `npm run build` to see detailed errors

---

## Step 2: Verify Servers are Running

### Backend Server:
```bash
cd backend
npm run dev
```
Should show:
```
✅ Server running on http://localhost:3001
```

### Frontend Server:
```bash
cd frontend
npm start
```
Should show:
```
Compiled successfully!
You can now view rentflow-frontend in the browser.
Local: http://localhost:3000
```

---

## Step 3: Hard Refresh Browser

After both servers are running:
- Press `Ctrl + Shift + R` (Chrome/Edge)
- Or `Ctrl + F5`
- Or F12 → Right-click refresh → "Empty Cache and Hard Reload"

---

## Step 4: Check Network Tab

1. Press F12
2. Go to **Network** tab
3. Refresh page
4. Look for **RED** (failed) requests

Common issues:
- **CORS errors**: Backend not running
- **404 errors**: Frontend routing issue
- **500 errors**: Backend errors (check backend console)

---

## Step 5: Verify .env Files

### Frontend (.env):
```env
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_KEY=your_supabase_key
```

### Backend (.env):
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
# ... other variables
```

---

## Step 6: Clear Everything and Restart

```bash
# Stop all servers (Ctrl+C)

# Frontend
cd frontend
rm -rf node_modules
rm -rf build
npm install
npm start

# Backend (in new terminal)
cd backend
npm run dev
```

---

## Step 7: Check Common Issues

### Issue: White/Blank Screen
**Possible causes:**
1. ✅ JavaScript error (check Console)
2. ✅ Backend not running
3. ✅ Missing dependencies
4. ✅ Build cache issue

### Issue: Page loads but shows "Loading..."
**Possible causes:**
1. ✅ API calls failing
2. ✅ Authentication issue
3. ✅ Database connection problem

---

## Quick Test

Open browser and go to:
1. `http://localhost:3000` - Should show frontend
2. `http://localhost:3001/api/health` - Should show: `{"status":"healthy"}`

If #2 fails, backend is not running!

---

## Still Blank?

**Share this info:**
1. Browser console errors (F12 → Console)
2. Network errors (F12 → Network → failed requests)
3. Backend console output
4. Node version: `node --version`
5. Which page is blank? (Login, Dashboard, etc.)

---

## Last Resort: Start Fresh

```bash
# Kill all node processes
# Windows:
taskkill /F /IM node.exe

# Then restart:
cd backend
npm run dev

# New terminal:
cd frontend
npm start
```

Then go to: `http://localhost:3000`
