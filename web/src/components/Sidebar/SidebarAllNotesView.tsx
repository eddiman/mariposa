import { SidebarNoteItem } from './SidebarNoteItem.js';
import type { NoteMeta } from '../../types/index.js';
import styles from './Sidebar.module.css';

interface SidebarAllNotesViewProps {
  groupedNotes: Map<string, NoteMeta[]> | null;
  isLoading: boolean;
  onBack: () => void;
  onNoteTitleClick: (category: string, slug: string) => void;
  onNoteChevronClick: (slug: string) => void;
}

export function SidebarAllNotesView({
  groupedNotes,
  isLoading,
  onBack,
  onNoteTitleClick,
  onNoteChevronClick,
}: SidebarAllNotesViewProps) {
  // Sort categories alphabetically, but put 'uncategorized' last
  const sortedCategories = groupedNotes
    ? [...groupedNotes.keys()].sort((a, b) => {
        if (a === 'uncategorized') return 1;
        if (b === 'uncategorized') return -1;
        return a.localeCompare(b);
      })
    : [];

  // Count total notes
  const totalNotes = groupedNotes
    ? [...groupedNotes.values()].reduce((sum, notes) => sum + notes.length, 0)
    : 0;

  return (
    <div className={styles['sidebar-category-view']}>
      {/* Header with back button */}
      <div className={styles['sidebar-category-view-header']}>
        <button
          className={styles['sidebar-category-view-back']}
          onClick={onBack}
          aria-label="Back to categories"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
        <div className={styles['sidebar-category-view-title']}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
          </svg>
          <span className={styles['sidebar-category-view-name']}>All Notes</span>
          <span className={styles['sidebar-category-view-count']}>{totalNotes}</span>
        </div>
      </div>

      {/* Notes list grouped by category */}
      <div className={styles['sidebar-category-view-content']}>
        {isLoading ? (
          <div className={styles['sidebar-category-view-loading']}>Loading notes...</div>
        ) : sortedCategories.length === 0 ? (
          <div className={styles['sidebar-category-view-empty']}>No notes yet</div>
        ) : (
          <div className={styles['sidebar-category-view-notes']}>
            {sortedCategories.map((categoryName) => {
              const notes = groupedNotes!.get(categoryName) || [];
              return (
                <div key={categoryName} className={styles['sidebar-allnotes-group']}>
                  <div className={styles['sidebar-allnotes-group-header']}>
                    {categoryName === 'uncategorized' ? 'Uncategorized' : categoryName}
                  </div>
                  {notes.map((note) => (
                    <SidebarNoteItem
                      key={note.slug}
                      note={note}
                      onTitleClick={() => onNoteTitleClick(note.category, note.slug)}
                      onChevronClick={() => onNoteChevronClick(note.slug)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
