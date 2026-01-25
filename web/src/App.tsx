import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Canvas, type OriginRect, type NodePositionUpdate, type CanvasHistoryHandle } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { CategoryDialog } from './components/CategoryDialog';
import { Toolbar } from './components/Toolbar';
import { SelectionToolbar } from './components/SelectionToolbar';
import { SettingsDialog } from './components/SettingsDialog';
import { NoteEditor } from './components/NoteEditor';
import { ToolSwitcher } from './components/ToolSwitcher';
import { GhostNote } from './components/GhostNote';
import { PlacementHint } from './components/PlacementHint';
import { useNotes } from './hooks/useNotes';
import { useImages } from './hooks/useImages';
import { useCanvas } from './hooks/useCanvas';
import { useSettings } from './hooks/useSettings';
import { isTouchDevice } from './utils/platform.js';
import type { Position, CategoryMeta, CanvasTool, Note } from './types';
import type { Node } from '@xyflow/react';

function AppContent() {
  const { 
    currentSpace, 
    categories, 
    loadingCategories, 
    setCurrentSpace, 
    focusedNoteSlug, 
    setFocusedNoteSlug,
    createCategory,
    deleteCategory,
    refetchCategories,
  } = useCanvas();
  const { settings, updateSetting } = useSettings();
  
  // Track the origin rect for expand animation
  const [originRect, setOriginRect] = useState<OriginRect | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('mariposa-sidebar-open');
    return saved === 'true';
  });
  
  // Persist sidebar state to localStorage
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('mariposa-sidebar-open', String(newState));
      return newState;
    });
  }, []);
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<'select' | 'create' | 'delete'>('select');
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryMeta | null>(null);
  
  // Filter notes by current space (category)
  const notesOptions = useMemo(() => ({
    category: currentSpace || undefined,
  }), [currentSpace]);
  
  // Filter images by current space (category)
  const imagesOptions = useMemo(() => ({
    category: currentSpace || undefined,
  }), [currentSpace]);
  
  const { notes, loading, getNote, createNote, updateNote, updatePosition, deleteNote, duplicateNote, moveToCategory: moveNoteToCategory } = useNotes(notesOptions);
  const { images, uploadImage, duplicateImage, updateImagePosition, updateImageSize, deleteImage, moveToCategory: moveImageToCategory } = useImages(imagesOptions);

  const [isCreating, setIsCreating] = useState(false);
  
  // Placement mode state for ghost note creation
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  
  // Track initial note data when opening editor (to avoid loading flash)
  const [initialNoteForEditor, setInitialNoteForEditor] = useState<Note | null>(null);
  
  // Selection state for alignment toolbar
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const updateNodePositionsRef = useRef<((updates: NodePositionUpdate[]) => void) | null>(null);
  
  // History state for undo/redo (will be used by context menu later)
  const [_historyHandle, setHistoryHandle] = useState<CanvasHistoryHandle | null>(null);
  
  // Tool state for mobile canvas interaction
  const [activeTool, setActiveTool] = useState<CanvasTool>('pan');
  const showToolSwitcher = isTouchDevice();

  const handleSelectionChange = useCallback((nodes: Node[]) => {
    setSelectedNodes(nodes);
  }, []);

  const handleUpdateNodePositionsRef = useCallback((handler: (updates: NodePositionUpdate[]) => void) => {
    updateNodePositionsRef.current = handler;
  }, []);

  const handleHistoryChange = useCallback((handle: CanvasHistoryHandle) => {
    setHistoryHandle(handle);
  }, []);

  const handleUpdateNodePositions = useCallback((updates: NodePositionUpdate[]) => {
    if (updateNodePositionsRef.current) {
      updateNodePositionsRef.current(updates);
    }
  }, []);

  const handleNoteOpen = useCallback((slug: string, category: string, rect: OriginRect) => {
    // Look up the note from the existing notes array to avoid loading flash
    const existingNote = notes.find(n => n.slug === slug) || null;
    setInitialNoteForEditor(existingNote);
    setOriginRect(rect);
    setFocusedNoteSlug(slug, category);
  }, [notes, setFocusedNoteSlug]);

  const handleNoteClose = useCallback(() => {
    setFocusedNoteSlug(null);
    setInitialNoteForEditor(null);
    // Clear origin rect after close animation completes
    setTimeout(() => setOriginRect(null), 300);
  }, [setFocusedNoteSlug]);

  const handleNotePositionChange = useCallback((slug: string, position: Position) => {
    updatePosition(slug, position);
  }, [updatePosition]);

  const handleImagePositionChange = useCallback((id: string, position: Position) => {
    updateImagePosition(id, position);
  }, [updateImagePosition]);

  const handleImageResize = useCallback((id: string, width: number, height: number) => {
    updateImageSize(id, width, height);
  }, [updateImageSize]);

  const handleImagePaste = useCallback((file: File, position: Position) => {
    uploadImage(file, position, currentSpace || undefined);
  }, [uploadImage, currentSpace]);

  const handleNoteSave = useCallback(async (slug: string, content: string, title: string, tags: string[]) => {
    await updateNote(slug, { content, title, tags });
  }, [updateNote]);

  const handleNoteDelete = useCallback(async (slug: string) => {
    await deleteNote(slug);
  }, [deleteNote]);

  const handleNotesDelete = useCallback(async (slugs: string[]) => {
    await Promise.all(slugs.map(slug => deleteNote(slug)));
  }, [deleteNote]);

  const handleImagesDelete = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map(id => deleteImage(id)));
  }, [deleteImage]);

  const handleNoteDuplicate = useCallback(async (slug: string, position: Position) => {
    await duplicateNote(slug, position);
  }, [duplicateNote]);

  const handleImageDuplicate = useCallback(async (id: string, position: Position) => {
    await duplicateImage(id, position);
  }, [duplicateImage]);

  // Toggle placement mode (FAB click)
  const handleTogglePlacementMode = useCallback(() => {
    setIsPlacementMode(prev => !prev);
  }, []);

  // Handle canvas click during placement mode - create note at position
  const handlePlacementClick = useCallback(async (position: Position) => {
    if (isCreating) return;
    setIsCreating(true);
    setIsPlacementMode(false);
    
    const noteCategory = currentSpace || 'all-notes';
    const newNote = await createNote({
      title: 'Untitled Note',
      content: '',
      category: noteCategory,
      position,
    });
    
    setIsCreating(false);
    
    if (newNote) {
      // Set initial note data to avoid loading flash
      setInitialNoteForEditor(newNote);
      // Open the new note for editing
      setOriginRect({
        x: window.innerWidth / 2 - 100,
        y: window.innerHeight / 2 - 141,
        width: 200,
        height: 283,
      });
      setFocusedNoteSlug(newNote.slug, noteCategory);
    }
  }, [createNote, currentSpace, isCreating, setFocusedNoteSlug]);

  // Escape key to exit placement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlacementMode) {
        setIsPlacementMode(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlacementMode]);

  // Sidebar handlers
  const handleOpenCreateCategory = useCallback(() => {
    setCategoryDialogMode('create');
    setCategoryDialogOpen(true);
  }, []);

  const handleDeleteCategoryRequest = useCallback((category: CategoryMeta) => {
    setCategoryToDelete(category);
    setCategoryDialogMode('delete');
    setCategoryDialogOpen(true);
  }, []);

  const handleCreateCategory = useCallback(async (slug: string, displayName: string) => {
    await createCategory(slug, displayName);
  }, [createCategory]);

  const handleDeleteCategoryConfirm = useCallback(async (slug: string, moveNotesTo?: string) => {
    await deleteCategory(slug, moveNotesTo);
    // If we were viewing the deleted category, go back to all notes
    if (currentSpace === slug) {
      setCurrentSpace(null);
    }
  }, [deleteCategory, currentSpace, setCurrentSpace]);

  const handleCategoryDialogClose = useCallback(() => {
    setCategoryDialogOpen(false);
    setCategoryToDelete(null);
  }, []);

  // Wrapper for moving notes - also refetches category counts
  const handleNoteMoveToCategory = useCallback(async (slug: string, category: string) => {
    const result = await moveNoteToCategory(slug, category);
    if (result) {
      await refetchCategories();
    }
    return result;
  }, [moveNoteToCategory, refetchCategories]);

  // Wrapper for moving images - also refetches category counts
  const handleImageMoveToCategory = useCallback(async (id: string, category: string) => {
    const result = await moveImageToCategory(id, category);
    if (result) {
      await refetchCategories();
    }
    return result;
  }, [moveImageToCategory, refetchCategories]);

  return (
    <div className="app">
      {/* Morphing sidebar with integrated toggle */}
      <Sidebar
        open={sidebarOpen}
        onToggle={handleSidebarToggle}
        categories={categories}
        currentSpace={currentSpace}
        onSpaceChange={setCurrentSpace}
        onSettingsClick={() => setSettingsOpen(true)}
        onCreateCategory={handleOpenCreateCategory}
        onDeleteCategory={handleDeleteCategoryRequest}
        loading={loadingCategories}
      />
      
      <main className={`app-main full ${isPlacementMode ? 'placement-mode' : ''}`}>
        <Canvas
          notes={notes}
          images={images}
          categories={categories}
          activeTool={activeTool}
          isPlacementMode={isPlacementMode}
          onPlacementClick={handlePlacementClick}
          onNoteOpen={handleNoteOpen}
          onNotePositionChange={handleNotePositionChange}
          onImagePositionChange={handleImagePositionChange}
          onImageResize={handleImageResize}
          onImagePaste={handleImagePaste}
          onNotesDelete={handleNotesDelete}
          onImagesDelete={handleImagesDelete}
          onNoteDuplicate={handleNoteDuplicate}
          onImageDuplicate={handleImageDuplicate}
          onNoteMoveToCategory={handleNoteMoveToCategory}
          onImageMoveToCategory={handleImageMoveToCategory}
          onSelectionChange={handleSelectionChange}
          onUpdateNodePositionsRef={handleUpdateNodePositionsRef}
          onHistoryChange={handleHistoryChange}
          loading={loading}
          settings={settings}
        />
      </main>
      
      <Toolbar 
        isPlacementMode={isPlacementMode}
        onTogglePlacementMode={handleTogglePlacementMode}
      />
      
      <GhostNote visible={isPlacementMode} />
      <PlacementHint visible={isPlacementMode} />
      
      {showToolSwitcher && (
        <ToolSwitcher 
          activeTool={activeTool} 
          onToolChange={setActiveTool}
          sidebarOpen={sidebarOpen}
        />
      )}
      
      <SelectionToolbar
        selectedNodes={selectedNodes}
        onUpdateNodePositions={handleUpdateNodePositions}
      />
      
      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onSettingChange={updateSetting}
        onClose={() => setSettingsOpen(false)}
      />
      
      <CategoryDialog
        open={categoryDialogOpen}
        mode={categoryDialogMode}
        categories={categories}
        categoryToDelete={categoryToDelete}
        onCreate={handleCreateCategory}
        onDelete={handleDeleteCategoryConfirm}
        onClose={handleCategoryDialogClose}
      />
      
      {focusedNoteSlug && (
        <NoteEditor
          slug={focusedNoteSlug}
          originRect={originRect}
          categories={categories}
          initialNote={initialNoteForEditor}
          onClose={handleNoteClose}
          onSave={handleNoteSave}
          onDelete={handleNoteDelete}
          onMoveToCategory={handleNoteMoveToCategory}
          getNote={getNote}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
      <Route path="/:category" element={<AppContent />} />
      <Route path="/:category/:noteSlug" element={<AppContent />} />
    </Routes>
  );
}

export default App;
