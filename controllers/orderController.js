// ==================== ORDER CONTROLLER ====================
const db = require('../config/db');

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    console.log('📦 Fetching orders for user:', req.user.userId);

    const [orders] = await db.query(
      `SELECT * FROM orders 
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    console.log(`✅ Found ${orders.length} orders for user ${req.user.userId}`);

    const ordersWithParsedItems = orders.map(order => {
      try {
        return {
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        };
      } catch (e) {
        console.error('Error parsing items for order:', order.order_id, e);
        return { ...order, items: [] };
      }
    });

    res.json(ordersWithParsedItems);
  } catch (error) {
    console.error('❌ Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create order
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    const orderId = 'KK' + Date.now() + Math.floor(Math.random() * 1000);
    const io = req.app.get('socketio');

    console.log('📦 Creating order:', orderId);

    // Check if delivery_address column exists
    const [columns] = await db.query(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' 
        AND COLUMN_NAME IN ('delivery_address', 'delivery_coordinates')
      `,
      [process.env.DB_NAME || 'kusina_db']
    );

    const hasDeliveryAddress = columns.some(col => col.COLUMN_NAME === 'delivery_address');
    const hasDeliveryCoords = columns.some(col => col.COLUMN_NAME === 'delivery_coordinates');

    // Build INSERT query dynamically
    let insertColumns = [
      'order_id', 'user_id', 'customer_name', 'customer_email', 'customer_phone',
      'items', 'subtotal', 'delivery_fee', 'tax', 'total',
      'delivery_option', 'payment_method', 'payment_status', 'delivery_status',
      'payment_intent_id', 'payment_source_id',
      'voucher_code', 'voucher_discount'
    ];

    let insertValues = [
      orderId,
      req.user.userId,
      orderData.customer_name,
      orderData.customer_email,
      orderData.customer_phone,
      JSON.stringify(orderData.items || []),
      parseFloat(orderData.subtotal || 0),
      parseFloat(orderData.delivery_fee || 0),
      parseFloat(orderData.tax || 0),
      parseFloat(orderData.total || 0),
      orderData.delivery_option || 'delivery',
      orderData.payment_method || 'card',
      orderData.payment_status || 'pending',
      'placed',
      orderData.payment_intent_id || null,
      orderData.payment_source_id || null,
      orderData.voucher_code || null,
      parseFloat(orderData.voucher_discount || 0)
    ];

    if (hasDeliveryAddress) {
      insertColumns.splice(5, 0, 'delivery_address');
      insertValues.splice(5, 0, orderData.delivery_address || null);
    }

    if (hasDeliveryCoords) {
      insertColumns.splice(hasDeliveryAddress ? 6 : 5, 0, 'delivery_coordinates');
      insertValues.splice(hasDeliveryAddress ? 6 : 5, 0, orderData.delivery_coordinates || null);
    }

    const placeholders = insertColumns.map(() => '?').join(', ');
    const query = `INSERT INTO orders (${insertColumns.join(', ')}, created_at) 
                   VALUES (${placeholders}, NOW())`;

    await db.query(query, insertValues);

    console.log('✅ Order created successfully:', orderId);

    // Mark voucher as used
    if (orderData.voucher_code) {
      try {
        await db.query(
          `UPDATE vouchers 
           SET is_used = TRUE, used_at = NOW() 
           WHERE code = ? AND user_id = ? AND is_used = FALSE`,
          [orderData.voucher_code, req.user.userId]
        );
        console.log(`✅ Voucher ${orderData.voucher_code} marked as used`);
      } catch (voucherError) {
        console.error('⚠️ Failed to mark voucher as used:', voucherError.message);
      }
    }

    // Broadcast to admin
    io.to('admin-room').emit('new-order', {
      order_id: orderId,
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      total: orderData.total,
      payment_status: orderData.payment_status,
      payment_method: orderData.payment_method,
      delivery_status: 'placed',
      delivery_option: orderData.delivery_option,
      items_count: orderData.items?.length || 0,
      voucher_applied: !!orderData.voucher_code,
      created_at: new Date().toISOString()
    });

    // Emit to user room
    io.to(`user-${req.user.userId}`).emit('order-updated', {
      user_id: req.user.userId,
      order: {
        order_id: orderId,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        items: orderData.items || [],
        subtotal: orderData.subtotal,
        delivery_fee: orderData.delivery_fee,
        tax: orderData.tax,
        total: orderData.total,
        payment_status: orderData.payment_status || 'pending',
        delivery_status: 'placed',
        created_at: new Date().toISOString()
      },
      action: 'created'
    });

    console.log(`[SOCKET][USER_${req.user.userId}] order-updated event triggered`);

    res.json({
      success: true,
      order_id: orderId,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user overview (recent orders + vouchers)
exports.getUserOverview = async (req, res) => {
  try {
    // Recent orders (limit 3)
    const [orders] = await db.query(
      `SELECT * FROM orders 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 3`,
      [req.user.userId]
    );

    const recentOrders = orders.map(order => {
      try {
        return {
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        };
      } catch (_e) {
        return { ...order, items: [] };
      }
    });

    // Available vouchers
    const [vouchers] = await db.query(
      `SELECT 
        id, code, discount_type, discount_value, 
        expires_at, is_used, used_at,
        CASE WHEN expires_at < CURDATE() THEN TRUE ELSE FALSE END as is_expired
       FROM vouchers 
       WHERE user_id = ? AND is_used = FALSE
       ORDER BY expires_at ASC`,
      [req.user.userId]
    );

    res.json({ success: true, orders: recentOrders, vouchers });
  } catch (error) {
    console.error('❌ Get user overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview',
      orders: [],
      vouchers: []
    });
  }
};

// Get all orders (Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        order_id, user_id, customer_name, customer_email, customer_phone,
        items, subtotal, delivery_fee, tax, total,
        payment_method, payment_status, delivery_status, delivery_option, created_at 
       FROM orders 
       ORDER BY created_at DESC 
       LIMIT 500`
    );

    res.json({ success: true, orders: rows });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// Update order status (Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { order_id, status } = req.body;
    const io = req.app.get('socketio');

    if (!order_id || !status) {
      return res.status(400).json({ success: false, message: 'Missing order_id or status' });
    }

    await db.query(
      'UPDATE orders SET payment_status = ? WHERE order_id = ?',
      [status, order_id]
    );

    const [orders] = await db.query('SELECT user_id FROM orders WHERE order_id = ?', [order_id]);
    const userId = orders.length > 0 ? orders[0].user_id : null;

    io.to('admin-room').emit('order-updated', { order_id, payment_status: status });
    io.to(`order-${order_id}`).emit('order-status-changed', { orderId: order_id, payment_status: status });

    if (userId) {
      io.to(`user-${userId}`).emit('order-status-changed', { orderId: order_id, payment_status: status });
    }

    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

// Update delivery status (Admin)
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { order_id, delivery_status } = req.body;
    const io = req.app.get('socketio');

    if (!order_id || !delivery_status) {
      return res.status(400).json({ success: false, message: 'Missing order_id or delivery_status' });
    }

    const validStatuses = ['placed', 'preparing', 'delivering', 'delivered', 'cancelled'];
    if (!validStatuses.includes(delivery_status)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery status' });
    }

    const [result] = await db.query(
      'UPDATE orders SET delivery_status = ? WHERE order_id = ?',
      [delivery_status, order_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const [orders] = await db.query('SELECT user_id FROM orders WHERE order_id = ?', [order_id]);
    const userId = orders.length > 0 ? orders[0].user_id : null;

    io.to('admin-room').emit('order-updated', { order_id, delivery_status });
    io.to(`order-${order_id}`).emit('order-status-changed', {
      orderId: order_id,
      status: delivery_status,
      delivery_status,
      timestamp: new Date().toISOString()
    });

    if (userId) {
      io.to(`user-${userId}`).emit('order-status-changed', {
        orderId: order_id,
        status: delivery_status,
        delivery_status,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Delivery status updated' });
  } catch (error) {
    console.error('Admin update delivery status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update delivery status' });
  }
};

// Update order delivery status via REST (Admin)
exports.updateOrderStatusREST = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { delivery_status } = req.body;
    const io = req.app.get('socketio');

    if (!delivery_status) {
      return res.status(400).json({ success: false, message: 'Missing delivery_status' });
    }

    const validStatuses = ['placed', 'preparing', 'delivering', 'delivered', 'cancelled'];
    if (!validStatuses.includes(delivery_status)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery status' });
    }

    const [result] = await db.query(
      'UPDATE orders SET delivery_status = ? WHERE order_id = ?',
      [delivery_status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const [orders] = await db.query('SELECT user_id FROM orders WHERE order_id = ?', [orderId]);
    const userId = orders.length > 0 ? orders[0].user_id : null;

    if (userId) {
      io.to(`user-${userId}`).emit('order-status-changed', {
        orderId,
        status: delivery_status,
        delivery_status,
        timestamp: new Date().toISOString()
      });
      console.log(`[SOCKET][USER_${userId}] order-status-changed event triggered for order ${orderId}`);
    }

    io.to(`order-${orderId}`).emit('order-status-changed', {
      orderId,
      status: delivery_status,
      delivery_status,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Order status updated',
      orderId,
      delivery_status
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

module.exports = exports;
