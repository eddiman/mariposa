import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Canvas, type OriginRect, type NodePositionUpdate, type CanvasHistoryHandle } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { SelectionToolbar } from './components/SelectionToolbar';
import { ToolSwitcher } from './components/ToolSwitcher';
import { GhostNote } from './components/GhostNote';
import { PlacementHint } from './components/PlacementHint';

// Lazy load dialogs and editor (not needed on initial render)
const NoteEditor = lazy(() => import('./components/NoteEditor/NoteEditor'));
const SettingsDialog = lazy(() => import('./components/SettingsDialog/SettingsDialog'));
const CategoryDialog = lazy(() => import('./components/CategoryDialog/CategoryDialog'));
import { useNotes } from './hooks/useNotes';
import { useImages } from './hooks/useImages';
import { useCanvas } from './hooks/useCanvas';
import { useSettings } from './hooks/useSettings';
import { useSidebarNotes } from './hooks/useSidebarNotes';
import { isTouchDevice } from './utils/platform.js';
import { 
  EditorProvider, 
  useEditor, 
  PlacementProvider, 
  usePlacement, 
  CategoryDialogProvider, 
  useCategoryDialog 
} from './contexts';
import type { Position, CanvasTool, NoteMeta } from './types';
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
    updateCategory,
    deleteCategory,
    refetchCategories,
  } = useCanvas();
  const { settings, updateSetting } = useSettings();
  
  // Use contexts
  const { 
    originRect, 
    initialNoteForEditor, 
    prepareEditorOpen, 
    clearEditorState,
  } = useEditor();
  const { isPlacementMode, isCreating, togglePlacementMode, exitPlacementMode, setIsCreating } = usePlacement();
  const { 
    isOpen: categoryDialogOpen, 
    mode: categoryDialogMode, 
    categoryToDelete, 
    categoryToRename,
    openCreateDialog: handleOpenCreateCategory,
    openRenameDialog: handleRenameCategoryRequest,
    openDeleteDialog: handleDeleteCategoryRequest,
    closeDialog: handleCategoryDialogClose,
  } = useCategoryDialog();
  
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

  // Sidebar notes hook
  const {
    handleFocusOnNodeRef,
    handleSidebarNoteClick,
    handleSidebarNoteEdit,
    handleSidebarAddNote,
  } = useSidebarNotes({
    notes,
    currentSpace,
    focusedNoteSlug,
    isCreating,
    setCurrentSpace,
    setFocusedNoteSlug,
    setIsCreating,
    prepareEditorOpen,
    createNote,
  });

  // Selection state for alignment toolbar
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const updateNodePositionsRef = useRef<((updates: NodePositionUpdate[]) => void) | null>(null);
  
  // History state for undo/redo (will be used by context menu later)
  const [_historyHandle, setHistoryHandle] = useState<CanvasHistoryHandle | null>(null);
  
  // Ref to update sidebar note cache when notes are edited
  const sidebarNoteUpdateRef = useRef<((slug: string, updates: Partial<NoteMeta>) => void) | null>(null);
  
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

  const handleSidebarNoteUpdateRef = useCallback((handler: (slug: string, updates: Partial<NoteMeta>) => void) => {
    sidebarNoteUpdateRef.current = handler;
  }, []);

  const handleUpdateNodePositions = useCallback((updates: NodePositionUpdate[]) => {
    if (updateNodePositionsRef.current) {
      updateNodePositionsRef.current(updates);
    }
  }, []);

  const handleNoteOpen = useCallback((slug: string, category: string, rect: OriginRect) => {
    // Look up the note from the existing notes array to avoid loading flash
    const existingNote = notes.find(n => n.slug === slug) || null;
    prepareEditorOpen(rect, existingNote);
    setFocusedNoteSlug(slug, category);
  }, [notes, prepareEditorOpen, setFocusedNoteSlug]);

  const handleNoteClose = useCallback(() => {
    setFocusedNoteSlug(null);
    clearEditorState();
  }, [setFocusedNoteSlug, clearEditorState]);

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
    // Update sidebar cache so title changes reflect immediately
    if (sidebarNoteUpdateRef.current) {
      sidebarNoteUpdateRef.current(slug, { title });
    }
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

  // Handle canvas click during placement mode - create note at position
  const handlePlacementClick = useCallback(async (position: Position) => {
    if (isCreating) return;
    setIsCreating(true);
    exitPlacementMode();
    
    const noteCategory = currentSpace || 'all-notes';
    const newNote = await createNote({
      title: 'Untitled Note',
      content: '',
      category: noteCategory,
      position,
    });
    
    setIsCreating(false);
    
    if (newNote) {
      // Open the new note for editing
      prepareEditorOpen({
        x: window.innerWidth / 2 - 100,
        y: window.innerHeight / 2 - 141,
        width: 200,
        height: 283,
      }, newNote);
      setFocusedNoteSlug(newNote.slug, noteCategory);
    }
  }, [createNote, currentSpace, isCreating, setIsCreating, exitPlacementMode, prepareEditorOpen, setFocusedNoteSlug]);

  // Category handlers
  const handleCreateCategory = useCallback(async (slug: string, displayName: string) => {
    await createCategory(slug, displayName);
  }, [createCategory]);

  const handleRenameCategoryConfirm = useCallback(async (slug: string, newDisplayName: string) => {
    await updateCategory(slug, newDisplayName);
  }, [updateCategory]);

  const handleDeleteCategoryConfirm = useCallback(async (slug: string, moveNotesTo?: string) => {
    await deleteCategory(slug, moveNotesTo);
    // If we were viewing the deleted category, go back to all notes
    if (currentSpace === slug) {
      setCurrentSpace(null);
    }
  }, [deleteCategory, currentSpace, setCurrentSpace]);

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
        onRenameCategory={handleRenameCategoryRequest}
        onDeleteCategory={handleDeleteCategoryRequest}
        onNoteClick={handleSidebarNoteClick}
        onNoteEdit={handleSidebarNoteEdit}
        onAddNote={handleSidebarAddNote}
        onNoteUpdateRef={handleSidebarNoteUpdateRef}
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
          onFocusOnNodeRef={handleFocusOnNodeRef}
          onHistoryChange={handleHistoryChange}
          loading={loading}
          settings={settings}
        />
      </main>
      
      <Toolbar 
        isPlacementMode={isPlacementMode}
        onTogglePlacementMode={togglePlacementMode}
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
      
      {/* Lazy-loaded dialogs */}
      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsDialog
            open={settingsOpen}
            settings={settings}
            onSettingChange={updateSetting}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </Suspense>
      
      <Suspense fallback={null}>
        {categoryDialogOpen && (
          <CategoryDialog
            open={categoryDialogOpen}
            mode={categoryDialogMode}
            categories={categories}
            categoryToDelete={categoryToDelete}
            categoryToRename={categoryToRename}
            onCreate={handleCreateCategory}
            onRename={handleRenameCategoryConfirm}
            onDelete={handleDeleteCategoryConfirm}
            onClose={handleCategoryDialogClose}
          />
        )}
      </Suspense>
      
      {/* Lazy-loaded note editor */}
      <Suspense fallback={null}>
        {focusedNoteSlug && (
          <NoteEditor
            slug={focusedNoteSlug}
            originRect={originRect}
            categories={categories}
            initialNote={initialNoteForEditor}
            sidebarOpen={sidebarOpen}
            onClose={handleNoteClose}
            onSave={handleNoteSave}
            onDelete={handleNoteDelete}
            onMoveToCategory={handleNoteMoveToCategory}
            getNote={getNote}
          />
        )}
      </Suspense>
    </div>
  );
}

function AppWithProviders() {
  return (
    <PlacementProvider>
      <CategoryDialogProvider>
        <EditorProvider>
          <AppContent />
        </EditorProvider>
      </CategoryDialogProvider>
    </PlacementProvider>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppWithProviders />} />
      <Route path="/:category" element={<AppWithProviders />} />
      <Route path="/:category/:noteSlug" element={<AppWithProviders />} />
    </Routes>
  );
}

export default App;
