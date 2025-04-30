const express = require('express');
const db = require('../config/db'); // Import db object with pool

const router = express.Router();

// --- GET /api/deliveries - Retrieve all deliveries ---
// Joins with supplier and includes delivery items
router.get('/', async (req, res, next) => {
    try {
        const deliveriesQuery = `
            SELECT
                d.DeliveryID, d.DeliveryDate, d.InvoiceNumber,
                s.SupplierID, s.SupplierName
            FROM DELIVERY d
            LEFT JOIN SUPPLIER s ON d.SupplierID = s.SupplierID
            ORDER BY d.DeliveryDate DESC, d.DeliveryID DESC;
        `;
        const deliveriesResult = await db.query(deliveriesQuery);

        // For each delivery, fetch its items
        const deliveries = deliveriesResult.rows;
        for (let delivery of deliveries) {
            const itemsQuery = `
                SELECT
                    di.ItemID, di.QuantityReceived, di.ExpirationDate, di.CostPerUnit,
                    i.ItemName,
                    u.UnitID, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation
                FROM DELIVERY_ITEM di
                JOIN INVENTORY_ITEM i ON di.ItemID = i.ItemID
                JOIN UNIT_OF_MEASURE u ON di.UnitID = u.UnitID
                WHERE di.DeliveryID = $1
                ORDER BY i.ItemName;
            `;
            const itemsResult = await db.query(itemsQuery, [delivery.deliveryid]); // Use lowercase from result
            delivery.items = itemsResult.rows; // Add items array to each delivery object
        }

        res.status(200).json(deliveries);
    } catch (err) {
        console.error('Error fetching deliveries:', err);
        next(err);
    }
});

// --- GET /api/deliveries/:id - Retrieve a single delivery by ID ---
router.get('/:id', async (req, res, next) => {
    const { id } = req.params;
    if (isNaN(parseInt(id, 10))) {
        return res.status(400).json({ error: 'Invalid delivery ID provided.' });
    }

    try {
        const deliveryQuery = `
            SELECT
                d.DeliveryID, d.DeliveryDate, d.InvoiceNumber,
                s.SupplierID, s.SupplierName
            FROM DELIVERY d
            LEFT JOIN SUPPLIER s ON d.SupplierID = s.SupplierID
            WHERE d.DeliveryID = $1;
        `;
        const deliveryResult = await db.query(deliveryQuery, [id]);

        if (deliveryResult.rows.length === 0) {
            return res.status(404).json({ message: 'Delivery not found' });
        }
        const delivery = deliveryResult.rows[0];

        // Fetch its items
        const itemsQuery = `
            SELECT
                di.ItemID, di.QuantityReceived, di.ExpirationDate, di.CostPerUnit,
                i.ItemName,
                u.UnitID, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation
            FROM DELIVERY_ITEM di
            JOIN INVENTORY_ITEM i ON di.ItemID = i.ItemID
            JOIN UNIT_OF_MEASURE u ON di.UnitID = u.UnitID
            WHERE di.DeliveryID = $1
            ORDER BY i.ItemName;
        `;
        const itemsResult = await db.query(itemsQuery, [id]);
        delivery.items = itemsResult.rows; // Add items array

        res.status(200).json(delivery);
    } catch (err) {
        console.error(`Error fetching delivery ${id}:`, err);
        next(err);
    }
});


