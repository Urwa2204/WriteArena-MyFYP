import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from 0 → target once on mount (or when target changes).
 * Respects prefers-reduced-motion by snapping straight to the target.
 *
 * @param {number} target
 * @param {number} duration  ms
 * @param {number} decimals  fractional digits to keep
 * @returns {number} the current animated value
 */
export function useCountUp(target = 0, duration = 1200, decimals = 0) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const end = Number(target) || 0;

    if (reduce || duration <= 0) {
      setValue(end);
      return;
    }

    const start = performance.now();
    const from = 0;
    const factor = Math.pow(10, decimals);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (end - from) * eased;
      setValue(Math.round(current * factor) / factor);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [target, duration, decimals]);

  return value;
}
