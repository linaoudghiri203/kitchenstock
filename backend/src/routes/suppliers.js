const express = require('express');
const db = require('../config/db'); // Import the database query function

const router = express.Router();

// --- GET /api/suppliers - Retrieve all suppliers ---
router.get('/', async (req, res, next) => {
  try {
    const queryText = 'SELECT * FROM SUPPLIER ORDER BY SupplierID ASC';
    const { rows } = await db.query(queryText);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    next(err);
  }
});

// --- GET /api/suppliers/:id - Retrieve a single supplier by ID ---
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid supplier ID provided.' });
  }

  try {
    const queryText = 'SELECT * FROM SUPPLIER WHERE SupplierID = $1';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error fetching supplier ${id}:`, err);
    next(err);
  }
});

// --- POST /api/suppliers - Create a new supplier ---
router.post('/', async (req, res, next) => {
  // Extract all potential fields from the body
  const { suppliername, contactperson, phonenumber, email, address } = req.body;

  // Basic validation: suppliername is required
  if (!suppliername) {
    return res.status(400).json({ error: 'Missing required field: suppliername' });
  }

  try {
    const queryText = `
      INSERT INTO SUPPLIER (SupplierName, ContactPerson, PhoneNumber, Email, Address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;`;
    // Use null for optional fields if they are not provided or empty
    const values = [
        suppliername,
        contactperson || null,
        phonenumber || null,
        email || null,
        address || null
    ];

    const { rows } = await db.query(queryText, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating supplier:', err);
    if (err.code === '23505' && err.constraint === 'supplier_email_key') { // Handle unique constraint violation for Email
        return res.status(409).json({ error: 'Supplier email already exists.' });
    }
    // Add other specific error handling if needed (e.g., check constraint violations)
    next(err);
  }
});

// --- PUT /api/suppliers/:id - Update an existing supplier ---
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { suppliername, contactperson, phonenumber, email, address } = req.body;

  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid supplier ID provided.' });
  }

  if (!suppliername) {
    return res.status(400).json({ error: 'Missing required field: suppliername' });
  }

  try {
    const queryText = `
      UPDATE SUPPLIER
      SET SupplierName = $1, ContactPerson = $2, PhoneNumber = $3, Email = $4, Address = $5
      WHERE SupplierID = $6
      RETURNING *;`;
    const values = [
        suppliername,
        contactperson || null,
        phonenumber || null,
        email || null,
        address || null,
        id
    ];

    const { rows } = await db.query(queryText, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error updating supplier ${id}:`, err);
    if (err.code === '23505' && err.constraint === 'supplier_email_key') { // Handle unique constraint violation for Email
        return res.status(409).json({ error: 'Updated supplier email conflicts with an existing one.' });
    }
    // Add other specific error handling if needed
    next(err);
  }
});

// --- DELETE /api/suppliers/:id - Delete a supplier ---
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

   if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid supplier ID provided.' });
  }

  try {
    // Note: Deleting a supplier might have consequences if ON DELETE SET NULL is used
    // in related tables (INVENTORY_ITEM, DELIVERY). The supplier ID will become NULL there.
    const queryText = 'DELETE FROM SUPPLIER WHERE SupplierID = $1 RETURNING *;';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
     res.status(204).send(); // Success, no content to return

  } catch (err) {
    console.error(`Error deleting supplier ${id}:`, err);
    // Foreign key constraints with ON DELETE SET NULL/RESTRICT are handled by the DB,
    // so we don't typically need specific '23503' handling here unless we want a custom message.
    // If INVENTORY_ITEM or DELIVERY used ON DELETE RESTRICT, then '23503' would occur.
    next(err);
  }
});


module.exports = router;