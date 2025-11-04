// ==================== USER MANAGEMENT CONTROLLER ====================
const db = require('../config/db');

// Get all users (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT 
        id, name, email, phone, role, auth_type, 
        COALESCE(is_active, TRUE) as is_active,
        created_at, last_login, picture
       FROM users 
       ORDER BY created_at DESC`
    );

    res.json({ success: true, users });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch users' 
    });
  }
};

// Update user (Admin)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, is_active } = req.body;

    const updates = [];
    const values = [];

    if (role !== undefined) {
      if (!['customer', 'admin'].includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid role. Must be customer or admin.' 
        });
      }
      updates.push('role = ?');
      values.push(role);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update' 
      });
    }

    values.push(id);

    const [result] = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'User updated successfully' 
    });

  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user' 
    });
  }
};

// Delete user (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }

    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete user' 
    });
  }
};

module.exports = exports;
