import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid,
  Select, MenuItem, FormControl, InputLabel, FormHelperText, CircularProgress, Alert, Box
} from '@mui/material';
import { format } from 'date-fns';
import apiClient from '../services/api';

function WasteFormModal({ open, onClose, onSubmit, itemToWaste }) {
  const initialFormState = {
    itemid: '',
    quantitywasted: '',
    unitid: '',
    wastedate: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [units, setUnits] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [dropdownError, setDropdownError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (open && itemToWaste) {
      setFormData({
        itemid: itemToWaste.itemid || '',
        quantitywasted: '',
        unitid: itemToWaste.unitid || '',
        wastedate: format(new Date(), 'yyyy-MM-dd'),
        reason: '',
      });
      setSubmitError(null);

      const fetchUnitsForForm = async () => {
        setLoadingDropdowns(true);
        try {
            const unitsRes = await apiClient.get('/units');
            setUnits(unitsRes.data || []);
            if (itemToWaste.unitid) {
                setFormData(prev => ({ ...prev, unitid: itemToWaste.unitid }));
            }
        } catch(err) {
            console.error("Failed to fetch units for waste form:", err);
            setDropdownError("Could not load unit options.");
        } finally {
            setLoadingDropdowns(false);
        }
      };
      fetchUnitsForForm();

    } else if (open && !itemToWaste) {
        setFormData(initialFormState);
        setSubmitError("No item selected for waste recording.");
    }
  }, [open, itemToWaste]);

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
      quantitywasted: parseFloat(formData.quantitywasted),
      unitid: parseInt(formData.unitid, 10),
      wastedate: formData.wastedate,
      reason: formData.reason || null,
    };

    if (isNaN(payload.itemid) || isNaN(payload.quantitywasted) || payload.quantitywasted <= 0 || isNaN(payload.unitid)) {
      setSubmitError('Please fill in item, positive quantity, and unit.');
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(payload);
      handleClose();
    } catch (error) {
      console.error("Waste recording submission failed:", error);
      setSubmitError(error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to record waste.');
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
      <DialogTitle>Record Waste for: {itemToWaste?.itemname || 'Item'}</DialogTitle>
      <DialogContent>
        {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
        {dropdownError && <Alert severity="warning" sx={{ mb: 2 }}>{dropdownError}</Alert>}

        <TextField
          margin="dense"
          id="itemNameDisplayWaste"
          label="Item Being Wasted"
          type="text"
          fullWidth
          variant="outlined"
          value={itemToWaste?.itemname || 'Loading item...'}
          disabled
          sx={{ mb: 2 }}
        />

        {loadingDropdowns && !itemToWaste ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                autoFocus
                margin="dense"
                id="quantitywasted"
                name="quantitywasted"
                label="Quantity Wasted"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.quantitywasted}
                onChange={handleChange}
                disabled={isSubmitting}
                inputProps={{ min: 0.0001, step: "any" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense" required disabled={loadingDropdowns || isSubmitting}>
                <InputLabel id="unitid-waste-label">Unit</InputLabel>
                <Select
                  labelId="unitid-waste-label"
                  id="unitid"
                  name="unitid"
                  value={formData.unitid}
                  label="Unit"
                  onChange={handleChange}
                >
                  <MenuItem value=""><em>Select Unit</em></MenuItem>
                  {itemToWaste && units.find(u => u.unitid === itemToWaste.unitid) && (
                     <MenuItem key={itemToWaste.unitid} value={itemToWaste.unitid}> 
                        {units.find(u => u.unitid === itemToWaste.unitid)?.unit} ({units.find(u => u.unitid === itemToWaste.unitid)?.abbreviation})
                     </MenuItem>
                  )}
                  {units.filter(u => !itemToWaste || u.unitid !== itemToWaste.unitid).map((u) => (
                    <MenuItem key={u.unitid} value={u.unitid}>
                      {u.unit} ({u.abbreviation})
                    </MenuItem>
                  ))}
                </Select>
                 {!formData.unitid && <FormHelperText>Required</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                margin="dense"
                id="wastedate"
                name="wastedate"
                label="Waste Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                value={formData.wastedate}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                id="reason"
                name="reason"
                label="Reason (Optional)"
                type="text"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={formData.reason}
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
          color="error"
          disabled={isSubmitting || loadingDropdowns}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          Record Waste
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WasteFormModal;