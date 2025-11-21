import React, { useState, useEffect } from 'react';
import { fetchIterations, downloadIterationState } from '../../../firebase/firebaseUtils';
import { useSelector, useDispatch } from 'react-redux';
import { updatetrajectoryID, updateitterationID, updateitterationName } from '../../../Store/workingProject';
import styled from 'styled-components';

const ListContainer = styled.div`
  font-family: 'Inter', 'Roboto', 'system-ui', sans-serif;
  font-size: 0.85rem;
  width: 100%;
  min-width: 240px;
  max-width: 720px;
  background: #232526;
  color: #e0e3ea;
  border-radius: 6px;
  box-shadow: 0 1px 6px rgba(44,44,54,0.10);
  padding: 0.5rem 0.5rem 0.3rem 0.5rem;
  height: 48vh;
  overflow-y: auto;
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
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
`;
const FileItem = styled.li`
  background: #232526;
  color: #e0e3ea;
  border-radius: 4px;
  margin-bottom: 0.15rem;
  padding: 0.28rem 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background 0.12s;
  font-size: 0.85rem;
  &:hover {
    background: #353a4d;
    color: #fff;
  }
`;

const TrajCard = styled.div`
  background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
  border-radius:8px;
  padding:0.6rem 0.6rem;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  gap:0.4rem;
  min-height:110px;
  cursor:pointer;
  border: 1px solid rgba(255,255,255,0.03);
  width:100%;
`;

const TrajIcon = styled.div`
  width:56px;
  height:56px;
  border-radius:10px;
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(135deg, rgba(143,148,251,0.12), rgba(143,148,251,0.06));
  color:#9aa0f7;
  font-size:20px;
`;

const TrajName = styled.div`
  font-weight:600;
  color:#e8ebff;
  font-size:0.9rem;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  width:100%;
`;
const ErrorMsg = styled.div`
  color: #ff6b6b;
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
`;

const FilterInput = styled.input`
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.03);
  color: #dfe4ff;
  padding: 0.28rem 0.4rem;
  border-radius: 6px;
  min-width: 120px;
`;

const ToggleButton = styled.button`
  display:inline-flex;
  align-items:center;
  gap:0.4rem;
  background: transparent;
  color: #cfd6ff;
  border: 1px solid rgba(255,255,255,0.03);
  padding: 0.28rem 0.45rem;
  border-radius:6px;
  cursor:pointer;
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
  color: #cfd6ff;
  cursor:pointer;
  font-size:14px;
  transition: background 0.12s, transform 0.06s;
  &:hover { background: rgba(255,255,255,0.03); transform: translateY(-1px); }
`;

const ItterationsList = ({ iterations: propIterations, onLoaded, onClose }) => {
  const [iterations, setIterations] = useState(propIterations || []);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState('list');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [isRestoring, setIsRestoring] = useState(false);

  const TrajectoryID = useSelector((state) => state.workingProject.trajectoryID);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    // if props provide iterations, use them; otherwise fetch from Firestore using TrajectoryID
    const fetchData = async () => {
      try {
        const iterationData = await fetchIterations(TrajectoryID);
        if (iterationData.length === 0) {
          setError('No iterations found.');
          setIterations([]);
        } else {
          setError(null);
          setIterations(iterationData);
        }
      } catch (err) {
        setError('Failed to fetch iterations.');
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
      setError('No trajectory selected.');
      return;
    }
    setDownloading(true);
    setIsRestoring(true);
    const fields = ['timer','particles','CurrentState','satellites','workingProject'];
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
              dispatch({ type: 'SETworkingProject', payload: data });
              break;
            default:
              break;
          }
        }
      }

      dispatch(updatetrajectoryID(TrajectoryID));
      dispatch(updateitterationID(iterationId));
      const iterObj = iterations.find(i => i.id === iterationId);
      if (iterObj) dispatch(updateitterationName(iterObj.name));

      if (typeof onLoaded === 'function') {
        const message = iterObj ? `Iteration "${iterObj.name}" of trajectory loaded into project` : 'Iteration loaded into project';
        onLoaded(message);
      }
      if (typeof onClose === 'function') onClose();
    } catch (e) {
      console.error('Failed to load iteration', e);
      setError('Failed to load iteration');
    } finally {
      setDownloading(false);
      setIsRestoring(false);
    }
  };

  // filtering and sorting
  const filtered = iterations.filter(it => it.name.toLowerCase().includes(filter.toLowerCase()));
  let visible = filtered.slice().sort((a,b) => {
    if (sortBy === 'alpha') {
      const na = (a.name||'').toLowerCase(), nb = (b.name||'').toLowerCase();
      if (na < nb) return sortDir === 'asc' ? -1 : 1;
      if (na > nb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    }
    const ta = a.timestampRaw ? new Date(a.timestampRaw).getTime() : 0;
    const tb = b.timestampRaw ? new Date(b.timestampRaw).getTime() : 0;
    if (ta < tb) return sortDir === 'asc' ? -1 : 1;
    if (ta > tb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <ListContainer>
      {isRestoring && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.45)',zIndex:40}}>
          <div style={{width:86,height:86,borderRadius:999,background:'conic-gradient(#8f94fb,#4e54c8)',display:'flex',alignItems:'center',justifyContent:'center',color:'#e8ebff',fontWeight:700}}>Loading</div>
        </div>
      )}
      <ListTitle>Iterations</ListTitle>
      <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
        <FilterInput placeholder="Filter iterations..." value={filter} onChange={e => setFilter(e.target.value)} />
        <SmallIconButton title="Sort alpha" onClick={() => { setSortBy('alpha'); setSortDir(sortBy === 'alpha' && sortDir === 'asc' ? 'desc' : 'asc'); }}>A↕</SmallIconButton>
        <SmallIconButton title="Sort date" onClick={() => { setSortBy('date'); setSortDir(sortBy === 'date' && sortDir === 'desc' ? 'asc' : 'desc'); }}>📅</SmallIconButton>
        <ToggleButton active={view === 'list'} onClick={() => setView(view === 'list' ? 'grid' : 'list')}>{view === 'list' ? 'List' : 'Grid'}</ToggleButton>
      </div>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {downloading && <div style={{color:'#8f94fb',fontSize:'0.95em'}}>Loading...</div>}
      {!downloading && visible.length > 0 && (
        <FileList style={view === 'list' ? {gridTemplateColumns: '1fr'} : undefined}>
          {visible.map(it => (
            view === 'list' ? (
              <FileItem key={it.id} onClick={() => handleLoadIteration(it.id)} style={{display:'flex',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <TrajIcon style={{width:20,height:20,fontSize:12,borderRadius:6}}>⏱️</TrajIcon>
                  <div style={{fontWeight:600}}>{it.name}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <SmallIconButton title="Load">▶</SmallIconButton>
                </div>
              </FileItem>
            ) : (
              <TrajCard key={it.id} onClick={() => handleLoadIteration(it.id)}>
                <TrajIcon>⏱️</TrajIcon>
                <TrajName>{it.name}</TrajName>
              </TrajCard>
            )
          ))}
        </FileList>
      )}
      {visible.length === 0 && !error && <div style={{color:'#b2b6c8'}}>No iterations available.</div>}
    </ListContainer>
  );
};

export default ItterationsList;
