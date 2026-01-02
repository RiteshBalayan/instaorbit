import React from 'react';

/**
 * Toast notification component for displaying temporary messages
 * @param {string} message - The message to display
 * @param {Function} onClose - Optional handler when notification closes
 */
const NotificationToast = ({ message }) => {
  if (!message) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top: 12,
        zIndex: 12000
      }}
    >
      <div 
        style={{
          background: 'linear-gradient(90deg, #6f77ff, #4e54c8)',
          color: '#061427',
          padding: '10px 14px',
          borderRadius: 10,
          boxShadow: '0 8px 30px rgba(12, 14, 30, 0.6)',
          fontWeight: 600
        }}
      >
        {message}
      </div>
    </div>
  );
};

export default NotificationToast;
