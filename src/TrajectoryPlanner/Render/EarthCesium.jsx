import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import * as Cesium from 'cesium';  // Import Cesium after Vite config change
import 'cesium/Build/Cesium/Widgets/widgets.css';  // Import Cesium styles

const EarthCesium = () => {
  const { gl, scene, camera } = useThree();  // Get WebGL renderer, scene, and camera from R3F
  const cesiumRef = useRef();

  useEffect(() => {
    // Initialize Cesium using the existing WebGL context
    const cesiumViewer = new Cesium.Viewer(cesiumRef.current, {
      contextOptions: {
        webgl: gl.getContext(),
      },
      //terrainProvider: Cesium.createWorldTerrain(),  // Add terrain tiles
      globe: true,  // Only show the globe
      sceneMode: Cesium.SceneMode.SCENE3D,
      skyBox: false,  // Remove extra bloat like skyBox
      skyAtmosphere: false,
    });

    // Adjust camera to sync with Three.js
    const { position } = camera;
    cesiumViewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(position.x, position.y, position.z),
    });

    // Cleanup Cesium when the component is unmounted
    return () => {
      if (cesiumViewer) cesiumViewer.destroy();
    };
  }, [gl, camera]);

  return (
    <>
      <mesh ref={cesiumRef} style={{ display: 'none' }} />  {/* Hidden Cesium canvas */}
    </>
  );
};

export default EarthCesium;
