const express = require('express');
const db = require('../config/db');
const router = express.Router();
router.post('/manual', async (req, res, next) => {
    const { itemid, quantityused, unitid, usagedate } = req.body;
    if (!itemid || quantityused === undefined || !unitid) {
        return res.status(400).json({ error: 'Missing required fields: itemid, quantityused, unitid.' });
    }
    const qty = parseFloat(quantityused);
    if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Invalid quantityused. Must be a positive number.' });
    }
    try {
        const spQueryParams = [
            parseInt(itemid, 10),
            qty,
            parseInt(unitid, 10),
            usagedate ? new Date(usagedate) : new Date()
        ];
        const { rows } = await db.query('SELECT * FROM sp_record_manual_usage($1, $2, $3, $4)', spQueryParams);
        if (rows.length === 0) {
            throw new Error('Failed to record manual usage, no data returned from stored procedure.');
        }
        const result = rows[0];
        res.status(201).json({
            usageRecord: {
                usageid: result.created_usage_id,
                itemid: result.used_item_id,
                quantityused: result.recorded_quantity_used,
                unitid: result.recorded_unit_id,
                usagedate: result.recorded_usage_date,
                usagetype: result.recorded_usage_type
            },
            updatedItem: {
                itemid: result.used_item_id,
                itemname: result.wasted_item_name,
                quantityonhand: result.item_remaining_quantity
            }
        });
    } catch (err) {
        console.error('Error calling sp_record_manual_usage:', err);
        if (err.code === 'P0001' || (err.message && (err.message.includes('Insufficient stock') || err.message.includes('not found') || err.message.includes('does not exist')))) {
            return res.status(400).json({ error: 'Failed to record manual usage.', details: err.message });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid ItemID or UnitID provided.' });
        }
        next(err);
    }
});
router.post('/sale/:menuItemId', async (req, res, next) => {
    const { menuItemId } = req.params;
    const { quantitySold = 1, usageDate } = req.body;
    if (isNaN(parseInt(menuItemId, 10))) {
        return res.status(400).json({ error: 'Invalid menu item ID provided.' });
    }
    const qtySold = parseInt(quantitySold, 10);
     if (isNaN(qtySold) || qtySold <= 0) {
        return res.status(400).json({ error: 'Invalid quantitySold. Must be a positive integer.' });
    }
    try {
        const spQueryParams = [
            parseInt(menuItemId, 10),
            qtySold,
            usageDate ? new Date(usageDate) : new Date()
        ];
        const { rows } = await db.query('SELECT sp_record_sale($1, $2, $3) AS sale_summary', spQueryParams);
        res.status(201).json({
            message: rows[0].sale_summary,
        });
    } catch (err) {
        console.error(`Error calling sp_record_sale for menu item ${menuItemId}:`, err);
        if (err.code === 'P0001' || (err.message && (err.message.includes('Insufficient stock') || err.message.includes('not found')))) {
            return res.status(400).json({ error: 'Failed to record sale.', details: err.message });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid Menu Item ID provided.' });
        }
        next(err);
    }
});
router.post('/', async (req, res, next) => {
    const { itemid, quantitywasted, unitid, wastedate, reason } = req.body;
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
    try {
        const spQueryParams = [
            parseInt(itemid, 10),
            quantity,
            parseInt(unitid, 10),
            wastedate ? new Date(wastedate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            reason || null
        ];
        const { rows } = await db.query('SELECT * FROM sp_record_waste($1, $2, $3, $4, $5)', spQueryParams);
        if (rows.length === 0) {
            throw new Error('Failed to record waste, no data returned from stored procedure.');
        }
        const result = rows[0];
        res.status(201).json({
            wasteRecord: {
                wasteid: result.created_waste_id,
                itemid: result.wasted_item_id,
                quantitywasted: result.recorded_quantity_wasted,
                unitid: result.recorded_unit_id,
                wastedate: result.recorded_waste_date,
                reason: result.recorded_reason
            },
            updatedItem: {
                itemid: result.wasted_item_id,
                itemname: result.wasted_item_name,
                quantityonhand: result.item_remaining_quantity
            }
        });
    } catch (err) {
        console.error('Error calling sp_record_waste:', err);
        if (err.code === 'P0001' || (err.message && (err.message.includes('Insufficient stock') || err.message.includes('not found') || err.message.includes('does not exist')))) {
            return res.status(400).json({ error: 'Failed to record waste.', details: err.message });
        }
         if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid ItemID or UnitID provided.' });
        }
        next(err);
    }
});
router.get('/', async (req, res, next) => {
    const { type, itemid, menuitemid, startdate, enddate } = req.query;
    let queryText = 'SELECT * FROM vw_usage_details';
    const conditions = [];
    const queryParams = [];
    let paramIndex = 1;
    if (type && ['manual', 'sale', 'waste'].includes(type)) {
        conditions.push(`usagetype = $${paramIndex++}`);
        queryParams.push(type);
    }
     if (itemid && !isNaN(parseInt(itemid, 10))) {
        conditions.push(`itemid = $${paramIndex++}`);
        queryParams.push(parseInt(itemid, 10));
    }
     if (menuitemid && !isNaN(parseInt(menuitemid, 10))) {
        conditions.push(`menuitemid = $${paramIndex++}`);
        queryParams.push(parseInt(menuitemid, 10));
    }
    if (startdate && !isNaN(Date.parse(startdate))) {
        conditions.push(`usagedate >= $${paramIndex++}`);
        queryParams.push(startdate);
    }
     if (enddate && !isNaN(Date.parse(enddate))) {
        conditions.push(`usagedate <= $${paramIndex++}`);
        queryParams.push(enddate);
    }
    if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY usagedate DESC, usageid DESC';
    try {
        const { rows } = await db.query(queryText, queryParams);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error fetching usage records from view:', err);
        next(err);
    }
});
module.exports = router;