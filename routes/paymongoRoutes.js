// ==================== PAYMONGO ROUTES ====================
const express = require('express');
const router = express.Router();
const paymongoController = require('../controllers/paymongoController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Payment routes
router.post('/create-payment-intent', verifyToken, paymongoController.createPaymentIntent);
router.post('/paymongo/create-gcash-payment', verifyToken, paymongoController.createGCashPayment);
router.post('/paymongo/webhook', express.raw({ type: 'application/json' }), paymongoController.webhook);

module.exports = router;