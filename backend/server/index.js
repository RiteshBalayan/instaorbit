const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const funcs = require('./functions');
const transforms = require('./transforms');
const linkLib = require('./linkComputation');
const { Sgp4 } = require('ootk');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// GET /health
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// POST /simulate
// Expects JSON body with: { propagator, orbitalelements, burn, elapsedTime, starttime }
// NOTE: referenceSystem and originalomega are accepted but IGNORED.
//       All propagation is now always in ECI.  Frame conversion happens
//       via GMST in this endpoint and on the frontend at render time.
app.post('/simulate', (req, res) => {
  try {
    const { propagator, orbitalelements, burn = [], elapsedTime = 0, starttime } = req.body;

    // copy orbital elements — always use the true inertial Ω (no hack)
    let { a, e, i, Ω, ω, ν } = orbitalelements.elements || orbitalelements;
    let Timefix = orbitalelements.timefix;
    const mu = 398600.4418;

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

    // ── Proper ECI → ECEF → geodetic conversion via GMST ──
    // starttime is the simulation epoch in ms; compute absolute UTC for this step
    const utcMs = (starttime || Date.now()) + elapsedTime * 1000;
    const gmst = transforms.computeGMST(utcMs);
    const ecefPos = transforms.eci2ecef(position, gmst);   // position is in km (ECI)
    const geo = transforms.ecef2geodetic(ecefPos);          // { lat, lon, alt } degrees/km

    // Keep legacy mapX/mapY for backward compatibility (derived from real lat/lon)
    const twodX = (geo.lon / 180) * 7.5;
    const twodY = (geo.lat / 90) * 3.75;

    const tracePoint = {
      time: elapsedTime,
      x: newX, y: newY, z: newZ,
      mapX: twodX, mapY: twodY,
      lat: geo.lat, lon: geo.lon, alt: geo.alt,
    };

    const result = {
      tracePoint,
      timefix: Timefix,
      velocity,
      kineticEnergy,
      potentialEnergy,
      totalEnergy,
      elements: { a, e, ν, Ω, ω, i, M: meananomly },
      geodetic: geo,
    };

    res.json(result);
  } catch (err) {
    console.error('simulate error', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ═══════════════════════════════════════════════════════════════
 *  POST /simulate-bulk
 *  Propagate N satellites over [0 … duration] at stepSize resolution,
 *  compute link budgets at every step, and return everything at once:
 *    • tracePoints per satellite
 *    • pre-computed activeLinks per timestep (sparse — only when status changes)
 *    • contactWindows built from the full timeline
 *
 *  Body: { satellites[], links[], groundStations[], starttime, duration, stepSize }
 * ═══════════════════════════════════════════════════════════════ */
app.post('/simulate-bulk', (req, res) => {
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

    // ── Per-satellite pre-computation ────────────────────────
    // Prepare orbital state for each satellite once, reuse across steps
    const satStates = {};
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

    // ── Output containers ────────────────────────────────────
    const result = {};              // { satId: tracePoints[] }
    for (const sat of satellites) result[sat.id] = [];

    // Link tracking
    const linkTimeline = [];        // [{ time, activePairIds[] }] for buildContactWindows
    const activeLinksAtTime = {};    // { time: activeLinks[] } — sparse, stores every step with links
    let prevActivePairSet = '';      // serialised set for change detection

    // ── Main time loop ───────────────────────────────────────
    for (let step = 0; step < totalSteps; step++) {
      const t = step * stepSize;
      const utcMs = starttime + t * 1000;
      const gmst = transforms.computeGMST(utcMs);

      // Positions in ECI km for link computation
      const satPositionsKm = {};

      // ── Propagate every satellite ──────────────────────────
      for (const sat of satellites) {
        const st = satStates[sat.id];
        const { a, e, i, Ω, ω, Timefix, period } = st;

        // Apply burns
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

        // Store raw ECI km for link computation
        satPositionsKm[sat.id] = { x: position[0], y: position[1], z: position[2] };

        // Scene-unit coords + geodetic
        const sx = position[0] / 3185.5;
        const sy = position[1] / 3185.5;
        const sz = position[2] / 3185.5;
        const ecef = transforms.eci2ecef(position, gmst);
        const geo = transforms.ecef2geodetic(ecef);
        const mapX = (geo.lon / 180) * 7.5;
        const mapY = (geo.lat / 90) * 3.75;

        result[sat.id].push({
          time: t,
          x: sx, y: sy, z: sz,
          mapX, mapY,
          lat: geo.lat, lon: geo.lon, alt: geo.alt,
        });
      }

      // ── Compute links at this timestep ─────────────────────
      if (linkConfigs.length > 0) {
        const stepActiveLinks = [];
        const stepActivePairIds = [];

        for (const cfg of linkConfigs) {
          const lr = linkLib.computeLinkServer(cfg, satPositionsKm, groundStations, utcMs);
          if (lr.ready && lr.inLink) {
            // Build the from/to in scene units for GlobeRender
            const txPos = linkLib.getEndpointPosKm(cfg.txId, satPositionsKm, groundStations, utcMs);
            const rxPos = linkLib.getEndpointPosKm(cfg.rxId, satPositionsKm, groundStations, utcMs);
            if (txPos && rxPos) {
              stepActiveLinks.push({
                id: `${cfg.txId}-${cfg.rxId}`,
                txId: cfg.txId,
                rxId: cfg.rxId,
                from: { x: txPos.x / 3185.5, y: txPos.y / 3185.5, z: txPos.z / 3185.5 },
                to:   { x: rxPos.x / 3185.5, y: rxPos.y / 3185.5, z: rxPos.z / 3185.5 },
              });
            }
            stepActivePairIds.push(`${cfg.txId}→${cfg.rxId}`);
          }
        }

        linkTimeline.push({ time: t, activePairIds: stepActivePairIds });

        // Store activeLinks for this time (always — so frontend can look up any time)
        activeLinksAtTime[t] = stepActiveLinks;
      }
    }

    // ── Build contact windows ────────────────────────────────
    const contactWindows = linkConfigs.length > 0
      ? linkLib.buildContactWindows(linkTimeline, starttime)
      : [];

    const computeTimeMs = Date.now() - t0;

    res.json({
      satellites: result,
      linkData: {
        contactWindows,
        activeLinksAtTime,
      },
      meta: { totalSteps, stepSize, duration, computeTimeMs },
    });
  } catch (err) {
    console.error('simulate-bulk error', err);
    res.status(500).json({ error: String(err) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`InstaOrbit simulation server listening on ${port}`));
