/**
 * Custom hook for Premiere Pro-style keyboard shortcuts
 * Handles spacebar, arrow keys, J/K/L shuttle controls
 */

import { useEffect } from 'react';

/**
 * Hook for timeline keyboard shortcuts
 * @param {object} handlers - Object containing handler functions
 * @param {Function} handlers.onPlayPause - Toggle play/pause
 * @param {Function} handlers.onStepForward - Step forward one frame
 * @param {Function} handlers.onStepBackward - Step backward one frame
 * @param {Function} handlers.onZoomIn - Zoom in timeline
 * @param {Function} handlers.onZoomOut - Zoom out timeline
 * @param {Function} handlers.onZoomToFit - Fit timeline to window
 * @param {boolean} enabled - Whether shortcuts are enabled
 */
export const useTimelineKeyboard = (handlers, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      // Ignore if typing in input field
      const target = event.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const { key, shiftKey, altKey, metaKey, ctrlKey } = event;

      // Spacebar - Play/Pause
      if (key === ' ' && !shiftKey && !altKey && !metaKey && !ctrlKey) {
        event.preventDefault();
        handlers.onPlayPause?.();
        return;
      }

      // Arrow Right - Step forward or Fast forward (with Shift)
      if (key === 'ArrowRight' && !altKey && !metaKey && !ctrlKey) {
        event.preventDefault();
        if (shiftKey) {
          handlers.onFastForward?.();
        } else {
          handlers.onStepForward?.();
        }
        return;
      }

      // Arrow Left - Step backward or Fast backward (with Shift)
      if (key === 'ArrowLeft' && !altKey && !metaKey && !ctrlKey) {
        event.preventDefault();
        if (shiftKey) {
          handlers.onFastBackward?.();
        } else {
          handlers.onStepBackward?.();
        }
        return;
      }

      // J - Shuttle backward (or step backward)
      if (key === 'j' || key === 'J') {
        event.preventDefault();
        handlers.onStepBackward?.();
        return;
      }

      // K - Pause
      if (key === 'k' || key === 'K') {
        event.preventDefault();
        handlers.onPlayPause?.();
        return;
      }

      // L - Shuttle forward (or step forward)
      if (key === 'l' || key === 'L') {
        event.preventDefault();
        handlers.onStepForward?.();
        return;
      }

      // Plus/Equals - Zoom in (Alt/Cmd + =)
      if ((key === '=' || key === '+') && (altKey || metaKey)) {
        event.preventDefault();
        handlers.onZoomIn?.();
        return;
      }

      // Minus - Zoom out (Alt/Cmd + -)
      if (key === '-' && (altKey || metaKey)) {
        event.preventDefault();
        handlers.onZoomOut?.();
        return;
      }

      // Shift + Z - Zoom to fit
      if ((key === 'z' || key === 'Z') && shiftKey && !altKey && !metaKey && !ctrlKey) {
        event.preventDefault();
        handlers.onZoomToFit?.();
        return;
      }

      // Home - Go to start
      if (key === 'Home' && !shiftKey && !altKey && !metaKey && !ctrlKey) {
        event.preventDefault();
        handlers.onGoToStart?.();
        return;
      }

      // End - Go to end
      if (key === 'End' && !shiftKey && !altKey && !metaKey && !ctrlKey) {
        event.preventDefault();
        handlers.onGoToEnd?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers, enabled]);
};

export default useTimelineKeyboard;
