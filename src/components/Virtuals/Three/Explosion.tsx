import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface ExplosionProps {
  position: THREE.Vector3;
  isCrashed: boolean;
}

export default function Explosion({ position, isCrashed }: ExplosionProps) {
  const particleCount = 100;
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  
  // Particle state data
  const [particleData] = useState(() => {
    const data = [];
    for (let i = 0; i < particleCount; i++) {
      data.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        life: 1.0,
      });
    }
    return data;
  });

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isCrashed) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setActive(true);
      // Reset particles to center
      particleData.forEach(p => {
        p.life = 1.0;
        p.velocity.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        );
      });
    } else {
      setActive(false);
    }
  }, [isCrashed, particleData]);

  useFrame((_, delta) => {
    if (!active || !particlesRef.current) return;

    let stillAlive = false;

    particleData.forEach((p, i) => {
      if (p.life > 0) {
        stillAlive = true;
        p.life -= delta * 1.5; // fade out speed
        
        // Use dummy to position
        dummy.position.copy(position).addScaledVector(p.velocity, 1 - p.life);
        
        // Scale down as they die
        const scale = Math.max(0, p.life * 0.5);
        dummy.scale.set(scale, scale, scale);
        
        dummy.updateMatrix();
        particlesRef.current!.setMatrixAt(i, dummy.matrix);
      } else {
        // Hide dead particles
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        particlesRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    particlesRef.current.instanceMatrix.needsUpdate = true;
    
    if (!stillAlive) {
       setActive(false);
    }
  });

  return (
    <instancedMesh ref={particlesRef} args={[undefined, undefined, particleCount]} visible={active}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshStandardMaterial 
        color="#ff5500" 
        emissive="#ff0000" 
        emissiveIntensity={5} 
        transparent 
        opacity={0.8}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
