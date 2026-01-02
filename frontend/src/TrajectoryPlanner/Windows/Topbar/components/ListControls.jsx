/**
 * ListControls Component
 * Unified control bar for filtering, view toggling, and sorting
 * Used by both TrajectoryList and IterationList
 */
import React from 'react';
import { FilterInput, ToggleButton, SmallIconButton, Controls } from './ListComponents.styles';

/**
 * @param {Object} props
 * @param {string} props.filter - Current filter value
 * @param {Function} props.onFilterChange - Filter change handler
 * @param {string} props.view - Current view mode ('grid' or 'list')
 * @param {Function} props.onViewChange - View change handler
 * @param {string} props.sortBy - Current sort field
 * @param {string} props.sortDir - Current sort direction
 * @param {Function} props.onSortChange - Sort change handler
 * @param {boolean} props.showArchived - Whether showing archived items (TrajectoryList only)
 * @param {Function} props.onArchiveToggle - Archive toggle handler (TrajectoryList only)
 * @param {string} props.placeholder - Placeholder text for filter input
 */
const ListControls = ({
  filter,
  onFilterChange,
  view,
  onViewChange,
  sortBy,
  sortDir,
  onSortChange,
  showArchived,
  onArchiveToggle,
  placeholder = 'Filter...',
}) => {
  return (
    <Controls>
      <FilterInput
        placeholder={placeholder}
        value={filter}
        onChange={onFilterChange}
      />
      
      <ToggleButton
        title={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
        active={view === 'grid'}
        onClick={() => onViewChange(view === 'grid' ? 'list' : 'grid')}
      >
        <span style={{ fontSize: 14 }}>{view === 'grid' ? '▦' : '▤'}</span>
        <span style={{ fontSize: 12 }}>{view === 'grid' ? 'Grid' : 'List'}</span>
      </ToggleButton>

      {showArchived !== undefined && onArchiveToggle && (
        <ToggleButton
          title={showArchived ? 'Showing archived' : 'Show archived'}
          active={showArchived}
          onClick={onArchiveToggle}
        >
          <span style={{ fontSize: 14 }}>{showArchived ? '🗂️' : '📁'}</span>
          <span style={{ fontSize: 12 }}>{showArchived ? 'Archived' : 'Active'}</span>
        </ToggleButton>
      )}

      <SmallIconButton
        title="Sort alphabetically"
        onClick={() => onSortChange('alpha')}
        style={{ borderColor: sortBy === 'alpha' ? 'rgba(143, 148, 251, 0.8)' : undefined }}
      >
        A↕
      </SmallIconButton>

      <SmallIconButton
        title="Sort by date"
        onClick={() => onSortChange('date')}
        style={{ borderColor: sortBy === 'date' ? 'rgba(143, 148, 251, 0.8)' : undefined }}
      >
        📅
      </SmallIconButton>
    </Controls>
  );
};

export default ListControls;
