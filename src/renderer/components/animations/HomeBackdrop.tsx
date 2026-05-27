import { Suspense, lazy, useEffect, useState } from 'react';
import { useApp } from '@/lib/store';

const MeshGradientLazy = lazy(async () => {
  const mod = await import('@paper-design/shaders-react');
  return { default: mod.MeshGradient };
});

function StaticFallback(): JSX.Element {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(60% 80% at 8% 0%, rgba(168,85,247,0.22) 0%, transparent 55%), radial-gradient(50% 70% at 95% 12%, rgba(6,182,212,0.18) 0%, transparent 55%), radial-gradient(40% 60% at 50% 100%, rgba(236,72,153,0.15) 0%, transparent 55%), #0a0612'
      }}
      aria-hidden
    />
  );
}

interface Props {
  intensity?: number;
}

export function HomeBackdrop({ intensity = 0.55 }: Props): JSX.Element {
  const reducedMotion = useApp((s) => s.reducedMotion);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onVis = (): void => setPaused(document.visibilityState !== 'visible');
    const onBlur = (): void => setPaused(true);
    const onFocus = (): void => setPaused(false);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const showShader = !reducedMotion && !paused && !failed;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {showShader ? (
        <Suspense fallback={<StaticFallback />}>
          <ShaderInner intensity={intensity} onError={() => setFailed(true)} />
        </Suspense>
      ) : (
        <StaticFallback />
      )}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(168,85,247,0.10) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)'
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,6,18,0.5) 0%, rgba(10,6,18,0.78) 70%, rgba(10,6,18,0.92) 100%)'
        }}
      />
    </div>
  );
}

function ShaderInner({
  intensity,
  onError
}: {
  intensity: number;
  onError: () => void;
}): JSX.Element {
  const [crashed, setCrashed] = useState(false);
  useEffect(() => {
    const handler = (e: ErrorEvent): void => {
      if (e.message?.toLowerCase().includes('webgl')) {
        setCrashed(true);
        onError();
      }
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, [onError]);

  if (crashed) return <StaticFallback />;
  try {
    return (
      <MeshGradientLazy
        colors={['#0a0612', '#3b1170', '#a855f7', '#0e7490', '#ec4899', '#0a0612']}
        distortion={0.7}
        swirl={0.35}
        speed={0.25}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          opacity: intensity
        }}
      />
    );
  } catch {
    onError();
    return <StaticFallback />;
  }
}
