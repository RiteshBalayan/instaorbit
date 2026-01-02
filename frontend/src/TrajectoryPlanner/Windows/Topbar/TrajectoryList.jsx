import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrajectories, fetchIterations, downloadIterationState, setTrajectoryArchived, deleteTrajectory } from '../../../firebase/firebaseUtils';
import { updatetrajectoryID, updateitterationID, updateitterationName, updatetrajectoryName } from '../../../Store/workingProject';
import { setTrajectories as setTrajectoriesAction, toggleArchive, deleteTrajectory as deleteTrajectoryAction } from '../../../Store/trajectorySlice';
import { useListState } from './hooks/useListState.js';
import { useListSorting, toggleSort } from './hooks/useListSorting.js';
import {
  ListContainer,
  ListTitle,
  FileList,
  BackButton,
  TopBar,
  ErrorMsg,
  LoadingOverlay,
  Spinner,
} from './components/ListComponents.styles';
import ListControls from './components/ListControls';
import TrajectoryCard from './components/TrajectoryCard';
import IterationCard from './components/IterationCard';
import ConfirmDialog from './components/ConfirmDialog';

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
    fetchTrajectories()
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
      const iterationData = await fetchIterations(trajectory.id);
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

  const handleIterationClick = async (iterationId) => {
    if (!selectedTrajectory) {
      iterState.setError('No trajectory selected');
      return;
    }
    iterState.setLoading(true);
    trajState.setIsRestoring(true);
    const fields = ['timer', 'particles', 'CurrentState', 'satellites', 'workingProject', 'groundStations', 'communication'];
    try {
      for (const field of fields) {
        const data = await downloadIterationState(selectedTrajectory.id, iterationId, field);
        if (data) {
          switch (field) {
            case 'timer':
              dispatch({ type: 'SET_TIMER', payload: data });
              break;
            case 'particles':
              dispatch({ type: 'SET_PARTICLES', payload: data });
              break;
            case 'CurrentState':
              dispatch({ type: 'SET_CURRENTSTATE', payload: data });
              break;
            case 'satellites':
              dispatch({ type: 'SET_SATELLITES', payload: data });
              break;
            case 'workingProject':
              dispatch({ type: 'SETworkingProject', payload: data });
              break;
            case 'groundStations':
              dispatch({ type: 'SET_GROUNDSTATIONS', payload: data });
              break;
            case 'communication':
              dispatch({ type: 'SET_COMMUNICATION', payload: data });
              break;
            default:
              break;
          }
        }
      }

      // Restore trajectory and iteration names AFTER workingProject is loaded
      // This ensures the names are not overwritten by the downloaded workingProject state
      dispatch(updatetrajectoryID(selectedTrajectory.id));
      dispatch(updatetrajectoryName(selectedTrajectory.name));
      dispatch(updateitterationID(iterationId));
      const iter = iterations.find((i) => i.id === iterationId);
      if (iter) dispatch(updateitterationName(iter.name));
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
        const ok = await deleteTrajectory(id);
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
      const ok = await setTrajectoryArchived(id, archive);
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
    <ListContainer>
      {trajState.isRestoring && (
        <LoadingOverlay>
          <Spinner>Loading</Spinner>
        </LoadingOverlay>
      )}

      <TopBar>
        <div style={{ fontWeight: 700, color: '#dfe4ff' }}>Trajectories</div>
        <ListControls
          filter={trajState.filter}
          onFilterChange={(e) => trajState.setFilter(e.target.value)}
          view={trajState.view}
          onViewChange={trajState.setView}
          sortBy={trajState.sortBy}
          sortDir={trajState.sortDir}
          onSortChange={(field) =>
            toggleSort(field, trajState.sortBy, trajState.sortDir, trajState.setSortBy, trajState.setSortDir)
          }
          showArchived={showArchived}
          onArchiveToggle={() => setShowArchived(!showArchived)}
          placeholder="Filter..."
        />
      </TopBar>

      {trajState.loading ? (
        <LoadingOverlay>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Spinner />
            <div style={{ color: '#8f94fb', fontSize: '0.95rem', fontWeight: 500 }}>
              Loading your projects...
            </div>
          </div>
        </LoadingOverlay>
      ) : trajState.error && !selectedTrajectory ? (
        <ErrorMsg>{trajState.error}</ErrorMsg>
      ) : selectedTrajectory ? (
        <>
          <BackButton onClick={handleBack}>&larr; Back</BackButton>
          <ListTitle>Iterations</ListTitle>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <ListControls
              filter={iterState.filter}
              onFilterChange={(e) => iterState.setFilter(e.target.value)}
              view={iterState.view}
              onViewChange={iterState.setView}
              sortBy={iterState.sortBy}
              sortDir={iterState.sortDir}
              onSortChange={(field) =>
                toggleSort(field, iterState.sortBy, iterState.sortDir, iterState.setSortBy, iterState.setSortDir)
              }
              placeholder="Filter iterations..."
            />
          </div>
          {iterState.loading ? (
            <LoadingOverlay>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Spinner />
                <div style={{ color: '#8f94fb', fontSize: '0.95rem', fontWeight: 500 }}>
                  Loading iterations...
                </div>
              </div>
            </LoadingOverlay>
          ) : iterState.error ? (
            <ErrorMsg>{iterState.error}</ErrorMsg>
          ) : (
            <FileList style={iterState.view === 'list' ? { gridTemplateColumns: '1fr' } : undefined}>
              {filteredIterations.map((iteration) => (
                <IterationCard
                  key={iteration.id}
                  iteration={iteration}
                  onClick={() => handleIterationClick(iteration.id)}
                  view={iterState.view}
                />
              ))}
            </FileList>
          )}
        </>
      ) : (
        <FileList style={trajState.view === 'list' ? { gridTemplateColumns: '1fr' } : undefined}>
          {filteredTrajectories.map((trajectory) => (
            <TrajectoryCard
              key={trajectory.id}
              trajectory={trajectory}
              onClick={() => handleTrajectoryClick(trajectory)}
              onArchive={handleArchiveClick}
              onDelete={handleDeleteClick}
              view={trajState.view}
            />
          ))}
        </FileList>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmInfo(null);
        }}
        onConfirm={handleConfirmArchive}
        title="Confirm"
        message={
          confirmInfo
            ? confirmInfo.action === 'delete'
              ? `Are you sure you want to permanently delete the trajectory "${confirmInfo.name}"? This action cannot be undone and will delete all iterations.`
              : `Are you sure you want to ${confirmInfo.archive ? 'archive' : 'restore'} the trajectory "${confirmInfo.name}"?`
            : ''
        }
        confirmColor={confirmInfo?.action === 'delete' ? '#e81123' : confirmInfo?.archive ? '#8f94fb' : '#2b8a4d'}
      />

      {trajState.isRestoring && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <Spinner style={{ width: '100px', height: '100px' }} />
            <div style={{ color: '#8f94fb', fontSize: '1.1rem', fontWeight: 600 }}>
              {confirmInfo?.action === 'delete' ? 'Deleting trajectory...' : 'Restoring iteration...'}
            </div>
            <div style={{ color: '#9aa0f7', fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center' }}>
              {confirmInfo?.action === 'delete' 
                ? 'Removing trajectory and all iterations from database' 
                : 'Loading state and configurations'}
            </div>
          </div>
        </div>
      )}
    </ListContainer>
  );
};

export default TrajectoriesList;
