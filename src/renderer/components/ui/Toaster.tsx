import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster(): JSX.Element {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      richColors
      toastOptions={{
        style: {
          background: '#161616',
          border: '1px solid #262626',
          color: '#fafafa'
        }
      }}
    />
  );
}

export { toast };
