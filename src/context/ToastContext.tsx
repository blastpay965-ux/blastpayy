'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import styles from './Toast.module.css';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ToastContextType {
  showError: (msg: string) => void;
  showSuccess: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string, type: 'error' | 'success', id: number } | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const showToast = (msg: string, type: 'error' | 'success') => {
    const id = Date.now();
    setToast({ msg, type, id });
    setIsExiting(false);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(prev => {
        if (prev?.id === id) {
          setIsExiting(true);
          setTimeout(() => setToast(null), 200); // Wait for exit animation
          return prev;
        }
        return prev;
      });
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{
      showError: (msg) => showToast(msg, 'error'),
      showSuccess: (msg) => showToast(msg, 'success')
    }}>
      {children}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]} ${isExiting ? styles.exiting : ''}`}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
