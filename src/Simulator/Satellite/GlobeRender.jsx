import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SatelliteRender from './SatelliteRender';
import { useSelector } from 'react-redux';

const GlobeRender = ({ elapsedTime }) => {
    const earthRef = useRef();
    const lightRef = useRef();
    const sunRef = useRef();
    const texture = useLoader(THREE.TextureLoader, './00_earthmap1k.jpg');
    const starttime = useSelector((state) => state.timer.starttime)

    //Get sun direction initial condition
    const initialtime = new Date(starttime);
    initialtime.setHours(0, 0, 0, 0);

    const phase = (starttime - initialtime)/(1000*60*60)
    console.log(phase)


    useFrame(() => {
        if (earthRef.current) {
            earthRef.current.rotation.y += 0.000;
        }
        if (lightRef.current && sunRef.current) {
            const radius = 5;
            const speed = (2 * Math.PI) / (24 * 60 * 60); // Adjust the speed of revolution
            const x = radius * Math.cos((speed * elapsedTime) + (phase/24)*2*Math.PI);
            const z = radius * Math.sin((speed * elapsedTime) + (phase/24)*2*Math.PI);
            lightRef.current.position.set(x, 0, z);
            sunRef.current.position.set(x*100, 0, z*100);
        }
    });

    return (
        <>
            <ambientLight intensity={0.1} />
            <directionalLight ref={lightRef} position={[5, 0, 5]} />
            <Stars radius={300} depth={50} count={20000} factor={7} saturation={0} fade speed={1} />
            
            <mesh ref={earthRef}>
                <sphereGeometry args={[2, 32, 32]} />
                <meshStandardMaterial map={texture} />
            </mesh>

            <mesh ref={sunRef}>
                <sphereGeometry args={[10, 32, 32]} />
                <meshStandardMaterial color="yellow" emissive="yellow" />
            </mesh>

            <SatelliteRender elapsedTime={elapsedTime} />

            <OrbitControls enableZoom={true} />
        </>
    );
};

export default GlobeRender;
