import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { setUser } from '../Store/authSlice';
import GoogleAuthButton from './GoogleAuthButton';

const Login = ({ onLoginSuccess, onLoginFailure }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const u = userCredential.user;
      const safeUser = {
        uid: u.uid,
        displayName: u.displayName || null,
        email: u.email || null,
        photoURL: u.photoURL || null,
        providerId: u.providerData && u.providerData[0] ? u.providerData[0].providerId : null,
      };
      dispatch(setUser(safeUser));
      onLoginSuccess();
    } catch (error) {
      onLoginFailure(error.message);
    }
  };

  return (
    <div className="auth-form-container">
      <GoogleAuthButton 
        onSuccess={onLoginSuccess}
        onError={onLoginFailure}
      />
      
      <div className="auth-separator">
        <span>or</span>
      </div>

      <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
        <button type="submit" className="auth-submit">
          Log In
        </button>
      </form>
    </div>
  );
};

export default Login;
