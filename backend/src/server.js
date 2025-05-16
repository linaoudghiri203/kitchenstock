require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('StockWatch API is running!');
});

const unitRoutes = require('./routes/units');
app.use('/api/units', unitRoutes);

const categoryRoutes = require('./routes/categories');
app.use('/api/categories', categoryRoutes);

const supplierRoutes = require('./routes/suppliers');
const supplierItemRoutes = require('./routes/supplierItems');
app.use('/api/suppliers', supplierRoutes);
supplierRoutes.use('/:supplierId/items', supplierItemRoutes);

const itemRoutes = require('./routes/items');
app.use('/api/items', itemRoutes);

const menuItemRoutes = require('./routes/menuItems');
app.use('/api/menu-items', menuItemRoutes);

const deliveryRoutes = require('./routes/deliveries');
app.use('/api/deliveries', deliveryRoutes);

const usageRoutes = require('./routes/usage');
app.use('/api/usage', usageRoutes);
app.use('/api/waste', usageRoutes);

const reportRoutes = require('./routes/reports');
app.use('/api/reports', reportRoutes);


app.get('/db-test', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Database connection successful!', time: result.rows[0].now });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});


app.use((err, req, res, next) => {
  console.error("Global error handler caught:");
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!', details: err.message });
});

if (isNaN(PORT) || PORT <= 0 || PORT > 65535) {
    console.error(`Invalid PORT specified: ${process.env.PORT}. Please check your .env file.`);
    process.exit(1);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT} and http://<your-ip-address>:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use. Is another server running?`);
    } else {
        console.error('Server failed to start:', err);
    }
    process.exit(1);
});