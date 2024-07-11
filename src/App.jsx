// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';
import Simulator from './simulator';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
          <Route path="*" element={<LandingPage />} />
          <Route path="/simulator" element={<Simulator/>} />
        </Routes>
    </Router>
  );
}

export default App;
