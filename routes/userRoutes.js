// ==================== USER MANAGEMENT ROUTES ====================
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Admin user management routes
router.get('/admin/users', verifyToken, verifyAdmin, userController.getAllUsers);
router.patch('/admin/users/:id', verifyToken, verifyAdmin, userController.updateUser);
router.delete('/admin/users/:id', verifyToken, verifyAdmin, userController.deleteUser);

module.exports = router;