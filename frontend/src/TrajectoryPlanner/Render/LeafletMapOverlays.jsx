/**
 * Leaflet overlay layers rendered on top of the tile map.
 *
 * – SatelliteMarkers: current position of each satellite
 * – GroundTracks: polyline of each satellite's trace history
 * – SubSolarMarker: orange dot for the sub-solar point
 * – GroundStationMarkers: ground stations at their lat/lon
 * – MapLegend: colour-coded legend for all overlay types
 *
 * Because Leaflet repeats the tile map horizontally (worldCopyJump),
 * we render every overlay at longitude offsets -360, 0, +360 so that
 * markers and polylines appear on every visible copy of the world.
 */

import React, { useMemo } from 'react';
import { CircleMarker, Polyline, Tooltip, Marker, useMap } from 'react-leaflet';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import { mapXYToLatLon, splitAtAntimeridian } from './mapUtils';
import { sunGeodetic } from '../../transforms';
import { computeLink } from '../Windows/Sidebar/linkComputation';

/* Longitude offsets to cover the three visible world copies */
const WORLD_OFFSETS = [-360, 0, 360];

/* Colour palette – one per satellite, loops if > 8 */
const TRACK_COLOURS = [
  '#facc15', '#38bdf8', '#f87171', '#4ade80',
  '#c084fc', '#fb923c', '#22d3ee', '#e879f9',
];

/* Ground station marker colour */
const GS_COLOR = '#4a9eff';

/** Shift a [lat, lon] by a longitude offset */
const shiftPos = ([lat, lon], dLon) => [lat, lon + dLon];

/** Shift every point in an array of [lat, lon] */
const shiftSegment = (seg, dLon) => seg.map((p) => shiftPos(p, dLon));

/**
 * Build a small SVG icon for ground stations (antenna dish shape).
 * Returns a Leaflet DivIcon.
 */
