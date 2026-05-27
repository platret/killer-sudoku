import { Suspense, lazy, useEffect, useState } from 'react';
import { useApp, type Theme } from '@/lib/store';

const MeshGradientLazy = lazy(async () => {
  const mod = await import('@paper-design/shaders-react');
  return { default: mod.MeshGradient };
});

interface ThemePalette {
  staticBg: string;
  meshColors: [string, string, string, string, string, string];
  dotColor: string;
  overlay: string;
}

const PALETTES: Record<Theme, ThemePalette> = {
  dark: {
    staticBg:
      'radial-gradient(60% 80% at 8% 0%, rgba(244,167,44,0.18) 0%, transparent 55%), radial-gradient(50% 70% at 95% 12%, rgba(181,101,29,0.12) 0%, transparent 55%), radial-gradient(40% 60% at 50% 100%, rgba(122,62,18,0.10) 0%, transparent 55%), #0c0b09',
    meshColors: ['#0c0b09', '#7a3e12', '#b5651d', '#f4a72c', '#7a3e12', '#0c0b09'],
    dotColor: 'rgba(244,167,44,0.08)',
    overlay:
      'linear-gradient(180deg, rgba(12,11,9,0.5) 0%, rgba(12,11,9,0.78) 70%, rgba(12,11,9,0.92) 100%)'
  },
  light: {
    staticBg:
      'radial-gradient(60% 80% at 8% 0%, rgba(255,168,52,0.45) 0%, transparent 55%), radial-gradient(50% 70% at 95% 12%, rgba(217,119,87,0.32) 0%, transparent 55%), radial-gradient(40% 60% at 50% 100%, rgba(122,62,18,0.18) 0%, transparent 55%), #fcf7eb',
    meshColors: ['#fcf7eb', '#f5d6a0', '#e9b06b', '#d97757', '#f0c280', '#fcf7eb'],
    dotColor: 'rgba(58,32,8,0.18)',
    overlay:
      'linear-gradient(180deg, rgba(252,247,235,0.18) 0%, rgba(252,247,235,0.45) 70%, rgba(252,247,235,0.72) 100%)'
  }
};

function StaticFallback({ bg }: { bg: string }): JSX.Element {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: bg }}
      aria-hidden
    />
  );
}

interface Props {
  intensity?: number;
}

export function HomeBackdrop({ intensity = 0.55 }: Props): JSX.Element {
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
          <ShaderInner
            intensity={intensity}
            colors={palette.meshColors}
            onError={() => setFailed(true)}
          />
        </Suspense>
      ) : (
        <StaticFallback bg={palette.staticBg} />
      )}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${palette.dotColor} 1px, transparent 0)`,
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)'
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: palette.overlay }}
      />
    </div>
  );
}

function ShaderInner({
  intensity,
  colors,
  onError
}: {
  intensity: number;
  colors: ThemePalette['meshColors'];
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

  if (crashed) return <StaticFallback bg={colors[0]} />;
  try {
    return (
      <MeshGradientLazy
        colors={colors as unknown as string[]}
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
    return <StaticFallback bg={colors[0]} />;
  }
}
