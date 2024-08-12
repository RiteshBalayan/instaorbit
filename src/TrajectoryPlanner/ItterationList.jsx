
import React, { useState, useEffect } from 'react';
import { fetchIterations } from '../firebase/firebaseUtils';
import { useSelector, useDispatch } from 'react-redux';

const ItterationsList = () => {
  const [Itteration, setItteration] = useState([]);
  const [error, setError] = useState(null);
  const TrajectoryID = useSelector((state) => state.workingProject.trajectoryID);

  useEffect(() => {
    const fetchData = async () => {
      const itterationData = await fetchIterations(TrajectoryID);
      if (itterationData.length === 0) {
        setError("No trajectories found or an error occurred.");
      } else {
        setItteration(itterationData);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Itteration List</h2>
      <ul>
        {Itteration.map((itt, index) => (
          <li key={index}>
            ID: {itt.id}, Name: {itt.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ItterationsList;
