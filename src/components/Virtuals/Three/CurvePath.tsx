import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

interface CurvePathProps {
  points: THREE.Vector3[];
}

export default function CurvePath({ points }: CurvePathProps) {
  // We use drei's Line component which implements Line2 for thick lines
  // that can glow easily with bloom.
  
  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color="#e63946"
      lineWidth={4} // In pixels
      dashed={false}
      toneMapped={false}
      // Provide an emissive-like effect by pushing colors beyond 1 if possible
      // but drei Line uses LineBasicMaterial or LineMaterial. 
      // We can rely on Bloom to pick up the bright color.
    />
  );
}
