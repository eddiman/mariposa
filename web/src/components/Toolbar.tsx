interface ToolbarProps {
  isPlacementMode: boolean;
  onTogglePlacementMode: () => void;
}

export function Toolbar({ isPlacementMode, onTogglePlacementMode }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button
        className={`toolbar-button create-note ${isPlacementMode ? 'active' : ''}`}
        onClick={onTogglePlacementMode}
        title={isPlacementMode ? 'Cancel placement' : 'Create new note'}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ 
            transform: isPlacementMode ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
