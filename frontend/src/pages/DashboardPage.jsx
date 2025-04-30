import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InventoryIcon from '@mui/icons-material/Inventory'; // Example Icons
import WarningIcon from '@mui/icons-material/Warning';
import EventBusyIcon from '@mui/icons-material/EventBusy';

import apiClient from '../services/api';

function DashboardPage() {
  // State for summary data
  const [summaryData, setSummaryData] = useState({
    totalItems: null,
    lowStockCount: null,
    expiringCount: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummaryData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch data concurrently
        const [itemsRes, lowStockRes, expiringRes] = await Promise.all([
          apiClient.get('/items'),
          apiClient.get('/reports/low-stock'),
          apiClient.get('/reports/expirations?days=7') // Check for next 7 days by default
        ]);

        setSummaryData({
          totalItems: itemsRes.data?.length ?? 0,
          lowStockCount: lowStockRes.data?.length ?? 0,
          expiringCount: expiringRes.data?.length ?? 0,
        });

      } catch (err) {
        console.error("Failed to fetch dashboard summary data:", err);
        setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, []); // Fetch once on mount

  // Helper to render summary card content
  const renderSummaryValue = (value) => {
      if (loading) return <CircularProgress size={24} />;
      if (error) return '--'; // Show dash on error
      return value ?? '--'; // Show dash if value is null/undefined
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>

       {error && (
           <Alert severity="error" sx={{ mb: 2 }}>
             {`Failed to load dashboard data: ${error}`}
           </Alert>
       )}

      <Grid container spacing={3}>
        {/* Total Items Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon color="primary" sx={{ fontSize: 40 }}/>
            <Box>
                <Typography variant="h6">Total Items</Typography>
                <Typography variant="h4" color="primary">{renderSummaryValue(summaryData.totalItems)}</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Low Stock Items Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
             <WarningIcon color="warning" sx={{ fontSize: 40 }}/>
             <Box>
                <Typography variant="h6">Low Stock Items</Typography>
                <Typography variant="h4" color="warning.main">{renderSummaryValue(summaryData.lowStockCount)}</Typography>
             </Box>
          </Paper>
        </Grid>

        {/* Expiring Soon Card */}
         <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
             <EventBusyIcon color="error" sx={{ fontSize: 40 }}/>
             <Box>
                <Typography variant="h6">Expiring Soon (7d)</Typography>
                <Typography variant="h4" color="error.main">{renderSummaryValue(summaryData.expiringCount)}</Typography>
             </Box>
          </Paper>
        </Grid>

        {/* Add more dashboard elements here - charts, recent activity, etc. */}
         <Grid item xs={12}>
             <Paper sx={{ p: 2 }}>
                 <Typography variant="h6">Recent Activity / Quick Links</Typography>
                 <Typography variant="body1" sx={{ mt: 1}}>
                     (Dashboard content to be implemented - e.g., links to add item, record delivery, view reports)
                 </Typography>
                 {/* Links to other sections */}
             </Paper>
         </Grid>
      </Grid>
    </Box>
  );
}

export default DashboardPage;