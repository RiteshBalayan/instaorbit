import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { trajectoryService } from '../../../services/trajectoryService';
import { useIterationRestore } from '../../../features/trajectory/hooks/useIterationRestore';
import { setTrajectories as setTrajectoriesAction, toggleArchive, deleteTrajectory as deleteTrajectoryAction } from '../../../Store/trajectorySlice';
import { useListState } from '../../../features/topbar/hooks/useListState.js';
import { useListSorting, toggleSort } from '../../../features/topbar/hooks/useListSorting.js';
import TrajectoriesListUI from '../../../ui/kit/topbar/TrajectoriesListUI.jsx';

const TrajectoriesList = ({ trajectories: propTrajectories, onClose, onLoaded }) => {
  const [trajectories, setTrajectories] = useState(propTrajectories || []);
  const [iterations, setIterations] = useState([]);
  const [selectedTrajectory, setSelectedTrajectory] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState(null);

  // Trajectory list state
  const trajState = useListState();
  
  // Iteration list state
  const iterState = useListState();

  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (propTrajectories && propTrajectories.length > 0) {
      setTrajectories(propTrajectories);
      dispatch(setTrajectoriesAction(propTrajectories));
      trajState.setError(propTrajectories.length > 0 ? null : 'No trajectories found.');
      return;
    }

    trajState.setLoading(true);
    trajectoryService.fetchTrajectories()
      .then((data) => {
        setTrajectories(data || []);
        dispatch(setTrajectoriesAction(data || []));
        trajState.setError(data && data.length > 0 ? null : 'No trajectories found.');
      })
      .catch(() => trajState.setError('Error fetching trajectories.'))
      .finally(() => trajState.setLoading(false));
  }, []);

  const handleTrajectoryClick = async (trajectory) => {
    setSelectedTrajectory(trajectory);
    iterState.setLoading(true);
    try {
      const iterationData = await trajectoryService.fetchIterations(trajectory.id);
      setIterations(iterationData || []);
      iterState.setError(iterationData && iterationData.length > 0 ? null : 'No iterations found for this trajectory.');
    } catch {
      iterState.setError('Error fetching iterations.');
    } finally {
      iterState.setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedTrajectory(null);
    setIterations([]);
    iterState.setError(null);
  };

  const { restoreIteration } = useIterationRestore();
  const handleIterationClick = async (iterationId) => {
    if (!selectedTrajectory) {
      iterState.setError('No trajectory selected');
      return;
    }
    iterState.setLoading(true);
    trajState.setIsRestoring(true);
    try {
      await restoreIteration({
        selectedTrajectory,
        iterationId,
        iterations,
      });
      iterState.setError(null);
      
      if (typeof onLoaded === 'function') {
        const iterObj = iterations.find((i) => i.id === iterationId);
        const message = iterObj
          ? `Iteration "${iterObj.name}" of trajectory "${selectedTrajectory.name}" loaded into project`
          : 'Iteration loaded into project';
        onLoaded(message);
      }
    } catch (e) {
      console.error('Error restoring iteration:', e);
      iterState.setError('Error loading iteration');
    } finally {
      iterState.setLoading(false);
      trajState.setIsRestoring(false);
    }
  };

  const handleArchiveClick = (trajectory) => {
    setConfirmInfo({
      id: trajectory.id,
      name: trajectory.name,
      archive: !Boolean(trajectory.archived),
      action: 'archive',
    });
    setConfirmOpen(true);
  };

  const handleDeleteClick = (trajectory) => {
    setConfirmInfo({
      id: trajectory.id,
      name: trajectory.name,
      action: 'delete',
    });
    setConfirmOpen(true);
  };

  const handleConfirmArchive = async () => {
    const { id, archive, action } = confirmInfo;
    
    // Close confirmation dialog immediately
    setConfirmOpen(false);
    
    // Handle delete action
    if (action === 'delete') {
      trajState.setLoading(true);
      trajState.setIsRestoring(true);
      try {
        const ok = await trajectoryService.deleteTrajectory(id);
        if (ok) {
          dispatch(deleteTrajectoryAction(id));
          setTrajectories((prev) => prev.filter((p) => p.id !== id));
          // If the deleted trajectory was selected, go back to list
          if (selectedTrajectory?.id === id) {
            setSelectedTrajectory(null);
            setIterations([]);
          }
        }
      } catch (e) {
        console.error('Delete action failed', e);
      } finally {
        trajState.setLoading(false);
        trajState.setIsRestoring(false);
        setConfirmInfo(null);
      }
      return;
    }
    
    // Handle archive action
    trajState.setLoading(true);
    try {
      const ok = await trajectoryService.setTrajectoryArchived(id, archive);
      if (ok) {
        dispatch(toggleArchive({ id, archived: archive }));
        setTrajectories((prev) => prev.map((p) => (p.id === id ? { ...p, archived: archive } : p)));
      }
    } catch (e) {
      console.error('Archive action failed', e);
    } finally {
      trajState.setLoading(false);
      setConfirmInfo(null);
    }
  };

  // Filter and sort trajectories
  const filteredTrajectories = useListSorting(
    trajectories,
    trajState.filter,
    trajState.sortBy,
    trajState.sortDir,
    'name',
    'createdOnRaw'
  ).filter((t) => Boolean(t.archived) === Boolean(showArchived));

  // Filter and sort iterations
  const filteredIterations = useListSorting(
    iterations,
    iterState.filter,
    iterState.sortBy,
    iterState.sortDir,
    'name',
    'timestampRaw'
  );
  return (
    <TrajectoriesListUI
      trajState={{
        ...trajState,
        onToggleSort: (field) => toggleSort(field, trajState.sortBy, trajState.sortDir, trajState.setSortBy, trajState.setSortDir),
      }}
      iterState={{
        ...iterState,
        onToggleSort: (field) => toggleSort(field, iterState.sortBy, iterState.sortDir, iterState.setSortBy, iterState.setSortDir),
      }}
      selectedTrajectory={selectedTrajectory}
      filteredTrajectories={filteredTrajectories}
      filteredIterations={filteredIterations}
      onTrajectoryClick={handleTrajectoryClick}
      onBack={handleBack}
      onIterationClick={handleIterationClick}
      onArchive={handleArchiveClick}
      onDelete={handleDeleteClick}
      showArchived={showArchived}
      onArchiveToggle={() => setShowArchived(!showArchived)}
      confirmOpen={confirmOpen}
      confirmInfo={confirmInfo}
      onConfirm={handleConfirmArchive}
      onCloseConfirm={() => { setConfirmOpen(false); setConfirmInfo(null); }}
    />
  );
};

export default TrajectoriesList;
