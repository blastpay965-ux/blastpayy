import { forwardRef, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const Rocket = forwardRef<THREE.Group, any>((props, ref) => {
  const flameRef = useRef<THREE.Mesh>(null);

  // Animate the flame flickering
  useFrame(({ clock }) => {
    if (flameRef.current) {
      const t = clock.getElapsedTime();
      flameRef.current.scale.y = 1 + Math.sin(t * 20) * 0.2;
      flameRef.current.scale.x = 1 + Math.sin(t * 30) * 0.1;
      flameRef.current.scale.z = 1 + Math.sin(t * 30) * 0.1;
    }
  });

  return (
    <group ref={ref} {...props}>
      {/* Main Body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 2, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Nose Cone */}
      <mesh position={[0, 0, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.6, 16]} />
        <meshStandardMaterial color="#ff3333" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Wings/Fins */}
      <mesh position={[0, 0, -0.6]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.5, 0.1, 0.5]} />
        <meshStandardMaterial color="#ff3333" metalness={0.5} roughness={0.5} />
      </mesh>
      
      <mesh position={[0, 0, -0.6]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[1.5, 0.1, 0.5]} />
        <meshStandardMaterial color="#ff3333" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Engine Exhaust Flame */}
      <mesh ref={flameRef} position={[0, 0, -1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.25, 0.8, 16]} />
        {/* Use a high emissive value so PostProcessing Bloom picks it up */}
        <meshStandardMaterial 
          color="#ffaa00" 
          emissive="#ff5500" 
          emissiveIntensity={4} 
          toneMapped={false}
        />
      </mesh>
    </group>
  );
});

Rocket.displayName = 'Rocket';

export default Rocket;
