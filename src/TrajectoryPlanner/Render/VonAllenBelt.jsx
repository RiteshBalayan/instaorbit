import React, { useRef, useState, useEffect} from 'react';
import { useFrame } from '@react-three/fiber';
import { useSelector } from 'react-redux';

const VonAllenBelt = () => {
    const torusRef = useRef();
    const torusRef2 = useRef();
    const torusRef3 = useRef();
    const starttime = useSelector((state) => state.timer.starttime)

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

    useFrame(() => {
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
            <mesh ref={torusRef} rotation={[0, 0, 0]}>
              <torusGeometry args={[2.5, 2.6, 16, 100]} />
              <meshStandardMaterial
                color="blue"
                wireframe={true}
                transparent={true}
                opacity={0.01}
                emissive="blue"
                emissiveIntensity={0.3}
              />
            </mesh>

            <mesh ref={torusRef2} rotation={[0, 0, 0]}>
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

            <mesh ref={torusRef3} rotation={[0, 0, 0]}>
              <torusGeometry args={[2.7, 2.6, 16, 100]} />
              <meshStandardMaterial
                color="orange"
                wireframe={true}
                transparent={true}
                opacity={0.01}
                emissive="orange"
                emissiveIntensity={0.2}
              />
            </mesh>
        </>
    );
};

export default VonAllenBelt;
