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
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'; // Icon for menu items

import apiClient from '../services/api';

function MenuItemsPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [ingredients, setIngredients] = useState({}); // Store ingredients keyed by menuItemId
  const [loading, setLoading] = useState({ list: true, ingredients: {} });
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);

  // Fetch menu items
  const fetchMenuItems = async () => {
    setLoading(prev => ({ ...prev, list: true }));
    setError(null);
    setApiMessage(null);
    try {
      const response = await apiClient.get('/menu-items');
      setMenuItems(response.data);
    } catch (err) {
      console.error("Failed to fetch menu items:", err);
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

  // Fetch ingredients for a specific menu item when expanded
  const fetchIngredients = async (menuItemId) => {
    // Avoid refetching if already loaded or currently loading
    if (ingredients[menuItemId] || loading.ingredients[menuItemId]) {
      return;
    }

    setLoading(prev => ({ ...prev, ingredients: { ...prev.ingredients, [menuItemId]: true } }));
    try {
      const response = await apiClient.get(`/menu-items/${menuItemId}/ingredients`);
      setIngredients(prev => ({ ...prev, [menuItemId]: response.data }));
    } catch (err) {
      console.error(`Failed to fetch ingredients for menu item ${menuItemId}:`, err);
      // Optionally set an error state specific to this item's ingredients
       setApiMessage({ type: 'error', text: `Failed to load ingredients for item ${menuItemId}` });
    } finally {
      setLoading(prev => ({ ...prev, ingredients: { ...prev.ingredients, [menuItemId]: false } }));
    }
  };

  // Handlers (Placeholders)
  const handleAddMenuItem = () => {
    console.log("Add Menu Item clicked");
    setApiMessage({ type: 'info', text: 'Add functionality not yet implemented.' });
  };

  const handleEditMenuItem = (menuItemId) => {
    console.log("Edit Menu Item clicked for ID:", menuItemId);
    setApiMessage({ type: 'info', text: `Edit functionality for ID ${menuItemId} not yet implemented.` });
  };

  const handleDeleteMenuItem = async (menuItemId, menuItemName) => {
    console.log("Delete Menu Item clicked for ID:", menuItemId);
    setApiMessage(null);
    setError(null);
    if (window.confirm(`Are you sure you want to delete menu item "${menuItemName}"? This will also delete its recipe. This cannot be undone.`)) {
      try {
        await apiClient.delete(`/menu-items/${menuItemId}`);
        setMenuItems(currentItems => currentItems.filter(item => item.menuitemid !== menuItemId));
        // Also remove ingredients from state if they were loaded
        setIngredients(currentIngredients => {
            const newIngredients = {...currentIngredients};
            delete newIngredients[menuItemId];
            return newIngredients;
        });
        setApiMessage({ type: 'success', text: `Menu item "${menuItemName}" deleted successfully.` });
      } catch (err) {
        console.error(`Failed to delete menu item ${menuItemId}:`, err);
        const errorMsg = err.response?.data?.error || err.message || 'Failed to delete menu item';
        setError(errorMsg);
        setApiMessage({ type: 'error', text: errorMsg });
      }
    }
  };

   const handleAddIngredient = (menuItemId) => {
    console.log("Add Ingredient clicked for Menu Item ID:", menuItemId);
    setApiMessage({ type: 'info', text: `Add ingredient functionality for ID ${menuItemId} not yet implemented.` });
  };

  const handleEditIngredient = (menuItemId, itemId) => {
    console.log("Edit Ingredient clicked for Menu Item ID:", menuItemId, "Item ID:", itemId);
     setApiMessage({ type: 'info', text: `Edit ingredient functionality not yet implemented.` });
  };

  const handleDeleteIngredient = async (menuItemId, itemId, ingredientName) => {
     console.log("Delete Ingredient clicked for Menu Item ID:", menuItemId, "Item ID:", itemId);
     setApiMessage(null);
     if (window.confirm(`Are you sure you want to remove ingredient "${ingredientName}" from this recipe?`)) {
         try {
             await apiClient.delete(`/menu-items/${menuItemId}/ingredients/${itemId}`);
             // Refresh ingredients for this menu item
             fetchIngredients(menuItemId); // Refetch after delete
             setApiMessage({ type: 'success', text: `Ingredient "${ingredientName}" removed successfully.` });
         } catch (err) {
              console.error(`Failed to delete ingredient ${itemId}:`, err);
              const errorMsg = err.response?.data?.error || err.message || 'Failed to delete ingredient';
              setApiMessage({ type: 'error', text: errorMsg });
         }
     }
  };


  // --- Render Logic ---
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Menu Items & Recipes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddMenuItem}
        >
          Add Menu Item
        </Button>
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

      {/* Display Menu Items using Accordions */}
      {!loading.list && !error && menuItems.length > 0 && (
        <Box>
          {menuItems.map((menuItem) => (
            <Accordion
                key={menuItem.menuitemid}
                sx={{ mb: 1 }}
                onChange={(event, isExpanded) => {
                    if (isExpanded) {
                        fetchIngredients(menuItem.menuitemid); // Fetch ingredients when expanded
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
                <Typography sx={{ color: 'text.secondary', mr: 2 }}>
                  {menuItem.description || 'No description'}
                </Typography>
                 <Typography sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                  {menuItem.price ? `$${parseFloat(menuItem.price).toFixed(2)}` : 'No price'}
                </Typography>
                 <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}
                  <IconButton
                        aria-label="edit menu item"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleEditMenuItem(menuItem.menuitemid); }} // Prevent accordion toggle
                        title="Edit Menu Item (Not Implemented)"
                        sx={{ mr: 1 }}
                    >
                        <EditIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton
                        aria-label="delete menu item"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleDeleteMenuItem(menuItem.menuitemid, menuItem.menuitemname); }} // Prevent accordion toggle
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
                        onClick={() => handleAddIngredient(menuItem.menuitemid)}
                        title="Add Ingredient (Not Implemented)"
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
                                onClick={() => handleEditIngredient(menuItem.menuitemid, ingredient.itemid)}
                                title="Edit Ingredient (Not Implemented)"
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
    </Box>
  );
}

export default MenuItemsPage;