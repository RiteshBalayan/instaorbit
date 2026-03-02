/**
 * Timeline transport controls component
 * Premiere Pro-style playback and zoom controls at bottom left
 */

import React from 'react';
import '../../../../Styles/simulator/TimelineZoomControls.css';

const TimelineZoomControls = ({ 
  onZoomIn, 
  onZoomOut, 
  onZoomToFit,
  onStepBackward,
  onStepForward,
  onFastBackward,
  onFastForward,
  onPlayPause,
  isPlaying,
  showSatBars,
  onToggleSatBars,
  analysisTab,
  onSwitchTab,
}) => {
  const isLinkTab = analysisTab === 'link-analysis';
  const handleToggleLinkAnalysis = () => {
    if (onSwitchTab) {
      onSwitchTab(isLinkTab ? 'timeline' : 'link-analysis');
    }
  };
  return (
    <div className="timeline-zoom-controls">
      {/* Fast backward */}
      <button
        className="transport-btn"
        onClick={onFastBackward}
        title="Fast Backward (Shift + ←)"
        aria-label="Fast backward"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4l-6 4 6 4V4zm1 0v8l6-4-6-4z"/>
        </svg>
      </button>

      {/* Step backward */}
      <button
        className="transport-btn"
        onClick={onStepBackward}
        title="Step Backward (←)"
        aria-label="Step backward"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 4h2v8H2V4zm3 0l6 4-6 4V4z"/>
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        className="transport-btn play-pause-btn"
        onClick={onPlayPause}
        title="Play/Pause (Space)"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 4h3v8H4V4zm5 0h3v8H9V4z"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 3l9 5-9 5V3z"/>
          </svg>
        )}
      </button>

      {/* Step forward */}
      <button
        className="transport-btn"
        onClick={onStepForward}
        title="Step Forward (→)"
        aria-label="Step forward"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M12 4h2v8h-2V4zM5 4l6 4-6 4V4z"/>
        </svg>
      </button>

      {/* Fast forward */}
      <button
        className="transport-btn"
        onClick={onFastForward}
        title="Fast Forward (Shift + →)"
        aria-label="Fast forward"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 4l6 4-6 4V4zm7 0l6 4-6 4V4z"/>
        </svg>
      </button>

      {/* Divider */}
      <div className="controls-divider"></div>

      {/* Zoom out */}
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
      
      {/* Zoom to fit */}
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
      
      {/* Zoom in */}
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

      {/* Divider */}
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
