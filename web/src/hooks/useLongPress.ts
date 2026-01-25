import { useCallback, useRef } from 'react';

interface LongPressPosition {
  clientX: number;
  clientY: number;
}

interface LongPressOptions {
  delay?: number;
  onLongPress: (position: LongPressPosition) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

export function useLongPress({
  delay = 500,
  onLongPress,
  onTouchStart,
  onTouchEnd,
}: LongPressOptions) {
  const timerRef = useRef<number | null>(null);
  const touchStartPos = useRef<LongPressPosition | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Ignore multi-touch (handled separately for two-finger tap)
      if (e.touches.length > 1) {
        clear();
        return;
      }

      longPressTriggeredRef.current = false;
      
      // Capture position immediately - the event will be stale when timeout fires
      const position: LongPressPosition = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
      };
      touchStartPos.current = position;

      timerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        onLongPress(position);
      }, delay);

      onTouchStart?.(e);
    },
    [delay, onLongPress, onTouchStart, clear]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartPos.current) return;

      const moveThreshold = 10;
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.clientX);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.clientY);

      // Cancel long-press if finger moved too much
      if (dx > moveThreshold || dy > moveThreshold) {
        clear();
      }
    },
    [clear]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      clear();
      onTouchEnd?.(e);
    },
    [clear, onTouchEnd]
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    longPressTriggeredRef,
  };
}
