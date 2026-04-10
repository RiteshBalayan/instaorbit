/**
 * Timeline transport controls component
 * RENDER-ONLY playback controls + zoom for the analysis panel.
 *
 * These controls advance RenderTime through already-simulated data.
 * They never trigger new simulation — only display existing trace points.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateRenderTime } from '../../../../Store/timeSlice';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import '../../../../Styles/simulator/TimelineZoomControls.css';

/* Render-speed presets in sim-seconds per real-second */
const RENDER_SPEED_MARKS = {
  1: '1s',
  10: '10s',
  30: '30s',
  60: '1m',
  300: '5m',
  900: '15m',
};

const TimelineZoomControls = ({ 
  onZoomIn, 
  onZoomOut, 
  onZoomToFit,
  showSatBars,
  onToggleSatBars,
  analysisTab,
  onSwitchTab,
  filterEndpoint,
  onFilterChange,
  endpoints,
}) => {
  const dispatch = useDispatch();
  const particles = useSelector(s => s.particles.particles) || [];
  const RenderTime = useSelector(s => s.timer.RenderTime);
  const elapsedTime = useSelector(s => s.timer.elapsedTime);

  /* Render playback state */
  const [renderPlaying, setRenderPlaying] = useState(false);
  const [renderSpeed, setRenderSpeed] = useState(1);       // sim-secs per real-sec
  const [noDataToast, setNoDataToast] = useState(false);
  const intervalRef = useRef(null);

  /* Compute the maximum simulated time across all particles */
  const maxSimTime = particles.reduce((mx, p) => {
    if (!p.tracePoints?.length) return mx;
    const last = p.tracePoints[p.tracePoints.length - 1];
    return Math.max(mx, last.time ?? 0);
  }, 0);

  const hasSimData = maxSimTime > 0;

  /* Guard: show toast if user tries to render with no sim data */
  const guardNoData = useCallback(() => {
    if (!hasSimData) {
      setNoDataToast(true);
      setTimeout(() => setNoDataToast(false), 3000);
      return true;
    }
    return false;
  }, [hasSimData]);

  /* Render playback interval */
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!renderPlaying) return;

    const FPS = 30;
    const tickMs = Math.round(1000 / FPS);          // ~33 ms
    const stepPerTick = renderSpeed / FPS;            // sim-seconds per frame

    intervalRef.current = setInterval(() => {
      dispatch((_, getState) => {
        const state = getState();
        const currentRT = state.timer.RenderTime;
        // Compute maxSimTime from latest state
        const pts = state.particles.particles || [];
        const mx = pts.reduce((m, p) => {
          if (!p.tracePoints?.length) return m;
          return Math.max(m, p.tracePoints[p.tracePoints.length - 1].time ?? 0);
        }, 0);

        if (currentRT >= mx && mx > 0) {
          // Reached end of simulation data — stop render playback
          setRenderPlaying(false);
          return;
        }
        const next = Math.min(currentRT + stepPerTick, mx);
        dispatch(updateRenderTime(Math.round(next * 1000) / 1000));
      });
    }, tickMs);

    return () => clearInterval(intervalRef.current);
  }, [renderPlaying, renderSpeed, dispatch]);

  /* Stop render if sim data disappears */
  useEffect(() => {
    if (!hasSimData && renderPlaying) setRenderPlaying(false);
  }, [hasSimData, renderPlaying]);

  /* Render control handlers */
  const handleRenderPlayPause = () => {
    if (guardNoData()) return;
    setRenderPlaying(prev => !prev);
  };

  const handleRenderRewind = () => {
    if (guardNoData()) return;
    const next = Math.max(0, RenderTime - renderSpeed);
    dispatch(updateRenderTime(Math.round(next * 1000) / 1000));
  };

  const handleRenderFastForward = () => {
    if (guardNoData()) return;
    const next = Math.min(RenderTime + renderSpeed * 10, maxSimTime);
    dispatch(updateRenderTime(Math.round(next * 1000) / 1000));
  };

  const handleRenderToStart = () => {
    dispatch(updateRenderTime(0));
  };

  const handleRenderToEnd = () => {
    if (guardNoData()) return;
    dispatch(updateRenderTime(maxSimTime));
  };

  const isLinkTab = analysisTab === 'link-analysis';
  const handleToggleLinkAnalysis = () => {
    if (onSwitchTab) {
      onSwitchTab(isLinkTab ? 'timeline' : 'link-analysis');
    }
  };

  return (
    <div className="timeline-zoom-controls" style={{ gap: 3 }}>
      {/* No-data toast */}
      {noDataToast && (
        <div className="render-toast">
          ⚠️ No simulation data — run SIM first
        </div>
      )}

      {/* Filter */}
      {endpoints && endpoints.length > 0 && (
        <>
          <select
            className="timeline-filter-select"
            value={filterEndpoint || ''}
            onChange={(e) => onFilterChange && onFilterChange(e.target.value)}
            title="Filter timeline by endpoint"
          >
            <option value="">All Links</option>
            <optgroup label="🛰 Satellites">
              {endpoints.filter((ep) => ep.type === 'sat').map((ep) => (
                <option key={ep.id} value={ep.id}>{ep.label}</option>
              ))}
            </optgroup>
            <optgroup label="📡 Ground Stations">
              {endpoints.filter((ep) => ep.type === 'gs').map((ep) => (
                <option key={ep.id} value={ep.id}>{ep.label}</option>
              ))}
            </optgroup>
          </select>
          <div className="controls-divider"></div>
        </>
      )}

      {/* ── Render-only label ─────────────────────────────── */}
      <span className="render-label" title="Render playback — replays already-simulated data">
        RENDER
      </span>
      <div className="controls-divider"></div>

      {/* Go to start */}
      <button
        className="transport-btn"
        onClick={handleRenderToStart}
        title="Go to Start"
        aria-label="Go to start"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3h2v10H2V3zm3 5l7 5V3l-7 5z"/>
        </svg>
      </button>

      {/* Rewind (step back by renderSpeed) */}
      <button
        className="transport-btn"
        onClick={handleRenderRewind}
        title="Rewind"
        aria-label="Rewind"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4l-6 4 6 4V4zm1 0v8l6-4-6-4z"/>
        </svg>
      </button>

      {/* Render Play/Pause */}
      <button
        className={`transport-btn play-pause-btn${renderPlaying ? ' render-active' : ''}`}
        onClick={handleRenderPlayPause}
        title={renderPlaying ? 'Pause Render' : 'Play Render'}
        aria-label={renderPlaying ? 'Pause render' : 'Play render'}
        style={!hasSimData ? { opacity: 0.4 } : {}}
      >
        {renderPlaying ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 4h3v8H4V4zm5 0h3v8H9V4z"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 3l9 5-9 5V3z"/>
          </svg>
        )}
      </button>

      {/* Fast forward (jump by renderSpeed × 10) */}
      <button
        className="transport-btn"
        onClick={handleRenderFastForward}
        title="Fast Forward"
        aria-label="Fast forward"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 4l6 4-6 4V4zm7 0l6 4-6 4V4z"/>
        </svg>
      </button>

      {/* Go to end */}
      <button
        className="transport-btn"
        onClick={handleRenderToEnd}
        title="Go to End"
        aria-label="Go to end"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M12 3h2v10h-2V3zM5 3l7 5-7 5V3z"/>
        </svg>
      </button>

      <div className="controls-divider"></div>

      {/* Render speed slider */}
      <div className="render-speed-inline">
        <span className="render-speed-label">SPD</span>
        <Slider
          min={1}
          max={900}
          value={renderSpeed}
          onChange={setRenderSpeed}
          style={{ width: 80 }}
          railStyle={{ backgroundColor: 'rgba(255,255,255,0.10)', height: 3 }}
          trackStyle={{ backgroundColor: '#0078D7', height: 3 }}
          handleStyle={{
            backgroundColor: '#fff',
            border: '1px solid #0078D7',
            width: 10,
            height: 10,
            marginTop: -3.5,
            boxShadow: 'none',
          }}
        />
        <span className="render-speed-value">
          {renderSpeed < 60 ? `${renderSpeed}s/s` : `${Math.round(renderSpeed / 60)}m/s`}
        </span>
      </div>

      <div className="controls-divider"></div>

      {/* Zoom controls */}
      <button
        className="zoom-btn"
        onClick={onZoomOut}
        title="Zoom Out (Alt + -)"
        aria-label="Zoom out"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="7" width="10" height="2" />
        </svg>
      </button>
      
      <button
        className="zoom-btn"
        onClick={onZoomToFit}
        title="Zoom to Fit (Shift + Z)"
        aria-label="Zoom to fit"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2h5v2H4v3H2V2zm7 0h5v5h-2V4h-3V2zM4 11v-3H2v5h5v-2H4zm9 0h-3v2h5v-5h-2v3z"/>
        </svg>
      </button>
      
      <button
        className="zoom-btn"
        onClick={onZoomIn}
        title="Zoom In (Alt + +)"
        aria-label="Zoom in"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7 3h2v4h4v2H9v4H7V9H3V7h4V3z" />
        </svg>
      </button>

      <div className="controls-divider"></div>

      {/* Toggle satellite bars */}
      <button
        className={`zoom-btn sat-toggle-btn${showSatBars ? ' active' : ''}`}
        onClick={onToggleSatBars}
        title={showSatBars ? 'Hide Satellite Bars' : 'Show Satellite Bars'}
        aria-label={showSatBars ? 'Hide satellite bars' : 'Show satellite bars'}
      >
        🛰
      </button>

      {/* Toggle Link Analysis tab */}
      {onSwitchTab && (
        <>
          <div className="controls-divider"></div>
          <button
            className={`zoom-btn link-toggle-btn${isLinkTab ? ' active' : ''}`}
            onClick={handleToggleLinkAnalysis}
            title={isLinkTab ? 'Back to Timeline' : 'Link Analysis'}
            aria-label={isLinkTab ? 'Back to Timeline' : 'Link Analysis'}
          >
            📡
          </button>
        </>
      )}
    </div>
  );
};

export default TimelineZoomControls;
