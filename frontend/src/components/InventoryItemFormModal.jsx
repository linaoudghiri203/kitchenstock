import React, { useState, useEffect } from 'react';
import {
  Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
  CircularProgress, Alert, Grid, Select, MenuItem, FormControl, InputLabel, FormHelperText, Box
} from '@mui/material';
import apiClient from '../services/api';
import { format, parseISO } from 'date-fns';

function InventoryItemFormModal({ open, onClose, onSubmit, initialData }) {
  const initialFormState = {
    itemname: '',
    description: '',
    categoryid: '',
    unitid: '',
    quantityonhand: '0',
    reorderpoint: '0',
    itemtype: '',
    expirationdate: '',
    storagetemperature: '',
    warrantyperiod: '',
    maintenanceschedule: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEditing = Boolean(initialData && initialData.itemid);
  const itemId = initialData?.itemid;

  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!open) return;
      setLoadingDropdowns(true);
      setDropdownError(null);
      try {
        const [categoriesRes, unitsRes] = await Promise.all([
          apiClient.get('/categories'),
          apiClient.get('/units'),
        ]);
        setCategories(categoriesRes.data || []);
        setUnits(unitsRes.data || []);
      } catch (error) {
        console.error("Failed to fetch dropdown data:", error);
        setDropdownError("Could not load options for categories or units. Please try again.");
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, [open]);

  useEffect(() => {
    if (open) {
      if (isEditing && initialData) {
        setFormData({
            itemname: initialData.itemname || '',
            description: initialData.description || '',
            categoryid: initialData.categoryid || '',
            unitid: initialData.unitid || '',
            quantityonhand: initialData.quantityonhand !== undefined ? String(initialData.quantityonhand) : '0',
            reorderpoint: initialData.reorderpoint !== undefined ? String(initialData.reorderpoint) : '0',
            itemtype: initialData.itemtype || '',
            expirationdate: initialData.perishable_expiration_date ? format(parseISO(initialData.perishable_expiration_date), 'yyyy-MM-dd') : '',
            storagetemperature: initialData.perishable_storage_temp || '',
            warrantyperiod: initialData.nonperishable_warranty || '',
            maintenanceschedule: initialData.tool_maintenance_schedule || '',
        });
      } else {
        setFormData(initialFormState);
      }
      setSubmitError(null);
    }
  }, [initialData, open, isEditing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
        ...prev,
        [name]: value,
        ...(name === 'itemtype' && !isEditing ? {
            expirationdate: '',
            storagetemperature: '',
            warrantyperiod: '',
            maintenanceschedule: '',
        } : {})
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    if (!formData.itemname || !formData.categoryid || !formData.unitid || (!isEditing && !formData.itemtype) ) {
        setSubmitError('Item Name, Category, Unit, and Item Type (for new items) are required.');
        setIsSubmitting(false);
        return;
    }
     if ((formData.itemtype === 'Perishable' || (isEditing && initialData?.itemtype === 'Perishable')) && formData.expirationdate === '') {
    }


    const payload = {
      itemname: formData.itemname,
      description: formData.description || null,
      categoryid: parseInt(formData.categoryid, 10),
      unitid: parseInt(formData.unitid, 10),
      quantityonhand: parseFloat(formData.quantityonhand) || 0,
      reorderpoint: parseFloat(formData.reorderpoint) || 0,
      itemtype: isEditing ? initialData.itemtype : formData.itemtype,
      
      ...( (formData.itemtype === 'Perishable' || (isEditing && initialData?.itemtype === 'Perishable')) && {
          expirationdate: formData.expirationdate || null,
          storagetemperature: formData.storagetemperature || null,
      }),
      ...( (formData.itemtype === 'NonPerishable' || (isEditing && initialData?.itemtype === 'NonPerishable')) && {
          warrantyperiod: formData.warrantyperiod || null,
      }),
      ...( (formData.itemtype === 'Tool' || (isEditing && initialData?.itemtype === 'Tool')) && {
          maintenanceschedule: formData.maintenanceschedule || null,
      }),
    };
    

    try {
      await onSubmit(payload, itemId);
      handleClose();
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmitError(error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to save item.');
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
    <Dialog open={open} onClose={handleClose} PaperProps={{ component: 'form', onSubmit: handleSubmit }} maxWidth="md" fullWidth>
      <DialogTitle>{isEditing ? `Edit Inventory Item: ${initialData?.itemname || ''}` : 'Add New Inventory Item'}</DialogTitle>
      <DialogContent>
        {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
        {dropdownError && <Alert severity="warning" sx={{ mb: 2 }}>{dropdownError}</Alert>}

        {loadingDropdowns && !isEditing ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> : (
          <Grid container spacing={2} sx={{ mt: 1}}>
            <Grid item xs={12} sm={isEditing ? 12 : 6}>
              <TextField
                autoFocus={!isEditing}
                required
                margin="dense"
                id="itemname"
                name="itemname"
                label="Item Name"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.itemname}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </Grid>
            {!isEditing && (
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="dense" required>
                    <InputLabel id="itemtype-label">Item Type</InputLabel>
                    <Select
                        labelId="itemtype-label"
                        id="itemtype"
                        name="itemtype"
                        value={formData.itemtype}
                        label="Item Type"
                        onChange={handleChange}
                        disabled={isSubmitting || isEditing}
                    >
                        <MenuItem value=""><em>Select Item Type</em></MenuItem>
                        <MenuItem value="Perishable">Perishable</MenuItem>
                        <MenuItem value="NonPerishable">Non-Perishable</MenuItem>
                        <MenuItem value="Tool">Tool</MenuItem>
                    </Select>
                    {!formData.itemtype && <FormHelperText>Required</FormHelperText>}
                    </FormControl>
                </Grid>
            )}
             {isEditing && initialData?.itemtype && (
                <Grid item xs={12} sm={6}>
                    <TextField
                        margin="dense"
                        label="Item Type"
                        value={initialData.itemtype}
                        fullWidth
                        disabled
                        variant="outlined"
                    />
                </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel id="categoryid-label">Category</InputLabel>
                <Select
                  labelId="categoryid-label"
                  id="categoryid"
                  name="categoryid"
                  value={formData.categoryid}
                  label="Category"
                  onChange={handleChange}
                  disabled={isSubmitting || loadingDropdowns}
                >
                  <MenuItem value=""><em>Select Category</em></MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.categoryid} value={cat.categoryid}>
                      {cat.categoryname}
                    </MenuItem>
                  ))}
                </Select>
                 {!formData.categoryid && <FormHelperText>Required</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel id="unitid-label">Unit of Measure</InputLabel>
                <Select
                  labelId="unitid-label"
                  id="unitid"
                  name="unitid"
                  value={formData.unitid}
                  label="Unit of Measure"
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
                 {!formData.unitid && <FormHelperText>Required</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                margin="dense"
                id="description"
                name="description"
                label="Description (Optional)"
                type="text"
                fullWidth
                multiline
                rows={2}
                variant="outlined"
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </Grid>
            
            {(formData.itemtype === 'Perishable' || (isEditing && initialData?.itemtype === 'Perishable')) && (
                <>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            margin="dense"
                            id="expirationdate"
                            name="expirationdate"
                            label="Expiration Date (Perishable)"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            value={formData.expirationdate}
                            onChange={handleChange}
                            disabled={isSubmitting}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            margin="dense"
                            id="storagetemperature"
                            name="storagetemperature"
                            label="Storage Temperature (Perishable)"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={formData.storagetemperature}
                            onChange={handleChange}
                            disabled={isSubmitting}
                        />
                    </Grid>
                </>
            )}
            {(formData.itemtype === 'NonPerishable' || (isEditing && initialData?.itemtype === 'NonPerishable')) && (
                <Grid item xs={12}>
                    <TextField
                        margin="dense"
                        id="warrantyperiod"
                        name="warrantyperiod"
                        label="Warranty Period (Non-Perishable)"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={formData.warrantyperiod}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </Grid>
            )}
            {(formData.itemtype === 'Tool' || (isEditing && initialData?.itemtype === 'Tool')) && (
                <Grid item xs={12}>
                    <TextField
                        margin="dense"
                        id="maintenanceschedule"
                        name="maintenanceschedule"
                        label="Maintenance Schedule (Tool)"
                        type="text"
                        fullWidth
                        multiline
                        rows={2}
                        variant="outlined"
                        value={formData.maintenanceschedule}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                id="quantityonhand"
                name="quantityonhand"
                label="Quantity on Hand"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.quantityonhand}
                onChange={handleChange}
                disabled={isSubmitting}
                inputProps={{ min: 0, step: "any" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                id="reorderpoint"
                name="reorderpoint"
                label="Reorder Point"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.reorderpoint}
                onChange={handleChange}
                disabled={isSubmitting}
                inputProps={{ min: 0, step: "any" }}
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
          {isEditing ? 'Save Changes' : 'Add Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default InventoryItemFormModal;