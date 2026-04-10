import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { auth } from '../../../firebase/firebase';
import { Bar, Items } from './TopBar.styles';
import { useTopBarState } from '../../../features/topbar/hooks/useTopBarState';
import { useProjectOperations } from '../../../features/topbar/hooks/useProjectOperations';
import { useRippleEffect } from '../../../features/topbar/hooks/useRippleEffect';
import { useClickOutside } from '../../../features/topbar/hooks/useClickOutside';
import NewTrajectoryModal from './components/NewTrajectoryModal';
import SaveModal from './components/SaveModal';
import SaveAsModal from './components/SaveAsModal';
import ProjectPopup from './components/ProjectPopup';
import NotificationToast from './components/NotificationToast';
import ProjectDisplay from './components/ProjectDisplay';
import ActionButtons from './components/ActionButtons';
import AuthenticationSection from './components/AuthenticationSection';
import { setViewMode, toggleControlPanel } from '../../../Store/View';


const TopBar = () => {
  const barRef = useRef(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const setVar = () => {
      const h = el.offsetHeight || 0;
      document.documentElement.style.setProperty('--topbar-height', `${h}px`);
    };

    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener('resize', setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setVar);
    };
  }, []);

  // Redux state (avoid selecting the entire store; it causes rerenders on every state change)
  const ProjectName = useSelector((state) => state.workingProject.trajectoryName);
  const trajectoryID = useSelector((state) => state.workingProject.trajectoryID);
  const currentViewMode = useSelector((state) => state.view.viewMode);
  const showControlPanel = useSelector((state) => state.view.showControlPanel);
  const trajectoryList = useSelector((state) => state.trajectoryList);
  const iterationList = useSelector((state) => state.iterationList);
  const itterationName = useSelector((state) => state.workingProject.itterationName);
  const dispatch = useDispatch();
  const user = auth.currentUser;
  
  // Check if a trajectory is loaded
  const hasTrajectory = trajectoryID && trajectoryID !== '';

  // Custom hooks
  const stateManager = useTopBarState();
  const operations = useProjectOperations(stateManager);
  const { handleRipple } = useRippleEffect();
  
  // Handle click outside (close modals)
  useClickOutside(stateManager);

  // Destructure state for easier access in JSX
  const {
    uploading,
    downloading,
    showNewModal,
    showSaveModal,
    showSaveAsModal,
    showPopup,
    showSaveAsInput,
    showNewTrajInput,
    saveAsMessage,
    setSaveAsMessage,
    newTrajMessage,
    setNewTrajMessage,
    saveAsInputRef,
    newTrajInputRef,
    loadNotification,
    popupType
  } = stateManager;

  return (
    <Bar ref={barRef}>
      <Items>
        <ProjectDisplay projectName={ProjectName} />

        <ActionButtons
          operations={operations}
          handleRipple={handleRipple}
          uploading={uploading}
          downloading={downloading}
          showNewTrajInput={showNewTrajInput}
          showSaveAsInput={showSaveAsInput}
          newTrajMessage={newTrajMessage}
          setNewTrajMessage={setNewTrajMessage}
          saveAsMessage={saveAsMessage}
          setSaveAsMessage={setSaveAsMessage}
          newTrajInputRef={newTrajInputRef}
          saveAsInputRef={saveAsInputRef}
          user={user}
          hasTrajectory={hasTrajectory}
          currentViewMode={currentViewMode}
          onChangeView={(mode) => dispatch(setViewMode(mode))}
          showControlPanel={showControlPanel}
          onToggleControlPanel={() => dispatch(toggleControlPanel())}
        />

        <AuthenticationSection user={user} />

      </Items>

      <ProjectPopup
        isOpen={showPopup}
        onClose={operations.handleClosePopup}
        onLoaded={operations.handleLoaded}
        trajectories={trajectoryList}
        iterations={iterationList}
        type={popupType}
      />

      <NotificationToast message={loadNotification} />

      <NewTrajectoryModal
        isOpen={showNewModal}
        onClose={() => stateManager.setShowNewModal(false)}
        onCreate={operations.handleNewTrajectory}
        value={newTrajMessage}
        onChange={(e) => setNewTrajMessage(e.target.value)}
        isLoading={uploading}
        onRipple={handleRipple}
        captureScreenshot={stateManager.captureScreenshot}
        onScreenshotChange={stateManager.setCaptureScreenshot}
      />

      <SaveModal
        isOpen={showSaveModal}
        onClose={() => stateManager.setShowSaveModal(false)}
        onSave={operations.handleSave}
        isLoading={uploading}
        onRipple={handleRipple}
        captureScreenshot={stateManager.captureScreenshot}
        onScreenshotChange={stateManager.setCaptureScreenshot}
        iterationName={itterationName}
      />

      <SaveAsModal
        isOpen={showSaveAsModal}
        onClose={() => stateManager.setShowSaveAsModal(false)}
        onSave={operations.handleSaveAs}
        value={saveAsMessage}
        onChange={(e) => setSaveAsMessage(e.target.value)}
        isLoading={uploading}
        onRipple={handleRipple}
        captureScreenshot={stateManager.captureScreenshot}
        onScreenshotChange={stateManager.setCaptureScreenshot}
      />
    </Bar>
  );
};

export default TopBar;
