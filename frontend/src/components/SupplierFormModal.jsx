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

function SupplierFormModal({ open, onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState({
    suppliername: '',
    contactperson: '',
    phonenumber: '',
    email: '',
    address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEditing = Boolean(initialData);
  const supplierId = initialData?.supplierid;

  useEffect(() => {
    if (initialData) {
      setFormData({
        suppliername: initialData.suppliername || '',
        contactperson: initialData.contactperson || '',
        phonenumber: initialData.phonenumber || '',
        email: initialData.email || '',
        address: initialData.address || '',
      });
    } else {
      setFormData({
        suppliername: '',
        contactperson: '',
        phonenumber: '',
        email: '',
        address: '',
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
        suppliername: formData.suppliername,
        contactperson: formData.contactperson || null,
        phonenumber: formData.phonenumber || null,
        email: formData.email || null,
        address: formData.address || null,
    };


    try {
      await onSubmit(payload, supplierId);
      handleClose();
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmitError(error.response?.data?.error || error.message || 'Failed to save supplier.');
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
      <DialogTitle>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
      <DialogContent>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              required
              margin="dense"
              id="suppliername"
              name="suppliername"
              label="Supplier Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.suppliername}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              id="contactperson"
              name="contactperson"
              label="Contact Person (Optional)"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.contactperson}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              id="phonenumber"
              name="phonenumber"
              label="Phone Number (Optional)"
              type="tel"
              fullWidth
              variant="outlined"
              value={formData.phonenumber}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="dense"
              id="email"
              name="email"
              label="Email (Optional)"
              type="email"
              fullWidth
              variant="outlined"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="dense"
              id="address"
              name="address"
              label="Address (Optional)"
              type="text"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={formData.address}
              onChange={handleChange}
              disabled={isSubmitting}
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
          {isEditing ? 'Save Changes' : 'Add Supplier'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SupplierFormModal;