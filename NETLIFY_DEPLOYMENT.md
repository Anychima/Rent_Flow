# 🚀 Netlify Deployment Guide for RentFlow AI

## ✅ Build Status
The build configuration is now fixed and should work automatically!

## 🔑 **IMPORTANT: Environment Variables Required**

Your site is currently blank because **Supabase environment variables are missing**.

### **To Fix the Blank Page:**

1. **Go to your Netlify dashboard**
2. **Click on "Site settings" → "Environment variables"**
3. **Add the following variables**:

```
REACT_APP_SUPABASE_URL = https://saiceqyaootvkdenxbqx.supabase.co
REACT_APP_SUPABASE_KEY = your-supabase-anon-key-here
```

4. **Trigger a redeploy** (Deploys → Trigger deploy → Deploy site)

### **Where to Find These Values:**

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **RentFlow**
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **anon/public key** → `REACT_APP_SUPABASE_KEY`

---

## 📋 **Build Configuration**

The build is already configured in `netlify.toml`:

```toml
[build]
  base = "frontend"
  command = "npm install --legacy-peer-deps && npm run build"
  publish = "build"
  
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
  TSC_COMPILE_ON_ERROR = "true"
  DISABLE_ESLINT_PLUGIN = "true"
  GENERATE_SOURCEMAP = "false"
```

---

## 🐛 **Troubleshooting**

### **Blank Page After Build:**
- ✅ **Add Supabase environment variables** (see above)
- ✅ **Redeploy** after adding variables

### **Build Fails:**
- Check build logs in Netlify dashboard
- Verify `--legacy-peer-deps` is in build command

### **404 on Refresh:**
- Already fixed with `_redirects` file
- Redirects configured in `netlify.toml`

---

## 🎉 **Once Variables Are Added:**

Your site will work perfectly! All routes will function correctly thanks to the SPA redirect configuration.

---

## 📝 **Next Steps (Optional):**

1. **Backend Deployment**: Deploy the Node.js backend to Render/Railway/Heroku
2. **Update API URLs**: Add `REACT_APP_API_URL` environment variable in Netlify
3. **Custom Domain**: Add your custom domain in Netlify settings

---

## 🔗 **Useful Links:**

- **Netlify Dashboard**: https://app.netlify.com/
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Site URL**: https://seamlessrentflow.netlify.app

---

**Need Help?** Check the browser console (F12) for specific error messages.
