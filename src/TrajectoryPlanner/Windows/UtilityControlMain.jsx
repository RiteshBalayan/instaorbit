import React, { useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Home, Settings, Info, ContactMail } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './UTControl.css'; // Import custom CSS
import UtilityControl from './UtilityControl'; // First fixed window
import { useSelector } from 'react-redux'; // To access the Redux store

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

// Window contents for each icon
const windowsData = {
  home: 'This is the Home window content. Write your content here.',
  settings: 'This is the Settings window content. Write your content here.',
  info: 'This is the Info window content. Write your content here.',
  contact: 'This is the Contact window content. Write your content here.',
};

const UTControl = () => {
  const [activeWindow, setActiveWindow] = useState('home');
  // Fetch the dynamic config from Redux store
  const satellitesConfig = useSelector((state) => state.satellites.satellitesConfig);


  const handleIconClick = (windowName) => {
    setActiveWindow(windowName);
  };

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
            {/* First fixed icon */}
            <ListItem button onClick={() => handleIconClick('fixed')} selected={activeWindow === 'fixed'}>
              <ListItemIcon>
                <Home style={{ color: activeWindow === 'fixed' ? '#fff' : '#bbb' }} />
              </ListItemIcon>
              <ListItemText primary="Fixed" />
            </ListItem>

            {/* Dynamically add more icons based on satellitesConfig */}
            {satellitesConfig.map((satellite, index) => (
              <ListItem button key={satellite.id} onClick={() => handleIconClick(`satellite-${index}`)} selected={activeWindow === `satellite-${index}`}>
                <ListItemIcon>
                  <Settings style={{ color: activeWindow === `satellite-${index}` ? '#fff' : '#bbb' }} />
                </ListItemIcon>
                <ListItemText primary={`Sat ${index + 1}`} />
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Main content area */}
        <Box className="content-container">
          <div className="content-box">
            {activeWindow === 'fixed' && (
                <Box className="window-box">
                {/* Fixed content window */}
                <UtilityControl />
                </Box>
            )}
            {/* Render dynamic windows based on satellitesConfig */}
            {satellitesConfig.map((satellite, index) => (
                activeWindow === `satellite-${index}` && (
                <Box key={satellite.id} className="content-box">
                    <Typography variant="h5" gutterBottom>
                    {satellite.name}
                    </Typography>
                    <Typography variant="body1">
                    {satellite.description}
                    </Typography>
                </Box>
                )
            ))}
          </div>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default UTControl;
