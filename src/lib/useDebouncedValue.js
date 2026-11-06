import { useEffect, useState } from "react";

/**
 * Debounce a fast-changing value (e.g. a live-search input).
 * Returns a copy of `value` that only updates after `delay` ms of quiet.
 */
export function useDebouncedValue(value, delay = 400) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return settled;
}
