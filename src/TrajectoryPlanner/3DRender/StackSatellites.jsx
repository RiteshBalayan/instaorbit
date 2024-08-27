import React from 'react';
import Satellite from './SimulateSatellite';
import { useSelector } from 'react-redux';

const StackSatellites = () => {
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);

  return (
    <>
      {satellitesConfig.map((config, index) => (
        <Satellite
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
          burn={config.burn}
        />
      ))}
    </>
  );
};

export default StackSatellites;
