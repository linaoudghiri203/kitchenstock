const { Pool } = require('pg'); // Import the Pool class from the pg library
require('dotenv').config(); // Load environment variables from .env file

// Create a new Pool instance.
// The Pool manages multiple client connections automatically.
// It reads connection details from environment variables by default:
// PGUSER, PGHOST, PGDATABASE, PGPASSWORD, PGPORT
// We are explicitly mapping our .env variables for clarity.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10), // Default to 5432 if not specified
});

// Test the connection (optional, but good for diagnostics)
pool.connect((err, client, release) => {
  if (err) {
    // Log detailed error if connection fails
    console.error('Error acquiring database client:', err.message);
    console.error('Stack:', err.stack);
    // You might want to exit the process if the DB connection is critical
    // process.exit(1);
    return; // Prevent proceeding if connection failed
  }
  // Only log success if the connection was actually successful
  if (client) {
      console.log('Successfully connected to PostgreSQL database!');
      client.release(); // Release the client back to the pool
  }
});

// Export a query function to be used throughout the application
// This simplifies executing queries by handling client checkout/release
module.exports = {
  query: (text, params) => pool.query(text, params),
  // Export the pool itself for acquiring clients for transactions
  pool: pool
};