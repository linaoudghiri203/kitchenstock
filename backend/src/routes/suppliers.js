
const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const queryText = 'SELECT * FROM SUPPLIER ORDER BY SupplierID ASC';
    const { rows } = await db.query(queryText);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid supplier ID provided.' });
  }

  try {
    const queryText = 'SELECT * FROM SUPPLIER WHERE SupplierID = $1';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error fetching supplier ${id}:`, err);
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const {
    suppliername,
    contactperson,
    phonenumber,
    email,
    streetaddress,
    city,
    postalcode,
    country
  } = req.body;

  if (!suppliername) {
    return res.status(400).json({ error: 'Missing required field: suppliername' });
  }

  try {
    const queryText = `
      INSERT INTO SUPPLIER (SupplierName, ContactPerson, PhoneNumber, Email, StreetAddress, City, PostalCode, Country)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`;
    const values = [
        suppliername,
        contactperson || null,
        phonenumber || null,
        email || null,
        streetaddress || null,
        city || null,
        postalcode || null,
        country || null
    ];

    const { rows } = await db.query(queryText, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating supplier:', err);
    if (err.code === '23505' && err.constraint === 'supplier_email_key') {
        return res.status(409).json({ error: 'Supplier email already exists.' });
    }
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const {
    suppliername,
    contactperson,
    phonenumber,
    email,
    streetaddress,
    city,
    postalcode,
    country
   } = req.body;

  if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid supplier ID provided.' });
  }

  if (!suppliername) {
    return res.status(400).json({ error: 'Missing required field: suppliername' });
  }

  try {
    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    if (suppliername !== undefined) { fieldsToUpdate.push(`SupplierName = $${paramIndex++}`); values.push(suppliername); }
    if (contactperson !== undefined) { fieldsToUpdate.push(`ContactPerson = $${paramIndex++}`); values.push(contactperson || null); }
    if (phonenumber !== undefined) { fieldsToUpdate.push(`PhoneNumber = $${paramIndex++}`); values.push(phonenumber || null); }
    if (email !== undefined) { fieldsToUpdate.push(`Email = $${paramIndex++}`); values.push(email || null); }
    if (streetaddress !== undefined) { fieldsToUpdate.push(`StreetAddress = $${paramIndex++}`); values.push(streetaddress || null); }
    if (city !== undefined) { fieldsToUpdate.push(`City = $${paramIndex++}`); values.push(city || null); }
    if (postalcode !== undefined) { fieldsToUpdate.push(`PostalCode = $${paramIndex++}`); values.push(postalcode || null); }
    if (country !== undefined) { fieldsToUpdate.push(`Country = $${paramIndex++}`); values.push(country || null); }


    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: "No fields provided for update." });
    }

    values.push(id);

    const queryText = `
      UPDATE SUPPLIER
      SET ${fieldsToUpdate.join(', ')}
      WHERE SupplierID = $${paramIndex}
      RETURNING *;`;

    const { rows } = await db.query(queryText, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(`Error updating supplier ${id}:`, err);
    if (err.code === '23505' && err.constraint === 'supplier_email_key') {
        return res.status(409).json({ error: 'Updated supplier email conflicts with an existing one.' });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

   if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid supplier ID provided.' });
  }

  try {
    const queryText = 'DELETE FROM SUPPLIER WHERE SupplierID = $1 RETURNING *;';
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
     res.status(204).send();

  } catch (err) {
    console.error(`Error deleting supplier ${id}:`, err);
    next(err);
  }
});


module.exports = router;