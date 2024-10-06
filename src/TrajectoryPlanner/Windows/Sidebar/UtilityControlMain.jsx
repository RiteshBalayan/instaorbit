import React, { useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, Button, Switch } from '@mui/material';
import { Home, Settings, Info, ContactMail } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './UTControl.css'; // Import custom CSS
import UtilityControl from '../UtilityControl'; // First fixed window
import { useSelector, useDispatch } from 'react-redux'; // To access the Redux store
import { toggleSimulation, togglePreview } from '../../../Store/satelliteSlice';

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

const SatelliteControl = ({ satelliteId }) => {

  const dispatch = useDispatch();
  const SimulationActive = useSelector(state => state.satellites.satellitesConfig.find(p => p.id === satelliteId));

  const handleSimulationToggle = () => {
    dispatch(toggleSimulation({ id: parseFloat(satelliteId) , Simulation: !SimulationActive.Simulation})); 
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 1 }}>
      <Typography variant="body1">
        Satellite ID: {satelliteId}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Switch 
          checked={SimulationActive.Simulation} 
          onChange={handleSimulationToggle} 
          color="primary" 
        />
        <Button 
          variant="contained" 
          onClick={handleSimulationToggle} 
          sx={{ ml: 2 }}
        >
          {SimulationActive.Simulation ? 'Simulation Active' : 'Simulation Inactive'}
        </Button>
      </Box>
    </Box>
  );
};



const UTControl = () => {
  const [activeWindow, setActiveWindow] = useState('fixed');
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
            </ListItem>

            {/* Dynamically add more icons based on satellitesConfig */}
            {satellitesConfig.map((satellite, index) => (
              <ListItem button key={satellite.id} onClick={() => handleIconClick(index)} selected={activeWindow === index}>
                <ListItemIcon>
                  <Settings style={{ color: activeWindow === index ? '#fff' : '#bbb' }} />
                </ListItemIcon>
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
            { activeWindow !== 'fixed' && <SatelliteControl satelliteId={activeWindow} /> } 
          </div>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default UTControl;
