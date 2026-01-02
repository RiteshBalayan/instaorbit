import React from 'react';
import { PopupOverlay, PopupContent, CloseButton, Input, RippleButton, LoadingIndicator } from '../TopBar.styles';

/**
 * Modal for creating a new trajectory from scratch
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {Function} onClose - Handler to close the modal
 * @param {Function} onCreate - Handler to create new trajectory
 * @param {string} value - Current input value
 * @param {Function} onChange - Handler for input changes
 * @param {boolean} isLoading - Whether creation is in progress
 * @param {Function} onRipple - Ripple effect handler for buttons
 * @param {boolean} captureScreenshot - Whether to capture screenshot
 * @param {Function} onScreenshotChange - Handler for screenshot checkbox
 */
const NewTrajectoryModal = ({ 
  isOpen, 
  onClose, 
  onCreate, 
  value, 
  onChange, 
  isLoading,
  onRipple,
  captureScreenshot,
  onScreenshotChange
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value && !isLoading) {
      onCreate();
    }
  };

  return (
    <PopupOverlay>
      <PopupContent style={{ width: 420, maxWidth: '92vw' }}>
        <CloseButton onClick={onClose}>✕</CloseButton>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div 
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6f77ff, #4e54c8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26
            }}
          >
            ✚
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 6px 0' }}>Create a new trajectory from scratch</h3>
            <div style={{ color: '#bfc7ee', fontSize: 13 }}>
              This will create a new project and upload an initial iteration snapshot.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Input 
            value={value}
            onChange={onChange}
            placeholder="Trajectory name"
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <label style={{ 
          marginTop: 14,
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          cursor: 'pointer',
          padding: '12px',
          background: captureScreenshot ? 'rgba(111, 119, 255, 0.15)' : 'transparent',
          borderRadius: 8,
          border: '1px solid ' + (captureScreenshot ? '#6f77ff' : 'rgba(255, 255, 255, 0.1)'),
          transition: 'all 0.2s ease'
        }}>
          <input 
            type="checkbox"
            checked={captureScreenshot}
            onChange={(e) => onScreenshotChange(e.target.checked)}
            style={{ 
              width: 20,
              height: 20,
              cursor: 'pointer',
              accentColor: '#6f77ff',
              flexShrink: 0
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: captureScreenshot ? 600 : 500, 
              color: captureScreenshot ? '#6f77ff' : '#e8ebff',
              fontSize: 14
            }}>
              📸 Capture screenshot
            </div>
            {captureScreenshot && (
              <div style={{ 
                marginTop: 6,
                color: '#f5b97f', 
                fontSize: 12,
                fontWeight: 500
              }}>
                ⚠️ You'll need to grant browser permission
              </div>
            )}
          </div>
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <RippleButton 
            onMouseDown={onRipple}
            onClick={onClose}
            style={{ background: '#414345' }}
            title="Cancel"
          >
            Cancel
          </RippleButton>
          <RippleButton 
            onMouseDown={onRipple}
            onClick={onCreate}
            disabled={isLoading || !value}
            title="Create new trajectory"
          >
            Create new trajectory {isLoading && <LoadingIndicator />}
          </RippleButton>
        </div>
      </PopupContent>
    </PopupOverlay>
  );
};

export default NewTrajectoryModal;
