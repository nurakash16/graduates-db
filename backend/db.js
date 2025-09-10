// const { Pool } = require('pg');

// const pool = new Pool({
//   user: 'postgres.fnaloyrshwyqytmlxgwy',        // default PostgreSQL user
//   host: 'aws-1-us-east-2.pooler.supabase.com',         // default host
//   database: 'postgres',      // default database
//   password: '@mb@s5249',         // your password
//   port: 6543                 // default PostgreSQL port
// });

// module.exports = pool;

// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

module.exports = pool;

