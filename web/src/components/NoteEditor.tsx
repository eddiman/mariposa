import { useEffect, useState, useCallback, useRef } from 'react';
import { Editor } from './Editor';
import { Dialog } from './Dialog';
import { TagInput } from './TagInput';
import type { Note, CategoryMeta } from '../types';
import type { OriginRect } from './Canvas';

interface NoteEditorProps {
  slug: string;
  originRect: OriginRect | null;
  categories: CategoryMeta[];
  initialNote?: Note | null; // Optional - skip loading if provided
  onClose: () => void;
  onSave: (slug: string, content: string, title: string, tags: string[]) => Promise<void>;
  onDelete: (slug: string) => Promise<void>;
  onMoveToCategory: (slug: string, category: string) => Promise<Note | null>;
  getNote: (slug: string) => Promise<Note | null>;
}

const AUTOSAVE_DELAY = 1500; // 1.5 seconds after user stops typing

export function NoteEditor({ slug, originRect, categories, initialNote, onClose, onSave, onDelete, onMoveToCategory, getNote }: NoteEditorProps) {
  const [note, setNote] = useState<Note | null>(initialNote || null);
  const [loading, setLoading] = useState(!initialNote);
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [tags, setTags] = useState<string[]>(initialNote?.tags || []);
  const [category, setCategory] = useState(initialNote?.category || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Refs to track latest values for autosave
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const tagsRef = useRef(tags);
  const hasChangesRef = useRef(hasChanges);
  const savingRef = useRef(saving);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { tagsRef.current = tags; }, [tags]);
  useEffect(() => { hasChangesRef.current = hasChanges; }, [hasChanges]);
  useEffect(() => { savingRef.current = saving; }, [saving]);

  // Trigger expand animation on mount
  useEffect(() => {
    // Small delay to ensure initial styles are applied before animation
    const timer = requestAnimationFrame(() => {
      setIsExpanded(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    // Skip loading if we already have the note from initialNote
    if (initialNote) return;
    
    const loadNote = async () => {
      setLoading(true);
      const fetchedNote = await getNote(slug);
      if (fetchedNote) {
        setNote(fetchedNote);
        setTitle(fetchedNote.title);
        setContent(fetchedNote.content);
        setTags(fetchedNote.tags || []);
        setCategory(fetchedNote.category || 'all-notes');
      }
      setLoading(false);
    };
    loadNote();
  }, [slug, getNote, initialNote]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!categoryDropdownOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [categoryDropdownOpen]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  }, []);

  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChangesRef.current || savingRef.current) return;
    setSaving(true);
    try {
      await onSave(slug, contentRef.current, titleRef.current, tagsRef.current);
      setHasChanges(false);
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  }, [slug, onSave]);

  // Debounced autosave
  useEffect(() => {
    if (!hasChanges || saving) return;

    const timer = setTimeout(() => {
      handleSave();
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [hasChanges, saving, title, content, tags, handleSave]);

  const handleClose = useCallback(() => {
    if (hasChangesRef.current && !savingRef.current) {
      // Save before closing if there are unsaved changes
      setSaving(true);
      onSave(slug, contentRef.current, titleRef.current, tagsRef.current).finally(() => {
        setSaving(false);
        setIsClosing(true);
        setIsExpanded(false);
        setTimeout(onClose, 300);
      });
    } else {
      setIsClosing(true);
      setIsExpanded(false);
      setTimeout(onClose, 300);
    }
  }, [slug, onSave, onClose]);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteDialogOpen(false);
    await onDelete(slug);
    onClose();
  }, [slug, onDelete, onClose]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const handleCategorySelect = useCallback(async (newCategory: string) => {
    setCategoryDropdownOpen(false);
    if (newCategory === category) return;
    
    // Save any pending changes first
    if (hasChangesRef.current && !savingRef.current) {
      setSaving(true);
      await onSave(slug, contentRef.current, titleRef.current, tagsRef.current);
      setHasChanges(false);
      setSaving(false);
    }
    
    // Move to new category
    const result = await onMoveToCategory(slug, newCategory);
    if (result) {
      setCategory(newCategory);
      // Close the editor since the note is now in a different category
      setIsClosing(true);
      setIsExpanded(false);
      setTimeout(onClose, 300);
    }
  }, [slug, category, onSave, onMoveToCategory, onClose]);

  // Get display name for current category
  const getCategoryDisplayName = (catSlug: string) => {
    if (catSlug === 'all-notes') return 'All Notes';
    const cat = categories.find(c => c.name === catSlug);
    return cat?.displayName || catSlug;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    } else if (isThisYear) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };

  // Handle Escape key and Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if delete dialog is open
      if (deleteDialogOpen) return;
      
      if (e.key === 'Escape') {
        if (categoryDropdownOpen) {
          setCategoryDropdownOpen(false);
        } else {
          handleClose();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handleSave, deleteDialogOpen, categoryDropdownOpen]);

  // Calculate initial transform based on originRect
  const getInitialStyle = () => {
    if (!originRect || isExpanded) {
      return {};
    }
    
    // Calculate scale and position to match origin card
    const targetWidth = window.innerWidth;
    const targetHeight = window.innerHeight;
    const scaleX = originRect.width / targetWidth;
    const scaleY = originRect.height / targetHeight;
    
    // Calculate translate to position at origin
    const translateX = originRect.x + originRect.width / 2 - targetWidth / 2;
    const translateY = originRect.y + originRect.height / 2 - targetHeight / 2;
    
    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
      borderRadius: '16px',
    };
  };

  if (loading) {
    return (
      <div className={`note-editor-fullscreen ${isExpanded ? 'expanded' : ''}`} style={getInitialStyle()}>
        <div className="note-editor-loading-state">Loading...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className={`note-editor-fullscreen ${isExpanded ? 'expanded' : ''}`} style={getInitialStyle()}>
        <div className="note-editor-error-state">
          <p>Note not found</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`note-editor-fullscreen ${isExpanded ? 'expanded' : ''} ${isClosing ? 'closing' : ''}`}
      style={isExpanded ? {} : getInitialStyle()}
    >
      {/* Fixed header with back button and toolbar */}
      <div className="note-editor-topbar">
        <button className="note-editor-back" onClick={handleClose} title="Close (Esc)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <div className="note-editor-status">
          {saving && <span className="note-editor-saving">Saving...</span>}
          {!saving && hasChanges && <span className="note-editor-unsaved">Unsaved</span>}
          {!saving && !hasChanges && lastSaved && <span className="note-editor-saved">Saved</span>}
        </div>

        <button 
          className="note-editor-delete"
          onClick={handleDeleteClick}
          title="Delete note"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>

      {/* Content area */}
      <div className="note-editor-content">
        <div className="note-editor-paper">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="note-editor-title"
            placeholder="Untitled"
          />
          
          {/* Category selector */}
          <div className="note-editor-category-row">
            <div className="note-editor-category-wrapper" ref={categoryDropdownRef}>
              <button 
                className="note-editor-category-btn"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
                <span>{getCategoryDisplayName(category)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              
              {categoryDropdownOpen && (
                <div className="note-editor-category-dropdown">
                  <button
                    className={`note-editor-category-option ${category === 'all-notes' ? 'active' : ''}`}
                    onClick={() => handleCategorySelect('all-notes')}
                  >
                    All Notes
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.name}
                      className={`note-editor-category-option ${category === cat.name ? 'active' : ''}`}
                      onClick={() => handleCategorySelect(cat.name)}
                    >
                      {cat.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date metadata */}
          <div className="note-editor-dates">
            <span className="note-editor-date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Updated {formatDate(note.updatedAt)}
            </span>
            <span className="note-editor-date-separator">·</span>
            <span className="note-editor-date">
              Created {formatDate(note.createdAt)}
            </span>
          </div>
          
          <div className="note-editor-tags">
            <TagInput
              tags={tags}
              onChange={handleTagsChange}
              placeholder="Add tags..."
            />
          </div>
          <Editor 
            content={content}
            onChange={handleContentChange}
            autoFocus
          />
        </div>
      </div>

      <Dialog
        open={deleteDialogOpen}
        title="Delete Note"
        message={`Are you sure you want to delete "${title || 'Untitled'}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
