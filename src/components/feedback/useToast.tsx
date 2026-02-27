'use client';

import { useCallback, useEffect, useState } from 'react';

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  const Toast = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;

  return { show, Toast };
}
