// TrajectoriesList.js
import React, { useState, useEffect } from 'react';
import { fetchTrajectories } from '../firebase/firebaseUtils';

const TrajectoriesList = () => {
  const [trajectories, setTrajectories] = useState([]);
  const [error, setError] = useState(null);

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

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Trajectories List</h2>
      <ul>
        {trajectories.map((trajectory, index) => (
          <li key={index}>
            ID: {trajectory.id}, Name: {trajectory.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrajectoriesList;
