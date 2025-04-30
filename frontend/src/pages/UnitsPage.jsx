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
import AddIcon from '@mui/icons-material/Add'; // Example Icon
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

import apiClient from '../services/api'; // Import the configured Axios instance

function UnitsPage() {
  // State variables
  const [units, setUnits] = useState([]); // Stores the list of units
  const [loading, setLoading] = useState(true); // Indicates if data is being loaded
  const [error, setError] = useState(null); // Stores any error during fetch

  // Fetch units from the API when the component mounts
  useEffect(() => {
    const fetchUnits = async () => {
      setLoading(true); // Start loading
      setError(null); // Reset error state
      try {
        const response = await apiClient.get('/units');
        setUnits(response.data); // Update state with fetched units
      } catch (err) {
        console.error("Failed to fetch units:", err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch units'); // Set error message
      } finally {
        setLoading(false); // Stop loading regardless of success or failure
      }
    };

    fetchUnits();
  }, []); // Empty dependency array means this effect runs only once on mount

  // Handler functions for future actions (Add, Edit, Delete)
  const handleAddUnit = () => {
    console.log("Add Unit clicked");
    // TODO: Implement logic to open a modal or navigate to an add form
  };

  const handleEditUnit = (unitId) => {
    console.log("Edit Unit clicked for ID:", unitId);
     // TODO: Implement logic to open a modal or navigate to an edit form
  };

    const handleDeleteUnit = async (unitId) => {
    console.log("Delete Unit clicked for ID:", unitId);
    if (window.confirm(`Are you sure you want to delete unit ID ${unitId}? This cannot be undone.`)) {
        try {
            await apiClient.delete(`/units/${unitId}`);
            // Refresh the list after successful deletion
            setUnits(units.filter(unit => unit.unitid !== unitId));
             // TODO: Add success notification (e.g., using a Snackbar)
        } catch (err) {
            console.error(`Failed to delete unit ${unitId}:`, err);
            setError(err.response?.data?.error || err.message || 'Failed to delete unit');
             // TODO: Add error notification
        }
    }
  };


  // --- Render Logic ---

  // Display loading indicator
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Units of Measure
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddUnit}
        >
          Add Unit
        </Button>
      </Box>

      {/* Display error message if fetch failed */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Display the table with units */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="units of measure table">
          <TableHead sx={{ backgroundColor: 'grey.200' /* Lighter header */ }}>
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
                    <TableCell colSpan={4} align="center">No units found.</TableCell>
                 </TableRow>
            ) : (
                units.map((unit) => (
                <TableRow
                    key={unit.unitid} // Use lowercase from backend response
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                    <TableCell component="th" scope="row">
                    {unit.unitid}
                    </TableCell>
                    <TableCell>{unit.unit}</TableCell> {/* Use lowercase 'unit' */}
                    <TableCell>{unit.abbreviation}</TableCell> {/* Use lowercase 'abbreviation' */}
                    <TableCell align="right">
                    <IconButton
                        aria-label="edit"
                        size="small"
                        onClick={() => handleEditUnit(unit.unitid)}
                        sx={{ mr: 1 }}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        aria-label="delete"
                        size="small"
                        onClick={() => handleDeleteUnit(unit.unitid)}
                        color="error"
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
    </Box>
  );
}

export default UnitsPage;