interface SpaceSelectorProps {
  spaces: string[];
  currentSpace: string | null;
  onSpaceChange: (space: string | null) => void;
  loading?: boolean;
}

export function SpaceSelector({ spaces, currentSpace, onSpaceChange, loading }: SpaceSelectorProps) {
  if (loading) {
    return <div className="space-selector loading">Loading spaces...</div>;
  }

  return (
    <div className="space-selector">
      <button
        className={`space-button ${currentSpace === null ? 'active' : ''}`}
        onClick={() => onSpaceChange(null)}
      >
        All Notes
      </button>
      {spaces.map(space => (
        <button
          key={space}
          className={`space-button ${currentSpace === space ? 'active' : ''}`}
          onClick={() => onSpaceChange(space)}
        >
          {space}
        </button>
      ))}
    </div>
  );
}
