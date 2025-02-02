import React, { useState } from 'react';
import Login from '../firebase/login';
import SignUp from '../firebase/signup';

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
        onClose(); // Close modal after successful login
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await registerWithEmail(email, password);
        onClose(); // Close modal after successful registration
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
      onClose(); // Close modal after successful Google auth
    } catch (err) {
      setError(err.message);
    }
  };

  // Reset form state when modal is closed
  const handleClose = () => {
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
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
          <Login onSuccess={onClose} />
        ) : (
          <SignUp onSuccess={onClose} />
        )}
      </div>
    </div>
  );
};

export default AuthModal; 