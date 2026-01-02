import { useState, useRef } from 'react';
import { useScreenshotRef } from '../../../contexts/ScreenshotContext';

/**
 * Custom hook to manage all state for the TopBar component
 * Consolidates multiple useState hooks into a single organized structure
 */
export const useTopBarState = () => {
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [autosaving, setAutosaving] = useState(false);

  // Input states
  const [saveAsMessage, setSaveAsMessage] = useState('');
  const [newTrajMessage, setNewTrajMessage] = useState('');
  
  // Screenshot capture option (experimental feature) - DISABLED BY DEFAULT
  const [captureScreenshot, setCaptureScreenshot] = useState(false);

  // Modal visibility states
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  // Legacy input visibility states (can be removed after full modal migration)
  const [showSaveAsInput, setShowSaveAsInput] = useState(false);
  const [showNewTrajInput, setShowNewTrajInput] = useState(false);

  // Popup type (trajectory or iteration)
  const [popupType, setPopupType] = useState('');

  // Notification state
  const [loadNotification, setLoadNotification] = useState(null);

  // Refs for handling click outside
  const saveAsInputRef = useRef(null);
  const newTrajInputRef = useRef(null);

  return {
    // Loading states
    uploading,
    setUploading,
    downloading,
    setDownloading,
    autosaving,
    setAutosaving,

    // Input states
    saveAsMessage,
    setSaveAsMessage,
    newTrajMessage,
    setNewTrajMessage,
    captureScreenshot,
    setCaptureScreenshot,

    // Modal visibility states
    showNewModal,
    setShowNewModal,
    showSaveModal,
    setShowSaveModal,
    showSaveAsModal,
    setShowSaveAsModal,
    showPopup,
    setShowPopup,
    showSaveAsInput,
    setShowSaveAsInput,
    showNewTrajInput,
    setShowNewTrajInput,

    // Popup type
    popupType,
    setPopupType,

    // Notification
    loadNotification,
    setLoadNotification,

    // Refs
    saveAsInputRef,
    newTrajInputRef
  };
};
