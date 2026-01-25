import { useEffect, useCallback } from 'react';
import type { Settings } from '../hooks/useSettings';

interface SettingsDialogProps {
  open: boolean;
  settings: Settings;
  onSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onClose: () => void;
}

export function SettingsDialog({
  open,
  settings,
  onSettingChange,
  onClose,
}: SettingsDialogProps) {
  // Handle Escape key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown, { capture: true });
      return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3 className="settings-section-title">Canvas</h3>
            
            <label className="settings-toggle">
              <span className="settings-toggle-label">
                <span className="settings-toggle-title">Snap to object</span>
                <span className="settings-toggle-description">
                  Automatically align items to nearby objects while dragging
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.snapToObject}
                onChange={e => onSettingChange('snapToObject', e.target.checked)}
              />
              <span className="settings-toggle-switch" />
            </label>
            
            <label className="settings-toggle">
              <span className="settings-toggle-label">
                <span className="settings-toggle-title">Show snap lines</span>
                <span className="settings-toggle-description">
                  Display alignment guides when snapping to objects
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.showSnapLines}
                onChange={e => onSettingChange('showSnapLines', e.target.checked)}
              />
              <span className="settings-toggle-switch" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
