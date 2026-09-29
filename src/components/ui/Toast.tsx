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
                background: 'var(--bg-card)',
                borderRadius: '14px',
                boxShadow: 'var(--shadow-hover)',
                border: `1px solid ${isSuccess ? 'var(--primary-200)' : isError ? 'var(--danger-border)' : 'var(--border-color)'}`,
                borderLeft: `5px solid ${isSuccess ? 'var(--primary-500)' : isError ? 'var(--danger-text)' : 'var(--accent-blue)'}`,
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                {isSuccess && <CheckCircle2 size={20} color="#10b981" />}
                {isError && <AlertCircle size={20} color="#ef4444" />}
                {!isSuccess && !isError && <Info size={20} color="#3b82f6" />}

                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {toast.title}
                  </p>
                  {toast.message && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
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
                    background: 'var(--primary-50)',
                    color: 'var(--primary-600)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid var(--primary-200)',
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
