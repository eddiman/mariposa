import { useCallback, useEffect, useState, useRef } from 'react';
import type { Note, NotesResponse, NoteCreateInput, NoteUpdateInput, Position } from '../types';

// Debounce helper for position updates
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

interface UseNotesOptions {
  category?: string;
}

interface UseNotesReturn {
  notes: Note[];
  loading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  getNote: (slug: string) => Promise<Note | null>;
  createNote: (input: NoteCreateInput) => Promise<Note | null>;
  updateNote: (slug: string, input: NoteUpdateInput) => Promise<Note | null>;
  updatePosition: (slug: string, position: Position) => void;
  deleteNote: (slug: string) => Promise<boolean>;
  duplicateNote: (slug: string, position: Position) => Promise<Note | null>;
  moveToCategory: (slug: string, category: string) => Promise<Note | null>;
}

export function useNotes(options: UseNotesOptions = {}): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.category) {
        params.set('category', options.category);
      }
      const url = `/api/notes${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NotesResponse = await res.json();
      setNotes(data.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, [options.category]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const getNote = useCallback(async (slug: string): Promise<Note | null> => {
    try {
      const res = await fetch(`/api/notes/${slug}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Failed to get note:', err);
      return null;
    }
  }, []);

  const createNote = useCallback(async (input: NoteCreateInput): Promise<Note | null> => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const note: Note = await res.json();
      // Add new note to local state (no need to refetch)
      setNotes(prev => [...prev, note]);
      return note;
    } catch (err) {
      console.error('Failed to create note:', err);
      return null;
    }
  }, []);

  const updateNote = useCallback(async (slug: string, input: NoteUpdateInput): Promise<Note | null> => {
    try {
      const res = await fetch(`/api/notes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const note: Note = await res.json();
      // Update local state with full note
      setNotes(prev => prev.map(n => 
        n.slug === slug ? note : n
      ));
      return note;
    } catch (err) {
      console.error('Failed to update note:', err);
      return null;
    }
  }, []);

  // Keep track of pending position updates per slug
  const pendingPositions = useRef<Map<string, Position>>(new Map());
  const debouncedSaveRef = useRef<Map<string, ReturnType<typeof debounce>>>(new Map());

  const savePosition = useCallback(async (slug: string) => {
    const position = pendingPositions.current.get(slug);
    if (!position) return;
    
    pendingPositions.current.delete(slug);
    
    try {
      const res = await fetch(`/api/notes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Failed to update position:', err);
      // Revert on failure
      await fetchNotes();
    }
  }, [fetchNotes]);

  const updatePosition = useCallback((slug: string, position: Position): void => {
    // Optimistic update - always immediate
    setNotes(prev => prev.map(n => 
      n.slug === slug ? { ...n, position } : n
    ));

    // Store the latest position for this slug
    pendingPositions.current.set(slug, position);

    // Get or create a debounced save function for this slug
    if (!debouncedSaveRef.current.has(slug)) {
      debouncedSaveRef.current.set(slug, debounce((s: string) => savePosition(s), 300));
    }
    
    const debouncedSave = debouncedSaveRef.current.get(slug)!;
    debouncedSave(slug);
  }, [savePosition]);

  const deleteNote = useCallback(async (slug: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/notes/${slug}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Remove from local state
      setNotes(prev => prev.filter(n => n.slug !== slug));
      return true;
    } catch (err) {
      console.error('Failed to delete note:', err);
      return false;
    }
  }, []);

  const duplicateNote = useCallback(async (slug: string, position: Position): Promise<Note | null> => {
    try {
      // First get the original note
      const originalNote = await getNote(slug);
      if (!originalNote) return null;

      // Create a new note with the same content but new position
      const newNote = await createNote({
        title: `${originalNote.title} (copy)`,
        content: originalNote.content,
        category: originalNote.category,
        tags: originalNote.tags,
        position,
      });

      return newNote;
    } catch (err) {
      console.error('Failed to duplicate note:', err);
      return null;
    }
  }, [getNote, createNote]);

  const moveToCategory = useCallback(async (slug: string, category: string): Promise<Note | null> => {
    try {
      const res = await fetch(`/api/notes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const note: Note = await res.json();
      // Note will be removed from current view if category changed
      // since we filter by category
      setNotes(prev => prev.filter(n => n.slug !== slug));
      return note;
    } catch (err) {
      console.error('Failed to move note to category:', err);
      return null;
    }
  }, []);

  return {
    notes,
    loading,
    error,
    fetchNotes,
    getNote,
    createNote,
    updateNote,
    updatePosition,
    deleteNote,
    duplicateNote,
    moveToCategory,
  };
}
