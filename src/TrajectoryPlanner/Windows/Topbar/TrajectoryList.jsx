import React, { useState, useEffect } from 'react';
import { fetchTrajectories, fetchIterations, downloadIterationState } from '../../../firebase/firebaseUtils';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { updatetrajectoryID, updateitterationID, updateitterationName } from '../../../Store/workingProject';
import { setTrajectories as setTrajectoriesAction, toggleArchive } from '../../../Store/trajectorySlice';
import { setTrajectoryArchived } from '../../../firebase/firebaseUtils';

const ListContainer = styled.div`
  font-family: 'Inter', 'Roboto', 'system-ui', sans-serif;
  font-size: 0.95rem;
  width: 100%;
  max-width: 720px; /* popup can constrain width */
  background: #17181a;
  color: #e0e3ea;
  border-radius: 8px;
  box-shadow: 0 6px 30px rgba(10,11,15,0.6);
  padding: 0.6rem;
  height: 48vh;
  overflow-y: auto;
  position: relative;
`;
const ListTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.3rem;
  color: #8f94fb;
`;
const FileList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.6rem;
  align-items: start;
  width: 100%;
  box-sizing: border-box;
`;
const FileItem = styled.li`
  background: linear-gradient(180deg, #232526 0%, #1f2124 100%);
  color: #e0e3ea;
  border-radius: 6px;
  margin-bottom: 0.35rem;
  padding: 0.45rem 0.6rem;
  cursor: pointer;
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 0.5rem;
  align-items: center;
  transition: background 0.12s, transform 0.06s;
  font-size: 0.88rem;
  border: 1px solid rgba(255,255,255,0.02);
  &:hover {
    background: #2b2f40;
    transform: translateY(-1px);
  }
`;
const FileIcon = styled.div`
  width: 28px;
  height: 28px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:6px;
  background: rgba(143,148,251,0.12);
  color: #8f94fb;
  font-size: 0.95rem;
`;
const FileMeta = styled.div`
  color: #9aa0f7;
  font-size: 0.8rem;
`;
const BackButton = styled.button`
  background: transparent;
  color: #9aa0f7;
  border: 1px solid rgba(160,160,255,0.06);
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  margin-bottom: 0.6rem;
  transition: background 0.12s, transform 0.06s;
  &:hover { background: rgba(143,148,251,0.06); transform: translateY(-2px);} 
`;

const TopBar = styled.div`
  display:flex;
  gap:0.5rem;
  align-items:center;
  justify-content:space-between;
  margin-bottom:0.35rem;
`;

const Controls = styled.div`
  display:flex;
  gap:0.5rem;
  align-items:center;
`;

const FilterInput = styled.input`
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.03);
  color: #dfe4ff;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  min-width: 120px;
`;

const ToggleButton = styled.button`
  display:inline-flex;
  align-items:center;
  gap:0.45rem;
  background: transparent;
  color: ${props => props.active ? '#0f1724' : '#cfd6ff'};
  border: 1px solid ${props => props.active ? 'rgba(143,148,251,0.9)' : 'rgba(255,255,255,0.03)'};
  padding: 0.32rem 0.55rem;
  border-radius:8px;
  cursor:pointer;
  font-size:0.85rem;
  transition: all 0.12s;
  background: ${props => props.active ? 'linear-gradient(90deg,#8f94fb,#4e54c8)' : 'transparent'};
  box-shadow: ${props => props.active ? '0 4px 14px rgba(78,84,200,0.12)' : 'none'};
`;

const SmallIconButton = styled.button`
  width:30px;
  height:30px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:6px;
  border: 1px solid rgba(255,255,255,0.03);
  background: rgba(255,255,255,0.01);
  color: ${props => props.danger ? '#ffb4b4' : '#cfd6ff'};
  cursor:pointer;
  font-size:14px;
  transition: background 0.12s, transform 0.06s;
  &:hover { background: rgba(255,255,255,0.03); transform: translateY(-1px); }
`;

const TrajCard = styled.div`
  background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
  border-radius:10px;
  padding:0.7rem;
  display:flex;
  flex-direction:column;
  gap:0.5rem;
  align-items:center;
  justify-content:center;
  text-align:center;
  min-height:110px;
  transition: transform .12s, box-shadow .12s;
  cursor:pointer;
  border: 1px solid rgba(255,255,255,0.02);
  &:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(20,22,40,0.5);} 
  width: 100%;
`;

const TrajIcon = styled.div`
  width:56px; height:56px; border-radius:12px; display:flex;align-items:center;justify-content:center;
  background: linear-gradient(135deg, rgba(143,148,251,0.12), rgba(143,148,251,0.06)); color:#9aa0f7; font-size:22px;
`;

