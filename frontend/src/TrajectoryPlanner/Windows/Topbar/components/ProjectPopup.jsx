import React, { useRef, useEffect } from 'react';
import TrajectoriesList from '../TrajectoryList';
import ItterationList from '../ItterationList';

/**
 * Popup component for selecting trajectories or iterations
 * @param {boolean} isOpen - Whether the popup is visible
 * @param {Function} onClose - Handler to close the popup
 * @param {Array} trajectories - List of trajectories
 * @param {Array} iterations - List of iterations
 * @param {string} type - Type of popup ('trajectory' or 'iteration')
 * @param {Function} onLoaded - Handler called after loading a trajectory/iteration
 */
const ProjectPopup = ({ isOpen, onClose, trajectories, iterations, type, onLoaded }) => {
  const popupRef = useRef(null);

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.45)'
      }}
    >
      <div 
        ref={popupRef}
        style={{
          width: 'min(92vw, 760px)',
          height: '48vh',
          borderRadius: 12,
          padding: 0,
          boxShadow: '0 20px 60px rgba(2, 6, 23, 0.8)',
          background: '#0f1113',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            background: 'transparent',
            border: 'none',
            color: '#cfd6ff',
            cursor: 'pointer',
            zIndex: 60,
            fontSize: '1.2rem'
          }}
        >
          ✕
        </button>

        {type === 'trajectory' ? (
          <>
            <div 
              style={{
                padding: '12px 14px 8px 14px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                zIndex: 50
              }}
            >
              <h3 style={{ margin: '0', color: '#e8ebff' }}>Select a Trajectory</h3>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              <TrajectoriesList 
                trajectories={trajectories}
                onClose={onClose}
                onLoaded={onLoaded}
              />
            </div>
          </>
        ) : (
          <>
            <div 
              style={{
                padding: '12px 14px 8px 14px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                zIndex: 50
              }}
            >
              <h3 style={{ margin: '0', color: '#e8ebff' }}>Select an Iteration</h3>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              <ItterationList 
                iterations={iterations}
                onClose={onClose}
                onLoaded={onLoaded}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectPopup;
