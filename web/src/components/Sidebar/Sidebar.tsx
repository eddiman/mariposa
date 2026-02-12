import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { isMobileViewport } from '../../utils/platform.js';
import { useCategoryNotes } from '../../hooks/useCategoryNotes.js';
import { SidebarAllNotes } from './SidebarAllNotes.js';
import { SidebarCategoryItem } from './SidebarCategoryItem.js';
import { SidebarCategoryView } from './SidebarCategoryView.js';
import { SidebarAllNotesView } from './SidebarAllNotesView.js';
import type { CategoryMeta, NoteMeta, Section } from '../../types';
import styles from './Sidebar.module.css';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  categories: CategoryMeta[];
  sections?: Section[];
  currentSpace: string | null;
  onSpaceChange: (space: string | null) => void;
  onSettingsClick: () => void;
  onCreateCategory: () => void;
  onRenameCategory: (category: CategoryMeta) => void;
  onDeleteCategory: (category: CategoryMeta) => void;
  onNoteClick: (category: string, slug: string) => void;
  onNoteEdit: (slug: string) => void;
  onAddNote: (category: string) => Promise<NoteMeta | null>;
  onSectionClick?: (sectionSlug: string) => void;
  onNoteUpdateRef?: (handler: (slug: string, updates: Partial<NoteMeta>) => void) => void;
  loading?: boolean;
  refetchTrigger?: number;
}