const TrajName = styled.div`
  font-weight:600; font-size:0.9rem; color:#e8ebff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;
`;
const ErrorMsg = styled.div`
  color: #ff6b6b;
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
`;

const LoadingOverlay = styled.div`
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(180deg, rgba(8,10,16,0.6), rgba(8,10,16,0.75));
  border-radius:8px;
  z-index: 40;
`;

const Spinner = styled.div`
  width:86px;
  height:86px;
  border-radius:50%;
  background: conic-gradient(#8f94fb 0%, #4e54c8 40%, rgba(255,255,255,0.06) 41%);
  box-shadow: 0 8px 30px rgba(78,84,200,0.14);
  display:flex;
  align-items:center;
  justify-content:center;
  color: #e8ebff;
  font-weight:700;
  font-size:12px;
  transform-origin:center;
  animation: rotate 1.6s linear infinite;
  @keyframes rotate { to { transform: rotate(360deg); } }
`;

const Notice = styled.div`
  position:fixed;
  left:50%;
  transform:translateX(-50%);
  top:14px;
  z-index:12000;
  background: linear-gradient(90deg,#6f77ff,#4e54c8);
  color:#061427;
  padding:10px 14px;
  border-radius:10px;
  font-weight:700;
`;

const TrajectoriesList = ({ trajectories: propTrajectories, onClose, onLoaded }) => {
  const [trajectories, setTrajectories] = useState(propTrajectories || []);
  const [iterations, setIterations] = useState([]);
  const [selectedTrajectory, setSelectedTrajectory] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [iterView, setIterView] = useState('grid');
  const [iterFilter, setIterFilter] = useState('');
  const [iterSortBy, setIterSortBy] = useState('date');
  const [iterSortDir, setIterSortDir] = useState('desc');
  const [view, setView] = useState('grid');
  const [filter, setFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'alpha'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  useEffect(() => {
    if (propTrajectories && propTrajectories.length > 0) {
      setTrajectories(propTrajectories);
      dispatch(setTrajectoriesAction(propTrajectories));
      setError(propTrajectories.length > 0 ? null : 'No trajectories found.');
      return;
    }

    setLoading(true);
    fetchTrajectories()
      .then((data) => {
        setTrajectories(data || []);
        // also store in redux
        dispatch(setTrajectoriesAction(data || []));
        setError(data && data.length > 0 ? null : "No trajectories found.");
      })
      .catch(() => setError("Error fetching trajectories."))
      .finally(() => setLoading(false));
  }, []);

  const handleTrajectoryClick = async (trajectory) => {
    setSelectedTrajectory(trajectory);
    setLoading(true);
    try {
      const iterationData = await fetchIterations(trajectory.id);
      setIterations(iterationData || []);
      setError(iterationData && iterationData.length > 0 ? null : "No iterations found for this trajectory.");
    } catch {
      setError("Error fetching iterations.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedTrajectory(null);
    setIterations([]);
    setError(null);
  };

  const handleIterationClick = async (iterationId) => {
    if (!selectedTrajectory) {
      setError('No trajectory selected');
      return;
    }
    setLoading(true);
    setIsRestoring(true);
    const fields = ['timer','particles','CurrentState','satellites','workingProject'];
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
            default:
              break;
          }
        }
      }

      // Update working project pointers
      dispatch(updatetrajectoryID(selectedTrajectory.id));
      dispatch(updateitterationID(iterationId));
      const iter = iterations.find((i) => i.id === iterationId);
      if (iter) dispatch(updateitterationName(iter.name));
      setError(null);
      // notify parent to close popup and show notification
      if (typeof onLoaded === 'function') {
        const iterObj = iterations.find((i) => i.id === iterationId);
        const message = iterObj ? `Iteration "${iterObj.name}" of trajectory "${selectedTrajectory.name}" loaded into project` : `Iteration loaded into project`;
        onLoaded(message);
      }
    } catch (e) {
      console.error('Error restoring iteration:', e);
      setError('Error loading iteration');
    } finally {
      setLoading(false);
      setIsRestoring(false);
    }
  };

  const filteredTrajectories = trajectories.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
  // apply archive filter
  let visibleTrajectories = filteredTrajectories.filter(t => Boolean(t.archived) === Boolean(showArchived));

  // sort
  visibleTrajectories = visibleTrajectories.slice().sort((a, b) => {
    if (sortBy === 'alpha') {
      const na = (a.name || '').toLowerCase();
      const nb = (b.name || '').toLowerCase();
      if (na < nb) return sortDir === 'asc' ? -1 : 1;
      if (na > nb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    }
    // date
    const da = a.createdOnRaw ? new Date(a.createdOnRaw).getTime() : 0;
    const db = b.createdOnRaw ? new Date(b.createdOnRaw).getTime() : 0;
    if (da < db) return sortDir === 'asc' ? -1 : 1;
    if (da > db) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  return (
    <ListContainer>
      {isRestoring && (
        <LoadingOverlay>
          <Spinner>Loading</Spinner>
        </LoadingOverlay>
      )}
      <TopBar>
        <div style={{fontWeight:700,color:'#dfe4ff'}}>Trajectories</div>
        <Controls>
          <FilterInput placeholder="Filter..." value={filter} onChange={(e)=>setFilter(e.target.value)} />
          <ToggleButton
            title={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            active={view === 'grid'}
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          >
            <span style={{fontSize:14}}>{view === 'grid' ? '▦' : '▤'}</span>
            <span style={{fontSize:12}}>{view === 'grid' ? 'Grid' : 'List'}</span>
          </ToggleButton>
          <ToggleButton
            title={showArchived ? 'Showing archived' : 'Show archived'}
            active={showArchived}
            onClick={() => setShowArchived(!showArchived)}
          >
            <span style={{fontSize:14}}>{showArchived ? '🗂️' : '📁'}</span>
            <span style={{fontSize:12}}>{showArchived ? 'Archived' : 'Active'}</span>
          </ToggleButton>
          <SmallIconButton
            title="Sort alphabetically"
            onClick={() => { setSortBy('alpha'); setSortDir(sortBy === 'alpha' && sortDir === 'asc' ? 'desc' : 'asc'); }}
            style={{borderColor: sortBy === 'alpha' ? 'rgba(143,148,251,0.8)' : undefined}}
          >
            A↕
          </SmallIconButton>
          <SmallIconButton
            title="Sort by date"
            onClick={() => { setSortBy('date'); setSortDir(sortBy === 'date' && sortDir === 'desc' ? 'asc' : 'desc'); }}
            style={{borderColor: sortBy === 'date' ? 'rgba(143,148,251,0.8)' : undefined}}
          >
            📅
          </SmallIconButton>
        </Controls>
      </TopBar>

      {loading ? (
        <div style={{textAlign:'center',color:'#8f94fb',padding:'1rem 0'}}>Loading...</div>
      ) : error && !selectedTrajectory ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : selectedTrajectory ? (
        <>
          <BackButton onClick={handleBack}>&larr; Back</BackButton>
          <ListTitle>Iterations</ListTitle>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
            <FilterInput placeholder="Filter iterations..." value={iterFilter} onChange={(e)=>setIterFilter(e.target.value)} />
            <ToggleButton active={iterView === 'grid'} onClick={() => setIterView(iterView === 'grid' ? 'list' : 'grid')}>{iterView === 'grid' ? 'Grid' : 'List'}</ToggleButton>
            <SmallIconButton title="Sort alpha" onClick={() => { setIterSortBy('alpha'); setIterSortDir(iterSortBy === 'alpha' && iterSortDir === 'asc' ? 'desc' : 'asc'); }}>A↕</SmallIconButton>
            <SmallIconButton title="Sort date" onClick={() => { setIterSortBy('date'); setIterSortDir(iterSortBy === 'date' && iterSortDir === 'desc' ? 'asc' : 'desc'); }}>📅</SmallIconButton>
          </div>
          {/* compute visible iterations */}
          {(() => {
            const filtered = iterations.filter(it => it.name.toLowerCase().includes(iterFilter.toLowerCase()));
            const visible = filtered.slice().sort((a,b) => {
              if (iterSortBy === 'alpha') {
                const na = (a.name||'').toLowerCase(), nb = (b.name||'').toLowerCase();
                if (na < nb) return iterSortDir === 'asc' ? -1 : 1;
                if (na > nb) return iterSortDir === 'asc' ? 1 : -1;
                return 0;
              }
              const ta = a.timestampRaw ? new Date(a.timestampRaw).getTime() : 0;
              const tb = b.timestampRaw ? new Date(b.timestampRaw).getTime() : 0;
              if (ta < tb) return iterSortDir === 'asc' ? -1 : 1;
              if (ta > tb) return iterSortDir === 'asc' ? 1 : -1;
              return 0;
            });

            return (
              <FileList style={iterView === 'list' ? {gridTemplateColumns: '1fr'} : undefined}>
                {visible.map((itt, index) => (
                  iterView === 'list' ? (
                    <FileItem key={index} onClick={() => handleIterationClick(itt.id)} style={iterView === 'list' ? {padding:'0.25rem 0.4rem', borderRadius:6} : undefined}>
                      <FileIcon style={iterView === 'list' ? {width:20,height:20,fontSize:14} : undefined}>⏱️</FileIcon>
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <div style={{fontWeight:600}}>{itt.name}</div>
                        <FileMeta>{itt.timestamp || ''}</FileMeta>
                      </div>
                      <div style={{fontSize:'0.78rem',color:'#bfc6ff'}}>Load</div>
                    </FileItem>
                  ) : (
                    <TrajCard key={index} onClick={() => handleIterationClick(itt.id)}>
                      <TrajIcon>⏱️</TrajIcon>
                      <TrajName>{itt.name}</TrajName>
                    </TrajCard>
                  )
                ))}
              </FileList>
            );
          })()}
        </>
      ) : (
        <>
          <FileList style={view === 'list' ? {gridTemplateColumns: '1fr'} : undefined}>
            {visibleTrajectories.map((trajectory, index) => (
              view === 'list' ? (
                <FileItem key={index} onClick={() => handleTrajectoryClick(trajectory)} style={view === 'list' ? {padding:'0.25rem 0.4rem', borderRadius:6, cursor:'pointer'} : undefined}>
                  <FileIcon style={view === 'list' ? {width:20,height:20,fontSize:14} : undefined}>🚀</FileIcon>
                  <div style={{display:'flex',flexDirection:'column'}}>
                    <div style={{fontWeight:600}}>{trajectory.name}</div>
                    <FileMeta>{trajectory.createdOn ? trajectory.createdOn : ''}</FileMeta>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <SmallIconButton
                        title={trajectory.archived ? 'Restore trajectory' : 'Archive trajectory'}
                        danger={!trajectory.archived}
                        onClick={(e) => {
                          e.stopPropagation();
                          // open confirm modal instead of immediate toggle
                          setConfirmInfo({ id: trajectory.id, name: trajectory.name, archive: !Boolean(trajectory.archived) });
                          setConfirmOpen(true);
                        }}
                      >
                        {trajectory.archived ? '↩' : '🗄'}
                      </SmallIconButton>
                    </div>
                </FileItem>
              ) : (
                <TrajCard key={index} onClick={() => handleTrajectoryClick(trajectory)} style={{cursor:'pointer'}}>
                  <TrajIcon>🚀</TrajIcon>
                  <TrajName>{trajectory.name}</TrajName>
                  <div style={{display:'flex',gap:8,marginTop:6}}>
                    <SmallIconButton
                      title={trajectory.archived ? 'Restore trajectory' : 'Archive trajectory'}
                      danger={!trajectory.archived}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmInfo({ id: trajectory.id, name: trajectory.name, archive: !Boolean(trajectory.archived) });
                        setConfirmOpen(true);
                      }}
                    >
                      {trajectory.archived ? '↩' : '🗄'}
                    </SmallIconButton>
                  </div>
                </TrajCard>
              )
            ))}
          </FileList>
        </>
      )}
      {confirmOpen && confirmInfo && (
        <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000,backgroundColor:'rgba(0,0,0,0.45)'}}>
          <div style={{background:'#0f1113',padding:18,borderRadius:10,width:'min(88vw,420px)'}}>
            <div style={{color:'#e8ebff',fontWeight:700, marginBottom:10}}>Confirm</div>
            <div style={{color:'#cdd4ff',marginBottom:14}}>Are you sure you want to {confirmInfo.archive ? 'archive' : 'restore'} the trajectory "{confirmInfo.name}"?</div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button onClick={() => { setConfirmOpen(false); setConfirmInfo(null); }} style={{background:'transparent',color:'#cfd6ff',border:'1px solid rgba(255,255,255,0.03)',padding:'6px 10px',borderRadius:6}}>Cancel</button>
              <button onClick={async () => {
                const { id, archive } = confirmInfo;
                setLoading(true);
                try {
                  const ok = await setTrajectoryArchived(id, archive);
                  if (ok) {
                    dispatch(toggleArchive({ id, archived: archive }));
                    setTrajectories(prev => prev.map(p => p.id === id ? { ...p, archived: archive } : p));
                  }
                } catch (e) {
                  console.error('Archive action failed', e);
                } finally {
                  setLoading(false);
                  setConfirmOpen(false);
                  setConfirmInfo(null);
                }
              }} style={{background: confirmInfo.archive ? '#8f94fb' : '#2b8a4d', color:'#071023', padding:'6px 10px', borderRadius:6, border:'none'}}>Yes</button>
            </div>
          </div>
        </div>
      )}
    </ListContainer>
  );
};

export default TrajectoriesList;
