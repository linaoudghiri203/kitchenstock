import { createTheme } from '@mui/material/styles';

// Define the custom theme based on the style guidelines
const theme = createTheme({
  palette: {
    mode: 'light', // Use light mode as default
    primary: {
      // Using white as primary background is tricky with MUI defaults.
      // We'll use a standard primary color for interactive elements (like buttons)
      // and control backgrounds directly or via secondary.
      // Let's use the Teal accent as the MUI primary for interactive elements.
      main: '#008080', // Teal Accent
      contrastText: '#FFFFFF', // White text on Teal
    },
    secondary: {
      // Use light gray for secondary elements
      main: '#F0F0F0', // Light Gray
      contrastText: '#333333', // Darker text on light gray
    },
    background: {
      // Define default and paper backgrounds
      default: '#FFFFFF', // White - Main background
      paper: '#FFFFFF', // White - Card/Paper backgrounds
    },
    text: {
      primary: '#333333', // Dark gray for primary text
      secondary: '#666666', // Lighter gray for secondary text
    },
    // Define the accent color separately if needed, although we used it for primary.main
    accent: {
        main: '#008080', // Teal
        contrastText: '#FFFFFF',
    },
    // Define the light gray explicitly if needed elsewhere
    lightGray: {
        main: '#F0F0F0',
        contrastText: '#333333',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Prioritize Inter font
    // Define other typography settings if needed (font sizes, weights, etc.)
  },
  shape: {
    borderRadius: 8, // Default border radius for components like Card, Button
  },
  components: {
    // Example: Default props for Button
    MuiButton: {
      defaultProps: {
        disableElevation: true, // Flat buttons by default
      },
      styleOverrides: {
          root: {
              textTransform: 'none', // Prevent uppercase transformation
          }
      }
    },
    // Example: Default props for Card
    MuiCard: {
      defaultProps: {
        elevation: 0, // Flat cards by default
        variant: 'outlined', // Use outlined variant
      },
       styleOverrides: {
          root: {
              borderColor: '#E0E0E0' // Slightly darker border for cards on white
          }
      }
    },
     // Ensure AppBar uses white background
    MuiAppBar: {
        styleOverrides: {
            root: ({ theme }) => ({
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary, // Ensure text color contrasts with white
            }),
        }
    }
    // Add other component customizations here
  },
});

export default theme;