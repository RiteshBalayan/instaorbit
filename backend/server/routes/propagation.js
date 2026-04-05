/**
 * @module routes/propagation
 * @description Orbital propagation endpoints for single and bulk satellite simulation.
 */

const express = require('express');
const router = express.Router();
const funcs = require('../functions');
const transforms = require('../transforms');
const attitudeLib = require('../attitude');
const linkLib = require('../linkComputation');
const { Sgp4 } = require('ootk');

/**
 * @swagger
 * /simulate:
 *   post:
 *     summary: Propagate a single satellite for one timestep
 *     description: |
 *       Computes the position, velocity, geodetic coordinates, attitude quaternion,
 *       and component articulation angles for a single satellite at the given elapsed time.
 *       Supports both InstaOrbit (Keplerian) and SGP4 propagators.
 *     tags:
 *       - Propagation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propagator
 *               - orbitalelements
 *             properties:
 *               propagator:
 *                 type: string
 *                 enum: [InstaOrbit, SGP4]
 *                 description: Propagation model to use
 *                 example: InstaOrbit
 *               orbitalelements:
 *                 type: object
 *                 description: Orbital elements and optional timefix
 *                 properties:
 *                   elements:
 *                     $ref: '#/components/schemas/OrbitalElements'
 *                   timefix:
 *                     type: number
 *                     nullable: true
 *                     description: Time-of-perigee offset (seconds). Computed automatically if null.
 *               burn:
 *                 type: array
 *                 description: List of impulsive burns (Δv in km/s, ECI frame)
 *                 items:
 *                   $ref: '#/components/schemas/Burn'
 *               elapsedTime:
 *                 type: number
 *                 description: Seconds since simulation start
 *                 example: 300
 *               starttime:
 *                 type: number
 *                 description: Simulation epoch as Unix timestamp (ms)
 *                 example: 1700000000000
 *               bodyFrame:
 *                 $ref: '#/components/schemas/BodyFrame'
 *               prevAttitude:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: "Previous attitude quaternion [qx, qy, qz, qw] for slew-rate limiting"
 *                 example: [0, 0, 0, 1]
 *               dt:
 *                 type: number
 *                 description: Timestep size in seconds (for slew-rate limiting)
 *                 example: 1
 *               allSatPositions:
 *                 type: object
 *                 description: "Positions of all satellites {satId: {x, y, z}} in ECI km — used for target pointing"
 *                 additionalProperties:
 *                   $ref: '#/components/schemas/Position3D'
 *               groundStations:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/GroundStation'
 *               prevComponentAngles:
 *                 type: object
 *                 description: "Previous component angles {compId: {a1, a2}} for slew-rate limiting"
 *     responses:
 *       200:
 *         description: Simulation result for one timestep
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimulateResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/simulate', (req, res) => {
  try {
    const { propagator, orbitalelements, burn = [], elapsedTime = 0, starttime, bodyFrame, prevAttitude, dt: clientDt, allSatPositions, groundStations: gsForAttitude, prevComponentAngles } = req.body;

    let { a, e, i, Ω, ω, ν } = orbitalelements.elements || orbitalelements;
    let Timefix = orbitalelements.timefix;
    const mu = 398600.4418;

    let eccentricanomly = funcs.trueToEccentricAnomaly(ν, e);
    let meananomly = funcs.eccentricToMeanAnomaly(eccentricanomly, e);
    let timeperiod = 2 * Math.PI * Math.sqrt((a ** 3) / mu);

    if (!Timefix) {
      Timefix = (meananomly / (2 * Math.PI)) * timeperiod;
    }

    let timesincePerigee = (elapsedTime + Timefix) % timeperiod;
    meananomly = (2 * Math.PI * timesincePerigee) / timeperiod;

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

    const newX = position[0] / 3185.5;
    const newY = position[1] / 3185.5;
    const newZ = position[2] / 3185.5;

    const utcMs = (starttime || Date.now()) + elapsedTime * 1000;
    const gmst = transforms.computeGMST(utcMs);
    const ecefPos = transforms.eci2ecef(position, gmst);
    const geo = transforms.ecef2geodetic(ecefPos);

    const twodX = (geo.lon / 180) * 7.5;
    const twodY = (geo.lat / 90) * 3.75;

    const tracePoint = {
      time: elapsedTime,
      x: newX, y: newY, z: newZ,
      mapX: twodX, mapY: twodY,
      lat: geo.lat, lon: geo.lon, alt: geo.alt,
    };

    let attitude = null;
    let componentAngles = null;
    if (bodyFrame) {
      const satPositionsKm = allSatPositions || {};
      attitude = attitudeLib.computeAttitude(
        position, velocity, bodyFrame, satPositionsKm,
        gsForAttitude || [], utcMs, prevAttitude || null, clientDt || 1,
      );

      if (bodyFrame.components && bodyFrame.components.length > 0) {
        componentAngles = attitudeLib.computeComponentAttitudes(
          bodyFrame.components, attitude.quaternion, position, velocity,
          satPositionsKm, gsForAttitude || [], utcMs, prevComponentAngles || {}, clientDt || 1,
        );
      }
    }

    const result = {
      tracePoint, timefix: Timefix, velocity,
      kineticEnergy, potentialEnergy, totalEnergy,
      elements: { a, e, ν, Ω, ω, i, M: meananomly },
      geodetic: geo, attitude, componentAngles,
    };

    res.json(result);
  } catch (err) {
    console.error('simulate error', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * @swagger
 * /simulate-bulk:
 *   post:
 *     summary: Propagate multiple satellites over a time range
 *     description: |
 *       Batch propagation of N satellites over [0 … duration] at stepSize resolution.
 *       Computes trace points, attitudes, component angles, link budgets, and
 *       contact windows for the entire time span in a single request.
 *     tags:
 *       - Propagation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - satellites
 *               - starttime
 *               - duration
 *             properties:
 *               satellites:
 *                 type: array
 *                 description: Array of satellite configurations to propagate
 *                 items:
 *                   $ref: '#/components/schemas/BulkSatellite'
 *               links:
 *                 type: array
 *                 description: Link configurations for inter-satellite / ground link analysis
 *                 items:
 *                   $ref: '#/components/schemas/LinkConfig'
 *               groundStations:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/GroundStation'
 *               starttime:
 *                 type: number
 *                 description: Simulation epoch as Unix timestamp (ms)
 *                 example: 1700000000000
 *               duration:
 *                 type: number
 *                 description: Total simulation duration in seconds
 *                 example: 86400
 *               stepSize:
 *                 type: number
 *                 description: Time step between computation points (seconds)
 *                 default: 1
 *                 example: 10
 *     responses:
 *       200:
 *         description: Bulk simulation results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkSimulateResponse'
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.post('/simulate-bulk', (req, res) => {
  try {
    const {
      satellites = [],
      links: linkConfigs = [],
      groundStations = [],
      starttime,
      duration,
      stepSize = 1,
    } = req.body;

    if (!satellites.length || !starttime || !duration) {
      return res.status(400).json({ error: 'satellites, starttime, and duration are required' });
    }

    const t0 = Date.now();
    const mu = 398600.4418;
    const totalSteps = Math.floor(duration / stepSize) + 1;

    const satStates = {};
    const satAttitudes = {};
    const satComponentAngles = {};
    const attitudeResult = {};
    const componentResult = {};
    for (const sat of satellites) {
      satAttitudes[sat.id] = null;
      satComponentAngles[sat.id] = {};
      attitudeResult[sat.id] = [];
      componentResult[sat.id] = [];
    }
    for (const sat of satellites) {
      const el = sat.elements;
      let { a, e, i, Ω, ω, ν } = el;
      let Timefix = sat.timefix;

      let eccAnom = funcs.trueToEccentricAnomaly(ν, e);
      let meanAnom = funcs.eccentricToMeanAnomaly(eccAnom, e);
      const period = 2 * Math.PI * Math.sqrt((a ** 3) / mu);

      if (!Timefix) {
        Timefix = (meanAnom / (2 * Math.PI)) * period;
      }

      satStates[sat.id] = { a, e, i, Ω, ω, Timefix, period };
    }

    const result = {};
    for (const sat of satellites) result[sat.id] = [];

    const linkTimeline = [];
    const activeLinksAtTime = {};
    let prevActivePairSet = '';

    for (let step = 0; step < totalSteps; step++) {
      const t = step * stepSize;
      const utcMs = starttime + t * 1000;
      const gmst = transforms.computeGMST(utcMs);

      const satPositionsKm = {};
      const satVelocitiesKms = {};

      for (const sat of satellites) {
        const st = satStates[sat.id];
        const { a, e, i, Ω, ω, Timefix, period } = st;

        let a_ = a, e_ = e, i_ = i, Ω_ = Ω, ω_ = ω, Tf = Timefix, T = period;
        if (sat.burns?.length) {
          let M_ = (2 * Math.PI * ((t + Tf) % T)) / T;
          for (const b of sat.burns) {
            if (t >= b.time) {
              const [pos, vel] = funcs.keplerianToCartesian({ a: a_, e: e_, i: i_, Ω: Ω_, ω: ω_, M: M_ });
              vel[0] += b.x; vel[1] += b.y; vel[2] += b.z;
              const ne = funcs.cartesianToKeplerian({ position: pos, velocity: vel });
              a_ = ne.a; e_ = ne.e; i_ = ne.i; Ω_ = ne.Ω; ω_ = ne.ω;
              const νn = ne.ν;
              const Ea = funcs.trueToEccentricAnomaly(νn, e_);
              M_ = funcs.eccentricToMeanAnomaly(Ea, e_);
              T = 2 * Math.PI * Math.sqrt((a_ ** 3) / mu);
              Tf = ((M_ / (2 * Math.PI)) * T) - b.time;
              M_ = (2 * Math.PI * ((t + Tf) % T)) / T;
            }
          }
        }

        const tsP = (t + Tf) % T;
        const M = (2 * Math.PI * tsP) / T;

        let position, velocity;
        if (sat.propagator === 'SGP4') {
          const [tl1, tl2] = funcs.getTLE({ a: a_, e: e_, i: i_, Ω: Ω_, ω: ω_, M }, new Date());
          const satrec = Sgp4.createSatrec(tl1, tl2);
          const state = Sgp4.propagate(satrec, t / 60);
          position = [state.position.x, state.position.y, state.position.z];
          velocity = [state.velocity.x, state.velocity.y, state.velocity.z];
        } else {
          [position, velocity] = funcs.keplerianToCartesian({ a: a_, e: e_, i: i_, Ω: Ω_, ω: ω_, M });
        }

        satPositionsKm[sat.id] = { x: position[0], y: position[1], z: position[2] };
        satVelocitiesKms[sat.id] = { x: velocity[0], y: velocity[1], z: velocity[2] };

        const sx = position[0] / 3185.5;
        const sy = position[1] / 3185.5;
        const sz = position[2] / 3185.5;
        const ecef = transforms.eci2ecef(position, gmst);
        const geo = transforms.ecef2geodetic(ecef);
        const mapX = (geo.lon / 180) * 7.5;
        const mapY = (geo.lat / 90) * 3.75;

        result[sat.id].push({
          time: t, x: sx, y: sy, z: sz,
          mapX, mapY, lat: geo.lat, lon: geo.lon, alt: geo.alt,
          vx: velocity[0], vy: velocity[1], vz: velocity[2],
        });
      }

      // Compute attitude for each satellite
      for (const sat of satellites) {
        if (sat.bodyFrame) {
          const pos = satPositionsKm[sat.id];
          const vel = satVelocitiesKms[sat.id];
          if (pos && vel) {
            const att = attitudeLib.computeAttitude(
              [pos.x, pos.y, pos.z], [vel.x, vel.y, vel.z],
              sat.bodyFrame, satPositionsKm, groundStations, utcMs,
              satAttitudes[sat.id], stepSize,
            );
            satAttitudes[sat.id] = att.quaternion;
            attitudeResult[sat.id].push({
              time: t, quaternion: att.quaternion,
              pointingTargetId: att.pointingTargetId, isSlewing: att.isSlewing,
            });
            const tp = result[sat.id][result[sat.id].length - 1];
            if (tp) {
              tp.qx = att.quaternion[0]; tp.qy = att.quaternion[1];
              tp.qz = att.quaternion[2]; tp.qw = att.quaternion[3];
            }

            if (sat.bodyFrame.components && sat.bodyFrame.components.length > 0) {
              const compAngles = attitudeLib.computeComponentAttitudes(
                sat.bodyFrame.components, att.quaternion,
                [pos.x, pos.y, pos.z], [vel.x, vel.y, vel.z],
                satPositionsKm, groundStations, utcMs,
                satComponentAngles[sat.id], stepSize,
              );
              satComponentAngles[sat.id] = compAngles;
              componentResult[sat.id].push({ time: t, angles: compAngles });
              if (tp) tp.componentAngles = compAngles;
            }
          }
        }
      }

      // Compute links at this timestep
      if (linkConfigs.length > 0) {
        const stepActiveLinks = [];
        const stepActivePairIds = [];

        for (const cfg of linkConfigs) {
          const lr = linkLib.computeLinkServer(cfg, satPositionsKm, groundStations, utcMs);
          if (lr.ready && lr.inLink) {
            const txPos = linkLib.getEndpointPosKm(cfg.txId, satPositionsKm, groundStations, utcMs);
            const rxPos = linkLib.getEndpointPosKm(cfg.rxId, satPositionsKm, groundStations, utcMs);
            if (txPos && rxPos) {
              stepActiveLinks.push({
                id: `${cfg.txId}-${cfg.rxId}`,
                txId: cfg.txId, rxId: cfg.rxId,
                from: { x: txPos.x / 3185.5, y: txPos.y / 3185.5, z: txPos.z / 3185.5 },
                to: { x: rxPos.x / 3185.5, y: rxPos.y / 3185.5, z: rxPos.z / 3185.5 },
              });
            }
            stepActivePairIds.push(`${cfg.txId}→${cfg.rxId}`);
          }
        }

        linkTimeline.push({ time: t, activePairIds: stepActivePairIds });
        activeLinksAtTime[t] = stepActiveLinks;
      }
    }

    const contactWindows = linkConfigs.length > 0
      ? linkLib.buildContactWindows(linkTimeline, starttime)
      : [];

    const computeTimeMs = Date.now() - t0;

    res.json({
      satellites: result,
      attitude: attitudeResult,
      components: componentResult,
      linkData: { contactWindows, activeLinksAtTime },
      meta: { totalSteps, stepSize, duration, computeTimeMs },
    });
  } catch (err) {
    console.error('simulate-bulk error', err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
