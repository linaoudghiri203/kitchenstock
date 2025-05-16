import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

function UnitFormModal({ open, onClose, onSubmit, initialData }) {
  const [unitName, setUnitName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEditing = Boolean(initialData);
  const unitId = initialData?.unitid;

  useEffect(() => {
    if (initialData) {
      setUnitName(initialData.unit || '');
      setAbbreviation(initialData.abbreviation || '');
    } else {
      setUnitName('');
      setAbbreviation('');
    }
    setSubmitError(null);
  }, [initialData, open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const unitData = {
      unit: unitName,
      abbreviation: abbreviation,
    };

    try {
      await onSubmit(unitData, unitId);
      handleClose();
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmitError(error.response?.data?.error || error.message || 'Failed to save unit.');
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
    <Dialog open={open} onClose={handleClose} PaperProps={{ component: 'form', onSubmit: handleSubmit }}>
      <DialogTitle>{isEditing ? 'Edit Unit of Measure' : 'Add New Unit of Measure'}</DialogTitle>
      <DialogContent>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}
        <TextField
          autoFocus
          required
          margin="dense"
          id="unitName"
          label="Unit Name"
          type="text"
          fullWidth
          variant="outlined"
          value={unitName}
          onChange={(e) => setUnitName(e.target.value)}
          disabled={isSubmitting}
        />
        <TextField
          required
          margin="dense"
          id="abbreviation"
          label="Abbreviation"
          type="text"
          fullWidth
          variant="outlined"
          value={abbreviation}
          onChange={(e) => setAbbreviation(e.target.value)}
          disabled={isSubmitting}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isEditing ? 'Save Changes' : 'Add Unit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UnitFormModal;