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
import Chip from '@mui/material/Chip'; // For displaying low stock status

import apiClient from '../services/api'; // Import the configured Axios instance

function InventoryPage() {
  // State variables
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null); // For success/error feedback

  // Fetch items function
  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    setApiMessage(null);
    try {
      const response = await apiClient.get('/items'); // Fetch from /api/items
      setItems(response.data);
    } catch (err) {
      console.error("Failed to fetch inventory items:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch items';
      setError(errorMsg);
      setApiMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // Fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, []);

  // Placeholder handlers
  const handleAddItem = () => {
    console.log("Add Item clicked");
    setApiMessage({ type: 'info', text: 'Add functionality not yet implemented.' });
    // TODO: Implement Add Item modal/form
  };

  const handleEditItem = (itemId) => {
    console.log("Edit Item clicked for ID:", itemId);
    setApiMessage({ type: 'info', text: `Edit functionality for ID ${itemId} not yet implemented.` });
    // TODO: Implement Edit Item modal/form
  };

  // Delete item handler
  const handleDeleteItem = async (itemId, itemName) => {
    console.log("Delete Item clicked for ID:", itemId);
    setApiMessage(null);
    setError(null);

    if (window.confirm(`Are you sure you want to delete item "${itemName}" (ID: ${itemId})? This cannot be undone.`)) {
      try {
        await apiClient.delete(`/items/${itemId}`);
        // Refresh list by filtering state
        setItems(currentItems => currentItems.filter(item => item.itemid !== itemId));
        setApiMessage({ type: 'success', text: `Item "${itemName}" deleted successfully.` });
      } catch (err) {
        console.error(`Failed to delete item ${itemId}:`, err);
        const errorMsg = err.response?.data?.error || err.message || 'Failed to delete item';
        setError(errorMsg);
        setApiMessage({ type: 'error', text: errorMsg });
      }
    }
  };

  // --- Render Logic ---
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Inventory Items
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddItem}
        >
          Add Item
        </Button>
      </Box>

      {/* Display API feedback message */}
      {apiMessage && (
        <Alert severity={apiMessage.type} sx={{ mb: 2 }} onClose={() => setApiMessage(null)}>
          {apiMessage.text}
        </Alert>
      )}

      {/* Display loading indicator */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Display the table (only if not loading) */}
      {!loading && (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 750 }} aria-label="inventory items table">
            <TableHead sx={{ backgroundColor: 'grey.200' }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Reorder Pt.</TableCell>
                <TableCell>Status</TableCell> {/* For Low Stock */}
                <TableCell>Supplier</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && !error ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">No inventory items found. Create one!</TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  // Check if item quantity is at or below reorder point
                  const isLowStock = parseFloat(item.quantityonhand) <= parseFloat(item.reorderpoint) && parseFloat(item.reorderpoint) > 0;
                  return (
                    <TableRow
                      key={item.itemid}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'action.hover'} }}
                    >
                      <TableCell component="th" scope="row">{item.itemid}</TableCell>
                      <TableCell>{item.itemname}</TableCell>
                      <TableCell>{item.categoryname || 'N/A'}</TableCell>
                      <TableCell>{item.unitabbreviation || item.unitname || 'N/A'}</TableCell>
                      <TableCell align="right">{parseFloat(item.quantityonhand).toFixed(2)}</TableCell> {/* Format quantity */}
                      <TableCell align="right">{parseFloat(item.reorderpoint).toFixed(2)}</TableCell> {/* Format reorder point */}
                      <TableCell>
                        {isLowStock && (
                          <Chip label="Low Stock" color="warning" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{item.suppliername || '-'}</TableCell> {/* Display supplier or dash */}
                      <TableCell align="right">
                        <IconButton
                          aria-label="edit"
                          size="small"
                          onClick={() => handleEditItem(item.itemid)}
                          sx={{ mr: 1 }}
                          title="Edit Item (Not Implemented)"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label="delete"
                          size="small"
                          onClick={() => handleDeleteItem(item.itemid, item.itemname)}
                          color="error"
                          title="Delete Item"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default InventoryPage;