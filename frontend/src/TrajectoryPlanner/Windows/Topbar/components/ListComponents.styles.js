/**
 * Shared styled components for TrajectoryList and IterationList
 * Contains all common UI elements used in list views
 */
import styled from 'styled-components';

export const ListContainer = styled.div`
  font-family: 'Inter', 'Roboto', 'system-ui', sans-serif;
  font-size: 0.95rem;
  width: 100%;
  max-width: 720px;
  background: #17181a;
  color: #e0e3ea;
  border-radius: 8px;
  box-shadow: 0 6px 30px rgba(10, 11, 15, 0.6);
  padding: 0.6rem;
  height: 48vh;
  overflow-y: auto;
  position: relative;
`;

export const ListTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.3rem;
  color: #8f94fb;
`;

export const FileList = styled.ul`
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

export const FileItem = styled.li`
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
  border: 1px solid rgba(255, 255, 255, 0.02);
  &:hover {
    background: #2b2f40;
    transform: translateY(-1px);
  }
`;

export const FileIcon = styled.div`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(143, 148, 251, 0.12);
  color: #8f94fb;
  font-size: 0.95rem;
`;

export const FileMeta = styled.div`
  color: #9aa0f7;
  font-size: 0.8rem;
`;

export const BackButton = styled.button`
  background: transparent;
  color: #9aa0f7;
  border: 1px solid rgba(160, 160, 255, 0.06);
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  margin-bottom: 0.6rem;
  transition: background 0.12s, transform 0.06s;
  &:hover {
    background: rgba(143, 148, 251, 0.06);
    transform: translateY(-2px);
  }
`;

export const TopBar = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
`;

export const Controls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

export const FilterInput = styled.input`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  color: #dfe4ff;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  min-width: 120px;
  font-size: 0.85rem;
  &:focus {
    outline: none;
    border-color: rgba(143, 148, 251, 0.3);
  }
`;

export const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: ${props => props.active ? 'linear-gradient(90deg, #8f94fb, #4e54c8)' : 'transparent'};
  color: ${props => props.active ? '#0f1724' : '#cfd6ff'};
  border: 1px solid ${props => props.active ? 'rgba(143, 148, 251, 0.9)' : 'rgba(255, 255, 255, 0.03)'};
  padding: 0.32rem 0.55rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.12s;
  box-shadow: ${props => props.active ? '0 4px 14px rgba(78, 84, 200, 0.12)' : 'none'};
  &:hover {
    background: ${props => props.active ? 'linear-gradient(90deg, #8f94fb, #4e54c8)' : 'rgba(255, 255, 255, 0.02)'};
  }
`;

export const SmallIconButton = styled.button`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.03);
  background: rgba(255, 255, 255, 0.01);
  color: ${props => props.danger ? '#ffb4b4' : '#cfd6ff'};
  cursor: pointer;
  font-size: 14px;
  transition: background 0.12s, transform 0.06s;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
    transform: translateY(-1px);
  }
`;

export const TrajCard = styled.div`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
  border-radius: 10px;
  padding: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 110px;
  transition: transform 0.12s, box-shadow 0.12s;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.02);
  width: 100%;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(20, 22, 40, 0.5);
  }
`;

export const TrajIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(143, 148, 251, 0.12), rgba(143, 148, 251, 0.06));
  color: #9aa0f7;
  font-size: 22px;
`;

export const TrajName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: #e8ebff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

export const ErrorMsg = styled.div`
  color: #ff6b6b;
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
`;

export const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(8, 10, 16, 0.6), rgba(8, 10, 16, 0.75));
  border-radius: 8px;
  z-index: 40;
`;

export const Spinner = styled.div`
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: conic-gradient(#8f94fb 0%, #4e54c8 40%, rgba(255, 255, 255, 0.06) 41%);
  box-shadow: 0 8px 30px rgba(78, 84, 200, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e8ebff;
  font-weight: 700;
  font-size: 12px;
  transform-origin: center;
  animation: rotate 1.6s linear infinite;
  @keyframes rotate {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const Notice = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: 14px;
  z-index: 12000;
  background: linear-gradient(90deg, #6f77ff, #4e54c8);
  color: #061427;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 700;
`;
