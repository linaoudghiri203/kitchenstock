const express = require('express');
const db = require('../config/db'); // Import the database query function

const router = express.Router();

// --- GET /api/items - Retrieve all inventory items ---
// Includes optional filtering by category and joins for readable names
router.get('/', async (req, res, next) => {
  // Example: /api/items?categoryid=1
  const { categoryid } = req.query;
  let queryText = `
    SELECT
        i.ItemID, i.ItemName, i.Description, i.QuantityOnHand, i.ReorderPoint, i.LastUpdated,
        c.CategoryID, c.CategoryName,
        u.UnitID, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation,
        s.SupplierID, s.SupplierName
    FROM INVENTORY_ITEM i
    JOIN CATEGORY c ON i.CategoryID = c.CategoryID
    JOIN UNIT_OF_MEASURE u ON i.UnitID = u.UnitID
    LEFT JOIN SUPPLIER s ON i.SupplierID = s.SupplierID`; // LEFT JOIN for optional supplier

  const queryParams = [];

  if (categoryid && !isNaN(parseInt(categoryid, 10))) {
    queryText += ' WHERE i.CategoryID = $1';
    queryParams.push(parseInt(categoryid, 10));
  }

  queryText += ' ORDER BY i.ItemID ASC';

  try {
    const { rows } = await db.query(queryText, queryParams);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching inventory items:', err);
    next(err);
  }
});

