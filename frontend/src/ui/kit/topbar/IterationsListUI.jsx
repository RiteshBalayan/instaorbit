import React from 'react';
import {
  ListContainer,
  ListTitle,
  FileList,
  ErrorMsg,
  LoadingOverlay,
  Spinner,
} from './ListComponents.styles.js';
import ListControls from './ListControls.jsx';
import IterationCard from './IterationCard.jsx';

const IterationsListUI = ({ state, filteredIterations, onLoadIteration }) => {
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
          onSortChange={(field) => state.onToggleSort(field)}
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
              onClick={() => onLoadIteration(iteration.id)}
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

export default IterationsListUI;
