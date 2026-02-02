import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface PlacementContextValue {
  // State
  isPlacementMode: boolean;
  isCreating: boolean;
  
  // Actions
  togglePlacementMode: () => void;
  exitPlacementMode: () => void;
  setIsCreating: (creating: boolean) => void;
}

const PlacementContext = createContext<PlacementContextValue | null>(null);

interface PlacementProviderProps {
  children: ReactNode;
}

export function PlacementProvider({ children }: PlacementProviderProps) {
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const togglePlacementMode = useCallback(() => {
    setIsPlacementMode(prev => !prev);
  }, []);

  const exitPlacementMode = useCallback(() => {
    setIsPlacementMode(false);
  }, []);

  // Escape key to exit placement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlacementMode) {
        setIsPlacementMode(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlacementMode]);

  const value: PlacementContextValue = {
    isPlacementMode,
    isCreating,
    togglePlacementMode,
    exitPlacementMode,
    setIsCreating,
  };

  return (
    <PlacementContext.Provider value={value}>
      {children}
    </PlacementContext.Provider>
  );
}

export function usePlacement() {
  const context = useContext(PlacementContext);
  if (!context) {
    throw new Error('usePlacement must be used within a PlacementProvider');
  }
  return context;
}
