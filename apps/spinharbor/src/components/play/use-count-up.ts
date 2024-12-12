'use client';
import * as React from 'react';

/** Animates a number from 0 to `target` over `durationMs` using requestAnimationFrame; skips straight to the end when motion is reduced. */
export function useCountUp(reducedMotion: boolean) {
  const [value, setValue] = React.useState<number | null>(null);
  const frame = React.useRef<number | null>(null);
  const done = React.useRef<(() => void) | null>(null);

  const cancel = React.useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    done.current = null;
  }, []);

  React.useEffect(() => cancel, [cancel]);

  const start = React.useCallback(
    (target: number, durationMs: number, onDone: () => void) => {
      cancel();
      if (reducedMotion) {
        setValue(target);
        onDone();
        return;
      }
      done.current = onDone;
      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(progress < 1 ? Math.round(eased * target * 100) / 100 : target);
        if (progress < 1) {
          frame.current = requestAnimationFrame(tick);
        } else {
          frame.current = null;
          const callback = done.current;
          done.current = null;
          callback?.();
        }
      };
      frame.current = requestAnimationFrame(tick);
    },
    [cancel, reducedMotion],
  );

  return { value, start, cancel };
}
