import React from 'react';
import { createPortal } from 'react-dom';

export default function LeftControlBar({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="control-bar-layer" aria-hidden={false}>
      <div className="control-bar" role="region" aria-label="Simulation control bar">
        {children}
      </div>
    </div>,
    document.body
  );
}
