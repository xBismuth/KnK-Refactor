// ==================== JWT MIDDLEWARE ====================
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // ✅ STANDARDIZE: Always use 'userId' (not 'id' or 'user_id')
    req.user = {
      userId: decoded.userId || decoded.id || decoded.user_id, // Handle legacy tokens
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

module.exports = { verifyToken, verifyAdmin, JWT_SECRET };