import React from 'react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Yes',
  cancelText = 'Cancel',
  confirmColor = '#8f94fb',
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
      }}
    >
      <div
        style={{
          background: '#0f1113',
          padding: 18,
          borderRadius: 10,
          width: 'min(88vw, 420px)',
        }}
      >
        <div style={{ color: '#e8ebff', fontWeight: 700, marginBottom: 10 }}>
          {title}
        </div>
        <div style={{ color: '#cdd4ff', marginBottom: 14 }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#cfd6ff',
              border: '1px solid rgba(255, 255, 255, 0.03)',
              padding: '6px 10px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: confirmColor,
              color: '#071023',
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
