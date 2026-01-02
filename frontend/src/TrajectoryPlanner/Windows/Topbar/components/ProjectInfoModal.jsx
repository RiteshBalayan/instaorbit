/**
 * ProjectInfoModal Component
 * Displays detailed information about the current project when user clicks on project name
 */
import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { auth } from '../../../../firebase/firebase';

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: linear-gradient(180deg, #1a1b1e 0%, #232526 100%);
  border-radius: 16px;
  padding: 1.8rem;
  width: min(90vw, 480px);
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(143, 148, 251, 0.2);
  animation: slideUp 0.3s ease;
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(143, 148, 251, 0.15);
`;

const ModalTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: #e8ebff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #9aa0f7;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: rgba(143, 148, 251, 0.1);
    color: #e8ebff;
  }
`;

const InfoSection = styled.div`
  margin-bottom: 1.2rem;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8f94fb;
  font-weight: 600;
  margin-bottom: 0.4rem;
`;

const InfoValue = styled.div`
  font-size: 1rem;
  color: #dfe4ff;
  font-weight: 500;
  word-break: break-word;
  background: rgba(143, 148, 251, 0.06);
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  border: 1px solid rgba(143, 148, 251, 0.1);
`;

const UserBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(90deg, rgba(143, 148, 251, 0.15), rgba(78, 84, 200, 0.15));
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
  border: 1px solid rgba(143, 148, 251, 0.2);
  color: #e8ebff;
  font-weight: 500;
`;

const UserAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8f94fb, #4e54c8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
`;

const StatusBadge = styled.div`
  display: inline-block;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => props.saved 
    ? 'linear-gradient(90deg, rgba(46, 213, 115, 0.15), rgba(39, 174, 96, 0.15))' 
    : 'linear-gradient(90deg, rgba(255, 159, 64, 0.15), rgba(255, 107, 107, 0.15))'};
  color: ${props => props.saved ? '#5fdf8f' : '#ffa570'};
  border: 1px solid ${props => props.saved ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 159, 64, 0.3)'};
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(143, 148, 251, 0.2), transparent);
  margin: 1.5rem 0;
`;

const IconWrapper = styled.span`
  font-size: 1.2rem;
`;

const ProjectInfoModal = ({ isOpen, onClose }) => {
  const workingProject = useSelector((state) => state.workingProject);
  const user = auth.currentUser;
  const timer = useSelector((state) => state.timer);

  if (!isOpen) return null;

  const {
    trajectoryName,
    trajectoryID,
    itterationName,
    itterationID,
  } = workingProject;

  // Calculate time information
  const currentDate = new Date();
  const timeDisplay = timer?.starttime 
    ? new Date(timer.starttime).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Not available';

  // Calculate elapsed time display
  const elapsedSeconds = timer?.elapsedTime || 0;
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const elapsedDisplay = `${hours}h ${minutes}m ${seconds}s`;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <IconWrapper>📊</IconWrapper>
            Project Details
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            ×
          </CloseButton>
        </ModalHeader>

        <InfoSection>
          <InfoLabel>🚀 Trajectory Name</InfoLabel>
          <InfoValue>{trajectoryName || 'Unsaved Project'}</InfoValue>
        </InfoSection>

        <InfoSection>
          <InfoLabel>⏱️ Current Iteration</InfoLabel>
          <InfoValue>{itterationName || 'Initial commit'}</InfoValue>
        </InfoSection>

        <Divider />

        <InfoSection>
          <InfoLabel>🆔 Trajectory ID</InfoLabel>
          <InfoValue style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
            {trajectoryID || 'Not saved yet'}
          </InfoValue>
        </InfoSection>

        <InfoSection>
          <InfoLabel>🔖 Iteration ID</InfoLabel>
          <InfoValue style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
            {itterationID || 'Not saved yet'}
          </InfoValue>
        </InfoSection>

        <Divider />

        <InfoSection>
          <InfoLabel>💾 Save Status</InfoLabel>
          <StatusBadge saved={!!trajectoryID && !!itterationID}>
            {trajectoryID && itterationID ? '✓ Saved to Cloud' : '⚠ Not Saved'}
          </StatusBadge>
        </InfoSection>

        <InfoSection>
          <InfoLabel>🕐 Simulation Start Time</InfoLabel>
          <InfoValue>{timeDisplay}</InfoValue>
        </InfoSection>

        <InfoSection>
          <InfoLabel>⏳ Elapsed Simulation Time</InfoLabel>
          <InfoValue>{elapsedDisplay}</InfoValue>
        </InfoSection>

        <Divider />

        <InfoSection>
          <InfoLabel>👤 User Account</InfoLabel>
          {user ? (
            <UserBadge>
              <UserAvatar>{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</UserAvatar>
              <div>
                <div>{user.displayName || 'User'}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{user.email}</div>
              </div>
            </UserBadge>
          ) : (
            <InfoValue>Not logged in</InfoValue>
          )}
        </InfoSection>

        <InfoSection>
          <InfoLabel>📅 Current Date</InfoLabel>
          <InfoValue>
            {currentDate.toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </InfoValue>
        </InfoSection>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ProjectInfoModal;
