const express = require('express');
const db = require('../config/db'); // Import the database query function

const router = express.Router();

// === MENU ITEM CRUD ===

// --- GET /api/menu-items - Retrieve all menu items ---
router.get('/', async (req, res, next) => {
  try {
    const queryText = 'SELECT * FROM MENU_ITEM ORDER BY MenuItemID ASC';
    const { rows } = await db.query(queryText);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching menu items:', err);
    next(err);
  }
});

// --- GET /api/menu-items/:menuItemId - Retrieve a single menu item by ID ---
// Does NOT include ingredients by default
router.get('/:menuItemId', async (req, res, next) => {
  const { menuItemId } = req.params;
  if (isNaN(parseInt(menuItemId, 10))) {
      return res.status(400).json({ error: 'Invalid menu item ID provided.' });
  }

  try {
    const queryText = 'SELECT * FROM MENU_ITEM WHERE MenuItemID = $1';
    const { rows } = await db.query(queryText, [menuItemId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error fetching menu item ${menuItemId}:`, err);
    next(err);
  }
});

// --- POST /api/menu-items - Create a new menu item ---
router.post('/', async (req, res, next) => {
  const { menuitemname, description, price } = req.body;

  // Validation
  if (!menuitemname) {
    return res.status(400).json({ error: 'Missing required field: menuitemname' });
  }
  let numericPrice = null;
  if (price !== undefined && price !== null) {
      numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
          return res.status(400).json({ error: 'Invalid price. Must be a non-negative number.' });
      }
  }


  try {
    const queryText = `
      INSERT INTO MENU_ITEM (MenuItemName, Description, Price)
      VALUES ($1, $2, $3)
      RETURNING *;`;
    const values = [
        menuitemname,
        description || null,
        numericPrice // Use the validated numeric price or null
    ];

    const { rows } = await db.query(queryText, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating menu item:', err);
    if (err.code === '23505' && err.constraint === 'menu_item_menuitemname_key') { // Handle unique name
        return res.status(409).json({ error: 'Menu item name already exists.' });
    }
    next(err);
  }
});

// --- PUT /api/menu-items/:menuItemId - Update an existing menu item ---
router.put('/:menuItemId', async (req, res, next) => {
  const { menuItemId } = req.params;
  const { menuitemname, description, price } = req.body;

  // Validation
  if (isNaN(parseInt(menuItemId, 10))) {
      return res.status(400).json({ error: 'Invalid menu item ID provided.' });
  }
  // For PUT, technically all fields should be provided for a full replacement
  // We implement dynamic SET for flexibility, but require name at minimum
  if (!menuitemname) {
    return res.status(400).json({ error: 'Missing required field: menuitemname' });
  }
  let numericPrice;
  if (price !== undefined) { // Allow price to be explicitly set to null to remove it
      numericPrice = parseFloat(price);
      if (price !== null && (isNaN(numericPrice) || numericPrice < 0)) {
          return res.status(400).json({ error: 'Invalid price. Must be a non-negative number or null.' });
      }
  }


  try {
    // Construct dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (menuitemname !== undefined) { fields.push(`MenuItemName = $${paramIndex++}`); values.push(menuitemname); }
    if (description !== undefined) { fields.push(`Description = $${paramIndex++}`); values.push(description); }
    if (price !== undefined) { fields.push(`Price = $${paramIndex++}`); values.push(numericPrice); } // Use validated price

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    values.push(parseInt(menuItemId, 10)); // Add the ID for the WHERE clause

    const queryText = `
      UPDATE MENU_ITEM
      SET ${fields.join(', ')}, LastUpdated = NOW() -- Also update LastUpdated timestamp
      WHERE MenuItemID = $${paramIndex}
      RETURNING *;`;

    const { rows } = await db.query(queryText, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error updating menu item ${menuItemId}:`, err);
     if (err.code === '23505' && err.constraint === 'menu_item_menuitemname_key') { // Handle unique name
        return res.status(409).json({ error: 'Updated menu item name conflicts with an existing one.' });
    }
    next(err);
  }
});

// --- DELETE /api/menu-items/:menuItemId - Delete a menu item ---
// Note: This will cascade delete related RECIPE_INGREDIENT and set MenuItemID to NULL in USAGE_RECORD
router.delete('/:menuItemId', async (req, res, next) => {
  const { menuItemId } = req.params;

   if (isNaN(parseInt(menuItemId, 10))) {
      return res.status(400).json({ error: 'Invalid menu item ID provided.' });
  }

  try {
    const queryText = 'DELETE FROM MENU_ITEM WHERE MenuItemID = $1 RETURNING *;';
    const { rows } = await db.query(queryText, [menuItemId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
     res.status(204).send(); // Success

  } catch (err) {
    console.error(`Error deleting menu item ${menuItemId}:`, err);
    // Foreign key issues are handled by CASCADE/SET NULL in the schema definition
    next(err);
  }
});


// === RECIPE INGREDIENT ROUTES (Nested under Menu Items) ===

// --- GET /api/menu-items/:menuItemId/ingredients - Get all ingredients for a menu item ---
router.get('/:menuItemId/ingredients', async (req, res, next) => {
    const { menuItemId } = req.params;
    if (isNaN(parseInt(menuItemId, 10))) {
        return res.status(400).json({ error: 'Invalid menu item ID provided.' });
    }

    try {
        // Check if menu item exists first
        const menuCheck = await db.query('SELECT 1 FROM MENU_ITEM WHERE MenuItemID = $1', [menuItemId]);
        if (menuCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        // Query to get ingredients, joining with inventory and unit tables for details
        const queryText = `
            SELECT
                ri.MenuItemID, ri.ItemID, ri.QuantityRequired, ri.UnitID,
                i.ItemName,
                u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation
            FROM RECIPE_INGREDIENT ri
            JOIN INVENTORY_ITEM i ON ri.ItemID = i.ItemID
            JOIN UNIT_OF_MEASURE u ON ri.UnitID = u.UnitID
            WHERE ri.MenuItemID = $1
            ORDER BY i.ItemName;
        `;
        const { rows } = await db.query(queryText, [menuItemId]);
        res.status(200).json(rows);
    } catch (err) {
        console.error(`Error fetching ingredients for menu item ${menuItemId}:`, err);
        next(err);
    }
});

// --- POST /api/menu-items/:menuItemId/ingredients - Add an ingredient to a recipe ---
router.post('/:menuItemId/ingredients', async (req, res, next) => {
    const { menuItemId } = req.params;
    const { itemid, quantityrequired, unitid } = req.body; // Note: case-sensitive keys from JSON body

    // --- Validation ---
    if (isNaN(parseInt(menuItemId, 10))) {
        return res.status(400).json({ error: 'Invalid menu item ID provided.' });
    }
    if (!itemid || !quantityrequired || !unitid) {
        return res.status(400).json({ error: 'Missing required fields: itemid, quantityrequired, unitid.' });
    }
    if (isNaN(parseInt(itemid, 10)) || isNaN(parseInt(unitid, 10))) {
        return res.status(400).json({ error: 'Invalid itemid or unitid. Must be numbers.' });
    }
    const quantity = parseFloat(quantityrequired);
    if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid quantityrequired. Must be a positive number.' });
    }
    // --- End Validation ---

    try {
        // Optionally: Check if menuItemId, itemId, and unitId actually exist before inserting
        // (Could be done with separate SELECTs or rely on FK constraints)

        const queryText = `
            INSERT INTO RECIPE_INGREDIENT (MenuItemID, ItemID, QuantityRequired, UnitID)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [parseInt(menuItemId, 10), parseInt(itemid, 10), quantity, parseInt(unitid, 10)];
        const { rows } = await db.query(queryText, values);

        // Fetch the newly added ingredient with joined names for a richer response
        const newIngredientResult = await db.query(`
            SELECT ri.*, i.ItemName, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation
            FROM RECIPE_INGREDIENT ri
            JOIN INVENTORY_ITEM i ON ri.ItemID = i.ItemID
            JOIN UNIT_OF_MEASURE u ON ri.UnitID = u.UnitID
            WHERE ri.MenuItemID = $1 AND ri.ItemID = $2
        `, [rows[0].menuitemid, rows[0].itemid]);


        res.status(201).json(newIngredientResult.rows[0]);

    } catch (err) {
        console.error(`Error adding ingredient to menu item ${menuItemId}:`, err);
        if (err.code === '23505') { // Primary key violation (ingredient already exists for this menu item)
            return res.status(409).json({ error: 'This ingredient already exists in the recipe for this menu item.' });
        }
        if (err.code === '23503') { // Foreign key violation (menu item, inventory item, or unit doesn't exist)
            return res.status(400).json({ error: 'Invalid MenuItemID, ItemID, or UnitID provided. Referenced record does not exist.' });
        }
        next(err);
    }
});

// --- PUT /api/menu-items/:menuItemId/ingredients/:itemId - Update an ingredient in a recipe ---
router.put('/:menuItemId/ingredients/:itemId', async (req, res, next) => {
    const { menuItemId, itemId } = req.params;
    const { quantityrequired, unitid } = req.body; // Only quantity and unit can be updated here

    // --- Validation ---
    if (isNaN(parseInt(menuItemId, 10)) || isNaN(parseInt(itemId, 10))) {
        return res.status(400).json({ error: 'Invalid menu item ID or item ID provided.' });
    }
     if (quantityrequired === undefined || unitid === undefined) {
        return res.status(400).json({ error: 'Missing required fields: quantityrequired, unitid.' });
    }
     if (isNaN(parseInt(unitid, 10))) {
        return res.status(400).json({ error: 'Invalid unitid. Must be a number.' });
    }
    const quantity = parseFloat(quantityrequired);
    if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid quantityrequired. Must be a positive number.' });
    }
    // --- End Validation ---

    try {
        const queryText = `
            UPDATE RECIPE_INGREDIENT
            SET QuantityRequired = $1, UnitID = $2
            WHERE MenuItemID = $3 AND ItemID = $4
            RETURNING *;
        `;
        const values = [quantity, parseInt(unitid, 10), parseInt(menuItemId, 10), parseInt(itemId, 10)];
        const { rows } = await db.query(queryText, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Recipe ingredient not found for this menu item.' });
        }

         // Fetch the updated ingredient with joined names for a richer response
        const updatedIngredientResult = await db.query(`
            SELECT ri.*, i.ItemName, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation
            FROM RECIPE_INGREDIENT ri
            JOIN INVENTORY_ITEM i ON ri.ItemID = i.ItemID
            JOIN UNIT_OF_MEASURE u ON ri.UnitID = u.UnitID
            WHERE ri.MenuItemID = $1 AND ri.ItemID = $2
        `, [rows[0].menuitemid, rows[0].itemid]);

        res.status(200).json(updatedIngredientResult.rows[0]);

    } catch (err) {
        console.error(`Error updating ingredient ${itemId} for menu item ${menuItemId}:`, err);
         if (err.code === '23503') { // Foreign key violation (unit doesn't exist)
            return res.status(400).json({ error: 'Invalid UnitID provided. Referenced unit does not exist.' });
        }
        next(err);
    }
});

// --- DELETE /api/menu-items/:menuItemId/ingredients/:itemId - Remove an ingredient from a recipe ---
router.delete('/:menuItemId/ingredients/:itemId', async (req, res, next) => {
    const { menuItemId, itemId } = req.params;

    // --- Validation ---
    if (isNaN(parseInt(menuItemId, 10)) || isNaN(parseInt(itemId, 10))) {
        return res.status(400).json({ error: 'Invalid menu item ID or item ID provided.' });
    }
    // --- End Validation ---

    try {
        const queryText = `
            DELETE FROM RECIPE_INGREDIENT
            WHERE MenuItemID = $1 AND ItemID = $2
            RETURNING *;
        `;
        const values = [parseInt(menuItemId, 10), parseInt(itemId, 10)];
        const { rows } = await db.query(queryText, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Recipe ingredient not found for this menu item.' });
        }
        res.status(204).send(); // Success, no content

    } catch (err) {
        console.error(`Error deleting ingredient ${itemId} for menu item ${menuItemId}:`, err);
        // No FK errors expected here unless DB schema changes
        next(err);
    }
});


module.exports = router;