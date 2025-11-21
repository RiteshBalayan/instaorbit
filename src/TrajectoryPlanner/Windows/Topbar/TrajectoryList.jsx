import React, { useState, useEffect } from 'react';
import { fetchTrajectories, fetchIterations, downloadIterationState } from '../../../firebase/firebaseUtils';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { updatetrajectoryID, updateitterationID, updateitterationName } from '../../../Store/workingProject';
import { setTrajectories, toggleArchive } from '../../../Store/trajectorySlice';
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
  max-height: 70vh;
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
  padding: 0.4rem 0 0 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.6rem;
  align-items: start;
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

const ViewButton = styled.button`
  background: transparent;
  color: #cfd6ff;
  border: 1px solid rgba(255,255,255,0.03);
  padding: 0.35rem 0.6rem;
  border-radius:6px;
  cursor:pointer;
  font-size:0.85rem;
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

const TrajectoriesList = () => {
  const [trajectories, setTrajectories] = useState([]);
  const [iterations, setIterations] = useState([]);
  const [selectedTrajectory, setSelectedTrajectory] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [view, setView] = useState('grid');
  const [filter, setFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchTrajectories()
      .then((data) => {
        setTrajectories(data || []);
        // also store in redux
        dispatch(setTrajectories(data || []));
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
    } catch (e) {
      console.error('Error restoring iteration:', e);
      setError('Error loading iteration');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrajectories = trajectories.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
  // apply archive filter
  const visibleTrajectories = filteredTrajectories.filter(t => Boolean(t.archived) === Boolean(showArchived));
  return (
    <ListContainer>
      <TopBar>
        <div style={{fontWeight:700,color:'#dfe4ff'}}>Trajectories</div>
        <Controls>
          <FilterInput placeholder="Filter..." value={filter} onChange={(e)=>setFilter(e.target.value)} />
          <ViewButton onClick={() => setView(view === 'grid' ? 'list' : 'grid')}>{view === 'grid' ? 'List View' : 'Grid View'}</ViewButton>
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
          <FileList style={view === 'list' ? {gridTemplateColumns: '1fr'} : undefined}>
            {iterations.map((itt, index) => (
              view === 'list' ? (
                <FileItem key={index} onClick={() => handleIterationClick(itt.id)} style={view === 'list' ? {padding:'0.25rem 0.4rem', borderRadius:6} : undefined}>
                    <FileIcon style={view === 'list' ? {width:20,height:20,fontSize:14} : undefined}>⏱️</FileIcon>
                    <div style={{fontWeight:600}}>{itt.name}</div>
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
        </>
      ) : (
        <>
          <FileList style={view === 'list' ? {gridTemplateColumns: '1fr'} : undefined}>
            {filteredTrajectories.map((trajectory, index) => (
              view === 'list' ? (
                <FileItem key={index} onClick={() => handleTrajectoryClick(trajectory)} style={view === 'list' ? {padding:'0.25rem 0.4rem', borderRadius:6} : undefined}>
                  <FileIcon style={view === 'list' ? {width:20,height:20,fontSize:14} : undefined}>🚀</FileIcon>
                  <div style={{fontWeight:600}}>{trajectory.name}</div>
                  <div style={{fontSize:'0.78rem',color:'#bfc6ff'}}>Open</div>
                </FileItem>
              ) : (
                <TrajCard key={index} onClick={() => handleTrajectoryClick(trajectory)}>
                  <TrajIcon>🚀</TrajIcon>
                  <TrajName>{trajectory.name}</TrajName>
                </TrajCard>
              )
            ))}
          </FileList>
        </>
      )}
    </ListContainer>
  );
};

export default TrajectoriesList;
