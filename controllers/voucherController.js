// ==================== VOUCHER CONTROLLER ====================
const db = require('../config/db');

// ==================== Validate Voucher ====================
exports.validateVoucher = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code, order_total } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Voucher code is required'
      });
    }

    const [vouchers] = await db.query(
      `SELECT * FROM vouchers WHERE code = ? AND user_id = ?`,
      [code.toUpperCase(), userId]
    );

    if (vouchers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid voucher code or voucher does not belong to you'
      });
    }

    const voucher = vouchers[0];

    if (voucher.is_used) {
      return res.status(400).json({
        success: false,
        message: 'This voucher has already been used'
      });
    }

    const expiryDate = new Date(voucher.expires_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
      return res.status(400).json({
        success: false,
        message: 'This voucher has expired'
      });
    }

    let discount = 0;
    const orderTotal = parseFloat(order_total);

    if (voucher.discount_type === 'percentage') {
      discount = (orderTotal * parseFloat(voucher.discount_value)) / 100;
    } else if (voucher.discount_type === 'fixed') {
      discount = parseFloat(voucher.discount_value);
    } else if (voucher.discount_type === 'shipping') {
      discount = 30; // optional: make configurable later
    }

    discount = Math.min(discount, orderTotal);

    res.json({
      success: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        calculated_discount: discount.toFixed(2),
        expires_at: voucher.expires_at
      }
    });

  } catch (error) {
    console.error('❌ Validate voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate voucher'
    });
  }
};

// ==================== Get User Vouchers ====================
exports.getUserVouchers = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [vouchers] = await db.query(
      `SELECT 
        id, code, discount_type, discount_value, 
        expires_at, is_used, used_at,
        CASE WHEN expires_at < CURDATE() THEN TRUE ELSE FALSE END as is_expired
       FROM vouchers 
       WHERE user_id = ? AND is_used = FALSE
       ORDER BY expires_at ASC`,
      [userId]
    );

    res.json({
      success: true,
      vouchers
    });

  } catch (error) {
    console.error('❌ Get user vouchers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vouchers',
      vouchers: []
    });
  }
};

// ==================== Create Voucher (Admin) ====================
exports.createVoucher = async (req, res) => {
  try {
    const { user_id, code, discount_type, discount_value, expires_at } = req.body;
    const io = req.app.get('socketio');

    if (!user_id || !code || !discount_type || !discount_value || !expires_at) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: 'Discount type must be percentage or fixed'
      });
    }

    const value = parseFloat(discount_value);
    if (isNaN(value) || value <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount value must be a positive number'
      });
    }

    if (discount_type === 'percentage' && value > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot exceed 100%'
      });
    }

    const [result] = await db.query(
      `INSERT INTO vouchers (user_id, code, discount_type, discount_value, expires_at, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [user_id, code.toUpperCase(), discount_type, value, expires_at]
    );

    const [users] = await db.query('SELECT email FROM users WHERE id = ?', [user_id]);
    const userEmail = users.length > 0 ? users[0].email : null;

    if (user_id) {
      io.to(`user-${user_id}`).emit('voucher-updated', {
        user_id,
        user_email: userEmail,
        voucher: {
          id: result.insertId,
          code: code.toUpperCase(),
          discount_type,
          discount_value: value,
          expires_at
        },
        action: 'created'
      });
      console.log(`[SOCKET][USER_${user_id}] voucher-updated event triggered (created)`);
    }

    res.json({
      success: true,
      message: 'Voucher created successfully',
      voucherId: result.insertId
    });

  } catch (error) {
    console.error('❌ Create voucher error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Voucher code already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create voucher'
    });
  }
};

// ==================== Get Vouchers by User (Admin) ====================
exports.getVouchersByUser = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const [vouchers] = await db.query(
      `SELECT 
        id, code, discount_type, discount_value, 
        expires_at, is_used, used_at, created_at,
        CASE WHEN expires_at < CURDATE() THEN TRUE ELSE FALSE END as is_expired
       FROM vouchers 
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user_id]
    );

    res.json({
      success: true,
      vouchers
    });

  } catch (error) {
    console.error('❌ Get vouchers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vouchers',
      vouchers: []
    });
  }
};

// ==================== Delete Voucher (Admin) ====================
exports.deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const io = req.app.get('socketio');

    const [vouchers] = await db.query('SELECT user_id FROM vouchers WHERE id = ?', [id]);

    if (vouchers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    const user_id = vouchers[0].user_id;
    const [users] = await db.query('SELECT email FROM users WHERE id = ?', [user_id]);
    const userEmail = users.length > 0 ? users[0].email : null;

    const [result] = await db.query('DELETE FROM vouchers WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    if (user_id) {
      io.to(`user-${user_id}`).emit('voucher-updated', {
        user_id,
        user_email: userEmail,
        voucher: { id: parseInt(id) },
        action: 'deleted'
      });
      console.log(`[SOCKET][USER_${user_id}] voucher-updated event triggered (deleted)`);
    }

    res.json({
      success: true,
      message: 'Voucher deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete voucher'
    });
  }
};

module.exports = exports;
