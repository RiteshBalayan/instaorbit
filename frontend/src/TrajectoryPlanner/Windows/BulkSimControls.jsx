/**
 * BulkSimControls — UI for running a bulk simulation.
 *
 * Lives inside the Timer.jsx control panel.  Pure local state —
 * only touches Redux when loading results.
 *
 * Flow:
 *   1. User picks duration + step size, clicks "Run Bulk Sim"
 *   2. POST /simulate-bulk with current satellites, links, ground stations
 *   3. Response contains tracePoints + pre-computed activeLinksAtTime + contactWindows
 *   4. Dispatch into existing Redux stores — done
 */

import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { bulkLoadTracePoints, resetTracePoints } from '../../Store/StateTimeSeries';
import { updateElapsedTime, updateRenderTime } from '../../Store/timeSlice';
import {
  bulkLoadContactWindows,
  bulkLoadActiveLinksAtTime,
  clearBulkLinkData,
} from '../../Store/communicationSlice';
import './BulkSimControls.css';

const BulkSimControls = ({ compact = false } = {}) => {
  const dispatch = useDispatch();

  // Read what we need from Redux
  const satellites = useSelector((s) => s.satellites.satellitesConfig) || [];
  const particles = useSelector((s) => s.particles.particles) || [];
  const links = useSelector((s) => s.communication.links) || [];
  const globalThresholds = useSelector((s) => s.communication.globalThresholds || {});
  const groundStations = useSelector((s) => s.groundStations?.groundStations) || [];
  const starttime = useSelector((s) => s.timer.starttime);

  // Local UI state
  const [duration, setDuration] = useState(3600);
  const [stepSize, setStepSize] = useState(1);
  const [status, setStatus] = useState(null); // null | 'running' | 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('');

  const handleRun = useCallback(async () => {
    if (!satellites.length) {
      setStatus('error');
      setStatusMsg('No satellites configured');
      return;
    }

    setStatus('running');
    setStatusMsg('Computing…');

    try {
      // Build satellite payloads from config
      const satPayloads = satellites.map((sat) => {
        // Find the matching particle to get current elements if available
        const particle = particles.find((p) => p.id === sat.id);
        return {
          id: sat.id,
          propagator: sat.propagator || 'InstaOrbit',
          elements: {
            a: sat.InitialCondition.semimajoraxis,
            e: sat.InitialCondition.eccentricity,
            i: sat.InitialCondition.inclination * (Math.PI / 180),
            Ω: sat.InitialCondition.assendingnode * (Math.PI / 180),
            ω: sat.InitialCondition.argumentOfPeriapsis * (Math.PI / 180),
            ν: sat.InitialCondition.trueanomly * (Math.PI / 180),
          },
          timefix: null,
          burns: sat.burns || [],
          bodyFrame: sat.bodyFrame || null,
        };
      });

      const payload = {
        satellites: satPayloads,
        links,
        globalThresholds,
        groundStations,
        starttime,
        duration: Number(duration),
        stepSize: Number(stepSize),
      };

      const t0 = Date.now();
      const resp = await fetch('http://localhost:3001/simulate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const wallMs = Date.now() - t0;

      // ── Load results into Redux ────────────────────────────

      // 1. Clear bulk link data first
      dispatch(clearBulkLinkData());

      // 2. Load tracePoints per satellite
      for (const sat of satellites) {
        const tracePoints = data.satellites[sat.id];
        if (tracePoints?.length) {
          // Reset existing trace points first
          dispatch(resetTracePoints(sat.id));
          // Load bulk data
          dispatch(bulkLoadTracePoints({ id: sat.id, tracePoints }));
        }
      }

      // 3. Load pre-computed link data
      if (data.linkData) {
        if (data.linkData.contactWindows) {
          dispatch(bulkLoadContactWindows(data.linkData.contactWindows));
        }
        if (data.linkData.activeLinksAtTime) {
          dispatch(bulkLoadActiveLinksAtTime(data.linkData.activeLinksAtTime));
        }
      }

      // 4. Set elapsed time to duration so Simulator won't re-compute
      dispatch(updateElapsedTime(Number(duration)));
      // 5. Reset render time to 0 for user to scrub from start
      dispatch(updateRenderTime(0));

      const pts = Object.values(data.satellites).reduce((s, arr) => s + arr.length, 0);
      const cw = data.linkData?.contactWindows?.length || 0;
      setStatus('success');
      setStatusMsg(
        `${pts.toLocaleString()} pts, ${cw} contact windows — ${data.meta.computeTimeMs}ms server / ${wallMs}ms total`
      );
    } catch (err) {
      console.error('Bulk sim failed:', err);
      setStatus('error');
      setStatusMsg(String(err.message || err));
    }
  }, [satellites, particles, links, groundStations, starttime, duration, stepSize, dispatch]);

  return (
    <div className={`bulk-sim-section ${compact ? 'bulk-sim-section--compact' : ''}`}>
      <div className="bulk-sim-title">BULK</div>
      <div className="bulk-sim-row">
        <div className="bulk-sim-field">
          <label>Dur (s)</label>
          <input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="s"
          />
        </div>
        <div className="bulk-sim-field">
          <label>Step</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={stepSize}
            onChange={(e) => setStepSize(e.target.value)}
            placeholder="s"
          />
          {!compact && <label>s</label>}
        </div>
        <button
          className="bulk-sim-btn bulk-sim-btn-run"
          onClick={handleRun}
          disabled={status === 'running' || !satellites.length}
        >
          {status === 'running' ? 'RUN…' : 'RUN'}
        </button>
      </div>
      {statusMsg && (
        <div className={`bulk-sim-status ${status || ''}`}>{statusMsg}</div>
      )}
    </div>
  );
};

export default BulkSimControls;
