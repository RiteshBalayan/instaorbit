import React from 'react';
import RealSimulator from './RealSimulator';
import { useSelector } from 'react-redux';

const SimuStackSatellites = () => {
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);

  return (
    <>
      {satellitesConfig.map((config, index) => (
        <RealSimulator
          key={index}
          particleId={config.id}
          argumentOfPeriapsis={config.argumentOfPeriapsis}
          inclination={config.inclination}
          eccentricity={config.eccentricity}
          semimajoraxis={config.semimajoraxis}
          assendingnode={config.assendingnode}
          trueanomly={config.trueanomly}
          propagator={config.propagator}
          time={config.time}
        />
      ))}
    </>
  );
};

export default SimuStackSatellites;
