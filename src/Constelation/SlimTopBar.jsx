import React, { useState } from 'react';
import './SlimTopBar.css'; // Import your CSS file for styling
import { uploadStateField, downloadStateField } from '../firebase/firebaseUtils';
import { useSelector, useDispatch } from 'react-redux';
import { auth } from '../firebase/firebase'; // Assuming you have an authentication module

const SlimTopBar = () => {
  const dispatch = useDispatch();
  const state = useSelector((state) => state);
  const user = auth.currentUser; // Get current user from Firebase Auth

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleUpload = async () => {
    if (user) {
      setUploading(true);
      try {
        await uploadStateField(state.timer, 'timer');
        await uploadStateField(state.particles, 'particles');
        await uploadStateField(state.CurrentState, 'CurrentState');
        await uploadStateField(state.satellites, 'satellites');
        console.log('Upload successful');
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
    } else {
      console.log('User not authenticated. Upload operation not allowed.');
    }
  };
  
  const handleDownload = async () => {
    if (user) {
      setDownloading(true);
      try {
        const downloadedtimer = await downloadStateField('timer');
        if (downloadedtimer) {
          dispatch({ type: `SET_TIMER`, payload: downloadedtimer });
        }

        const downloadedparticles = await downloadStateField('particles');
        if (downloadedparticles) {
          dispatch({ type: `SET_PARTICLES`, payload: downloadedparticles });
        }

        const downloadedCurrentState = await downloadStateField('CurrentState');
        if (downloadedCurrentState) {
          dispatch({ type: `SET_CURRENTSTATE`, payload: downloadedCurrentState });
        }

        const downloadedsatellites = await downloadStateField('satellites');
        if (downloadedsatellites) {
          dispatch({ type: `SET_SATELLITES`, payload: downloadedsatellites });
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
              <button className="top-bar-button" onClick={handleUpload} disabled={uploading}>
                Upload
                {uploading && <div className="loading-indicator"> </div>}
              </button>
            </div>
            <div className="top-bar-item">
              <button className="top-bar-button" onClick={handleDownload} disabled={downloading}>
                Download
                {downloading && <div className="loading-indicator"></div>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SlimTopBar;
