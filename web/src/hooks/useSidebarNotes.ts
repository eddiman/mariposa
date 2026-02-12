import { useCallback, useRef } from 'react';
import type { Note, Position } from '../types';
import type { OriginRect, FocusOnNodeOptions } from '../components/Canvas';

const FOCUS_DURATION = 500;

interface UseSidebarNotesOptions {
  notes: Note[];
  currentSpace: string | null;
  focusedNoteSlug: string | null;
  isCreating: boolean;
  setCurrentSpace: (space: string | null) => void;
  setFocusedNoteSlug: (slug: string | null, category?: string) => void;
  setIsCreating: (creating: boolean) => void;
  prepareEditorOpen: (rect: OriginRect, note: Note | null) => void;
  createNote: (input: { title: string; content: string; category: string; position: Position }) => Promise<Note | null>;
  refetchCategories?: () => Promise<void>;
  setRefetchTrigger?: (trigger: number) => void;
}

interface UseSidebarNotesReturn {
  focusOnNodeRef: React.MutableRefObject<((nodeId: string, options?: FocusOnNodeOptions) => void) | null>;
  handleFocusOnNodeRef: (handler: (nodeId: string, options?: FocusOnNodeOptions) => void) => void;
  handleSidebarNoteClick: (category: string, slug: string) => void;
  handleSidebarNoteEdit: (slug: string) => void;
  handleSidebarAddNote: (category: string) => Promise<Note | null>;
}

export function useSidebarNotes({
  notes,
  currentSpace,
  focusedNoteSlug,
  isCreating,
  setCurrentSpace,
  setFocusedNoteSlug,
  setIsCreating,
  prepareEditorOpen,
  createNote,
  refetchCategories,
}: UseSidebarNotesOptions): UseSidebarNotesReturn {
  const focusOnNodeRef = useRef<((nodeId: string, options?: FocusOnNodeOptions) => void) | null>(null);

  const handleFocusOnNodeRef = useCallback((handler: (nodeId: string, options?: FocusOnNodeOptions) => void) => {
    focusOnNodeRef.current = handler;
  }, []);

  // Get origin rect centered on current window
  const getCenteredOriginRect = useCallback((): OriginRect => ({
    x: window.innerWidth / 2 - 100,
    y: window.innerHeight / 2 - 141,
    width: 200,
    height: 283,
  }), []);

  // Open note in editor
  const openNoteInEditor = useCallback((slug: string, category: string, note: Note | null) => {
    prepareEditorOpen(getCenteredOriginRect(), note);
    setFocusedNoteSlug(slug, category);
  }, [prepareEditorOpen, getCenteredOriginRect, setFocusedNoteSlug]);

  // Focus canvas on a node
  const focusOnNode = useCallback((slug: string) => {
    setTimeout(() => {
      if (focusOnNodeRef.current) {
        focusOnNodeRef.current(slug, { zoom: 1, duration: FOCUS_DURATION });
      }
    }, 100);
  }, []);

  // Handle clicking a note in sidebar - focuses on canvas, only opens if already editing
  const handleSidebarNoteClick = useCallback((category: string, slug: string) => {
    // Navigate to the category where the note lives
    const targetCategory = category === 'uncategorized' ? null : category;
    setCurrentSpace(targetCategory);
    
    // Find the note data
    const note = notes.find(n => n.slug === slug);
    const noteCategory = note?.category || category;
    
    // Check if a note is already open
    if (focusedNoteSlug) {
      // Note already open - open new note immediately, focus in background
      openNoteInEditor(slug, noteCategory, note || null);
      focusOnNode(slug);
    } else {
      // No note open - just focus on canvas (pan/zoom + highlight), do NOT open
      focusOnNode(slug);
    }
  }, [setCurrentSpace, notes, focusedNoteSlug, openNoteInEditor, focusOnNode]);

  // Handle edit button click in sidebar - always opens the note
  const handleSidebarNoteEdit = useCallback((slug: string) => {
    const note = notes.find(n => n.slug === slug);
    const noteCategory = note?.category || currentSpace || 'uncategorized';
    
    // Navigate to the category where the note lives
    const targetCategory = noteCategory === 'uncategorized' ? null : noteCategory;
    setCurrentSpace(targetCategory);
    
    // Check if a note is already open
    if (focusedNoteSlug) {
      // Note already open - open new note immediately, focus in background
      openNoteInEditor(slug, noteCategory, note || null);
      focusOnNode(slug);
    } else {
      // No note open - focus first, then open after animation completes
      focusOnNode(slug);
      // Open note after focus animation + highlight animation
      setTimeout(() => {
        openNoteInEditor(slug, noteCategory, note || null);
      }, 100 + FOCUS_DURATION * 2);
    }
  }, [notes, currentSpace, focusedNoteSlug, setCurrentSpace, openNoteInEditor, focusOnNode]);

  // Handle adding a new note from sidebar
  const handleSidebarAddNote = useCallback(async (category: string): Promise<Note | null> => {
    if (isCreating) return null;
    setIsCreating(true);
    
    const defaultPosition: Position = { x: 0, y: 0 };
    
    const newNote = await createNote({
      title: 'Untitled Note',
      content: '',
      category,
      position: defaultPosition,
    });
    
    setIsCreating(false);
    
    if (newNote) {
      openNoteInEditor(newNote.slug, category, newNote);
      
      // Refresh category metadata to update note counts in sidebar
      if (refetchCategories) {
        await refetchCategories();
      }
      
      // Invalidate sidebar cache to force refetch of note lists
      if (setRefetchTrigger) {
        setRefetchTrigger(prev => prev + 1);
      }
      
      return newNote;
    }
    return null;
  }, [isCreating, setIsCreating, createNote, openNoteInEditor, refetchCategories]);

  return {
    focusOnNodeRef,
    handleFocusOnNodeRef,
    handleSidebarNoteClick,
    handleSidebarNoteEdit,
    handleSidebarAddNote,
  };
}
