/**
 * Timeline configuration utilities for vis-timeline
 * Handles timeline options, groups, and item creation
 */

import { DataSet } from 'vis-timeline/standalone';
import { getTimelineFormatConfig } from './timeFormatters';

/**
 * Creates timeline groups configuration
 * @returns {DataSet} Timeline groups dataset
 */
export const createTimelineGroups = () => {
  return new DataSet([
    { id: 1, content: 'Satellites', className: 'satellites-group' },
    { id: 2, content: 'Events', className: 'events-group' }
  ]);
};

/**
 * Creates timeline options configuration
 * Global callbacks with item.id filtering - only Render-time triggers updates
 * @param {number} minTime - Timeline start timestamp for time calculations
 * @param {Function} onRenderTimeUpdate - Callback when Render-time is dragged
 * @returns {object} Timeline options
 */
export const createTimelineOptions = (minTime, onRenderTimeUpdate) => {
  return {
    stack: true,
    align: 'centre',
    showCurrentTime: false,
    autoResize: true,
    height: '100%', // Use full available height
    orientation: 'top',
    horizontalScroll: true,
    verticalScroll: false,
    zoomable: true,
    zoomMin: 1000, // 1 second minimum zoom (smoother)
    zoomMax: 315360000000, // 10 years maximum zoom
    zoomFriction: 8, // Reduced friction for smoother zooming (was 20)
    moveable: true,
    snap: null, // Disable snapping during drag to prevent flickering
    editable: {
      remove: false,
      updateTime: false, // Disable globally - only Render-time has item-level override
      updateGroup: false, // Prevent accidental group changes
    },
    selectable: true,
    showMajorLabels: true,
    showMinorLabels: true,
    tooltip: {
      followMouse: true,
      overflowMethod: 'cap',
    },
    margin: {
      item: {
        horizontal: 2,
        vertical: 8,
      },
      axis: 5,
    },
    // Global callbacks - MUST be here, item-level callbacks don't work with DataSet!
    onMove: (item, callback) => {
      // ONLY process Render-time, ignore satellites
      if (item.id === 'Render-time') {
        const newRenderTime = (item.start.valueOf() - minTime) / 1000;
        onRenderTimeUpdate(newRenderTime);
        callback(item); // Apply the move
      } else {
        // Don't apply move for satellites - they stay locked
        return false;
      }
    },
    onMoving: (item, callback) => {
      // ONLY process Render-time, ignore satellites
      if (item.id === 'Render-time') {
        const newRenderTime = (item.start.valueOf() - minTime) / 1000;
        onRenderTimeUpdate(newRenderTime);
        callback(item); // Continue the move
      } else {
        // Block satellites from being dragged
        return false;
      }
    },
    format: getTimelineFormatConfig(),
    // Smooth animation settings
    rollingMode: {
      follow: false,
      offset: 0.5,
    },
  };
};

/**
 * Creates particle/satellite items for timeline
 * @param {Array} particles - Satellite particles data
 * @param {number} minTime - Timeline start time (timestamp)
 * @returns {Array} Timeline items for satellites
 */
export const createParticleItems = (particles, minTime) => {
  return particles
    .map((particle, index) => {
      const tracePoints = particle.tracePoints;
      
      if (tracePoints && tracePoints.length >= 2) {
        const start = new Date(minTime + tracePoints[1].time * 1000);
        const end = new Date(minTime + tracePoints[tracePoints.length - 1].time * 1000);
        return {
          id: `satellite-${particle.id || index}`,
          content: particle.name || `Satellite ${index + 1}`,
          start: start,
          end: end,
          type: 'range',
          group: 1,
          className: 'satellite-item',
          editable: false,
          selectable: false,
        };
      }
      return undefined;
    })
    .filter(item => item !== undefined);
};

/**
 * Creates current simulation time marker
 * @param {number} minTime - Timeline start time (timestamp)
 * @param {Date} currentTime - Current simulation time
 * @returns {object} Current time background item
 */
export const createCurrentTimePoint = (minTime, currentTime) => {
  return {
    id: 'current-time',
    content: 'Current Time',
    start: minTime,
    end: currentTime,
    type: 'range',
    className: 'current-time-point',
    editable: false,
    selectable: false,
    group: 2,
  };
};

/**
 * Extracts contact windows from continuous link history records
 * @param {Array} linkHistory - All link history records
 * @param {string} linkId - Link identifier (e.g., 'sat-0→gs-1')
 * @returns {Array} Contact windows [{ start, end }]
 */
const extractContactWindows = (linkHistory, linkId) => {
  // Filter records for this specific link
  const [txId, rxId] = linkId.split('→');
  const records = linkHistory
    .filter(r => r.txId === txId && r.rxId === rxId)
    .sort((a, b) => a.timestamp - b.timestamp);
  
  if (records.length === 0) return [];
  
  const windows = [];
  let windowStart = null;
  let lastTimestamp = null;
  const GAP_THRESHOLD_MS = 5000; // 5 seconds gap = contact lost
  
  records.forEach(record => {
    if (!windowStart) {
      // Start first window
      windowStart = record.timestamp;
    } else if (record.timestamp - lastTimestamp > GAP_THRESHOLD_MS) {
      // Gap detected - close previous window, start new one
      windows.push({ start: windowStart, end: lastTimestamp });
      windowStart = record.timestamp;
    }
    lastTimestamp = record.timestamp;
  });
  
  // Close final window
  if (windowStart && lastTimestamp) {
    windows.push({ start: windowStart, end: lastTimestamp });
  }
  
  return windows;
};

