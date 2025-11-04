# Vercel Environment Variables - Quick Reference

## 🚀 Quick Setup Steps

### 1. Add Environment Variables in Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable (see list below)
5. Select **Production**, **Preview**, and **Development** environments
6. Click **Save**
7. **Redeploy** your project (Deployments → Redeploy)

---

## 📝 Complete List of Environment Variables

### Required for Backend

```bash
# Database - Supabase (Recommended - FREE PostgreSQL)
SUPABASE_DB_HOST=db.xxxxx.supabase.co
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password
SUPABASE_DB_NAME=postgres
SUPABASE_DB_PORT=5432

# OR use generic DB variables (also works)
DB_HOST=db.xxxxx.supabase.co
DB_USER=postgres
DB_PASS=your-database-password
DB_NAME=postgres
DB_PORT=5432

# Image Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Payment (PayMongo)
PAYMONGO_SECRET_KEY=sk_live_xxxxxxxxxxxxx
PAYMONGO_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx

# Email
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-app.vercel.app
```

### Required for Frontend (Google OAuth)

```bash
# Add this to Vercel environment variables
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# The build script will automatically generate Public/env.js
```

---

## ✅ After Adding Variables

1. **Redeploy** your project:
   - Go to **Deployments** tab
   - Click **⋮** (three dots) on latest deployment
   - Click **Redeploy**

2. **Verify** variables are loaded:
   - Check Vercel logs: `vercel logs`
   - Visit: `https://your-app.vercel.app/api/health`

---

## 🔧 Vercel Configuration

### Update `vercel.json` to use `server-vercel.js`:

```json
{
  "builds": [
    {
      "src": "server-vercel.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server-vercel.js"
    },
    {
      "src": "/auth/(.*)",
      "dest": "server-vercel.js"
    },
    {
      "src": "/(.*)",
      "dest": "/Public/$1"
    },
    {
      "src": "/",
      "dest": "/Public/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server-vercel.js": {
      "maxDuration": 30
    }
  }
}
```

---

## 📦 Build Script (Auto-generates Public/env.js)

The `build-env.js` script automatically generates `Public/env.js` from Vercel environment variables.

**How it works:**
1. During build, Vercel runs `npm run vercel-build`
2. This runs `build-env.js`
3. Script reads `NEXT_PUBLIC_GOOGLE_CLIENT_ID` from environment
4. Generates `Public/env.js` with the Google Client ID

**No manual file needed!** ✅

---

## 🎯 Complete Deployment Checklist

- [ ] Add all environment variables in Vercel dashboard
- [ ] Update `vercel.json` to use `server-vercel.js` (if using Strategy 1)
- [ ] Install Cloudinary: `npm install cloudinary`
- [ ] Update menu routes to use `multer-cloudinary.js`
- [ ] Set up PlanetScale database
- [ ] Set up Cloudinary account
- [ ] Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to Vercel
- [ ] Deploy: `vercel --prod`
- [ ] Redeploy after adding variables (if needed)
- [ ] Test deployment

---

## 🚨 Important Notes

1. **No `.env` file needed** - Vercel injects variables automatically
2. **Redeploy after adding variables** - Changes don't apply until redeploy
3. **Public variables** - Use `NEXT_PUBLIC_*` prefix for frontend access
4. **Case-sensitive** - Variable names are case-sensitive
5. **No trailing slashes** - In URLs like `FRONTEND_URL`

---

## 📚 Full Documentation

See `VERCEL_ENV_SETUP.md` for detailed instructions.

---

## 🆘 Troubleshooting

**Variables not loading?**
- Check spelling (case-sensitive)
- Verify environment selected (Production/Preview)
- Redeploy after adding variables

**Frontend can't access Google Client ID?**
- Make sure you added `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (not `GOOGLE_CLIENT_ID`)
- Check build logs to see if `build-env.js` ran
- Verify `Public/env.js` exists after build

**Database connection failed?**
- Verify PlanetScale credentials
- Check SSL is enabled
- Verify database is accessible

