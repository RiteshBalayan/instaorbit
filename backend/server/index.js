const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const funcs = require('./functions');
const { Sgp4 } = require('ootk');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// POST /simulate
// Expects JSON body with: { propagator, orbitalelements, burn, elapsedTime, referenceSystem, originalomega }
app.post('/simulate', (req, res) => {
  try {
    const { propagator, orbitalelements, burn = [], elapsedTime = 0, referenceSystem, originalomega } = req.body;

    // copy orbital elements
    let { a, e, i, Ω, ω, ν } = orbitalelements.elements || orbitalelements;
    let Timefix = orbitalelements.timefix;
    const mu = 398600.4418;

    // Apply Earth fixed reference update if requested (same logic as frontend)
    if (referenceSystem === 'EarthFixed') {
      const radiansPerSecond = 2 * Math.PI / (24 * 60 * 60);
      const dΩ = (radiansPerSecond * elapsedTime) % (2 * Math.PI);
      Ω = -(dΩ - originalomega) % (2 * Math.PI);
    }

    // Calculate mean anomaly
    let eccentricanomly = funcs.trueToEccentricAnomaly(ν, e);
    let meananomly = funcs.eccentricToMeanAnomaly(eccentricanomly, e);
    let timeperiod = 2 * Math.PI * Math.sqrt((a ** 3) / mu);

    if (!Timefix) {
      Timefix = (meananomly / (2 * Math.PI)) * timeperiod;
    }

    let timesincePerigee = (elapsedTime + Timefix) % timeperiod;
    meananomly = (2 * Math.PI * timesincePerigee) / timeperiod;

    // Apply burns if needed
    if (burn && burn.length > 0) {
      burn.forEach(b => {
        if (elapsedTime >= b.time) {
          const [position, velocity] = funcs.keplerianToCartesian({ a, e, i, Ω, ω, M: meananomly });
          velocity[0] += b.x; velocity[1] += b.y; velocity[2] += b.z;
          const newElements = funcs.cartesianToKeplerian({ position, velocity });
          a = newElements.a; e = newElements.e; i = newElements.i; Ω = newElements.Ω; ω = newElements.ω; ν = newElements.ν;
          eccentricanomly = funcs.trueToEccentricAnomaly(ν, e);
          meananomly = funcs.eccentricToMeanAnomaly(eccentricanomly, e);
          timeperiod = 2 * Math.PI * Math.sqrt((a ** 3) / mu);
          Timefix = (((meananomly / (2 * Math.PI)) * timeperiod) - b.time);
          timesincePerigee = (elapsedTime + Timefix) % timeperiod;
          meananomly = (2 * Math.PI * timesincePerigee) / timeperiod;
        }
      });
    }

    let position, velocity, kineticEnergy, potentialEnergy, totalEnergy;

    if (propagator === 'InstaOrbit') {
      [position, velocity] = funcs.keplerianToCartesian({ a, e, i, Ω, ω, M: meananomly });
      const v_squared = velocity.reduce((acc, val) => acc + (val * val), 0);
      kineticEnergy = (v_squared / 2);
      const r = Math.sqrt((position[0] ** 2) + (position[1] ** 2) + (position[2] ** 2));
      potentialEnergy = -mu / r;
      totalEnergy = kineticEnergy + potentialEnergy;
    } else if (propagator === 'SGP4') {
      const [tleLine1, tleLine2] = funcs.getTLE({ a, e, i, Ω, ω, M: meananomly }, new Date());
      const satrec = Sgp4.createSatrec(tleLine1, tleLine2);
      const state = Sgp4.propagate(satrec, elapsedTime / 60);
      position = [state.position.x, state.position.y, state.position.z];
      velocity = [state.velocity.x, state.velocity.y, state.velocity.z];
    }

    // scale to match frontend (division by 3185.5)
    const newX = position[0] / 3185.5;
    const newY = position[1] / 3185.5;
    const newZ = position[2] / 3185.5;

    const r = Math.sqrt((newX) ** 2 + (newY) ** 2 + (newZ) ** 2);
    const twoDphi = Math.atan2(newY, newX);
    const twoDTheta = Math.acos(newZ / r);
    const twodX = (twoDphi / Math.PI) * 7.5;
    const twodY = ((-twoDTheta / Math.PI) + 0.5) * 7.5;

    const tracePoint = { time: elapsedTime, x: newX, y: newY, z: newZ, mapX: twodX, mapY: twodY };

    const result = {
      tracePoint,
      timefix: Timefix,
      velocity,
      kineticEnergy,
      potentialEnergy,
      totalEnergy,
      elements: { a, e, ν, Ω, ω, i, M: meananomly }
    };

    res.json(result);
  } catch (err) {
    console.error('simulate error', err);
    res.status(500).json({ error: String(err) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`InstaOrbit simulation server listening on ${port}`));
