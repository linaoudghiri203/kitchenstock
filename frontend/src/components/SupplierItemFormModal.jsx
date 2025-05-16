import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid,
  Select, MenuItem, FormControl, InputLabel, FormHelperText, CircularProgress, Alert, Box
} from '@mui/material';
import apiClient from '../services/api';

function SupplierItemFormModal({ open, onClose, onSubmit, supplierId, initialData }) {
  const initialFormState = {
    itemid: '',
    supplieritemcost: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEditing = Boolean(initialData && initialData.itemid);
  const editingItemId = initialData?.itemid;

  useEffect(() => {
    const fetchInventoryItems = async () => {
      if (!open) return;
      setLoadingDropdowns(true);
      setDropdownError(null);
      try {
        const response = await apiClient.get('/items');
        setInventoryItems(response.data || []);
      } catch (error) {
        console.error("Failed to fetch inventory items for modal:", error);
        setDropdownError("Could not load inventory items. Please try again.");
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchInventoryItems();
  }, [open]);

  useEffect(() => {
    if (open) {
      if (isEditing && initialData) {
        setFormData({
          itemid: initialData.itemid || '',
          supplieritemcost: initialData.supplieritemcost !== undefined ? String(initialData.supplieritemcost) : '',
        });
      } else {
        setFormData(initialFormState);
      }
      setSubmitError(null);
    }
  }, [initialData, open, isEditing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      itemid: parseInt(formData.itemid, 10),
      supplieritemcost: parseFloat(formData.supplieritemcost),
    };

    if (isNaN(payload.itemid) || payload.itemid === '') {
      setSubmitError('Please select an inventory item.');
      setIsSubmitting(false);
      return;
    }
    if (isNaN(payload.supplieritemcost) || payload.supplieritemcost < 0) {
      setSubmitError('Supplier item cost must be a non-negative number.');
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(payload, supplierId, editingItemId); 
      handleClose();
    } catch (error) {
      console.error("Supplier item submission failed:", error);
      setSubmitError(error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to save supplier item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} PaperProps={{ component: 'form', onSubmit: handleSubmit }} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Item Cost for Supplier' : 'Add Item to Supplier'}</DialogTitle>
      <DialogContent>
        {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
        {dropdownError && <Alert severity="warning" sx={{ mb: 2 }}>{dropdownError}</Alert>}

        {loadingDropdowns ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> : (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense" required disabled={isEditing}>
                <InputLabel id="itemid-supplieritem-label">Inventory Item</InputLabel>
                <Select
                  labelId="itemid-supplieritem-label"
                  id="itemid"
                  name="itemid"
                  value={formData.itemid}
                  label="Inventory Item"
                  onChange={handleChange}
                  disabled={isSubmitting || loadingDropdowns || isEditing}
                >
                  <MenuItem value=""><em>Select Item</em></MenuItem>
                  {inventoryItems.map((invItem) => (
                    <MenuItem key={invItem.itemid} value={invItem.itemid}>
                      {invItem.itemname} ({invItem.unit_abbreviation || invItem.unit_name})
                    </MenuItem>
                  ))}
                </Select>
                {isEditing && <FormHelperText>To change the item, remove and re-add.</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                autoFocus={!isEditing}
                margin="dense"
                id="supplieritemcost"
                name="supplieritemcost"
                label="Supplier Cost per Item Unit"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.supplieritemcost}
                onChange={handleChange}
                disabled={isSubmitting}
                inputProps={{ min: 0, step: "0.01" }}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || loadingDropdowns}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isEditing ? 'Save Cost' : 'Add Item to Supplier'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SupplierItemFormModal;