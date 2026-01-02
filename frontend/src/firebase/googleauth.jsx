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
      const u = userCredential.user;
      const safeUser = {
        uid: u.uid,
        displayName: u.displayName || null,
        email: u.email || null,
        photoURL: u.photoURL || null,
        providerId: u.providerData && u.providerData[0] ? u.providerData[0].providerId : null,
      };
      dispatch(setUser(safeUser));
      alert('Authenticated successfully with Google');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <button onClick={handleGoogleAuth} >Sign Up / Log In with Google</button>
  );
};

export default GoogleAuth;
