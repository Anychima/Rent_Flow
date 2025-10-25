# 🚀 RentFlow AI - Quick Start Guide

## ✅ Your Setup is Complete!

All database migrations and user accounts have been successfully configured.

---

## 🔐 Login Credentials

### **Property Manager Account**
```
📧 Email:    manager@rentflow.ai
🔑 Password: RentFlow2024!
```

### **Tenant Accounts**
All tenants use the same password:
```
🔑 Password: Tenant2024!

📧 Emails:
   - john.doe@email.com
   - jane.smith@email.com
   - mike.wilson@email.com
```

---

## 🏁 How to Start the Application

### Option 1: Start Both Frontend & Backend (Recommended)

```bash
npm run dev
```

This starts:
- Backend API on `http://localhost:3001`
- Frontend on `http://localhost:3000`

### Option 2: Start Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

---

## 🌐 Access the Application

1. **Open your browser** and go to: `http://localhost:3000`

2. **Login with Manager Credentials:**
   - Click "Click to fill credentials" button in the login form
   - Or manually enter:
     - Email: `manager@rentflow.ai`
     - Password: `RentFlow2024!`

3. **Click "Sign in"**

---

## 🐛 Troubleshooting Login Issues

If you see "Invalid login credentials", try these steps:

### Step 1: Clear Browser Cache
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Clear cached images and files
3. Refresh the page (`Ctrl + F5` or `Cmd + Shift + R`)

### Step 2: Restart the Frontend
```bash
# Stop the frontend (Ctrl + C in terminal)
# Then restart:
cd frontend
npm start
```

### Step 3: Verify Credentials
Run this command to verify your credentials are correct:
```bash
npm run debug:login
```

### Step 4: Reset Password
If still not working, reset the password:
```bash
npm run setup:passwords
```

---

## 🎯 What You Can Do

### As Property Manager (`manager@rentflow.ai`):
- ✅ Manage properties (add, edit, delete)
- ✅ Create and manage leases
- ✅ Track payments and revenue
- ✅ Handle maintenance requests
- ✅ Use AI-powered maintenance analysis (OpenAI)
- ✅ Send voice notifications to tenants (ElevenLabs)
- ✅ View analytics and reports

### As Tenant (e.g., `john.doe@email.com`):
- ✅ View lease details
- ✅ Make rent payments in USDC
- ✅ Submit maintenance requests
- ✅ View payment history
- ✅ Receive voice notifications

---

## 📱 Testing the Tenant Portal

1. **From the main dashboard**, click **"Tenant Portal"** button
2. **Login as a tenant:**
   - Email: `john.doe@email.com`
   - Password: `Tenant2024!`
3. **Explore tenant features**

---

## 🔧 Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run debug:login` | Test login credentials |
| `npm run setup:passwords` | Reset all demo passwords |
| `npm run verify:migration` | Verify database migration |
| `npm run test:frontend-login` | Test frontend login simulation |

---

## 📊 API Endpoints

Your backend API is running at `http://localhost:3001`

### Test the API:
```bash
curl http://localhost:3001/api/health
```

### Key Endpoints:
- `GET /api/properties` - List all properties
- `GET /api/leases` - List all leases
- `GET /api/payments` - List all payments
- `POST /api/tenant/login` - Tenant login
- `POST /api/voice/send` - Send voice notification

---

## 🆘 Still Having Issues?

### Check if services are running:

**Backend:**
```bash
curl http://localhost:3001/api/health
```
Expected: `{"status":"healthy","timestamp":"..."}`

**Frontend:**
Open `http://localhost:3000` in browser

### Check environment variables:

**Backend (.env):**
```bash
cat .env | grep SUPABASE
```

**Frontend (frontend/.env):**
```bash
cat frontend/.env | grep REACT_APP_SUPABASE
```

### View logs:
- Backend logs appear in the terminal where you ran `npm run dev`
- Frontend logs appear in browser console (F12 → Console tab)

---

## 📝 Next Steps

1. ✅ Login with manager credentials
2. ✅ Add a new property
3. ✅ Create a lease for a tenant
4. ✅ Test payment processing
5. ✅ Submit a maintenance request
6. ✅ Try AI maintenance analysis
7. ✅ Send a voice notification
8. ✅ Test the tenant portal

---

## 🎉 You're All Set!

Your RentFlow AI application is fully configured and ready to use. Enjoy exploring the features!

If you encounter any issues, run:
```bash
npm run debug:login
```

For complete documentation, see:
- `README.md` - Project overview
- `DEMO_SETUP.md` - Demo account setup
- `TENANT_PORTAL_ACCESS.md` - Tenant portal guide
- `VOICE_NOTIFICATIONS.md` - Voice notification features
