// ==================== ORDER ROUTES ====================
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// User order routes
router.get('/orders', verifyToken, orderController.getUserOrders);
router.post('/create-order', verifyToken, orderController.createOrder);
router.get('/user/overview', verifyToken, orderController.getUserOverview);

// Admin order routes
router.get('/admin/get-all-orders', verifyToken, verifyAdmin, orderController.getAllOrders);
router.patch('/admin/update-order-status', verifyToken, verifyAdmin, orderController.updateOrderStatus);
router.patch('/admin/update-delivery-status', verifyToken, verifyAdmin, orderController.updateDeliveryStatus);
router.post('/admin/orders/:orderId/status', verifyToken, verifyAdmin, orderController.updateOrderStatusREST);

module.exports = router;