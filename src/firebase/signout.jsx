import React from 'react';
import { useDispatch } from 'react-redux';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { clearUser } from '../Store/authSlice';

const SignOut = () => {
  const dispatch = useDispatch();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      dispatch(clearUser());
    } catch (error) {
      console.error('Sign out error:', error.message);
    }
  };

  return (
    <button 
      onClick={handleSignOut}
      className="auth-button signout-btn"
    >
      Sign Out
    </button>
  );
};

export default SignOut;
