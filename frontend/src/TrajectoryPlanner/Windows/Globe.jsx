import React from 'react';
import '../../Styles/simulator/Globe.css';
import GlobeRender from '../Render/GlobeRender';
import SlimTopBar from './Topbar/TopBar';
import GroundTrack from './GroundTrack';
import { Canvas } from '@react-three/fiber';
import LinkBudgetBoard from './Sidebar/LinkBudgetBoard';
import LeafletMapRender from '../Render/LeafletMapRender';
import { useSelector } from 'react-redux';
import ErrorBoundary from '../../components/ErrorBoundary';

function Globe() {
  const viewMode = useSelector((state) => state.view.viewMode || 'globe');
  const showLinkBudget = useSelector((state) => state.view.showLinkBudget);
  return (
    <div className='Globe-panel' style={{ position: 'relative' }}>
      <SlimTopBar />

      {/* LinkBudgetBoard must ALWAYS mount so it continuously computes
          activeLinks and contactWindows regardless of panel visibility.
          The overlay div is only shown when the user opens the panel. */}
      <LinkBudgetBoard hidden={!showLinkBudget} />

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
