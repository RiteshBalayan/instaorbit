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
          argumentOfPeriapsis={config.InitialCondition.argumentOfPeriapsis}
          inclination={config.InitialCondition.inclination}
          eccentricity={config.InitialCondition.eccentricity}
          semimajoraxis={config.InitialCondition.semimajoraxis}
          assendingnode={config.InitialCondition.assendingnode}
          trueanomly={config.InitialCondition.trueanomly}
          propagator={config.propagator}
          time={config.time}
        />
      ))}
    </>
  );
};

export default SimuStackSatellites;
