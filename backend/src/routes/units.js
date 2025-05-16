const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const queryText = 'SELECT * FROM UNIT_OF_MEASURE ORDER BY UnitID ASC';
    const { rows } = await db.query(queryText);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching units:', err);
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid unit ID provided.' });
  }

  try {
    const queryText = 'SELECT * FROM UNIT_OF_MEASURE WHERE UnitID = $1';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error fetching unit ${id}:`, err);
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { unit, abbreviation } = req.body;

  if (!unit || !abbreviation) {
    return res.status(400).json({ error: 'Missing required fields: unit and abbreviation' });
  }

  try {
    const queryText = `
      INSERT INTO UNIT_OF_MEASURE (Unit, Abbreviation)
      VALUES ($1, $2)
      RETURNING *;`;
    const values = [unit, abbreviation];

    const { rows } = await db.query(queryText, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating unit:', err);
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Unit or Abbreviation already exists.' });
    }
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { unit, abbreviation } = req.body;

  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid unit ID provided.' });
  }

  if (!unit || !abbreviation) {
    return res.status(400).json({ error: 'Missing required fields: unit and abbreviation' });
  }

  try {
    const queryText = `
      UPDATE UNIT_OF_MEASURE
      SET Unit = $1, Abbreviation = $2
      WHERE UnitID = $3
      RETURNING *;`;
    const values = [unit, abbreviation, id];

    const { rows } = await db.query(queryText, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error updating unit ${id}:`, err);
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Updated Unit or Abbreviation conflicts with an existing one.' });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

   if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid unit ID provided.' });
  }

  try {
    const queryText = 'DELETE FROM UNIT_OF_MEASURE WHERE UnitID = $1 RETURNING *;';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }
     res.status(204).send();

  } catch (err) {
    console.error(`Error deleting unit ${id}:`, err);
    if (err.code === '23503') {
        return res.status(409).json({ error: 'Cannot delete unit: It is currently referenced by other records (e.g., inventory items, recipes).' });
    }
    next(err);
  }
});


module.exports = router;