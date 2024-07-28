import React, { useState, useEffect } from 'react';
import '../styles/simulator/SlimTopBar.css'; // Import your CSS file for styling
import { uploadIteration, downloadIterationState, uploadAutoSave, updateIteration, newTrajectory, uploadStateField, downloadStateField } from '../firebase/firebaseUtils';
import { useSelector, useDispatch } from 'react-redux';
import { auth } from '../firebase/firebase'; // Assuming you have an authentication module
import { updateitterationID, updatetrajectoryID } from '../Store/workingProject';

const SlimTopBar = () => {
  const dispatch = useDispatch();
  const state = useSelector((state) => state);
  const itterationID = useSelector((state) => state.workingProject.itterationID);
  const trajectoryID = useSelector((state) => state.workingProject.trajectoryID);
  const user = auth.currentUser; // Get current user from Firebase Auth

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [showSaveAsInput, setShowSaveAsInput] = useState(false);
  const [saveAsMessage, setSaveAsMessage] = useState('');
  const [showNewTrajInput, setShowNewTrajInput] = useState(false);
  const [newTrajMessage, setNewTrajMessage] = useState('');

  const handleNewTrajClick = () => {
    setShowNewTrajInput(true);
  };

  const handleNewTrajectory = async () => {
    if (user && newTrajMessage) {
      setUploading(true);
      try {
        const newTrajectoryId =await newTrajectory(newTrajMessage);
        if (newTrajectoryId) {
          dispatch(updatetrajectoryID(newTrajectoryId));
        }
        console.log('Upload successful');
        setNewTrajMessage(''); // Clear the input field after saving
        setShowNewTrajInput(false); // Hide the input field after saving
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
    } else {
      console.log('User not authenticated or save message is empty. Upload operation not allowed.');
    }
  };

  // Handle autosave function
  const handleAutosave = async () => {
    if (user) {
      setAutosaving(true);
      setUploading(true);
      try {
        await uploadAutoSave(trajectoryID, state);
        console.log('Upload successful');
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
        setAutosaving(false);
      }
    } else {
      console.log('User not authenticated. Upload operation not allowed.');
    }
  };

  // Set up autosave interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      handleAutosave();
    }, 60000); // 60000 milliseconds = 1 minute

    // Clear the interval on component unmount
    return () => clearInterval(intervalId);
  }, [user, state]);


  //Debug error for case itterationID is null
  const handleSave = async () => {
      setUploading(true);
      try {
        const newIterationId =await updateIteration(trajectoryID, itterationID, state);
        if (newIterationId) {
          dispatch(updateitterationID(newIterationId)); // Update the iteration ID in Redux store
        }
        console.log('Upload successful');
        setSaveAsMessage(''); // Clear the input field after saving
        setShowSaveAsInput(false); // Hide the input field after saving
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
  };

  const handleSaveAsClick = () => {
    setShowSaveAsInput(true);
  };

  const handleSaveAs = async () => {
    if (user && saveAsMessage) {
      setUploading(true);
      try {
        const newIterationId =await uploadIteration(trajectoryID, state, saveAsMessage);
        if (newIterationId) {
          dispatch(updateitterationID(newIterationId)); // Update the iteration ID in Redux store
        }
        console.log('Upload successful');
        setSaveAsMessage(''); // Clear the input field after saving
        setShowSaveAsInput(false); // Hide the input field after saving
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
    } else {
      console.log('User not authenticated or save message is empty. Upload operation not allowed.');
    }
  };
  
  const handleDownload = async () => {
    if (user) {
      setDownloading(true);
      try {
        const iterationId = "dW4qDJXKVQAE5ojDKMzv"; // Replace with the specific iteration ID or logic to get the latest

        const fields = ['timer']; // add more if necessary
        for (const field of fields) {
          const downloadedState = await downloadIterationState(trajectoryID, iterationId, field);
          if (downloadedState) {
            dispatch({ type: `SET_${field.toUpperCase()}`, payload: downloadedState });
          }
        }

        console.log('Download successful');
      } catch (error) {
        console.error('Download failed:', error);
      } finally {
        setDownloading(false);
      }
    } else {
      console.log('User not authenticated. Download operation not allowed.');
    }
  };

  return (
    <div className="slim-top-bar">
      <div className="top-bar-items">
        {/* Hardcoded example options */}
        <div className="top-bar-item">File</div>
        <div className="top-bar-item">Edit</div>
        <div className="top-bar-item">View</div>
        {user && (
          <>
            <div className="top-bar-item">
              <button className="top-bar-button" onClick={handleNewTrajClick} disabled={uploading}>
                New
                {uploading && <div className="loading-indicator"> </div>}
              </button>
            </div>
            {showNewTrajInput && (
              <div className="top-bar-item">
                <input
                  type="text"
                  value={newTrajMessage}
                  onChange={(e) => setNewTrajMessage(e.target.value)}
                  placeholder="Enter project name"
                />
                <button className="top-bar-button" onClick={handleNewTrajectory} disabled={uploading}>
                  Create new Trajectory
                </button>
              </div>
            )}
            <div className="top-bar-item">
              <button className="top-bar-button" onClick={handleSaveAsClick} disabled={uploading}>
                Save As
                {uploading && <div className="loading-indicator"> </div>}
              </button>
            </div>
            {showSaveAsInput && (
              <div className="top-bar-item">
                <input
                  type="text"
                  value={saveAsMessage}
                  onChange={(e) => setSaveAsMessage(e.target.value)}
                  placeholder="Enter iteration message"
                />
                <button className="top-bar-button" onClick={handleSaveAs} disabled={uploading}>
                  Create new itteration
                </button>
              </div>
            )}
            <div className="top-bar-item">
              <button className="top-bar-button" onClick={handleDownload} disabled={downloading}>
                Download
                {downloading && <div className="loading-indicator"></div>}
              </button>
            </div>
            <div className="top-bar-item">
              <button className="top-bar-button" onClick={handleSave} disabled={downloading}>
                Save
                {downloading && <div className="loading-indicator"></div>}
              </button>
            </div>
            <div className="top-bar-item">
              <div className="top-bar-button">
                Autosave
                {autosaving && <div className="loading-indicator">Autosaving...</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SlimTopBar;
