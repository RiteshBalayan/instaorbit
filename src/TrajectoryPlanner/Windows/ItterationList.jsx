import React, { useState, useEffect } from 'react';
import { fetchIterations, downloadIterationState } from '../../firebase/firebaseUtils';
import { useSelector } from 'react-redux';
import { Box, Card, CardContent, CardMedia, Typography, Button, CircularProgress, Grid } from '@mui/material';

const ItterationsList = () => {
  const [iterations, setIterations] = useState([]);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const TrajectoryID = useSelector((state) => state.workingProject.trajectoryID);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const iterationData = await fetchIterations(TrajectoryID);
        if (iterationData.length === 0) {
          setError('No iterations found.');
        } else {
          setIterations(iterationData);
        }
      } catch (err) {
        setError('Failed to fetch iterations.');
      }
    };

    if (TrajectoryID) {
      fetchData();
    }
  }, [TrajectoryID]);

  const handleClick = async (id) => {
    if (user) {
      setDownloading(true);
      try {
        const state = await downloadIterationState(id, user.uid);
        console.log('Downloaded iteration state:', state);
      } catch (err) {
        console.error('Failed to download iteration:', err);
      } finally {
        setDownloading(false);
      }
    } else {
      console.log('User not authenticated.');
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Iterations
      </Typography>

      {error && <Typography color="error">{error}</Typography>}

      {downloading && <CircularProgress />}

      {!downloading && iterations.length > 0 && (
        <Grid container spacing={3}>
          {iterations.map((iteration) => (
            <Grid item xs={12} sm={6} md={4} key={iteration.id}>
              <Card sx={{ maxWidth: 345 }}>
                {iteration.image ? (
                  <CardMedia
                    component="img"
                    height="140"
                    image={iteration.itterationImage}
                    alt={`Iteration ${iteration.name}`}
                  />
                ) : (
                  <CardMedia
                    component="img"
                    height="140"
                    image="placeholder-image-url.jpg" // A placeholder if no image is available
                    alt="No image available"
                  />
                )}

                <CardContent>
                  <Typography variant="h6" component="div">
                    {iteration.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created on: {new Date(iteration.createdAt).toLocaleDateString()}
                  </Typography>

                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2 }}
                    onClick={() => handleClick(iteration.id)}
                  >
                    Load Iteration
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {iterations.length === 0 && !error && <Typography>No iterations available.</Typography>}
    </Box>
  );
};

export default ItterationsList;
