// ==================== AUTHENTICATION CONTROLLER ====================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');
const { 
  verificationCodes, 
  loginVerificationCodes,
  generateVerificationCode 
} = require('../utils/verificationStore');
const {
  sendVerificationEmail,
  sendLoginVerificationEmail
} = require('../utils/emailHelper');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Step 1: Signup - Send verification code
exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }

    const [existingUsers] = await db.query(
      'SELECT id, email FROM users WHERE email = ?', 
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already registered. Please sign in instead.' 
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const verificationCode = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    verificationCodes.set(email, {
      code: verificationCode,
      expiresAt,
      userData: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword
      }
    });

    try {
      await sendVerificationEmail(email, verificationCode, name);
      console.log(`✅ Verification code sent to ${email}`);

      res.json({ 
        success: true,
        message: 'Verification code sent to your email',
        email: email,
        devCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
      });
    } catch (emailError) {
      console.error('📧 Email sending failed:', emailError.message);
      verificationCodes.delete(email);
      
      if (process.env.NODE_ENV === 'development') {
        return res.json({ 
          success: true,
          message: 'Verification code generated (email disabled in dev)',
          email: email,
          devCode: verificationCode
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email. Please try again.' 
      });
    }

  } catch (error) {
    console.error('❌ Signup error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup. Please try again.' 
    });
  }
};

