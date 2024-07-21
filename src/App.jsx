// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';
import Simulator from './Simulator/simulator';
import HomePage from './HomePage';
import CAD from './CAD/cad';
import GroupsComponent from './Constelation/GroundMap'
import ConstelationView from './Constelation/ConstelationView';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
          <Route path="*" element={<LandingPage />} />
          <Route path="/simulator" element={<Simulator/>} />
          <Route path="/homepage" element={<HomePage/>} />
          <Route path="/cad" element={<CAD/>} />
          <Route path='/constellation' element={<ConstelationView />} />
        </Routes>
    </Router>
  );
}

export default App;
