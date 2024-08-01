import React, { useState } from 'react';
import '../../Styles/simulator/UtilityPanel.css';
import SatelliteConfig from '../3DRender/ConfigSatellite';
import { useSelector, useDispatch } from 'react-redux';
import { toggleGrid, toggleAxis, toggleVonAllenBelt } from '../../Store/View';

const UtilityPanel = () => {
  const [topHeight, setTopHeight] = useState(50); // Default height for the top section
  const view = useSelector((state) => state.view);
  const dispatch = useDispatch();

  const handleMouseDown = (e) => {
    const startY = e.clientY;
    const startTopHeight = topHeight;

    const onMouseMove = (e) => {
      const newHeight = startTopHeight + (e.clientY - startY);
      if (newHeight > 20 && newHeight < 500) {
        setTopHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleCheckboxChange = (name) => (e) => {
    const isChecked = e.target.checked;
    switch (name) {
      case 'Grid':
        dispatch(toggleGrid(isChecked));
        break;
      case 'Axis':
        dispatch(toggleAxis(isChecked));
        break;
      case 'VonAllenBelt':
        dispatch(toggleVonAllenBelt(isChecked));
        break;
      default:
        break;
    }
  };

  return (
    <div className="utility-panel">
      <div className="panel-top">
        {/* Top section content here */}
        <h2>Satellites</h2>
        <SatelliteConfig />
      </div>
      <div className="resize-line" onMouseDown={handleMouseDown}></div>
      <div className="panel-bottom">
        {/* Bottom section content here */}
        <p>Bottom Section Content</p>
        <div className="checkbox-container">
          <label>
            <input
              type="checkbox"
              checked={view.Grid}
              onChange={handleCheckboxChange('Grid')}
            />
            Grid
          </label>
          <label>
            <input
              type="checkbox"
              checked={view.Axis}
              onChange={handleCheckboxChange('Axis')}
            />
            Axis
          </label>
          <label>
            <input
              type="checkbox"
              checked={view.VonAllenBelt}
              onChange={handleCheckboxChange('VonAllenBelt')}
            />
            Von Allen Belt
          </label>
        </div>
      </div>
    </div>
  );
};

export default UtilityPanel;
