import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useApp } from '@/lib/store';
import type { Mesh, Group } from 'three';

interface CubeProps {
  position: [number, number, number];
  accent: boolean;
  phase: number;
}

function Cube({ position, accent, phase }: CubeProps): JSX.Element {
  const ref = useRef<Mesh>(null);
  const initialY = position[1];
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * 0.25 + phase;
    ref.current.rotation.y = t * 0.35 + phase;
    ref.current.position.y = initialY + Math.sin(t * 1.1 + phase * 2) * 0.08;
  });
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[0.7, 0.7, 0.7]} />
      {accent ? (
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={1.2}
          roughness={0.25}
          metalness={0.4}
        />
      ) : (
        <meshStandardMaterial
          color="#1a1535"
          emissive="#3b1170"
          emissiveIntensity={0.18}
          roughness={0.55}
          metalness={0.3}
          wireframe
        />
      )}
    </mesh>
  );
}

function Scene(): JSX.Element {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.18) * 0.6;
    groupRef.current.rotation.x = Math.sin(t * 0.12) * 0.3;
  });

  const positions: [number, number, number][] = [];
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      positions.push([c * 1.05, r * 1.05, 0]);
    }
  }

  return (
    <>
      <ambientLight intensity={0.35} color="#c4b5fd" />
      <pointLight position={[5, 5, 4]} intensity={2.4} color="#a855f7" />
      <pointLight position={[-5, -3, 4]} intensity={1.5} color="#06b6d4" />
      <pointLight position={[0, 6, 3]} intensity={0.8} color="#ec4899" />
      <group ref={groupRef}>
        {positions.map((p, i) => (
          <Cube key={i} position={p} accent={i === 4} phase={i * 0.5} />
        ))}
      </group>
    </>
  );
}

function StaticFallback(): JSX.Element {
  return (
    <div
      className="w-full h-full"
      style={{
        background:
          'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.25) 0%, transparent 60%)'
      }}
    />
  );
}

interface Props {
  className?: string;
}

export function HeroCubes({ className }: Props): JSX.Element {
  const reducedMotion = useApp((s) => s.reducedMotion);

  if (reducedMotion) {
    return (
      <div className={className} aria-hidden>
        <StaticFallback />
      </div>
    );
  }

  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 5.4], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        dpr={[1, 1.5]}
        frameloop="always"
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
