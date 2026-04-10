import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Typography, Snackbar, Alert } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import { addSatellite, togglePreview } from '../../../Store/satelliteSlice';
import { initializeParticles } from '../../../Store/StateTimeSeries';
import { updateCoordinate } from '../../../Store/CurrentState';
import { keplerianToCartesian, trueToEccentricAnomaly, eccentricToMeanAnomaly } from '../../Simulation/Functions';
import { computeGMST, eci2ecef, ecef2geodetic } from '../../../transforms';
import * as THREE from 'three';
import './SatelliteConfig.css';
import { SketchPicker } from 'react-color';

/**
 * Walker Delta / Walker Star constellation generator.
 *
 * Walker notation:  i : T/P/F
 *   T = total satellites
 *   P = number of equally-spaced orbital planes
 *   F = phasing parameter (0 … P-1)
 *   i = common inclination
 *
 * Plane n  → RAAN = n × 360°/P
 * Sat  s in plane n → true anomaly = s × 360°/S + n × F × 360°/T
 *   where S = T / P (satellites per plane)
 */

const COLORS = [
  '#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8',
  '#4dd0e1', '#aed581', '#ff8a65', '#f06292', '#7986cb',
  '#26c6da', '#dce775', '#ffa726', '#ef5350', '#ab47bc',
];

