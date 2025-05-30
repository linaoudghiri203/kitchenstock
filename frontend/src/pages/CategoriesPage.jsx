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
import CategoryFormModal from '../components/CategoryFormModal';

function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch categories';
      setError(errorMsg);
      setApiMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
    setApiMessage(null);
  };

  const handleOpenEditModal = (category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
    setApiMessage(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleModalSubmit = async (categoryData, categoryId) => {
    setApiMessage(null);
    try {
      let response;
      if (categoryId) {
        response = await apiClient.put(`/categories/${categoryId}`, categoryData);
        setApiMessage({ type: 'success', text: `Category "${response.data.categoryname}" updated successfully.` });
      } else {
        response = await apiClient.post('/categories', categoryData);
        setApiMessage({ type: 'success', text: `Category "${response.data.categoryname}" added successfully.` });
      }
      fetchCategories();
      return Promise.resolve();
    } catch (err) {
      console.error("Failed to save category:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save category';
      setApiMessage({ type: 'error', text: `Failed to save category: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    console.log("Delete Category clicked for ID:", categoryId);
    setApiMessage(null);
    setError(null);

    if (window.confirm(`Are you sure you want to delete category "${categoryName}"? This cannot be undone.`)) {
      try {
        await apiClient.delete(`/categories/${categoryId}`);
        setCategories(currentCategories => currentCategories.filter(cat => cat.categoryid !== categoryId));
        setApiMessage({ type: 'success', text: `Category "${categoryName}" deleted successfully.` });
      } catch (err) {
        console.error(`Failed to delete category ${categoryId}:`, err);
        const errorMsg = err.response?.data?.error || err.message || 'Failed to delete category';
        setError(errorMsg);
        setApiMessage({ type: 'error', text: errorMsg });
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Categories
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddModal}
        >
          Add Category
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
          <Table sx={{ minWidth: 650 }} aria-label="categories table">
            <TableHead sx={{ backgroundColor: 'grey.200' }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 && !error ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">No categories found. Create one!</TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow
                    key={category.categoryid}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'action.hover'} }}
                  >
                    <TableCell component="th" scope="row">{category.categoryid}</TableCell>
                    <TableCell>{category.categoryname}</TableCell>
                    <TableCell>{category.description || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label="edit"
                        size="small"
                        onClick={() => handleOpenEditModal(category)}
                        sx={{ mr: 1 }}
                        title="Edit Category"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="delete"
                        size="small"
                        onClick={() => handleDeleteCategory(category.categoryid, category.categoryname)}
                        color="error"
                        title="Delete Category"
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

      <CategoryFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        initialData={editingCategory}
      />
    </Box>
  );
}

export default CategoriesPage;