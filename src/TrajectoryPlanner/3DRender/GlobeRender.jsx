import React, { useRef, useEffect } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useSelector } from 'react-redux';
import StackSatellites from './StackSatellites';
import VonAllenBelt from './VonAllenBelt';

// Y axis Points towards north Pole
const GlobeRender = () => {
    const earthRef = useRef();
    const lightRef = useRef();
    const sunRef = useRef();
    const texture = useLoader(THREE.TextureLoader, '/00_earthmap1k.jpg');
    const starttime = useSelector((state) => state.timer.starttime);
    const elapsedTime = useSelector((state) => state.timer.elapsedTime);
    const view = useSelector((state) => state.view);

    //Get sun direction initial condition
    const initialtime = new Date(starttime);
    initialtime.setHours(0, 0, 0, 0);

    const phase = (starttime - initialtime)/(1000*60*60)

    useFrame(() => {
        if (earthRef.current) {
            earthRef.current.rotation.y += 0.000;
        }
        if (lightRef.current && sunRef.current) {
            const radius = 5;
            const speed = (2 * Math.PI) / (24 * 60 * 60); // Adjust the speed of revolution
            const x = radius * Math.cos((speed * elapsedTime) + (phase/24)*2*Math.PI);
            const y = radius * Math.sin((speed * elapsedTime) + (phase/24)*2*Math.PI);
            lightRef.current.position.set(x, y, 0);
            sunRef.current.position.set(x*100, y*100, 0);
        }
    });


    return (
          <>
            <ambientLight intensity={0.1} />
            <directionalLight ref={lightRef} position={[5, 0, 5]} intensity={2}/>
            <Stars radius={300} depth={50} count={20000} factor={7} saturation={0} fade speed={1} /> 

            <mesh ref={earthRef} rotation={[Math.PI/2, 0, 0]}>
                <sphereGeometry args={[2, 32, 32]} />
                <meshStandardMaterial map={texture} />
            </mesh>

            <mesh ref={sunRef}>
                <sphereGeometry args={[10, 32, 32]} />
                <meshStandardMaterial color="yellow" emissive="yellow" />
            </mesh>

            <StackSatellites />

            { view.Grid &&
              <gridHelper
              args={[100, 100, 'grey', 'grey']}
              rotation={[Math.PI/2, 0, 0]} // Grid size, divisions, color for lines, color for center lines
            />}
            {view.VonAllenBelt && <VonAllenBelt />}
            {view.Axis && <axesHelper args={[5]} />}
            <OrbitControls />
            <PerspectiveCamera
            makeDefault
            position={[5, 0, 0]}
            up={[0, 0, 1]} 
          />
        </>
    );
};

export default GlobeRender;
