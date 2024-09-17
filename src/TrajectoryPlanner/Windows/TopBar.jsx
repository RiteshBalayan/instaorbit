import React, { useState, useEffect, useRef } from 'react';
import '../../Styles/simulator/SlimTopBar.css'; 
import { uploadIteration, downloadIterationState, uploadAutoSave, updateIteration, newTrajectory } from '../../firebase/firebaseUtils';
import { useSelector, useDispatch } from 'react-redux';
import { auth } from '../../firebase/firebase'; 
import { updateitterationID, updatetrajectoryID, updateitterationName } from '../../Store/workingProject';
import GoogleAuth from '../../firebase/googleauth';
import SignOut from '../../firebase/signout';
import TrajectoriesList from './TrajectoryList';
import ItterationList from './ItterationList'

const Popup = ({ onClose, trajectories, iterations, type }) => {
  const popupRef = useRef(null);

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="popup-overlay">
      <div className="popup-content" ref={popupRef}>
        <button className="close-button" onClick={onClose}>X</button>
        {type === 'trajectory' ? (
          <>
            <h2>Select a Trajectory</h2>
            <TrajectoriesList trajectories={trajectories} />
          </>
        ) : (
          <>
            <h2>Select an Iteration</h2>
            <ItterationList iterations={iterations} />
          </>
        )}
      </div>
    </div>
  );
};


const TopBar = () => {
  const dispatch = useDispatch();
  const state = useSelector((state) => state);
  const itterationID = useSelector((state) => state.workingProject.itterationID);
  const trajectoryID = useSelector((state) => state.workingProject.trajectoryID);
  const ProjectName = useSelector((state) => state.workingProject.trajectoryName);
  const user = auth.currentUser; 
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [showSaveAsInput, setShowSaveAsInput] = useState(false);
  const [saveAsMessage, setSaveAsMessage] = useState('');
  const [showNewTrajInput, setShowNewTrajInput] = useState(false);
  const [newTrajMessage, setNewTrajMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState('');

  const saveAsInputRef = useRef(null);
  const newTrajInputRef = useRef(null);



  const handleOpenClick = () => {
    setPopupType('trajectory');
    setShowPopup(true);
  };

  const handleVersionClick = () => {
    setPopupType('iteration');
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const handleNewTrajClick = () => {
    setShowNewTrajInput(true);
  };

  const handleNewTrajectory = async () => {
    if (user && newTrajMessage) {
      setUploading(true);
      try {
        const newTrajectoryId = await newTrajectory(newTrajMessage);
        if (newTrajectoryId) {
          dispatch(updatetrajectoryID(newTrajectoryId));
          dispatch(updateitterationName(newTrajMessage));
        }
        const InitialCommitMessage = 'InitialCommit';

        if (user && InitialCommitMessage) {
          setUploading(true);
          try {
            const newIterationId = await uploadIteration(newTrajectoryId, state, InitialCommitMessage);
            if (newIterationId) {
              dispatch(updateitterationID(newIterationId)); // Update the iteration ID in Redux store
            }
            console.log('Upload successful');
          } catch (error) {
            console.error('Upload failed:', error);
          } finally {
            setUploading(false);
          }
        } else {
          console.log('User not authenticated or save message is empty. Upload operation not allowed.');
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

  const handleSave = async () => {
    setUploading(true);
    try {
      const newIterationId = await updateIteration(trajectoryID, itterationID, state);
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
        const newIterationId = await uploadIteration(trajectoryID, state, saveAsMessage);
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

  const handleClickOutside = (event) => {
    if (showSaveAsInput && saveAsInputRef.current && !saveAsInputRef.current.contains(event.target)) {
      setShowSaveAsInput(false);
    }

    if (showNewTrajInput && newTrajInputRef.current && !newTrajInputRef.current.contains(event.target)) {
      setShowNewTrajInput(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSaveAsInput, showNewTrajInput]);

  return (
    <div className="slim-top-bar">
      <div className="top-bar-items">
        <p style={{ marginRight: '10px' }}>{ProjectName}</p>
        {user && (
        <>
        <div className="top-bar-item" onClick={handleOpenClick}>Open</div>
        <div className="top-bar-item" onClick={handleVersionClick}>Version</div>

            <div className="top-bar-item">
              <button className="top-bar-button" onClick={handleNewTrajClick} disabled={uploading}>
                New
                {uploading && <div className="loading-indicator"> </div>}
              </button>
            </div>
            {showNewTrajInput && (
              <div className="top-bar-item" ref={newTrajInputRef}>
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
              <div className="top-bar-item" ref={saveAsInputRef}>
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
              <button className="top-bar-button" onClick={handleSave} disabled={downloading}>
                Save
                {downloading && <div className="loading-indicator"></div>}
              </button>
            </div>
          </>
        )}
        <div className="top-bar-item auth-section">
          {user ? (
            <div className="auth-container">
              <span className="welcome-message">Hello, {user.displayName || user.email}</span>
              <SignOut className="auth-button"/>
            </div>
          ) : (
            <div className="auth-container">
              <span className="welcome-message">Log in to save your Progress</span>
              <GoogleAuth className="auth-button"/>
            </div>
          )}
        </div>
      </div>
      {showPopup && (
        <Popup 
          onClose={handleClosePopup} 
          trajectories={state.trajectoryList} 
          iterations={state.iterationList} 
          type={popupType} 
        />
      )}
    </div>
  );
};

export default TopBar;
