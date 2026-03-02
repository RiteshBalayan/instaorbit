import React from 'react';
import '../../Styles/simulator/Globe.css';
import GlobeRender from '../Render/GlobeRender';
import SlimTopBar from './Topbar/TopBar';
import GroundTrack from './GroundTrack';
import { Canvas } from '@react-three/fiber';
import LinkEngine from './Sidebar/LinkEngine';
import LeafletMapRender from '../Render/LeafletMapRender';
import { useSelector } from 'react-redux';
import ErrorBoundary from '../../components/ErrorBoundary';

function Globe() {
  const viewMode = useSelector((state) => state.view.viewMode || 'globe');
  return (
    <div className='Globe-panel' style={{ position: 'relative' }}>
      <SlimTopBar />

      {/* LinkEngine is headless — it continuously computes activeLinks
          and contactWindows so 3D/2D link lines stay up to date. */}
      <LinkEngine />

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
    </div>
  );
}

export default Globe;
