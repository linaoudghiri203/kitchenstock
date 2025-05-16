const express = require('express');
const db = require('../config/db');

const router = express.Router();

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

router.post('/', async (req, res, next) => {
  const { categoryname, description } = req.body;

  if (!categoryname) {
    return res.status(400).json({ error: 'Missing required field: categoryname' });
  }

  try {
    const queryText = `
      INSERT INTO CATEGORY (CategoryName, Description)
      VALUES ($1, $2)
      RETURNING *;`;
    const values = [categoryname, description || null];

    const { rows } = await db.query(queryText, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Category name already exists.' });
    }
    next(err);
  }
});

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
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Updated category name conflicts with an existing one.' });
    }
    next(err);
  }
});

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
     res.status(204).send();

  } catch (err) {
    console.error(`Error deleting category ${id}:`, err);
    if (err.code === '23503') {
        return res.status(409).json({ error: 'Cannot delete category: It is currently referenced by inventory items.' });
    }
    next(err);
  }
});


module.exports = router;
