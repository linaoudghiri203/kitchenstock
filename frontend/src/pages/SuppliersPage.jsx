import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

import apiClient from '../services/api';

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    setApiMessage(null);
    try {
      const response = await apiClient.get('/suppliers');
      setSuppliers(response.data);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch suppliers';
      setError(errorMsg);
      setApiMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = () => {
    console.log("Add Supplier clicked");
    setApiMessage({ type: 'info', text: 'Add functionality not yet implemented.' });
    // TODO: Implement Add Supplier modal/form
  };

  const handleEditSupplier = (supplierId) => {
    console.log("Edit Supplier clicked for ID:", supplierId);
    setApiMessage({ type: 'info', text: `Edit functionality for ID ${supplierId} not yet implemented.` });
    // TODO: Implement Edit Supplier modal/form
  };

  const handleDeleteSupplier = async (supplierId, supplierName) => {
    console.log("Delete Supplier clicked for ID:", supplierId);
    setApiMessage(null);
    setError(null);

    if (window.confirm(`Are you sure you want to delete supplier "${supplierName}"? This cannot be undone.`)) {
      try {
        await apiClient.delete(`/suppliers/${supplierId}`);
        setSuppliers(currentSuppliers => currentSuppliers.filter(sup => sup.supplierid !== supplierId));
        setApiMessage({ type: 'success', text: `Supplier "${supplierName}" deleted successfully.` });
      } catch (err) {
        console.error(`Failed to delete supplier ${supplierId}:`, err);
        const errorMsg = err.response?.data?.error || err.message || 'Failed to delete supplier';
        setError(errorMsg);
        setApiMessage({ type: 'error', text: errorMsg });
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Suppliers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddSupplier}
        >
          Add Supplier
        </Button>
      </Box>

      {apiMessage && (
        <Alert severity={apiMessage.type} sx={{ mb: 2 }} onClose={() => setApiMessage(null)}>
          {apiMessage.text}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 750 }} aria-label="suppliers table">
            <TableHead sx={{ backgroundColor: 'grey.200' }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Address</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.length === 0 && !error ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">No suppliers found. Create one!</TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow
                    key={supplier.supplierid}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'action.hover'} }}
                  >
                    <TableCell component="th" scope="row">{supplier.supplierid}</TableCell>
                    <TableCell>{supplier.suppliername}</TableCell>
                    <TableCell>{supplier.contactperson || '-'}</TableCell>
                    <TableCell>{supplier.phonenumber || '-'}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {supplier.address || '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label="edit"
                        size="small"
                        onClick={() => handleEditSupplier(supplier.supplierid)}
                        sx={{ mr: 1 }}
                        title="Edit Supplier (Not Implemented)"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="delete"
                        size="small"
                        onClick={() => handleDeleteSupplier(supplier.supplierid, supplier.suppliername)}
                        color="error"
                        title="Delete Supplier"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default SuppliersPage;