const express = require('express');
const db = require('../config/db'); // Import db object with pool

const router = express.Router();

// --- POST /api/usage/manual - Record manual usage ---
router.post('/manual', async (req, res, next) => {
    const { itemid, quantityused, unitid, usagedate } = req.body;

    // --- Validation ---
    if (!itemid || quantityused === undefined || !unitid) {
        return res.status(400).json({ error: 'Missing required fields: itemid, quantityused, unitid.' });
    }
    if (isNaN(parseInt(itemid, 10)) || isNaN(parseInt(unitid, 10))) {
        return res.status(400).json({ error: 'Invalid itemid or unitid. Must be numbers.' });
    }
    const quantity = parseFloat(quantityused);
    if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid quantityused. Must be a positive number.' });
    }
    let usageTimestamp = new Date(); // Default to now
    if (usagedate && !isNaN(Date.parse(usagedate))) {
        usageTimestamp = new Date(usagedate);
    } else if (usagedate) {
        return res.status(400).json({ error: 'Invalid usagedate format. Use ISO 8601 or compatible.' });
    }
    // --- End Validation ---

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check current stock and attempt to decrease quantity
        // TODO: Implement unit conversion if usage unitid != item's base unitid
        const updateStockQuery = `
            UPDATE INVENTORY_ITEM
            SET QuantityOnHand = QuantityOnHand - $1
            WHERE ItemID = $2 AND QuantityOnHand >= $1 -- Check for sufficient stock
            RETURNING ItemID, ItemName, QuantityOnHand; -- Return updated quantity
        `;
        const stockUpdateResult = await client.query(updateStockQuery, [quantity, itemid]);

        // Check if update was successful (sufficient stock and item exists)
        if (stockUpdateResult.rowCount === 0) {
            // Check if item exists at all
            const itemCheck = await client.query('SELECT QuantityOnHand FROM INVENTORY_ITEM WHERE ItemID = $1', [itemid]);
            if (itemCheck.rowCount === 0) {
                throw new Error(`Inventory item with ID ${itemid} not found.`);
            } else {
                // Item exists but insufficient stock
                throw new Error(`Insufficient stock for item ID ${itemid}. Available: ${itemCheck.rows[0].quantityonhand}, Required: ${quantity}.`);
            }
        }

        // 2. Insert into USAGE_RECORD
        const usageInsertQuery = `
            INSERT INTO USAGE_RECORD (ItemID, QuantityUsed, UnitID, UsageDate, UsageType)
            VALUES ($1, $2, $3, $4, 'manual')
            RETURNING *;
        `;
        const usageResult = await client.query(usageInsertQuery, [itemid, quantity, unitid, usageTimestamp]);

        await client.query('COMMIT');
        res.status(201).json({
            usageRecord: usageResult.rows[0],
            updatedItem: stockUpdateResult.rows[0] // Show remaining stock
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error recording manual usage (Transaction rolled back):', err);
        if (err.message.includes('Insufficient stock') || err.message.includes('not found')) {
            return res.status(400).json({ error: err.message });
        }
         if (err.code === '23503') { // FK violation
            return res.status(400).json({ error: 'Invalid ItemID or UnitID provided.' });
        }
        next(err);
    } finally {
        client.release();
    }
});


