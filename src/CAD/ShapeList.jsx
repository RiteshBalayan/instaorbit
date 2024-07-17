import React from 'react';




const ShapeList = ({ shapes, selectedShape, setSelectedShape }) => {
    return (
      <div className="shape-list">
        <h3>Shapes</h3>
        {shapes.map((shape) => (
          <div key={shape.id}>
            <input
              type="checkbox"
              checked={selectedShape === shape.id}
              onChange={() => setSelectedShape(shape.id)}
            />
            {shape.type} (ID: {shape.id})
          </div>
        ))}
      </div>
    );
  };

  export default ShapeList;