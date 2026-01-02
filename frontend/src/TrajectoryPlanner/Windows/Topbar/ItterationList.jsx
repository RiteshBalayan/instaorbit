import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchIterations, downloadIterationState } from '../../../firebase/firebaseUtils';
import { updatetrajectoryID, updateitterationID, updateitterationName, updatetrajectoryName } from '../../../Store/workingProject';
import { useListState } from './hooks/useListState.js';
import { useListSorting, toggleSort } from './hooks/useListSorting.js';
import {
  ListContainer,
  ListTitle,
  FileList,
  ErrorMsg,
  LoadingOverlay,
  Spinner,
} from './components/ListComponents.styles';
import ListControls from './components/ListControls';
import IterationCard from './components/IterationCard';

const ItterationsList = ({ iterations: propIterations, onLoaded, onClose }) => {
  const [iterations, setIterations] = useState(propIterations || []);
  
  const state = useListState();
  const TrajectoryID = useSelector((storeState) => storeState.workingProject.trajectoryID);
  const user = useSelector((storeState) => storeState.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const iterationData = await fetchIterations(TrajectoryID);
        if (iterationData.length === 0) {
          state.setError('No iterations found.');
          setIterations([]);
        } else {
          state.setError(null);
          setIterations(iterationData);
        }
      } catch (err) {
        state.setError('Failed to fetch iterations.');
      }
    };

    if (propIterations && propIterations.length > 0) {
      setIterations(propIterations);
    } else if (TrajectoryID) {
      fetchData();
    }
  }, [TrajectoryID, propIterations]);

  const handleLoadIteration = async (iterationId) => {
    if (!TrajectoryID) {
      state.setError('No trajectory selected.');
      return;
    }
    state.setLoading(true);
    state.setIsRestoring(true);
    const fields = ['timer', 'particles', 'CurrentState', 'satellites', 'workingProject', 'groundStations', 'communication'];
    
    // Store downloaded workingProject data to extract trajectory name
    let downloadedWorkingProject = null;
    
    try {
      for (const field of fields) {
        const data = await downloadIterationState(TrajectoryID, iterationId, field);
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
              downloadedWorkingProject = data;
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

      // Restore trajectory ID and name AFTER workingProject is loaded
      // Use trajectory name from downloaded workingProject if available, otherwise fetch it
      dispatch(updatetrajectoryID(TrajectoryID));
      
      let trajName = 'Unsaved Project';
      if (downloadedWorkingProject && downloadedWorkingProject.trajectoryName) {
        // Use trajectory name from the saved workingProject state
        trajName = downloadedWorkingProject.trajectoryName;
      } else if (typeof window !== 'undefined' && window.__TRAJECTORYS__ && window.__TRAJECTORYS__[TrajectoryID]) {
        trajName = window.__TRAJECTORYS__[TrajectoryID].name;
      } else if (iterations.length > 0 && iterations[0].trajectoryName) {
        trajName = iterations[0].trajectoryName;
      }
      dispatch(updatetrajectoryName(trajName));
      
      // Update iteration ID and name
      dispatch(updateitterationID(iterationId));
      const iterObj = iterations.find((i) => i.id === iterationId);
      if (iterObj) dispatch(updateitterationName(iterObj.name));

      if (typeof onLoaded === 'function') {
        const message = iterObj
          ? `Iteration "${iterObj.name}" of trajectory loaded into project`
          : 'Iteration loaded into project';
        onLoaded(message);
      }
      if (typeof onClose === 'function') onClose();
    } catch (e) {
      console.error('Failed to load iteration', e);
      state.setError('Failed to load iteration');
    } finally {
      state.setLoading(false);
      state.setIsRestoring(false);
    }
  };

  // Filter and sort iterations
  const filteredIterations = useListSorting(
    iterations,
    state.filter,
    state.sortBy,
    state.sortDir,
    'name',
    'timestampRaw'
  );

  return (
    <ListContainer>
      {state.isRestoring && (
        <LoadingOverlay>
          <Spinner>Loading</Spinner>
        </LoadingOverlay>
      )}
      
      <ListTitle>Iterations</ListTitle>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <ListControls
          filter={state.filter}
          onFilterChange={(e) => state.setFilter(e.target.value)}
          view={state.view}
          onViewChange={state.setView}
          sortBy={state.sortBy}
          sortDir={state.sortDir}
          onSortChange={(field) =>
            toggleSort(field, state.sortBy, state.sortDir, state.setSortBy, state.setSortDir)
          }
          placeholder="Filter iterations..."
        />
      </div>
      
      {state.error && <ErrorMsg>{state.error}</ErrorMsg>}
      {state.loading && <div style={{ color: '#8f94fb', fontSize: '0.95em' }}>Loading...</div>}
      
      {!state.loading && filteredIterations.length > 0 && (
        <FileList style={state.view === 'list' ? { gridTemplateColumns: '1fr' } : undefined}>
          {filteredIterations.map((iteration) => (
            <IterationCard
              key={iteration.id}
              iteration={iteration}
              onClick={() => handleLoadIteration(iteration.id)}
              view={state.view}
            />
          ))}
        </FileList>
      )}
      
      {filteredIterations.length === 0 && !state.error && (
        <div style={{ color: '#b2b6c8' }}>No iterations available.</div>
      )}
    </ListContainer>
  );
};

export default ItterationsList;
