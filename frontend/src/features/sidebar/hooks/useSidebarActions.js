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
  setShowLinkLines,
  setShowBodyFrameAxes,
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
  const setShowLinkLinesAction = (value) => dispatch(setShowLinkLines(value));
  const setShowBodyFrameAxesAction = (value) => dispatch(setShowBodyFrameAxes(value));

  return { setReferenceSystem, setGrid, setAxis, setVonAllenBelt, setHDEarth, setSun, setAmbientLight, setTrackWindow: setTrackWindowAction, setShowOrbit: setShowOrbitAction, setShowLinkLines: setShowLinkLinesAction, setShowBodyFrameAxes: setShowBodyFrameAxesAction };
};

export default useSidebarActions;
