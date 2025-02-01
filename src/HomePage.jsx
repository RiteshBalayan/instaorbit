import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import './Styles/HomePage.css';
import Login from './firebase/login';
import SignOut from './firebase/signout';
import GoogleAuth from './firebase/googleauth';
import { motion } from 'framer-motion';

const HomePage = () => {
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="home-container">
      <div className="background-animation"></div>
      
      <nav className="nav-bar">
        <motion.div 
          className="logo"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="logo-text">Space Lab</span>
          <div className="logo-underline"></div>
        </motion.div>
        
        <div className="auth-nav">
          {user ? (
            <motion.div 
              className="user-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="user-welcome">Welcome, {user.displayName || user.email}</span>
              <SignOut />
            </motion.div>
          ) : (
            <motion.div 
              className="auth-buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <GoogleAuth />
              <Login />
            </motion.div>
          )}
        </div>
      </nav>

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
            <h1 className="glitch" data-text="Space Mission Design Lab">Space Mission Design Lab</h1>
            <p className="hero-subtitle">Advanced tools for the next generation of space exploration</p>
            <div className="hero-decoration">
              <span className="line"></span>
              <span className="dot"></span>
              <span className="line"></span>
            </div>
          </motion.div>
        </section>

        <section className="tools-section">
          <div className="section-header">
            <h2>Our Tools</h2>
            <div className="section-decoration"></div>
          </div>
          
          <motion.div 
            className="tools-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {[
              {
                to: "/trajectoryplanner",
                icon: "🛰️",
                title: "Trajectory Planner",
                description: "Design optimal trajectories for space missions",
                features: ["Orbital mechanics", "Delta-v optimization", "Mission planning"],
                gradient: "gradient-1"
              },
              {
                to: "/cad",
                icon: "🚀",
                title: "Spacecraft Designer",
                description: "Design and optimize spacecraft systems",
                features: ["3D modeling", "System analysis", "Performance optimization"],
                gradient: "gradient-2"
              },
              {
                to: "/constellation",
                icon: "⚡",
                title: "Constellation Designer",
                description: "Plan satellite constellation networks",
                features: ["Coverage analysis", "Network optimization", "Deployment strategy"],
                gradient: "gradient-3"
              }
            ].map((tool, index) => (
              <motion.div
                key={tool.title}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link to={tool.to} className={`tool-card ${tool.gradient}`}>
                  <div className="card-content">
                    <div className="tool-icon">{tool.icon}</div>
                    <h2>{tool.title}</h2>
                    <p>{tool.description}</p>
                    <div className="tool-features">
                      {tool.features.map((feature, i) => (
                        <span key={i} className="feature-tag">{feature}</span>
                      ))}
                    </div>
                  </div>
                  <div className="card-overlay">
                    <span className="explore-text">Explore →</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
