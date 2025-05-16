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
import { format, parseISO } from 'date-fns';

import apiClient from '../services/api';
import DeliveryFormModal from '../components/DeliveryFormModal';

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

function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);
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

  const handleOpenAddDeliveryModal = () => {
    setIsModalOpen(true);
    setApiMessage(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSubmit = async (deliveryData) => {
    setApiMessage(null);
    try {
      const response = await apiClient.post('/deliveries', deliveryData);
      setApiMessage({ type: 'success', text: `Delivery (ID: ${response.data.deliveryid}) recorded successfully.` });
      fetchDeliveries();
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to record delivery.';
      setApiMessage({ type: 'error', text: `Failed to record delivery: ${errorMsg}` });
      throw new Error(errorMsg);
    }
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
          onClick={handleOpenAddDeliveryModal}
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

      {!loading && error && !apiMessage && (
           <Alert severity="error" sx={{ mb: 2 }}>
             {error}
           </Alert>
      )}

      {!loading && !error && deliveries.length === 0 && (
         <Typography sx={{ textAlign: 'center', mt: 3 }}>No deliveries recorded yet. Click "Record Delivery" to add one.</Typography>
      )}

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
                <Typography sx={{ color: 'text.secondary', flexGrow: 1 }}>
                  Supplier: {delivery.suppliername || 'N/A'}
                </Typography>
                {delivery.invoicenumber && (
                    <Typography sx={{ color: 'text.secondary', ml: 2 }}>
                        Inv: {delivery.invoicenumber}
                    </Typography>
                )}
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>Items Received:</Typography>
                {delivery.items && delivery.items.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                    <Table size="small" aria-label="delivery items">
                        <TableHead>
                        <TableRow>
                            <TableCell>Item ID</TableCell>
                            <TableCell>Item Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell align="right">Qty Recvd</TableCell>
                            <TableCell>Unit</TableCell>
                            <TableCell>Expires</TableCell>
                            <TableCell align="right">Cost/Unit</TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                        {delivery.items.map((item, index) => (
                            <TableRow key={`${item.itemid}-${index}`}>
                            <TableCell>{item.itemid}</TableCell>
                            <TableCell>{item.itemname}</TableCell>
                            <TableCell>{item.itemtype || 'N/A'}</TableCell>
                            <TableCell align="right">{parseFloat(item.quantityreceived).toFixed(2)}</TableCell>
                            <TableCell>{item.unitabbreviation || item.unitname}</TableCell>
                            <TableCell>{formatDate(item.expirationdate)}</TableCell>
                            <TableCell align="right">{item.costperunit ? `$${parseFloat(item.costperunit).toFixed(2)}` : '-'}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>No items listed for this delivery.</Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      <DeliveryFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />
    </Box>
  );
}

export default DeliveriesPage;