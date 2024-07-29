import React, { useRef, useState, useEffect} from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSelector } from 'react-redux';
import StackSatellites from './StackSatellites';
import { Canvas } from '@react-three/fiber';

const GlobeRender = () => {
    const earthRef = useRef();
    const lightRef = useRef();
    const sunRef = useRef();
    const torusRef = useRef();
    const torusRef2 = useRef();
    const torusRef3 = useRef();
    const texture = useLoader(THREE.TextureLoader, './00_earthmap1k.jpg');
    const starttime = useSelector((state) => state.timer.starttime)
    const elapsedTime = useSelector((state) => state.timer.elapsedTime)

    const [torusRotation1, setTorusRotation1] = useState(Math.random() * Math.PI * 2);
    const [torusRotation2, setTorusRotation2] = useState(Math.random() * Math.PI * 2);

    useEffect(() => {
      const interval = setInterval(() => {
          // Generate new random angles every second
          setTorusRotation1(Math.random() * Math.PI * 2);
          setTorusRotation2(Math.random() * Math.PI * 2);
      }, 1000); // Update every second

      return () => clearInterval(interval); // Cleanup on component unmount
  }, []);

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
            const z = radius * Math.sin((speed * elapsedTime) + (phase/24)*2*Math.PI);
            lightRef.current.position.set(x, 0, z);
            sunRef.current.position.set(x*100, 0, z*100);
        }
        if (torusRef.current) {
          torusRef.current.rotation.z = torusRotation1;
      }
      if (torusRef2.current) {
          torusRef2.current.rotation.z = torusRotation2;
      }
      if (torusRef3.current) {
        torusRef3.current.rotation.z = 1;
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

            <mesh ref={torusRef} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[2.5, 2.6, 16, 100]} />
              <meshStandardMaterial
                color="blue"
                wireframe={true}
                transparent={true}
                opacity={0.05}
                emissive="blue"
                emissiveIntensity={0.3}
              />
            </mesh>

            <mesh ref={torusRef2} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[2.6, 2.6, 16, 100, Math.PI / 10, Math.PI / 10]} />
              <meshStandardMaterial
                color="blue"
                wireframe={true}
                transparent={true}
                opacity={0.01}
                emissive="blue"
                emissiveIntensity={0.1}
              />
            </mesh>

            <mesh ref={torusRef3} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[2.7, 2.6, 16, 100]} />
              <meshStandardMaterial
                color="orange"
                wireframe={true}
                transparent={true}
                opacity={0.05}
                emissive="orange"
                emissiveIntensity={0.2}
              />
            </mesh>

            <StackSatellites />

            <OrbitControls enableZoom={true} />
        </>
    );
};

export default GlobeRender;
