/**
 * Timeline configuration utilities for vis-timeline
 * Handles timeline options, groups, and item creation
 */

import { DataSet } from 'vis-timeline/standalone';
import { getTimelineFormatConfig } from './timeFormatters';

/* ── Helpers (must be above createTimelineGroups which uses them) ── */

/**
 * Gets display name for a link endpoint
 * @param {string} endpointId - Endpoint ID (e.g., 'sat-0', 'gs-1')
 * @param {Array} satellites - Satellite configs
 * @param {Array} groundStations - Ground station configs
 * @returns {string} Display name
 */
const getEndpointName = (endpointId, satellites, groundStations) => {
  if (!endpointId) return 'Unknown';
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
 * Creates timeline groups configuration.
 *
 * One row per satellite, one row for the playhead, one row per unique
 * link pair.  This prevents bars from overlapping.
 *
 * Group ID scheme:
 *   'sat-<id>'      – one per satellite
 *   'playhead'      – fixed single row for the render-time scrubber
 *   'link-<pairId>' – one per unique communication pair
 *
 * @param {Array}  particles       – satellite particle data
 * @param {Array}  contactWindows  – coalesced contact windows from Redux
 * @param {Array}  satellites      – satellitesConfig from Redux
 * @param {Array}  groundStations  – ground station configs
 * @returns {DataSet} Timeline groups dataset
 */
export const createTimelineGroups = (
  particles = [],
  contactWindows = [],
  satellites = [],
  groundStations = [],
) => {
  const groups = [];

  // ── One row per satellite ────────────────────────────────────
  particles.forEach((p, index) => {
    const sat = satellites.find(s => s.id === p.id);
    const label = sat?.name || p.name || `Satellite ${index + 1}`;
    groups.push({
      id: `sat-${p.id ?? index}`,
      content: `🛰 ${label}`,
      className: 'satellites-group',
      order: index,
    });
  });

  // ── Playhead row (always present) ────────────────────────────
  groups.push({
    id: 'playhead',
    content: '▶ Playhead',
    className: 'playhead-group',
    order: 1000, // keep after satellites
  });

  // ── One row per unique link pair ─────────────────────────────
  const seenPairs = new Set();
  contactWindows.forEach(w => {
    const pairId = w.pairId || `${w.txId}→${w.rxId}`;
    if (seenPairs.has(pairId)) return;
    seenPairs.add(pairId);
    const txName = getEndpointName(w.txId, satellites, groundStations);
    const rxName = getEndpointName(w.rxId, satellites, groundStations);
    groups.push({
      id: `link-${pairId}`,
      content: `📡 ${txName} → ${rxName}`,
      className: 'links-group',
      order: 2000 + seenPairs.size,
    });
  });

  return new DataSet(groups);
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
    stack: false,           // Prevent items from stacking / dancing vertically
    stackSubgroups: false,
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
        vertical: 4,
      },
      axis: 5,
    },
    // Playhead dragging is handled by a custom mousedown/mousemove handler
    // in useTimeline.js, so we don't need vis-timeline's built-in onMove/onMoving.
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
          group: `sat-${particle.id ?? index}`,  // own row per satellite
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
    group: 'playhead',
  };
};

/**
 * Extracts contact windows from continuous link history records
 * Legacy fallback for old-format linkHistory arrays.
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
      windowStart = record.timestamp;
    } else if (record.timestamp - lastTimestamp > GAP_THRESHOLD_MS) {
      windows.push({ start: windowStart, end: lastTimestamp });
      windowStart = record.timestamp;
    }
    lastTimestamp = record.timestamp;
  });
  
  if (windowStart && lastTimestamp) {
    windows.push({ start: windowStart, end: lastTimestamp });
  }
  
  return windows;
};

/**
 * Creates timeline items for communication links.
 *
 * Prefers the new coalesced `contactWindows` array (already aggregated
 * in Redux).  Falls back to the legacy `linkHistory` record list.
 *
 * @param {Array} linkHistory - Legacy link history records (fallback)
 * @param {Array} satellites - Satellite configs
 * @param {Array} groundStations - Ground station configs
 * @param {Array} contactWindows - Coalesced contact windows from Redux
 * @returns {Array} Timeline items for communication windows
 */
export const createLinkItems = (linkHistory, satellites, groundStations, contactWindows = []) => {
  const items = [];

  // ── Prefer coalesced windows ──────────────────────────────────
  if (contactWindows.length > 0) {
    contactWindows.forEach((w, index) => {
      const txName = getEndpointName(w.txId, satellites, groundStations);
      const rxName = getEndpointName(w.rxId, satellites, groundStations);
      const linkName = `${txName} → ${rxName}`;
      const color = getLinkColor(w.pairId || `${w.txId}→${w.rxId}`);

      // Ignore windows shorter than 500ms (noise)
      if (w.simEnd - w.simStart < 500) return;

      const pairId = w.pairId || `${w.txId}→${w.rxId}`;
      items.push({
        id: `link-cw-${index}`,
        content: linkName,
        start: new Date(w.simStart),
        end: new Date(w.simEnd),
        type: 'range',
        group: `link-${pairId}`,  // own row per link pair
        className: 'link-bar',
        editable: false,
        selectable: false,
        style: `background-color: ${color}; border: 1px solid rgba(255,255,255,0.3); pointer-events: none;`,
      });
    });
    return items;
  }

  // ── Legacy fallback: extract from individual records ──────────
  if (!linkHistory || linkHistory.length === 0) return [];

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
        group: `link-${linkId}`,  // own row per link pair
        className: 'link-bar',
        editable: false,
        selectable: false,
        style: `background-color: ${color}; border: 1px solid rgba(255,255,255,0.3); pointer-events: none;`
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
    editable: false,   // Custom mouse handler in useTimeline.js handles drag
    selectable: false,
    group: 'playhead',
  };
};

/**
 * Creates complete timeline items dataset
 * @param {Array} particles - Satellite particles
 * @param {number} starttime - Timeline start timestamp
 * @param {number} elapsedTime - Current elapsed time in seconds
 * @param {number} renderTime - Current render time in seconds
 * @param {Array} linkHistory - Legacy link history records (optional)
 * @param {Array} satellites - Satellite configs (optional)
 * @param {Array} groundStations - Ground station configs (optional)
 * @param {Array} contactWindows - Coalesced contact windows (optional)
 * @returns {DataSet} Complete timeline items
 */
export const createTimelineItems = (
  particles,
  starttime,
  elapsedTime,
  renderTime,
  linkHistory = [],
  satellites = [],
  groundStations = [],
  contactWindows = []
) => {
  const minTime = starttime || Date.now();
  const currentRenderTime = new Date(minTime + renderTime * 1000);

  const particleItems = createParticleItems(particles, minTime);
  const linkItems = createLinkItems(linkHistory, satellites, groundStations, contactWindows);
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
