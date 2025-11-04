# Quick Deployment Checklist

## 🚀 Strategy 1: Fastest (2-3 hours) - Vercel

### ✅ Checklist

- [ ] Create PlanetScale account and database
- [ ] Create Cloudinary account
- [ ] Install dependencies: `npm install cloudinary`
- [ ] Update `vercel.json` to use `server-vercel.js`
- [ ] Update menu routes to use `multer-cloudinary.js`
- [ ] Replace Socket.IO with polling in frontend
- [ ] Deploy to Vercel: `vercel`
- [ ] Add environment variables in Vercel dashboard
- [ ] Test deployment

### Environment Variables Needed:
```
PLANETSCALE_HOST=xxx
PLANETSCALE_USER=xxx
PLANETSCALE_PASSWORD=xxx
PLANETSCALE_DATABASE=xxx
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
JWT_SECRET=xxx
PAYMONGO_SECRET_KEY=xxx
MAIL_USER=xxx
MAIL_PASS=xxx
FRONTEND_URL=https://your-frontend.vercel.app
```

---

## 🔄 Strategy 2: Keep Real-Time - Railway/Render

### ✅ Checklist

- [ ] Create Railway or Render account
- [ ] Update CORS in `server.js` or use `server-railway.js`
- [ ] Deploy backend to Railway/Render
- [ ] Get backend URL from Railway/Render
- [ ] Add environment variables in Railway/Render dashboard
- [ ] Update frontend API URL to backend URL
- [ ] Update Socket.IO connection URL in frontend
- [ ] Deploy frontend to Vercel
- [ ] Test real-time features

### Environment Variables Needed:
```
DB_HOST=xxx
DB_USER=xxx
DB_PASS=xxx
DB_NAME=xxx
JWT_SECRET=xxx
PAYMONGO_SECRET_KEY=xxx
MAIL_USER=xxx
MAIL_PASS=xxx
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

---

## 📝 Quick Commands

### Strategy 1 (Vercel)
```bash
# Install Cloudinary
npm install cloudinary

# Deploy
vercel login
vercel
vercel env add PLANETSCALE_HOST
# ... add other env vars
vercel --prod
```

### Strategy 2 (Railway)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway up
railway variables
```

### Strategy 2 (Render)
- Use web dashboard
- Connect GitHub repo
- Add environment variables
- Deploy

---

## 🔧 Code Changes Required

### Strategy 1: Remove Socket.IO
1. Use `server-vercel.js` (no Socket.IO)
2. Replace Socket.IO in frontend with polling:
   ```javascript
   // Poll every 5 seconds
   setInterval(() => fetchOrders(), 5000);
   ```

### Strategy 2: Update CORS
1. Update `FRONTEND_URL` in environment variables
2. CORS already configured in `server-railway.js` or updated `server.js`
3. Update frontend Socket.IO URL:
   ```javascript
   const socket = io('https://your-backend.railway.app');
   ```

---

## 🐛 Common Issues

### CORS Errors
- ✅ Check `FRONTEND_URL` matches exactly
- ✅ Verify CORS middleware is configured
- ✅ Check browser console for actual origin

### Socket.IO Not Connecting
- ✅ Ensure backend is on Railway/Render (not Vercel)
- ✅ Check Socket.IO CORS settings
- ✅ Verify frontend URL is correct

### Database Connection Failed
- ✅ Verify credentials
- ✅ Check database allows external connections
- ✅ For PlanetScale: ensure SSL is enabled

---

## 📚 Full Documentation
See `DEPLOYMENT.md` for detailed instructions.

