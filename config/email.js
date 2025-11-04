// ==================== EMAIL SERVICE ====================
const nodemailer = require('nodemailer');
require('dotenv').config();

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// Verify email configuration
emailTransporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});

module.exports = { emailTransporter };