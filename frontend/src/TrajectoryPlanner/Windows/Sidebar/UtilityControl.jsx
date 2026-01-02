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
  } = useSidebarActions();

  const handleReferenceToggle = useCallback(() => {
    const next = referenceSystem === 'EarthInertial' ? 'EarthFixed' : 'EarthInertial';
    setReferenceSystem(next);
  }, [referenceSystem, setReferenceSystem]);

  const items = [
    { key: 'Grid', label: 'Grid', checked: view.Grid, onChange: setGrid },
    { key: 'Axis', label: 'Axis', checked: view.Axis, onChange: setAxis },
    { key: 'HDEarth', label: 'HDEarth', checked: view.HDEarth, onChange: setHDEarth },
    { key: 'VonAllenBelt', label: 'Von Allen Belt', checked: view.VonAllenBelt, onChange: setVonAllenBelt },
    { key: 'Sun', label: 'Sun', checked: view.Sun, onChange: setSun },
    { key: 'AmbientLight', label: 'Ambient Light', checked: view.AmbientLight, onChange: setAmbientLight },
  ];

  return (
    <SidebarUtilityControl
      reference={{ value: referenceSystem, onToggle: handleReferenceToggle }}
      items={items}
    />
  );
};

export default UtilityControl;
