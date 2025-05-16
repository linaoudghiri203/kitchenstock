import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';

import apiClient from '../services/api';
import SupplierFormModal from '../components/SupplierFormModal';
import SupplierItemFormModal from '../components/SupplierItemFormModal';

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [supplierItemsMap, setSupplierItemsMap] = useState({});
  const [loadingSupplierItems, setLoadingSupplierItems] = useState({});
  const [errorSupplierItems, setErrorSupplierItems] = useState({});

  const [isSupplierItemModalOpen, setIsSupplierItemModalOpen] = useState(false);
  const [editingSupplierItem, setEditingSupplierItem] = useState(null);
  const [currentSupplierIdForItemModal, setCurrentSupplierIdForItemModal] = useState(null);


  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/suppliers');
      setSuppliers(response.data);
    } catch (err) {
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

  const fetchItemsForSupplier = async (supplierId) => {
    if (supplierItemsMap[supplierId] && !errorSupplierItems[supplierId]) {
    }
    setLoadingSupplierItems(prev => ({ ...prev, [supplierId]: true }));
    setErrorSupplierItems(prev => ({ ...prev, [supplierId]: null }));
    setApiMessage(null);
    try {
      const response = await apiClient.get(`/suppliers/${supplierId}/items`);
      setSupplierItemsMap(prev => ({ ...prev, [supplierId]: response.data || [] }));
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || `Failed to load items for supplier ${supplierId}`;
      setErrorSupplierItems(prev => ({ ...prev, [supplierId]: errorMsg }));
      setApiMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoadingSupplierItems(prev => ({ ...prev, [supplierId]: false }));
    }
  };

  const handleOpenAddSupplierModal = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
    setApiMessage(null);
  };

  const handleOpenEditSupplierModal = (supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
    setApiMessage(null);
  };

  const handleSupplierModalClose = () => {
    setIsSupplierModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSupplierModalSubmit = async (supplierData, supplierIdToUpdate) => {
    setApiMessage(null);
    try {
      let response;
      if (supplierIdToUpdate) {
        response = await apiClient.put(`/suppliers/${supplierIdToUpdate}`, supplierData);
        setApiMessage({ type: 'success', text: `Supplier "${response.data.suppliername}" updated successfully.` });
      } else {
        response = await apiClient.post('/suppliers', supplierData);
        setApiMessage({ type: 'success', text: `Supplier "${response.data.suppliername}" added successfully.` });
      }
      fetchSuppliers();
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save supplier';
      setApiMessage({ type: 'error', text: `Failed to save supplier: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };

  const handleDeleteSupplier = async (supplierId, supplierName) => {
    setApiMessage(null);
    setError(null);
    if (window.confirm(`Are you sure you want to delete supplier "${supplierName}"? This will also remove all items associated with this supplier. This cannot be undone.`)) {
      try {
        await apiClient.delete(`/suppliers/${supplierId}`);
        fetchSuppliers();
        setApiMessage({ type: 'success', text: `Supplier "${supplierName}" deleted successfully.` });
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to delete supplier';
        setError(errorMsg);
        setApiMessage({ type: 'error', text: errorMsg });
      }
    }
  };

  const handleOpenAddItemToSupplierModal = (supplierId) => {
    setCurrentSupplierIdForItemModal(supplierId);
    setEditingSupplierItem(null);
    setIsSupplierItemModalOpen(true);
    setApiMessage(null);
  };

  const handleOpenEditSupplierItemModal = (supplierId, item) => {
    setCurrentSupplierIdForItemModal(supplierId);
    setEditingSupplierItem(item);
    setIsSupplierItemModalOpen(true);
    setApiMessage(null);
  };

  const handleSupplierItemModalClose = () => {
    setIsSupplierItemModalOpen(false);
    setEditingSupplierItem(null);
    setCurrentSupplierIdForItemModal(null);
  };

  const handleSupplierItemModalSubmit = async (itemData, supplierId, editingItemId) => {
    setApiMessage(null);
    try {
      let response;
      if (editingItemId) {
        response = await apiClient.put(`/suppliers/${supplierId}/items/${editingItemId}`, { supplieritemcost: itemData.supplieritemcost });
        setApiMessage({ type: 'success', text: `Cost for item ID ${editingItemId} updated for supplier.` });
      } else {
        response = await apiClient.post(`/suppliers/${supplierId}/items`, itemData);
        setApiMessage({ type: 'success', text: `Item added to supplier successfully.` });
      }
      fetchItemsForSupplier(supplierId);
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save supplier item link.';
      setApiMessage({ type: 'error', text: `Operation failed: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };

  const handleDeleteSupplierItem = async (supplierId, itemId, itemName) => {
    setApiMessage(null);
    if (window.confirm(`Are you sure you want to remove item "${itemName}" from supplier ID ${supplierId}?`)) {
      try {
        await apiClient.delete(`/suppliers/${supplierId}/items/${itemId}`);
        setApiMessage({ type: 'success', text: `Item "${itemName}" removed from supplier successfully.` });
        fetchItemsForSupplier(supplierId);
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to remove item from supplier.';
        setApiMessage({ type: 'error', text: errorMsg });
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Suppliers & Their Items
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddSupplierModal}
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

      {!loading && error && !apiMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {!loading && !error && suppliers.length === 0 && (
        <Typography sx={{ textAlign: 'center', mt: 3 }}>No suppliers found. Create one!</Typography>
      )}

      {!loading && !error && suppliers.length > 0 && (
        <Box>
          {suppliers.map((supplier) => (
            <Accordion
              key={supplier.supplierid}
              sx={{ mb: 1 }}
              onChange={(event, isExpanded) => {
                if (isExpanded) {
                  fetchItemsForSupplier(supplier.supplierid);
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`supplier-${supplier.supplierid}-content`}
                id={`supplier-${supplier.supplierid}-header`}
              >
                <Grid container alignItems="center" spacing={1}>
                    <Grid item xs>
                        <Typography sx={{ fontWeight: 'medium' }}>
                        {supplier.suppliername} (ID: {supplier.supplierid})
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {supplier.email || 'No email'} - {supplier.phonenumber || 'No phone'}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Tooltip title="Edit Supplier Details">
                            <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleOpenEditSupplierModal(supplier);}}
                            >
                                <EditIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Supplier">
                            <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSupplier(supplier.supplierid, supplier.suppliername);}}
                                color="error"
                            >
                                <DeleteIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: 'grey.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">Items Supplied:</Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenAddItemToSupplierModal(supplier.supplierid)}
                    variant="outlined"
                  >
                    Add Item to Supplier
                  </Button>
                </Box>
                {loadingSupplierItems[supplier.supplierid] && <CircularProgress size={24} />}
                {errorSupplierItems[supplier.supplierid] && <Alert severity="error" size="small">{errorSupplierItems[supplier.supplierid]}</Alert>}
                {!loadingSupplierItems[supplier.supplierid] && supplierItemsMap[supplier.supplierid] && (
                  supplierItemsMap[supplier.supplierid].length === 0 ? (
                    <Typography variant="body2" sx={{ fontStyle: 'italic', textAlign: 'center', py:1 }}>
                      This supplier currently provides no items.
                    </Typography>
                  ) : (
                    <List dense disablePadding>
                      {supplierItemsMap[supplier.supplierid].map((item) => (
                        <React.Fragment key={item.itemid}>
                          <ListItem
                            secondaryAction={
                              <>
                                <Tooltip title="Edit Item Cost">
                                  <IconButton
                                    edge="end"
                                    aria-label="edit supplier item"
                                    size="small"
                                    sx={{ mr: 0.5 }}
                                    onClick={() => handleOpenEditSupplierItemModal(supplier.supplierid, item)}
                                  >
                                    <EditIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove Item from this Supplier">
                                  <IconButton
                                    edge="end"
                                    aria-label="delete supplier item"
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteSupplierItem(supplier.supplierid, item.itemid, item.itemname)}
                                  >
                                    <DeleteIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            }
                          >
                            <ListItemText
                              primary={`${item.itemname} (ID: ${item.itemid})`}
                              secondary={`Cost: $${parseFloat(item.supplieritemcost).toFixed(2)} per ${item.unit_abbreviation || item.unit_name}`}
                            />
                          </ListItem>
                          <Divider component="li" />
                        </React.Fragment>
                      ))}
                    </List>
                  )
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      <SupplierFormModal
        open={isSupplierModalOpen}
        onClose={handleSupplierModalClose}
        onSubmit={handleSupplierModalSubmit}
        initialData={editingSupplier}
      />
      {isSupplierItemModalOpen && (
        <SupplierItemFormModal
            open={isSupplierItemModalOpen}
            onClose={handleSupplierItemModalClose}
            onSubmit={handleSupplierItemModalSubmit}
            supplierId={currentSupplierIdForItemModal}
            initialData={editingSupplierItem}
        />
      )}
    </Box>
  );
}

export default SuppliersPage;