/**
 * Gets display name for a link endpoint
 * @param {string} endpointId - Endpoint ID (e.g., 'sat-0', 'gs-1')
 * @param {Array} satellites - Satellite configs
 * @param {Array} groundStations - Ground station configs
 * @returns {string} Display name
 */
const getEndpointName = (endpointId, satellites, groundStations) => {
  if (endpointId.startsWith('sat-')) {
    const satId = parseInt(endpointId.replace('sat-', ''));
    const sat = satellites?.find(s => s.id === satId);
    return sat?.name || `Satellite ${satId}`;
  }
  const gs = groundStations?.find(g => g.id === endpointId);
  return gs?.name || endpointId;
};

/**
 * Gets color for a link based on its ID
 * @param {string} linkId - Link identifier
 * @returns {string} Hex color
 */
const getLinkColor = (linkId) => {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FFEB3B'];
  const hash = linkId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

/**
 * Creates timeline items for communication links
 * @param {Array} linkHistory - Link history records from Redux
 * @param {Array} satellites - Satellite configs
 * @param {Array} groundStations - Ground station configs
 * @returns {Array} Timeline items for communication windows
 */
export const createLinkItems = (linkHistory, satellites, groundStations) => {
  if (!linkHistory || linkHistory.length === 0) return [];
  
  const items = [];
  
  // Get unique link pairs from history
  const linkPairs = new Set(
    linkHistory.map(r => `${r.txId}→${r.rxId}`)
  );
  
  linkPairs.forEach(linkId => {
    const windows = extractContactWindows(linkHistory, linkId);
    const [txId, rxId] = linkId.split('→');
    
    const txName = getEndpointName(txId, satellites, groundStations);
    const rxName = getEndpointName(rxId, satellites, groundStations);
    const linkName = `${txName} → ${rxName}`;
    const color = getLinkColor(linkId);
    
    windows.forEach((window, index) => {
      items.push({
        id: `link-${linkId}-${index}`,
        content: linkName,
        start: new Date(window.start),
        end: new Date(window.end),
        type: 'range',
        group: 2, // Event group
        className: 'link-bar',
        editable: false,
        selectable: false,
        style: `background-color: ${color}; border: 1px solid rgba(255,255,255,0.3);`
      });
    });
  });
  
  return items;
};

/**
 * Creates render time point marker (playhead) - DRAGGABLE SCRUBBER
 * Callbacks handled by global options.onMove/onMoving with item.id filtering
 * @param {Date} renderTime - Current render time
 * @returns {object} Render time point item
 */
export const createRenderTimePoint = (renderTime) => {
  return {
    id: 'Render-time',
    content: '▶', // Playhead icon to make it clearly draggable
    start: renderTime,
    type: 'point', // Point type for vertical line indicator
    className: 'render-time-point',
    editable: {
      remove: false,
      updateTime: true, // ENABLED - makes it draggable left/right
      updateGroup: false, // Prevent vertical dragging
    },
    selectable: true,
    group: 2,
    // No item-level callbacks - they don't work with DataSet!
    // Global options.onMove/onMoving handle this with item.id filtering
  };
};

/**
 * Creates complete timeline items dataset
 * @param {Array} particles - Satellite particles
 * @param {number} starttime - Timeline start timestamp
 * @param {number} elapsedTime - Current elapsed time in seconds
 * @param {number} renderTime - Current render time in seconds
 * @param {Array} linkHistory - Link history records (optional)
 * @param {Array} satellites - Satellite configs (optional)
 * @param {Array} groundStations - Ground station configs (optional)
 * @returns {DataSet} Complete timeline items
 */
export const createTimelineItems = (
  particles,
  starttime,
  elapsedTime,
  renderTime,
  linkHistory = [],
  satellites = [],
  groundStations = []
) => {
  const minTime = starttime || Date.now();
  const currentTime = new Date(minTime + elapsedTime * 1000);
  const currentRenderTime = new Date(minTime + renderTime * 1000);

  const particleItems = createParticleItems(particles, minTime);
  const linkItems = createLinkItems(linkHistory, satellites, groundStations);
  const renderTimePoint = createRenderTimePoint(currentRenderTime);

  return new DataSet([...particleItems, ...linkItems, renderTimePoint]);
};

/**
 * Calculates timeline time range
 * @param {number} starttime - Timeline start timestamp
 * @param {Array} timePoints - Array of time points
 * @returns {object} Min and max time for timeline
 */
export const getTimelineRange = (starttime, timePoints) => {
  const minTime = starttime || Date.now();
  const maxTime = minTime + (timePoints.length > 0 ? timePoints[timePoints.length - 1] * 1000 : 0);
  
  return { minTime, maxTime };
};
