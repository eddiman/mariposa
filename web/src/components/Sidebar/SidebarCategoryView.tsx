import { useState, useRef, useEffect } from 'react';
import { SidebarNoteItem } from './SidebarNoteItem.js';
import type { CategoryMeta, NoteMeta } from '../../types/index.js';
import styles from './Sidebar.module.css';

interface SidebarCategoryViewProps {
  category: CategoryMeta;
  notes: NoteMeta[] | null;
  isLoading: boolean;
  onBack: () => void;
  onNoteTitleClick: (slug: string) => void;
  onNoteChevronClick: (slug: string) => void;
  onAddNote: () => void;
  onRenameCategory: () => void;
  onDeleteCategory: () => void;
}

export function SidebarCategoryView({
  category,
  notes,
  isLoading,
  onBack,
  onNoteTitleClick,
  onNoteChevronClick,
  onAddNote,
  onRenameCategory,
  onDeleteCategory,
}: SidebarCategoryViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleRename = () => {
    setMenuOpen(false);
    onRenameCategory();
  };

  const handleDelete = () => {
    setMenuOpen(false);
    onDeleteCategory();
  };

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
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          <span className={styles['sidebar-category-view-name']}>{category.displayName}</span>
          <span className={styles['sidebar-category-view-count']}>{category.noteCount}</span>
        </div>
        
        {/* Dot menu */}
        <div className={styles['sidebar-category-view-menu']} ref={menuRef}>
          <button
            className={styles['sidebar-category-view-menu-btn']}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Category options"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          
          {menuOpen && (
            <div className={styles['sidebar-category-view-dropdown']}>
              <button className={styles['sidebar-category-view-dropdown-item']} onClick={handleRename}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Rename</span>
              </button>
              <button className={`${styles['sidebar-category-view-dropdown-item']} ${styles.danger}`} onClick={handleDelete}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notes list */}
      <div className={styles['sidebar-category-view-content']}>
        {isLoading ? (
          <div className={styles['sidebar-category-view-loading']}>Loading notes...</div>
        ) : (
          <>
            {notes && notes.length > 0 ? (
              <div className={styles['sidebar-category-view-notes']}>
                {notes.map((note) => (
                  <SidebarNoteItem
                    key={note.slug}
                    note={note}
                    onTitleClick={() => onNoteTitleClick(note.slug)}
                    onChevronClick={() => onNoteChevronClick(note.slug)}
                  />
                ))}
              </div>
            ) : (
              <div className={styles['sidebar-category-view-empty']}>
                No notes in this category
              </div>
            )}
            <button className={styles['sidebar-add-note']} onClick={onAddNote}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add note</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
