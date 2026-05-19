import { forwardRef, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const Rocket = forwardRef<THREE.Group, any>((props, ref) => {
  const propellerRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);

  // Animate the propeller and exhaust
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (propellerRef.current) {
      propellerRef.current.rotation.z += 0.8; // spin fast
    }
    if (trailRef.current) {
      trailRef.current.scale.y = 1 + Math.sin(t * 20) * 0.2; // length pulsation
      trailRef.current.scale.x = 1 + Math.sin(t * 30) * 0.1; // width pulsation
      trailRef.current.scale.z = 1 + Math.sin(t * 30) * 0.1;
    }
  });

  const bodyColor = "#e60000"; // Signature Aviator Red

  return (
    <group ref={ref} {...props}>
      {/* Fuselage (Main Body) */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {/* radius, length, capSegments, radialSegments */}
        <capsuleGeometry args={[0.25, 1.2, 4, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Cockpit Canopy */}
      <mesh position={[0, 0.2, 0.1]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Main Wings */}
      <mesh position={[0, -0.05, 0.1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.8, 0.05, 0.5]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Wing Stripes (White accents) */}
      <mesh position={[0.6, -0.04, 0.1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.15, 0.06, 0.45]} />
        <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.8} />
      </mesh>
      <mesh position={[-0.6, -0.04, 0.1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.15, 0.06, 0.45]} />
        <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.8} />
      </mesh>

      {/* Tail Stabilizers (Horizontal) */}
      <mesh position={[0, 0, -0.7]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.05, 0.25]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Tail Fin (Vertical) */}
      <mesh position={[0, 0.15, -0.75]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.35, 0.25]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Front Engine Block */}
      <mesh position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.15, 16]} />
        <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Propeller Hub */}
      <mesh position={[0, 0, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.15, 16]} />
        <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Propeller Blades */}
      <group position={[0, 0, 0.9]} ref={propellerRef}>
        <mesh>
          <boxGeometry args={[1.0, 0.04, 0.02]} />
          <meshStandardMaterial color="#111111" metalness={0.2} roughness={0.8} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[1.0, 0.04, 0.02]} />
          <meshStandardMaterial color="#111111" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>

      {/* Jet Exhaust Trail */}
      <mesh ref={trailRef} position={[0, 0, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
        {/* radiusTop, radiusBottom, height */}
        <cylinderGeometry args={[0.12, 0, 0.8, 16]} />
        <meshStandardMaterial 
          color="#ffaa00" 
          emissive="#ff3300" 
          emissiveIntensity={4} 
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      
      {/* Inner bright core for trail */}
      <mesh position={[0, 0, -1.0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0, 0.5, 16]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffffff" 
          emissiveIntensity={5} 
          toneMapped={false}
        />
      </mesh>
    </group>
  );
});

Rocket.displayName = 'Rocket';

export default Rocket;
