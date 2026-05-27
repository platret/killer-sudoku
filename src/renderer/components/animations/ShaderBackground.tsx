import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { useApp } from '@/lib/store';

const MeshGradientLazy = lazy(async () => {
  const mod = await import('@paper-design/shaders-react');
  return { default: mod.MeshGradient };
});

const GrainGradientLazy = lazy(async () => {
  const mod = await import('@paper-design/shaders-react');
  return { default: mod.GrainGradient };
});

function StaticFallback(): JSX.Element {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(60% 60% at 30% 25%, rgba(168,85,247,0.55) 0%, transparent 60%), radial-gradient(45% 45% at 78% 75%, rgba(6,182,212,0.45) 0%, transparent 55%), radial-gradient(40% 40% at 65% 30%, rgba(236,72,153,0.35) 0%, transparent 55%), #0a0612'
      }}
      aria-hidden
    />
  );
}

interface Props {
  children?: ReactNode;
}

export function ShaderBackground({ children }: Props): JSX.Element {
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
          <ShaderInner onError={() => setFailed(true)} />
        </Suspense>
      ) : (
        <StaticFallback />
      )}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)'
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(110% 80% at 50% 0%, transparent 50%, rgba(10,6,18,0.75) 100%)'
        }}
      />
      {children}
    </div>
  );
}

function ShaderInner({ onError }: { onError: () => void }): JSX.Element {
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
      <>
        <MeshGradientLazy
          colors={['#0a0612', '#581c87', '#a855f7', '#ec4899', '#06b6d4', '#0a0612']}
          distortion={0.95}
          swirl={0.55}
          speed={0.6}
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        />
        <GrainGradientLazy
          colors={['#a855f7', '#06b6d4', '#ec4899']}
          softness={0.85}
          intensity={0.5}
          noise={0.65}
          shape="ripple"
          speed={0.4}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
            mixBlendMode: 'screen',
            opacity: 0.35
          }}
        />
      </>
    );
  } catch {
    onError();
    return <StaticFallback />;
  }
}
