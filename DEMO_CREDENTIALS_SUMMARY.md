# 🔐 Demo Credentials - Quick Reference

## Manager Account

**Email**: `manager@rentflow.ai`  
**Password**: `RentFlow2024!`  
**Role**: Manager (Full Access)

---

## Setup Instructions

### Quick Setup (5 minutes)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: Authentication → Users
3. **Click**: "Add user" button
4. **Enter**:
   - Email: `manager@rentflow.ai`
   - Password: `RentFlow2024!`
   - ✅ Check "Auto Confirm User"
5. **Click**: "Create user"
6. **Copy** the user UUID
7. **Go to**: Table Editor → users table
8. **Insert row**:
   ```
   id: [paste UUID from step 6]
   email: manager@rentflow.ai
   full_name: Demo Manager
   role: manager
   is_active: true
   ```
9. **Login at**: http://localhost:3000

---

## What You Get Access To

✅ **Dashboard** - Property management overview  
✅ **Properties** - 3 demo properties  
✅ **Leases** - 2 active leases  
✅ **Payments** - USDC payment processing  
✅ **Analytics** - Payment analytics dashboard  
✅ **Maintenance** - AI-powered maintenance requests  
✅ **Notifications** - Voice notifications via ElevenLabs  
✅ **Tenant Portal** - Access tenant-facing interface  

---

## Detailed Instructions

See [DEMO_SETUP.md](./DEMO_SETUP.md) for step-by-step guide with screenshots and troubleshooting.

---

## Alternative Setup

If you have the **service_role** key:

```bash
# Add to .env file
SUPABASE_SERVICE_ROLE_KEY=your-key-here

# Run setup script
npm run setup:demo
```

---

## Security Notice

⚠️ **For Demo/Development Only**

- Change password for production
- Use environment-specific credentials
- Never commit credentials to Git
- Rotate API keys regularly

---

**Need Help?** Check [DEMO_SETUP.md](./DEMO_SETUP.md) for troubleshooting.
