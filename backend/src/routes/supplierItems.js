
const express = require('express');
const db = require('../config/db');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
    const { supplierId } = req.params;
    if (isNaN(parseInt(supplierId, 10))) {
        return res.status(400).json({ error: 'Invalid Supplier ID provided.' });
    }

    try {
        const queryText = `
            SELECT
                si.ItemID,
                si.SupplierItemCost,
                si.CreatedAt AS supplier_item_created_at,
                i.ItemName,
                i.Description AS item_description,
                i.ItemType,
                uom.Unit AS unit_name,
                uom.Abbreviation AS unit_abbreviation
            FROM SUPPLIER_ITEM si
            JOIN INVENTORY_ITEM i ON si.ItemID = i.ItemID
            JOIN UNIT_OF_MEASURE uom ON i.UnitID = uom.UnitID
            WHERE si.SupplierID = $1
            ORDER BY i.ItemName ASC;
        `;
        const { rows } = await db.query(queryText, [supplierId]);
        res.status(200).json(rows);
    } catch (err) {
        console.error(`Error fetching items for supplier ${supplierId}:`, err);
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    const { supplierId } = req.params;
    const { itemid, supplieritemcost } = req.body;

    if (isNaN(parseInt(supplierId, 10))) {
        return res.status(400).json({ error: 'Invalid Supplier ID provided.' });
    }
    if (!itemid || supplieritemcost === undefined) {
        return res.status(400).json({ error: 'Missing required fields: itemid and supplieritemcost.' });
    }
    if (isNaN(parseInt(itemid, 10))) {
        return res.status(400).json({ error: 'Invalid Item ID. Must be a number.' });
    }
    const cost = parseFloat(supplieritemcost);
    if (isNaN(cost) || cost < 0) {
        return res.status(400).json({ error: 'Invalid Supplier Item Cost. Must be a non-negative number.' });
    }

    try {
        const supplierCheck = await db.query('SELECT 1 FROM SUPPLIER WHERE SupplierID = $1', [supplierId]);
        if (supplierCheck.rowCount === 0) {
            return res.status(404).json({ error: `Supplier with ID ${supplierId} not found.` });
        }
        const itemCheck = await db.query('SELECT 1 FROM INVENTORY_ITEM WHERE ItemID = $1', [itemid]);
        if (itemCheck.rowCount === 0) {
            return res.status(404).json({ error: `Inventory Item with ID ${itemid} not found.` });
        }

        const queryText = `
            INSERT INTO SUPPLIER_ITEM (SupplierID, ItemID, SupplierItemCost)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [supplierId, itemid, cost];
        const { rows } = await db.query(queryText, values);

        const newSupplierItemDetails = await db.query(`
            SELECT
                si.ItemID, si.SupplierItemCost, si.CreatedAt AS supplier_item_created_at,
                i.ItemName, i.Description AS item_description, i.ItemType,
                uom.Unit AS unit_name, uom.Abbreviation AS unit_abbreviation
            FROM SUPPLIER_ITEM si
            JOIN INVENTORY_ITEM i ON si.ItemID = i.ItemID
            JOIN UNIT_OF_MEASURE uom ON i.UnitID = uom.UnitID
            WHERE si.SupplierID = $1 AND si.ItemID = $2;
        `, [rows[0].supplierid, rows[0].itemid]);

        res.status(201).json(newSupplierItemDetails.rows[0]);
    } catch (err) {
        console.error(`Error adding item ${itemid} to supplier ${supplierId}:`, err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'This item is already associated with this supplier. You can update the cost instead.' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid SupplierID or ItemID provided.' });
        }
        next(err);
    }
});

router.put('/:itemId', async (req, res, next) => {
    const { supplierId, itemId } = req.params;
    const { supplieritemcost } = req.body;

    if (isNaN(parseInt(supplierId, 10)) || isNaN(parseInt(itemId, 10))) {
        return res.status(400).json({ error: 'Invalid Supplier ID or Item ID provided.' });
    }
    if (supplieritemcost === undefined) {
        return res.status(400).json({ error: 'Missing required field: supplieritemcost.' });
    }
    const cost = parseFloat(supplieritemcost);
    if (isNaN(cost) || cost < 0) {
        return res.status(400).json({ error: 'Invalid Supplier Item Cost. Must be a non-negative number.' });
    }

    try {
        const queryText = `
            UPDATE SUPPLIER_ITEM
            SET SupplierItemCost = $1
            WHERE SupplierID = $2 AND ItemID = $3
            RETURNING *;
        `;
        const values = [cost, supplierId, itemId];
        const { rows } = await db.query(queryText, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Item not found for this supplier.' });
        }
        
        const updatedSupplierItemDetails = await db.query(`
            SELECT
                si.ItemID, si.SupplierItemCost, si.CreatedAt AS supplier_item_created_at,
                i.ItemName, i.Description AS item_description, i.ItemType,
                uom.Unit AS unit_name, uom.Abbreviation AS unit_abbreviation
            FROM SUPPLIER_ITEM si
            JOIN INVENTORY_ITEM i ON si.ItemID = i.ItemID
            JOIN UNIT_OF_MEASURE uom ON i.UnitID = uom.UnitID
            WHERE si.SupplierID = $1 AND si.ItemID = $2;
        `, [rows[0].supplierid, rows[0].itemid]);

        res.status(200).json(updatedSupplierItemDetails.rows[0]);
    } catch (err) {
        console.error(`Error updating cost for item ${itemId} from supplier ${supplierId}:`, err);
        next(err);
    }
});

router.delete('/:itemId', async (req, res, next) => {
    const { supplierId, itemId } = req.params;

    if (isNaN(parseInt(supplierId, 10)) || isNaN(parseInt(itemId, 10))) {
        return res.status(400).json({ error: 'Invalid Supplier ID or Item ID provided.' });
    }

    try {
        const queryText = `
            DELETE FROM SUPPLIER_ITEM
            WHERE SupplierID = $1 AND ItemID = $2
            RETURNING *;
        `;
        const { rows } = await db.query(queryText, [supplierId, itemId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Item not found for this supplier to delete.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error(`Error deleting item ${itemId} from supplier ${supplierId}:`, err);
        next(err);
    }
});

module.exports = router;