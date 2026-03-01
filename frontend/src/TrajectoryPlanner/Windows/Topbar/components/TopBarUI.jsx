import React from 'react';
import { Bar, Items } from '../TopBar.styles';
import NewTrajectoryModal from './NewTrajectoryModal';
import SaveModal from './SaveModal';
import SaveAsModal from './SaveAsModal';
import ProjectPopup from './ProjectPopup';
import NotificationToast from './NotificationToast';
import ProjectDisplay from './ProjectDisplay';
import ActionButtons from './ActionButtons';
import AuthenticationSection from './AuthenticationSection';

const TopBarUI = ({
  projectName,
  user,
  hasTrajectory,
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
  popupType,
  operations,
  handleRipple,
  captureScreenshot,
  setCaptureScreenshot,
  iterations,
  trajectories,
  iterationName,
}) => {
  return (
    <Bar>
      <Items>
        <ProjectDisplay projectName={projectName} />

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
        trajectories={trajectories}
        iterations={iterations}
        type={popupType}
      />

      <NotificationToast message={loadNotification} />

      <NewTrajectoryModal
        isOpen={showNewModal}
        onClose={operations.handleCloseNewModal}
        onCreate={operations.handleNewTrajectory}
        value={newTrajMessage}
        onChange={(e) => setNewTrajMessage(e.target.value)}
        isLoading={uploading}
        onRipple={handleRipple}
        captureScreenshot={captureScreenshot}
        onScreenshotChange={setCaptureScreenshot}
      />

      <SaveModal
        isOpen={showSaveModal}
        onClose={operations.handleCloseSaveModal}
        onSave={operations.handleSave}
        isLoading={uploading}
        onRipple={handleRipple}
        captureScreenshot={captureScreenshot}
        onScreenshotChange={setCaptureScreenshot}
        iterationName={iterationName}
      />

      <SaveAsModal
        isOpen={showSaveAsModal}
        onClose={operations.handleCloseSaveAsModal}
        onSave={operations.handleSaveAs}
        value={saveAsMessage}
        onChange={(e) => setSaveAsMessage(e.target.value)}
        isLoading={uploading}
        onRipple={handleRipple}
        captureScreenshot={captureScreenshot}
        onScreenshotChange={setCaptureScreenshot}
      />
    </Bar>
  );
};

export default TopBarUI;
