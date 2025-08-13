import { createTheme } from '@mui/material/styles';

// ANTIC Theme - Bright, beautiful design based on company logo colors
const anticTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2E7D32',      // ANTIC Primary Green (forest green)
      light: '#4CAF50',     // Lighter green
      dark: '#1B5E20',      // Darker green
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#D32F2F',      // ANTIC Red (vibrant red)
      light: '#F44336',     // Lighter red
      dark: '#B71C1C',      // Darker red
      contrastText: '#ffffff',
    },
    warning: {
      main: '#F57C00',      // ANTIC Orange/Yellow (vibrant orange)
      light: '#FF9800',     // Lighter orange
      dark: '#E65100',      // Darker orange
    },
    error: {
      main: '#D32F2F',      // Use ANTIC red for errors
      light: '#F44336',
      dark: '#B71C1C',
    },
    info: {
      main: '#2196F3',      // Clean blue for info
      light: '#42A5F5',
      dark: '#1976D2',
    },
    success: {
      main: '#2E7D32',      // ANTIC Green for success
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    background: {
      default: '#F8F9FA',   // Very light gray background
      paper: '#FFFFFF',     // Pure white for cards
    },
    text: {
      primary: '#212121',   // Dark text for readability
      secondary: '#616161', // Medium gray
    },
    divider: 'rgba(0, 0, 0, 0.08)',  // Subtle gray dividers
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      color: '#1a1a1a',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#1a1a1a',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#1a1a1a',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1a1a1a',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1a1a1a',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1a1a1a',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#1a1a1a',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#666666',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 20px',
          boxShadow: 'none',
          transition: 'all 0.3s ease',
        },
        contained: {
          background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
          boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
            boxShadow: '0 6px 20px rgba(46, 125, 50, 0.35)',
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(145deg, #FFFFFF 0%, #FAFAFA 100%)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
            border: '1px solid rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
          boxShadow: '0 2px 12px rgba(46, 125, 50, 0.15)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)',
          boxShadow: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)',
            color: '#2E7D32',
            border: '1px solid rgba(46, 125, 50, 0.2)',
            '&:hover': {
              background: 'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)',
            },
          },
          '&:hover': {
            background: 'rgba(46, 125, 50, 0.04)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        colorSuccess: {
          background: 'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)',
          color: '#2E7D32',
          border: '1px solid rgba(46, 125, 50, 0.3)',
        },
        colorError: {
          background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
          color: '#D32F2F',
          border: '1px solid rgba(211, 47, 47, 0.3)',
        },
        colorWarning: {
          background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)',
          color: '#F57C00',
          border: '1px solid rgba(245, 124, 0, 0.3)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#FAFAFA',
            '& fieldset': {
              borderColor: '#E0E0E0',
              borderWidth: '2px',
            },
            '&:hover fieldset': {
              borderColor: '#BDBDBD',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2E7D32',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#616161',
            fontWeight: 500,
            '&.Mui-focused': {
              color: '#2E7D32',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Add global scrollbar styles
const GlobalScrollbarStyles = {
  '& *::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  '& *::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '& *::-webkit-scrollbar-thumb': {
    background: 'rgba(46, 125, 50, 0.2)',
    borderRadius: '3px',
    transition: 'background 0.3s ease',
  },
  '& *::-webkit-scrollbar-thumb:hover': {
    background: 'rgba(46, 125, 50, 0.4)',
  },
  '& *': {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(46, 125, 50, 0.2) transparent',
  },
};

// Apply global styles to CssBaseline
anticTheme.components = {
  ...anticTheme.components,
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        ...GlobalScrollbarStyles,
      },
    },
  },
};

export default anticTheme;