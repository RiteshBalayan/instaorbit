import React from 'react';
import { useSelector } from 'react-redux';
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


const TopBar = () => {
  // Redux state
  const state = useSelector((state) => state);
  const ProjectName = useSelector((state) => state.workingProject.trajectoryName);
  const trajectoryID = useSelector((state) => state.workingProject.trajectoryID);
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
    screenshotRef,
    loadNotification,
    popupType
  } = stateManager;

  return (
    <Bar>
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
        />

        <AuthenticationSection user={user} />
      </Items>

      <ProjectPopup
        isOpen={showPopup}
        onClose={operations.handleClosePopup}
        onLoaded={operations.handleLoaded}
        trajectories={state.trajectoryList}
        iterations={state.iterationList}
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
        iterationName={state.workingProject.itterationName}
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
