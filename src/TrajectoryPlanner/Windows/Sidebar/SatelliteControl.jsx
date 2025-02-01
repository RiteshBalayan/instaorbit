import React, { useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, Button, Switch } from '@mui/material';
import { Home, Settings, Info, ContactMail } from '@mui/icons-material';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
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

const SatelliteControl = ({ satelliteId }) => {

  const dispatch = useDispatch();
  const Satellite = useSelector(state => state.satellites.satellitesConfig.find(p => p.id === satelliteId));

  const handleSimulationToggle = () => {
    dispatch(toggleSimulation({ id: parseFloat(satelliteId) , Simulation: !Satellite.Simulation})); 
  };

  const handlePreviewToggle = () => {
    dispatch(togglePreview({ id: parseFloat(satelliteId) , preview: !Satellite.preview})); 
  };

  const handleTubeToggle = () => {
    dispatch(toggleTube({ id: parseFloat(satelliteId) , Tube: !Satellite.Tube})); 
  };

  return (
    <Box className="satellite-container">
      <Typography variant="body1">
        {Satellite.name}
      </Typography>
      <Box className="button-group">
        <Button 
          variant="contained" 
          onClick={handleSimulationToggle} 
        >
          {Satellite.Simulation ? 'Simulation Active' : 'Simulation Inactive'}
        </Button>
        <Button 
          variant="contained" 
          onClick={handleTubeToggle}
        >
          {Satellite.Tube ? 'Tube Active' : 'Tube Inactive'}
        </Button>
        <Button 
          variant="contained" 
          onClick={handlePreviewToggle} 
        >
          {Satellite.preview ? 'Preview Active' : 'Preview Inactive'}
        </Button>
      </Box>
    </Box> 
  );
};

export default SatelliteControl;