import React from 'react';
import '../../../../Styles/simulator/UtilityControl.css';
import styled from 'styled-components';

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 250px;
  height: 40px;
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
  background-color: ${({ $active }) => ($active ? '#007bff' : '#f0f0f0')};
  color: ${({ $active }) => ($active ? 'white' : '#333')};
  transition: background-color 0.3s;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const UtilityControlUI = ({
  referenceSystem,
  onReferenceToggle,
  view,
  onGrid,
  onAxis,
  onHDEarth,
  onVonAllenBelt,
  onSun,
  onAmbientLight,
}) => {
  return (
    <div className="panel-bottom">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px' }}>Reference System</h3>
        <label>
          <ToggleContainer onClick={onReferenceToggle}>
            <ToggleOption $active={referenceSystem === 'EarthInertial'}>Earth Inertial</ToggleOption>
            <ToggleOption $active={referenceSystem === 'EarthFixed'}>Earth Fixed</ToggleOption>
          </ToggleContainer>
        </label>
      </div>
      <p>Graphics Control</p>
      <div className="checkbox-container">
        <label>
          <input type="checkbox" checked={view.Grid} onChange={(e) => onGrid(e.target.checked)} />
          <span className="custom-checkbox"></span>
          Grid
        </label>
        <label>
          <input type="checkbox" checked={view.Axis} onChange={(e) => onAxis(e.target.checked)} />
          <span className="custom-checkbox"></span>
          Axis
        </label>
        <label>
          <input type="checkbox" checked={view.HDEarth} onChange={(e) => onHDEarth(e.target.checked)} />
          <span className="custom-checkbox"></span>
          HDEarth
        </label>
        <label>
          <input type="checkbox" checked={view.VonAllenBelt} onChange={(e) => onVonAllenBelt(e.target.checked)} />
          <span className="custom-checkbox"></span>
          Von Allen Belt
        </label>
        <label>
          <input type="checkbox" checked={view.Sun} onChange={(e) => onSun(e.target.checked)} />
          <span className="custom-checkbox"></span>
          Sun
        </label>
        <label>
          <input type="checkbox" checked={view.AmbientLight} onChange={(e) => onAmbientLight(e.target.checked)} />
          <span className="custom-checkbox"></span>
          Ambient Light
        </label>
      </div>
    </div>
  );
};

export default UtilityControlUI;