// --- GET /api/items/:id - Retrieve a single inventory item by ID ---
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid item ID provided.' });
  }

  try {
    // Query joins with related tables to get names along with IDs
    const queryText = `
      SELECT
          i.ItemID, i.ItemName, i.Description, i.QuantityOnHand, i.ReorderPoint, i.LastUpdated,
          c.CategoryID, c.CategoryName,
          u.UnitID, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation,
          s.SupplierID, s.SupplierName
      FROM INVENTORY_ITEM i
      JOIN CATEGORY c ON i.CategoryID = c.CategoryID
      JOIN UNIT_OF_MEASURE u ON i.UnitID = u.UnitID
      LEFT JOIN SUPPLIER s ON i.SupplierID = s.SupplierID
      WHERE i.ItemID = $1`;

    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error fetching inventory item ${id}:`, err);
    next(err);
  }
});

// --- POST /api/items - Create a new inventory item ---
router.post('/', async (req, res, next) => {
  const {
    itemname, // Required
    description, // Optional
    categoryid, // Required
    unitid, // Required
    quantityonhand, // Optional, defaults to 0 in DB
    reorderpoint, // Optional, defaults to 0 in DB
    supplierid // Optional
  } = req.body;

  // --- Validation ---
  if (!itemname || !categoryid || !unitid) {
    return res.status(400).json({ error: 'Missing required fields: itemname, categoryid, unitid' });
  }
  if (isNaN(parseInt(categoryid, 10)) || isNaN(parseInt(unitid, 10))) {
      return res.status(400).json({ error: 'Invalid categoryid or unitid. Must be numbers.' });
  }
  if (supplierid && isNaN(parseInt(supplierid, 10))) {
      return res.status(400).json({ error: 'Invalid supplierid. Must be a number or null.' });
  }
  // Validate numeric fields if provided
  const qty = quantityonhand !== undefined ? parseFloat(quantityonhand) : 0;
  const reorder = reorderpoint !== undefined ? parseFloat(reorderpoint) : 0;
   if (isNaN(qty) || qty < 0) {
       return res.status(400).json({ error: 'Invalid quantityonhand. Must be a non-negative number.' });
   }
   if (isNaN(reorder) || reorder < 0) {
       return res.status(400).json({ error: 'Invalid reorderpoint. Must be a non-negative number.' });
   }
   // --- End Validation ---

  try {
    const queryText = `
      INSERT INTO INVENTORY_ITEM
        (ItemName, Description, CategoryID, UnitID, QuantityOnHand, ReorderPoint, SupplierID)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;`;
    const values = [
        itemname,
        description || null,
        parseInt(categoryid, 10),
        parseInt(unitid, 10),
        qty,
        reorder,
        supplierid ? parseInt(supplierid, 10) : null // Use null if supplierid is not provided
    ];

    const { rows } = await db.query(queryText, values);
    // Optionally, fetch the newly created item with joined names for the response
    const newItemResult = await db.query(`
        SELECT i.*, c.CategoryName, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation, s.SupplierName
        FROM INVENTORY_ITEM i
        JOIN CATEGORY c ON i.CategoryID = c.CategoryID
        JOIN UNIT_OF_MEASURE u ON i.UnitID = u.UnitID
        LEFT JOIN SUPPLIER s ON i.SupplierID = s.SupplierID
        WHERE i.ItemID = $1`, [rows[0].itemid]);

    res.status(201).json(newItemResult.rows[0]);

  } catch (err) {
    console.error('Error creating inventory item:', err);
    if (err.code === '23505' && err.constraint === 'inventory_item_itemname_key') { // Handle unique item name
        return res.status(409).json({ error: 'Inventory item name already exists.' });
    }
    if (err.code === '23503') { // Handle foreign key violation (e.g., categoryid doesn't exist)
         return res.status(400).json({ error: 'Invalid CategoryID, UnitID, or SupplierID provided. Referenced record does not exist.' });
    }
    next(err);
  }
});

// --- PUT /api/items/:id - Update an existing inventory item ---
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const {
    itemname, description, categoryid, unitid,
    quantityonhand, reorderpoint, supplierid
  } = req.body;

  // --- Validation ---
   if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid item ID provided.' });
  }
  if (!itemname || !categoryid || !unitid) {
    return res.status(400).json({ error: 'Missing required fields: itemname, categoryid, unitid' });
  }
   if (isNaN(parseInt(categoryid, 10)) || isNaN(parseInt(unitid, 10))) {
      return res.status(400).json({ error: 'Invalid categoryid or unitid. Must be numbers.' });
  }
  if (supplierid && isNaN(parseInt(supplierid, 10))) {
      return res.status(400).json({ error: 'Invalid supplierid. Must be a number or null/undefined.' });
  }
  // Validate numeric fields if provided (allow them to be missing from request)
  let qty, reorder;
  if (quantityonhand !== undefined) {
      qty = parseFloat(quantityonhand);
      if (isNaN(qty) || qty < 0) {
          return res.status(400).json({ error: 'Invalid quantityonhand. Must be a non-negative number.' });
      }
  }
  if (reorderpoint !== undefined) {
      reorder = parseFloat(reorderpoint);
      if (isNaN(reorder) || reorder < 0) {
          return res.status(400).json({ error: 'Invalid reorderpoint. Must be a non-negative number.' });
      }
  }
  // --- End Validation ---

  try {
    // Construct the update query dynamically based on provided fields
    // This avoids overwriting existing values with null if they aren't in the request body
    // Note: The trigger will automatically update LastUpdated
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (itemname !== undefined) { fields.push(`ItemName = $${paramIndex++}`); values.push(itemname); }
    if (description !== undefined) { fields.push(`Description = $${paramIndex++}`); values.push(description); }
    if (categoryid !== undefined) { fields.push(`CategoryID = $${paramIndex++}`); values.push(parseInt(categoryid, 10)); }
    if (unitid !== undefined) { fields.push(`UnitID = $${paramIndex++}`); values.push(parseInt(unitid, 10)); }
    if (qty !== undefined) { fields.push(`QuantityOnHand = $${paramIndex++}`); values.push(qty); }
    if (reorder !== undefined) { fields.push(`ReorderPoint = $${paramIndex++}`); values.push(reorder); }
    // Handle supplierid potentially being set to null
    if (supplierid !== undefined) {
        fields.push(`SupplierID = $${paramIndex++}`);
        values.push(supplierid ? parseInt(supplierid, 10) : null);
    }


    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    // Add the WHERE clause parameter
    values.push(parseInt(id, 10));

    const queryText = `
      UPDATE INVENTORY_ITEM
      SET ${fields.join(', ')}
      WHERE ItemID = $${paramIndex}
      RETURNING *;`;

    const { rows } = await db.query(queryText, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Optionally, fetch the updated item with joined names for the response
    const updatedItemResult = await db.query(`
        SELECT i.*, c.CategoryName, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation, s.SupplierName
        FROM INVENTORY_ITEM i
        JOIN CATEGORY c ON i.CategoryID = c.CategoryID
        JOIN UNIT_OF_MEASURE u ON i.UnitID = u.UnitID
        LEFT JOIN SUPPLIER s ON i.SupplierID = s.SupplierID
        WHERE i.ItemID = $1`, [id]);


    res.status(200).json(updatedItemResult.rows[0]); // Send back the updated item

  } catch (err) {
    console.error(`Error updating inventory item ${id}:`, err);
    if (err.code === '23505' && err.constraint === 'inventory_item_itemname_key') { // Handle unique item name
        return res.status(409).json({ error: 'Updated item name conflicts with an existing one.' });
    }
     if (err.code === '23503') { // Handle foreign key violation (e.g., categoryid doesn't exist)
         return res.status(400).json({ error: 'Invalid CategoryID, UnitID, or SupplierID provided. Referenced record does not exist.' });
    }
    next(err);
  }
});

// --- DELETE /api/items/:id - Delete an inventory item ---
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

   if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid item ID provided.' });
  }

  try {
    // Attempt to delete the item
    const queryText = 'DELETE FROM INVENTORY_ITEM WHERE ItemID = $1 RETURNING *;';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
     res.status(204).send(); // Success, no content

  } catch (err) {
    console.error(`Error deleting inventory item ${id}:`, err);
    // Handle foreign key constraint violation (item used in deliveries, recipes, usage, waste)
    if (err.code === '23503') {
        return res.status(409).json({ error: 'Cannot delete item: It is referenced in deliveries, recipes, usage, or waste records.' });
    }
    next(err);
  }
});


module.exports = router;