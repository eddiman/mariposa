import { useEffect, useState } from 'react';
import { isTouchDevice } from '../utils/platform.js';

interface GhostNoteProps {
  visible: boolean;
}

export function GhostNote({ visible }: GhostNoteProps) {
  const [position, setPosition] = useState(() => ({
    x: window.innerWidth ,
    y: window.innerHeight ,
  }));
  const isTouch = isTouchDevice();
  const posOffset = 25;

  // Track mouse position on desktop
  useEffect(() => {
    if (!visible || isTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX-posOffset, y: e.clientY-posOffset });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [visible, isTouch]);

  // Don't render on touch devices or when not visible
  if (!visible || isTouch) return null;

  // Offset to position cursor at top-left corner of ghost
  const offsetX = 20;
  const offsetY = 20;

  return (
    <div
      className="ghost-note"
      style={{
        left: position.x + offsetX,
        top: position.y + offsetY,
      }}
    >
      <div className="ghost-note-paper">
        <h3 className="ghost-note-title">Untitled Note</h3>
        <p className="ghost-note-hint">Click to place</p>
      </div>
    </div>
  );
}
