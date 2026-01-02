import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { auth } from '../../../../firebase/firebase';
import { 
  updateitterationID, 
  updatetrajectoryID, 
  updateitterationName, 
  updatetrajectoryName, 
  updateIterationImage 
} from '../../../../Store/workingProject';
import { 
  uploadIteration, 
  updateIteration, 
  newTrajectory 
} from '../../../../firebase/firebaseUtils';
import html2canvas from 'html2canvas';

/**
 * Custom hook to manage all project operations (save, load, create, etc.)
 * Encapsulates business logic and Firebase interactions
 */
export const useProjectOperations = (stateManager) => {
  const dispatch = useDispatch();
  const state = useSelector((state) => state);
  const itterationID = useSelector((state) => state.workingProject.itterationID);
  const trajectoryID = useSelector((state) => state.workingProject.trajectoryID);
  const user = auth.currentUser;

  const {
    setUploading,
    setDownloading,
    setLoadNotification,
    setShowNewModal,
    setShowSaveAsModal,
    setNewTrajMessage,
    setSaveAsMessage,
    setShowSaveAsInput,
    newTrajMessage,
    saveAsMessage
  } = stateManager;

  const captureScreenshot = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        preferCurrentTab: true
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      await new Promise(resolve => video.onloadedmetadata = resolve);
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      stream.getTracks().forEach(track => track.stop());
      
      const imgData = canvas.toDataURL('image/jpeg', 0.5);
      console.log(`Screenshot captured: ${canvas.width}x${canvas.height}`);
      
      return imgData;
    } catch (err) {
      console.error('Screenshot failed:', err);
      return null;
    }
  }, []);

  // Handle opening the trajectory selection popup
  const handleOpenClick = useCallback(() => {
    stateManager.setPopupType('trajectory');
    stateManager.setShowPopup(true);
  }, [stateManager]);

  // Handle opening the iteration version popup
  const handleVersionClick = useCallback(() => {
    stateManager.setPopupType('iteration');
    stateManager.setShowPopup(true);
  }, [stateManager]);

  // Handle closing any popup
  const handleClosePopup = useCallback(() => {
    stateManager.setShowPopup(false);
  }, [stateManager]);

  // Handle opening the new trajectory modal
  const handleNewTrajClick = useCallback(() => {
    setNewTrajMessage('');
    setShowNewModal(true);
  }, [setNewTrajMessage, setShowNewModal]);

  // Handle creating a new trajectory
  const handleNewTrajectory = useCallback(async () => {
    if (!user || !newTrajMessage) {
      console.log('User not authenticated or trajectory name is empty. Operation not allowed.');
      return;
    }
    setShowNewModal(false);
    setUploading(true);
    try {
      const newTrajectoryId = await newTrajectory(newTrajMessage);
      if (newTrajectoryId) {
        dispatch(updatetrajectoryID(newTrajectoryId));
        dispatch(updatetrajectoryName(newTrajMessage));
      }
      const InitialCommitMessage = 'InitialCommit';
      if (newTrajectoryId && InitialCommitMessage) {
        try {
          let imgData = null;
          
          // Only capture screenshot if user enabled the option
          if (stateManager.captureScreenshot) {
            imgData = await captureScreenshot();
          }
          
          // Update state with new image before uploading
          const stateWithNewImage = {
            ...state,
            workingProject: {
              ...state.workingProject,
              itterationImage: imgData
            }
          };
          
          if (imgData) {
            console.log('Screenshot captured for new trajectory');
            dispatch(updateIterationImage(imgData));
          } else {
            console.log('Screenshot capture skipped or not available');
          }

          const newIterationId = await uploadIteration(newTrajectoryId, stateWithNewImage, InitialCommitMessage);
          if (newIterationId) {
            dispatch(updateitterationID(newIterationId));
            dispatch(updateitterationName(InitialCommitMessage));
          }
        } catch (err) {
          console.error('Initial iteration upload failed', err);
        }
      }
      setNewTrajMessage('');
      setLoadNotification('New trajectory created');
      setTimeout(() => setLoadNotification(null), 2800);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  }, [user, newTrajMessage, state, captureScreenshot, dispatch, setShowNewModal, setUploading, setNewTrajMessage, setLoadNotification]);

  // Handle opening the save modal
  const handleSaveClick = useCallback(() => {
    stateManager.setShowSaveModal(true);
  }, [stateManager]);

  // Handle saving to current iteration
  const handleSave = useCallback(async () => {
    stateManager.setShowSaveModal(false);
    setUploading(true);
    try {
      let imgData = null;
      
      // Only capture screenshot if user enabled the option
      if (stateManager.captureScreenshot) {
        imgData = await captureScreenshot();
      }
      
      // Update state with new image before uploading
      const stateWithNewImage = {
        ...state,
        workingProject: {
          ...state.workingProject,
          itterationImage: imgData
        }
      };
      
      // Dispatch to Redux for UI updates
      if (imgData) dispatch(updateIterationImage(imgData));

      const newIterationId = await updateIteration(trajectoryID, itterationID, stateWithNewImage);
      if (newIterationId) {
        dispatch(updateitterationID(newIterationId));
      }
      console.log('Upload successful');
      setSaveAsMessage('');
      setShowSaveAsInput(false);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  }, [trajectoryID, itterationID, state, stateManager, captureScreenshot, dispatch, setUploading, setSaveAsMessage, setShowSaveAsInput]);

  // Handle opening the save as modal
  const handleSaveAsClick = useCallback(() => {
    setSaveAsMessage('');
    setShowSaveAsModal(true);
  }, [setSaveAsMessage, setShowSaveAsModal]);

  // Handle saving as new iteration
  const handleSaveAs = useCallback(async () => {
    if (!user || !saveAsMessage || !trajectoryID) {
      console.log('User not authenticated or save message is empty. Upload operation not allowed.');
      return;
    }
    setShowSaveAsModal(false);
    setUploading(true);
    try {
      let imgData = null;
      
      // Only capture screenshot if user enabled the option
      if (stateManager.captureScreenshot) {
        imgData = await captureScreenshot();
      }
      
      // Update state with new image before uploading
      const stateWithNewImage = {
        ...state,
        workingProject: {
          ...state.workingProject,
          itterationImage: imgData
        }
      };
      
      // Dispatch to Redux for UI updates
      if (imgData) dispatch(updateIterationImage(imgData));

      const newIterationId = await uploadIteration(trajectoryID, stateWithNewImage, saveAsMessage);
      if (newIterationId) {
        dispatch(updateitterationID(newIterationId));
        dispatch(updateitterationName(saveAsMessage));
      }
      setSaveAsMessage('');
      setLoadNotification('New iteration created');
      setTimeout(() => setLoadNotification(null), 2800);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [user, saveAsMessage, trajectoryID, state, stateManager.captureScreenshot, captureScreenshot, dispatch, setShowSaveAsModal, setUploading, setSaveAsMessage, setLoadNotification]);

  // Handle notification after loading
  const handleLoaded = useCallback((message) => {
    stateManager.setShowPopup(false);
    setLoadNotification(message);
    setTimeout(() => setLoadNotification(null), 2800);
  }, [stateManager, setLoadNotification]);

  return {
    handleOpenClick,
    handleVersionClick,
    handleClosePopup,
    handleNewTrajClick,
    handleNewTrajectory,
    handleSaveClick,
    handleSave,
    handleSaveAsClick,
    handleSaveAs,
    handleLoaded
  };
};
