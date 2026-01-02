/**
 * TrajectoryCard Component
 * Displays a single trajectory in grid or list view with latest iteration thumbnail
 */
import React from 'react';
import {
  TrajCard,
  TrajIcon,
  TrajName,
  FileItem,
  FileIcon,
  FileMeta,
  SmallIconButton,
} from './ListComponents.styles';

const ThumbnailImage = ({ src, alt }) => {
  const [error, setError] = React.useState(false);
  
  if (!src || error) {
    return '🚀';
  }
  
  return (
    <img 
      src={src} 
      alt={alt}
      onError={(e) => {
        console.error('Failed to load trajectory thumbnail:', e);
        setError(true);
      }}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '6px',
      }}
    />
  );
};

/**
 * @param {Object} props
 * @param {Object} props.trajectory - Trajectory object with name, createdOn, thumbnail, etc.
 * @param {Function} props.onClick - Click handler for loading trajectory
 * @param {Function} props.onArchive - Archive/restore handler
 * @param {Function} props.onDelete - Delete handler
 * @param {string} props.view - View mode ('grid' or 'list')
 */
const TrajectoryCard = ({ trajectory, onClick, onArchive, onDelete, view }) => {
  if (view === 'list') {
    return (
      <FileItem
        onClick={onClick}
        style={{ padding: '0.25rem 0.4rem', borderRadius: 6, cursor: 'pointer' }}
      >
        <FileIcon style={{ width: 40, height: 40, fontSize: 14 }}>
          {trajectory.thumbnail ? (
            <ThumbnailImage src={trajectory.thumbnail} alt={trajectory.name} />
          ) : (
            '🚀'
          )}
        </FileIcon>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600 }}>{trajectory.name}</div>
          <FileMeta>{trajectory.createdOn || ''}</FileMeta>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <SmallIconButton
            title={trajectory.archived ? 'Restore trajectory' : 'Archive trajectory'}
            danger={!trajectory.archived}
            onClick={(e) => {
              e.stopPropagation();
              onArchive(trajectory);
            }}
          >
            {trajectory.archived ? '↩' : '🗄'}
          </SmallIconButton>
          <SmallIconButton
            title="Delete trajectory permanently"
            danger
            onClick={(e) => {
              e.stopPropagation();
              onDelete(trajectory);
            }}
          >
            🗑️
          </SmallIconButton>
        </div>
      </FileItem>
    );
  }

  // Grid view
  return (
    <TrajCard onClick={onClick} style={{ cursor: 'pointer' }}>
      <TrajIcon style={{ height: '80px' }}>
        {trajectory.thumbnail ? (
          <ThumbnailImage src={trajectory.thumbnail} alt={trajectory.name} />
        ) : (
          '🚀'
        )}
      </TrajIcon>
      <TrajName>{trajectory.name}</TrajName>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <SmallIconButton
          title={trajectory.archived ? 'Restore trajectory' : 'Archive trajectory'}
          danger={!trajectory.archived}
          onClick={(e) => {
            e.stopPropagation();
            onArchive(trajectory);
          }}
        >
          {trajectory.archived ? '↩' : '🗄'}
        </SmallIconButton>
        <SmallIconButton
          title="Delete trajectory permanently"
          danger
          onClick={(e) => {
            e.stopPropagation();
            onDelete(trajectory);
          }}
        >
          🗑️
        </SmallIconButton>
      </div>
    </TrajCard>
  );
};

export default TrajectoryCard;
