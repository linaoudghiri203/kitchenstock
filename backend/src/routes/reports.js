const express = require('express');
const db = require('../config/db'); // Import db object

const router = express.Router();

// --- GET /api/reports/low-stock - Low Stock Report (FR6) ---
router.get('/low-stock', async (req, res, next) => {
    try {
        const queryText = `
            SELECT
                i.ItemID, i.ItemName, i.QuantityOnHand, i.ReorderPoint,
                u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation,
                c.CategoryName
            FROM INVENTORY_ITEM i
            JOIN UNIT_OF_MEASURE u ON i.UnitID = u.UnitID
            JOIN CATEGORY c ON i.CategoryID = c.CategoryID
            WHERE i.QuantityOnHand <= i.ReorderPoint AND i.ReorderPoint > 0 -- Only include items with a set reorder point > 0
            ORDER BY i.ItemName;
        `;
        const { rows } = await db.query(queryText);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error generating low stock report:', err);
        next(err);
    }
});

// --- GET /api/reports/expirations - Expiration Report (FR7) ---
// NOTE: This report checks the ExpirationDate stored in DELIVERY_ITEM.
// It does NOT guarantee that the specific batch is still in stock.
// A more accurate report would require batch tracking (e.g., FIFO/LIFO logic or a separate stock batch table).
router.get('/expirations', async (req, res, next) => {
    // Query parameters for date range (e.g., /api/reports/expirations?days=7)
    const daysUntilExpiration = parseInt(req.query.days || '7', 10); // Default to next 7 days
    const includePastDue = req.query.includePastDue !== 'false'; // Default to true

    if (isNaN(daysUntilExpiration) || daysUntilExpiration < 0) {
        return res.status(400).json({ error: 'Invalid days parameter. Must be a non-negative number.' });
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysUntilExpiration);
    const targetDateString = targetDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    try {
        let queryText = `
            SELECT
                di.DeliveryID, di.ItemID, di.ExpirationDate, di.QuantityReceived, di.CostPerUnit,
                i.ItemName,
                u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation,
                d.DeliveryDate,
                s.SupplierName
            FROM DELIVERY_ITEM di
            JOIN INVENTORY_ITEM i ON di.ItemID = i.ItemID
            JOIN UNIT_OF_MEASURE u ON di.UnitID = u.UnitID
            JOIN DELIVERY d ON di.DeliveryID = d.DeliveryID
            LEFT JOIN SUPPLIER s ON d.SupplierID = s.SupplierID
            WHERE di.ExpirationDate IS NOT NULL
        `;
        const queryParams = [];
        let paramIndex = 1;

        if (includePastDue) {
             // Items expiring within the timeframe OR already expired
            queryText += ` AND di.ExpirationDate <= $${paramIndex++}`;
            queryParams.push(targetDateString);
        } else {
            // Only items expiring within the timeframe but NOT yet expired
            queryText += ` AND di.ExpirationDate <= $${paramIndex++} AND di.ExpirationDate >= CURRENT_DATE`;
             queryParams.push(targetDateString);
        }


        queryText += ' ORDER BY di.ExpirationDate ASC, i.ItemName ASC;';

        const { rows } = await db.query(queryText, queryParams);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error generating expiration report:', err);
        next(err);
    }
});


// --- GET /api/reports/waste - Waste Report (FR9) ---
// Moved from usage.js
router.get('/waste', async (req, res, next) => {
     // Example: /api/reports/waste?startDate=2025-01-01&endDate=2025-04-30
    const { itemid, startdate, enddate } = req.query;

    let queryText = `
        SELECT
            wr.WasteID, wr.WasteDate, wr.QuantityWasted, wr.Reason,
            wr.ItemID, i.ItemName,
            wr.UnitID, u.Unit AS UnitName, u.Abbreviation AS UnitAbbreviation
        FROM WASTE_RECORD wr
        JOIN INVENTORY_ITEM i ON wr.ItemID = i.ItemID
        JOIN UNIT_OF_MEASURE u ON wr.UnitID = u.UnitID
    `;
     const conditions = [];
    const queryParams = [];
    let paramIndex = 1;

     if (itemid && !isNaN(parseInt(itemid, 10))) {
        conditions.push(`wr.ItemID = $${paramIndex++}`);
        queryParams.push(parseInt(itemid, 10));
    }
     if (startdate && !isNaN(Date.parse(startdate))) {
        conditions.push(`wr.WasteDate >= $${paramIndex++}`);
        queryParams.push(startdate);
    }
     if (enddate && !isNaN(Date.parse(enddate))) {
        conditions.push(`wr.WasteDate <= $${paramIndex++}`);
        queryParams.push(enddate);
    }

     if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY wr.WasteDate DESC, wr.WasteID DESC';

     try {
        const { rows } = await db.query(queryText, queryParams);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error fetching waste records:', err);
        next(err);
    }

});


module.exports = router;