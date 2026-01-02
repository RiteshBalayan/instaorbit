import React from 'react';
import styled from 'styled-components';
import '../../../Styles/simulator/UtilityControl.css';

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

// Configurable, self-contained utility control UI kit
// Props:
// - title: string for the checkbox section
// - reference: { value: 'EarthInertial'|'EarthFixed', onToggle: fn }
// - items: [{ key, label, checked, onChange }]
export default function SidebarUtilityControl({
  title = 'Graphics Control',
  reference,
  items = [],
}) {
  return (
    <div className="panel-bottom">
      {reference && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '10px' }}>Reference System</h3>
          <label>
            <ToggleContainer onClick={reference.onToggle}>
              <ToggleOption $active={reference.value === 'EarthInertial'}>Earth Inertial</ToggleOption>
              <ToggleOption $active={reference.value === 'EarthFixed'}>Earth Fixed</ToggleOption>
            </ToggleContainer>
          </label>
        </div>
      )}

      {items.length > 0 && (
        <>
          <p>{title}</p>
          <div className="checkbox-container">
            {items.map((it) => (
              <label key={it.key}>
                <input
                  type="checkbox"
                  checked={!!it.checked}
                  onChange={(e) => it.onChange?.(e.target.checked)}
                />
                <span className="custom-checkbox"></span>
                {it.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
