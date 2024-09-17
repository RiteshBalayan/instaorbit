import React, { useState, useEffect } from 'react';
import { fetchIterations, downloadIterationState } from '../../firebase/firebaseUtils';
import { useSelector, useDispatch } from 'react-redux';
import { List, ListItem, ListItemText, Typography, Box } from '@mui/material';

const ItterationsList = () => {
  const [itteration, setItteration] = useState([]);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const TrajectoryID = useSelector((state) => state.workingProject.trajectoryID);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const itterationData = await fetchIterations(TrajectoryID);
        if (itterationData.length === 0) {
          setError('No trajectories found or an error occurred.');
        } else {
          setItteration(itterationData);
        }
      } catch (err) {
        setError('Failed to fetch iterations.');
      }
    };

    fetchData();
  }, [TrajectoryID]);

  const handleClick = async (id) => {
    if (user) {
      setDownloading(true);
      try {
        const fields = ['timer','particles', 'CurrentState', 'satellites','workingProject']; // Add more fields if necessary
        for (const field of fields) {
          const downloadedState = await downloadIterationState(TrajectoryID, id, field);
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

  if (error) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 400, margin: 'auto', padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        Iteration List
      </Typography>
      <List sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}>
        {itteration.map((itt) => (
          <ListItem 
            key={itt.id} 
            button 
            onClick={() => handleClick(itt.id)} 
            sx={{ 
              marginBottom: 1, 
              borderRadius: 1, 
              '&:hover': { backgroundColor: '#e0e0e0' } 
            }}
          >
            <ListItemText 
              primary={`Commit Message: ${itt.name}`} 
              secondary={`ID: ${itt.id}`} 
              primaryTypographyProps={{ style: { color: 'black' } }} 
              secondaryTypographyProps={{ style: { color: 'black' } }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ItterationsList;
