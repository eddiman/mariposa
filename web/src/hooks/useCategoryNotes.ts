import { useState, useEffect, useCallback, useRef } from 'react';
import type { NoteMeta } from '../types/index.js';

interface CategoryNotesState {
  notesByCategory: Map<string, NoteMeta[]>;
  loadingCategories: Set<string>;
}

interface UseCategoryNotesOptions {
  refetchTrigger?: number;
  currentSpace?: string | null;
}

/**
 * Fetches and caches notes for expanded categories.
 * Lazy loads notes when a category is expanded.
 * For 'all-notes', fetches all notes and groups by category.
 */
export function useCategoryNotes(expandedCategories: Set<string>, options: UseCategoryNotesOptions = {}) {
  const { refetchTrigger, currentSpace } = options;
  
  const [state, setState] = useState<CategoryNotesState>({
    notesByCategory: new Map(),
    loadingCategories: new Set(),
  });

  // Track which categories we've already fetched
  const fetchedRef = useRef<Set<string>>(new Set());
  // Track loading state separately for dependency management
  const loadingRef = useRef<Set<string>>(new Set());

  const fetchNotesForCategory = useCallback(async (category: string) => {
    // Skip if already fetched or currently loading
    if (fetchedRef.current.has(category) || loadingRef.current.has(category)) {
      return;
    }

    // Mark as loading
    loadingRef.current.add(category);
    setState((prev) => ({
      ...prev,
      loadingCategories: new Set([...prev.loadingCategories, category]),
    }));

    try {
      let url = '/api/notes';
      if (category !== 'all-notes') {
        url += `?category=${encodeURIComponent(category)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch notes for ${category}`);
      }

      const data = await res.json();
      const notes: NoteMeta[] = data.notes || [];

      // Sort by creation date (newest first)
      notes.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      fetchedRef.current.add(category);

      setState((prev) => {
        const newNotesByCategory = new Map(prev.notesByCategory);
        
        if (category === 'all-notes') {
          // Group notes by category
          const grouped = new Map<string, NoteMeta[]>();
          for (const note of notes) {
            const cat = note.category || 'uncategorized';
            if (!grouped.has(cat)) {
              grouped.set(cat, []);
            }
            grouped.get(cat)!.push(note);
          }
          newNotesByCategory.set('all-notes', notes);
          // Also store grouped data
          for (const [cat, catNotes] of grouped) {
            if (!newNotesByCategory.has(cat)) {
              newNotesByCategory.set(cat, catNotes);
              fetchedRef.current.add(cat);
            }
          }
        } else {
          newNotesByCategory.set(category, notes);
        }

        const newLoading = new Set(prev.loadingCategories);
        newLoading.delete(category);

        return {
          notesByCategory: newNotesByCategory,
          loadingCategories: newLoading,
        };
      });
    } catch (error) {
      console.error(`Error fetching notes for ${category}:`, error);
      
      // Remove from loading state on error
      loadingRef.current.delete(category);
      setState((prev) => {
        const newLoading = new Set(prev.loadingCategories);
        newLoading.delete(category);
        return { ...prev, loadingCategories: newLoading };
      });
    } finally {
      // Always clean up loading state
      loadingRef.current.delete(category);
    }
  }, []);

  // Fetch notes when categories are expanded or when refetch is triggered
  useEffect(() => {
    // Always refetch for current space if refetchTrigger changed
    if (refetchTrigger !== undefined) {
      const spaceToRefetch = currentSpace || 'all-notes';
      // Clear the fetched guard to force a refetch
      fetchedRef.current.delete(spaceToRefetch);
      if (!loadingRef.current.has(spaceToRefetch)) {
        fetchNotesForCategory(spaceToRefetch);
      }
    }
    
    // Also check expanded categories
    for (const category of expandedCategories) {
      if (!fetchedRef.current.has(category) && !loadingRef.current.has(category)) {
        fetchNotesForCategory(category);
      }
    }
  }, [expandedCategories, fetchNotesForCategory, refetchTrigger, currentSpace]);

  const refetch = useCallback((category?: string) => {
    if (category) {
      fetchedRef.current.delete(category);
      loadingRef.current.delete(category);
      if (expandedCategories.has(category)) {
        fetchNotesForCategory(category);
      }
    } else {
      // Refetch all expanded categories
      fetchedRef.current.clear();
      loadingRef.current.clear();
      for (const cat of expandedCategories) {
        fetchNotesForCategory(cat);
      }
    }
  }, [expandedCategories, fetchNotesForCategory]);

  const addNoteToCategory = useCallback((note: NoteMeta) => {
    setState((prev) => {
      const newNotesByCategory = new Map(prev.notesByCategory);
      const category = note.category || 'uncategorized';
      
      // Add to specific category
      const categoryNotes = newNotesByCategory.get(category) || [];
      // Add at beginning (newest first)
      newNotesByCategory.set(category, [note, ...categoryNotes]);
      
      // Always add to all-notes (create if doesn't exist)
      const allNotes = newNotesByCategory.get('all-notes') || [];
      newNotesByCategory.set('all-notes', [note, ...allNotes]);
      
      return { ...prev, notesByCategory: newNotesByCategory };
    });
  }, []);

  const updateNoteInCategory = useCallback((slug: string, updates: Partial<NoteMeta>) => {
    setState((prev) => {
      const newNotesByCategory = new Map(prev.notesByCategory);
      
      // Update note in all categories where it exists
      for (const [category, notes] of newNotesByCategory) {
        const noteIndex = notes.findIndex(n => n.slug === slug);
        if (noteIndex !== -1) {
          const updatedNotes = [...notes];
          updatedNotes[noteIndex] = { ...updatedNotes[noteIndex], ...updates };
          newNotesByCategory.set(category, updatedNotes);
        }
      }
      
      return { ...prev, notesByCategory: newNotesByCategory };
    });
  }, []);

  const isLoading = useCallback(
    (category: string) => state.loadingCategories.has(category),
    [state.loadingCategories]
  );

  const getNotes = useCallback(
    (category: string) => state.notesByCategory.get(category) || null,
    [state.notesByCategory]
  );

  const getGroupedNotes = useCallback(() => {
    const allNotes = state.notesByCategory.get('all-notes');
    if (!allNotes) return null;

    const grouped = new Map<string, NoteMeta[]>();
    for (const note of allNotes) {
      const cat = note.category || 'uncategorized';
      if (!grouped.has(cat)) {
        grouped.set(cat, []);
      }
      grouped.get(cat)!.push(note);
    }
    return grouped;
  }, [state.notesByCategory]);

  return {
    notesByCategory: state.notesByCategory,
    loadingCategories: state.loadingCategories,
    isLoading,
    getNotes,
    getGroupedNotes,
    refetch,
    addNoteToCategory,
    updateNoteInCategory,
  };
}
