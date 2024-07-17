import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import {
  addGroup,
  addLayer,
  setSelectedGroup,
  toggleGroupVisibility,
  updateLayer,
  deleteLayer,
} from '../Store/CAD/groupSlice';
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

  const onCreated = (e) => {
    const layer = e.layer.toGeoJSON();
    layer.id = e.layer._leaflet_id; // Assign a unique ID to the layer
    dispatch(addLayer({ groupId: selectedGroup, layer }));
  };

  const onEdited = (e) => {
    e.layers.eachLayer(layer => {
      const updatedLayer = layer.toGeoJSON();
      updatedLayer.id = layer._leaflet_id;
      dispatch(updateLayer({ groupId: selectedGroup, layerId: layer._leaflet_id, updatedLayer }));
    });
  };

  const onDeleted = (e) => {
    e.layers.eachLayer(layer => {
      dispatch(deleteLayer({ groupId: selectedGroup, layerId: layer._leaflet_id }));
    });
  };

  return (
    <div className='Map'>
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
      <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
          url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
        />
        {groups.map(group =>
          group.visible && (
            <FeatureGroup key={group.id}>
              {editing && selectedGroup === group.id && (
                <EditControl
                  position="topright"
                  onCreated={onCreated}
                  onEdited={onEdited}
                  onDeleted={onDeleted}
                  draw={{
                    rectangle: false,
                    circle: false,
                    marker: false,
                    polyline: false,
                  }}
                  edit={{
                    edit: {
                      selectedPathOptions: {
                        maintainColor: true,
                      },
                    },
                    remove: true,
                  }}
                />
              )}
              {group.layers.map((layer) => (
                <GeoJSON key={layer.id} data={layer} />
              ))}
            </FeatureGroup>
          )
        )}
      </MapContainer>
    </div>
  );
};

export default GroupsComponent;
