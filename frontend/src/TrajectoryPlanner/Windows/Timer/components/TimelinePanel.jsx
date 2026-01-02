/**
 * TimelinePanel component
 * Timeline visualization with Premiere Pro-style zoom controls
 */

import React from 'react';
import TimelineZoomControls from './TimelineZoomControls';

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
  isPlaying
}) => {
  return (
    <div ref={panelRef} className="timeline-panel">
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
    </div>
  );
};
