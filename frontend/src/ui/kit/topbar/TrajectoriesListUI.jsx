import React from 'react';
import {
  ListContainer,
  ListTitle,
  FileList,
  BackButton,
  TopBar as TopBarRow,
  ErrorMsg,
  LoadingOverlay,
  Spinner,
} from './ListComponents.styles.js';
import ListControls from './ListControls.jsx';
import TrajectoryCard from './TrajectoryCard.jsx';
import IterationCard from './IterationCard.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

const TrajectoriesListUI = ({
  trajState,
  iterState,
  selectedTrajectory,
  filteredTrajectories,
  filteredIterations,
  onTrajectoryClick,
  onBack,
  onIterationClick,
  onArchive,
  onDelete,
  showArchived,
  onArchiveToggle,
  confirmOpen,
  confirmInfo,
  onConfirm,
  onCloseConfirm,
}) => {
  return (
    <ListContainer>
      {trajState.isRestoring && (
        <LoadingOverlay>
          <Spinner>Loading</Spinner>
        </LoadingOverlay>
      )}

      <TopBarRow>
        <div style={{ fontWeight: 700, color: '#dfe4ff' }}>Trajectories</div>
        <ListControls
          filter={trajState.filter}
          onFilterChange={(e) => trajState.setFilter(e.target.value)}
          view={trajState.view}
          onViewChange={trajState.setView}
          sortBy={trajState.sortBy}
          sortDir={trajState.sortDir}
          onSortChange={(field) => trajState.onToggleSort(field)}
          showArchived={showArchived}
          onArchiveToggle={onArchiveToggle}
          placeholder="Filter..."
        />
      </TopBarRow>

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
          <BackButton onClick={onBack}>&larr; Back</BackButton>
          <ListTitle>Iterations</ListTitle>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <ListControls
              filter={iterState.filter}
              onFilterChange={(e) => iterState.setFilter(e.target.value)}
              view={iterState.view}
              onViewChange={iterState.setView}
              sortBy={iterState.sortBy}
              sortDir={iterState.sortDir}
              onSortChange={(field) => iterState.onToggleSort(field)}
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
                  onClick={() => onIterationClick(iteration.id)}
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
              onClick={() => onTrajectoryClick(trajectory)}
              onArchive={onArchive}
              onDelete={onDelete}
              view={trajState.view}
            />
          ))}
        </FileList>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
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

export default TrajectoriesListUI;
