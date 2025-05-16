const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const queryText = 'SELECT * FROM vw_delivery_details ORDER BY deliverydate DESC, deliveryid DESC, itemname ASC';
        const { rows } = await db.query(queryText);

        const deliveriesMap = new Map();
        rows.forEach(row => {
            const {
                deliveryid, deliverydate, invoicenumber, delivery_created_at,
                supplierid, suppliername,
                delivery_item_itemid, quantityreceived, delivery_item_expirationdate,
                delivery_item_costperunit, delivery_item_created_at, itemname,
                inventory_item_description, delivery_item_unitid,
                delivery_item_unit_name, delivery_item_unit_abbreviation,
                inventory_item_base_unit_name, inventory_item_base_unit_abbreviation
            } = row;

            if (!deliveriesMap.has(deliveryid)) {
                deliveriesMap.set(deliveryid, {
                    deliveryid,
                    deliverydate,
                    invoicenumber,
                    createdat: delivery_created_at,
                    supplierid,
                    suppliername,
                    items: []
                });
            }
            deliveriesMap.get(deliveryid).items.push({
                itemid: delivery_item_itemid,
                quantityreceived,
                expirationdate: delivery_item_expirationdate,
                costperunit: delivery_item_costperunit,
                createdat: delivery_item_created_at,
                itemname,
                inventory_item_description,
                unitid: delivery_item_unitid,
                unitname: delivery_item_unit_name,
                unitabbreviation: delivery_item_unit_abbreviation,
                inventory_item_base_unit_name,
                inventory_item_base_unit_abbreviation
            });
        });

        res.status(200).json(Array.from(deliveriesMap.values()));
    } catch (err) {
        console.error('Error fetching deliveries from view:', err);
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    const { id } = req.params;
    if (isNaN(parseInt(id, 10))) {
        return res.status(400).json({ error: 'Invalid delivery ID provided.' });
    }

    try {
        const queryText = 'SELECT * FROM vw_delivery_details WHERE deliveryid = $1 ORDER BY itemname ASC';
        const { rows } = await db.query(queryText, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        const deliveryHeader = {
            deliveryid: rows[0].deliveryid,
            deliverydate: rows[0].deliverydate,
            invoicenumber: rows[0].invoicenumber,
            createdat: rows[0].delivery_created_at,
            supplierid: rows[0].supplierid,
            suppliername: rows[0].suppliername,
            items: []
        };

        rows.forEach(row => {
            deliveryHeader.items.push({
                itemid: row.delivery_item_itemid,
                quantityreceived: row.quantityreceived,
                expirationdate: row.delivery_item_expirationdate,
                costperunit: row.delivery_item_costperunit,
                createdat: row.delivery_item_created_at,
                itemname: row.itemname,
                inventory_item_description: row.inventory_item_description,
                unitid: row.delivery_item_unitid,
                unitname: row.delivery_item_unit_name,
                unitabbreviation: row.delivery_item_unit_abbreviation,
                inventory_item_base_unit_name: row.inventory_item_base_unit_name,
                inventory_item_base_unit_abbreviation: row.inventory_item_base_unit_abbreviation
            });
        });

        res.status(200).json(deliveryHeader);
    } catch (err) {
        console.error(`Error fetching delivery ${id} from view:`, err);
        next(err);
    }
});


router.post('/', async (req, res, next) => {
    const { supplierid, deliverydate, invoicenumber, items } = req.body;

    if (!deliverydate || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields: deliverydate and at least one item in items array.' });
    }
    let parsedSupplierId = null;
    if (supplierid !== undefined && supplierid !== null && supplierid !== '') {
        parsedSupplierId = parseInt(supplierid, 10);
        if (isNaN(parsedSupplierId)) {
            return res.status(400).json({ error: 'Invalid supplierid. Must be a number or null/empty.' });
        }
    }
    if (isNaN(Date.parse(deliverydate))) {
         return res.status(400).json({ error: 'Invalid deliverydate format. Use YYYY-MM-DD or compatible.' });
    }
    for (const item of items) {
        if (!item.itemid || item.quantityreceived === undefined || !item.unitid) {
            return res.status(400).json({ error: `Item missing required fields (itemid, quantityreceived, unitid): ${JSON.stringify(item)}` });
        }
        if (isNaN(parseInt(item.itemid, 10)) || isNaN(parseInt(item.unitid, 10))) {
            return res.status(400).json({ error: `Invalid itemid or unitid in items array: ${JSON.stringify(item)}` });
        }
        const qty = parseFloat(item.quantityreceived);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: `Invalid quantityreceived (${item.quantityreceived}) for item ${item.itemid}. Must be a positive number.` });
        }
        if (item.costperunit && (isNaN(parseFloat(item.costperunit)) || parseFloat(item.costperunit) < 0)) {
             return res.status(400).json({ error: `Invalid costperunit for item ${item.itemid}. Must be a non-negative number.` });
        }
         if (item.expirationdate && item.expirationdate !== null && isNaN(Date.parse(item.expirationdate))) {
             return res.status(400).json({ error: `Invalid expirationdate format for item ${item.itemid}. Use YYYY-MM-DD or compatible.` });
        }
    }

    try {
        const spQueryParams = [
            parsedSupplierId,
            deliverydate,
            invoicenumber || null,
            JSON.stringify(items)
        ];
        const spResult = await db.query('SELECT * FROM sp_record_delivery($1, $2, $3, $4)', spQueryParams);

        const newDeliveryId = spResult.rows[0].new_delivery_id;

        const finalDeliveryResult = await db.query('SELECT * FROM vw_delivery_details WHERE deliveryid = $1 ORDER BY itemname ASC', [newDeliveryId]);

        const deliveryHeader = {
            deliveryid: finalDeliveryResult.rows[0].deliveryid,
            deliverydate: finalDeliveryResult.rows[0].deliverydate,
            invoicenumber: finalDeliveryResult.rows[0].invoicenumber,
            createdat: finalDeliveryResult.rows[0].delivery_created_at,
            supplierid: finalDeliveryResult.rows[0].supplierid,
            suppliername: finalDeliveryResult.rows[0].suppliername,
            items: finalDeliveryResult.rows.map(row => ({
                itemid: row.delivery_item_itemid,
                quantityreceived: row.quantityreceived,
                expirationdate: row.delivery_item_expirationdate,
                costperunit: row.delivery_item_costperunit,
                createdat: row.delivery_item_created_at,
                itemname: row.itemname,
                inventory_item_description: row.inventory_item_description,
                unitid: row.delivery_item_unitid,
                unitname: row.delivery_item_unit_name,
                unitabbreviation: row.delivery_item_unit_abbreviation,
                inventory_item_base_unit_name: row.inventory_item_base_unit_name,
                inventory_item_base_unit_abbreviation: row.inventory_item_base_unit_abbreviation
            }))
        };
        res.status(201).json(deliveryHeader);

    } catch (err) {
        console.error('Error calling sp_record_delivery:', err);
        if (err.code === 'P0001' || (err.message && (err.message.includes('not found') || err.message.includes('does not exist')))) {
             return res.status(400).json({ error: 'Failed to record delivery.', details: err.message });
        }
         if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid reference provided (e.g. supplier, item, unit).', details: err.message });
        }
        next(err);
    }
});


module.exports = router;