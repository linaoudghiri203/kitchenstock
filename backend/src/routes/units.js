const express = require('express');
const db = require('../config/db'); // Import the database query function

const router = express.Router();

// --- GET /api/units - Retrieve all units ---
router.get('/', async (req, res, next) => {
  try {
    // Select all columns from the unit table, order by ID
    const queryText = 'SELECT * FROM UNIT_OF_MEASURE ORDER BY UnitID ASC';
    // Execute the query using the db module
    const { rows } = await db.query(queryText);
    // Send the retrieved rows as a JSON response with 200 OK status
    res.status(200).json(rows);
  } catch (err) {
    // Log the error and pass it to the global error handler
    console.error('Error fetching units:', err);
    next(err);
  }
});

// --- GET /api/units/:id - Retrieve a single unit by ID ---
router.get('/:id', async (req, res, next) => {
  // Extract the ID from the URL parameters
  const { id } = req.params;
  // Validate if the ID is a number
  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid unit ID provided.' });
  }

  try {
    // Select the unit where the UnitID matches the parameter ($1)
    const queryText = 'SELECT * FROM UNIT_OF_MEASURE WHERE UnitID = $1';
    // Execute the query with the ID as a parameter to prevent SQL injection
    const { rows } = await db.query(queryText, [id]);

    // If no rows are returned, the unit was not found
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }
    // Send the found unit as JSON with 200 OK status
    res.status(200).json(rows[0]);
  } catch (err) {
    // Log the error and pass it to the global error handler
    console.error(`Error fetching unit ${id}:`, err);
    next(err);
  }
});

// --- POST /api/units - Create a new unit ---
router.post('/', async (req, res, next) => {
  // Extract 'unit' and 'abbreviation' from the request body
  const { unit, abbreviation } = req.body;

  // Basic validation: ensure required fields are present
  if (!unit || !abbreviation) {
    return res.status(400).json({ error: 'Missing required fields: unit and abbreviation' });
  }

  try {
    // SQL query to insert a new row
    const queryText = `
      INSERT INTO UNIT_OF_MEASURE (Unit, Abbreviation)
      VALUES ($1, $2)
      RETURNING *;`; // RETURNING * sends back the newly created row data
    // Parameters for the query
    const values = [unit, abbreviation];

    // Execute the query
    const { rows } = await db.query(queryText, values);
    // Send back the created unit with 201 Created status
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating unit:', err);
    // Handle potential unique constraint violation (e.g., duplicate unit or abbreviation)
    if (err.code === '23505') { // PostgreSQL unique violation error code
        return res.status(409).json({ error: 'Unit or Abbreviation already exists.' });
    }
    // Pass other errors to the global handler
    next(err);
  }
});

// --- PUT /api/units/:id - Update an existing unit ---
router.put('/:id', async (req, res, next) => {
  // Get ID from URL parameters and new data from request body
  const { id } = req.params;
  const { unit, abbreviation } = req.body;

  // Validate the ID
  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid unit ID provided.' });
  }

  // Basic validation for required fields
  if (!unit || !abbreviation) {
    return res.status(400).json({ error: 'Missing required fields: unit and abbreviation' });
  }

  try {
    // SQL query to update the specified unit
    const queryText = `
      UPDATE UNIT_OF_MEASURE
      SET Unit = $1, Abbreviation = $2
      WHERE UnitID = $3
      RETURNING *;`; // Return the updated row data
    // Parameters for the query
    const values = [unit, abbreviation, id];

    // Execute the query
    const { rows } = await db.query(queryText, values);

    // If no rows are returned, the unit to update was not found
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }
    // Send back the updated unit with 200 OK status
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error updating unit ${id}:`, err);
     // Handle potential unique constraint violation on update
    if (err.code === '23505') { // PostgreSQL unique violation error code
        return res.status(409).json({ error: 'Updated Unit or Abbreviation conflicts with an existing one.' });
    }
    // Pass other errors to the global handler
    next(err);
  }
});

// --- DELETE /api/units/:id - Delete a unit ---
router.delete('/:id', async (req, res, next) => {
  // Get ID from URL parameters
  const { id } = req.params;

  // Validate the ID
   if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid unit ID provided.' });
  }

  try {
    // SQL query to delete the specified unit
    const queryText = 'DELETE FROM UNIT_OF_MEASURE WHERE UnitID = $1 RETURNING *;';
    // Execute the query
    const { rows } = await db.query(queryText, [id]);

    // If no rows returned, the unit to delete was not found
    if (rows.length === 0) {
      // Standard practice is often to return 404 Not Found
      return res.status(404).json({ message: 'Unit not found' });
      // Alternatively, send 204 No Content even if not found:
      // return res.status(204).send();
    }
    // Send 204 No Content status indicating successful deletion
     res.status(204).send();

  } catch (err) {
    console.error(`Error deleting unit ${id}:`, err);
    // Handle foreign key constraint violation (if unit is used elsewhere)
    if (err.code === '23503') { // PostgreSQL foreign key violation error code
        return res.status(409).json({ error: 'Cannot delete unit: It is currently referenced by other records (e.g., inventory items, recipes).' });
    }
    // Pass other errors to the global handler
    next(err);
  }
});


module.exports = router; // Export the router to be used in server.js