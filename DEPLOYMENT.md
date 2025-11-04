# Deployment Guide

This guide covers two deployment strategies for the KnK application.

## 🚀 Strategy 1: Fastest Deployment (2-3 hours)
**Remove Socket.IO, use PlanetScale, Cloudinary, deploy to Vercel**

### Prerequisites
- Vercel account
- PlanetScale account
- Cloudinary account

### Steps

#### 1. Set up PlanetScale Database
1. Create a new database on [PlanetScale](https://planetscale.com)
2. Create a branch (e.g., `main`)
3. Get your connection string:
   ```
   mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}
   ```
4. Or get individual credentials:
   - `PLANETSCALE_HOST`
   - `PLANETSCALE_USER`
   - `PLANETSCALE_PASSWORD`
   - `PLANETSCALE_DATABASE`

#### 2. Set up Cloudinary
1. Create account on [Cloudinary](https://cloudinary.com)
2. Get your credentials from Dashboard:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

#### 3. Update Code for Vercel
1. Install Cloudinary package:
   ```bash
   npm install cloudinary
   ```
2. Use `server-vercel.js` instead of `server.js`
3. Update `vercel.json` to point to `server-vercel.js`:
   ```json
   {
     "builds": [
       {
         "src": "server-vercel.js",
         "use": "@vercel/node"
       }
     ]
   }
   ```

#### 4. Update Routes to Use Cloudinary
In your menu routes, replace multer with `multer-cloudinary.js`:
```javascript
const { upload, handleCloudinaryUpload } = require('../config/multer-cloudinary');
// Use upload.single('image') and handleCloudinaryUpload middleware
```

#### 5. Update Frontend for Polling
Replace Socket.IO real-time features with polling:
```javascript
// Instead of Socket.IO, use polling
setInterval(async () => {
  const response = await fetch('/api/orders');
  const orders = await response.json();
  // Update UI
}, 5000); // Poll every 5 seconds
```

#### 6. Deploy to Vercel
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Login:
   ```bash
   vercel login
   ```
3. Deploy:
   ```bash
   vercel
   ```
4. Add environment variables in Vercel dashboard:
   - `PLANETSCALE_HOST`
   - `PLANETSCALE_USER`
   - `PLANETSCALE_PASSWORD`
   - `PLANETSCALE_DATABASE`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `JWT_SECRET`
   - `PAYMONGO_SECRET_KEY`
   - `MAIL_USER`
   - `MAIL_PASS`
   - `FRONTEND_URL` (your Vercel frontend URL)

#### 7. Deploy Frontend
1. Create a separate Vercel project for frontend
2. Point API calls to your backend URL
3. Update CORS settings if needed

---

## 🔄 Strategy 2: Keep Real-Time Features
**Deploy frontend to Vercel, backend to Railway/Render**

### Prerequisites
- Vercel account
- Railway account OR Render account
- MySQL database (or PlanetScale)

### Steps

#### 1. Deploy Backend to Railway

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize project:**
   ```bash
   railway init
   ```

4. **Add environment variables in Railway dashboard:**
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASS`
   - `DB_NAME`
   - `JWT_SECRET`
   - `PAYMONGO_SECRET_KEY`
   - `MAIL_USER`
   - `MAIL_PASS`
   - `FRONTEND_URL` (your Vercel frontend URL)
   - `NODE_ENV=production`
   - `PORT=3000` (Railway will override this)

5. **Use `server-railway.js` or update `server.js`:**
   - Ensure CORS is configured for your frontend URL
   - Socket.IO is enabled

6. **Deploy:**
   ```bash
   railway up
   ```

7. **Get your backend URL:**
   - Railway provides a URL like: `https://your-app.railway.app`
   - Update `FRONTEND_URL` in your frontend environment variables

#### 2. Deploy Backend to Render (Alternative)

1. **Connect your GitHub repo to Render**

2. **Create a new Web Service:**
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Add environment variables:**
   - Same as Railway (see above)

4. **Update `render.yaml` if needed**

5. **Deploy:**
   - Render will auto-deploy on git push

#### 3. Update CORS Settings

In `server-railway.js` or `server.js`, update CORS:
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://your-frontend.vercel.app',
  // Add other allowed origins
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

#### 4. Update Frontend

1. Update API base URL:
   ```javascript
   const API_URL = process.env.REACT_APP_API_URL || 'https://your-backend.railway.app';
   ```

2. Update Socket.IO connection:
   ```javascript
   const socket = io(API_URL, {
     transports: ['websocket', 'polling'],
     // ... other options
   });
   ```

#### 5. Deploy Frontend to Vercel

1. Create new Vercel project
2. Add environment variables:
   - `REACT_APP_API_URL=https://your-backend.railway.app`
   - Or update your frontend config to use the backend URL
3. Deploy

---

## Environment Variables Reference

### Required for Both Strategies
- `JWT_SECRET` - Secret for JWT tokens
- `PAYMONGO_SECRET_KEY` - PayMongo API key
- `MAIL_USER` - Email username
- `MAIL_PASS` - Email password
- `FRONTEND_URL` - Your frontend URL

### Strategy 1 (Vercel)
- `PLANETSCALE_HOST`
- `PLANETSCALE_USER`
- `PLANETSCALE_PASSWORD`
- `PLANETSCALE_DATABASE`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Strategy 2 (Railway/Render)
- `DB_HOST`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `PORT` (usually auto-set by platform)

---

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` matches exactly (with/without trailing slash)
- Check browser console for actual origin
- Verify CORS middleware is configured correctly

### Socket.IO Connection Issues
- Ensure backend supports WebSocket (Railway/Render do, Vercel doesn't)
- Check CORS settings for Socket.IO
- Verify frontend is using correct backend URL

### Database Connection Issues
- Verify credentials are correct
- Check if database allows connections from your deployment platform
- For PlanetScale, ensure SSL is enabled

### Image Upload Issues
- For Cloudinary: verify API keys and cloud name
- Check file size limits (5MB default)
- Verify upload middleware is correctly configured

---

## Quick Commands

### Vercel Deployment
```bash
vercel login
vercel
vercel env add PLANETSCALE_HOST
# ... add other env vars
vercel --prod
```

### Railway Deployment
```bash
railway login
railway init
railway up
railway variables
```

### Render Deployment
- Use web dashboard or GitHub integration
- Environment variables via dashboard

---

## Notes

- **Strategy 1** is faster but loses real-time features (uses polling)
- **Strategy 2** keeps real-time but requires separate backend hosting
- Both strategies work with PlanetScale or traditional MySQL
- Cloudinary is optional but recommended for production image storage

