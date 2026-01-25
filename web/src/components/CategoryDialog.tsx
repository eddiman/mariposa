import { useState, useCallback, useEffect, useRef } from 'react';
import type { CategoryMeta } from '../types';

type DialogMode = 'select' | 'create' | 'delete';

interface CategoryDialogProps {
  open: boolean;
  mode: DialogMode;
  categories: CategoryMeta[];
  currentCategory?: string;
  categoryToDelete?: CategoryMeta | null;
  onSelect?: (categorySlug: string) => void;
  onCreate?: (slug: string, displayName: string) => void;
  onDelete?: (categorySlug: string, moveNotesTo?: string) => void;
  onClose: () => void;
}

export function CategoryDialog({
  open,
  mode,
  categories,
  currentCategory,
  categoryToDelete,
  onSelect,
  onCreate,
  onDelete,
  onClose,
}: CategoryDialogProps) {
  const [search, setSearch] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [moveToCategory, setMoveToCategory] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setDisplayName('');
      setSlug('');
      setMoveToCategory('');
      // Focus input after a small delay for animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Auto-generate slug from display name
  useEffect(() => {
    if (mode === 'create') {
      const generatedSlug = displayName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [displayName, mode]);

  const filteredCategories = categories.filter(cat => {
    if (cat.name === currentCategory) return false; // Don't show current category
    if (!search) return true;
    return cat.displayName.toLowerCase().includes(search.toLowerCase()) ||
           cat.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = useCallback((categorySlug: string) => {
    onSelect?.(categorySlug);
    onClose();
  }, [onSelect, onClose]);

  const handleCreate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !slug.trim()) return;
    onCreate?.(slug, displayName.trim());
    onClose();
  }, [displayName, slug, onCreate, onClose]);

  const handleDelete = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToDelete) return;
    onDelete?.(categoryToDelete.name, moveToCategory || undefined);
    onClose();
  }, [categoryToDelete, moveToCategory, onDelete, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="category-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="category-dialog">
        {mode === 'select' && (
          <>
            <div className="category-dialog-header">
              <h3>Move to Category</h3>
              <button className="category-dialog-close" onClick={onClose}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div className="category-dialog-search">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="category-dialog-input"
              />
            </div>
            
            <div className="category-dialog-list">
              {/* All Notes option */}
              <button
                className={`category-dialog-item ${currentCategory === 'all-notes' ? 'disabled' : ''}`}
                onClick={() => handleSelect('all-notes')}
                disabled={currentCategory === 'all-notes'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
                <span>All Notes</span>
              </button>
              
              {filteredCategories.map(cat => (
                <button
                  key={cat.name}
                  className="category-dialog-item"
                  onClick={() => handleSelect(cat.name)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                  </svg>
                  <span>{cat.displayName}</span>
                </button>
              ))}
              
              {filteredCategories.length === 0 && search && (
                <div className="category-dialog-empty">No categories found</div>
              )}
            </div>
          </>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate}>
            <div className="category-dialog-header">
              <h3>Create Category</h3>
              <button type="button" className="category-dialog-close" onClick={onClose}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div className="category-dialog-form">
              <label className="category-dialog-label">
                Name
                <input
                  ref={inputRef}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Personal Notes"
                  className="category-dialog-input"
                  required
                />
              </label>
            </div>
            
            <div className="category-dialog-actions">
              <button type="button" className="category-dialog-btn secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="category-dialog-btn primary" disabled={!displayName.trim() || !slug.trim()}>
                Create
              </button>
            </div>
          </form>
        )}

        {mode === 'delete' && categoryToDelete && (
          <form onSubmit={handleDelete}>
            <div className="category-dialog-header">
              <h3>Delete Category</h3>
              <button type="button" className="category-dialog-close" onClick={onClose}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div className="category-dialog-message">
              <p>
                Are you sure you want to delete <strong>{categoryToDelete.displayName}</strong>?
              </p>
              {categoryToDelete.noteCount > 0 && (
                <p className="category-dialog-warning">
                  This category contains <strong>{categoryToDelete.noteCount}</strong> note{categoryToDelete.noteCount !== 1 ? 's' : ''}.
                  Where should they be moved?
                </p>
              )}
            </div>
            
            {categoryToDelete.noteCount > 0 && (
              <div className="category-dialog-form">
                <label className="category-dialog-label">
                  Move notes to:
                  <select
                    value={moveToCategory}
                    onChange={(e) => setMoveToCategory(e.target.value)}
                    className="category-dialog-select"
                    required
                  >
                    <option value="">Select a category...</option>
                    <option value="all-notes">All Notes</option>
                    {categories
                      .filter(c => c.name !== categoryToDelete.name)
                      .map(cat => (
                        <option key={cat.name} value={cat.name}>
                          {cat.displayName}
                        </option>
                      ))
                    }
                  </select>
                </label>
              </div>
            )}
            
            <div className="category-dialog-actions">
              <button type="button" className="category-dialog-btn secondary" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="category-dialog-btn danger"
                disabled={categoryToDelete.noteCount > 0 && !moveToCategory}
              >
                Delete
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
