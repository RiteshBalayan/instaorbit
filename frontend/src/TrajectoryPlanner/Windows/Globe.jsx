import React from 'react';
import '../../Styles/simulator/Globe.css';
import GlobeRender from '../Render/GlobeRender';
import SlimTopBar from './Topbar/TopBar';
import MenuBar from './Topbar/MenuBar';
import GroundTrack from './GroundTrack';
import { Canvas } from '@react-three/fiber';
import LinkEngine from './Sidebar/LinkEngine';
import LinkAvailabilityEngine from './Sidebar/LinkAvailabilityEngine';
import LeafletMapRender from '../Render/LeafletMapRender';
import BodyFrameView from '../Render/BodyFrameView';
import SimuStackSatellites from '../Simulation/StackSimulator';
import { useSelector } from 'react-redux';
import ErrorBoundary from '../../components/ErrorBoundary';

/**
 * Render a single view panel based on its config.
 * @param {{ type: '3d'|'2d'|'bodyFrame', satelliteId?: number }} config
 */
function ViewPanel({ config }) {
  if (!config) return null;
  switch (config.type) {
    case '3d':
      return (
        <ErrorBoundary fallbackMessage="Globe view failed to render.">
          <Canvas gl={{ preserveDrawingBuffer: true }}>
            <GlobeRender />
          </Canvas>
        </ErrorBoundary>
      );
    case '2d':
      return (
        <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%' }}>
          <ErrorBoundary fallbackMessage="Map view failed to render.">
            <LeafletMapRender />
          </ErrorBoundary>
        </div>
      );
    case 'bodyFrame':
      return (
        <ErrorBoundary fallbackMessage="Body frame view failed to render.">
          <BodyFrameView satelliteId={config.satelliteId} />
        </ErrorBoundary>
      );
    default:
      return null;
  }
}

function Globe() {
  const viewMode = useSelector((state) => state.view.viewMode || 'globe');
  const layout = useSelector((state) => state.view.layout);

  // If the new layout system is configured, use it; otherwise fall back to legacy viewMode
  const useNewLayout = layout && layout.left;

  return (
    <div className='Globe-panel' style={{ position: 'relative' }}>
      <SlimTopBar />
      <MenuBar />

      {/* Headless engines — run regardless of which view panel is active */}
      <LinkEngine />
      <LinkAvailabilityEngine />
      <SimuStackSatellites />

      {useNewLayout ? (
        /* ─── New flexible layout ─────────────────────────────── */
        layout.mode === 'split' ? (
          <div className="split-container">
            <div className="split-pane">
              <ViewPanel config={layout.left} />
            </div>
            <div className="split-divider" />
            <div className="split-pane">
              <ViewPanel config={layout.right} />
            </div>
          </div>
        ) : (
          <ViewPanel config={layout.left} />
        )
      ) : (
        /* ─── Legacy view mode (backwards compatibility) ──────── */
        <>
          {viewMode === 'globe' && (
            <ErrorBoundary fallbackMessage="Globe view failed to render.">
              <Canvas gl={{ preserveDrawingBuffer: true }}>
                <GlobeRender />
              </Canvas>
            </ErrorBoundary>
          )}

          {viewMode === 'map' && (
            <div style={{ flex: 1, display: 'flex' }}>
              <ErrorBoundary fallbackMessage="Map view failed to render.">
                <LeafletMapRender />
              </ErrorBoundary>
            </div>
          )}

          {viewMode === 'both' && (
            <div className="split-container">
              <div className="split-pane">
                <ErrorBoundary fallbackMessage="Globe view failed to render.">
                  <Canvas gl={{ preserveDrawingBuffer: true }}>
                    <GlobeRender />
                  </Canvas>
                </ErrorBoundary>
              </div>
              <div className="split-divider" />
              <div className="split-pane">
                <ErrorBoundary fallbackMessage="Map view failed to render.">
                  <LeafletMapRender />
                </ErrorBoundary>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Globe;
