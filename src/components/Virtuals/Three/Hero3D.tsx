import { forwardRef, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const Hero3D = forwardRef<THREE.Group, any>((props, ref) => {
  const capeRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Group>(null);

  // Animate the hero's cape and flying aura
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (capeRef.current) {
      // Cape flutters in the wind
      capeRef.current.rotation.x = Math.sin(t * 15) * 0.1 - 0.2; 
      capeRef.current.position.y = -0.7 + Math.sin(t * 20) * 0.05;
    }
    if (auraRef.current) {
      // Aura rings spin and scale
      auraRef.current.children.forEach((child, i) => {
        child.rotation.z += 0.1 * (i + 1);
        child.scale.setScalar(1 + Math.sin(t * 20 + i) * 0.1);
      });
    }
  });

  const suitColor = "#e60000"; // Bright Red
  const goldColor = "#ffcc00"; // Bright Gold/Yellow
  const skinColor = "#5a3a22"; // Dark brown skin tone
  const whiteColor = "#ffffff";
  const trailColor = "#ff5500"; // Orange/Fire trail

  return (
    <group ref={ref} {...props}>
      {/* Rotate the entire character to fly forward (along +Z) */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        
        {/* Head */}
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>

        {/* Hair (High top fade) */}
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[0.18, 0.15, 0.18]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>

        {/* Upper Torso (Muscular Chest) */}
        <mesh position={[0, 0.4, 0]}>
          <capsuleGeometry args={[0.35, 0.3, 32, 32]} />
          <meshStandardMaterial color={suitColor} roughness={0.5} />
        </mesh>

        {/* Chest Logo (White Circle) */}
        <mesh position={[0, 0.45, 0.34]} rotation={[0.1, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 32]} />
          <meshStandardMaterial color={whiteColor} emissive={whiteColor} emissiveIntensity={0.5} />
        </mesh>
        
        {/* "S" shape inside the logo (abstracted as a small red box) */}
        <mesh position={[0, 0.45, 0.36]} rotation={[0.1, 0, 0]}>
           <boxGeometry args={[0.1, 0.1, 0.02]} />
           <meshStandardMaterial color={suitColor} />
        </mesh>

        {/* Lower Torso (Abdomen) */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.3, 0.25, 0.4, 32]} />
          <meshStandardMaterial color={suitColor} roughness={0.5} />
        </mesh>

        {/* Gold Belt */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.1, 32]} />
          <meshStandardMaterial color={goldColor} metalness={0.6} roughness={0.2} />
        </mesh>

        {/* Arms (Thick, Swept back for flying) */}
        <group position={[-0.45, 0.4, 0]} rotation={[0, 0, 0.1]}>
          {/* Upper Arm */}
          <mesh position={[0, -0.2, -0.1]} rotation={[Math.PI / 4, 0, 0]}>
            <capsuleGeometry args={[0.12, 0.2, 16, 16]} />
            <meshStandardMaterial color={suitColor} roughness={0.5} />
          </mesh>
          {/* Gold Gauntlet */}
          <mesh position={[0, -0.5, -0.4]} rotation={[Math.PI / 4, 0, 0]}>
            <capsuleGeometry args={[0.13, 0.3, 16, 16]} />
            <meshStandardMaterial color={goldColor} metalness={0.6} roughness={0.2} />
          </mesh>
        </group>

        <group position={[0.45, 0.4, 0]} rotation={[0, 0, -0.1]}>
          {/* Upper Arm */}
          <mesh position={[0, -0.2, -0.1]} rotation={[Math.PI / 4, 0, 0]}>
            <capsuleGeometry args={[0.12, 0.2, 16, 16]} />
            <meshStandardMaterial color={suitColor} roughness={0.5} />
          </mesh>
          {/* Gold Gauntlet */}
          <mesh position={[0, -0.5, -0.4]} rotation={[Math.PI / 4, 0, 0]}>
            <capsuleGeometry args={[0.13, 0.3, 16, 16]} />
            <meshStandardMaterial color={goldColor} metalness={0.6} roughness={0.2} />
          </mesh>
        </group>

        {/* Legs (Trailing behind) */}
        <mesh position={[-0.15, -0.4, 0]} rotation={[-0.1, 0, 0]}>
          <capsuleGeometry args={[0.14, 0.4, 16, 16]} />
          <meshStandardMaterial color={suitColor} roughness={0.5} />
        </mesh>
        <mesh position={[0.15, -0.4, 0]} rotation={[-0.1, 0, 0]}>
          <capsuleGeometry args={[0.14, 0.4, 16, 16]} />
          <meshStandardMaterial color={suitColor} roughness={0.5} />
        </mesh>

        {/* Boots (Red legs continuing) */}
        <mesh position={[-0.15, -0.8, -0.05]} rotation={[-0.1, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.4, 16]} />
          <meshStandardMaterial color={suitColor} roughness={0.5} />
        </mesh>
        <mesh position={[0.15, -0.8, -0.05]} rotation={[-0.1, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.4, 16]} />
          <meshStandardMaterial color={suitColor} roughness={0.5} />
        </mesh>

        {/* Gold Cape */}
        <group position={[0, 0.5, -0.25]}>
          <mesh ref={capeRef} position={[0, -0.7, -0.1]}>
            <boxGeometry args={[0.9, 1.4, 0.05]} />
            <meshStandardMaterial color={goldColor} roughness={0.8} />
          </mesh>
        </group>

        {/* Fire/Energy Trail (Aura Rings coming from boots) */}
        <group ref={auraRef} position={[0, -1.2, -0.1]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, -i * 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.3 - i * 0.05, 0.08, 16, 32]} />
              <meshStandardMaterial 
                color={trailColor} 
                emissive={trailColor} 
                emissiveIntensity={3 - i} 
                transparent 
                opacity={0.8 - i * 0.2} 
              />
            </mesh>
          ))}
        </group>

      </group>
    </group>
  );
});

Hero3D.displayName = 'Hero3D';

export default Hero3D;
