import React from 'react';
import { useDispatch } from 'react-redux';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { clearUser } from '../Store/authSlice';
import { updatetrajectoryName, updatetrajectoryID, updateitterationID } from '../Store/workingProject';

const SignOut = () => {
  const dispatch = useDispatch();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      dispatch(clearUser());
      // Clear project state on sign out
      dispatch(updatetrajectoryName('Unsaved Project'));
      dispatch(updatetrajectoryID(null));
      dispatch(updateitterationID(null));
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
