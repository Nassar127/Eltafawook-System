import { useState, useCallback, useMemo } from 'react';

export function useToast() {
  const [toasts, set] = useState([]);

  const push = useCallback((t) => {
    const id = crypto.randomUUID();
    const toast = { id, duration: t.duration ?? 5000, ...t };
    set((xs) => [...xs, toast]);
    if (toast.duration > 0) {
      window.setTimeout(() => {
        set((xs) => xs.filter((x) => x.id !== id));
      }, toast.duration);
    }
  }, []);

  const remove = useCallback((id) => {
    set((xs) => xs.filter((x) => x.id !== id));
  }, []);

  return useMemo(() => ({
    toasts,
    push,
    remove,
  }), [toasts, push, remove]);
}