import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { uploadIteration, downloadIterationState, uploadAutoSave, updateIteration, newTrajectory } from '../../../firebase/firebaseUtils';
import { useSelector, useDispatch } from 'react-redux';
import { auth } from '../../../firebase/firebase'; 
import { updateitterationID, updatetrajectoryID, updateitterationName, updateIterationImage } from '../../../Store/workingProject';
import GoogleAuth from '../../../firebase/googleauth';
import SignOut from '../../../firebase/signout';
import TrajectoriesList from './TrajectoryList';
import ItterationList from './ItterationList';
import html2canvas from 'html2canvas';

// Styled components moved to module scope to avoid recreation on every render
const rippleKeyframes = keyframes`
  to {
    transform: scale(2.5);
    opacity: 0;
  }
`;

const Bar = styled.div`
  width: 100%;
  background: linear-gradient(90deg, #232526 0%, #4e54c8 100%);
  color: #f5f6fa;
  font-family: 'Inter', 'Roboto', 'system-ui', sans-serif;
  box-shadow: 0 1px 6px rgba(44,44,54,0.10);
  padding: 0.18rem 0.7rem;
  border-bottom: 1px solid #2d2d2d;
  z-index: 100;
  font-size: 0.85rem;
`;

const Items = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const RippleButton = styled.button`
  position: relative;
  overflow: hidden;
  background: linear-gradient(90deg, #4e54c8 0%, #8f94fb 100%);
  color: #fff;
  font-weight: 500;
  font-family: inherit;
  border: none;
  border-radius: 6px;
  padding: 0.22rem 0.7rem;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.08s;
  box-shadow: 0 1px 4px rgba(78,84,200,0.08);
  font-size: 0.85rem;
  &:hover, &:focus {
    background: linear-gradient(90deg, #8f94fb 0%, #4e54c8 100%);
    box-shadow: 0 2px 8px rgba(78,84,200,0.18);
    transform: scale(1.03);
  }
  &:active {
    transform: scale(0.97);
  }
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
    transform: scale(0);
    animation: ${rippleKeyframes} 0.6s linear;
    pointer-events: none;
  }
`;

const AuthSection = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  font-size: 0.85rem;
`;

const AuthContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const Welcome = styled.span`
  font-size: 0.85rem;
  color: #b2b6c8;
`;

const PopupOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(44, 44, 54, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const PopupContent = styled.div`
  background: #232526;
  color: #f5f6fa;
  border-radius: 6px;
  box-shadow: 0 1px 6px rgba(44,44,54,0.10);
  padding: 0.5rem 0.7rem;
  min-width: 220px;
  max-width: 90vw;
  position: relative;
  font-size: 0.85rem;
  max-height: 340px;
  overflow-y: auto;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #414345;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: #4e54c8; }
