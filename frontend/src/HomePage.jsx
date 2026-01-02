import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import './Styles/HomePage.css';
import Login from './firebase/login';
import SignUp from './firebase/signup'
import SignOut from './firebase/signout';
import GoogleAuth from './firebase/googleauth';
import { motion } from 'framer-motion';
import AuthModal from './components/AuthModal';
import { FaBars, FaTimes, FaUser, FaSignOutAlt } from 'react-icons/fa';

const icons = {
  trajectoryPlanner: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="24" cy="24" r="18" />
      <path d="M24 6C24 6 32 14 32 24C32 34 24 42 24 42" />
      <path d="M24 6C24 6 16 14 16 24C16 34 24 42 24 42" />
      <path d="M6 24H42" />
    </svg>
  ),
  spacecraftDesigner: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M24 4L32 20H16L24 4Z" />
      <rect x="16" y="20" width="16" height="24" rx="2" />
      <path d="M14 28H18M30 28H34M14 36H18M30 36H34" />
    </svg>
  ),
  constellationDesigner: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="24" cy="12" r="4" />
      <circle cx="12" cy="32" r="4" />
      <circle cx="36" cy="32" r="4" />
      <path d="M24 16L12 28M24 16L36 28M12 32L36 32" />
    </svg>
  )
};

const HomePage = () => {
  const user = useSelector((state) => state.auth.user);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const updateCursor = (e) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', updateCursor);
    return () => window.removeEventListener('mousemove', updateCursor);
  }, []);

  return (
    <div className="home-container">
     
      
      <nav className="navbar">
        <motion.div 
          className="logo"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <a href="/" className="logo-link">
            <img
              src="/satellite-svgrepo-com-light.svg"
              alt="InstaOrbit Logo"
            />
            <div className="logo-text-wrapper">
              <span className="logo-text">InstaOrbit</span>
            </div>
            <div className="logo-underline"></div>
          </a>
        </motion.div>

        <div className="auth-nav">
          {user ? (
            <motion.div 
              className="user-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="user-welcome">Welcome, {user.displayName || user.email}</span>
              <SignOut>
                <span>Sign Out</span>
                <FaSignOutAlt className="signout-icon" />
              </SignOut>
            </motion.div>
          ) : (
            <motion.div 
              className="auth-buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="auth-prompt-wrapper">
                <button 
                  className="auth-button"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  <span>Register &nbsp;/&nbsp; Login</span>
                  <FaUser className="auth-icon" />
                </button>
                <span className="auth-prompt-text">Sign in to save your progress</span>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <main className="main-content">
        <section className="hero-section">
          <div className="hero-background">
            <div className="stars"></div>
            <div className="twinkling"></div>
          </div>
          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1>Space Engineering Design Lab</h1>
            <p className="hero-subtitle">Advanced tools for the next generation of space exploration</p>
            <div className="hero-decoration">
             
            </div>
          </motion.div>
        </section>

        <section className="tools-section">
          <div className="section-header">
            <h2>Our Tools</h2>
            <div className="section-decoration"></div>
          </div>
          <div className="tools-grid">
            {[
              {
                to: "/trajectoryplanner",
                icon: icons.trajectoryPlanner,
                title: "Trajectory Planner",
                description: "Plan optimal trajectories for space missions",
                prototypeUrl: "/trajectoryplanner"
              },
              {
                to: "/cad",
                icon: icons.spacecraftDesigner,
                title: "Spacecraft Designer",
                description: "Optimise your spacecraft design for efficiency and performance",
                prototypeUrl: "/cad"
              },
              {
                to: "/constellation",
                icon: icons.constellationDesigner,
                title: "Constellation Optimiser",
                description: "Design satellite constellation networks for optimal coverage and efficiency",
                prototypeUrl: "/constellation"
              }
            ].map((tool, index) => (
              <div key={tool.title} className="tool-card">
                <div className="tool-content">
                  <div className="tool-icon">{tool.icon}</div>
                  <div className="tool-info">
                    <h2>{tool.title}</h2>
                    <p>{tool.description}</p>
                  </div>
                </div>
                <div className="card-actions">
                  <a href={tool.prototypeUrl} className="prototype-btn" target="_blank" rel="noopener noreferrer">
                    Check out the prototype
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Custom cursor elements */}
      <div 
        className="cursor"
        style={{
          left: `${cursorPosition.x}px`,
          top: `${cursorPosition.y}px`,
          transform: `translate(-50%, -50%)`
        }}
      />
      <div 
        className="cursor-ring"
        style={{
          left: `${cursorPosition.x}px`,
          top: `${cursorPosition.y}px`,
          transform: `translate(-50%, -50%)`
        }}
      />
    </div>
  );
};

export default HomePage;
