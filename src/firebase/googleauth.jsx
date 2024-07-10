import React from 'react';
import { useDispatch } from 'react-redux';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { setUser } from '../Store/authSlice';

const GoogleAuth = () => {
  const dispatch = useDispatch();

  const handleGoogleAuth = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      dispatch(setUser(userCredential.user));
      alert('Authenticated successfully with Google');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <button onClick={handleGoogleAuth}>Sign Up / Log In with Google</button>
  );
};

export default GoogleAuth;
