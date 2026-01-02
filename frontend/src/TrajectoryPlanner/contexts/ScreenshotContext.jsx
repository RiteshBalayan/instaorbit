import React, { createContext, useContext } from 'react';

const ScreenshotContext = createContext(null);

export const ScreenshotProvider = ({ children, screenshotRef }) => {
  return (
    <ScreenshotContext.Provider value={screenshotRef}>
      {children}
    </ScreenshotContext.Provider>
  );
};

export const useScreenshotRef = () => {
  const context = useContext(ScreenshotContext);
  if (!context) {
    console.warn('useScreenshotRef must be used within ScreenshotProvider');
  }
  return context;
};
