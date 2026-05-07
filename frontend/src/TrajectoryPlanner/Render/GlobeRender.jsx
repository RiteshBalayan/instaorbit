import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import StackSatellites from './StackSatellites';
import VonAllenBelt from './VonAllenBelt';
import { useLoader } from '@react-three/fiber';
// SimuStackSatellites moved to Globe.jsx (outside Canvas) so it runs in all view modes
import { toggleCentralObject } from '../../Store/View';
import GroundStationRender from './GroundStationRender';
import { computeGMSTFromSim, sunDirectionECIFromSim } from '../../transforms';
import EarthMaterial from './EarthMaterial';
import ConnectivityLinks from './ConnectivityLinks';

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
    const sunDirRef = useRef([1, 0, 0]);  // sun direction for Earth shader
    const texture = useLoader(THREE.TextureLoader, '/8081_earthmap10k.jpg');
    const nightTexture = useLoader(THREE.TextureLoader, '/8081_earthlights10k.jpg');
    const cloudsTexture = useLoader(THREE.TextureLoader, '/earthcloudmap.jpg');
    const starttime = useSelector((state) => state.timer.starttime);
    const elapsedTime = useSelector((state) => state.timer.RenderTime);
    const view = useSelector((state) => state.view);
    const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
    const cameraRef = useRef();
    const dispatch = useDispatch();

    // Enhance textures
    const { gl } = useThree();
    useMemo(() => {
      const maxAniso = gl.capabilities.getMaxAnisotropy();
      [texture, nightTexture, cloudsTexture].forEach(tex => {
        tex.anisotropy = maxAniso;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
      });
    }, [texture, nightTexture, cloudsTexture, gl]);

    const { clock } = useThree();

    useFrame(() => {
        if (earthRef.current) {
            // Use GMST for astronomically correct Earth rotation
            const gmst = computeGMSTFromSim(starttime, elapsedTime);
            if (referenceSystem === 'EarthInertial') {
                earthRef.current.rotation.y = gmst;
            } else {
                earthRef.current.rotation.y = 0;
            }
        }
        if (lightRef.current && sunRef.current && haloRef.current) {
            // Compute sun direction in ECI with proper obliquity (23.44°)
            const sunDir = sunDirectionECIFromSim(starttime, elapsedTime);
            const sunRadius = 5;
            
            if (referenceSystem === 'EarthInertial') {
                lightRef.current.position.set(
                    sunDir[0] * sunRadius,
                    sunDir[1] * sunRadius,
                    sunDir[2] * sunRadius
                );
                sunRef.current.position.set(
                    sunDir[0] * sunRadius * 100,
                    sunDir[1] * sunRadius * 100,
                    sunDir[2] * sunRadius * 100
                );
                haloRef.current.position.set(
                    sunDir[0] * sunRadius * 100,
                    sunDir[1] * sunRadius * 100,
                    sunDir[2] * sunRadius * 100
                );
                // Sun direction in world space (ECI → world, same thing)
                sunDirRef.current = [sunDir[0], sunDir[1], sunDir[2]];
            } else {
                const gmst = computeGMSTFromSim(starttime, elapsedTime);
                const c = Math.cos(-gmst);
                const s = Math.sin(-gmst);
                const sx = c * sunDir[0] - s * sunDir[1];
                const sy = s * sunDir[0] + c * sunDir[1];
                const sz = sunDir[2];
                lightRef.current.position.set(sx * sunRadius, sy * sunRadius, sz * sunRadius);
                sunRef.current.position.set(sx * sunRadius * 100, sy * sunRadius * 100, sz * sunRadius * 100);
                haloRef.current.position.set(sx * sunRadius * 100, sy * sunRadius * 100, sz * sunRadius * 100);
                // Sun direction in world space (ECEF frame)
                sunDirRef.current = [sx, sy, sz];
            }
        }
    });


    const satellitecurrentcoordinate = useSelector(state => state.CurrentState.satelite.find(p => p.id === 0));
    const centralObject = useSelector((state) => state.view.centralObject);

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
                    <sphereGeometry args={[2, 64, 64]} />
                    <EarthMaterial
                      dayMap={texture}
                      nightMap={nightTexture}
                      cloudsMap={cloudsTexture}
                      sunDirection={sunDirRef.current}
                      cloudsOpacity={0.0}
                    />
                </mesh>
            }
            { view.HDEarth &&     
            <mesh ref={earthRef} rotation={[Math.PI / 2, 0, 0]}>
                <sphereGeometry args={[2, 128, 128]} />
                <EarthMaterial
                  dayMap={texture}
                  nightMap={nightTexture}
                  cloudsMap={cloudsTexture}
                  sunDirection={sunDirRef.current}
                  cloudsOpacity={0.35}
                />
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
            
            {/* Communication links — updated every frame from time series */}
            <ConnectivityLinks />


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
