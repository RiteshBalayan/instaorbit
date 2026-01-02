/**
 * IterationCard Component
 * Displays a single iteration in grid or list view with thumbnail support
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
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        borderRadius: '8px',
      }}>
        ⏱️
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt}
      onError={(e) => {
        console.error('Failed to load thumbnail:', e);
        setError(true);
      }}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '8px',
      }}
    />
  );
};

const PlaceholderIcon = () => (
  <div style={{
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
    borderRadius: '8px',
  }}>
    ⏱️
  </div>
);

/**
 * @param {Object} props
 * @param {Object} props.iteration - Iteration object with name, timestamp, thumbnail, etc.
 * @param {Function} props.onClick - Click handler for loading iteration
 * @param {string} props.view - View mode ('grid' or 'list')
 */
const IterationCard = ({ iteration, onClick, view }) => {
  if (view === 'list') {
    return (
      <FileItem
        onClick={onClick}
        style={{ display: 'flex', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {iteration.thumbnail ? (
            <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden' }}>
              <ThumbnailImage src={iteration.thumbnail} alt={iteration.name} />
            </div>
          ) : (
            <TrajIcon style={{ width: 40, height: 40, fontSize: 16, borderRadius: 6 }}>⏱️</TrajIcon>
          )}
          <div style={{ fontWeight: 600 }}>{iteration.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FileMeta>{iteration.timestamp || ''}</FileMeta>
        </div>
      </FileItem>
    );
  }

  // Grid view
  return (
    <TrajCard onClick={onClick}>
      {iteration.thumbnail ? (
        <div style={{ width: '100%', height: 80, marginBottom: 8 }}>
          <ThumbnailImage src={iteration.thumbnail} alt={iteration.name} />
        </div>
      ) : (
        <div style={{ width: '100%', height: 80, marginBottom: 8 }}>
          <PlaceholderIcon />
        </div>
      )}
      <TrajName>{iteration.name}</TrajName>
    </TrajCard>
  );
};

export default IterationCard;
