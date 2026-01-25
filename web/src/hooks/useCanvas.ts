import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CategoryMeta } from '../types';

interface UseCanvasReturn {
  currentSpace: string | null; // null = all spaces (uncategorized)
  categories: CategoryMeta[];
  loadingCategories: boolean;
  setCurrentSpace: (space: string | null) => void;
  focusedNoteSlug: string | null;
  setFocusedNoteSlug: (slug: string | null, category?: string) => void;
  createCategory: (slug: string, displayName: string) => Promise<CategoryMeta | null>;
  updateCategory: (slug: string, displayName: string) => Promise<boolean>;
  deleteCategory: (slug: string, moveNotesTo?: string) => Promise<{ success: boolean; movedNotes?: number }>;
  refetchCategories: () => Promise<void>;
}

export function useCanvas(): UseCanvasReturn {
  const { category, noteSlug } = useParams<{ category?: string; noteSlug?: string }>();
  const navigate = useNavigate();
  
  // Derive state from URL params
  // If category is undefined, we're at "/" (all notes / uncategorized)
  const currentSpace = category || null;
  const focusedNoteSlug = noteSlug || null;
  
  const [categories, setCategories] = useState<CategoryMeta[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories/meta');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const setCurrentSpace = useCallback((space: string | null) => {
    // Navigate to the new space, closing any open note
    if (space === null) {
      navigate('/');
    } else {
      navigate(`/${space}`);
    }
  }, [navigate]);

  const setFocusedNoteSlug = useCallback((slug: string | null, category?: string) => {
    if (slug === null) {
      // Close note - navigate back to category
      if (currentSpace) {
        navigate(`/${currentSpace}`);
      } else {
        navigate('/');
      }
    } else {
      // Open note - navigate to note URL using the note's category
      const noteCategory = category || currentSpace || 'all-notes';
      navigate(`/${noteCategory}/${slug}`);
    }
  }, [navigate, currentSpace]);

  const createCategory = useCallback(async (slug: string, displayName: string): Promise<CategoryMeta | null> => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, displayName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newCategory = await res.json();
      // Refetch to get updated list
      await fetchCategories();
      return newCategory;
    } catch (err) {
      console.error('Failed to create category:', err);
      return null;
    }
  }, [fetchCategories]);

  const updateCategory = useCallback(async (slug: string, displayName: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/categories/${slug}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Update local state
      setCategories(prev => prev.map(c => 
        c.name === slug ? { ...c, displayName } : c
      ));
      return true;
    } catch (err) {
      console.error('Failed to update category:', err);
      return false;
    }
  }, []);

  const deleteCategory = useCallback(async (slug: string, moveNotesTo?: string): Promise<{ success: boolean; movedNotes?: number }> => {
    try {
      const params = moveNotesTo ? `?moveTo=${encodeURIComponent(moveNotesTo)}` : '';
      const res = await fetch(`/api/categories/${slug}${params}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      // Refetch to get updated list
      await fetchCategories();
      return { success: true, movedNotes: result.movedNotes };
    } catch (err) {
      console.error('Failed to delete category:', err);
      return { success: false };
    }
  }, [fetchCategories]);

  return {
    currentSpace,
    categories,
    loadingCategories,
    setCurrentSpace,
    focusedNoteSlug,
    setFocusedNoteSlug,
    createCategory,
    updateCategory,
    deleteCategory,
    refetchCategories: fetchCategories,
  };
}
