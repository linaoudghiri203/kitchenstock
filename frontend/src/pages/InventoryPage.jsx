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
import Chip from '@mui/material/Chip';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { format, parseISO } from 'date-fns';

import apiClient from '../services/api';
import InventoryItemFormModal from '../components/InventoryItemFormModal';
import ManualUsageFormModal from '../components/ManualUsageFormModal';
import WasteFormModal from '../components/WasteFormModal';

function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [itemForUsage, setItemForUsage] = useState(null);

  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [itemForWaste, setItemForWaste] = useState(null);


  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/items');
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

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenAddItemModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
    setApiMessage(null);
  };

  const handleOpenEditItemModal = (item) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
    setApiMessage(null);
  };

  const handleItemModalClose = () => {
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  const handleItemModalSubmit = async (itemData, itemId) => {
    setApiMessage(null);
    try {
      let response;
      if (itemId) {
        response = await apiClient.put(`/items/${itemId}`, itemData);
        setApiMessage({ type: 'success', text: `Item "${response.data.itemname}" updated successfully.` });
      } else {
        response = await apiClient.post('/items', itemData);
        setApiMessage({ type: 'success', text: `Item "${response.data.itemname}" added successfully.` });
      }
      fetchItems();
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to save item';
      setApiMessage({ type: 'error', text: `Failed to save item: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };

  const handleOpenUsageModal = (item) => {
    setItemForUsage(item);
    setIsUsageModalOpen(true);
    setApiMessage(null);
  };

  const handleUsageModalClose = () => {
    setIsUsageModalOpen(false);
    setItemForUsage(null);
  };

  const handleUsageModalSubmit = async (usageData) => {
    setApiMessage(null);
    try {
      const response = await apiClient.post('/usage/manual', usageData);
      setApiMessage({ type: 'success', text: `Usage for "${response.data.updatedItem.itemname}" recorded. New Qty: ${response.data.updatedItem.quantityonhand}` });
      fetchItems();
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to record usage.';
      setApiMessage({ type: 'error', text: `Usage recording failed: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };

  const handleOpenWasteModal = (item) => {
    setItemForWaste(item);
    setIsWasteModalOpen(true);
    setApiMessage(null);
  };

  const handleWasteModalClose = () => {
    setIsWasteModalOpen(false);
    setItemForWaste(null);
  };

  const handleWasteModalSubmit = async (wasteData) => {
    setApiMessage(null);
    try {
      const response = await apiClient.post('/waste', wasteData);
      setApiMessage({ type: 'success', text: `Waste for "${response.data.updatedItem.itemname}" recorded. New Qty: ${response.data.updatedItem.quantityonhand}` });
      fetchItems();
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to record waste.';
      setApiMessage({ type: 'error', text: `Waste recording failed: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };


  const handleDeleteItem = async (itemId, itemName) => {
    setApiMessage(null);
    setError(null);
    if (window.confirm(`Are you sure you want to delete item "${itemName}" (ID: ${itemId})? This cannot be undone.`)) {
      try {
        await apiClient.delete(`/items/${itemId}`);
        setItems(currentItems => currentItems.filter(item => item.itemid !== itemId));
        setApiMessage({ type: 'success', text: `Item "${itemName}" deleted successfully.` });
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to delete item';
        setError(errorMsg);
        setApiMessage({ type: 'error', text: errorMsg });
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = typeof dateString === 'string' && dateString.length === 10 ? parseISO(dateString + 'T00:00:00') : new Date(dateString);
        return format(date, 'PP');
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString;
    }
};

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Inventory Items
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddItemModal}
        >
          Add Item
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
          <Table sx={{ minWidth: 750 }} aria-label="inventory items table">
            <TableHead sx={{ backgroundColor: 'grey.200' }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Item Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Reorder Pt.</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Details</TableCell>
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
                  const isLowStock = parseFloat(item.quantityonhand) <= parseFloat(item.reorderpoint) && parseFloat(item.reorderpoint) > 0;
                  return (
                    <TableRow
                      key={item.itemid}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'action.hover'} }}
                    >
                      <TableCell component="th" scope="row">{item.itemid}</TableCell>
                      <TableCell>{item.itemname}</TableCell>
                      <TableCell>{item.itemtype}</TableCell>
                      <TableCell>{item.categoryname || 'N/A'}</TableCell>
                      <TableCell>{item.unit_abbreviation || item.unit_name || 'N/A'}</TableCell>
                      <TableCell align="right">{parseFloat(item.quantityonhand).toFixed(2)}</TableCell>
                      <TableCell align="right">{parseFloat(item.reorderpoint).toFixed(2)}</TableCell>
                      <TableCell>
                        {isLowStock && (
                          <Chip label="Low Stock" color="warning" size="small" />
                        )}
                      </TableCell>
                      <TableCell sx={{fontSize: '0.8rem', maxWidth: '150px', whiteSpace: 'pre-wrap'}}>
                        {item.itemtype === 'Perishable' && `Expires: ${item.perishable_expiration_date ? formatDate(item.perishable_expiration_date) : '-'}\nTemp: ${item.perishable_storage_temp || '-'}`}
                        {item.itemtype === 'NonPerishable' && `Warranty: ${item.nonperishable_warranty || '-'}`}
                        {item.itemtype === 'Tool' && `Maintenance: ${item.tool_maintenance_schedule || '-'}`}
                      </TableCell>
                      <TableCell align="right">
                         <IconButton
                          aria-label="record usage"
                          size="small"
                          onClick={() => handleOpenUsageModal(item)}
                          title="Record Manual Usage"
                          color="info"
                          sx={{ mr: 0.5 }}
                        >
                          <RemoveShoppingCartIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label="record waste"
                          size="small"
                          onClick={() => handleOpenWasteModal(item)}
                          title="Record Waste"
                          color="default"
                           sx={{ mr: 0.5 }}
                        >
                          <DeleteSweepIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label="edit"
                          size="small"
                          onClick={() => handleOpenEditItemModal(item)}
                          sx={{ mr: 0.5 }}
                          title="Edit Item"
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

      <InventoryItemFormModal
        open={isItemModalOpen}
        onClose={handleItemModalClose}
        onSubmit={handleItemModalSubmit}
        initialData={editingItem}
      />

      <ManualUsageFormModal
        open={isUsageModalOpen}
        onClose={handleUsageModalClose}
        onSubmit={handleUsageModalSubmit}
        itemToUse={itemForUsage}
      />

      <WasteFormModal
        open={isWasteModalOpen}
        onClose={handleWasteModalClose}
        onSubmit={handleWasteModalSubmit}
        itemToWaste={itemForWaste}
      />
    </Box>
  );
}

export default InventoryPage;