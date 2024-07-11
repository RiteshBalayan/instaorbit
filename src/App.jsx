// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';
import Simulator from './Simulator/simulator';
import HomePage from './HomePage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
          <Route path="*" element={<LandingPage />} />
          <Route path="/simulator" element={<Simulator/>} />
          <Route path="/homepage" element={<HomePage/>} />
        </Routes>
    </Router>
  );
}

export default App;
