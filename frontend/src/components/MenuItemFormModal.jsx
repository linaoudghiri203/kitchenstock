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

function MenuItemFormModal({ open, onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState({
    menuitemname: '',
    description: '',
    price: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEditing = Boolean(initialData);
  const menuItemId = initialData?.menuitemid;

  useEffect(() => {
    if (initialData) {
      setFormData({
        menuitemname: initialData.menuitemname || '',
        description: initialData.description || '',
        price: initialData.price !== null && initialData.price !== undefined ? String(initialData.price) : '',
      });
    } else {
      setFormData({
        menuitemname: '',
        description: '',
        price: '',
      });
    }
    setSubmitError(null);
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
      menuitemname: formData.menuitemname,
      description: formData.description || null,
      price: formData.price !== '' ? parseFloat(formData.price) : null,
    };

    if (formData.price !== '' && (isNaN(payload.price) || payload.price < 0)) {
        setSubmitError('Invalid price. Must be a non-negative number or empty.');
        setIsSubmitting(false);
        return;
    }

    try {
      await onSubmit(payload, menuItemId);
      handleClose();
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmitError(error.response?.data?.error || error.message || 'Failed to save menu item.');
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
      <DialogTitle>{isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
      <DialogContent>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}
        <Grid container spacing={2} sx={{pt: 1}}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              required
              margin="dense"
              id="menuitemname"
              name="menuitemname"
              label="Menu Item Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.menuitemname}
              onChange={handleChange}
              disabled={isSubmitting}
            />
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
              rows={3}
              variant="outlined"
              value={formData.description}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="dense"
              id="price"
              name="price"
              label="Price (Optional)"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.price}
              onChange={handleChange}
              disabled={isSubmitting}
              inputProps={{ min: 0, step: "0.01" }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isEditing ? 'Save Changes' : 'Add Menu Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MenuItemFormModal;