// Step 2: Verify code and create account
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log('🔍 Verifying code for:', email);

    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and verification code are required' 
      });
    }

    const verificationData = verificationCodes.get(email);

    if (!verificationData) {
      return res.status(400).json({ 
        success: false, 
        message: 'No verification code found. Please request a new one.' 
      });
    }

    if (Date.now() > verificationData.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code expired. Please request a new one.' 
      });
    }

    if (verificationData.code !== code.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code. Please try again.' 
      });
    }

    const { name, phone, password } = verificationData.userData;

    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    );

    if (existingUsers.length > 0) {
      verificationCodes.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Account already exists. Please sign in.' 
      });
    }

    const [result] = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, auth_type, role, created_at, last_login) 
       VALUES (?, ?, ?, ?, 'email', 'customer', NOW(), NOW())`,
      [name, email, phone, password]
    );

    verificationCodes.delete(email);

    // ✅ Use consistent userId field
    const token = jwt.sign(
      { 
        userId: result.insertId,
        email,
        name,
        role: 'customer'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: result.insertId,
        name,
        email,
        phone,
        role: 'customer',
        authType: 'email',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Verification error:', error.message);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered. Please sign in.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during verification. Please try again.' 
    });
  }
};

// Resend verification code
exports.resendCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const verificationData = verificationCodes.get(email);

    if (!verificationData) {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending verification found for this email. Please start signup again.' 
      });
    }

    const newCode = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    verificationCodes.set(email, { ...verificationData, code: newCode, expiresAt });

    await sendVerificationEmail(email, newCode, verificationData.userData.name);

    res.json({ 
      success: true, 
      message: 'New verification code sent',
      devCode: process.env.NODE_ENV === 'development' ? newCode : undefined
    });

  } catch (error) {
    console.error('❌ Resend code error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to resend verification code' });
  }
};

// Send login verification code
exports.sendLoginCode = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    const [users] = await db.query(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = ? AND auth_type = ?',
      [email, 'email']
    );

    if (users.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    // ✅ Admin direct login with consistent token field
    if (user.role === 'admin') {
      await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { 
          userId: user.id,
          email,
          name: user.name,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        skipVerification: true,
        message: 'Admin login successful',
        token,
        user: {
          id: user.id,
          email,
          name: user.name,
          role: user.role,
          authType: 'email'
        }
      });
    }

    // Regular users
    const verificationCode = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    loginVerificationCodes.set(email, {
      code: verificationCode,
      expiresAt,
      userId: user.id,
      userName: user.name,
      userRole: user.role
    });

    await sendLoginVerificationEmail(email, verificationCode, user.name);

    res.json({
      success: true,
      skipVerification: false,
      message: 'Verification code sent to your email',
      email,
      devCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    });

  } catch (error) {
    console.error('❌ Send login code error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Verify login code
exports.verifyLoginCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ success: false, message: 'Email and code are required' });

    const loginData = loginVerificationCodes.get(email);
    if (!loginData)
      return res.status(400).json({ success: false, message: 'No verification code found.' });

    if (Date.now() > loginData.expiresAt) {
      loginVerificationCodes.delete(email);
      return res.status(400).json({ success: false, message: 'Verification code expired.' });
    }

    if (loginData.code !== code)
      return res.status(400).json({ success: false, message: 'Invalid verification code' });

    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [loginData.userId]);

    // ✅ Consistent userId in token
    const token = jwt.sign(
      { 
        userId: loginData.userId,
        email,
        name: loginData.userName,
        role: loginData.userRole
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    loginVerificationCodes.delete(email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: loginData.userId,
        email,
        name: loginData.userName,
        role: loginData.userRole,
        authType: 'email'
      }
    });

  } catch (error) {
    console.error('❌ Verify login code error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

// Google OAuth
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ success: false, message: 'No token provided' });

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const userId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    const [existingUser] = await db.query(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [userId, email]
    );

    let user;
    if (existingUser.length > 0) {
      user = existingUser[0];
      if (!user.google_id) {
        await db.query(
          'UPDATE users SET google_id = ?, auth_type = ?, picture = ?, last_login = NOW() WHERE email = ?', 
          [userId, 'google', picture || null, email]
        );
      } else {
        await db.query('UPDATE users SET last_login = NOW() WHERE google_id = ?', [userId]);
      }
    } else {
      const [result] = await db.query(
        `INSERT INTO users (google_id, email, name, picture, auth_type, role, created_at, last_login)
         VALUES (?, ?, ?, ?, 'google', 'customer', NOW(), NOW())`,
        [userId, email, name, picture || null]
      );
      user = { id: result.insertId, google_id: userId, email, name, picture, role: 'customer' };
    }

    // ✅ Consistent userId in token
    const appToken = jwt.sign(
      { 
        userId: user.id,
        email,
        name,
        role: user.role,
        googleId: userId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Google authentication successful',
      token: appToken,
      user: {
        id: user.id,
        email,
        name,
        picture,
        role: user.role,
        authType: 'google'
      }
    });

  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(400).json({ success: false, message: 'Google authentication failed', error: error.message });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, email, name, picture, phone, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
};

// ==================== UPDATE PROFILE FUNCTION ====================
// Add this function to your existing authController.js

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    const userId = req.user.userId; // From JWT middleware

    // Validation
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and email are required' 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Check if email is already used by another user
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already used by another account' 
      });
    }

    // Get current user data
    const [users] = await db.query(
      'SELECT id, email, name, phone, password_hash, auth_type FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = users[0];

    // Password update logic (only for email auth users)
    let updateQuery = 'UPDATE users SET name = ?, email = ?, phone = ?';
    let updateParams = [name, email, phone || null];

    if (newPassword) {
      // Password change is only allowed for email auth users
      if (user.auth_type !== 'email') {
        return res.status(400).json({ 
          success: false, 
          message: 'Password changes are only available for email-authenticated accounts' 
        });
      }

      // Validate current password
      if (!currentPassword) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is required to set a new password' 
        });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          success: false, 
          message: 'New password must be at least 6 characters long' 
        });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      updateQuery += ', password_hash = ?';
      updateParams.push(hashedPassword);
    }

    // Complete the query
    updateQuery += ' WHERE id = ?';
    updateParams.push(userId);

    // Execute update
    await db.query(updateQuery, updateParams);

    // Fetch updated user data
    const [updatedUsers] = await db.query(
      'SELECT id, email, name, phone, picture, created_at, auth_type FROM users WHERE id = ?',
      [userId]
    );

    const updatedUser = updatedUsers[0];

    // Log the profile update
    console.log(`✅ Profile updated for user ${userId} (${email})`);

    res.json({
      success: true,
      message: newPassword ? 'Profile and password updated successfully' : 'Profile updated successfully',
      passwordChanged: !!newPassword,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        picture: updatedUser.picture,
        authType: updatedUser.auth_type,
        createdAt: updatedUser.created_at
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error.message);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already in use' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during profile update. Please try again.' 
    });
  }
};