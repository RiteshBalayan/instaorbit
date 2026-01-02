import React from 'react';
import {
  TrajCard,
  TrajIcon,
  TrajName,
  FileItem,
  FileIcon,
  FileMeta,
  SmallIconButton,
} from './ListComponents.styles.js';

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
