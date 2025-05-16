
import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

import apiClient from '../services/api';
import { format, parseISO } from 'date-fns';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = typeof dateString === 'string' && dateString.length === 10 ? parseISO(dateString + 'T00:00:00') : new Date(dateString);
        return format(date, 'PP');
    } catch (e) {
        return dateString;
    }
};

function DashboardPage() {
  const [summaryData, setSummaryData] = useState({
    totalItems: null,
    lowStockCount: null,
    expiringCount: null,
  });
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingSummary(true);
      setLoadingDeliveries(true);
      setError(null);
      try {
        const [itemsRes, lowStockRes, expiringRes, deliveriesRes] = await Promise.all([
          apiClient.get('/items'),
          apiClient.get('/reports/low-stock'),
          apiClient.get('/reports/expirations?days=7'),
          apiClient.get('/deliveries?limit=3')
        ]);

        setSummaryData({
          totalItems: itemsRes.data?.length ?? 0,
          lowStockCount: lowStockRes.data?.length ?? 0,
          expiringCount: expiringRes.data?.length ?? 0,
        });
        setRecentDeliveries(deliveriesRes.data || []);

      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
      } finally {
        setLoadingSummary(false);
        setLoadingDeliveries(false);
      }
    };

    fetchDashboardData();
  }, []);

  const renderSummaryValue = (value, isLoading) => {
      if (isLoading) return <CircularProgress size={24} />;
      if (error) return <Typography color="error" variant="h5">!</Typography>;
      return value !== null ? value : '--';
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>

       {error && !loadingSummary && !loadingDeliveries && (
           <Alert severity="error" sx={{ mb: 2 }}>
             {`Failed to load some dashboard data: ${error}`}
           </Alert>
       )}

      <Grid container spacing={3}>
        {}
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon color="primary" sx={{ fontSize: 40 }}/>
            <Box>
                <Typography variant="subtitle1" color="text.secondary">Total Items</Typography>
                <Typography variant="h4" color="primary">{renderSummaryValue(summaryData.totalItems, loadingSummary)}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
             <WarningIcon color="warning" sx={{ fontSize: 40 }}/>
             <Box>
                <Typography variant="subtitle1" color="text.secondary">Low Stock Items</Typography>
                <Typography variant="h4" color="warning.main">{renderSummaryValue(summaryData.lowStockCount, loadingSummary)}</Typography>
             </Box>
          </Paper>
        </Grid>
         <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
             <EventBusyIcon color="error" sx={{ fontSize: 40 }}/>
             <Box>
                <Typography variant="subtitle1" color="text.secondary">Expiring Soon (7d)</Typography>
                <Typography variant="h4" color="error.main">{renderSummaryValue(summaryData.expiringCount, loadingSummary)}</Typography>
             </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid direction="column" container spacing={3} paddingTop={3}>
        {}
        <Grid item size={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="outlined" startIcon={<PlaylistAddIcon />} onClick={() => navigate('/inventory')}>Manage Inventory</Button>
              <Button variant="outlined" startIcon={<AddShoppingCartIcon />} onClick={() => navigate('/deliveries')}>Record Delivery</Button>
              <Button variant="outlined" startIcon={<PointOfSaleIcon />} onClick={() => navigate('/menu-items')}>Record Sale</Button>
              {}
            </Box>
          </Paper>
        </Grid>

          {}
          <Grid item size={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Recent Deliveries</Typography>
              {loadingDeliveries ? <CircularProgress /> : error ? <Alert severity="error">Could not load recent deliveries.</Alert> : (
                <List dense>
                  {recentDeliveries.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No recent deliveries.</Typography>
                  ) : (
                    recentDeliveries.map((delivery, index) => (
                      <React.Fragment key={delivery.deliveryid}>
                        <ListItem
                          secondaryAction={
                            <Typography variant="caption">{formatDate(delivery.deliverydate)}</Typography>
                          }
                        >
                          <ListItemText
                            primary={`ID: ${delivery.deliveryid} - ${delivery.suppliername || 'N/A'}`}
                            secondary={delivery.invoicenumber ? `Inv: ${delivery.invoicenumber}` : 'No invoice'}
                          />
                        </ListItem>
                        {index < recentDeliveries.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  )}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
    </Box>
  );
}

export default DashboardPage;