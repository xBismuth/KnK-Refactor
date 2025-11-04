# Supabase Setup Guide - Complete Instructions

This guide will help you set up Supabase as your database for the KnK application.

## 🚀 Step 1: Create Supabase Account

1. **Go to:** https://supabase.com
2. **Sign up** with GitHub (free, no credit card required)
3. **Create a new project:**
   - Click "New Project"
   - Enter project name (e.g., "knk-app")
   - Enter database password (save this!)
   - Choose region (closest to your users)
   - Click "Create new project"
   - Wait 1-2 minutes for project to be created

---

## 🔑 Step 2: Get Database Credentials

1. **Go to your project dashboard**
2. **Click on "Settings" (gear icon) in the left sidebar**
3. **Click on "Database"**
4. **Scroll down to "Connection string" section**
5. **Copy the connection details:**

   You'll see connection details like:
   ```
   Host: db.xxxxx.supabase.co
   Database name: postgres
   Port: 5432
   User: postgres
   Password: [your-password]
   ```

   Or use the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

---

## 📝 Step 3: Set Up Database Schema

Supabase uses PostgreSQL, which is slightly different from MySQL. You'll need to create your tables.

### Option A: Use Supabase SQL Editor (Recommended)

1. **Go to SQL Editor** in your Supabase dashboard
2. **Click "New query"**
3. **Copy and paste the SQL schema** (see below)
4. **Click "Run"**

### Option B: Import from MySQL

If you have existing MySQL schema, you'll need to convert it to PostgreSQL:
- Replace `AUTO_INCREMENT` with `SERIAL` or `GENERATED ALWAYS AS IDENTITY`
- Replace `DATETIME` with `TIMESTAMP`
- Replace `TINYINT(1)` with `BOOLEAN`
- Replace backticks with double quotes

---

## 📋 Step 4: Create Database Tables

Here's a basic schema for your tables. Run this in Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'customer',
  auth_type VARCHAR(20) DEFAULT 'email',
  is_active BOOLEAN DEFAULT TRUE,
  picture TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  category VARCHAR(100),
  badge VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  items JSONB,
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  delivery_option VARCHAR(20) DEFAULT 'delivery',
  delivery_address TEXT,
  delivery_coordinates JSONB,
  payment_method VARCHAR(50) DEFAULT 'card',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  payment_source_id VARCHAR(255),
  delivery_status VARCHAR(50) DEFAULT 'placed',
  voucher_code VARCHAR(50),
  voucher_discount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  expires_at DATE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_menu_items_slug ON menu_items(slug);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

---

## 🔧 Step 5: Add Environment Variables to Vercel

1. **Go to:** https://vercel.com/dashboard
2. **Select your project**
3. **Go to Settings → Environment Variables**
4. **Add these variables:**

```bash
# Supabase Database (Required)
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

# Cloudinary (Required)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Security (Required)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Payment (Optional)
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx

# Email (Required)
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587

# Application (Required)
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app

# Frontend (Required)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

5. **Select environments:** Production, Preview, Development
6. **Click "Save"**
7. **Redeploy your project** (Deployments → Redeploy)

---

## 📦 Step 6: Install PostgreSQL Driver

The package.json already includes `pg` package. If you need to install:

```bash
npm install pg
```

---

## ✅ Step 7: Verify Connection

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Test the connection:**
   - Visit: `https://your-app.vercel.app/api/health`
   - Should show database as "connected"

3. **Check Vercel logs:**
   ```bash
   vercel logs
   ```
   - Should see: "✅ Supabase database connected successfully!"

---

## 🔄 Step 8: Migrate Existing Data (If Needed)

If you have existing MySQL data:

1. **Export from MySQL:**
   ```bash
   mysqldump -u user -p database_name > backup.sql
   ```

2. **Convert to PostgreSQL:**
   - Use a tool like `mysql2pgsql` or manually convert
   - Adjust SQL syntax differences

3. **Import to Supabase:**
   - Use Supabase SQL Editor
   - Or use `psql` command line

---

## 🎯 Key Differences: MySQL vs PostgreSQL

### Syntax Differences

| MySQL | PostgreSQL | Notes |
|-------|-----------|-------|
| `CURDATE()` | `CURRENT_DATE` | Date function |
| `IFNULL()` | `COALESCE()` | Null handling |
| Backticks `` ` `` | Double quotes `"` | Identifiers |
| `AUTO_INCREMENT` | `SERIAL` | Auto-increment |
| `TINYINT(1)` | `BOOLEAN` | Boolean type |
| `DATETIME` | `TIMESTAMP` | Date/time type |

### The Code Already Handles This!

The `config/db-supabase.js` file automatically converts:
- ✅ `CURDATE()` → `CURRENT_DATE`
- ✅ `IFNULL()` → `COALESCE()`
- ✅ Backticks → Double quotes

So most of your existing MySQL queries will work without changes!

---

## 🆘 Troubleshooting

### Connection Failed?

1. **Check credentials:**
   - Verify `SUPABASE_DB_HOST` is correct
   - Verify `SUPABASE_DB_PASSWORD` is correct
   - Check if you copied the full host (including `db.` prefix)

2. **Check SSL:**
   - Supabase requires SSL
   - The config already sets `rejectUnauthorized: false`

3. **Check firewall:**
   - Supabase allows connections from anywhere by default
   - If blocked, check your network settings

### Query Errors?

1. **Check SQL syntax:**
   - Some MySQL-specific functions might need conversion
   - Check Vercel logs for specific error messages

2. **Check table names:**
   - PostgreSQL is case-sensitive with double quotes
   - The wrapper converts backticks automatically

3. **Check data types:**
   - Boolean values: PostgreSQL uses `TRUE/FALSE`, not `1/0`
   - The wrapper handles this in most cases

### Database Not Found?

1. **Verify database name:**
   - Supabase default database is `postgres`
   - Make sure `SUPABASE_DB_NAME=postgres`

2. **Check project status:**
   - Make sure your Supabase project is active
   - Check Supabase dashboard for any issues

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/tables)
- [Migrating from MySQL to PostgreSQL](https://supabase.com/docs/guides/database/migrations)

---

## ✅ Checklist

- [ ] Created Supabase account
- [ ] Created new project
- [ ] Saved database password
- [ ] Created database tables (SQL schema)
- [ ] Added environment variables to Vercel
- [ ] Installed `pg` package (already in package.json)
- [ ] Deployed to Vercel
- [ ] Tested connection
- [ ] Verified tables exist
- [ ] Tested API endpoints

---

## 🎉 You're Done!

Your Supabase database is now set up and ready to use. The application will automatically use Supabase instead of MySQL.

**Note:** The code includes a compatibility layer that converts MySQL queries to PostgreSQL automatically, so most of your existing code will work without changes!

