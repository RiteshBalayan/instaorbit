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
import { mapXYToLatLon, computeSubSolarLatLon, splitAtAntimeridian } from './mapUtils';

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
const SatelliteMarker = ({ satellite, color }) => {
  if (satellite?.coordinates?.mapX == null) return null;
  const { mapX, mapY } = satellite.coordinates;
  const basePos = mapXYToLatLon(mapX, mapY);

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
  const baseSegments = useMemo(() => {
    if (!particle?.tracePoints?.length) return [];
    const points = particle.tracePoints.map((p) => mapXYToLatLon(p.mapX, p.mapY));
    return splitAtAntimeridian(points);
  }, [particle?.tracePoints]);

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

  const basePos = useMemo(
    () => computeSubSolarLatLon(elapsedTime, starttime),
    [elapsedTime, starttime],
  );

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

const MapLegend = ({ satelliteColors }) => {
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
    </div>
  );
};

/* ─── Composite overlay that loops over all satellites ─────── */
const LeafletMapOverlays = () => {
  const satellites = useSelector((s) => s.CurrentState.satelite) || [];
  const particles = useSelector((s) => s.particles.particles) || [];

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
      {satellites.map((sat, idx) => {
        const color = TRACK_COLOURS[idx % TRACK_COLOURS.length];
        const particle = particles.find((p) => p.id === sat.id);
        return (
          <React.Fragment key={sat.id}>
            <SatelliteMarker satellite={sat} color={color} />
            {particle && <GroundTrack particle={particle} color={color} />}
          </React.Fragment>
        );
      })}
      <MapLegend satelliteColors={satelliteColors} />
    </>
  );
};

export default LeafletMapOverlays;
