// ==================== VOUCHER ROUTES ====================
const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// User voucher routes
router.post('/user/vouchers/validate', verifyToken, voucherController.validateVoucher);
router.get('/user/vouchers', verifyToken, voucherController.getUserVouchers);

// Admin voucher routes
router.post('/admin/vouchers', verifyToken, verifyAdmin, voucherController.createVoucher);
router.get('/admin/vouchers', verifyToken, verifyAdmin, voucherController.getVouchersByUser);
router.delete('/admin/vouchers/:id', verifyToken, verifyAdmin, voucherController.deleteVoucher);

module.exports = router;