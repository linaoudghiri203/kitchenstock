const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/low-stock', async (req, res, next) => {
    try {
        const queryText = `SELECT * FROM vw_low_stock_report ORDER BY itemname;`;
        const { rows } = await db.query(queryText);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error generating low stock report from view:', err);
        next(err);
    }
});

router.get('/expirations', async (req, res, next) => {
    const daysUntilExpiration = parseInt(req.query.days || '7', 10);
    const includePastDue = req.query.includePastDue !== 'false';

    if (isNaN(daysUntilExpiration) || daysUntilExpiration < 0) {
        return res.status(400).json({ error: 'Invalid days parameter. Must be a non-negative number.' });
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysUntilExpiration);
    const targetDateString = targetDate.toISOString().split('T')[0];

    try {
        let queryText = `SELECT * FROM vw_expiration_report`;
        const conditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (includePastDue) {
            conditions.push(`expirationdate <= $${paramIndex++}`);
            queryParams.push(targetDateString);
        } else {
            conditions.push(`expirationdate <= $${paramIndex++} AND expirationdate >= CURRENT_DATE`);
            queryParams.push(targetDateString);
        }

        if (conditions.length > 0) {
            queryText += ' WHERE ' + conditions.join(' AND ');
        }
        queryText += ' ORDER BY expirationdate ASC, itemname ASC;';

        const { rows } = await db.query(queryText, queryParams);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error generating expiration report from view:', err);
        next(err);
    }
});


router.get('/waste', async (req, res, next) => {
    const { itemid, startdate, enddate } = req.query;

    let queryText = `SELECT * FROM vw_waste_report`;
    const conditions = [];
    const queryParams = [];
    let paramIndex = 1;

     if (itemid && !isNaN(parseInt(itemid, 10))) {
        conditions.push(`itemid = $${paramIndex++}`);
        queryParams.push(parseInt(itemid, 10));
    }
     if (startdate && !isNaN(Date.parse(startdate))) {
        conditions.push(`wastedate >= $${paramIndex++}`);
        queryParams.push(startdate);
    }
     if (enddate && !isNaN(Date.parse(enddate))) {
        conditions.push(`wastedate <= $${paramIndex++}`);
        queryParams.push(enddate);
    }

     if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY wastedate DESC, wasteid DESC';

     try {
        const { rows } = await db.query(queryText, queryParams);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error fetching waste records from view:', err);
        next(err);
    }
});


module.exports = router;