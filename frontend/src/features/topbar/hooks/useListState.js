import { useState } from 'react';

export const useListState = () => {
  const [view, setView] = useState('grid');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  return {
    view,
    setView,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    loading,
    setLoading,
    error,
    setError,
    isRestoring,
    setIsRestoring,
  };
};

export default useListState;
