import { useEffect, useState } from 'react';
import { isTouchDevice } from '../utils/platform.js';

interface PlacementHintProps {
  visible: boolean;
}

export function PlacementHint({ visible }: PlacementHintProps) {
  const [show, setShow] = useState(false);
  const isTouch = isTouchDevice();

  useEffect(() => {
    if (visible && isTouch) {
      setShow(true);
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, isTouch]);

  // Only show on touch devices
  if (!isTouch || !show) return null;

  return (
    <div className="placement-hint">
      <span className="placement-hint-text">Tap to place note</span>
    </div>
  );
}
