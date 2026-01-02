// src/CanvasComponent.js
import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import Shape from './shape';
import ShapeList from './ShapeList';
import './cad.css';

import { useGLTF } from '@react-three/drei';

const CADModel = ({ url }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} position={[0, 1, 0]}/>;
};

const CAD = () => {
  const [shapes, setShapes] = useState([]);
  const [selectedShape, setSelectedShape] = useState(null);
  const [transformMode, setTransformMode] = useState('translate');
  const orbitRef = useRef();
  const transformRef = useRef();
  const modelUrl = '/satellite/scene.gltf';

  const addShape = (type) => {
    const newShape = {
      id: shapes.length,
      type,
      dimensions: type === 'cube' ? { width: 1, height: 1, breadth: 1 } : { radius: 1 },
      position: [0, 0, 0],
      rotation: { x: 0, y: 0, z: 0 },
    };
    setShapes([...shapes, newShape]);
  };

  const updateShape = (id, key, value) => {
    const updatedShapes = shapes.map(shape =>
      shape.id === id ? { ...shape, [key]: value } : shape
    );
    setShapes(updatedShapes);
  };

  useEffect(() => {
    const handlePointerMissed = () => setSelectedShape(null);
    window.addEventListener('pointermissed', handlePointerMissed);
    return () => window.removeEventListener('pointermissed', handlePointerMissed);
  }, []);

  return (
    <div className='cad'>
        <button onClick={() => addShape('cube')}>Add Cube</button>
        <button onClick={() => addShape('sphere')}>Add Sphere</button>
      <div className="controls">
        <button onClick={() => addShape('cube')}>Add Cube</button>
        <button onClick={() => addShape('sphere')}>Add Sphere</button>
        {selectedShape !== null && (
          <div>
            <h3>Selected Shape ID: {selectedShape}</h3>
            <input
              type="number"
              placeholder="X Position"
              value={shapes.find(shape => shape.id === selectedShape)?.position[0] || 0}
              onChange={(e) => updateShape(selectedShape, 'position', [parseFloat(e.target.value), shapes.find(shape => shape.id === selectedShape)?.position[1], shapes.find(shape => shape.id === selectedShape)?.position[2]])}
            />
            <input
              type="number"
              placeholder="Y Position"
              value={shapes.find(shape => shape.id === selectedShape)?.position[1] || 0}
              onChange={(e) => updateShape(selectedShape, 'position', [shapes.find(shape => shape.id === selectedShape)?.position[0], parseFloat(e.target.value), shapes.find(shape => shape.id === selectedShape)?.position[2]])}
            />
            <input
              type="number"
              placeholder="Z Position"
              value={shapes.find(shape => shape.id === selectedShape)?.position[2] || 0}
              onChange={(e) => updateShape(selectedShape, 'position', [shapes.find(shape => shape.id === selectedShape)?.position[0], shapes.find(shape => shape.id === selectedShape)?.position[1], parseFloat(e.target.value)])}
            />
            <input
              type="number"
              placeholder="X Rotation"
              value={shapes.find(shape => shape.id === selectedShape)?.rotation.x || 0}
              onChange={(e) => updateShape(selectedShape, 'rotation', { ...shapes.find(shape => shape.id === selectedShape)?.rotation, x: parseFloat(e.target.value) })}
            />
            <input
              type="number"
              placeholder="Y Rotation"
              value={shapes.find(shape => shape.id === selectedShape)?.rotation.y || 0}
              onChange={(e) => updateShape(selectedShape, 'rotation', { ...shapes.find(shape => shape.id === selectedShape)?.rotation, y: parseFloat(e.target.value) })}
            />
            <input
              type="number"
              placeholder="Z Rotation"
              value={shapes.find(shape => shape.id === selectedShape)?.rotation.z || 0}
              onChange={(e) => updateShape(selectedShape, 'rotation', { ...shapes.find(shape => shape.id === selectedShape)?.rotation, z: parseFloat(e.target.value) })}
            />
          </div>
        )}
        <div>
          <button onClick={() => setTransformMode('translate')}>Translate</button>
          <button onClick={() => setTransformMode('rotate')}>Rotate</button>
        </div>
      </div>
      <ShapeList shapes={shapes} selectedShape={selectedShape} setSelectedShape={setSelectedShape} />
      <Canvas onPointerMissed={() => setSelectedShape(null)} camera={{ position: [5, 5, 5], fov: 50 }} >
        <ambientLight intensity={4} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <gridHelper args={[10, 10, 'white', 'white']} />
        {shapes.map((shape) => (
          <TransformControls
            ref={transformRef}
            key={shape.id}
            mode={transformMode}
            onMouseDown={() => setSelectedShape(shape.id)}
            enabled={selectedShape === shape.id}
            onDrag={() => orbitRef.current.enabled = false}
            onDragEnd={() => orbitRef.current.enabled = true}
          >
            <Shape
              type={shape.type}
              dimensions={shape.dimensions}
              position={shape.position}
              rotation={shape.rotation}
            />
          </TransformControls>
        ))}
        <OrbitControls ref={orbitRef} />
        <CADModel url={modelUrl} />
      </Canvas>
    </div>
  );
};

export default CAD;
