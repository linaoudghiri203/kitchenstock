import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';

import apiClient from '../services/api';
import MenuItemFormModal from '../components/MenuItemFormModal';
import RecipeIngredientFormModal from '../components/RecipeIngredientFormModal';
import RecordSaleModal from '../components/RecordSaleModal';

function MenuItemsPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [ingredients, setIngredients] = useState({});
  const [loading, setLoading] = useState({ list: true, ingredients: {} });
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);

  const [isMenuItemModalOpen, setIsMenuItemModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);

  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [currentMenuItemIdForIngredient, setCurrentMenuItemIdForIngredient] = useState(null);

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  const fetchMenuItems = async () => {
    setLoading(prev => ({ ...prev, list: true }));
    setError(null);
    try {
      const response = await apiClient.get('/menu-items');
      setMenuItems(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch menu items';
      setError(errorMsg);
      setApiMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(prev => ({ ...prev, list: false }));
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchIngredients = async (menuItemId) => {
    if (ingredients[menuItemId] && !loading.ingredients[menuItemId]) {
    }
    setLoading(prev => ({ ...prev, ingredients: { ...prev.ingredients, [menuItemId]: true } }));
    try {
      const response = await apiClient.get(`/menu-items/${menuItemId}/ingredients`);
      setIngredients(prev => ({ ...prev, [menuItemId]: response.data }));
    } catch (err) {
       setApiMessage({ type: 'error', text: `Failed to load ingredients for item ${menuItemId}` });
       setIngredients(prev => ({...prev, [menuItemId]: []}));
    } finally {
      setLoading(prev => ({ ...prev, ingredients: { ...prev.ingredients, [menuItemId]: false } }));
    }
  };

  const handleOpenAddMenuItemModal = () => {
    setEditingMenuItem(null);
    setIsMenuItemModalOpen(true);
    setApiMessage(null);
  };

  const handleOpenEditMenuItemModal = (menuItem) => {
    setEditingMenuItem(menuItem);
    setIsMenuItemModalOpen(true);
    setApiMessage(null);
  };

  const handleMenuItemModalClose = () => {
    setIsMenuItemModalOpen(false);
    setEditingMenuItem(null);
  };

  const handleMenuItemModalSubmit = async (menuItemData, menuItemId) => {
    setApiMessage(null);
    try {
      let response;
      if (menuItemId) {
        response = await apiClient.put(`/menu-items/${menuItemId}`, menuItemData);
        setApiMessage({ type: 'success', text: `Menu item "${response.data.menuitemname}" updated successfully.` });
      } else {
        response = await apiClient.post('/menu-items', menuItemData);
        setApiMessage({ type: 'success', text: `Menu item "${response.data.menuitemname}" added successfully.` });
      }
      fetchMenuItems();
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save menu item';
      setApiMessage({ type: 'error', text: `Failed to save menu item: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };

  const handleDeleteMenuItem = async (menuItemId, menuItemName) => {
    setApiMessage(null);
    setError(null);
    if (window.confirm(`Are you sure you want to delete menu item "${menuItemName}"? This will also delete its recipe. This cannot be undone.`)) {
      try {
        await apiClient.delete(`/menu-items/${menuItemId}`);
        setMenuItems(currentItems => currentItems.filter(item => item.menuitemid !== menuItemId));
        setIngredients(currentIngredients => {
            const newIngredients = {...currentIngredients};
            delete newIngredients[menuItemId];
            return newIngredients;
        });
        setApiMessage({ type: 'success', text: `Menu item "${menuItemName}" deleted successfully.` });
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to delete menu item';
        setError(errorMsg);
        setApiMessage({ type: 'error', text: errorMsg });
      }
    }
  };

   const handleOpenAddIngredientModal = (menuItemId) => {
    setCurrentMenuItemIdForIngredient(menuItemId);
    setEditingIngredient(null);
    setIsIngredientModalOpen(true);
    setApiMessage(null);
  };

  const handleOpenEditIngredientModal = (menuItemId, ingredient) => {
    setCurrentMenuItemIdForIngredient(menuItemId);
    setEditingIngredient(ingredient);
    setIsIngredientModalOpen(true);
    setApiMessage(null);
  };

  const handleIngredientModalClose = () => {
    setIsIngredientModalOpen(false);
    setEditingIngredient(null);
    setCurrentMenuItemIdForIngredient(null);
  };

  const handleIngredientModalSubmit = async (ingredientData, menuItemIdForApi, ingredientItemId) => {
    setApiMessage(null);
    try {
      let response;
      if (ingredientItemId) {
        response = await apiClient.put(`/menu-items/${menuItemIdForApi}/ingredients/${ingredientItemId}`, ingredientData);
        setApiMessage({ type: 'success', text: `Ingredient "${response.data.itemname}" updated successfully.` });
      } else {
        response = await apiClient.post(`/menu-items/${menuItemIdForApi}/ingredients`, ingredientData);
        setApiMessage({ type: 'success', text: `Ingredient "${response.data.itemname}" added to recipe.` });
      }
      fetchIngredients(menuItemIdForApi);
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to save ingredient';
      setApiMessage({ type: 'error', text: `Failed to save ingredient: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };

  const handleDeleteIngredient = async (menuItemId, itemId, ingredientName) => {
     setApiMessage(null);
     if (window.confirm(`Are you sure you want to remove ingredient "${ingredientName}" from this recipe?`)) {
         try {
             await apiClient.delete(`/menu-items/${menuItemId}/ingredients/${itemId}`);
             fetchIngredients(menuItemId);
             setApiMessage({ type: 'success', text: `Ingredient "${ingredientName}" removed successfully.` });
         } catch (err) {
              const errorMsg = err.response?.data?.error || err.message || 'Failed to delete ingredient';
              setApiMessage({ type: 'error', text: errorMsg });
         }
     }
  };

  const handleOpenSaleModal = () => {
    setIsSaleModalOpen(true);
    setApiMessage(null);
  };

  const handleSaleModalClose = () => {
    setIsSaleModalOpen(false);
  };

  const handleSaleModalSubmit = async (saleData) => {
    setApiMessage(null);
    try {
      const response = await apiClient.post(`/usage/sale/${saleData.menuItemId}`, {
        quantitySold: saleData.quantitySold,
        usageDate: saleData.usageDate
      });
      setApiMessage({ type: 'success', text: response.data.message || 'Sale recorded successfully.' });
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to record sale.';
      setApiMessage({ type: 'error', text: `Sale recording failed: ${errorMsg}` });
      throw new Error(errorMsg);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h4" component="h1">
          Menu Items & Recipes
        </Typography>
        <Box>
            <Button
              variant="outlined"
              startIcon={<PointOfSaleIcon />}
              onClick={handleOpenSaleModal}
              sx={{ mr: 2 }}
            >
              Record Sale
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddMenuItemModal}
            >
              Add Menu Item
            </Button>
        </Box>
      </Box>

      {apiMessage && (
        <Alert severity={apiMessage.type} sx={{ mb: 2 }} onClose={() => setApiMessage(null)}>
          {apiMessage.text}
        </Alert>
      )}

      {loading.list && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

       {!loading.list && error && (
           <Alert severity="error" sx={{ mb: 2 }}>
             {error}
           </Alert>
      )}

      {!loading.list && !error && menuItems.length === 0 && (
         <Typography sx={{ textAlign: 'center', mt: 3 }}>No menu items found. Create one!</Typography>
      )}

      {!loading.list && !error && menuItems.length > 0 && (
        <Box>
          {menuItems.map((menuItem) => (
            <Accordion
                key={menuItem.menuitemid}
                sx={{ mb: 1 }}
                onChange={(event, isExpanded) => {
                    if (isExpanded) {
                        fetchIngredients(menuItem.menuitemid);
                    }
                }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`menuitem-${menuItem.menuitemid}-content`}
                id={`menuitem-${menuItem.menuitemid}-header`}
              >
                <RestaurantMenuIcon sx={{ mr: 1, color: 'action.active' }} />
                <Typography sx={{ width: '40%', flexShrink: 0 }}>
                  {menuItem.menuitemname} (ID: {menuItem.menuitemid})
                </Typography>
                <Typography sx={{ color: 'text.secondary', mr: 2, flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {menuItem.description || 'No description'}
                </Typography>
                 <Typography sx={{ color: 'text.secondary', fontWeight: 'bold', mr:2 }}>
                  {menuItem.price ? `$${parseFloat(menuItem.price).toFixed(2)}` : 'No price'}
                </Typography>
                  <IconButton
                        aria-label="edit menu item"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleOpenEditMenuItemModal(menuItem); }}
                        title="Edit Menu Item"
                        sx={{ mr: 1 }}
                    >
                        <EditIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton
                        aria-label="delete menu item"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleDeleteMenuItem(menuItem.menuitemid, menuItem.menuitemname); }}
                        color="error"
                        title="Delete Menu Item"
                    >
                        <DeleteIcon fontSize="inherit" />
                    </IconButton>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">Recipe Ingredients:</Typography>
                     <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenAddIngredientModal(menuItem.menuitemid)}
                        title="Add Ingredient"
                    >
                        Add Ingredient
                    </Button>
                </Box>
                {loading.ingredients[menuItem.menuitemid] ? (
                  <CircularProgress size={24} />
                ) : !ingredients[menuItem.menuitemid] || ingredients[menuItem.menuitemid].length === 0 ? (
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>No ingredients defined for this item.</Typography>
                ) : (
                  <List dense disablePadding>
                    {ingredients[menuItem.menuitemid].map((ingredient) => (
                      <ListItem
                        key={ingredient.itemid}
                        secondaryAction={
                          <>
                             <IconButton
                                edge="end"
                                aria-label="edit ingredient"
                                size="small"
                                sx={{ mr: 0.5 }}
                                onClick={() => handleOpenEditIngredientModal(menuItem.menuitemid, ingredient)}
                                title="Edit Ingredient"
                            >
                                <EditIcon fontSize="inherit"/>
                            </IconButton>
                            <IconButton
                                edge="end"
                                aria-label="delete ingredient"
                                size="small"
                                color="error"
                                onClick={() => handleDeleteIngredient(menuItem.menuitemid, ingredient.itemid, ingredient.itemname)}
                                title="Delete Ingredient"
                            >
                                <DeleteIcon fontSize="inherit"/>
                            </IconButton>
                          </>
                        }
                        disablePadding
                      >
                        <ListItemText
                          primary={`${ingredient.itemname} (ID: ${ingredient.itemid})`}
                          secondary={`${parseFloat(ingredient.quantityrequired).toFixed(2)} ${ingredient.unitabbreviation || ingredient.unitname}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
      <MenuItemFormModal
        open={isMenuItemModalOpen}
        onClose={handleMenuItemModalClose}
        onSubmit={handleMenuItemModalSubmit}
        initialData={editingMenuItem}
      />
      {isIngredientModalOpen && (
            <RecipeIngredientFormModal
                open={isIngredientModalOpen}
                onClose={handleIngredientModalClose}
                onSubmit={handleIngredientModalSubmit}
                menuItemId={currentMenuItemIdForIngredient}
                initialData={editingIngredient}
            />
        )}
      <RecordSaleModal
        open={isSaleModalOpen}
        onClose={handleSaleModalClose}
        onSubmit={handleSaleModalSubmit}
      />
    </Box>
  );
}

export default MenuItemsPage;