const gsIcon = L.divIcon({
  className: 'gs-leaflet-icon',
  html: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="8" fill="${GS_COLOR}" fill-opacity="0.25" stroke="${GS_COLOR}" stroke-width="1.5"/>
    <rect x="8" y="8" width="4" height="7" rx="0.5" fill="${GS_COLOR}"/>
    <polygon points="10,3 5,9 15,9" fill="${GS_COLOR}" opacity="0.9"/>
  </svg>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/* ─── Single satellite marker (rendered at all world copies) ── */
const SatelliteMarker = ({ satellite, particle, color }) => {
  const RenderTime = useSelector((s) => s.timer.RenderTime);

  // During timeline playback the Simulator doesn't run, so
  // satellite.coordinates may be stale.  Derive the marker position
  // from the trace point closest to (but not exceeding) RenderTime.
  const basePos = useMemo(() => {
    if (particle?.tracePoints?.length) {
      // Find the last trace point at or before the current playhead
      const pts = particle.tracePoints;
      let best = null;
      for (let i = pts.length - 1; i >= 0; i--) {
        if (pts[i].time <= RenderTime) { best = pts[i]; break; }
      }
      if (best) {
        if (best.lat != null && best.lon != null) return [best.lat, best.lon];
        if (best.mapX != null) return mapXYToLatLon(best.mapX, best.mapY);
      }
    }
    // Fallback: use CurrentState coordinates (live simulation mode)
    if (satellite?.coordinates?.lat != null && satellite?.coordinates?.lon != null) {
      return [satellite.coordinates.lat, satellite.coordinates.lon];
    }
    if (satellite?.coordinates?.mapX != null) {
      return mapXYToLatLon(satellite.coordinates.mapX, satellite.coordinates.mapY);
    }
    return null;
  }, [particle?.tracePoints, RenderTime, satellite?.coordinates]);

  if (!basePos) return null;

  return (
    <>
      {WORLD_OFFSETS.map((dLon) => (
        <CircleMarker
          key={dLon}
          center={shiftPos(basePos, dLon)}
          radius={6}
          pathOptions={{
            color: '#fff',
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.95,
          }}
        >
          {dLon === 0 && (
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
              <span style={{ fontWeight: 600 }}>{satellite.name || `Sat ${satellite.id}`}</span>
            </Tooltip>
          )}
        </CircleMarker>
      ))}
    </>
  );
};

/* ─── Single satellite ground track (rendered at all copies) ── */
const GroundTrack = ({ particle, color }) => {
  const trackWindow = useSelector((s) => s.view.trackWindow);
  const RenderTime = useSelector((s) => s.timer.RenderTime);

  const baseSegments = useMemo(() => {
    if (!particle?.tracePoints?.length) return [];

    // Always clip to RenderTime so scrubbing backward shows only the
    // portion of the ground track up to the playhead position.
    let pts = particle.tracePoints.filter((p) => p.time <= RenderTime);

    // Track Horizon: further narrow to ±1 hr window around RenderTime
    if (trackWindow) {
      const HORIZON = 3600; // seconds
      const tMin = RenderTime - HORIZON;
      pts = pts.filter((p) => p.time >= tMin);
    }

    const points = pts.map((p) => {
      // Prefer proper lat/lon (GMST-based), fall back to legacy mapXY
      if (p.lat != null && p.lon != null) return [p.lat, p.lon];
      return mapXYToLatLon(p.mapX, p.mapY);
    });
    return splitAtAntimeridian(points);
  }, [particle?.tracePoints, trackWindow, RenderTime]);

  return (
    <>
      {WORLD_OFFSETS.map((dLon) =>
        baseSegments.map((seg, i) => (
          <Polyline
            key={`${dLon}_${i}`}
            positions={shiftSegment(seg, dLon)}
            pathOptions={{ color, weight: 1.8, opacity: 0.8, dashArray: '6 4' }}
          />
        )),
      )}
    </>
  );
};

/* ─── Sub-solar point (rendered at all copies) ────────────── */
const SubSolarMarker = () => {
  const elapsedTime = useSelector((s) => s.timer.elapsedTime);
  const starttime = useSelector((s) => s.timer.starttime);

  // Proper sub-solar point using sun position with obliquity + GMST
  const basePos = useMemo(() => {
    const utcMs = starttime + elapsedTime * 1000;
    const geo = sunGeodetic(utcMs);
    // Normalise longitude to [-180, 180]
    const normLon = ((geo.lon + 180) % 360 + 360) % 360 - 180;
    return [geo.lat, normLon];
  }, [elapsedTime, starttime]);

  return (
    <>
      {WORLD_OFFSETS.map((dLon) => (
        <CircleMarker
          key={dLon}
          center={shiftPos(basePos, dLon)}
          radius={8}
          pathOptions={{
            color: '#fbbf24',
            weight: 2,
            fillColor: '#f59e0b',
            fillOpacity: 0.85,
          }}
        >
          {dLon === 0 && (
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              Sub-solar point
            </Tooltip>
          )}
        </CircleMarker>
      ))}
    </>
  );
};

/* ─── Ground station markers (rendered at all copies) ──────── */
const GroundStationMarkers = () => {
  const groundStations = useSelector((s) => s.groundStations.groundStations) || [];

  return (
    <>
      {groundStations.map((gs) => {
        const basePos = [gs.lat, gs.lon];
        return WORLD_OFFSETS.map((dLon) => (
          <React.Fragment key={`${gs.id}_${dLon}`}>
            {/* Outer range ring */}
            <CircleMarker
              center={shiftPos(basePos, dLon)}
              radius={12}
              pathOptions={{
                color: GS_COLOR,
                weight: 1,
                fillColor: GS_COLOR,
                fillOpacity: 0.12,
                dashArray: '3 3',
              }}
            />
            {/* Core marker using DivIcon */}
            <Marker
              position={shiftPos(basePos, dLon)}
              icon={gsIcon}
            >
              {dLon === 0 && (
                <Tooltip direction="top" offset={[0, -12]} opacity={0.9}>
                  <span style={{ fontWeight: 600 }}>{gs.name || `GS ${gs.id}`}</span>
                  <br />
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {gs.lat.toFixed(2)}°, {gs.lon.toFixed(2)}°
                  </span>
                </Tooltip>
              )}
            </Marker>
          </React.Fragment>
        ));
      })}
    </>
  );
};

/* ─── Communication link lines (rendered at all copies) ───── */

/** Resolve a link-endpoint ID to [lat, lon] using the same logic as SatelliteMarker */
const resolveEndpointLatLon = (id, satellites, particles, groundStations, RenderTime) => {
  if (id.startsWith('sat-')) {
    const numId = parseFloat(id.replace('sat-', ''));
    const particle = particles.find((p) => p.id === numId);
    if (particle?.tracePoints?.length) {
      for (let i = particle.tracePoints.length - 1; i >= 0; i--) {
        const pt = particle.tracePoints[i];
        if (pt.time <= RenderTime) {
          if (pt.lat != null && pt.lon != null) return [pt.lat, pt.lon];
          if (pt.mapX != null) return mapXYToLatLon(pt.mapX, pt.mapY);
          break;
        }
      }
    }
    const sat = satellites.find((s) => s.id === numId);
    if (sat?.coordinates?.lat != null) return [sat.coordinates.lat, sat.coordinates.lon];
    if (sat?.coordinates?.mapX != null) return mapXYToLatLon(sat.coordinates.mapX, sat.coordinates.mapY);
    return null;
  }
  // Ground station
  const gs = groundStations.find((g) => g.id === id);
  if (!gs) return null;
  return [gs.lat, gs.lon];
};

const LINK_ACTIVE_COLOR = 'rgba(74, 222, 128, 0.45)';   // green, translucent
const LINK_INACTIVE_COLOR = 'rgba(248, 113, 113, 0.3)';  // red, very translucent
const LINK_WAITING_COLOR = 'rgba(148, 163, 184, 0.25)';  // gray, very translucent

const LinkLines = () => {
  const savedLinks = useSelector((s) => s.communication.links) || [];
  const satStates = useSelector((s) => s.CurrentState.satelite) || [];
  const particles = useSelector((s) => s.particles.particles) || [];
  const groundStations = useSelector((s) => s.groundStations.groundStations) || [];
  const RenderTime = useSelector((s) => s.timer.RenderTime);
  const starttime = useSelector((s) => s.timer.starttime);

  const linkLines = useMemo(() => {
    if (!savedLinks.length) return [];

    const ctx = {
      currentStates: satStates,
      groundStations,
      particles,
      renderTime: RenderTime,
      starttime,
    };

    return savedLinks.map((link) => {
      const txPos = resolveEndpointLatLon(link.txId, satStates, particles, groundStations, RenderTime);
      const rxPos = resolveEndpointLatLon(link.rxId, satStates, particles, groundStations, RenderTime);
      if (!txPos || !rxPos) return { id: link.id, positions: null, status: 'waiting' };

      // Use computeLink to get inLink status
      const result = computeLink(link, ctx);
      const status = !result.ready ? 'waiting' : result.inLink ? 'active' : 'inactive';

      return { id: link.id, positions: [txPos, rxPos], status };
    });
  }, [savedLinks, satStates, particles, groundStations, RenderTime, starttime]);

  return (
    <>
      {linkLines.map((ll) => {
        if (!ll.positions || ll.status !== 'active') return null;

        return WORLD_OFFSETS.map((dLon) => (
          <Polyline
            key={`link-${ll.id}_${dLon}`}
            positions={[shiftPos(ll.positions[0], dLon), shiftPos(ll.positions[1], dLon)]}
            pathOptions={{
              color: LINK_ACTIVE_COLOR,
              weight: 2.5,
              opacity: 1,
              dashArray: null, // solid — distinct from dashed ground tracks
            }}
          />
        ));
      })}
    </>
  );
};

/* ─── Map legend (positioned bottom-left over the map) ──────── */
const LEGEND_STYLES = {
  container: {
    position: 'absolute',
    bottom: 28,
    left: 10,
    zIndex: 1000,
    background: 'rgba(13, 17, 23, 0.88)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    pointerEvents: 'auto',
    minWidth: 140,
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: 2,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    color: '#cbd5e0',
  },
  swatch: (color, shape) => ({
    width: shape === 'line' ? 18 : 12,
    height: shape === 'line' ? 3 : 12,
    borderRadius: shape === 'circle' ? '50%' : shape === 'diamond' ? 2 : 1,
    background: color,
    border: `1px solid ${color}`,
    flexShrink: 0,
    transform: shape === 'diamond' ? 'rotate(45deg) scale(0.75)' : 'none',
  }),
};

const MapLegend = ({ satelliteColors, hasLinks }) => {
  return (
    <div style={LEGEND_STYLES.container}>
      <div style={LEGEND_STYLES.title}>Legend</div>

      {/* Sub-solar point */}
      <div style={LEGEND_STYLES.row}>
        <span style={LEGEND_STYLES.swatch('#f59e0b', 'circle')} />
        Sub-solar Point
      </div>

      {/* Ground stations */}
      <div style={LEGEND_STYLES.row}>
        <span style={LEGEND_STYLES.swatch(GS_COLOR, 'diamond')} />
        Ground Station
      </div>

      {/* Satellites */}
      {satelliteColors.map(({ name, color }) => (
        <div key={name} style={LEGEND_STYLES.row}>
          <span style={LEGEND_STYLES.swatch(color, 'circle')} />
          {name}
        </div>
      ))}

      {/* Ground track line */}
      {satelliteColors.length > 0 && (
        <div style={LEGEND_STYLES.row}>
          <span style={LEGEND_STYLES.swatch('#facc15', 'line')} />
          Ground Track
        </div>
      )}

      {/* Communication links */}
      {hasLinks && (
        <div style={LEGEND_STYLES.row}>
          <span style={{ ...LEGEND_STYLES.swatch('rgba(74, 222, 128, 0.7)', 'line'), height: 2.5 }} />
          Active Link
        </div>
      )}
    </div>
  );
};

/* ─── Composite overlay that loops over all satellites ─────── */
const LeafletMapOverlays = () => {
  const satellites = useSelector((s) => s.CurrentState.satelite) || [];
  const particles = useSelector((s) => s.particles.particles) || [];
  const savedLinks = useSelector((s) => s.communication.links) || [];

  /* Build legend colour list */
  const satelliteColors = useMemo(
    () =>
      satellites.map((sat, idx) => ({
        name: sat.name || `Sat ${sat.id}`,
        color: TRACK_COLOURS[idx % TRACK_COLOURS.length],
      })),
    [satellites],
  );

  return (
    <>
      <SubSolarMarker />
      <GroundStationMarkers />
      <LinkLines />
      {satellites.map((sat, idx) => {
        const color = TRACK_COLOURS[idx % TRACK_COLOURS.length];
        const particle = particles.find((p) => p.id === sat.id);
        return (
          <React.Fragment key={sat.id}>
            <SatelliteMarker satellite={sat} particle={particle} color={color} />
            {particle && <GroundTrack particle={particle} color={color} />}
          </React.Fragment>
        );
      })}
      <MapLegend satelliteColors={satelliteColors} hasLinks={savedLinks.length > 0} />
    </>
  );
};

export default LeafletMapOverlays;
