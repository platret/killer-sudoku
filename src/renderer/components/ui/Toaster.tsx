import { Toaster as SonnerToaster, toast } from 'sonner';
import { useApp } from '@/lib/store';

export function Toaster(): JSX.Element {
  const theme = useApp((s) => s.theme);
  const light = theme === 'light';
  return (
    <SonnerToaster
      position="bottom-right"
      theme={light ? 'light' : 'dark'}
      richColors
      toastOptions={{
        style: {
          background: light ? '#fffbf2' : '#211d16',
          border: light ? '1px solid rgba(38,25,14,0.10)' : '1px solid rgba(255,255,255,0.08)',
          color: light ? '#261910' : '#f3eee2'
        }
      }}
    />
  );
}

export { toast };
