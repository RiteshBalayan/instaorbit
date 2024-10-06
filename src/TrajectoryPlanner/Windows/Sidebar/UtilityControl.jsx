import React , { useState, useEffect } from 'react';
import '../../Styles/simulator/UtilityControl.css';
import { useSelector, useDispatch } from 'react-redux';
import { toggleGrid, toggleAxis, toggleVonAllenBelt, toggleHDEarth, toggleSun, toggleAmbientLight, toggleRefrenaceSystem } from '../../Store/View';
import Toggle from 'react-toggle';
import "react-toggle/style.css" 
import styled from 'styled-components';

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center; /* Center horizontally */
  width: 250px; /* Adjust width as needed */
  height: 40px; /* Adjust height as needed */
  border: 1px solid #ccc;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
`;

const ToggleOption = styled.div`
  flex: 1;
  text-align: center;
  padding: 8px; 
  font-size: 16px; 
  background-color: ${({ active }) => (active ? '#007bff' : '#f0f0f0')}; /* Light gray for inactive state */
  color: ${({ active }) => (active ? 'white' : '#333')}; 
  transition: background-color 0.3s;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const UtilityControl = () => {
  const view = useSelector((state) => state.view);
  const dispatch = useDispatch();

  // Get current reference system from Redux store
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);

  // Local state to keep track of selected option in the component
  const [selectedOption, setSelectedOption] = useState(referenceSystem);
  console.log('selcted option:', selectedOption)

  // Update the state on initial load based on the Redux store value
  useEffect(() => {
    if (referenceSystem) {
      setSelectedOption(referenceSystem);
    }
  }, [referenceSystem]);

  const handleToggle = () => {
    const newOption = selectedOption === 'EarthInertial' ? 'EarthFixed' : 'EarthInertial';
    setSelectedOption(newOption);
    dispatch(toggleRefrenaceSystem(newOption)); // Dispatch action to update Redux store
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
      case 'HDEarth':
        dispatch(toggleHDEarth(isChecked));
        break;
      case 'Sun':
        dispatch(toggleSun(isChecked));
        break;
      case 'AmbientLight':
        dispatch(toggleAmbientLight(isChecked));
        break;
      default:
        break;
    }
  };

  return (
    <div className="panel-bottom">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}> 
        <h3 style={{ marginBottom: '10px' }}>Reference System</h3>
        <label>
        <ToggleContainer onClick={handleToggle}>
          <ToggleOption active={selectedOption === 'EarthInertial'}>Earth Inertial</ToggleOption>
          <ToggleOption active={selectedOption === 'EarthFixed'}>Earth Fixed</ToggleOption>
        </ToggleContainer>
        </label>
      </div>
      <p>Graphics Control</p>
      <div className="checkbox-container">
        <label>
          <input
            type="checkbox"
            checked={view.Grid}
            onChange={handleCheckboxChange('Grid')}
          />
          <span className="custom-checkbox"></span>
          Grid
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.Axis}
            onChange={handleCheckboxChange('Axis')}
          />
          <span className="custom-checkbox"></span>
          Axis
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.HDEarth}
            onChange={handleCheckboxChange('HDEarth')}
          />
          <span className="custom-checkbox"></span>
          HDEarth
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.VonAllenBelt}
            onChange={handleCheckboxChange('VonAllenBelt')}
          />
          <span className="custom-checkbox"></span>
          Von Allen Belt
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.Sun}
            onChange={handleCheckboxChange('Sun')}
          />
          <span className="custom-checkbox"></span>
          Sun
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.AmbientLight}
            onChange={handleCheckboxChange('AmbientLight')}
          />
          <span className="custom-checkbox"></span>
          Ambient Light
        </label>
      </div>
    </div>
  );
};

export default UtilityControl;
