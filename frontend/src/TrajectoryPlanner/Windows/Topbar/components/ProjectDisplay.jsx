import React, { useState } from 'react';
import { ProjectWrapper, ProjectLabel, ProjectTitle } from '../TopBar.styles';
import ProjectInfoModal from './ProjectInfoModal';

/**
 * Component to display the current project name
 * @param {string} projectName - The name of the current project
 */
const ProjectDisplay = ({ projectName }) => {
  const [showModal, setShowModal] = useState(false);
  const fullName = projectName || 'Untitled';
  const displayed = fullName.length > 50 ? fullName.slice(0, 50) + '…' : fullName;

  return (
    <>
      <ProjectWrapper 
        onClick={() => setShowModal(true)}
        style={{ cursor: 'pointer' }}
        title="Click to view project details"
      >
        <ProjectLabel>Project</ProjectLabel>
        <ProjectTitle title={fullName}>
          {displayed}
          <span style={{ 
            marginLeft: '6px', 
            fontSize: '0.85rem', 
            opacity: 0.6,
            transition: 'opacity 0.2s'
          }}>ℹ️</span>
        </ProjectTitle>
      </ProjectWrapper>
      
      <ProjectInfoModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
};

export default ProjectDisplay;
