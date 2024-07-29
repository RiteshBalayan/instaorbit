import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import './Styles/HomePage.css'; 
import Login from './firebase/login';
import SignOut from './firebase/signout';
import GoogleAuth from './firebase/googleauth';

const HomePage = () => {
  const user = useSelector((state) => state.auth.user);
  return (
    <div className="home-page">
        <div className="authenticator">
        <h1>Space Laboratory</h1>
        {user ? (
            <div>
            <h2>Hello, {user.displayName || user.email}</h2>
            <SignOut />
            </div>
        ) : (
            <div>
            <h2> Log in to save your Progress</h2>
            <Login />
            <GoogleAuth />
            </div>
        )}
        </div>
      <div className="card-container">
        <Link to="/cad" className="card">
          <div className="card-content">
            <h2>Craft Optimizer</h2>
            <p>Optimize your spacecraft design for efficiency and performance.</p>
          </div>
        </Link>
        <Link to="/trajectoryplanner" className="card">
          <div className="card-content">
            <h2>Trajectory Optimizer</h2>
            <p>Plan optimal trajectories for space missions.</p>
          </div>
        </Link>
        <Link to="/constellation" className="card">
          <div className="card-content">
            <h2>Constellation Planner</h2>
            <p>Design satellite constellations for optimal coverage and efficiency.</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
