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
import Grid from '@mui/material/Grid'; // For layout
import { format } from 'date-fns'; // For formatting dates

import apiClient from '../services/api'; // Import the configured Axios instance

// Helper function to format date strings (or return empty string)
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        // Assuming dateString is like 'YYYY-MM-DD' or a full ISO string
        return format(new Date(dateString), 'PP'); // e.g., Apr 30, 2025
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString; // Return original string if formatting fails
    }
};

function ReportsPage() {
  // State for each report
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [wasteItems, setWasteItems] = useState([]);

  // Loading and error states (can be combined or separate)
  const [loading, setLoading] = useState({ lowStock: true, expirations: true, waste: true });
  const [error, setError] = useState({ lowStock: null, expirations: null, waste: null });

  // Fetch all reports on component mount
  useEffect(() => {
    const fetchReports = async () => {
      // Fetch Low Stock
      try {
        setLoading(prev => ({ ...prev, lowStock: true }));
        setError(prev => ({ ...prev, lowStock: null }));
        const res = await apiClient.get('/reports/low-stock');
        setLowStockItems(res.data);
      } catch (err) {
        console.error("Failed to fetch low stock report:", err);
        setError(prev => ({ ...prev, lowStock: err.response?.data?.error || err.message || 'Failed to fetch low stock report' }));
      } finally {
        setLoading(prev => ({ ...prev, lowStock: false }));
      }

      // Fetch Expirations (default: next 7 days + past due)
      try {
        setLoading(prev => ({ ...prev, expirations: true }));
        setError(prev => ({ ...prev, expirations: null }));
        const res = await apiClient.get('/reports/expirations?days=7'); // Example: Fetch for next 7 days
        setExpiringItems(res.data);
      } catch (err) {
        console.error("Failed to fetch expiration report:", err);
        setError(prev => ({ ...prev, expirations: err.response?.data?.error || err.message || 'Failed to fetch expiration report' }));
      } finally {
        setLoading(prev => ({ ...prev, expirations: false }));
      }

      // Fetch Waste
      try {
        setLoading(prev => ({ ...prev, waste: true }));
        setError(prev => ({ ...prev, waste: null }));
        const res = await apiClient.get('/reports/waste');
        setWasteItems(res.data);
      } catch (err) {
        console.error("Failed to fetch waste report:", err);
        setError(prev => ({ ...prev, waste: err.response?.data?.error || err.message || 'Failed to fetch waste report' }));
      } finally {
        setLoading(prev => ({ ...prev, waste: false }));
      }
    };

    fetchReports();
  }, []); // Empty dependency array means this effect runs only once on mount

  // --- Render Logic ---
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Reports
      </Typography>

      <Grid container spacing={3}>
        {/* Low Stock Report Section */}
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
                        <TableCell>{item.unitabbreviation}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>

        {/* Expiration Report Section */}
        <Grid item xs={12} md={6} lg={4}>
          <Typography variant="h6" component="h2" gutterBottom>Expiring Soon / Past Due</Typography>
           <Typography variant="caption" display="block" gutterBottom>
             Note: Based on delivery records, may not reflect current stock batches.
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
                    <TableCell>Expires</TableCell>
                    <TableCell>Delivered</TableCell>
                    <TableCell>Supplier</TableCell>
                    {/* <TableCell align="right">Qty Recvd</TableCell> */}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiringItems.length === 0 ? (
                     <TableRow><TableCell colSpan={4} align="center">No items expiring soon or past due.</TableCell></TableRow>
                  ) : (
                    expiringItems.map((item, index) => ( // Use index for key if IDs aren't unique across deliveries
                      <TableRow key={`${item.deliveryid}-${item.itemid}-${index}`} sx={{ '&:hover': { backgroundColor: 'action.hover'} }}>
                        <TableCell>{item.itemname}</TableCell>
                        <TableCell sx={{ color: new Date(item.expirationdate) < new Date() ? 'error.main' : 'inherit' }}>
                            {formatDate(item.expirationdate)}
                        </TableCell>
                        <TableCell>{formatDate(item.deliverydate)}</TableCell>
                        <TableCell>{item.suppliername || '-'}</TableCell>
                        {/* <TableCell align="right">{parseFloat(item.quantityreceived).toFixed(2)} {item.unitabbreviation}</TableCell> */}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>

        {/* Waste Report Section */}
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
                        <TableCell>{item.unitabbreviation}</TableCell>
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