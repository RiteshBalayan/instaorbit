import React from 'react';
import { AuthSection, AuthContainer, Welcome } from '../TopBar.styles';
import GoogleAuth from '../../../../firebase/googleauth';
import SignOut from '../../../../firebase/signout';

/**
 * Component for authentication section (login/logout with user info)
 * @param {Object} user - Current authenticated user object
 */
const AuthenticationSection = ({ user }) => {
  return (
    <AuthSection>
      {user ? (
        <AuthContainer>
          <Welcome>Hello, {user.displayName || user.email}</Welcome>
          <SignOut className="auth-button" />
        </AuthContainer>
      ) : (
        <AuthContainer>
          <Welcome>Log in to save your Progress</Welcome>
          <GoogleAuth className="auth-button" />
        </AuthContainer>
      )}
    </AuthSection>
  );
};

export default AuthenticationSection;
