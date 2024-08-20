import React, { useState } from 'react';
import { IconButton, Box } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import SatelliteConfig from '../3DRender/ConfigSatellite';
import AddSatellite from '../3DRender/AddSatellite'
import SatelliteList from '../3DRender/SatelliteList';
import UtilityControl from './UtilityControl';
import '../../Styles/simulator/UtilityPanel.css';

const UtilityPanel = () => {
  const [topHeight, setTopHeight] = useState(60);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDrag = (e) => {
    const newTopHeight = (e.clientY / window.innerHeight) * 100;
    if (newTopHeight > 10 && newTopHeight < 90) {
      setTopHeight(newTopHeight);
    }
  };

  const togglePanel = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div>
      {isCollapsed ? (
        <Box className="toggle-container">
          <IconButton className="toggle-button" onClick={togglePanel}>
            <ChevronLeft />
          </IconButton>
          <div className="toggle-text">Utility Panel</div>
        </Box>
      ) : (
        <div className="resizable-panels">
          <IconButton className="collapse-button" onClick={togglePanel}>
            <ChevronRight />
          </IconButton>
          <div className="top-panel" style={{ display: 'flex', flexDirection: 'column', height: `${topHeight}%`, overflowY: 'auto' }}>
          <div style={{ flex: '0 1 auto' }}>
            <AddSatellite style={{ height: 'auto' }} />
          </div>
          <div style={{ flex: 1 }}>
            <SatelliteList />
          </div>
        </div>
          <div
            className="drag-line"
            onMouseDown={(e) => {
              e.preventDefault();
              window.addEventListener('mousemove', handleDrag);
              window.addEventListener('mouseup', () => {
                window.removeEventListener('mousemove', handleDrag);
              }, { once: true });
            }}
          />
          <div className="bottom-panel" style={{ height: `${100 - topHeight}%` }}>
            <UtilityControl />
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityPanel;
