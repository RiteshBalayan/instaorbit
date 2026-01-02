import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import StackSatellites from './StackSatellites';
import VonAllenBelt from './VonAllenBelt';
import { useLoader } from '@react-three/fiber';
import SimuStackSatellites from '../Simulation/StackSimulator';
import { toggleCentralObject } from '../../Store/View';
import { Line } from '@react-three/drei';
import GroundStationRender from './GroundStationRender';

// Vertex Shader for Glow
const vertexShader = `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Fragment Shader for Glow
const fragmentShader = `
    uniform float c;
    uniform float p;
    varying vec3 vNormal;
    void main() {
        float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
        gl_FragColor = vec4(0.0, 0.5, 1.0, 0.2) * intensity; // Blue glow with low intensity
    }
`;

// Vertex Shader for Sun Surface
const sunVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Fragment Shader for Sun Surface
const sunFragmentShader = `
    uniform float time;
    varying vec2 vUv;
    void main() {
        vec2 uv = vUv;
        uv.y += time * 0.01;
        vec3 color = vec3(1.0, 0.5 + 0.5 * sin(uv.y * 10.0 + time * 2.0), 0.0);
        gl_FragColor = vec4(color, 1.0);
    }
`;


const GlobeRender = () => {
    const earthRef = useRef();
    const lightRef = useRef();
    const sunRef = useRef();
    const haloRef = useRef();
    const texture = useLoader(THREE.TextureLoader, '/8081_earthmap10k.jpg');
    const nightTexture = useLoader(THREE.TextureLoader, '/8081_earthlights10k.jpg');
    const cloudsTexture = useLoader(THREE.TextureLoader, '/earthcloudmap.jpg');
    const starttime = useSelector((state) => state.timer.starttime);
    const elapsedTime = useSelector((state) => state.timer.RenderTime);
    const view = useSelector((state) => state.view);
    const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
    const cameraRef = useRef();
    const dispatch = useDispatch();
    const activeLinks = useSelector((state) => state.communication.activeLinks);

    // Get sun direction initial condition
    const initialtime = new Date(starttime);
    initialtime.setHours(0, 0, 0, 0);
    const phase = (starttime - initialtime) / (1000 * 60 * 60);

    const { clock } = useThree();

    useFrame(() => {
        if (earthRef.current) {
            // Earth rotates once per 24 hours = 86400 seconds
            // Angular velocity = 2π / 86400 radians per second
            const earthRotationRate = (2 * Math.PI) / (24 * 60 * 60); // radians per second
            if (referenceSystem === 'EarthInertial') {
                // EarthInertial: Non-rotating reference frame
                // Earth mesh rotates to show day/night cycle
                earthRef.current.rotation.y = earthRotationRate * elapsedTime;
            } else {
                // EarthFixed: Rotating reference frame (rotates with Earth)
                // Earth mesh appears stationary because frame rotates with it
                earthRef.current.rotation.y = 0;
            }
        }
        if (lightRef.current && sunRef.current && haloRef.current) {
            
                const radius = 5;
                let speed = 0;
                if (referenceSystem === 'EarthFixed') {
                    // In EarthFixed frame, sun appears to orbit Earth
                    // (actually the frame is rotating, making sun appear to move)
                    speed = (2 * Math.PI) / (24 * 60 * 60);
                }
                // In EarthInertial frame, sun stays at fixed position based on time of day (phase)
                const x = radius * Math.cos((-speed * elapsedTime) + (phase / 24) * 2 * Math.PI);
                const y = radius * Math.sin((-speed * elapsedTime) + (phase / 24) * 2 * Math.PI);
                lightRef.current.position.set(x, y, 0);
                sunRef.current.position.set(x * 100, y * 100, 0);
                haloRef.current.position.set(x * 100, y * 100, 0);
        }
    });


    const satellitecurrentcoordinate = useSelector(state => state.CurrentState.satelite.find(p => p.id === 0));
    const centralObject = useSelector((state) => state.view.centralObject);
    const safeActiveLinks = (activeLinks || []).filter((link) => {
        if (!link?.from || !link?.to) return false;
        const { x: fx, y: fy, z: fz } = link.from;
        const { x: tx, y: ty, z: tz } = link.to;
        return [fx, fy, fz, tx, ty, tz].every(Number.isFinite);
    });

    {/** 
    useFrame(() => {
        if (cameraRef.current && satellitecurrentcoordinate) {
            if (centralObject !== 'Earth') {
                const satellitePos = satellitecurrentcoordinate.coordinates || { x: 0, y: 0, z: 0 };
                console.log('Current satellite coordinates:', satellitePos);
        
                const distance = Math.sqrt(satellitePos.x**2 + satellitePos.y**2 + satellitePos.z**2);
                
                // Position the camera slightly away from the satellite
                cameraRef.current.position.set(
                    satellitePos.x + (satellitePos.x / distance) * 1,
                    satellitePos.y + (satellitePos.y / distance) * 1,
                    satellitePos.z + (satellitePos.z / distance) * 1
                );
                
                // Make the camera look at the satellite's position
                cameraRef.current.lookAt(satellitePos.x, satellitePos.y, satellitePos.z);
                
                console.log('Camera updated to follow satellite:', { x: satellitePos.x, y: satellitePos.y, z: satellitePos.z });
            }
        }
    });

    const handleClick = () => {
        dispatch(toggleCentralObject('Earth'));
        console.log('object cliked')
        if (cameraRef.current && satellitecurrentcoordinate) {
            const satellitePos = satellitecurrentcoordinate.coordinates || { x: 0, y: 0, z: 0 };
            console.log('Current satellite coordinates:', satellitePos);
    
            //const distance = Math.sqrt(satellitePos.x**2 + satellitePos.y**2 + satellitePos.z**2);
            
            // Position the camera slightly away from the satellite
            
            // Make the camera look at the satellite's position
            cameraRef.current.position.set(5, 0, 0); // Set default position
            cameraRef.current.up.set(0, 0, 1); // Set default up direction
            cameraRef.current.makeDefault
            //cameraRef.current.lookAt(0, 0, 0); // Reset target look at origin
            //cameraRef.current.updateProjectionMatrix(); // Update projection matrix after changes
            
            console.log('Camera updated to follow satellite:', { x: satellitePos.x, y: satellitePos.y, z: satellitePos.z });
        }
      };
      */}
    

    return (
        <>
            { view.AmbientLight &&
            <ambientLight intensity={1} />
            }
            <directionalLight ref={lightRef} position={[5, 0, 5]} intensity={1} />
            <Stars radius={300} depth={50} count={20000} factor={7} saturation={0} fade speed={1} />

            { !view.HDEarth &&
                <mesh ref={earthRef} rotation={[Math.PI / 2, 0, 0]}>
                    <sphereGeometry args={[2, 32, 32]} />
                    <meshStandardMaterial map={texture} />
                </mesh>
            }
            { view.HDEarth &&     
            <mesh ref={earthRef} rotation={[Math.PI / 2, 0, 0]}>
                <sphereGeometry args={[2, 64, 64]} />
                <meshStandardMaterial>
                    <primitive attach="map" object={texture} />
                    <primitive attach="lightMap" object={nightTexture} />
                </meshStandardMaterial>
            </mesh>
            }
            
            { view.HDEarth &&  
            <mesh ref={haloRef} scale={[1.01, 1.01, 1.01]}>
                <sphereGeometry args={[2, 64, 64]} />
                <shaderMaterial
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={{ c: { value: 1.0 }, p: { value: 6.0 } }}
                    blending={THREE.AdditiveBlending}
                    side={THREE.BackSide}
                    transparent={true}
                />
            </mesh>
            }

            { view.HDEarth &&  
            <mesh>
                <sphereGeometry args={[2.02, 64, 64]} />
                <meshStandardMaterial map={cloudsTexture} transparent={true} opacity={0.3} />
            </mesh>
            }
            
            { view.Sun && 
            <mesh ref={sunRef}>
                <sphereGeometry args={[10, 64, 64]} />
                <shaderMaterial
                    vertexShader={sunVertexShader}
                    fragmentShader={sunFragmentShader}
                    uniforms={{
                        time: { value: clock.getElapsedTime() },
                    }}
                />
            </mesh>
            }

            <StackSatellites />
            <SimuStackSatellites />
            
            {/* Render ground stations */}
            {useSelector((state) => state.groundStations.groundStations).map((gs) => (
                <GroundStationRender
                    key={gs.id}
                    stationId={gs.id}
                    lat={gs.lat}
                    lon={gs.lon}
                    altKm={gs.altKm || 0}
                    name={gs.name}
                />
            ))}
            
            {/* Communication links - yellow lines between satellites and ground stations */}
            {safeActiveLinks.map((link) => (
                <group key={link.id}>
                    {/* Main communication beam */}
                    <Line
                        points={[
                            [link.from.x, link.from.y, link.from.z],
                            [link.to.x, link.to.y, link.to.z],
                        ]}
                        color="#ffeb3b"
                        lineWidth={3}
                        dashed={false}
                        transparent={true}
                        opacity={0.8}
                    />
                    {/* Transmitter indicator (from) */}
                    <mesh position={[link.from.x, link.from.y, link.from.z]}>
                        <sphereGeometry args={[0.04, 8, 8]} />
                        <meshBasicMaterial color="#ffeb3b" transparent opacity={0.6} />
                    </mesh>
                    {/* Receiver indicator (to) */}
                    <mesh position={[link.to.x, link.to.y, link.to.z]}>
                        <sphereGeometry args={[0.04, 8, 8]} />
                        <meshBasicMaterial color="#ffeb3b" transparent opacity={0.6} />
                    </mesh>
                </group>
            ))}


            {view.Grid &&
                <gridHelper
                    args={[100, 100, 'grey', 'grey']}
                    rotation={[Math.PI / 2, 0, 0]} // Grid size, divisions, color for lines, color for center lines
                />}
            {view.VonAllenBelt && <VonAllenBelt />}
            {view.Axis && <axesHelper args={[5]} />}
            <OrbitControls 
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                minDistance={2.5}
                maxDistance={50}
                zoomSpeed={0.8}
                panSpeed={0.8}
                rotateSpeed={0.5}
            />
            
            <PerspectiveCamera ref={cameraRef}
                makeDefault
                position={[8, 0, 0]}
                up={[0, 0, 1]}
                fov={50}
            />
            
        </>
    );
};

export default GlobeRender;
