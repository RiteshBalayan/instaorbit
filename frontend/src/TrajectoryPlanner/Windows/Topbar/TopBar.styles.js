import styled, { keyframes } from 'styled-components';

// Keyframes for animations
export const rippleKeyframes = keyframes`
  to {
    transform: scale(2.5);
    opacity: 0;
  }
`;

// Main container for the top bar
export const Bar = styled.div`
  width: 100%;
  background: linear-gradient(90deg, #232526 0%, #4e54c8 100%);
  color: #f5f6fa;
  font-family: 'Inter', 'Roboto', 'system-ui', sans-serif;
  box-shadow: 0 1px 6px rgba(44,44,54,0.10);
  padding: 0.18rem 0.7rem;
  border-bottom: 1px solid #2d2d2d;
  z-index: 9000;
  font-size: 0.85rem;
`;

// Container for all items in the top bar
export const Items = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
`;

// Individual item wrapper with tooltip support
export const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  position: relative;
  opacity: ${props => props.disabled ? 0.5 : 1};
  /* Tooltip for outer item wrapper using data-tooltip */
  &::after {
    content: attr(data-tooltip);
    position: absolute;
    white-space: nowrap;
    left: 50%;
    top: calc(100% + 8px);
    transform: translate(-50%, 0) scale(0.95);
    opacity: 0;
    background: rgba(10,12,18,0.95);
    color: #e8ebff;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 12px;
    transition: opacity 140ms ease, transform 140ms ease;
    pointer-events: none;
    box-shadow: 0 6px 20px rgba(2,6,23,0.6);
    z-index: 300;
  }
  &:hover::after, &:focus-within::after {
    opacity: 1;
    transform: translate(-50%, 6px) scale(1);
  }
`;

// Button with ripple effect and tooltip
export const RippleButton = styled.button`
  position: relative;
  overflow: hidden;
  background: linear-gradient(90deg, #4e54c8 0%, #8f94fb 100%);
  color: #fff;
  font-weight: 500;
  font-family: inherit;
  border: none;
  border-radius: 6px;
  padding: 0.22rem 0.7rem;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.08s, opacity 0.18s;
  box-shadow: 0 1px 4px rgba(78,84,200,0.08);
  font-size: 0.85rem;
  &:hover, &:focus {
    background: linear-gradient(90deg, #8f94fb 0%, #4e54c8 100%);
    box-shadow: 0 2px 8px rgba(78,84,200,0.18);
    transform: scale(1.03);
  }
  &:active {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: linear-gradient(90deg, #3a3f7a 0%, #5a5f8a 100%);
    box-shadow: none;
    &:hover, &:focus {
      transform: none;
      box-shadow: none;
      background: linear-gradient(90deg, #3a3f7a 0%, #5a5f8a 100%);
    }
    &:active {
      transform: none;
    }
  }
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
    transform: scale(0);
    animation: ${rippleKeyframes} 0.6s linear;
    pointer-events: none;
  }
  /* Custom tooltip using data-tooltip to ensure hover descriptions appear */
  &::after {
    content: attr(data-tooltip);
    position: absolute;
    white-space: nowrap;
    left: 50%;
    top: calc(100% + 8px);
    opacity: 0;
    pointer-events: none;
    background: rgba(10,12,18,0.95);
    color: #e8ebff;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 12px;
    transition: opacity 140ms ease, transform 140ms ease;
    transform: translate(-50%, 0) scale(0.95);
    box-shadow: 0 6px 20px rgba(2,6,23,0.6);
    z-index: 200;
  }
  &:hover::after, &:focus::after {
    opacity: 1;
    transform: translate(-50%, 6px) scale(1);
  }
`;

// Authentication section container
export const AuthSection = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  font-size: 0.85rem;
`;

// Container for authentication components
export const AuthContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

// Welcome message text
export const Welcome = styled.span`
  font-size: 0.85rem;
  color: #b2b6c8;
`;

// Project display wrapper
export const ProjectWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  max-width: 720px;
  margin-right: 8px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border-radius: 8px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(78, 84, 200, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// Project label (left side)
export const ProjectLabel = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
  color: rgba(255,255,255,0.92);
  background: rgba(255,255,255,0.06); /* very light translucent */
  padding: 6px 12px;
  border-radius: 8px 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  min-height: 34px;
`;

// Project title (right side)
export const ProjectTitle = styled.div`
  display: inline-flex;
  align-items: center;
  font-weight: 800;
  font-size: 1.12rem; /* larger readable name without extra vertical padding */
  color: rgba(206, 206, 206, 0.95);
  background: rgba(20,20,20,0.18); /* darker translucent grey */
  padding: 6px 12px;
  border-radius: 0 8px 8px 0;
  max-width: 640px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-height: 34px;
`;

// Popup overlay (modal background)
export const PopupOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(44, 44, 54, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

// Popup content container
export const PopupContent = styled.div`
  background: #232526;
  color: #f5f6fa;
  border-radius: 6px;
  box-shadow: 0 1px 6px rgba(44,44,54,0.10);
  padding: 0.5rem 0.7rem;
  min-width: 220px;
  max-width: 90vw;
  position: relative;
  font-size: 0.85rem;
  max-height: 340px;
  overflow-y: auto;
`;

// Close button for popups
export const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #414345;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: #4e54c8; }
`;

// Input field
export const Input = styled.input`
  background: #232526;
  color: #f5f6fa;
  border: 1px solid #4e54c8;
  border-radius: 4px;
  padding: 0.18rem 0.5rem;
  font-size: 0.85rem;
  margin-right: 0.3rem;
  margin-bottom: 0.3rem;
  &:focus { outline: none; border-color: #8f94fb; }
`;

// Loading indicator spinner
export const LoadingIndicator = styled.div`
  display: inline-block;
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid #8f94fb;
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-left: 0.3rem;
  @keyframes spin { to { transform: rotate(360deg); } }
`;
