import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { OriginRect } from '../components/Canvas';
import type { Note } from '../types';

interface EditorContextValue {
  // State
  originRect: OriginRect | null;
  initialNoteForEditor: Note | null;
  
  // Actions
  prepareEditorOpen: (rect: OriginRect, note: Note | null) => void;
  clearEditorState: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const [originRect, setOriginRect] = useState<OriginRect | null>(null);
  const [initialNoteForEditor, setInitialNoteForEditor] = useState<Note | null>(null);

  const prepareEditorOpen = useCallback((rect: OriginRect, note: Note | null) => {
    setOriginRect(rect);
    setInitialNoteForEditor(note);
  }, []);

  const clearEditorState = useCallback(() => {
    setInitialNoteForEditor(null);
    // Clear origin rect after close animation completes
    setTimeout(() => setOriginRect(null), 300);
  }, []);

  const value: EditorContextValue = {
    originRect,
    initialNoteForEditor,
    prepareEditorOpen,
    clearEditorState,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
