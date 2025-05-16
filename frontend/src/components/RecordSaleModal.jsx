import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid,
  Select, MenuItem, FormControl, InputLabel, FormHelperText, CircularProgress, Alert, Box
} from '@mui/material';
import { format } from 'date-fns';
import apiClient from '../services/api';

function RecordSaleModal({ open, onClose, onSubmit }) {
  const initialFormState = {
    menuitemid: '',
    quantitySold: '1',
    usageDate: format(new Date(), 'yyyy-MM-dd'),
  };

  const [formData, setFormData] = useState(initialFormState);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchMenuItemsForDropdown = async () => {
      if (!open) return;
      setLoadingDropdowns(true);
      setDropdownError(null);
      try {
        const response = await apiClient.get('/menu-items');
        setMenuItems(response.data || []);
      } catch (error) {
        console.error("Failed to fetch menu items for sale form:", error);
        setDropdownError("Could not load menu items. Please try again.");
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchMenuItemsForDropdown();
  }, [open]);

  useEffect(() => {
    if (open) {
      setFormData(initialFormState);
      setSubmitError(null);
    }
  }, [open]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      menuItemId: parseInt(formData.menuitemid, 10),
      quantitySold: parseInt(formData.quantitySold, 10),
      usageDate: formData.usageDate,
    };

    if (isNaN(payload.menuItemId) || payload.menuItemId === '') {
      setSubmitError('Please select a menu item.');
      setIsSubmitting(false);
      return;
    }
    if (isNaN(payload.quantitySold) || payload.quantitySold <= 0) {
      setSubmitError('Quantity sold must be a positive number.');
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(payload); 
      handleClose();
    } catch (error) {
      console.error("Record sale submission failed:", error);
      setSubmitError(error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to record sale.');
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
      <DialogTitle>Record Menu Item Sale</DialogTitle>
      <DialogContent>
        {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
        {dropdownError && <Alert severity="warning" sx={{ mb: 2 }}>{dropdownError}</Alert>}

        {loadingDropdowns ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> : (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel id="menuitemid-sale-label">Menu Item</InputLabel>
                <Select
                  labelId="menuitemid-sale-label"
                  id="menuitemid"
                  name="menuitemid"
                  value={formData.menuitemid}
                  label="Menu Item"
                  onChange={handleChange}
                  disabled={isSubmitting || loadingDropdowns}
                >
                  <MenuItem value=""><em>Select Menu Item</em></MenuItem>
                  {menuItems.map((item) => (
                    <MenuItem key={item.menuitemid} value={item.menuitemid}>
                      {item.menuitemname} {item.price ? `($${parseFloat(item.price).toFixed(2)})` : ''}
                    </MenuItem>
                  ))}
                </Select>
                {!formData.menuitemid && <FormHelperText>Required</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                margin="dense"
                id="quantitySold"
                name="quantitySold"
                label="Quantity Sold"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.quantitySold}
                onChange={handleChange}
                disabled={isSubmitting}
                inputProps={{ min: 1, step: "1" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                margin="dense"
                id="usageDate"
                name="usageDate"
                label="Sale Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                value={formData.usageDate}
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
          Record Sale
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RecordSaleModal;