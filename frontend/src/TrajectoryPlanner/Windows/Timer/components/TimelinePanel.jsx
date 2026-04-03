/**
 * TimelinePanel component
 * Timeline visualization with render-only playback controls
 */

import React from 'react';
import TimelineZoomControls from './TimelineZoomControls';
import PlayheadOverlay from './PlayheadOverlay';

export const TimelinePanel = ({ 
  panelRef,
  timelineRef, 
  onZoomToFit,
  onZoomIn,
  onZoomOut,
  onRenderTimeUpdate,
  starttime,
  showSatBars,
  onToggleSatBars,
  analysisTab,
  onSwitchTab,
  filterEndpoint,
  onFilterChange,
  endpoints,
}) => {
  return (
    <div ref={panelRef} className="timeline-panel" style={{ position: 'relative' }}>
      <TimelineZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onZoomToFit={onZoomToFit}
        analysisTab={analysisTab}
        onSwitchTab={onSwitchTab}
        showSatBars={showSatBars}
        onToggleSatBars={onToggleSatBars}
        filterEndpoint={filterEndpoint}
        onFilterChange={onFilterChange}
        endpoints={endpoints}
      />
      <div ref={timelineRef} className="timeline-container"></div>
      {/* Transparent drag-handle overlay — always sits above vis-timeline DOM */}
      <PlayheadOverlay
        timelineRef={timelineRef}
        onRenderTimeUpdate={onRenderTimeUpdate}
        starttime={starttime}
      />
    </div>
  );
};
