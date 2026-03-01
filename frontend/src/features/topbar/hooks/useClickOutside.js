import { useEffect } from 'react';

export const useClickOutside = (stateManager) => {
  const {
    showSaveAsInput,
    showNewTrajInput,
    saveAsInputRef,
    newTrajInputRef,
    setShowSaveAsInput,
    setShowNewTrajInput
  } = stateManager;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSaveAsInput && saveAsInputRef.current && !saveAsInputRef.current.contains(event.target)) {
        setShowSaveAsInput(false);
      }
      if (showNewTrajInput && newTrajInputRef.current && !newTrajInputRef.current.contains(event.target)) {
        setShowNewTrajInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSaveAsInput, showNewTrajInput, saveAsInputRef, newTrajInputRef, setShowSaveAsInput, setShowNewTrajInput]);
};

export default useClickOutside;
