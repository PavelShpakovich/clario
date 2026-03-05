import { useState, useEffect } from 'react';

export function useViewMode() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load from localStorage lazily to avoid hydration mismatch
  // and set-state-in-effect lint errors
  useEffect(() => {
    const handleInitialLoad = () => {
      const saved = localStorage.getItem('dashboard_view');
      if (saved === 'list' || saved === 'grid') {
        setViewMode((current) => (current !== saved ? saved : current));
      }
    };

    // Defer the execution until after the layout effect paints
    // to avoid the synchronous state update warning
    const id = setTimeout(handleInitialLoad, 0);
    return () => clearTimeout(id);
  }, []);

  const handleViewChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('dashboard_view', mode);
  };

  return { viewMode, setViewMode: handleViewChange };
}
