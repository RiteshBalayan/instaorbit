import { useDispatch } from 'react-redux';
import { trajectoryService } from '../../../services/trajectoryService';
import { updatetrajectoryID, updateitterationID, updateitterationName, updatetrajectoryName } from '../../../Store/workingProject';

// Encapsulate the restore logic so containers can stay light
export const useIterationRestore = () => {
  const dispatch = useDispatch();

  const restoreIteration = async ({ selectedTrajectory, iterationId, iterations, fields }) => {
    if (!selectedTrajectory || !iterationId) throw new Error('Missing selected trajectory or iterationId');

    const loadFields = fields || [
      'timer',
      'particles',
      'CurrentState',
      'satellites',
      'workingProject',
      'groundStations',
      'communication',
    ];

    for (const field of loadFields) {
      const data = await trajectoryService.downloadIterationState(selectedTrajectory.id, iterationId, field);
      if (!data) continue;
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

    // Update working project pointers and names after state loads
    dispatch(updatetrajectoryID(selectedTrajectory.id));
    dispatch(updatetrajectoryName(selectedTrajectory.name));
    dispatch(updateitterationID(iterationId));
    const iterObj = iterations?.find((i) => i.id === iterationId);
    if (iterObj) dispatch(updateitterationName(iterObj.name));
  };

  return { restoreIteration };
};

export default useIterationRestore;