`;

const Input = styled.input`
  background: #232526;
  color: #f5f6fa;
  border: 1px solid #4e54c8;
  border-radius: 4px;
  padding: 0.18rem 0.5rem;
  font-size: 0.85rem;
  margin-right: 0.3rem;
  margin-bottom: 0.3rem;
  &:focus { outline: none; border-color: #8f94fb; }
`;

const LoadingIndicator = styled.div`
  display: inline-block;
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid #8f94fb;
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-left: 0.3rem;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const Popup = ({ onClose, trajectories, iterations, type, onLoaded }) => {
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
      <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,backgroundColor:'rgba(0,0,0,0.45)'}}>
      <div ref={popupRef} style={{width:'min(92vw,760px)', height:'48vh', borderRadius:12, padding:0, boxShadow:'0 20px 60px rgba(2,6,23,0.8)', background:'#0f1113', position:'relative', display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <button onClick={onClose} style={{position:'absolute',right:10,top:10,background:'transparent',border:'none',color:'#cfd6ff',cursor:'pointer',zIndex:60}}>✕</button>
        {type === 'trajectory' ? (
          <>
            <div style={{padding:'12px 14px 8px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', zIndex:50}}>
              <h3 style={{margin:'0',color:'#e8ebff'}}>Select a Trajectory</h3>
            </div>
            <div style={{flex:1, overflow:'auto', padding:12}}>
              <TrajectoriesList trajectories={trajectories} onClose={onClose} onLoaded={onLoaded} />
            </div>
          </>
        ) : (
          <>
            <div style={{padding:'12px 14px 8px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', zIndex:50}}>
              <h3 style={{margin:'0',color:'#e8ebff'}}>Select an Iteration</h3>
            </div>
            <div style={{flex:1, overflow:'auto', padding:12}}>
              <ItterationList iterations={iterations} onClose={onClose} onLoaded={onLoaded} />
            </div>
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
  const [loadNotification, setLoadNotification] = useState(null);

  const saveAsInputRef = useRef(null);
  const newTrajInputRef = useRef(null);

  const screenshotRef = useRef(null);



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
      const canvas = await html2canvas(screenshotRef.current, {
        scale: 0.5, // lower the scale for a lower quality image
      });
  
      // Convert the canvas to a data URL (base64 image format)
      const imgData = canvas.toDataURL('image/jpeg', 0.5); // Set quality to 0.5 for low quality
      // Dispatch the image data to Redux store
      dispatch(updateIterationImage(imgData));
      try {
        const newIterationId = await uploadIteration(trajectoryID, state, saveAsMessage);
        if (newIterationId) {
          dispatch(updateitterationID(newIterationId)); // Update the iteration ID in Redux stor
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


  // Ripple effect for buttons
  const handleRipple = (e) => {
    const button = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add('ripple');
    button.appendChild(circle);
    circle.addEventListener('animationend', () => circle.remove());
  };

  return (
    <Bar>
      <div ref={screenshotRef}></div>
      <Items>
        <p style={{ marginRight: '7px', fontWeight: 500, fontSize: '0.92rem', letterSpacing: '0.01em' }}>{ProjectName}</p>
        {user && (
          <>
            <Item onClick={handleOpenClick} style={{cursor:'pointer'}}>
              <RippleButton onMouseDown={handleRipple} title="Open a new project from library" aria-label="Open a new project from library">Open</RippleButton>
            </Item>
            <Item onClick={handleVersionClick} style={{cursor:'pointer'}}>
              <RippleButton onMouseDown={handleRipple} title="See different iteration of this project" aria-label="See different iteration of this project">Version</RippleButton>
            </Item>
            <Item>
              <RippleButton onMouseDown={handleRipple} onClick={handleNewTrajClick} disabled={uploading} title="Start a new project from scratch" aria-label="Start a new project from scratch">
                New
                {uploading && <LoadingIndicator />}
              </RippleButton>
            </Item>
            {showNewTrajInput && (
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
                <RippleButton onMouseDown={handleRipple} onClick={handleNewTrajectory} disabled={uploading}>
                  Create new Trajectory
                </RippleButton>
              </Item>
            )}
            <Item>
              <RippleButton onMouseDown={handleRipple} onClick={handleSaveAsClick} disabled={uploading} title="Save current progress as new iteration" aria-label="Save current progress as new iteration">
                Save As
                {uploading && <LoadingIndicator />}
              </RippleButton>
            </Item>
            {showSaveAsInput && (
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
                <RippleButton onMouseDown={handleRipple} onClick={handleSaveAs} disabled={uploading}>
                  Create new iteration
                </RippleButton>
              </Item>
            )}
            <Item>
              <RippleButton onMouseDown={handleRipple} onClick={handleSave} disabled={downloading} title="Save progress to current iteration" aria-label="Save progress to current iteration">
                Save
                {downloading && <LoadingIndicator />}
              </RippleButton>
            </Item>
          </>
        )}
        <AuthSection>
          {user ? (
            <AuthContainer>
              <Welcome>Hello, {user.displayName || user.email}</Welcome>
              <SignOut className="auth-button"/>
            </AuthContainer>
          ) : (
            <AuthContainer>
              <Welcome>Log in to save your Progress</Welcome>
              <GoogleAuth className="auth-button"/>
            </AuthContainer>
          )}
        </AuthSection>
      </Items>
      {showPopup && (
        <Popup 
          onClose={handleClosePopup} 
          onLoaded={(msg) => {
            // hide popup and show transient notification
            setShowPopup(false);
            setLoadNotification(msg);
            setTimeout(() => setLoadNotification(null), 2800);
          }}
          trajectories={state.trajectoryList} 
          iterations={state.iterationList} 
          type={popupType} 
        />
      )}

      {loadNotification && (
        <div style={{position:'fixed',left:'50%',transform:'translateX(-50%)',top:12,zIndex:12000}}>
          <div style={{background:'linear-gradient(90deg,#6f77ff,#4e54c8)',color:'#061427',padding:'10px 14px',borderRadius:10,boxShadow:'0 8px 30px rgba(12,14,30,0.6)',fontWeight:600}}>
            {loadNotification}
          </div>
        </div>
      )}
    </Bar>
  );
};

export default TopBar;
