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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

import apiClient from '../services/api';
import UnitFormModal from '../components/UnitFormModal';

function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  const fetchUnits = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get('/units');
        setUnits(response.data);
      } catch (err) {
        console.error("Failed to fetch units:", err);
        const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch units';
        setError(errorMsg);
        setApiMessage({ type: 'error', text: errorMsg });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleOpenAddModal = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
    setApiMessage(null);
  };

  const handleOpenEditModal = (unit) => {
    setEditingUnit(unit);
    setIsModalOpen(true);
    setApiMessage(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
  };

  const handleModalSubmit = async (unitData, unitId) => {
    setApiMessage(null);
    try {
      let response;
      if (unitId) {
        console.log(`Updating unit ${unitId} with data:`, unitData);
        response = await apiClient.put(`/units/${unitId}`, unitData);
        setApiMessage({ type: 'success', text: `Unit "${response.data.unit}" updated successfully.` });
      } else {
        console.log("Adding new unit with data:", unitData);
        response = await apiClient.post('/units', unitData);
        setApiMessage({ type: 'success', text: `Unit "${response.data.unit}" added successfully.` });
      }
      fetchUnits();
      return Promise.resolve();
    } catch (err) {
      console.error("Failed to save unit:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save unit';
      setApiMessage({ type: 'error', text: `Failed to save unit: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };

  const handleDeleteUnit = async (unitId) => {
    console.log("Delete Unit clicked for ID:", unitId);
    setApiMessage(null);
    setError(null);
    const unitToDelete = units.find(u => u.unitid === unitId);
    const unitName = unitToDelete ? `${unitToDelete.unit} (${unitToDelete.abbreviation})` : `ID ${unitId}`;

    if (window.confirm(`Are you sure you want to delete unit "${unitName}"? This cannot be undone.`)) {
        try {
            await apiClient.delete(`/units/${unitId}`);
            setUnits(currentUnits => currentUnits.filter(unit => unit.unitid !== unitId));
            setApiMessage({ type: 'success', text: `Unit "${unitName}" deleted successfully.` });
        } catch (err) {
            console.error(`Failed to delete unit ${unitId}:`, err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to delete unit';
            setError(errorMsg);
            setApiMessage({ type: 'error', text: errorMsg });
        }
    }
  };


  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Units of Measure
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddModal}
        >
          Add Unit
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

      {!loading && (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="units of measure table">
              <TableHead sx={{ backgroundColor: 'grey.200' }}>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Unit Name</TableCell>
                  <TableCell>Abbreviation</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.length === 0 && !error ? (
                     <TableRow>
                        <TableCell colSpan={4} align="center">No units found. Create one!</TableCell>
                     </TableRow>
                ) : (
                    units.map((unit) => (
                    <TableRow
                        key={unit.unitid}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'action.hover'} }}
                    >
                        <TableCell component="th" scope="row">
                        {unit.unitid}
                        </TableCell>
                        <TableCell>{unit.unit}</TableCell>
                        <TableCell>{unit.abbreviation}</TableCell>
                        <TableCell align="right">
                        <IconButton
                            aria-label="edit"
                            size="small"
                            onClick={() => handleOpenEditModal(unit)}
                            sx={{ mr: 1 }}
                            title="Edit Unit"
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            aria-label="delete"
                            size="small"
                            onClick={() => handleDeleteUnit(unit.unitid)}
                            color="error"
                            title="Delete Unit"
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                        </TableCell>
                    </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
      )}

       <UnitFormModal
            open={isModalOpen}
            onClose={handleModalClose}
            onSubmit={handleModalSubmit}
            initialData={editingUnit}
       />
    </Box>
  );
}

export default UnitsPage;