import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#008080',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F0F0F0',
      contrastText: '#333333',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
    accent: {
        main: '#008080',
        contrastText: '#FFFFFF',
    },
    lightGray: {
        main: '#F0F0F0',
        contrastText: '#333333',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
          root: {
              textTransform: 'none',
          }
      }
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
        variant: 'outlined',
      },
       styleOverrides: {
          root: {
              borderColor: '#E0E0E0'
          }
      }
    },
    MuiAppBar: {
        styleOverrides: {
            root: ({ theme }) => ({
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
            }),
        }
    }
  },
});

export default theme;