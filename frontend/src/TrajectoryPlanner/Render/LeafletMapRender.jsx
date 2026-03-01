/**
 * LeafletMapRender – drop-in replacement for the old Three.js 2DMapRender.
 *
 * Uses a dark-themed tile layer (CartoDB Dark Matter) with react-leaflet.
 * Satellite overlays are rendered via <LeafletMapOverlays />.
 */

import React from 'react';
import { MapContainer, TileLayer, AttributionControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../Styles/simulator/LeafletMap.css';
import LeafletMapOverlays from './LeafletMapOverlays';

const LeafletMapRender = () => {
  return (
    <div className="leaflet-map-wrapper">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={1}
        maxZoom={18}
        worldCopyJump={true}
        zoomControl={true}
        attributionControl={false}
        className="leaflet-dark-map"
      >
        {/* Dark tile layer – no API key needed */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <AttributionControl position="bottomright" prefix={false} />

        {/* Satellite markers, ground tracks, sub-solar point */}
        <LeafletMapOverlays />
      </MapContainer>
    </div>
  );
};

export default LeafletMapRender;
