import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster(): JSX.Element {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      richColors
      toastOptions={{
        style: {
          background: '#211d16',
          border: '1px solid #ffffff14',
          color: '#f3eee2'
        }
      }}
    />
  );
}

export { toast };
