import { Toaster } from "sonner";

export function NotificationProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 10px 30px rgba(23, 58, 106, 0.08)',
          borderRadius: '12px',
          color: '#0f172a',
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontSize: '14px',
          fontWeight: '500',
        },
        className: 'sonner-toast',
      }}
    />
  );
}
