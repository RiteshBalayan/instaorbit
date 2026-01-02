import React, { useState } from 'react';
import { Item, RippleButton } from '../TopBar.styles';

const ViewModeButton = ({ currentViewMode, onChange, handleRipple, showControlPanel, showLinkBudget, onToggleControlPanel, onToggleLinkBudget }) => {
  const [open, setOpen] = useState(false);

  return (
    <Item style={{ position: 'relative' }}>
      <RippleButton
        onMouseDown={handleRipple}
        onClick={() => setOpen((v) => !v)}
        title="Switch view"
        aria-label="Switch view"
      >
        View
      </RippleButton>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            background: '#0f1113',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            zIndex: 9500,
            minWidth: 160,
          }}
        >
          {['globe', 'map', 'both'].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                onChange(mode);
                setOpen(false);
              }}
              style={{
                background: currentViewMode === mode ? '#8f94fb' : 'transparent',
                color: currentViewMode === mode ? '#071023' : '#cfd6ff',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '6px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {mode === 'globe' ? 'Globe View' : mode === 'map' ? 'Map View' : 'Both Views'}
            </button>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />

          <button
            onClick={() => onToggleControlPanel?.()}
            style={{
              background: 'transparent',
              color: '#cfd6ff',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '6px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            aria-label="Toggle Control Panel"
            title="Toggle Control Panel"
          >
            <span style={{ width: 16, display: 'inline-block', textAlign: 'center' }}>{showControlPanel ? '✓' : ''}</span>
            Control Panel
          </button>

          <button
            onClick={() => onToggleLinkBudget?.()}
            style={{
              background: 'transparent',
              color: '#cfd6ff',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '6px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            aria-label="Toggle Link Budget"
            title="Toggle Link Budget"
          >
            <span style={{ width: 16, display: 'inline-block', textAlign: 'center' }}>{showLinkBudget ? '✓' : ''}</span>
            Link Budget
          </button>
        </div>
      )}
    </Item>
  );
};

export default ViewModeButton;