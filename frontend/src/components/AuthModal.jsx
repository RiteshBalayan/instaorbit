import React, { useState } from 'react';
import Login from '../firebase/login';
import SignUp from '../firebase/signup';

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleLoginSuccess = () => {
    setError('');
    onClose(); // Close modal on login success
  };

  const handleLoginFailure = (errorMessage) => {
    setError(errorMessage); // Set error message on login failure
  };

  const handleSignUpSuccess = () => {
    setError('');
    onClose(); // Close modal on sign-up success
  };

  const handleSignUpFailure = (errorMessage) => {
    setError(errorMessage); // Set error message on sign-up failure
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-header">
          <div className="auth-toggle">
            <button 
              className={`toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button 
              className={`toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>
        </div>

        {isLogin ? (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onLoginFailure={handleLoginFailure} 
          />
        ) : (
          <SignUp 
            onSignUpSuccess={handleSignUpSuccess} 
            onSignUpFailure={handleSignUpFailure} 
          />
        )}

        {error && <p style={{ color: 'red' }}>{error}</p>}  {/* Show error message */}
      </div>
    </div>
  );
};

export default AuthModal;
