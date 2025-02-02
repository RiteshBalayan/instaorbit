import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from './firebase';
import { setUser } from '../Store/authSlice';
import GoogleAuthButton from './GoogleAuthButton';

const SignUp = ({ onSignUpSuccess, onSignUpFailure }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const dispatch = useDispatch();

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      onSignUpFailure('Passwords do not match');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      dispatch(setUser(userCredential.user));
      onSignUpSuccess();
    } catch (error) {
      onSignUpFailure(error.message);
    }
  };

  return (
    <div className="auth-form-container">
      <GoogleAuthButton 
        onSuccess={onSignUpSuccess}
        onError={onSignUpFailure}
      />
      
      <div className="auth-separator">
        <span>or</span>
      </div>

      <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleSignUp(); }}>
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
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="auth-input"
        />
        <button type="submit" className="auth-submit">
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default SignUp;
