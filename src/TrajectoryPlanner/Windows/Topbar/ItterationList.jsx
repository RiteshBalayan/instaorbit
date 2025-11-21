import React, { useState, useEffect } from 'react';
import { fetchIterations, downloadIterationState } from '../../../firebase/firebaseUtils';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

const ListContainer = styled.div`
  font-family: 'Inter', 'Roboto', 'system-ui', sans-serif;
  font-size: 0.85rem;
  min-width: 200px;
  max-width: 260px;
  background: #232526;
  color: #e0e3ea;
  border-radius: 6px;
  box-shadow: 0 1px 6px rgba(44,44,54,0.10);
  padding: 0.5rem 0.5rem 0.3rem 0.5rem;
  max-height: 320px;
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
const ErrorMsg = styled.div`
  color: #ff6b6b;
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
`;

const ItterationsList = () => {
  const [iterations, setIterations] = useState([]);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const TrajectoryID = useSelector((state) => state.workingProject.trajectoryID);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const iterationData = await fetchIterations(TrajectoryID);
        if (iterationData.length === 0) {
          setError('No iterations found.');
        } else {
          setIterations(iterationData);
        }
      } catch (err) {
        setError('Failed to fetch iterations.');
      }
    };

    if (TrajectoryID) {
      fetchData();
    }
  }, [TrajectoryID]);

  const handleClick = async (id) => {
    if (user) {
      setDownloading(true);
      try {
        const state = await downloadIterationState(id, user.uid);
        console.log('Downloaded iteration state:', state);
      } catch (err) {
        console.error('Failed to download iteration:', err);
      } finally {
        setDownloading(false);
      }
    } else {
      console.log('User not authenticated.');
    }
  };

  return (
    <ListContainer>
      <ListTitle>Iterations</ListTitle>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {downloading && <div style={{color:'#8f94fb',fontSize:'0.95em'}}>Loading...</div>}
      {!downloading && iterations.length > 0 && (
        <FileList>
          {iterations.map((iteration) => (
            <FileItem key={iteration.id} onClick={() => handleClick(iteration.id)}>
              <span style={{fontWeight:500}}>{iteration.name}</span>
              <span style={{marginLeft:'auto',fontSize:'0.85em',color:'#8f94fb'}}>ID: {iteration.id}</span>
            </FileItem>
          ))}
        </FileList>
      )}
      {iterations.length === 0 && !error && <div style={{color:'#b2b6c8'}}>No iterations available.</div>}
    </ListContainer>
  );
};

export default ItterationsList;
