import { useEffect, useState } from 'react';

/**
 * Debounce a value: returns the latest `value` only after it has stayed
 * unchanged for `ms` milliseconds. Use to settle a fast-moving cursor (a scrub,
 * a slider) before firing an expensive effect such as a fetch, so intermediate
 * values a consumer passes through don't each trigger work.
 */
export function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return settled;
}