// --- POST /api/deliveries - Record a new delivery and update stock ---
router.post('/', async (req, res, next) => {
    const { supplierid, deliverydate, invoicenumber, items } = req.body;

    // --- Validation ---
    if (!deliverydate || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields: deliverydate and at least one item in items array.' });
    }
    if (supplierid && isNaN(parseInt(supplierid, 10))) {
         return res.status(400).json({ error: 'Invalid supplierid. Must be a number or null/empty.' });
    }
    // Validate date format (basic check, consider using a library like date-fns for robust parsing)
    if (isNaN(Date.parse(deliverydate))) {
         return res.status(400).json({ error: 'Invalid deliverydate format. Use YYYY-MM-DD or compatible.' });
    }

    // Validate each item in the items array
    for (const item of items) {
        if (!item.itemid || !item.quantityreceived || !item.unitid) {
            return res.status(400).json({ error: 'Each item requires itemid, quantityreceived, and unitid.' });
        }
        if (isNaN(parseInt(item.itemid, 10)) || isNaN(parseInt(item.unitid, 10))) {
            return res.status(400).json({ error: 'Invalid itemid or unitid in items array.' });
        }
        const qty = parseFloat(item.quantityreceived);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: `Invalid quantityreceived (${item.quantityreceived}) for item ${item.itemid}. Must be a positive number.` });
        }
        if (item.costperunit && (isNaN(parseFloat(item.costperunit)) || parseFloat(item.costperunit) < 0)) {
             return res.status(400).json({ error: `Invalid costperunit for item ${item.itemid}. Must be a non-negative number.` });
        }
         if (item.expirationdate && isNaN(Date.parse(item.expirationdate))) {
             return res.status(400).json({ error: `Invalid expirationdate format for item ${item.itemid}. Use YYYY-MM-DD or compatible.` });
        }
    }
    // --- End Validation ---

    // Acquire a client from the pool for transaction
    const client = await db.pool.connect();

    try {
        // Start transaction
        await client.query('BEGIN');

        // 1. Insert into DELIVERY table
        const deliveryInsertQuery = `
            INSERT INTO DELIVERY (SupplierID, DeliveryDate, InvoiceNumber)
            VALUES ($1, $2, $3)
            RETURNING DeliveryID;
        `;
        const deliveryValues = [
            supplierid ? parseInt(supplierid, 10) : null,
            deliverydate,
            invoicenumber || null
        ];
        const deliveryResult = await client.query(deliveryInsertQuery, deliveryValues);
        const newDeliveryId = deliveryResult.rows[0].deliveryid; // Use lowercase column name

        // 2. Insert into DELIVERY_ITEM and Update INVENTORY_ITEM for each item
        for (const item of items) {
            const itemId = parseInt(item.itemid, 10);
            const unitId = parseInt(item.unitid, 10);
            const quantityReceived = parseFloat(item.quantityreceived);
            const costPerUnit = item.costperunit ? parseFloat(item.costperunit) : null;
            const expirationDate = item.expirationdate || null;

            // Insert into DELIVERY_ITEM
            const deliveryItemInsertQuery = `
                INSERT INTO DELIVERY_ITEM (DeliveryID, ItemID, QuantityReceived, UnitID, ExpirationDate, CostPerUnit)
                VALUES ($1, $2, $3, $4, $5, $6);
            `;
            await client.query(deliveryItemInsertQuery, [
                newDeliveryId, itemId, quantityReceived, unitId, expirationDate, costPerUnit
            ]);

            // Update INVENTORY_ITEM quantity
            // TODO: Implement unit conversion if di.UnitID != i.UnitID
            // For POC, assume units match or conversion is handled elsewhere/not needed.
            const inventoryUpdateQuery = `
                UPDATE INVENTORY_ITEM
                SET QuantityOnHand = QuantityOnHand + $1
                WHERE ItemID = $2;
            `;
            const updateResult = await client.query(inventoryUpdateQuery, [quantityReceived, itemId]);

             // Check if the inventory item existed and was updated
            if (updateResult.rowCount === 0) {
                throw new Error(`Inventory item with ID ${itemId} not found during stock update.`);
            }
        }

        // Commit transaction
        await client.query('COMMIT');

        // Fetch the newly created delivery with its items for the response
        const finalDeliveryQuery = `
            SELECT d.*, s.SupplierName
            FROM DELIVERY d LEFT JOIN SUPPLIER s ON d.SupplierID = s.SupplierID
            WHERE d.DeliveryID = $1;
        `;
        const finalDeliveryResult = await db.query(finalDeliveryQuery, [newDeliveryId]); // Use db.query, not client
        const finalDelivery = finalDeliveryResult.rows[0];

        const finalItemsQuery = `
            SELECT di.*, i.ItemName, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation
            FROM DELIVERY_ITEM di
            JOIN INVENTORY_ITEM i ON di.ItemID = i.ItemID
            JOIN UNIT_OF_MEASURE u ON di.UnitID = u.UnitID
            WHERE di.DeliveryID = $1 ORDER BY i.ItemName;
        `;
        const finalItemsResult = await db.query(finalItemsQuery, [newDeliveryId]); // Use db.query, not client
        finalDelivery.items = finalItemsResult.rows;


        res.status(201).json(finalDelivery); // Send back the complete delivery record

    } catch (err) {
        // Rollback transaction in case of error
        await client.query('ROLLBACK');
        console.error('Error recording delivery (Transaction rolled back):', err);
         if (err.code === '23503') { // Handle FK violation (supplier, item, or unit doesn't exist)
            return res.status(400).json({ error: 'Invalid SupplierID, ItemID, or UnitID provided. Referenced record does not exist.', details: err.message });
        }
        // Handle specific error thrown if inventory item not found during update
        if (err.message.includes('Inventory item with ID')) {
             return res.status(400).json({ error: err.message });
        }
        next(err); // Pass to global error handler
    } finally {
        // Release the client back to the pool ALWAYS
        client.release();
    }
});


module.exports = router;