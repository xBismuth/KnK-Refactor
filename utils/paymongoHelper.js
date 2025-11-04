// ==================== PAYMONGO HELPER ====================
const axios = require('axios');
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

// PayMongo authentication header
const getPayMongoAuth = () => {
  if (!PAYMONGO_SECRET_KEY) {
    throw new Error('PayMongo secret key not configured');
  }
  const auth = Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64');
  return `Basic ${auth}`;
};

// PayMongo API request helper
const payMongoRequest = async (endpoint, method = 'POST', data = null) => {
  try {
    const config = {
      method,
      url: `${PAYMONGO_API_BASE}${endpoint}`,
      headers: {
        'Authorization': getPayMongoAuth(),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('PayMongo API Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.errors?.[0]?.detail || error.message 
    };
  }
};

module.exports = {
  getPayMongoAuth,
  payMongoRequest,
  PAYMONGO_API_BASE
};