import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import UnitsPage from './pages/UnitsPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage from './pages/SuppliersPage';
import DeliveriesPage from './pages/DeliveriesPage';
import MenuItemsPage from './pages/MenuItemsPage';
import DashboardPage from './pages/DashboardPage';

const NotFoundPage = () => <h2>404 - Page Not Found</h2>;

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'primary.main' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              StockWatch POC
            </Link>
          </Typography>
          <Button color="inherit" component={Link} to="/">Dashboard</Button>
          <Button color="inherit" component={Link} to="/inventory">Inventory</Button>
          <Button color="inherit" component={Link} to="/units">Units</Button>
          <Button color="inherit" component={Link} to="/categories">Categories</Button>
          <Button color="inherit" component={Link} to="/suppliers">Suppliers</Button>
          <Button color="inherit" component={Link} to="/deliveries">Deliveries</Button>
          <Button color="inherit" component={Link} to="/menu-items">Menu Items</Button>
          <Button color="inherit" component={Link} to="/reports">Reports</Button>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'secondary.main' }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/menu-items" element={<MenuItemsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>

      <Box component="footer" sx={{ p: 2, mt: 'auto', bgcolor: 'background.paper', borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="body2" color="text.secondary" align="center">
          © {new Date().getFullYear()} StockWatch POC
        </Typography>
      </Box>
    </Box>
  );
}

export default App;