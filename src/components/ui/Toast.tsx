import React, { useState, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, RotateCcw } from 'lucide-react';

export interface ToastOptions {
  id?: string;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = options.id || `toast-${Date.now()}-${Math.random()}`;
    const newToast = { ...options, id };

    setToasts((prev) => [...prev, newToast]);

    const duration = options.duration || 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: 'calc(100% - 48px)',
        pointerEvents: 'none',
      }}>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success' || !toast.type;
          const isError = toast.type === 'error';
          
          return (
            <div
              key={toast.id}
              className="animate-slide-up"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: '#ffffff',
                borderRadius: '14px',
                boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
                border: `1px solid ${isSuccess ? '#bbf7d0' : isError ? '#fecaca' : '#e2e8f0'}`,
                borderLeft: `5px solid ${isSuccess ? '#10b981' : isError ? '#ef4444' : '#3b82f6'}`,
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                {isSuccess && <CheckCircle2 size={20} color="#059669" />}
                {isError && <AlertCircle size={20} color="#dc2626" />}
                {!isSuccess && !isError && <Info size={20} color="#2563eb" />}

                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', color: '#0f172a' }}>
                    {toast.title}
                  </p>
                  {toast.message && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      {toast.message}
                    </p>
                  )}
                </div>
              </div>

              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    if (toast.id) removeToast(toast.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    background: '#ecfdf5',
                    color: '#059669',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid #a7f3d0',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={13} />
                  {toast.action.label}
                </button>
              )}

              <button
                onClick={() => toast.id && removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
