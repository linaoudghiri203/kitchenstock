import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { format, parseISO } from 'date-fns';

import apiClient from '../services/api';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = typeof dateString === 'string' && dateString.length === 10 ? parseISO(dateString + 'T00:00:00') : new Date(dateString);
        return format(date, 'PP');
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString;
    }
};

function ReportsPage() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [wasteItems, setWasteItems] = useState([]);

  const [loading, setLoading] = useState({ lowStock: true, expirations: true, waste: true });
  const [error, setError] = useState({ lowStock: null, expirations: null, waste: null });

  const [expirationDays, setExpirationDays] = useState(7);
  const [includePastDue, setIncludePastDue] = useState(true);

  const fetchLowStockReport = async () => {
    setLoading(prev => ({ ...prev, lowStock: true }));
    setError(prev => ({ ...prev, lowStock: null }));
    try {
      const res = await apiClient.get('/reports/low-stock');
      setLowStockItems(res.data);
    } catch (err) {
      setError(prev => ({ ...prev, lowStock: err.response?.data?.error || err.message || 'Failed to fetch low stock report' }));
    } finally {
      setLoading(prev => ({ ...prev, lowStock: false }));
    }
  };

  const fetchExpirationReport = async () => {
    setLoading(prev => ({ ...prev, expirations: true }));
    setError(prev => ({ ...prev, expirations: null }));
    try {
      const res = await apiClient.get(`/reports/expirations?days=${expirationDays}&includePastDue=${includePastDue}`);
      setExpiringItems(res.data);
    } catch (err) {
      setError(prev => ({ ...prev, expirations: err.response?.data?.error || err.message || 'Failed to fetch expiration report' }));
    } finally {
      setLoading(prev => ({ ...prev, expirations: false }));
    }
  };

  const fetchWasteReport = async () => {
    setLoading(prev => ({ ...prev, waste: true }));
    setError(prev => ({ ...prev, waste: null }));
    try {
      const res = await apiClient.get('/reports/waste');
      setWasteItems(res.data);
    } catch (err) {
      setError(prev => ({ ...prev, waste: err.response?.data?.error || err.message || 'Failed to fetch waste report' }));
    } finally {
      setLoading(prev => ({ ...prev, waste: false }));
    }
  };

  useEffect(() => {
    fetchLowStockReport();
    fetchWasteReport();
  }, []);

  useEffect(() => {
    fetchExpirationReport();
  }, [expirationDays, includePastDue]);


  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Reports
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={4}>
          <Typography variant="h6" component="h2" gutterBottom>Low Stock Items</Typography>
          {loading.lowStock ? (
            <CircularProgress />
          ) : error.lowStock ? (
            <Alert severity="error">{error.lowStock}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small" aria-label="low stock items table">
                <TableHead sx={{ backgroundColor: 'grey.200' }}>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Reorder</TableCell>
                    <TableCell>Unit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStockItems.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center">No items are low on stock.</TableCell></TableRow>
                  ) : (
                    lowStockItems.map((item) => (
                      <TableRow key={item.itemid} sx={{ '&:hover': { backgroundColor: 'action.hover'} }}>
                        <TableCell>{item.itemname}</TableCell>
                        <TableCell>{item.categoryname}</TableCell>
                        <TableCell align="right">{parseFloat(item.quantityonhand).toFixed(2)}</TableCell>
                        <TableCell align="right">{parseFloat(item.reorderpoint).toFixed(2)}</TableCell>
                        <TableCell>{item.unit_abbreviation}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h2" gutterBottom>Expiring Soon / Past Due</Typography>
            <TextField
                label="Days"
                type="number"
                size="small"
                value={expirationDays}
                onChange={(e) => setExpirationDays(Math.max(0, parseInt(e.target.value,10) || 0))}
                inputProps={{min: 0}}
                sx={{width: '80px', mb:1}}
            />
          </Box>
           <Typography variant="caption" display="block" gutterBottom>
             Note: Based on delivery item records, may not reflect current stock batches.
           </Typography>
          {loading.expirations ? (
            <CircularProgress />
          ) : error.expirations ? (
            <Alert severity="error">{error.expirations}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small" aria-label="expiring items table">
                <TableHead sx={{ backgroundColor: 'grey.200' }}>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Item Type</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Delivered On</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell align="right">Qty Recvd</TableCell>
                    <TableCell>Unit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiringItems.length === 0 ? (
                     <TableRow><TableCell colSpan={7} align="center">No items expiring in the selected timeframe.</TableCell></TableRow>
                  ) : (
                    expiringItems.map((item, index) => (
                      <TableRow key={`${item.deliveryid}-${item.itemid}-${index}`} sx={{ '&:hover': { backgroundColor: 'action.hover'} }}>
                        <TableCell>{item.itemname}</TableCell>
                        <TableCell>{item.itemtype}</TableCell>
                        <TableCell sx={{ color: new Date(item.expirationdate) < new Date() ? 'error.main' : 'inherit' }}>
                            {formatDate(item.expirationdate)}
                        </TableCell>
                        <TableCell>{formatDate(item.delivery_received_date)}</TableCell>
                        <TableCell>{item.suppliername || '-'}</TableCell>
                        <TableCell align="right">{parseFloat(item.quantity_from_delivery).toFixed(2)}</TableCell>
                        <TableCell>{item.delivery_item_unit_abbreviation}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Typography variant="h6" component="h2" gutterBottom>Waste Records</Typography>
          {loading.waste ? (
            <CircularProgress />
          ) : error.waste ? (
            <Alert severity="error">{error.waste}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small" aria-label="waste records table">
                <TableHead sx={{ backgroundColor: 'grey.200' }}>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wasteItems.length === 0 ? (
                     <TableRow><TableCell colSpan={5} align="center">No waste recorded.</TableCell></TableRow>
                  ) : (
                    wasteItems.map((item) => (
                      <TableRow key={item.wasteid} sx={{ '&:hover': { backgroundColor: 'action.hover'} }}>
                        <TableCell>{formatDate(item.wastedate)}</TableCell>
                        <TableCell>{item.itemname}</TableCell>
                        <TableCell align="right">{parseFloat(item.quantitywasted).toFixed(2)}</TableCell>
                        <TableCell>{item.waste_unit_abbreviation}</TableCell>
                        <TableCell>{item.reason || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default ReportsPage;