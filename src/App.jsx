import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Simulator from './TrajectoryPlanner/Simulator';
import HomePage from './HomePage';
import CAD from './CAD/cad';
import ConstelationView from './Constelation/ConstelationView';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
          <Route path="*" element={<HomePage/>} />
          <Route path="/trajectoryplanner" element={<Simulator/>} />
          <Route path="/cad" element={<CAD/>} />
          <Route path='/constellation' element={<ConstelationView />} />
        </Routes>
    </Router>
  );
}

export default App;
