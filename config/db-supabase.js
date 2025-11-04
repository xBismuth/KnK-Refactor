// ==================== SUPABASE DATABASE CONNECTION ====================
// Supabase uses PostgreSQL, so we need to use 'pg' package instead of 'mysql2'
// This wrapper provides MySQL-compatible interface for easier migration

const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST || process.env.DB_HOST,
  user: process.env.SUPABASE_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASS,
  database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME || 'postgres',
  port: process.env.SUPABASE_DB_PORT || process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false // Supabase requires SSL
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Wrapper to make PostgreSQL queries compatible with MySQL2 syntax
// This allows existing MySQL queries to work with minimal changes
const db = {
  // Query method - mimics mysql2's query interface
  query: async (text, params) => {
    try {
      // Convert MySQL-style queries to PostgreSQL where needed
      let query = text;
      
      // Replace MySQL-specific functions with PostgreSQL equivalents
      query = query.replace(/CURDATE\(\)/gi, 'CURRENT_DATE');
      query = query.replace(/NOW\(\)/gi, 'NOW()'); // Same in PostgreSQL
      query = query.replace(/IFNULL\(/gi, 'COALESCE(');
      
      // Replace backticks with double quotes (PostgreSQL uses double quotes)
      query = query.replace(/`([^`]+)`/g, '"$1"');
      
      // For INSERT queries, add RETURNING id to get the inserted ID
      // PostgreSQL requires RETURNING clause to get inserted row
      const isInsertQuery = /^\s*INSERT/i.test(query.trim());
      if (isInsertQuery && !/RETURNING/i.test(query)) {
        // Add RETURNING id at the end of INSERT statement
        query = query.replace(/;?\s*$/i, ' RETURNING id;');
      }
      
      // Execute query
      const result = await pool.query(query, params);
      
      // For INSERT/UPDATE/DELETE, add affectedRows compatibility
      // PostgreSQL uses rowCount instead of affectedRows
      const isModifyingQuery = /^\s*(INSERT|UPDATE|DELETE)/i.test(query.trim());
      
      if (isModifyingQuery) {
        // Add affectedRows to result object for compatibility
        result.affectedRows = result.rowCount || 0;
        
        // For INSERT queries, try to get the inserted ID
        if (/^\s*INSERT/i.test(query.trim()) && result.rows && result.rows[0]) {
          // PostgreSQL returns the inserted row, try to get the ID
          const insertedRow = result.rows[0];
          if (insertedRow.id) {
            result.insertId = insertedRow.id;
          }
        }
      }
      
      // Return in MySQL2 format: [rows, fields]
      // But also attach result object with affectedRows for compatibility
      const rows = result.rows || [];
      const fields = result.fields || [];
      
      // Attach result metadata to rows array for compatibility
      // Controllers access result.affectedRows, where result is the rows array
      if (isModifyingQuery) {
        rows.affectedRows = result.rowCount || 0;
        // For INSERT queries, try to get the inserted ID
        if (/^\s*INSERT/i.test(query.trim()) && result.rows && result.rows[0]) {
          const insertedRow = result.rows[0];
          if (insertedRow.id) {
            rows.insertId = insertedRow.id;
          } else {
            rows.insertId = null;
          }
        } else {
          rows.insertId = null;
        }
      } else {
        rows.affectedRows = 0;
        rows.insertId = null;
      }
      
      return [rows, fields];
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      throw error;
    }
  },

  // Get connection (for compatibility with mysql2)
  getConnection: async () => {
    try {
      const client = await pool.connect();
      // Return a mock connection object with mysql2-compatible methods
      return {
        query: async (text, params) => {
          let query = text;
          query = query.replace(/CURDATE\(\)/gi, 'CURRENT_DATE');
          query = query.replace(/IFNULL\(/gi, 'COALESCE(');
          query = query.replace(/`([^`]+)`/g, '"$1"');
          
          const result = await client.query(query, params);
          return [result.rows, result.fields || []];
        },
        release: () => client.release(),
        // For compatibility with MySQL result.affectedRows
        affectedRows: 0,
        insertId: null
      };
    } catch (error) {
      console.error('❌ Get connection error:', error.message);
      throw error;
    }
  },

  // End pool (for graceful shutdown)
  end: async () => {
    await pool.end();
  },

  // Direct access to pool (for advanced usage)
  pool: pool
};

// Test database connection
pool.query('SELECT NOW() as current_time')
  .then(result => {
    console.log('✅ Supabase database connected successfully!');
    console.log(`   Database: ${process.env.SUPABASE_DB_NAME || process.env.DB_NAME || 'postgres'}`);
  })
  .catch(err => {
    console.error('❌ Supabase database connection failed:', err.message);
    console.error('💡 Make sure your Supabase credentials are correct in environment variables');
    console.error('💡 Required variables: SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD, SUPABASE_DB_NAME');
  });

module.exports = db;

