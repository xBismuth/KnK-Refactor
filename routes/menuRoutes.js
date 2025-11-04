// ==================== MENU ROUTES ====================
const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const { upload } = require('../config/multer');

// Public menu route
router.get('/menu', menuController.getPublicMenu);

// Admin menu routes
router.get('/admin/menu', verifyToken, verifyAdmin, menuController.getAllMenuItems);
router.post('/admin/menu', verifyToken, verifyAdmin, menuController.createMenuItem);
router.patch('/admin/menu/:id', verifyToken, verifyAdmin, menuController.updateMenuItem);
router.delete('/admin/menu/:id', verifyToken, verifyAdmin, menuController.deleteMenuItem);
router.post('/admin/menu/upload-image', verifyToken, verifyAdmin, upload.single('image'), menuController.uploadMenuImage);

module.exports = router;