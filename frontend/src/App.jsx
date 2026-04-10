import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TrajectoryPlanner from './TrajectoryPlanner/TrajectoryPlanner';
import HomePage from './HomePage';
import CAD from './CAD/cad';
import ConstelationView from './Constelation/ConstelationView';
import DisplayWindow from './DisplayWindow/DisplayWindow';
import './Styles/App.css';

function App() {
  return (
    <Router>
      <Routes>
          <Route path="*" element={<HomePage/>} />
          <Route path="/trajectoryplanner" element={<TrajectoryPlanner/>} />
          <Route path="/cad" element={<CAD/>} />
          <Route path='/constellation' element={<ConstelationView />} />
          <Route path='/display' element={<DisplayWindow />} />
        </Routes>
    </Router>
  );
}

export default App;
