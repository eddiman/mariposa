import styles from './Sidebar.module.css';

interface SidebarAllNotesProps {
  isActive: boolean;
  onTitleClick: () => void;
  onChevronClick: () => void;
}

export function SidebarAllNotes({
  isActive,
  onTitleClick,
  onChevronClick,
}: SidebarAllNotesProps) {
  return (
    <div className={styles['sidebar-allnotes-wrapper']}>
      {/* Main row */}
      <div className={`${styles['sidebar-allnotes-row']} ${isActive ? styles.active : ''}`}>
        <button
          className={styles['sidebar-allnotes-title']}
          onClick={onTitleClick}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          <span className={styles['sidebar-allnotes-text']}>Home</span>
        </button>

        <button
          className={styles['sidebar-allnotes-chevron']}
          onClick={onChevronClick}
          aria-label="View all notes"
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <polyline points="9,18 15,12 9,6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
