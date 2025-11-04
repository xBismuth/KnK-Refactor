// ==================== VERCEL SERVERLESS VERSION (NO SOCKET.IO) ====================
// This version removes Socket.IO for faster Vercel deployment
// Real-time features will use polling instead

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import configurations
// Use Supabase (PostgreSQL) - FREE tier available
const db = require('./config/db-supabase');
const { emailTransporter } = require('./config/email');

// Import middlewares
const { apiLimiter } = require('./middlewares/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const menuRoutes = require('./routes/menuRoutes');
const userRoutes = require('./routes/userRoutes');
const supportRoutes = require('./routes/supportRoutes');
const paymongoRoutes = require('./routes/paymongoRoutes');

// ==================== INITIALIZATION ====================
const ts = () => new Date().toISOString();
const log = {
  info: (...args) => console.log(`[INFO ${ts()}]`, ...args),
  warn: (...args) => console.warn(`[WARN ${ts()}]`, ...args),
  error: (...args) => console.error(`[ERROR ${ts()}]`, ...args)
};

const app = express();

// ==================== MIDDLEWARE ====================
// CORS - Update for production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://your-frontend.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:5173'] : [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request log (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    log.info(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// Rate limiting
app.use('/api/', apiLimiter);

// ==================== ROUTES ====================
// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected',
    paymongo: process.env.PAYMONGO_SECRET_KEY ? 'configured' : 'not configured',
    email: process.env.MAIL_USER ? 'configured' : 'not configured',
    socketio: 'disabled',
    deployment: 'vercel'
  });
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/api', orderRoutes);
app.use('/api', voucherRoutes);
app.use('/api', menuRoutes);
app.use('/api', userRoutes);
app.use('/api', supportRoutes);
app.use('/api', paymongoRoutes);

// ==================== ERROR HANDLING ====================
// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  log.error('Unhandled error', err.message);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      success: false, 
      message: 'File too large. Maximum size is 5MB.' 
    });
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }

  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== EXPORT FOR VERCEL ====================
// Vercel expects a default export
module.exports = app;

