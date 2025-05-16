
const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  const { categoryid } = req.query;
  let queryText = 'SELECT * FROM vw_inventory_items_details';
  const queryParams = [];
  let paramIndex = 1;

  if (categoryid && !isNaN(parseInt(categoryid, 10))) {
    queryText += ` WHERE categoryid = $${paramIndex++}`;
    queryParams.push(parseInt(categoryid, 10));
  }
  queryText += ' ORDER BY itemid ASC';

  try {
    const { rows } = await db.query(queryText, queryParams);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching inventory items from view:', err);
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid item ID provided.' });
  }
  try {
    const queryText = 'SELECT * FROM vw_inventory_items_details WHERE itemid = $1';
    const { rows } = await db.query(queryText, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error fetching inventory item ${id} from view:`, err);
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const {
    itemname, description, categoryid, unitid,
    quantityonhand = 0, reorderpoint = 0, itemtype,
    expirationdate, storagetemperature,
    warrantyperiod,
    maintenanceschedule
  } = req.body;

  if (!itemname || !categoryid || !unitid || !itemtype) {
    return res.status(400).json({ error: 'Missing required fields: itemname, categoryid, unitid, itemtype' });
  }
  if (!['Perishable', 'NonPerishable', 'Tool'].includes(itemtype)) {
    return res.status(400).json({ error: 'Invalid itemtype provided.' });
  }
  if (isNaN(parseInt(categoryid, 10)) || isNaN(parseInt(unitid, 10))) {
      return res.status(400).json({ error: 'Invalid categoryid or unitid. Must be numbers.' });
  }
  const qty = parseFloat(quantityonhand);
  const reorder = parseFloat(reorderpoint);
   if (isNaN(qty) || qty < 0) {
       return res.status(400).json({ error: 'Invalid quantityonhand. Must be a non-negative number.' });
   }
   if (isNaN(reorder) || reorder < 0) {
       return res.status(400).json({ error: 'Invalid reorderpoint. Must be a non-negative number.' });
   }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const inventoryItemQuery = `
      INSERT INTO INVENTORY_ITEM
        (ItemName, Description, CategoryID, UnitID, QuantityOnHand, ReorderPoint, ItemType)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ItemID;`;
    const inventoryItemValues = [
        itemname, description || null, parseInt(categoryid, 10), parseInt(unitid, 10),
        qty, reorder, itemtype
    ];
    const inventoryItemResult = await client.query(inventoryItemQuery, inventoryItemValues);
    const newItemId = inventoryItemResult.rows[0].itemid;

    if (itemtype === 'Perishable') {
      const perishableQuery = `
        INSERT INTO PerishableItem (ItemID, ExpirationDate, StorageTemperature)
        VALUES ($1, $2, $3);`;
      await client.query(perishableQuery, [newItemId, expirationdate || null, storagetemperature || null]);
    } else if (itemtype === 'NonPerishable') {
      const nonPerishableQuery = `
        INSERT INTO NonPerishableItem (ItemID, WarrantyPeriod)
        VALUES ($1, $2);`;
      await client.query(nonPerishableQuery, [newItemId, warrantyperiod || null]);
    } else if (itemtype === 'Tool') {
      const toolQuery = `
        INSERT INTO ToolItem (ItemID, MaintenanceSchedule)
        VALUES ($1, $2);`;
      await client.query(toolQuery, [newItemId, maintenanceschedule || null]);
    }

    await client.query('COMMIT');

    const newItemFromView = await db.query('SELECT * FROM vw_inventory_items_details WHERE itemid = $1', [newItemId]);
    res.status(201).json(newItemFromView.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating inventory item with subtype:', err);
    if (err.code === '23505' && err.constraint === 'inventory_item_itemname_key') {
        return res.status(409).json({ error: 'Inventory item name already exists.' });
    }
    if (err.code === '23503') {
         return res.status(400).json({ error: 'Invalid CategoryID or UnitID provided. Referenced record does not exist.', details: err.message });
    }
    next(err);
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const itemIdToUpdate = parseInt(id, 10);

  const {
    itemname, description, categoryid, unitid,
    quantityonhand, reorderpoint, itemtype,
    expirationdate, storagetemperature,
    warrantyperiod,
    maintenanceschedule
  } = req.body;

  if (isNaN(itemIdToUpdate)) {
      return res.status(400).json({ error: 'Invalid item ID provided.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const itemFields = [];
    const itemValues = [];
    let itemParamIndex = 1;

    if (itemname !== undefined) { itemFields.push(`ItemName = $${itemParamIndex++}`); itemValues.push(itemname); }
    if (description !== undefined) { itemFields.push(`Description = $${itemParamIndex++}`); itemValues.push(description); }
    if (categoryid !== undefined) { itemFields.push(`CategoryID = $${itemParamIndex++}`); itemValues.push(parseInt(categoryid, 10)); }
    if (unitid !== undefined) { itemFields.push(`UnitID = $${itemParamIndex++}`); itemValues.push(parseInt(unitid, 10)); }
    if (quantityonhand !== undefined) { itemFields.push(`QuantityOnHand = $${itemParamIndex++}`); itemValues.push(parseFloat(quantityonhand)); }
    if (reorderpoint !== undefined) { itemFields.push(`ReorderPoint = $${itemParamIndex++}`); itemValues.push(parseFloat(reorderpoint)); }

    if (itemFields.length > 0) {
        itemValues.push(itemIdToUpdate);
        const updateItemQuery = `UPDATE INVENTORY_ITEM SET ${itemFields.join(', ')} WHERE ItemID = $${itemParamIndex} RETURNING ItemType;`;
        const itemUpdateResult = await client.query(updateItemQuery, itemValues);
        if (itemUpdateResult.rowCount === 0) {
            throw new Error('Inventory item not found or no changes to core item data.');
        }
    }
    
    const currentItemDetails = await client.query('SELECT itemType FROM INVENTORY_ITEM WHERE ItemID = $1', [itemIdToUpdate]);
    if (currentItemDetails.rows.length === 0) {
        return res.status(404).json({ message: 'Inventory item not found after initial update check.' });
    }
    const currentItemType = currentItemDetails.rows[0].itemtype;

    if (currentItemType === 'Perishable') {
      const perishableFields = [];
      const perishableValues = [];
      let pParamIndex = 1;
      if (expirationdate !== undefined) { perishableFields.push(`ExpirationDate = $${pParamIndex++}`); perishableValues.push(expirationdate || null); }
      if (storagetemperature !== undefined) { perishableFields.push(`StorageTemperature = $${pParamIndex++}`); perishableValues.push(storagetemperature || null); }
      
      if (perishableFields.length > 0) {
        perishableValues.push(itemIdToUpdate);
        const updatePerishableQuery = `UPDATE PerishableItem SET ${perishableFields.join(', ')} WHERE ItemID = $${pParamIndex};`;
        await client.query(updatePerishableQuery, perishableValues);
      }
    } else if (currentItemType === 'NonPerishable') {
      if (warrantyperiod !== undefined) {
        const updateNonPerishableQuery = `UPDATE NonPerishableItem SET WarrantyPeriod = $1 WHERE ItemID = $2;`;
        await client.query(updateNonPerishableQuery, [warrantyperiod || null, itemIdToUpdate]);
      }
    } else if (currentItemType === 'Tool') {
      if (maintenanceschedule !== undefined) {
        const updateToolQuery = `UPDATE ToolItem SET MaintenanceSchedule = $1 WHERE ItemID = $2;`;
        await client.query(updateToolQuery, [maintenanceschedule || null, itemIdToUpdate]);
      }
    }

    await client.query('COMMIT');

    const updatedItemFromView = await db.query('SELECT * FROM vw_inventory_items_details WHERE itemid = $1', [itemIdToUpdate]);
     if (updatedItemFromView.rows.length === 0) {
      return res.status(404).json({ message: 'Updated inventory item not found in view (should not happen).' });
    }
    res.status(200).json(updatedItemFromView.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Error updating inventory item ${itemIdToUpdate} with subtype:`, err);
    if (err.code === '23505' && err.constraint === 'inventory_item_itemname_key') {
        return res.status(409).json({ error: 'Updated item name conflicts with an existing one.' });
    }
    if (err.code === '23503') {
         return res.status(400).json({ error: 'Invalid CategoryID or UnitID provided. Referenced record does not exist.', details: err.message });
    }
    if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
    }
    next(err);
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

   if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid item ID provided.' });
  }

  try {
    const queryText = 'DELETE FROM INVENTORY_ITEM WHERE ItemID = $1 RETURNING *;';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
     res.status(204).send();

  } catch (err) {
    console.error(`Error deleting inventory item ${id}:`, err);
    if (err.code === '23503') {
        return res.status(409).json({ error: 'Cannot delete item: It is referenced in other records (deliveries, recipes, usage, etc.).' });
    }
    next(err);
  }
});


module.exports = router;