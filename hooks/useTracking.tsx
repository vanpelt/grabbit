import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface TrackingContextType {
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  toggleTracking: () => void;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTracking, setIsTracking] = useState(true); // Enabled by default as requested

  const startTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const toggleTracking = useCallback(() => {
    setIsTracking(prev => !prev);
  }, []);

  const value = { isTracking, startTracking, stopTracking, toggleTracking };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
}; 