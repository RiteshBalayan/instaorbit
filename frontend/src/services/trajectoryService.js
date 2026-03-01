// Centralized service wrapper around firebase utils for trajectory-related ops
// Keeps UI/components decoupled from data sources
import {
  fetchTrajectories as _fetchTrajectories,
  fetchIterations as _fetchIterations,
  downloadIterationState as _downloadIterationState,
  setTrajectoryArchived as _setTrajectoryArchived,
  deleteTrajectory as _deleteTrajectory,
} from '../firebase/firebaseUtils';

export const trajectoryService = {
  fetchTrajectories: () => _fetchTrajectories(),
  fetchIterations: (trajectoryId) => _fetchIterations(trajectoryId),
  downloadIterationState: (trajectoryId, iterationId, field) =>
    _downloadIterationState(trajectoryId, iterationId, field),
  setTrajectoryArchived: (trajectoryId, archived) =>
    _setTrajectoryArchived(trajectoryId, archived),
  deleteTrajectory: (trajectoryId) => _deleteTrajectory(trajectoryId),
};

export default trajectoryService;
