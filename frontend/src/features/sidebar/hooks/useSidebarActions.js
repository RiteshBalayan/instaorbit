import { useDispatch } from 'react-redux';
import {
  toggleGrid,
  toggleAxis,
  toggleVonAllenBelt,
  toggleHDEarth,
  toggleSun,
  toggleAmbientLight,
  toggleRefrenaceSystem,
  setTrackWindow,
  setShowOrbit,
} from '../../../Store/View';

export const useSidebarActions = () => {
  const dispatch = useDispatch();

  const setReferenceSystem = (system) => dispatch(toggleRefrenaceSystem(system));
  const setGrid = (value) => dispatch(toggleGrid(value));
  const setAxis = (value) => dispatch(toggleAxis(value));
  const setVonAllenBelt = (value) => dispatch(toggleVonAllenBelt(value));
  const setHDEarth = (value) => dispatch(toggleHDEarth(value));
  const setSun = (value) => dispatch(toggleSun(value));
  const setAmbientLight = (value) => dispatch(toggleAmbientLight(value));
  const setTrackWindowAction = (value) => dispatch(setTrackWindow(value));
  const setShowOrbitAction = (value) => dispatch(setShowOrbit(value));

  return { setReferenceSystem, setGrid, setAxis, setVonAllenBelt, setHDEarth, setSun, setAmbientLight, setTrackWindow: setTrackWindowAction, setShowOrbit: setShowOrbitAction };
};

export default useSidebarActions;
