import { useCallback } from 'react';
import { isMobileViewport } from '../utils/platform.js';
import type { CategoryMeta } from '../types';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  categories: CategoryMeta[];
  currentSpace: string | null;
  onSpaceChange: (space: string | null) => void;
  onSettingsClick: () => void;
  onCreateCategory: () => void;
  onDeleteCategory: (category: CategoryMeta) => void;
  loading?: boolean;
}

export function Sidebar({
  open,
  onToggle,
  categories,
  currentSpace,
  onSpaceChange,
  onSettingsClick,
  onCreateCategory,
  onDeleteCategory,
  loading = false,
}: SidebarProps) {

  const handleCategoryClick = useCallback((categoryName: string | null) => {
    onSpaceChange(categoryName);
    // Auto-close sidebar on mobile after navigation
    if (isMobileViewport() && open) {
      onToggle();
    }
  }, [onSpaceChange, open, onToggle]);

  const handleSettingsClick = useCallback(() => {
    onSettingsClick();
    // Auto-close sidebar on mobile when opening settings
    if (isMobileViewport() && open) {
      onToggle();
    }
  }, [onSettingsClick, open, onToggle]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, category: CategoryMeta) => {
    e.stopPropagation();
    onDeleteCategory(category);
  }, [onDeleteCategory]);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      {/* Toggle button - morphs into sidebar header */}
      <button 
        className="sidebar-toggle-btn"
        onClick={onToggle}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      >
        <svg 
          className="sidebar-toggle-icon" 
          width="22" 
          height="22" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          {open ? (
            // X icon when open
            <path d="M18 6L6 18M6 6l12 12"/>
          ) : (
            // Sidebar icon when closed
            <>
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18"/>
            </>
          )}
        </svg>
      </button>

      {/* Sidebar content - only visible when open */}
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Mariposa</h2>
        </div>

        <nav className="sidebar-nav">
          {loading ? (
            <div className="sidebar-loading">Loading...</div>
          ) : (
            <>
              {/* All Notes (uncategorized) */}
              <button
                className={`sidebar-item ${currentSpace === null ? 'active' : ''}`}
                onClick={() => handleCategoryClick(null)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
                <span className="sidebar-item-text">All Notes</span>
              </button>

              {/* Categories (exclude all-notes - shown as "All Notes" above) */}
              {categories
                .filter(category => category.name !== 'all-notes')
                .map(category => (
                <div key={category.name} className="sidebar-item-wrapper">
                  <button
                    className={`sidebar-item ${currentSpace === category.name ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                    </svg>
                    <span className="sidebar-item-text">{category.displayName}</span>
                    <span className="sidebar-item-count">{category.noteCount}</span>
                  </button>
                  <button
                    className="sidebar-item-delete"
                    onClick={(e) => handleDeleteClick(e, category)}
                    aria-label={`Delete ${category.displayName}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}

              {/* Create Category button */}
              <button
                className="sidebar-item sidebar-create"
                onClick={onCreateCategory}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v8M8 12h8"/>
                </svg>
                <span className="sidebar-item-text">New Category</span>
              </button>
            </>
          )}
        </nav>

        {/* Settings at bottom */}
        <div className="sidebar-footer">
          <button className="sidebar-item" onClick={handleSettingsClick}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path 
                d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M16.167 12.5a1.375 1.375 0 00.275 1.517l.05.05a1.667 1.667 0 11-2.359 2.358l-.05-.05a1.375 1.375 0 00-1.516-.275 1.375 1.375 0 00-.834 1.258v.142a1.667 1.667 0 11-3.333 0v-.075a1.375 1.375 0 00-.9-1.258 1.375 1.375 0 00-1.517.275l-.05.05a1.667 1.667 0 11-2.358-2.359l.05-.05a1.375 1.375 0 00.275-1.516 1.375 1.375 0 00-1.258-.834H2.5a1.667 1.667 0 010-3.333h.075a1.375 1.375 0 001.258-.9 1.375 1.375 0 00-.275-1.517l-.05-.05a1.667 1.667 0 112.359-2.358l.05.05a1.375 1.375 0 001.516.275h.067a1.375 1.375 0 00.833-1.258V2.5a1.667 1.667 0 013.334 0v.075a1.375 1.375 0 00.833 1.258 1.375 1.375 0 001.517-.275l.05-.05a1.667 1.667 0 112.358 2.359l-.05.05a1.375 1.375 0 00-.275 1.516v.067a1.375 1.375 0 001.258.833h.142a1.667 1.667 0 010 3.334h-.075a1.375 1.375 0 00-1.258.833z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="sidebar-item-text">Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
