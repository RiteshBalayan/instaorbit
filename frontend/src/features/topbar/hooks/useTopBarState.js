import { useState, useRef } from 'react';

export const useTopBarState = () => {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [saveAsMessage, setSaveAsMessage] = useState('');
  const [newTrajMessage, setNewTrajMessage] = useState('');
  const [captureScreenshot, setCaptureScreenshot] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showSaveAsInput, setShowSaveAsInput] = useState(false);
  const [showNewTrajInput, setShowNewTrajInput] = useState(false);
  const [popupType, setPopupType] = useState('');
  const [loadNotification, setLoadNotification] = useState(null);
  const saveAsInputRef = useRef(null);
  const newTrajInputRef = useRef(null);

  return {
    uploading,
    setUploading,
    downloading,
    setDownloading,
    autosaving,
    setAutosaving,
    saveAsMessage,
    setSaveAsMessage,
    newTrajMessage,
    setNewTrajMessage,
    captureScreenshot,
    setCaptureScreenshot,
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
    popupType,
    setPopupType,
    loadNotification,
    setLoadNotification,
    saveAsInputRef,
    newTrajInputRef,
  };
};

export default useTopBarState;
