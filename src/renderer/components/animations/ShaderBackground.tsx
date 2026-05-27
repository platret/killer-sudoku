import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { useApp, type Theme } from '@/lib/store';

const MeshGradientLazy = lazy(async () => {
  const mod = await import('@paper-design/shaders-react');
  return { default: mod.MeshGradient };
});

const GrainGradientLazy = lazy(async () => {
  const mod = await import('@paper-design/shaders-react');
  return { default: mod.GrainGradient };
});

interface ShaderPalette {
  staticBg: string;
  mesh: [string, string, string, string, string, string];
  grain: [string, string, string];
  grainMix: 'screen' | 'multiply';
  scanlineColor: string;
  vignette: string;
}

const PALETTES: Record<Theme, ShaderPalette> = {
  dark: {
    staticBg: 'linear-gradient(180deg, #0c0b09 0%, #1a120a 100%)',
    mesh: ['#0c0b09', '#7a3e12', '#b5651d', '#f4a72c', '#7a3e12', '#0c0b09'],
    grain: ['#7a3e12', '#b5651d', '#f4a72c'],
    grainMix: 'screen',
    scanlineColor: 'rgba(255,255,255,0.04)',
    vignette:
      'radial-gradient(110% 80% at 50% 0%, transparent 50%, rgba(12,11,9,0.75) 100%)'
  },
  light: {
    staticBg: 'linear-gradient(180deg, #fcf7eb 0%, #f0d4a0 100%)',
    mesh: ['#fcf7eb', '#f3d49b', '#e2a665', '#d97757', '#ecc080', '#fcf7eb'],
    grain: ['#f3d49b', '#e2a665', '#d97757'],
    grainMix: 'multiply',
    scanlineColor: 'rgba(58,32,8,0.08)',
    vignette:
      'radial-gradient(110% 80% at 50% 0%, transparent 50%, rgba(252,247,235,0.65) 100%)'
  }
};

function StaticFallback({ bg }: { bg: string }): JSX.Element {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ background: bg }} aria-hidden />
  );
}

interface Props {
  children?: ReactNode;
}

export function ShaderBackground({ children }: Props): JSX.Element {
  const reducedMotion = useApp((s) => s.reducedMotion);
  const theme = useApp((s) => s.theme);
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

  const palette = PALETTES[theme];
  const showShader = !reducedMotion && !paused && !failed;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {showShader ? (
        <Suspense fallback={<StaticFallback bg={palette.staticBg} />}>
          <ShaderInner palette={palette} onError={() => setFailed(true)} />
        </Suspense>
      ) : (
        <StaticFallback bg={palette.staticBg} />
      )}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, ${palette.scanlineColor} 0 1px, transparent 1px 3px)`
        }}
      />
      <div className="absolute inset-0" style={{ background: palette.vignette }} />
      {children}
    </div>
  );
}

function ShaderInner({
  palette,
  onError
}: {
  palette: ShaderPalette;
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

  if (crashed) return <StaticFallback bg={palette.staticBg} />;
  try {
    return (
      <>
        <MeshGradientLazy
          colors={palette.mesh as unknown as string[]}
          distortion={0.95}
          swirl={0.55}
          speed={0.6}
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        />
        <GrainGradientLazy
          colors={palette.grain as unknown as string[]}
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
            mixBlendMode: palette.grainMix,
            opacity: 0.35
          }}
        />
      </>
    );
  } catch {
    onError();
    return <StaticFallback bg={palette.staticBg} />;
  }
}
