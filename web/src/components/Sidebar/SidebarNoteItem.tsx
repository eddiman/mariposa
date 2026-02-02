import type { NoteMeta } from '../../types/index.js';
import styles from './Sidebar.module.css';

interface SidebarNoteItemProps {
  note: NoteMeta;
  onTitleClick: () => void;
  onChevronClick: () => void;
}

export function SidebarNoteItem({
  note,
  onTitleClick,
  onChevronClick,
}: SidebarNoteItemProps) {
  return (
    <div className={styles['sidebar-note-item']}>
      <button
        className={styles['sidebar-note-title']}
        onClick={onTitleClick}
        title={note.title}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span className={styles['sidebar-note-text']}>{note.title}</span>
      </button>
      <button
        className={styles['sidebar-note-chevron']}
        onClick={onChevronClick}
        aria-label={`Edit ${note.title}`}
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
  );
}