const AddConstellation = ({ onClose }) => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector((s) => s.satellites.satellitesConfig);
  const starttime = useSelector((s) => s.timer.starttime);

  // Walker parameters
  const [totalSats, setTotalSats] = useState(24);
  const [planes, setPlanes] = useState(6);
  const [phasing, setPhasing] = useState(1);
  const [inclination, setInclination] = useState(55);
  const [semiMajorAxis, setSemiMajorAxis] = useState(7000);
  const [eccentricity, setEccentricity] = useState(0);
  const [argPeriapsis, setArgPeriapsis] = useState(0);
  const [baseName, setBaseName] = useState('Walker');
  const [colorPerPlane, setColorPerPlane] = useState(true);
  const [baseColor, setBaseColor] = useState('#4fc3f7');
  const [showPicker, setShowPicker] = useState(false);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const satsPerPlane = planes > 0 ? Math.floor(totalSats / planes) : 0;
  const remainder = planes > 0 ? totalSats % planes : 0;

  // Derived orbital info
  const EARTH_RADIUS_KM = 6378.137;
  const mu = 398600.4418;
  const perigeeAlt = semiMajorAxis * (1 - eccentricity) - EARTH_RADIUS_KM;
  const apogeeAlt = semiMajorAxis * (1 + eccentricity) - EARTH_RADIUS_KM;
  const period = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu) / 60;
  const isInvalid =
    totalSats < 1 ||
    planes < 1 ||
    planes > totalSats ||
    remainder !== 0 ||
    phasing < 0 ||
    phasing >= planes ||
    eccentricity < 0 ||
    eccentricity >= 1 ||
    perigeeAlt + EARTH_RADIUS_KM < EARTH_RADIUS_KM;

  const handleGenerate = () => {
    if (isInvalid) return;

    const S = satsPerPlane;
    let nextId =
      satellitesConfig.length > 0
        ? Math.max(...satellitesConfig.map((s) => s.id)) + 1
        : 0;

    const generated = [];

    for (let p = 0; p < planes; p++) {
      const raanDeg = (p * 360) / planes;
      for (let s = 0; s < S; s++) {
        const truAnomalyDeg =
          (s * 360) / S + (p * phasing * 360) / totalSats;
        const id = nextId++;
        const name = `${baseName}-P${p + 1}-S${s + 1}`;
        const color = colorPerPlane
          ? COLORS[p % COLORS.length]
          : baseColor;

        // Build satellite config (same shape as AddSatellite)
        const sat = {
          id,
          name,
          propagator: 'InstaOrbit',
          preview: false,
          InitialCondition: {
            argumentOfPeriapsis: argPeriapsis,
            inclination,
            eccentricity,
            semimajoraxis: semiMajorAxis,
            assendingnode: raanDeg,
            trueanomly: truAnomalyDeg % 360,
            time: '0',
          },
          color,
          Simulation: true,
          Tracktail: 1000,
          FutureTrack: false,
          Tube: false,
          burns: [],
        };

        // Convert to Cartesian exactly like AddSatellite.handleAddSatellite
        const incRad = THREE.MathUtils.degToRad(inclination);
        const argPRad = THREE.MathUtils.degToRad(argPeriapsis);
        const raanRad = THREE.MathUtils.degToRad(raanDeg);
        const nuRad = THREE.MathUtils.degToRad(truAnomalyDeg % 360);

        const eccAnomaly = trueToEccentricAnomaly(nuRad, eccentricity);
        const meanAnomaly = eccentricToMeanAnomaly(eccAnomaly, eccentricity);

        const elements = {
          a: semiMajorAxis,
          e: eccentricity,
          M: meanAnomaly,
          Ω: raanRad,
          ω: argPRad,
          i: incRad,
        };

        const [position] = keplerianToCartesian(elements);
        const [posKmX, posKmY, posKmZ] = position;
        const x = posKmX / 3185.5;
        const y = posKmY / 3185.5;
        const z = posKmZ / 3185.5;

        // Compute geodetic for the initial trace point
        const gmst0 = computeGMST(starttime || Date.now());
        const ecef0 = eci2ecef([posKmX, posKmY, posKmZ], gmst0);
        const geo0  = ecef2geodetic(ecef0);
        const mapX0 = (geo0.lon / 180) * 7.5;
        const mapY0 = (geo0.lat / 90) * 3.75;

        generated.push({ sat, x, y, z, mapX0, mapY0, geo0, nuRad, raanRad, argPRad, incRad });
      }
    }

    // Dispatch all satellites in a batch
    generated.forEach(({ sat, x, y, z, mapX0, mapY0, geo0, nuRad, raanRad, argPRad, incRad }) => {
      dispatch(addSatellite(sat));
      dispatch(
        initializeParticles({
          id: sat.id,
          name: sat.name,
          tracePoints: [{ time: 0, x, y, z, mapX: mapX0, mapY: mapY0, lat: geo0.lat, lon: geo0.lon, alt: geo0.alt }],
        }),
      );
      dispatch(
        updateCoordinate({
          id: sat.id,
          timefix: null,
          coordinates: { time: 0, x, y, z, mapX: mapX0, mapY: mapY0, lat: geo0.lat, lon: geo0.lon, alt: geo0.alt },
          velocity: null,
          elements: {
            a: semiMajorAxis,
            e: eccentricity,
            ν: nuRad,
            Ω: raanRad,
            ω: argPRad,
            i: incRad,
          },
        }),
      );
    });

    setToast({
      open: true,
      message: `Added ${generated.length} satellites (${planes} planes × ${satsPerPlane} sats)`,
      severity: 'success',
    });

    if (onClose) onClose();
  };

  // Simple numeric input row
  const Row = ({ label, value, onChange, min, max, step = 1, unit = '' }) => (
    <div className="detail-row">
      <label className="detail-label">
        {label} {unit && <span style={{ opacity: 0.5, fontSize: 11 }}>({unit})</span>}
      </label>
      <input
        type="number"
        className="detail-input"
        style={{ width: '100%', maxWidth: 140 }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );

  return (
    <div className="satellite-config" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
      <div className="input-container">
        <h3>Walker Constellation</h3>
        <Typography variant="caption" sx={{ color: '#6b7280', mb: 1, display: 'block' }}>
          Notation: i:T/P/F — generates T satellites across P planes with phase offset F.
        </Typography>

        {/* ── Walker parameters ── */}
        <div className="detail-row">
          <label className="detail-label">Constellation Name</label>
          <input
            type="text"
            className="name-input"
            value={baseName}
            onChange={(e) => setBaseName(e.target.value)}
          />
        </div>

        <Row label="Total Satellites (T)" value={totalSats} onChange={setTotalSats} min={1} max={200} />
        <Row label="Orbital Planes (P)" value={planes} onChange={setPlanes} min={1} max={totalSats} />
        <Row label="Phasing (F)" value={phasing} onChange={setPhasing} min={0} max={Math.max(planes - 1, 0)} />
        <Row label="Inclination" value={inclination} onChange={setInclination} min={0} max={180} unit="deg" />
        <Row label="Semi-major Axis" value={semiMajorAxis} onChange={setSemiMajorAxis} min={6400} max={50000} step={100} unit="km" />
        <Row label="Eccentricity" value={eccentricity} onChange={setEccentricity} min={0} max={0.99} step={0.01} />
        <Row label="Arg. of Periapsis" value={argPeriapsis} onChange={setArgPeriapsis} min={0} max={360} unit="deg" />

        {/* ── Color ── */}
        <div className="detail-row" style={{ marginTop: 8 }}>
          <label className="detail-label">Color per Plane</label>
          <input
            type="checkbox"
            checked={colorPerPlane}
            onChange={(e) => setColorPerPlane(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
        </div>
        {!colorPerPlane && (
          <div className="detail-row">
            <label className="detail-label">Color</label>
            <div
              onClick={() => setShowPicker(!showPicker)}
              style={{
                backgroundColor: baseColor,
                width: 36,
                height: 36,
                border: '2px solid #d1d5db',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            />
            {showPicker && (
              <>
                <div
                  onClick={() => setShowPicker(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                />
                <div style={{ position: 'absolute', zIndex: 9999 }}>
                  <SketchPicker color={baseColor} onChange={(c) => setBaseColor(c.hex)} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Summary ── */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: '#f0f4f8',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 12,
            color: '#374151',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, color: '#1f2937' }}>
            Constellation Summary
          </div>
          <div style={{ marginBottom: 3 }}>
            <span style={{ color: '#6b7280' }}>Walker Notation: </span>
            <span style={{ fontWeight: 600 }}>{inclination}° : {totalSats}/{planes}/{phasing}</span>
          </div>
          <div style={{ marginBottom: 3 }}>
            <span style={{ color: '#6b7280' }}>Sats per Plane: </span>
            <span style={{ fontWeight: 600 }}>
              {satsPerPlane}
              {remainder !== 0 && (
                <span style={{ color: '#ef4444' }}> ⚠️ T must be divisible by P (remainder {remainder})</span>
              )}
            </span>
          </div>
          <div style={{ marginBottom: 3 }}>
            <span style={{ color: '#6b7280' }}>RAAN spacing: </span>
            <span style={{ fontWeight: 600 }}>{(360 / planes).toFixed(2)}°</span>
          </div>
          <div style={{ marginBottom: 3 }}>
            <span style={{ color: '#6b7280' }}>In-plane spacing: </span>
            <span style={{ fontWeight: 600 }}>{satsPerPlane > 0 ? (360 / satsPerPlane).toFixed(2) : '—'}°</span>
          </div>
          <div style={{ marginBottom: 3 }}>
            <span style={{ color: '#6b7280' }}>Perigee Alt: </span>
            <span style={{ fontWeight: 600, color: perigeeAlt < 0 ? '#ef4444' : '#16a34a' }}>
              {perigeeAlt.toFixed(1)} km {perigeeAlt < 0 && '⚠️'}
            </span>
          </div>
          <div style={{ marginBottom: 3 }}>
            <span style={{ color: '#6b7280' }}>Apogee Alt: </span>
            <span style={{ fontWeight: 600 }}>{apogeeAlt.toFixed(1)} km</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Period: </span>
            <span style={{ fontWeight: 600 }}>{period.toFixed(1)} min ({(period / 60).toFixed(2)} hr)</span>
          </div>
        </div>

        {/* ── Preset buttons ── */}
        <div style={{ marginTop: 12 }}>
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
            Presets
          </Typography>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: 'GPS', t: 24, p: 6, f: 1, i: 55, a: 26560 },
              { label: 'Galileo', t: 24, p: 3, f: 1, i: 56, a: 29600 },
              { label: 'Iridium', t: 66, p: 6, f: 2, i: 86.4, a: 7150 },
              { label: 'Starlink shell-1', t: 72, p: 12, f: 1, i: 53, a: 6921 },
            ].map((p) => (
              <Button
                key={p.label}
                size="small"
                variant="outlined"
                sx={{ color: '#374151', borderColor: '#d1d5db', fontSize: 11, textTransform: 'none' }}
                onClick={() => {
                  setTotalSats(p.t);
                  setPlanes(p.p);
                  setPhasing(p.f);
                  setInclination(p.i);
                  setSemiMajorAxis(p.a);
                  setEccentricity(0);
                  setArgPeriapsis(0);
                  setBaseName(p.label);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Generate button ── */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button
            variant="contained"
            color="secondary"
            endIcon={<DoneIcon />}
            onClick={handleGenerate}
            disabled={isInvalid}
          >
            Generate {totalSats} Satellites
          </Button>
        </div>

        {isInvalid && (
          <Typography variant="caption" sx={{ color: '#ef4444', mt: 1, display: 'block' }}>
            Fix errors above before generating.
            {remainder !== 0 && ` T(${totalSats}) must be evenly divisible by P(${planes}).`}
          </Typography>
        )}
      </div>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AddConstellation;
