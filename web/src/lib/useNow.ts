import { useEffect, useState } from 'react';

/**
 * Returns the current timestamp, re-rendering on an interval while `active`.
 * Used to drive live elapsed-time counters without re-rendering when idle.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);

  return now;
}
