# 🚀 Server Startup Guide - Connection Issues Fix

**Problem**: One browser shows "ERR_CONNECTION_REFUSED", another shows empty page  
**Solution**: Follow this guide to properly start servers and clear cache

---

## ✅ Step-by-Step Startup Process

### Step 1: Stop Any Running Servers

**Windows (PowerShell)**:
```powershell
# Check what's running on ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# If needed, kill processes (replace <PID> with actual number)
taskkill /F /PID <PID>
```

**Mac/Linux**:
```bash
# Check what's running
lsof -i :3000
lsof -i :3001

# Kill if needed
kill -9 <PID>
```

### Step 2: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output**:
```
🚀 Server running on http://localhost:3001
✅ Supabase connected
```

**If you see errors**:
- Missing dependencies → Run `npm install`
- Port in use → Kill process from Step 1
- Environment error → Check `.env` file exists

### Step 3: Start Frontend Server

**In a NEW terminal**:
```bash
cd frontend
npm start
```

**Expected Output**:
```
Compiled successfully!
webpack compiled with 0 warnings
You can now view rent_flow in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

### Step 4: Verify Servers Are Running

**Run verification script**:
```bash
cd scripts
ts-node verify-servers.ts
```

**OR manually check**:

Backend:
```bash
curl http://localhost:3001/api/health
```

Frontend:
```bash
curl http://localhost:3000
```

### Step 5: Clear Browser Cache

**Option A: Use Clear-Cache Tool** (Recommended)
1. Open browser
2. Navigate to: `http://localhost:3000/clear-cache.html`
3. Click "Clear All Cache & Reload"
4. Wait for automatic redirect

**Option B: Manual Clearing**
1. Open browser DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

**Option C: Incognito Mode** (Quick test)
- Open browser in incognito/private mode
- Navigate to `http://localhost:3000`
- Should work without cache issues

---

## 🔍 Troubleshooting Specific Errors

### Error: "ERR_CONNECTION_REFUSED"

**Cause**: Backend server is not running

**Fix**:
1. Start backend: `cd backend && npm run dev`
2. Verify it's running: `curl http://localhost:3001/api/health`
3. Check firewall is not blocking port 3001

### Error: Empty/Blank Page

**Cause**: Browser cache corruption

**Fix**:
1. Access: `http://localhost:3000/clear-cache.html`
2. Click "Clear All Cache & Reload"
3. OR use browser's hard reload (Ctrl+Shift+R)

### Error: "Failed to compile"

**Cause**: Frontend compilation error

**Fix**:
1. Check terminal for error details
2. Fix syntax errors in code
3. Run `npm install` if dependencies missing
4. Delete `node_modules` and reinstall if persistent

### Error: Different Browsers Show Different Results

**Cause**: Each browser has separate cache

**Fix**:
- Clear cache in EACH browser you're using
- OR test all browsers in incognito mode
- Use the clear-cache.html tool in each browser

---

## 🎯 Quick Start Commands

### Method 1: Root Script (Recommended)
```bash
# From project root
npm run dev
```

This starts both backend and frontend concurrently.

### Method 2: Manual Start
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend (NEW terminal)
cd frontend
npm start
```

### Method 3: With Verification
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start

# Terminal 3 - Verify (after both are running)
cd scripts
ts-node verify-servers.ts
```

---

## 📋 Pre-Start Checklist

Before starting servers, verify:

- [ ] Node.js is installed (`node --version`)
- [ ] npm is installed (`npm --version`)
- [ ] Dependencies are installed (`npm run install:all`)
- [ ] `.env` files exist in root, backend, and frontend
- [ ] Ports 3000 and 3001 are free
- [ ] No other RentFlow instances running

---

## 🧹 Clean Start (If All Else Fails)

```bash
# 1. Stop all servers (Ctrl+C in terminals)

# 2. Kill any lingering processes
# Windows:
taskkill /F /IM node.exe

# Mac/Linux:
killall node

# 3. Clear browser cache
# Use http://localhost:3000/clear-cache.html (if accessible)
# OR manual clear (Ctrl+Shift+Delete)

# 4. Delete node_modules and reinstall (if needed)
rm -rf node_modules backend/node_modules frontend/node_modules
rm -rf package-lock.json backend/package-lock.json frontend/package-lock.json
npm run install:all

# 5. Start fresh
npm run dev
```

---

## 🌐 Accessing the Application

Once both servers are running:

### Main Application
```
http://localhost:3000
```

### Cache Clearing Tool
```
http://localhost:3000/clear-cache.html
```

### API Health Check
```
http://localhost:3001/api/health
```

### API Endpoints
```
http://localhost:3001/api/properties
http://localhost:3001/api/leases
http://localhost:3001/api/payments
```

---

## 💻 Development Workflow

### Daily Startup Routine

```bash
# 1. Pull latest changes
git pull

# 2. Install any new dependencies
npm run install:all

# 3. Start servers
npm run dev

# 4. Clear browser cache if needed
# Visit: http://localhost:3000/clear-cache.html

# 5. Start developing!
```

### When Switching Branches

```bash
# 1. Stop servers (Ctrl+C)
# 2. Switch branch
git checkout <branch-name>

# 3. Reinstall dependencies
npm run install:all

# 4. Clear cache
# Visit: http://localhost:3000/clear-cache.html

# 5. Restart servers
npm run dev
```

---

## 🔧 Useful Commands

### Check Server Status
```bash
# Verify both servers
ts-node scripts/verify-servers.ts

# Check specific port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Mac/Linux
```

### View Logs
```bash
# Backend logs
cd backend
npm run dev
# Look for errors in terminal output

# Frontend logs  
cd frontend
npm start
# Look for compilation errors
```

### Restart Servers
```bash
# Stop: Ctrl+C in each terminal
# Start again: npm run dev (from root)
```

---

## 📚 Related Documentation

- **BROWSER_CACHE_FIX.md** - Detailed cache troubleshooting
- **DEBUGGING_GUIDE.md** - General debugging tips
- **CLEAR_CACHE_INSTRUCTIONS.md** - Manual cache clearing guide
- **clear-cache.html** - Browser diagnostic tool

---

## ✅ Success Checklist

After following this guide, you should have:

- [ ] Backend running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Health endpoint responding: `/api/health`
- [ ] App loads in browser without errors
- [ ] Login/navigation works
- [ ] No console errors (F12)
- [ ] Same behavior in all browsers

---

## 🆘 Still Having Issues?

1. **Read the error messages** in terminal carefully
2. **Check browser console** (F12) for JavaScript errors
3. **Verify environment variables** in `.env` files
4. **Try incognito mode** to rule out cache issues
5. **Restart your computer** (clears port conflicts)
6. **Check BROWSER_CACHE_FIX.md** for detailed solutions

---

**Last Updated**: October 22, 2025  
**Status**: ✅ Complete  
**Tools**: clear-cache.html, verify-servers.ts
