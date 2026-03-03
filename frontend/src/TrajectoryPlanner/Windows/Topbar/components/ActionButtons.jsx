import React from 'react';
import { Item, RippleButton, Input, LoadingIndicator } from '../TopBar.styles';
import ViewModeButton from './ViewModeButton';

/**
 * Component containing all action buttons for the TopBar
 * @param {Object} operations - Object containing all operation handlers
 * @param {Function} handleRipple - Ripple effect handler
 * @param {boolean} uploading - Whether an upload is in progress
 * @param {boolean} downloading - Whether a download is in progress
 * @param {boolean} showNewTrajInput - Whether to show new trajectory input
 * @param {boolean} showSaveAsInput - Whether to show save as input
 * @param {string} newTrajMessage - Value for new trajectory input
 * @param {Function} setNewTrajMessage - Setter for new trajectory input
 * @param {string} saveAsMessage - Value for save as input
 * @param {Function} setSaveAsMessage - Setter for save as input
 * @param {Object} newTrajInputRef - Ref for new trajectory input
 * @param {Object} saveAsInputRef - Ref for save as input
 * @param {boolean} user - Whether user is logged in
 * @param {boolean} hasTrajectory - Whether a trajectory is loaded
 */
const ActionButtons = ({
  operations,
  handleRipple,
  uploading,
  downloading,
  showNewTrajInput,
  showSaveAsInput,
  newTrajMessage,
  setNewTrajMessage,
  saveAsMessage,
  setSaveAsMessage,
  newTrajInputRef,
  saveAsInputRef,
  user,
  hasTrajectory,
  currentViewMode,
  onChangeView,
  showControlPanel,
  onToggleControlPanel,
  // Link Budget overlay removed (UI/UX simplification)
}) => {
  const isDisabled = !user;
  const isProjectDisabled = !user || !hasTrajectory;
  return (
    <>
      <Item 
        data-tooltip={isDisabled ? "Login required to open projects" : "Open a new project from library"}
        onClick={isDisabled ? undefined : operations.handleOpenClick} 
        style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
        disabled={isDisabled}
      >
        <RippleButton 
          onMouseDown={isDisabled ? undefined : handleRipple}
          disabled={isDisabled}
          title={isDisabled ? "Login required" : "Open a new project from library"}
          aria-label="Open a new project from library"
        >
          Open
        </RippleButton>
      </Item>

      {/* View button adjacent to Open */}
      <ViewModeButton
        currentViewMode={currentViewMode}
        onChange={onChangeView}
        handleRipple={handleRipple}
        showControlPanel={showControlPanel}
        onToggleControlPanel={onToggleControlPanel}
      />

      <Item 
        data-tooltip={!user ? "Login required to see versions" : !hasTrajectory ? "No project loaded" : "See different iteration of this project"}
        onClick={isProjectDisabled ? undefined : operations.handleVersionClick} 
        style={{ cursor: isProjectDisabled ? 'not-allowed' : 'pointer', opacity: isProjectDisabled ? 0.5 : 1 }}
        disabled={isProjectDisabled}
      >
        <RippleButton 
          onMouseDown={isProjectDisabled ? undefined : handleRipple}
          disabled={isProjectDisabled}
          title={!user ? "Login required" : !hasTrajectory ? "No project loaded" : "See different iteration of this project"}
          aria-label="See different iteration of this project"
        >
          Version
        </RippleButton>
      </Item>

      <Item 
        data-tooltip={isDisabled ? "Login required to create projects" : "Start a new project from scratch"}
        disabled={isDisabled}
      >
        <RippleButton 
          onMouseDown={isDisabled ? undefined : handleRipple}
          onClick={isDisabled ? undefined : operations.handleNewTrajClick}
          disabled={isDisabled || uploading}
          title={isDisabled ? "Login required" : "Start a new project from scratch"}
          aria-label="Start a new project from scratch"
        >
          New
          {uploading && <LoadingIndicator />}
        </RippleButton>
      </Item>

      {showNewTrajInput && user && (
        <Item ref={newTrajInputRef}>
          <Input
            type="text"
            value={newTrajMessage}
            onChange={(e) => setNewTrajMessage(e.target.value)}
            autoFocus
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Enter project name"
          />
          <RippleButton 
            onMouseDown={handleRipple}
            onClick={operations.handleNewTrajectory}
            disabled={uploading}
          >
            Create new Trajectory
          </RippleButton>
        </Item>
      )}

      <Item 
        data-tooltip={!user ? "Login required to save" : !hasTrajectory ? "No project loaded" : "Save current progress as new iteration"}
        disabled={isProjectDisabled}
        style={{ opacity: isProjectDisabled ? 0.5 : 1 }}
      >
        <RippleButton 
          onMouseDown={isProjectDisabled ? undefined : handleRipple}
          onClick={isProjectDisabled ? undefined : operations.handleSaveAsClick}
          disabled={isProjectDisabled || uploading}
          title={!user ? "Login required" : !hasTrajectory ? "No project loaded" : "Save current progress as new iteration"}
          aria-label="Save current progress as new iteration"
        >
          Save As
          {uploading && <LoadingIndicator />}
        </RippleButton>
      </Item>

      {showSaveAsInput && user && (
        <Item ref={saveAsInputRef}>
          <Input
            type="text"
            value={saveAsMessage}
            onChange={(e) => setSaveAsMessage(e.target.value)}
            autoFocus
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Enter iteration message"
          />
          <RippleButton 
            onMouseDown={handleRipple}
            onClick={operations.handleSaveAs}
            disabled={uploading}
          >
            Create new iteration
          </RippleButton>
        </Item>
      )}

      <Item 
        data-tooltip={!user ? "Login required to save" : !hasTrajectory ? "No project loaded" : "Save progress to current iteration"}
        disabled={isProjectDisabled}
        style={{ opacity: isProjectDisabled ? 0.5 : 1 }}
      >
        <RippleButton 
          onMouseDown={isProjectDisabled ? undefined : handleRipple}
          onClick={isProjectDisabled ? undefined : operations.handleSaveClick}
          disabled={isProjectDisabled || downloading}
          title={!user ? "Login required" : !hasTrajectory ? "No project loaded" : "Save progress to current iteration"}
          aria-label="Save progress to current iteration"
        >
          Save
          {downloading && <LoadingIndicator />}
        </RippleButton>
      </Item>
    </>
  );
};

export default ActionButtons;
