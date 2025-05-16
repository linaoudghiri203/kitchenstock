const express = require('express');
const db = require('../config/db');

const router = express.Router();


router.get('/', async (req, res, next) => {
  try {
    const queryText = 'SELECT * FROM vw_menu_item_header_details ORDER BY menuitemid ASC';
    const { rows } = await db.query(queryText);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching menu items from view:', err);
    next(err);
  }
});

router.get('/:menuItemId', async (req, res, next) => {
  const { menuItemId } = req.params;
  if (isNaN(parseInt(menuItemId, 10))) {
      return res.status(400).json({ error: 'Invalid menu item ID provided.' });
  }

  try {
    const queryText = 'SELECT * FROM vw_menu_item_header_details WHERE menuitemid = $1';
    const { rows } = await db.query(queryText, [menuItemId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error fetching menu item ${menuItemId} from view:`, err);
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { menuitemname, description, price } = req.body;

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
        numericPrice
    ];

    const { rows } = await db.query(queryText, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating menu item:', err);
    if (err.code === '23505' && err.constraint === 'menu_item_menuitemname_key') {
        return res.status(409).json({ error: 'Menu item name already exists.' });
    }
    next(err);
  }
});

router.put('/:menuItemId', async (req, res, next) => {
  const { menuItemId } = req.params;
  const { menuitemname, description, price } = req.body;

  if (isNaN(parseInt(menuItemId, 10))) {
      return res.status(400).json({ error: 'Invalid menu item ID provided.' });
  }
  if (!menuitemname) {
    return res.status(400).json({ error: 'Missing required field: menuitemname' });
  }
  let numericPrice;
  if (price !== undefined) {
      numericPrice = parseFloat(price);
      if (price !== null && (isNaN(numericPrice) || numericPrice < 0)) {
          return res.status(400).json({ error: 'Invalid price. Must be a non-negative number or null.' });
      }
  }

  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (menuitemname !== undefined) { fields.push(`MenuItemName = $${paramIndex++}`); values.push(menuitemname); }
    if (description !== undefined) { fields.push(`Description = $${paramIndex++}`); values.push(description); }
    if (price !== undefined) { fields.push(`Price = $${paramIndex++}`); values.push(numericPrice); }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }
    values.push(parseInt(menuItemId, 10));

    const queryText = `
      UPDATE MENU_ITEM
      SET ${fields.join(', ')}, LastUpdated = NOW()
      WHERE MenuItemID = $${paramIndex}
      RETURNING *;`;

    const { rows } = await db.query(queryText, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error updating menu item ${menuItemId}:`, err);
     if (err.code === '23505' && err.constraint === 'menu_item_menuitemname_key') {
        return res.status(409).json({ error: 'Updated menu item name conflicts with an existing one.' });
    }
    next(err);
  }
});

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
     res.status(204).send();

  } catch (err) {
    console.error(`Error deleting menu item ${menuItemId}:`, err);
    next(err);
  }
});



