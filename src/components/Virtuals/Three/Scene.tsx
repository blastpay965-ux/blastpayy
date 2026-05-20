import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Rocket from './Rocket';
import Hero3D from './Hero3D';
import CurvePath from './CurvePath';
import Explosion from './Explosion';

interface SceneProps {
  status: 'betting' | 'playing' | 'crashed';
  multiplier: number;
  modelType?: 'rocket' | 'hero';
}

function GameEnvironment({ status, multiplier, modelType = 'rocket' }: SceneProps) {
  const rocketRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // The base curve shape. We scale/shift this based on the multiplier.
  const baseCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-10, -5, 0),
      new THREE.Vector3(-2, -3, 0),
      new THREE.Vector3(4, 2, 0),
      new THREE.Vector3(10, 8, 0),
      new THREE.Vector3(15, 15, 0)
    ], false);
  }, []);

  const [pathPoints, setPathPoints] = useState<THREE.Vector3[]>([]);
  const [rocketPos, setRocketPos] = useState<THREE.Vector3>(new THREE.Vector3(-10, -5, 0));

  // Handle crash state locking
  const crashedPosRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (status === 'betting') {
       crashedPosRef.current = null;
    }
  }, [status]);

  useFrame(() => {
    // Determine progress based on multiplier
    // A simple mapping: mult 1.0 -> progress 0, mult 10.0 -> progress 1
    // We'll use a log scale so it slows down visually as mult gets huge
    
    let progress = 0;
    if (status === 'playing' || status === 'crashed') {
        const targetProgress = Math.min(1, Math.log10(multiplier) / Math.log10(50)); // max out path at 50x
        progress = targetProgress;
    }

    // Get position on curve
    const currentPoint = baseCurve.getPoint(progress);
    
    // Update Camera
    // Follow the rocket loosely
    camera.position.lerp(new THREE.Vector3(currentPoint.x, currentPoint.y + 5, 15), 0.05);
    camera.lookAt(currentPoint.x, currentPoint.y, 0);

    if (status === 'playing') {
      // Build the path up to current progress
      const points: THREE.Vector3[] = [];
      const steps = Math.max(2, Math.floor(progress * 100));
      for (let i = 0; i <= steps; i++) {
        points.push(baseCurve.getPoint(i / 100 * progress));
      }
      setPathPoints(points);

      // Update Rocket Position and Rotation
      if (rocketRef.current) {
         rocketRef.current.position.copy(currentPoint);
         setRocketPos(currentPoint);

         // Calculate tangent for rotation
         const tangent = baseCurve.getTangent(progress).normalize();
         
         // In 3D, we want to align the rocket's forward (Z or Y axis depending on model) to the tangent
         // Since our primitive model's nose points along +Z, we'll lookAt the next point
         const lookAtPos = currentPoint.clone().add(tangent);
         rocketRef.current.lookAt(lookAtPos);
      }
    } else if (status === 'crashed') {
      // Freeze the path
      if (!crashedPosRef.current) {
        crashedPosRef.current = currentPoint;
        setRocketPos(currentPoint);
      }
      // Rocket disappears or stops on crash
      if (rocketRef.current) {
         rocketRef.current.visible = false;
      }
    } else if (status === 'betting') {
       if (rocketRef.current) rocketRef.current.visible = true;
       setPathPoints([]);
       const startPoint = baseCurve.getPoint(0);
       if (rocketRef.current) {
         rocketRef.current.position.copy(startPoint);
         const tangent = baseCurve.getTangent(0).normalize();
         rocketRef.current.lookAt(startPoint.clone().add(tangent));
       }
       setRocketPos(startPoint);
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1.5} />

      {/* Path */}
      {status !== 'betting' && <CurvePath points={pathPoints} />}

      {/* Main Model */}
      {modelType === 'hero' ? (
        <Hero3D ref={rocketRef} visible={status !== 'crashed'} />
      ) : (
        <Rocket ref={rocketRef} visible={status !== 'crashed'} />
      )}

      {/* Explosion */}
      <Explosion position={rocketPos} isCrashed={status === 'crashed'} />
    </>
  );
}

import React from 'react';

const SceneComponent = ({ status, multiplier, modelType = 'rocket' }: SceneProps) => {
  return (
    <Canvas
      style={{ background: 'transparent' }}
      camera={{ position: [0, 0, 15], fov: 45 }}
    >
      <GameEnvironment status={status} multiplier={multiplier} modelType={modelType} />
      
      {/* Post Processing for Glow/Bloom */}
      <EffectComposer>
        <Bloom 
          luminanceThreshold={1} 
          mipmapBlur 
          intensity={2.5} 
        />
      </EffectComposer>
    </Canvas>
  );
}

export default React.memo(SceneComponent);
