/**
 * TimelinePanel component
 * Timeline visualization with Premiere Pro-style zoom controls
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
  onStepBackward,
  onStepForward,
  onFastBackward,
  onFastForward,
  onPlayPause,
  isPlaying,
  onRenderTimeUpdate,
  starttime,
}) => {
  return (
    <div ref={panelRef} className="timeline-panel" style={{ position: 'relative' }}>
      <TimelineZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onZoomToFit={onZoomToFit}
        onStepBackward={onStepBackward}
        onStepForward={onStepForward}
        onFastBackward={onFastBackward}
        onFastForward={onFastForward}
        onPlayPause={onPlayPause}
        isPlaying={isPlaying}
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