export function Sidebar({
  open,
  onToggle,
  categories,
  sections = [],
  currentSpace,
  onSpaceChange,
  onSettingsClick,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onNoteClick,
  onNoteEdit,
  onAddNote,
  onSectionClick,
  onNoteUpdateRef,
  loading = false,
  refetchTrigger = 0,
}: SidebarProps) {
  // View state: null = main view, 'all-notes' = all notes view, string = category name for category view
  const [activeCategoryView, setActiveCategoryView] = useState<string | null>(null);
  // Track previous view for slide-out animation
  const [previousCategoryView, setPreviousCategoryView] = useState<string | null>(null);
  const isTransitioningRef = useRef(false);
  
  // Only load notes for the active category view (lazy loading)
  const expandedCategoriesSet = useMemo(() => {
    const set = new Set<string>();
    if (activeCategoryView) set.add(activeCategoryView);
    if (previousCategoryView) set.add(previousCategoryView);
    return set;
  }, [activeCategoryView, previousCategoryView]);
  
  const { getNotes, getGroupedNotes, isLoading, addNoteToCategory, updateNoteInCategory } = useCategoryNotes(
    expandedCategoriesSet,
    { refetchTrigger, currentSpace }
  );

  // Expose updateNoteInCategory to parent via ref callback
  useEffect(() => {
    if (onNoteUpdateRef) {
      onNoteUpdateRef(updateNoteInCategory);
    }
  }, [onNoteUpdateRef, updateNoteInCategory]);

  // Get the active category metadata (for regular categories, not 'all-notes')
  const activeCategory = useMemo(() => {
    if (!activeCategoryView || activeCategoryView === 'all-notes') return null;
    return categories.find(c => c.name === activeCategoryView) || null;
  }, [activeCategoryView, categories]);

  // Get the previous category metadata for slide-out animation
  const previousCategory = useMemo(() => {
    if (!previousCategoryView || previousCategoryView === 'all-notes') return null;
    return categories.find(c => c.name === previousCategoryView) || null;
  }, [previousCategoryView, categories]);

  // Reset drilldown view when the active category is deleted
  useEffect(() => {
    if (activeCategoryView && activeCategoryView !== 'all-notes') {
      const categoryExists = categories.some(c => c.name === activeCategoryView);
      if (!categoryExists && !loading) {
        // Category was deleted, go back to main view
        setActiveCategoryView(null);
        setPreviousCategoryView(null);
      }
    }
  }, [activeCategoryView, categories, loading]);

  const handleCategoryChevronClick = useCallback((categoryName: string) => {
    setActiveCategoryView(categoryName);
  }, []);

  const handleAllNotesChevronClick = useCallback(() => {
    setActiveCategoryView('all-notes');
  }, []);

  const handleBackToMain = useCallback(() => {
    // Store the current view as previous for slide-out animation
    setPreviousCategoryView(activeCategoryView);
    isTransitioningRef.current = true;
    setActiveCategoryView(null);
    
    // Clear previous view after animation completes
    setTimeout(() => {
      setPreviousCategoryView(null);
      isTransitioningRef.current = false;
    }, 250); // Match transition duration
  }, [activeCategoryView]);

  const handleCategoryTitleClick = useCallback((categoryName: string | null) => {
    onSpaceChange(categoryName);
    setActiveCategoryView(categoryName);
    // Auto-close sidebar on mobile after navigation
    if (isMobileViewport() && open) {
      onToggle();
    }
  }, [onSpaceChange, open, onToggle]);

  const handleNoteTitleClick = useCallback((category: string, slug: string) => {
    onNoteClick(category, slug);

    // Auto-close sidebar on mobile after navigation
    if (isMobileViewport() && open) {
      onToggle();
    }
  }, [onNoteClick, open, onToggle]);

  const handleNoteChevronClick = useCallback((slug: string) => {
    onNoteEdit(slug);
  }, [onNoteEdit]);

  const handleAddNote = useCallback(async (category: string) => {
    const newNote = await onAddNote(category);
    if (newNote) {
      addNoteToCategory(newNote);
    }
  }, [onAddNote, addNoteToCategory]);

  const handleSettingsClick = useCallback(() => {
    onSettingsClick();
    // Auto-close sidebar on mobile when opening settings
    if (isMobileViewport() && open) {
      onToggle();
    }
  }, [onSettingsClick, open, onToggle]);

  // Determine if we're in a drilldown view
  const isInDrilldown = activeCategoryView !== null;

  // Render the drilldown content (category or all-notes view)
  // Also renders previous view during slide-out transition
  const renderDrilldownContent = () => {
    if (loading) {
      return <div className={styles['sidebar-loading']}>Loading...</div>;
    }

    // Determine which view to render (active or previous during transition)
    const viewToRender = activeCategoryView || previousCategoryView;
    const categoryToRender = activeCategory || previousCategory;

    // All Notes drilldown view
    if (viewToRender === 'all-notes') {
      return (
        <SidebarAllNotesView
          groupedNotes={getGroupedNotes()}
          isLoading={isLoading('all-notes')}
          onBack={handleBackToMain}
          onNoteTitleClick={handleNoteTitleClick}
          onNoteChevronClick={handleNoteChevronClick}
        />
      );
    }

    // Category drilldown view
    if (viewToRender && categoryToRender) {
      // Filter sections for this category
      const categorySections = sections.filter(s => s.category === viewToRender);
      
      return (
        <SidebarCategoryView
          category={categoryToRender}
          notes={getNotes(viewToRender)}
          sections={categorySections}
          isLoading={isLoading(viewToRender)}
          onBack={handleBackToMain}
          onNoteTitleClick={(slug) => handleNoteTitleClick(viewToRender, slug)}
          onNoteChevronClick={handleNoteChevronClick}
          onSectionClick={onSectionClick}
          onAddNote={() => handleAddNote(viewToRender)}
          onRenameCategory={() => onRenameCategory(categoryToRender)}
          onDeleteCategory={() => onDeleteCategory(categoryToRender)}
        />
      );
    }

    return null;
  };

  // Render the main view (categories list)
  const renderMainContent = () => {
    if (loading) {
      return <div className={styles['sidebar-loading']}>Loading...</div>;
    }

    return (
      <>
        {/* All Notes */}
        <SidebarAllNotes
          isActive={currentSpace === null}
          onTitleClick={() => handleCategoryTitleClick(null)}
          onChevronClick={handleAllNotesChevronClick}
        />

        {/* Categories (exclude all-notes - shown as "All Notes" above) */}
        {categories
          .filter(category => category.name !== 'all-notes')
          .map(category => (
            <SidebarCategoryItem
              key={category.name}
              category={category}
              isActive={currentSpace === category.name}
              onTitleClick={() => handleCategoryTitleClick(category.name)}
              onChevronClick={() => handleCategoryChevronClick(category.name)}
            />
          ))}

        {/* Create Category button */}
        <button
          className={`${styles['sidebar-item']} ${styles['sidebar-create']}`}
          onClick={onCreateCategory}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
          <span className={styles['sidebar-item-text']}>New Category</span>
        </button>
      </>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
      {/* Toggle button - morphs into sidebar header */}
      <button 
        className={styles['sidebar-toggle-btn']}
        onClick={onToggle}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      >
        <svg 
          className={styles['sidebar-toggle-icon']} 
          width="22" 
          height="22" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          {open ? (
            // Filled sidebar icon when open (panel highlighted)
            <>
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <rect x="3" y="3" width="6" height="18" rx="1" fill="currentColor" stroke="none"/>
              <path d="M9 3v18"/>
            </>
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
      <div className={styles['sidebar-content']}>
        <div className={styles['sidebar-header']}>
          <h2 className={styles['sidebar-title']}>Mariposa</h2>
        </div>

        <nav className={styles['sidebar-nav']}>
          {/* Sliding panels container */}
          <div className={`${styles['sidebar-panels']} ${isInDrilldown ? styles.drilldown : ''}`}>
            {/* Main panel - categories list */}
            <div className={`${styles['sidebar-panel']} ${styles['sidebar-panel-main']}`}>
              {renderMainContent()}
            </div>
            
            {/* Drilldown panel - notes list */}
            <div className={`${styles['sidebar-panel']} ${styles['sidebar-panel-drilldown']}`}>
              {(isInDrilldown || previousCategoryView) && renderDrilldownContent()}
            </div>
          </div>
        </nav>

        {/* Settings at bottom */}
        <div className={styles['sidebar-footer']}>
          <button className={styles['sidebar-item']} onClick={handleSettingsClick}>
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
            <span className={styles['sidebar-item-text']}>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
