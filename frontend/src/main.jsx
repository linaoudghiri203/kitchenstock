import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline'; // Normalize CSS

import App from './App';
import theme from './theme'; // Import the custom theme
import './index.css'; // Basic global styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Provide the MUI theme to the entire app */}
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstarts an elegant, consistent baseline to build upon. */}
      <CssBaseline />
      {/* BrowserRouter handles client-side routing */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);