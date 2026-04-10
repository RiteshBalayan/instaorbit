import React, { useCallback } from 'react';
import SidebarUtilityControl from '../../../ui/kit/sidebar/SidebarUtilityControl';
import { useSidebarState } from '../../../features/sidebar/hooks/useSidebarState';
import { useSidebarActions } from '../../../features/sidebar/hooks/useSidebarActions';

const UtilityControl = () => {
  const { view, referenceSystem } = useSidebarState();
  const {
    setReferenceSystem,
    setGrid,
    setAxis,
    setVonAllenBelt,
    setHDEarth,
    setSun,
    setAmbientLight,
    setTrackWindow,
    setShowOrbit,
    setShowLinkLines,
    setShowBodyFrameAxes,
  } = useSidebarActions();

  const handleReferenceToggle = useCallback(() => {
    const next = referenceSystem === 'EarthInertial' ? 'EarthFixed' : 'EarthInertial';
    setReferenceSystem(next);
  }, [referenceSystem, setReferenceSystem]);

  const sceneItems = [
    { key: 'HDEarth', label: 'HD Earth', checked: view.HDEarth, onChange: setHDEarth },
    { key: 'Sun', label: 'Sun', checked: view.Sun, onChange: setSun },
    { key: 'AmbientLight', label: 'Ambient Light', checked: view.AmbientLight, onChange: setAmbientLight },
    { key: 'VonAllenBelt', label: 'Van Allen Belt', checked: view.VonAllenBelt, onChange: setVonAllenBelt },
    { key: 'LinkLines', label: 'Link Lines', checked: view.showLinkLines !== false, onChange: setShowLinkLines },
  ];

  const overlayItems = [
    { key: 'Grid', label: 'Grid', checked: view.Grid, onChange: setGrid },
    { key: 'Axis', label: 'Axis', checked: view.Axis, onChange: setAxis },
    { key: 'BodyFrameAxes', label: 'Body Frame Axes', checked: view.showBodyFrameAxes !== false, onChange: setShowBodyFrameAxes },
  ];

  return (
    <SidebarUtilityControl
      reference={{ value: referenceSystem, onToggle: handleReferenceToggle }}
      sceneItems={sceneItems}
      overlayItems={overlayItems}
      trackWindow={view.trackWindow}
      onTrackWindowChange={setTrackWindow}
      showOrbit={view.showOrbit}
      onShowOrbitChange={setShowOrbit}
    />
  );
};

export default UtilityControl;
