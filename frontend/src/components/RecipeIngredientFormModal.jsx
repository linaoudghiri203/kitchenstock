import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';

import apiClient from '../services/api';

function RecipeIngredientFormModal({ open, onClose, onSubmit, menuItemId, initialData }) {
  const initialFormState = {
    itemid: '',
    quantityrequired: '',
    unitid: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEditing = Boolean(initialData);
  const editingItemId = initialData?.itemid;

  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      setDropdownError(null);
      try {
        const [itemsRes, unitsRes] = await Promise.all([
          apiClient.get('/items'),
          apiClient.get('/units'),
        ]);
        setInventoryItems(itemsRes.data);
        setUnits(unitsRes.data);
      } catch (error) {
        console.error("Failed to fetch dropdown data for recipe ingredient form:", error);
        setDropdownError("Could not load options for items or units. Please try again.");
      } finally {
        setLoadingDropdowns(false);
      }
    };

    if (open) {
      fetchDropdownData();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          itemid: initialData.itemid || '',
          quantityrequired: initialData.quantityrequired !== undefined ? String(initialData.quantityrequired) : '',
          unitid: initialData.unitid || '',
        });
      } else {
        setFormData(initialFormState);
      }
      setSubmitError(null);
    }
  }, [initialData, open]);

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
      quantityrequired: parseFloat(formData.quantityrequired),
      unitid: parseInt(formData.unitid, 10),
    };

    if (isNaN(payload.quantityrequired) || payload.quantityrequired <= 0) {
        setSubmitError('Quantity required must be a positive number.');
        setIsSubmitting(false);
        return;
    }
    if (isNaN(payload.itemid) || isNaN(payload.unitid) ) {
        setSubmitError('Item and Unit must be selected.');
        setIsSubmitting(false);
        return;
    }


    try {
      await onSubmit(payload, menuItemId, editingItemId);
      handleClose();
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmitError(error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to save ingredient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setSubmitError(null);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} PaperProps={{ component: 'form', onSubmit: handleSubmit }} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Recipe Ingredient' : 'Add Ingredient to Recipe'}</DialogTitle>
      <DialogContent>
        {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
        {dropdownError && <Alert severity="warning" sx={{ mb: 2 }}>{dropdownError}</Alert>}

        {loadingDropdowns ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense" required disabled={isEditing}>
                <InputLabel id="itemid-label">Inventory Item</InputLabel>
                <Select
                  labelId="itemid-label"
                  id="itemid"
                  name="itemid"
                  value={formData.itemid}
                  label="Inventory Item"
                  onChange={handleChange}
                  disabled={isSubmitting || loadingDropdowns || isEditing}
                >
                  <MenuItem value=""><em>Select Item</em></MenuItem>
                  {inventoryItems.map((item) => (
                    <MenuItem key={item.itemid} value={item.itemid}>
                      {item.itemname} ({item.unit_abbreviation || item.unit_name})
                    </MenuItem>
                  ))}
                </Select>
                {isEditing && <FormHelperText>Item cannot be changed once added to a recipe. Delete and re-add if necessary.</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                margin="dense"
                id="quantityrequired"
                name="quantityrequired"
                label="Quantity Required"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.quantityrequired}
                onChange={handleChange}
                disabled={isSubmitting}
                inputProps={{ min: 0.0001, step: "any" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel id="unitid-label">Unit</InputLabel>
                <Select
                  labelId="unitid-label"
                  id="unitid"
                  name="unitid"
                  value={formData.unitid}
                  label="Unit"
                  onChange={handleChange}
                  disabled={isSubmitting || loadingDropdowns}
                >
                  <MenuItem value=""><em>Select Unit</em></MenuItem>
                  {units.map((unit) => (
                    <MenuItem key={unit.unitid} value={unit.unitid}>
                      {unit.unit} ({unit.abbreviation})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
          {isEditing ? 'Save Changes' : 'Add Ingredient'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RecipeIngredientFormModal;