import React from 'react';
import { PopupOverlay, PopupContent, CloseButton, RippleButton, LoadingIndicator } from '../TopBar.styles';

/**
 * Modal for saving to current iteration with screenshot option
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {Function} onClose - Handler to close the modal
 * @param {Function} onSave - Handler to save to current iteration
 * @param {boolean} isLoading - Whether save is in progress
 * @param {Function} onRipple - Ripple effect handler for buttons
 * @param {boolean} captureScreenshot - Whether to capture screenshot
 * @param {Function} onScreenshotChange - Handler for screenshot checkbox
 * @param {string} iterationName - Current iteration name
 */
const SaveModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  isLoading,
  onRipple,
  captureScreenshot,
  onScreenshotChange,
  iterationName
}) => {
  if (!isOpen) return null;

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
              background: 'linear-gradient(135deg, #4ee0c8, #2fc6b5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}
          >
            💾
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 6px 0' }}>Save to current iteration</h3>
            <div style={{ color: '#bfc7ee', fontSize: 13 }}>
              {iterationName ? `Update iteration: "${iterationName}"` : 'Update the current iteration with latest changes'}
            </div>
          </div>
        </div>

        <label style={{ 
          marginTop: 14,
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          cursor: 'pointer',
          padding: '12px',
          background: captureScreenshot ? 'rgba(78, 224, 200, 0.15)' : 'transparent',
          borderRadius: 8,
          border: '1px solid ' + (captureScreenshot ? '#4ee0c8' : 'rgba(255, 255, 255, 0.1)'),
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
              accentColor: '#4ee0c8',
              flexShrink: 0
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: captureScreenshot ? 600 : 500, 
              color: captureScreenshot ? '#4ee0c8' : '#e8ebff',
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
            onClick={onSave}
            disabled={isLoading}
            title="Save to current iteration"
          >
            Save {isLoading && <LoadingIndicator />}
          </RippleButton>
        </div>
      </PopupContent>
    </PopupOverlay>
  );
};

export default SaveModal;
