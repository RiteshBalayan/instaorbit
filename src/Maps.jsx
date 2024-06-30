import React from 'react';
import Map from './Map';
import { useSelector } from 'react-redux';

const Maps = () => {

    const particles = useSelector(state => state.particles.particles);

  return (
    <>
      {particles.map((config, index) => (
        <Map
          key={index}
          particleId={config.id}
        />
      ))}
    </>
  );
};

export default Maps;
