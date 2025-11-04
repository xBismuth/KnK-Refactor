// ==================== PLANETSCALE DATABASE CONNECTION ====================
// PlanetScale uses serverless MySQL with connection pooling
const mysql = require('mysql2/promise');
require('dotenv').config();

// PlanetScale connection string format:
// mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}
// Or use individual connection parameters

const db = mysql.createPool({
  host: process.env.PLANETSCALE_HOST || process.env.DB_HOST,
  user: process.env.PLANETSCALE_USER || process.env.DB_USER,
  password: process.env.PLANETSCALE_PASSWORD || process.env.DB_PASS,
  database: process.env.PLANETSCALE_DATABASE || process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
db.getConnection()
  .then(connection => {
    console.log('✅ PlanetScale database connected successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('❌ PlanetScale database connection failed:', err.message);
  });

module.exports = db;

