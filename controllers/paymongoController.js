// ==================== PAYMONGO CONTROLLER ====================
const axios = require('axios');
const { 
  getPayMongoAuth, 
  payMongoRequest, 
  PAYMONGO_API_BASE 
} = require('../utils/paymongoHelper');

// Create payment intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency, customer, card } = req.body;

    const cleanCardNumber = card.number.replace(/\s/g, '').replace(/\D/g, '');
    
    const pmResp = await axios.post(
      `${PAYMONGO_API_BASE}/payment_methods`,
      {
        data: {
          type: 'payment_method',
          attributes: {
            type: 'card',
            details: {
              card_number: cleanCardNumber,
              exp_month: card.exp_month,
              exp_year: card.exp_year,
              cvc: card.cvc
            },
            billing: { 
              name: customer.name, 
              email: customer.email 
            }
          }
        }
      },
      {
        headers: {
          'Authorization': getPayMongoAuth(),
          'Content-Type': 'application/json'
        }
      }
    );

    const pmId = pmResp.data.data.id;

    const piResult = await payMongoRequest('/payment_intents', 'POST', {
      data: {
        attributes: {
          amount: amount,
          currency: currency,
          payment_method_allowed: ['card'],
          payment_method_options: {
            card: {
              request_three_d_secure: 'automatic'
            }
          },
          description: `Order for ${customer.name}`
        }
      }
    });

    if (!piResult.success) {
      return res.status(400).json({ success: false, message: 'Failed to create payment intent', error: piResult.error });
    }

    const piId = piResult.data.data.id;

    const attachResult = await payMongoRequest(`/payment_intents/${piId}/attach`, 'POST', {
      data: {
        attributes: {
          payment_method: pmId,
          return_url: 'http://localhost:3000/dashboard.html'
        }
      }
    });

    if (!attachResult.success) {
      return res.status(400).json({ success: false, message: 'Failed to attach payment method', error: attachResult.error });
    }

    const status = attachResult.data.data.attributes.status;

    if (status === 'succeeded') {
      res.json({
        success: true,
        paymentIntentId: piId,
        status: 'succeeded',
        message: 'Payment processed successfully'
      });
    } else if (status === 'processing') {
      res.json({
        success: true,
        paymentIntentId: piId,
        status: 'processing',
        message: 'Payment is processing'
      });
    } else if (status === 'requires_action') {
      const clientSecret = attachResult.data.data.attributes.client_key;
      res.json({
        success: true,
        paymentIntentId: piId,
        status: 'requires_action',
        clientSecret: clientSecret,
        nextAction: attachResult.data.data.attributes.next_action
      });
    } else {
      res.json({
        success: true,
        paymentIntentId: piId,
        status: status
      });
    }

  } catch (error) {
    console.error('Payment intent error:', error.message);
    res.status(500).json({ success: false, message: 'Payment processing failed', error: error.message });
  }
};

// Create GCash payment
exports.createGCashPayment = async (req, res) => {
  try {
    const { amount, currency, customer } = req.body;

    if (!amount || !customer) {
      return res.status(400).json({ success: false, message: 'Missing required payment data' });
    }

    const result = await payMongoRequest('/sources', 'POST', {
      data: {
        attributes: {
          type: 'gcash',
          amount: amount,
          currency: currency,
          redirect: {
            success: 'http://localhost:3000/index.html?payment=success',
            failed: 'http://localhost:3000/index.html?payment=failed'
          },
          billing: {
            name: customer.name,
            email: customer.email
          }
        }
      }
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Failed to create GCash payment', error: result.error });
    }

    const checkoutUrl = result.data.data.attributes.redirect.checkout_url;
    const sourceId = result.data.data.id;

    res.json({
      success: true,
      source_id: sourceId,
      checkout_url: checkoutUrl,
      message: 'GCash payment source created'
    });

  } catch (error) {
    console.error('GCash payment error:', error.message);
    res.status(500).json({ success: false, message: 'GCash payment failed', error: error.message });
  }
};

// PayMongo webhook
exports.webhook = async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    console.log('📢 PayMongo Webhook received:', event.type);

    if (event.type === 'payment.paid') {
      const paymentId = event.data.id;
      console.log('✅ Payment received:', paymentId);
    } else if (event.type === 'source.chargeable') {
      const sourceId = event.data.id;
      console.log('✅ Source chargeable:', sourceId);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;