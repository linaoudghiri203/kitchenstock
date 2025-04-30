import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { format } from 'date-fns';

import apiClient from '../services/api';

// Helper function to format date strings (or return empty string)
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        return format(new Date(dateString), 'PP'); // e.g., Apr 30, 2025
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString;
    }
};

function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);
    setApiMessage(null);
    try {
      const response = await apiClient.get('/deliveries');
      setDeliveries(response.data);
    } catch (err) {
      console.error("Failed to fetch deliveries:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch deliveries';
      setError(errorMsg);
      setApiMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleAddDelivery = () => {
    console.log("Add Delivery clicked");
    setApiMessage({ type: 'info', text: 'Add functionality not yet implemented.' });
    // TODO: Implement Add Delivery modal/form
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Deliveries
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddDelivery}
        >
          Record Delivery
        </Button>
      </Box>

      {apiMessage && (
        <Alert severity={apiMessage.type} sx={{ mb: 2 }} onClose={() => setApiMessage(null)}>
          {apiMessage.text}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
           <Alert severity="error" sx={{ mb: 2 }}>
             {error}
           </Alert>
      )}

      {!loading && !error && deliveries.length === 0 && (
         <Typography sx={{ textAlign: 'center', mt: 3 }}>No deliveries recorded yet.</Typography>
      )}

      {/* Display Deliveries using Accordions */}
      {!loading && !error && deliveries.length > 0 && (
        <Box>
          {deliveries.map((delivery) => (
            <Accordion key={delivery.deliveryid} sx={{ mb: 1 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`delivery-${delivery.deliveryid}-content`}
                id={`delivery-${delivery.deliveryid}-header`}
              >
                <Typography sx={{ width: '33%', flexShrink: 0 }}>
                  ID: {delivery.deliveryid} - {formatDate(delivery.deliverydate)}
                </Typography>
                <Typography sx={{ color: 'text.secondary' }}>
                  Supplier: {delivery.suppliername || 'N/A'} {delivery.invoicenumber ? `(Inv: ${delivery.invoicenumber})` : ''}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>Items Received:</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" aria-label="delivery items">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item ID</TableCell>
                        <TableCell>Item Name</TableCell>
                        <TableCell align="right">Qty Recvd</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Expires</TableCell>
                        <TableCell align="right">Cost/Unit</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {delivery.items && delivery.items.length > 0 ? (
                        delivery.items.map((item, index) => (
                          <TableRow key={`${item.itemid}-${index}`}>
                            <TableCell>{item.itemid}</TableCell>
                            <TableCell>{item.itemname}</TableCell>
                            <TableCell align="right">{parseFloat(item.quantityreceived).toFixed(2)}</TableCell>
                            <TableCell>{item.unitabbreviation}</TableCell>
                            <TableCell>{formatDate(item.expirationdate) || '-'}</TableCell>
                            <TableCell align="right">{item.costperunit ? `$${parseFloat(item.costperunit).toFixed(2)}` : '-'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">No items listed for this delivery.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default DeliveriesPage;