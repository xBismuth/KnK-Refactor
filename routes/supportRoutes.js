// ==================== SUPPORT ROUTES ====================
const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Public support route
router.post('/support', supportController.submitTicket);

// Admin support routes
router.get('/support', verifyToken, verifyAdmin, supportController.getAllTickets);
router.post('/support/reply', verifyToken, verifyAdmin, supportController.replyToTicket);
router.patch('/support/:id/status', verifyToken, verifyAdmin, supportController.updateTicketStatus);

module.exports = router;