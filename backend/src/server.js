require('dotenv').config(); // Load environment variables first
const express = require('express');
const cors = require('cors');
const db = require('./config/db'); // Import the database query function

// --- Initialize Express App ---
const app = express();
// Ensure PORT is read correctly from .env, otherwise default
const PORT = parseInt(process.env.PORT || '5001', 10);

// --- Middleware ---
// Enable CORS for all origins (adjust for production later)
app.use(cors());
// Parse JSON request bodies (essential for POST/PUT)
app.use(express.json());
// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// --- Basic Routes ---
app.get('/', (req, res) => {
  res.send('StockWatch API is running!');
});

// --- API Routes ---
// Mount the units router
const unitRoutes = require('./routes/units'); // Import the unit router
app.use('/api/units', unitRoutes); // Use the unit router for paths starting with /api/units

// Mount the categories router
const categoryRoutes = require('./routes/categories'); // Import the category router
app.use('/api/categories', categoryRoutes); // Use the category router for paths starting with /api/categories

// Mount the suppliers router
const supplierRoutes = require('./routes/suppliers'); // Import the supplier router
app.use('/api/suppliers', supplierRoutes); // Use the supplier router for paths starting with /api/suppliers

// Mount the inventory items router
const itemRoutes = require('./routes/items'); // Import the items router
app.use('/api/items', itemRoutes); // Use the items router for paths starting with /api/items

// Mount the menu items router (which now includes nested ingredient routes)
const menuItemRoutes = require('./routes/menuItems'); // Import the menu items router
app.use('/api/menu-items', menuItemRoutes); // Use the menu items router

// Mount the deliveries router
const deliveryRoutes = require('./routes/deliveries'); // Import the deliveries router
app.use('/api/deliveries', deliveryRoutes); // Use the deliveries router

// Mount the usage/waste router (Note: GET /waste is now in reports.js)
const usageRoutes = require('./routes/usage'); // Import the usage router
app.use('/api/usage', usageRoutes); // Use the usage router for POST /manual, POST /sale
app.use('/api/waste', usageRoutes); // Use the usage router for POST /waste

// Mount the reports router
const reportRoutes = require('./routes/reports'); // Import the reports router
app.use('/api/reports', reportRoutes); // Use the reports router


// --- Test Database Connection Route ---
app.get('/db-test', async (req, res) => {
  try {
    // Use the query function from db.js
    const result = await db.query('SELECT NOW()'); // Simple query to check connection
    res.json({ message: 'Database connection successful!', time: result.rows[0].now });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});


// --- Error Handling Middleware (Basic) ---
// Catches errors passed via next(err) from route handlers
app.use((err, req, res, next) => {
  console.error("Global error handler caught:");
  console.error(err.stack); // Log the full error stack trace
  // Avoid sending stack trace in production
  res.status(500).json({ error: 'Something went wrong on the server!', details: err.message });
});

// --- Start Server ---
// Check if the port is valid before listening
if (isNaN(PORT) || PORT <= 0 || PORT > 65535) {
    console.error(`Invalid PORT specified: ${process.env.PORT}. Please check your .env file.`);
    process.exit(1); // Exit if port is invalid
}

app.listen(PORT, '0.0.0.0', () => { // Explicitly listen on all IPv4 addresses
  console.log(`Server listening on http://localhost:${PORT} and http://<your-ip-address>:${PORT}`);
}).on('error', (err) => {
    // Handle specific listening errors, like EADDRINUSE
    if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use. Is another server running?`);
    } else {
        console.error('Server failed to start:', err);
    }
    process.exit(1); // Exit if server fails to start
});
