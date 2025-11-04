// ==================== SOCKET.IO HANDLERS ====================

const activeTrackingSessions = new Map();

function initializeOrderSockets(io, db) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ==================== USER JOINS ROOM ====================
    socket.on('join-user', async (data) => {
      const { userId } = data || {};

      if (!userId) {
        console.warn('⚠️ join-user: No userId provided');
        return;
      }

      const roomName = `user-${userId}`;
      socket.join(roomName);
      console.log(`[SOCKET][USER_${userId}] Joined room: ${roomName}`);

      // Optional: confirm to user
      socket.emit('joined-user-room', { userId, room: roomName });
    });

    // ==================== ORDER TRACKING ====================
    socket.on('track-order', (data) => {
      const { orderId } = data || {};

      if (!orderId) {
        console.warn('⚠️ track-order: No orderId provided');
        return;
      }

      console.log(`🔍 Client ${socket.id} started tracking order: ${orderId}`);
      socket.join(`order-${orderId}`);

      if (!activeTrackingSessions.has(orderId)) {
        activeTrackingSessions.set(orderId, new Set());
      }
      activeTrackingSessions.get(orderId).add(socket.id);

      socket.emit('tracking-started', { 
        orderId, 
        message: 'Real-time tracking enabled' 
      });
    });

    // ==================== LOCATION UPDATE ====================
    socket.on('update-location', (data) => {
      const { orderId, latitude, longitude } = data || {};

      if (!orderId || latitude == null || longitude == null) {
        console.warn('⚠️ update-location: Missing required data', data);
        return;
      }

      io.to(`order-${orderId}`).emit('location-update', {
        orderId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });

      console.log(`📍 Order ${orderId} location updated: [${latitude}, ${longitude}]`);
    });

    // ==================== STOP TRACKING ====================
    socket.on('stop-tracking', (data) => {
      const { orderId } = data || {};

      if (!orderId) return;

      console.log(`🛑 Client ${socket.id} stopped tracking order: ${orderId}`);
      socket.leave(`order-${orderId}`);

      if (activeTrackingSessions.has(orderId)) {
        activeTrackingSessions.get(orderId).delete(socket.id);
        if (activeTrackingSessions.get(orderId).size === 0) {
          activeTrackingSessions.delete(orderId);
        }
      }
    });

    // ==================== ORDER DELIVERED ====================
    socket.on('order-delivered', async (data) => {
      const { orderId } = data || {};
      if (!orderId) return;

      console.log(`✅ Order ${orderId} marked as delivered`);

      io.to(`order-${orderId}`).emit('order-status-changed', {
        orderId,
        status: 'delivered',
        message: 'Your order has been delivered!',
        timestamp: new Date().toISOString(),
      });

      try {
        await db.query('UPDATE orders SET delivery_status = ? WHERE order_id = ?', [
          'delivered',
          orderId,
        ]);
      } catch (err) {
        console.error('❌ Error updating order status:', err);
      }
    });

    // ==================== ADMIN UPDATE STATUS ====================
    socket.on('admin-update-status', async (data) => {
      const { orderId, deliveryStatus } = data || {};

      if (!orderId || !deliveryStatus) {
        console.warn('⚠️ admin-update-status: Missing data', data);
        return;
      }

      console.log(`👨‍💼 Admin updating order ${orderId} status to: ${deliveryStatus}`);

      try {
        await db.query('UPDATE orders SET delivery_status = ? WHERE order_id = ?', [
          deliveryStatus,
          orderId,
        ]);

        // Get user_id for notification
        const [rows] = await db.query('SELECT user_id FROM orders WHERE order_id = ?', [orderId]);
        const userId = rows.length > 0 ? rows[0].user_id : null;

        // Notify order room
        io.to(`order-${orderId}`).emit('order-status-changed', {
          orderId,
          status: deliveryStatus,
          timestamp: new Date().toISOString(),
        });

        // Notify user room
        if (userId) {
          io.to(`user-${userId}`).emit('order-status-changed', {
            orderId,
            status: deliveryStatus,
            timestamp: new Date().toISOString(),
          });
          console.log(`[SOCKET][USER_${userId}] order-status-changed → order ${orderId}`);
        }

        socket.emit('status-update-success', { orderId, deliveryStatus });
      } catch (error) {
        console.error('❌ Error updating status:', error);
        socket.emit('status-update-error', { orderId, error: error.message });
      }
    });

    // ==================== ADMIN CONNECT ====================
    socket.on('admin-connect', () => {
      console.log(`👨‍💼 Admin connected: ${socket.id}`);
      socket.join('admin-room');
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);

      for (const [orderId, socketIds] of activeTrackingSessions.entries()) {
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          activeTrackingSessions.delete(orderId);
        }
      }
    });
  });

  console.log('✅ Socket.IO initialized successfully');
}

module.exports = initializeOrderSockets;
