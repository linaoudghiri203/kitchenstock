const express = require('express');
const db = require('../config/db'); // Import the database query function

const router = express.Router();

// --- GET /api/categories - Retrieve all categories ---
router.get('/', async (req, res, next) => {
  try {
    const queryText = 'SELECT * FROM CATEGORY ORDER BY CategoryID ASC';
    const { rows } = await db.query(queryText);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    next(err);
  }
});

// --- GET /api/categories/:id - Retrieve a single category by ID ---
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid category ID provided.' });
  }

  try {
    const queryText = 'SELECT * FROM CATEGORY WHERE CategoryID = $1';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error fetching category ${id}:`, err);
    next(err);
  }
});

// --- POST /api/categories - Create a new category ---
router.post('/', async (req, res, next) => {
  // Description is optional
  const { categoryname, description } = req.body;

  // Basic validation
  if (!categoryname) {
    return res.status(400).json({ error: 'Missing required field: categoryname' });
  }

  try {
    const queryText = `
      INSERT INTO CATEGORY (CategoryName, Description)
      VALUES ($1, $2)
      RETURNING *;`;
    // Use null for description if it's not provided or empty
    const values = [categoryname, description || null];

    const { rows } = await db.query(queryText, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    if (err.code === '23505') { // Handle unique constraint violation for CategoryName
        return res.status(409).json({ error: 'Category name already exists.' });
    }
    next(err);
  }
});

// --- PUT /api/categories/:id - Update an existing category ---
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { categoryname, description } = req.body;

  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid category ID provided.' });
  }

  if (!categoryname) {
    return res.status(400).json({ error: 'Missing required field: categoryname' });
  }

  try {
    const queryText = `
      UPDATE CATEGORY
      SET CategoryName = $1, Description = $2
      WHERE CategoryID = $3
      RETURNING *;`;
    const values = [categoryname, description || null, id];

    const { rows } = await db.query(queryText, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error updating category ${id}:`, err);
    if (err.code === '23505') { // Handle unique constraint violation for CategoryName
        return res.status(409).json({ error: 'Updated category name conflicts with an existing one.' });
    }
    next(err);
  }
});

// --- DELETE /api/categories/:id - Delete a category ---
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

   if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid category ID provided.' });
  }

  try {
    const queryText = 'DELETE FROM CATEGORY WHERE CategoryID = $1 RETURNING *;';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
     res.status(204).send(); // Success, no content to return

  } catch (err) {
    console.error(`Error deleting category ${id}:`, err);
    // Handle foreign key constraint violation (if category is used by inventory items)
    if (err.code === '23503') {
        return res.status(409).json({ error: 'Cannot delete category: It is currently referenced by inventory items.' });
    }
    next(err);
  }
});


module.exports = router;
