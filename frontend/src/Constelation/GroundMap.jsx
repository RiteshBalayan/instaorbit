import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import {
  addGroup,
  setSelectedGroup,
  toggleGroupVisibility,

} from '../Store/groupSlice';
import './GroundMap.css'

const GroupsComponent = () => {
  const dispatch = useDispatch();
  const groups = useSelector(state => state.groups.groups);
  const selectedGroup = useSelector(state => state.groups.selectedGroup);
  const [groupName, setGroupName] = useState('');
  const [editing, setEditing] = useState(false); // State to toggle editing

  const handleAddGroup = () => {
    if (groupName) {
      dispatch(addGroup(groupName));
      setGroupName('');
    }
  };

  const handleGroupSelect = (groupId) => {
    dispatch(setSelectedGroup(groupId));
    setEditing(false); // Disable editing when changing group
  };

  const handleToggleVisibility = (groupId) => {
    dispatch(toggleGroupVisibility(groupId));
  };

  const toggleEditing = () => {
    setEditing(!editing);
  };


  return (
    <div>
      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Group Name"
      />
      <button onClick={handleAddGroup}>Add Group</button>
      <div>
        {groups.map(group => (
          <div key={group.id}>
            <input
              type="radio"
              checked={selectedGroup === group.id}
              onChange={() => handleGroupSelect(group.id)}
            />
            {group.name}
            <button onClick={() => handleToggleVisibility(group.id)}>
              {group.visible ? 'Hide' : 'Show'}
            </button>
            {selectedGroup === group.id && (
              <button onClick={toggleEditing}>
                {editing ? 'Stop Editing' : 'Start Editing'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupsComponent;
