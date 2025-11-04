# Supabase Quick Start Guide

## 🚀 5-Minute Setup

### 1. Create Supabase Account
- Go to: https://supabase.com
- Sign up with GitHub (FREE)
- Create new project
- **Save your database password!**

### 2. Get Database Credentials

In Supabase dashboard:
- Settings → Database
- Copy these values:
  - **Host:** `db.xxxxx.supabase.co`
  - **Database:** `postgres`
  - **User:** `postgres`
  - **Password:** (the one you saved)
  - **Port:** `5432`

### 3. Create Tables

- Go to SQL Editor
- Click "New query"
- Copy SQL schema from `SUPABASE_SETUP.md`
- Click "Run"

### 4. Add to Vercel

Go to Vercel → Settings → Environment Variables:

```bash
SUPABASE_DB_HOST=db.xxxxx.supabase.co
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-password
SUPABASE_DB_NAME=postgres
SUPABASE_DB_PORT=5432
```

### 5. Deploy

```bash
vercel --prod
```

**Done!** ✅

---

## 📋 What's Already Configured

- ✅ `config/db-supabase.js` - Supabase connection
- ✅ `server-vercel.js` - Uses Supabase
- ✅ Compatibility layer - Converts MySQL → PostgreSQL automatically
- ✅ Package.json - Includes `pg` package

---

## 🎯 Key Points

1. **Supabase uses PostgreSQL** (not MySQL)
2. **Free tier:** 500MB database, 2GB bandwidth/month
3. **Never sleeps** - Always available
4. **Code compatibility** - Most MySQL queries work automatically

---

## 🆘 Quick Troubleshooting

**Connection failed?**
- Check credentials are correct
- Verify host includes `db.` prefix
- Check Supabase project is active

**Query errors?**
- Check Vercel logs for specific error
- Most MySQL queries work automatically
- Some may need manual conversion

---

## 📚 Full Guide

See `SUPABASE_SETUP.md` for complete instructions.