router.get('/:menuItemId/ingredients', async (req, res, next) => {
    const { menuItemId } = req.params;
    if (isNaN(parseInt(menuItemId, 10))) {
        return res.status(400).json({ error: 'Invalid menu item ID provided.' });
    }

    try {
        const menuCheck = await db.query('SELECT 1 FROM MENU_ITEM WHERE MenuItemID = $1', [menuItemId]);
        if (menuCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        const queryText = `
            SELECT * FROM vw_recipe_ingredients_details
            WHERE menuitemid = $1
            ORDER BY itemname;
        `;
        const { rows } = await db.query(queryText, [menuItemId]);
        const mappedRows = rows.map(row => ({
            menuitemid: row.menuitemid,
            itemid: row.itemid,
            quantityrequired: row.quantityrequired,
            unitid: row.recipe_ingredient_unitid,
            itemname: row.itemname,
            unitname: row.unit_name,
            unitabbreviation: row.unit_abbreviation
        }));
        res.status(200).json(mappedRows);
    } catch (err) {
        console.error(`Error fetching ingredients for menu item ${menuItemId}:`, err);
        next(err);
    }
});

router.post('/:menuItemId/ingredients', async (req, res, next) => {
    const { menuItemId } = req.params;
    const { itemid, quantityrequired, unitid } = req.body;

    if (isNaN(parseInt(menuItemId, 10))) {
        return res.status(400).json({ error: 'Invalid menu item ID provided.' });
    }
    if (!itemid || quantityrequired === undefined || !unitid) {
        return res.status(400).json({ error: 'Missing required fields: itemid, quantityrequired, unitid.' });
    }
    if (isNaN(parseInt(itemid, 10)) || isNaN(parseInt(unitid, 10))) {
        return res.status(400).json({ error: 'Invalid itemid or unitid. Must be numbers.' });
    }
    const quantity = parseFloat(quantityrequired);
    if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid quantityrequired. Must be a positive number.' });
    }

    try {
        const queryText = `
            INSERT INTO RECIPE_INGREDIENT (MenuItemID, ItemID, QuantityRequired, UnitID)
            VALUES ($1, $2, $3, $4)
            RETURNING MenuItemID, ItemID;
        `;
        const values = [parseInt(menuItemId, 10), parseInt(itemid, 10), quantity, parseInt(unitid, 10)];
        const insertResult = await db.query(queryText, values);
        const insertedPks = insertResult.rows[0];

        const newIngredientFromView = await db.query(
            'SELECT * FROM vw_recipe_ingredients_details WHERE menuitemid = $1 AND itemid = $2',
            [insertedPks.menuitemid, insertedPks.itemid]
        );
        const mappedNewIngredient = newIngredientFromView.rows.map(row => ({
            menuitemid: row.menuitemid,
            itemid: row.itemid,
            quantityrequired: row.quantityrequired,
            unitid: row.recipe_ingredient_unitid,
            itemname: row.itemname,
            unitname: row.unit_name,
            unitabbreviation: row.unit_abbreviation
        }))[0];
        res.status(201).json(mappedNewIngredient);
    } catch (err) {
        console.error(`Error adding ingredient to menu item ${menuItemId}:`, err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'This ingredient already exists in the recipe for this menu item.' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid MenuItemID, ItemID, or UnitID provided. Referenced record does not exist.' });
        }
        next(err);
    }
});

router.put('/:menuItemId/ingredients/:itemId', async (req, res, next) => {
    const { menuItemId, itemId } = req.params;
    const { quantityrequired, unitid } = req.body;

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

    try {
        const queryText = `
            UPDATE RECIPE_INGREDIENT
            SET QuantityRequired = $1, UnitID = $2
            WHERE MenuItemID = $3 AND ItemID = $4
            RETURNING MenuItemID, ItemID;
        `;
        const values = [quantity, parseInt(unitid, 10), parseInt(menuItemId, 10), parseInt(itemId, 10)];
        const updateResult = await db.query(queryText, values);

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ message: 'Recipe ingredient not found for this menu item.' });
        }
        const updatedPks = updateResult.rows[0];
        const updatedIngredientFromView = await db.query(
            'SELECT * FROM vw_recipe_ingredients_details WHERE menuitemid = $1 AND itemid = $2',
            [updatedPks.menuitemid, updatedPks.itemid]
        );
        const mappedUpdatedIngredient = updatedIngredientFromView.rows.map(row => ({
            menuitemid: row.menuitemid,
            itemid: row.itemid,
            quantityrequired: row.quantityrequired,
            unitid: row.recipe_ingredient_unitid,
            itemname: row.itemname,
            unitname: row.unit_name,
            unitabbreviation: row.unit_abbreviation
        }))[0];
        res.status(200).json(mappedUpdatedIngredient);
    } catch (err) {
        console.error(`Error updating ingredient ${itemId} for menu item ${menuItemId}:`, err);
         if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid UnitID provided. Referenced unit does not exist.' });
        }
        next(err);
    }
});

router.delete('/:menuItemId/ingredients/:itemId', async (req, res, next) => {
    const { menuItemId, itemId } = req.params;

    if (isNaN(parseInt(menuItemId, 10)) || isNaN(parseInt(itemId, 10))) {
        return res.status(400).json({ error: 'Invalid menu item ID or item ID provided.' });
    }

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
        res.status(204).send();
    } catch (err) {
        console.error(`Error deleting ingredient ${itemId} for menu item ${menuItemId}:`, err);
        next(err);
    }
});


module.exports = router;