// --- POST /api/usage/sale/:menuItemId - Record usage based on menu item sale ---
router.post('/sale/:menuItemId', async (req, res, next) => {
    const { menuItemId } = req.params;
    const { quantitySold = 1, usageDate } = req.body; // Default to selling 1 unit

    // --- Validation ---
    if (isNaN(parseInt(menuItemId, 10))) {
        return res.status(400).json({ error: 'Invalid menu item ID provided.' });
    }
    const qtySold = parseInt(quantitySold, 10);
     if (isNaN(qtySold) || qtySold <= 0) {
        return res.status(400).json({ error: 'Invalid quantitySold. Must be a positive integer.' });
    }
    let usageTimestamp = new Date(); // Default to now
    if (usageDate && !isNaN(Date.parse(usageDate))) {
        usageTimestamp = new Date(usageDate);
    } else if (usageDate) {
        return res.status(400).json({ error: 'Invalid usageDate format. Use ISO 8601 or compatible.' });
    }
    // --- End Validation ---

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get menu item name and recipe ingredients
        const recipeQuery = `
            SELECT ri.ItemID, ri.QuantityRequired, ri.UnitID, mi.MenuItemName
            FROM RECIPE_INGREDIENT ri
            JOIN MENU_ITEM mi ON ri.MenuItemID = mi.MenuItemID
            WHERE ri.MenuItemID = $1;
        `;
        const recipeResult = await client.query(recipeQuery, [menuItemId]);

        if (recipeResult.rows.length === 0) {
            // Check if menu item exists but has no ingredients, or doesn't exist at all
             const menuCheck = await client.query('SELECT 1 FROM MENU_ITEM WHERE MenuItemID = $1', [menuItemId]);
             if(menuCheck.rows.length === 0) {
                 throw new Error(`Menu item with ID ${menuItemId} not found.`);
             } else {
                 // Menu item exists but has no ingredients - technically not an error for stock,
                 // but maybe log a warning or handle as appropriate. For now, proceed.
                 console.warn(`Menu item ID ${menuItemId} sold, but has no ingredients defined.`);
                 // We still need the name for the usage record
                 const nameRes = await client.query('SELECT MenuItemName FROM MENU_ITEM WHERE MenuItemID = $1', [menuItemId]);
                 const menuItemName = nameRes.rows[0]?.menuitemname || `Menu Item ${menuItemId}`;

                 // Create a single usage record for the sale event itself, even without ingredients
                 const usageInsertQuery = `
                    INSERT INTO USAGE_RECORD (ItemID, QuantityUsed, UnitID, UsageDate, UsageType, MenuItemID)
                    VALUES (NULL, $1, NULL, $2, 'sale', $3) -- No specific item/unit if no ingredients
                    RETURNING *;
                 `;
                 const usageResult = await client.query(usageInsertQuery, [qtySold, usageTimestamp, menuItemId]);
                 await client.query('COMMIT');
                 return res.status(201).json({
                     message: `Sale of ${qtySold} x ${menuItemName} recorded (no ingredients deducted).`,
                     usageRecord: usageResult.rows[0],
                     deductedItems: []
                 });
             }
        }

        const ingredients = recipeResult.rows;
        const menuItemName = ingredients[0].menuitemname; // Get name from first ingredient row
        const deductedItemsInfo = [];

        // 2. Deduct each ingredient from stock
        for (const ingredient of ingredients) {
            const itemId = ingredient.itemid;
            const quantityRequiredPerUnit = parseFloat(ingredient.quantityrequired);
            const totalQuantityToDeduct = quantityRequiredPerUnit * qtySold;
            const unitId = ingredient.unitid;

            // TODO: Implement unit conversion if ingredient unitid != item's base unitid

            const updateStockQuery = `
                UPDATE INVENTORY_ITEM
                SET QuantityOnHand = QuantityOnHand - $1
                WHERE ItemID = $2 AND QuantityOnHand >= $1 -- Check stock
                RETURNING ItemID, ItemName, QuantityOnHand;
            `;
            const stockUpdateResult = await client.query(updateStockQuery, [totalQuantityToDeduct, itemId]);

            if (stockUpdateResult.rowCount === 0) {
                const itemCheck = await client.query('SELECT ItemName, QuantityOnHand FROM INVENTORY_ITEM WHERE ItemID = $1', [itemId]);
                const itemName = itemCheck.rows[0]?.itemname || `Item ID ${itemId}`;
                const availableQty = itemCheck.rows[0]?.quantityonhand || 0;
                throw new Error(`Insufficient stock for ingredient ${itemName} (ID: ${itemId}). Required: ${totalQuantityToDeduct}, Available: ${availableQty}. Sale cannot be completed.`);
            }
            deductedItemsInfo.push(stockUpdateResult.rows[0]); // Store info about deducted item

            // 3. Insert into USAGE_RECORD for each ingredient deduction (optional, could log once per sale)
            // For detailed tracking, log each ingredient separately.
             const usageInsertQuery = `
                INSERT INTO USAGE_RECORD (ItemID, QuantityUsed, UnitID, UsageDate, UsageType, MenuItemID)
                VALUES ($1, $2, $3, $4, 'sale', $5)
                RETURNING UsageID; -- Only need ID maybe
            `;
             await client.query(usageInsertQuery, [itemId, totalQuantityToDeduct, unitId, usageTimestamp, menuItemId]);
        }

        await client.query('COMMIT');
        res.status(201).json({
            message: `Sale of ${qtySold} x ${menuItemName} recorded successfully. Stock updated.`,
            deductedItems: deductedItemsInfo
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error recording sale for menu item ${menuItemId} (Transaction rolled back):`, err);
        if (err.message.includes('Insufficient stock') || err.message.includes('not found')) {
            return res.status(400).json({ error: err.message });
        }
         if (err.code === '23503') { // FK violation
            return res.status(400).json({ error: 'Invalid ItemID or UnitID in recipe.' });
        }
        next(err);
    } finally {
        client.release();
    }
});

// --- POST /api/waste - Record wasted items ---
router.post('/waste', async (req, res, next) => {
    const { itemid, quantitywasted, unitid, wastedate, reason } = req.body;

     // --- Validation ---
    if (!itemid || quantitywasted === undefined || !unitid) {
        return res.status(400).json({ error: 'Missing required fields: itemid, quantitywasted, unitid.' });
    }
    if (isNaN(parseInt(itemid, 10)) || isNaN(parseInt(unitid, 10))) {
        return res.status(400).json({ error: 'Invalid itemid or unitid. Must be numbers.' });
    }
    const quantity = parseFloat(quantitywasted);
    if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid quantitywasted. Must be a positive number.' });
    }
    let wasteDateParsed = new Date(); // Default to now if not provided
    if (wastedate && !isNaN(Date.parse(wastedate))) {
        // Assuming wastedate is just a date 'YYYY-MM-DD', keep it as date only for DB
         wasteDateParsed = wastedate;
    } else if (wastedate) {
         return res.status(400).json({ error: 'Invalid wastedate format. Use YYYY-MM-DD or compatible.' });
    }
    // --- End Validation ---


    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check stock and decrease quantity
        // TODO: Implement unit conversion if waste unitid != item's base unitid
        const updateStockQuery = `
            UPDATE INVENTORY_ITEM
            SET QuantityOnHand = QuantityOnHand - $1
            WHERE ItemID = $2 AND QuantityOnHand >= $1 -- Check stock
            RETURNING ItemID, ItemName, QuantityOnHand;
        `;
        const stockUpdateResult = await client.query(updateStockQuery, [quantity, itemid]);

        if (stockUpdateResult.rowCount === 0) {
            const itemCheck = await client.query('SELECT QuantityOnHand FROM INVENTORY_ITEM WHERE ItemID = $1', [itemid]);
            if (itemCheck.rowCount === 0) {
                throw new Error(`Inventory item with ID ${itemid} not found.`);
            } else {
                throw new Error(`Insufficient stock to record waste for item ID ${itemid}. Available: ${itemCheck.rows[0].quantityonhand}, Wasted: ${quantity}.`);
            }
        }

        // 2. Insert into WASTE_RECORD
        const wasteInsertQuery = `
            INSERT INTO WASTE_RECORD (ItemID, QuantityWasted, UnitID, WasteDate, Reason)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const wasteResult = await client.query(wasteInsertQuery, [itemid, quantity, unitid, wasteDateParsed, reason || null]);

        await client.query('COMMIT');
        res.status(201).json({
            wasteRecord: wasteResult.rows[0],
            updatedItem: stockUpdateResult.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error recording waste (Transaction rolled back):', err);
         if (err.message.includes('Insufficient stock') || err.message.includes('not found')) {
            return res.status(400).json({ error: err.message });
        }
         if (err.code === '23503') { // FK violation
            return res.status(400).json({ error: 'Invalid ItemID or UnitID provided.' });
        }
        next(err);
    } finally {
        client.release();
    }
});

// --- GET /api/usage - Retrieve usage records (optional filtering) ---
router.get('/', async (req, res, next) => {
    // Example: /api/usage?type=sale&startDate=2025-01-01&endDate=2025-04-30
    const { type, itemid, menuitemid, startdate, enddate } = req.query;

    let queryText = `
        SELECT
            ur.UsageID, ur.UsageDate, ur.UsageType, ur.QuantityUsed,
            ur.ItemID, i.ItemName,
            ur.UnitID, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation,
            ur.MenuItemID, mi.MenuItemName
        FROM USAGE_RECORD ur
        LEFT JOIN INVENTORY_ITEM i ON ur.ItemID = i.ItemID
        LEFT JOIN UNIT_OF_MEASURE u ON ur.UnitID = u.UnitID
        LEFT JOIN MENU_ITEM mi ON ur.MenuItemID = mi.MenuItemID
    `;
    const conditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (type && ['manual', 'sale', 'waste'].includes(type)) {
        conditions.push(`ur.UsageType = $${paramIndex++}`);
        queryParams.push(type);
    }
     if (itemid && !isNaN(parseInt(itemid, 10))) {
        conditions.push(`ur.ItemID = $${paramIndex++}`);
        queryParams.push(parseInt(itemid, 10));
    }
     if (menuitemid && !isNaN(parseInt(menuitemid, 10))) {
        conditions.push(`ur.MenuItemID = $${paramIndex++}`);
        queryParams.push(parseInt(menuitemid, 10));
    }
    if (startdate && !isNaN(Date.parse(startdate))) {
        conditions.push(`ur.UsageDate >= $${paramIndex++}`);
        queryParams.push(startdate);
    }
     if (enddate && !isNaN(Date.parse(enddate))) {
        // Adjust end date to include the whole day if needed (e.g., add ' 23:59:59')
        conditions.push(`ur.UsageDate <= $${paramIndex++}`);
        queryParams.push(enddate);
    }


    if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY ur.UsageDate DESC, ur.UsageID DESC';

    try {
        const { rows } = await db.query(queryText, queryParams);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error fetching usage records:', err);
        next(err);
    }
});


module.exports = router;