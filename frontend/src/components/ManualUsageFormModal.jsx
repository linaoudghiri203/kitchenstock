import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid,
  Select, MenuItem, FormControl, InputLabel, FormHelperText, CircularProgress, Alert
} from '@mui/material';
import { format } from 'date-fns';
import apiClient from '../services/api';

function ManualUsageFormModal({ open, onClose, onSubmit, preselectedItemId }) {
  const initialFormState = {
    itemid: preselectedItemId || '',
    quantityused: '',
    unitid: '',
    usagedate: format(new Date(), 'yyyy-MM-dd'),
  };

  const [formData, setFormData] = useState(initialFormState);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!open) return;
      setLoadingDropdowns(true);
      setDropdownError(null);
      try {
        const [itemsRes, unitsRes] = await Promise.all([
          apiClient.get('/items'),
          apiClient.get('/units'),
        ]);
        setInventoryItems(itemsRes.data);
        setUnits(unitsRes.data);

        if (preselectedItemId) {
          const selectedItem = itemsRes.data.find(item => item.itemid === parseInt(preselectedItemId, 10));
          if (selectedItem && selectedItem.unitid) {
            setFormData(prev => ({ ...prev, unitid: selectedItem.unitid }));
          }
        }

      } catch (error) {
        console.error("Failed to fetch dropdown data for usage form:", error);
        setDropdownError("Could not load options for items or units. Please try again.");
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, [open, preselectedItemId]);

  useEffect(() => {
    if (open) {
      setFormData({
        itemid: preselectedItemId || '',
        quantityused: '',
        unitid: '',
        usagedate: format(new Date(), 'yyyy-MM-dd'),
      });
      setSubmitError(null);

      if (preselectedItemId && inventoryItems.length > 0) {
        const selectedItem = inventoryItems.find(item => item.itemid === parseInt(preselectedItemId, 10));
        if (selectedItem && selectedItem.unitid) {
          setFormData(prev => ({ ...prev, unitid: selectedItem.unitid }));
        }
      }
    }
  }, [open, preselectedItemId, inventoryItems]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'itemid' && value) {
      const selectedItem = inventoryItems.find(item => item.itemid === parseInt(value, 10));
      if (selectedItem && selectedItem.unitid) {
        setFormData(prev => ({ ...prev, unitid: selectedItem.unitid }));
      } else {
        setFormData(prev => ({ ...prev, unitid: '' }));
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      itemid: parseInt(formData.itemid, 10),
      quantityused: parseFloat(formData.quantityused),
      unitid: parseInt(formData.unitid, 10),
      usagedate: formData.usagedate,
    };

    if (isNaN(payload.itemid) || isNaN(payload.quantityused) || payload.quantityused <= 0 || isNaN(payload.unitid)) {
      setSubmitError('Please fill in all required fields with valid values.');
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(payload);
      handleClose();
    } catch (error) {
      console.error("Manual usage submission failed:", error);
      setSubmitError(error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to record usage.');
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
      <DialogTitle>Record Manual Usage</DialogTitle>
      <DialogContent>
        {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
        {dropdownError && <Alert severity="warning" sx={{ mb: 2 }}>{dropdownError}</Alert>}

        {loadingDropdowns ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> : (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel id="itemid-usage-label">Inventory Item</InputLabel>
                <Select
                  labelId="itemid-usage-label"
                  id="itemid"
                  name="itemid"
                  value={formData.itemid}
                  label="Inventory Item"
                  onChange={handleChange}
                  disabled={isSubmitting || loadingDropdowns || Boolean(preselectedItemId)}
                >
                  <MenuItem value=""><em>Select Item</em></MenuItem>
                  {inventoryItems.map((invItem) => (
                    <MenuItem key={invItem.itemid} value={invItem.itemid}>
                      {invItem.itemname} (Current Qty: {invItem.quantityonhand} {invItem.unit_abbreviation || invItem.unit_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                margin="dense"
                id="quantityused"
                name="quantityused"
                label="Quantity Used"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.quantityused}
                onChange={handleChange}
                disabled={isSubmitting}
                inputProps={{ min: 0.0001, step: "any" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel id="unitid-usage-label">Unit</InputLabel>
                <Select
                  labelId="unitid-usage-label"
                  id="unitid"
                  name="unitid"
                  value={formData.unitid}
                  label="Unit"
                  onChange={handleChange}
                  disabled={isSubmitting || loadingDropdowns}
                >
                  <MenuItem value=""><em>Select Unit</em></MenuItem>
                  {units.map((u) => (
                    <MenuItem key={u.unitid} value={u.unitid}>
                      {u.unit} ({u.abbreviation})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                margin="dense"
                id="usagedate"
                name="usagedate"
                label="Usage Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                value={formData.usagedate}
                onChange={handleChange}
                disabled={isSubmitting}
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
          Record Usage
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ManualUsageFormModal;