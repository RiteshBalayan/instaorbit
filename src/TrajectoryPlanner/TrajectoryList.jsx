import React, { useState, useEffect } from 'react';
import { fetchTrajectories, fetchIterations, downloadIterationState } from '../firebase/firebaseUtils';
import { Button, List, ListItem, ListItemText, Paper, Typography, Alert } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';

const TrajectoriesList = () => {
  const [trajectories, setTrajectories] = useState([]);
  const [iterations, setIterations] = useState([]);
  const [selectedTrajectory, setSelectedTrajectory] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      const trajectoriesData = await fetchTrajectories();
      if (trajectoriesData.length === 0) {
        setError("No trajectories found or an error occurred.");
      } else {
        setTrajectories(trajectoriesData);
      }
    };

    fetchData();
  }, []);

  const handleTrajectoryClick = async (trajectory) => {
    setSelectedTrajectory(trajectory);
    const iterationData = await fetchIterations(trajectory.id);
    if (iterationData.length === 0) {
      setError("No iterations found for this trajectory.");
    } else {
      setError(null);
      setIterations(iterationData);
    }
  };

  const handleIterationClick = async (iterationId) => {
    if (user) {
      setDownloading(true);
      try {
        const fields = ['timer','particles', 'CurrentState', 'satellites','workingProject']; // Add more fields if necessary
        for (const field of fields) {
          const downloadedState = await downloadIterationState(selectedTrajectory.id, iterationId, field);
          if (downloadedState) {
            dispatch({ type: `SET_${field.toUpperCase()}`, payload: downloadedState });
          }
        }
        alert('Program synced to this iteration data.');
        console.log('Download successful');
      } catch (error) {
        console.error('Download failed:', error);
      } finally {
        setDownloading(false);
      }
    } else {
      console.log('User not authenticated. Download operation not allowed.');
    }
  };

  const handleBackClick = () => {
    setSelectedTrajectory(null);
    setIterations([]);
    setError(null);
  };

  if (error && !selectedTrajectory) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      {selectedTrajectory ? (
        <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px' }}>
          <Typography variant="h5" gutterBottom>
            Iterations for Trajectory: {selectedTrajectory.name}
          </Typography>
          <Button variant="contained" color="primary" onClick={handleBackClick} style={{ marginBottom: '20px' }}>
            Back to Trajectories
          </Button>
          {error ? (
            <Alert severity="warning">{error}</Alert>
          ) : (
            <List>
              {iterations.map((itt, index) => (
                <ListItem
                  key={index}
                  button
                  onClick={() => handleIterationClick(itt.id)}
                  style={{
                    backgroundColor: '#f5f5f5',
                    marginBottom: '10px',
                    borderRadius: '5px',
                    padding: '10px',
                  }}
                >
                  <ListItemText primary={`Name: ${itt.name}`} secondary={`ID: ${itt.id}`} />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      ) : (
        <Paper elevation={3} style={{ padding: '20px' }}>
          <Typography variant="h5" gutterBottom>
            Trajectories List
          </Typography>
          <List>
            {trajectories.map((trajectory, index) => (
              <ListItem
                key={index}
                onClick={() => handleTrajectoryClick(trajectory)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: '#e0e0e0',
                  color: '#000',
                  padding: '10px',
                  marginBottom: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                }}
              >
                <ListItemText primary={`Name: ${trajectory.name}`} secondary={`ID: ${trajectory.id}`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </div>
  );
};

export default TrajectoriesList;
