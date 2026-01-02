import React, { useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, Typography, Button } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './UTControl.css'; // Import custom CSS
import UtilityControl from './UtilityControl'; // First fixed window
import { useSelector, useDispatch } from 'react-redux'; // To access the Redux store
import { toggleSimulation, togglePreview, toggleTube } from '../../../Store/satelliteSlice';

// Create a dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#1c1c1c', // Dark black background
      paper: '#2c2c2c',   // Slightly lighter for the icons drawer
    },
    text: {
      primary: '#ffffff', // White text for readability
    },
  },
});

const UTControl = () => {
  const [activeWindow, setActiveWindow] = useState('fixed');

  return (
    <ThemeProvider theme={theme}>
      <Box className="utcontrol-container">
        {/* Drawer with relative position */}
        <Drawer
          variant="permanent"
          className="relative-drawer"
          PaperProps={{
            sx: { width: 60, bgcolor: 'background.paper', position: 'relative' },
          }}
        >
          <List>
            <ListItem button selected>
              <ListItemIcon>
                <PublicIcon style={{ color: '#fff' }} />
              </ListItemIcon>
            </ListItem>
          </List>
        </Drawer>

        {/* Main content area */}
        <Box className="content-container">
            <div className="content-box">
              <Box className="window-box">
                <UtilityControl />
              </Box>
          </div>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default UTControl;
