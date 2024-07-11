import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {

  return (
    <div className="landing-page">
      <section className="section hero">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="content"
        >
          <h1 className="hero-title">World's First Web-Based Space Laboratory</h1>
          <p className="hero-subtitle">Prototype and optimize space missions in hours, not months.</p>
          <Link to="/homepage">
          <motion.button
            className="cta-button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            Get Started in 10 Seconds
          </motion.button>
          </Link>
        </motion.div>
      </section>

      <section className="section features">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="content"
        >
          <h2 className="section-title">Main Features</h2>
          <div className="features-cards">
            <motion.div className="feature-card" whileHover={{ scale: 1.05 }}>
              <h3>Craft Optimizer</h3>
              <p>Web-based CAD modeler with a warehouse of components, and detailed simulation results.</p>
            </motion.div>
            <motion.div className="feature-card" whileHover={{ scale: 1.05 }}>
              <h3>Trajectory Optimizer</h3>
              <p>Optimize craft orientation, orbit, fuel, and time with detailed simulation data.</p>
            </motion.div>
            <motion.div className="feature-card" whileHover={{ scale: 1.05 }}>
              <h3>Constellation Planner</h3>
              <p>GIS/Orbit planner to simulate constellations for economic and technical feasibility.</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="section craft">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="content"
        >
          <h2 className="section-title">Craft Optimizer</h2>
          <ul className="section-list">
            <li>Web-based CAD modeler</li>
            <li>Online warehouse of components</li>
            <li>Simulate thermal, power, fuel, and radiation conditions</li>
            <li>Import your CAD models</li>
            <li>Get detailed simulation results</li>
          </ul>
        </motion.div>
      </section>

      <section className="section trajectory">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="content"
        >
          <h2 className="section-title">Trajectory Optimizer</h2>
          <ul className="section-list">
            <li>Optimize craft orientation, orbit, fuel, and time</li>
            <li>Simulate spacecraft burns</li>
            <li>Get data on sunlight, radiation, and fuel consumption</li>
            <li>Download trajectory data for further analysis</li>
          </ul>
        </motion.div>
      </section>

      <section className="section constellation">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="content"
        >
          <h2 className="section-title">Constellation Planner</h2>
          <ul className="section-list">
            <li>GIS/Orbit planner</li>
            <li>Select locations as polygons/points</li>
            <li>Define observation windows and priorities</li>
            <li>Simulate constellations for economic and technical feasibility</li>
            <li>Generate detailed reports</li>
          </ul>
        </motion.div>
      </section>

      <section className="section additional-info">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="content"
        >
          <h2 className="section-title">Additional Information</h2>
          <ul className="section-list">
            <li>Accurate simulations for industry standards</li>
            <li>Built-in version control</li>
            <li>Collaborate with multiple users in real-time</li>
            <li>API and command-line interface for advanced features</li>
          </ul>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;
