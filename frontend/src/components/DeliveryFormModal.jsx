import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid,
  IconButton, Typography, Box, CircularProgress, Alert, Paper,
  Select, MenuItem, FormControl, InputLabel, FormHelperText
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { format } from 'date-fns';

import apiClient from '../services/api';

const initialDeliveryItemState = {
  itemid: '',
  quantityreceived: '',
  unitid: '',
  expirationdate: '',
  costperunit: '',
};

function DeliveryFormModal({ open, onClose, onSubmit }) {
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState([{ ...initialDeliveryItemState, id: Date.now() }]);

  const [suppliers, setSuppliers] = useState([]);
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
        const [suppliersRes, itemsRes, unitsRes] = await Promise.all([
          apiClient.get('/suppliers'),
          apiClient.get('/items'),
          apiClient.get('/units'),
        ]);
        setSuppliers(suppliersRes.data || []);
        setInventoryItems(itemsRes.data || []);
        setUnits(unitsRes.data || []);
      } catch (error) {
        console.error("Failed to fetch dropdown data for delivery form:", error);
        setDropdownError("Could not load options. Please ensure backend is running and try again.");
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, [open]);

  useEffect(() => {
    if (open) {
      setDeliveryDate(format(new Date(), 'yyyy-MM-dd'));
      setSupplierId('');
      setInvoiceNumber('');
      setItems([{ ...initialDeliveryItemState, id: Date.now() }]);
      setSubmitError(null);
    }
  }, [open]);


  const handleItemChange = (index, event) => {
    const newItems = [...items];
    newItems[index][event.target.name] = event.target.value;

    if (event.target.name === 'itemid' && event.target.value) {
        const selectedInvItem = inventoryItems.find(inv => inv.itemid === parseInt(event.target.value, 10));
        if (selectedInvItem && selectedInvItem.unitid) {
            newItems[index].unitid = selectedInvItem.unitid;
        } else {
            newItems[index].unitid = '';
        }
    }
    setItems(newItems);
  };

  const handleAddItemField = () => {
    setItems([...items, { ...initialDeliveryItemState, id: Date.now() }]);
  };

  const handleRemoveItemField = (idToRemove) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== idToRemove));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const deliveryData = {
      supplierid: supplierId || null,
      deliverydate: deliveryDate,
      invoicenumber: invoiceNumber || null,
      items: items.map(({ id, ...item }) => ({
        itemid: parseInt(item.itemid, 10),
        quantityreceived: parseFloat(item.quantityreceived),
        unitid: parseInt(item.unitid, 10),
        expirationdate: item.expirationdate || null,
        costperunit: item.costperunit ? parseFloat(item.costperunit) : null,
      })),
    };

    if (deliveryData.items.some(item => isNaN(item.itemid) || item.itemid === '' || isNaN(item.quantityreceived) || item.quantityreceived <= 0 || isNaN(item.unitid) || item.unitid === '')) {
        setSubmitError("All delivery items must have a selected item, a positive quantity, and a selected unit.");
        setIsSubmitting(false);
        return;
    }
    if (!deliveryData.deliverydate) {
        setSubmitError("Delivery date is required.");
        setIsSubmitting(false);
        return;
    }


    try {
      await onSubmit(deliveryData);
      handleClose();
    } catch (error) {
      console.error("Delivery submission failed:", error);
      setSubmitError(error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to record delivery.');
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
    <Dialog open={open} onClose={handleClose} PaperProps={{ component: 'form', onSubmit: handleSubmit }} maxWidth="lg" fullWidth>
      <DialogTitle>Record New Delivery</DialogTitle>
      <DialogContent>
        {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
        {dropdownError && <Alert severity="warning" sx={{ mb: 2 }}>{dropdownError}</Alert>}

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              required
              margin="dense"
              id="deliverydate"
              name="deliverydate"
              label="Delivery Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth margin="dense" disabled={loadingDropdowns}>
              <InputLabel id="supplierid-label">Supplier (Optional)</InputLabel>
              <Select
                labelId="supplierid-label"
                id="supplierid"
                name="supplierid"
                value={supplierId}
                label="Supplier (Optional)"
                onChange={(e) => setSupplierId(e.target.value)}
                disabled={isSubmitting || loadingDropdowns}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {suppliers.map((sup) => (
                  <MenuItem key={sup.supplierid} value={sup.supplierid}>
                    {sup.suppliername}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              margin="dense"
              id="invoicenumber"
              name="invoicenumber"
              label="Invoice Number (Optional)"
              type="text"
              fullWidth
              variant="outlined"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={isSubmitting}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 2, mb: 0 }}>Items Received</Typography>
          </Grid>

          {items.map((item, index) => (
            <Grid item xs={12} key={item.id}>
              <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 1, position: 'relative' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth margin="dense" required disabled={loadingDropdowns}>
                      <InputLabel id={`itemid-label-${index}`}>Item</InputLabel>
                      <Select
                        labelId={`itemid-label-${index}`}
                        id={`itemid-${index}`}
                        name="itemid"
                        value={item.itemid}
                        label="Item"
                        onChange={(e) => handleItemChange(index, e)}
                        disabled={isSubmitting || loadingDropdowns}
                      >
                        <MenuItem value=""><em>Select Item</em></MenuItem>
                        {inventoryItems.map((invItem) => (
                          <MenuItem key={invItem.itemid} value={invItem.itemid}>
                            {invItem.itemname} ({invItem.unit_abbreviation || invItem.unit_name})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      required
                      margin="dense"
                      name="quantityreceived"
                      label="Qty Recvd"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={item.quantityreceived}
                      onChange={(e) => handleItemChange(index, e)}
                      disabled={isSubmitting}
                      inputProps={{ min: 0.0001, step: "any" }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <FormControl fullWidth margin="dense" required disabled={loadingDropdowns}>
                      <InputLabel id={`unitid-label-${index}`}>Unit</InputLabel>
                      <Select
                        labelId={`unitid-label-${index}`}
                        id={`unitid-${index}`}
                        name="unitid"
                        value={item.unitid}
                        label="Unit"
                        onChange={(e) => handleItemChange(index, e)}
                        disabled={isSubmitting || loadingDropdowns}
                      >
                        <MenuItem value=""><em>Select Unit</em></MenuItem>
                        {units.map((u) => (
                          <MenuItem key={u.unitid} value={u.unitid}>
                            {u.abbreviation} ({u.unit})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      margin="dense"
                      name="expirationdate"
                      label="Expires (Opt.)"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                      value={item.expirationdate}
                      onChange={(e) => handleItemChange(index, e)}
                      disabled={isSubmitting}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      margin="dense"
                      name="costperunit"
                      label="Cost/Unit (Opt.)"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={item.costperunit}
                      onChange={(e) => handleItemChange(index, e)}
                      disabled={isSubmitting}
                      inputProps={{ min: 0, step: "0.01" }}
                    />
                  </Grid>
                  <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {items.length > 1 && (
                      <IconButton
                        onClick={() => handleRemoveItemField(item.id)}
                        color="error"
                        disabled={isSubmitting}
                        title="Remove Item"
                        sx={{ mt: { xs: 0, md: 1 } }}
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleAddItemField}
              disabled={isSubmitting || loadingDropdowns}
              variant="outlined"
              size="small"
            >
              Add Another Item Line
            </Button>
          </Grid>
        </Grid>

      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || loadingDropdowns}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          Record Delivery
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeliveryFormModal;