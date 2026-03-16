import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Home } from './components/Home';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { GhostSection } from './components/GhostSection';
import { GhostSticky } from './components/GhostSticky';
import { PlacementHint } from './components/PlacementHint';
import { Canvas } from './components/Canvas';

const NoteEditor = lazy(() => import('./components/NoteEditor/NoteEditor'));
const SettingsDialog = lazy(() => import('./components/SettingsDialog/SettingsDialog'));

import { useCanvas } from './hooks/useCanvas';
import { useKbs } from './hooks/useKbs';
import { useFolder } from './hooks/useFolder';
import { useNotes } from './hooks/useNotes';
import { useImages } from './hooks/useImages';
import { useSettings } from './hooks/useSettings';
import { EditorProvider, useEditor, PlacementProvider, usePlacement } from './contexts';
import type { Position, NoteFile, StickyColor } from './types';

function AppContent() {
  const {
    currentKb,
    currentPath,
    focusedNote,
    setCurrentKb,
    navigateToFolder,
    setFocusedNote,
  } = useCanvas();

  const { kbs, loading: loadingKbs, refetch: refetchKbs } = useKbs();
  const { settings, updateSetting } = useSettings();
  const { getNote, createNote, updateNote, deleteNote, searchNotes, searching } = useNotes();

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const { originRect, initialNoteForEditor, prepareEditorOpen, clearEditorState } = useEditor();
  const { isPlacementMode, placementType, exitPlacementMode, enterPlacementMode } = usePlacement();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('mariposa-sidebar-open');
    return saved === 'true';
  });

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('mariposa-sidebar-open', String(next));
      return next;
    });
  }, []);

  // Folder data for current view
  const folderOptions = useMemo(() => ({
    kb: currentKb,
    path: currentPath,
  }), [currentKb, currentPath]);

  const {
    entries,
    meta,
    sections,
    stickies,
    loading: loadingFolder,
    refetch: refetchFolder,
    updateItemMeta,
    updateItemPosition,
    createSection,
    updateSection,
    deleteSection,
    createSticky,
    updateSticky,
    deleteSticky,
  } = useFolder(folderOptions);

  const { images, uploadImage, updateImagePosition, updateImageSize, deleteImage } = useImages({ kb: currentKb });

  // === Note handlers ===

  const handleNoteOpen = useCallback(async (notePath: string, rect: { x: number; y: number; width: number; height: number }) => {
    if (!currentKb) return;
    const note = await getNote(currentKb, notePath);
    prepareEditorOpen(rect, note);
    setFocusedNote(notePath);
  }, [currentKb, getNote, prepareEditorOpen, setFocusedNote]);

  const handleNoteClose = useCallback(() => {
    setFocusedNote(null);
    clearEditorState();
  }, [setFocusedNote, clearEditorState]);

  // === Position handlers ===

  const handleItemPositionChange = useCallback((itemName: string, position: Position) => {
    updateItemPosition(itemName, position);
  }, [updateItemPosition]);

  const handleImagePositionChange = useCallback((id: string, position: Position) => {
    updateImagePosition(id, position);
  }, [updateImagePosition]);

  const handleImageResize = useCallback((id: string, width: number, height: number) => {
    updateImageSize(id, width, height);
  }, [updateImageSize]);

  const handleImagePaste = useCallback((file: File, position: Position) => {
    uploadImage(file, position);
  }, [uploadImage]);

  // === Section handlers ===

  const handleSectionCreate = useCallback(async (position: Position) => {
    await createSection({ position });
  }, [createSection]);

  const handleSectionPositionChange = useCallback((id: string, position: Position) => {
    updateSection(id, { position });
  }, [updateSection]);

  const handleSectionResize = useCallback((id: string, width: number, height: number) => {
    updateSection(id, { width, height });
  }, [updateSection]);

  const handleSectionRename = useCallback((id: string, name: string) => {
    updateSection(id, { name });
  }, [updateSection]);

  const handleSectionColorChange = useCallback((id: string, color: StickyColor) => {
    updateSection(id, { color });
  }, [updateSection]);

  const handleSectionsDelete = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map(id => deleteSection(id)));
  }, [deleteSection]);

  // === Sticky handlers ===

  const handleStickyCreate = useCallback(async (position: Position) => {
    await createSticky({ position });
  }, [createSticky]);

  const handleStickyPositionChange = useCallback((id: string, position: Position) => {
    updateSticky(id, { position });
  }, [updateSticky]);

  const handleStickyTextChange = useCallback((id: string, text: string) => {
    updateSticky(id, { text });
  }, [updateSticky]);

  const handleStickyColorChange = useCallback((id: string, color: StickyColor) => {
    updateSticky(id, { color });
  }, [updateSticky]);

  const handleStickiesDelete = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map(id => deleteSticky(id)));
  }, [deleteSticky]);

  // === Image handlers ===

  const handleImagesDelete = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map(id => deleteImage(id)));
  }, [deleteImage]);

  // === Folder navigation ===

  const handleFolderOpen = useCallback((folderName: string) => {
    if (!currentKb) return;
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    navigateToFolder(currentKb, newPath);
  }, [currentKb, currentPath, navigateToFolder]);

  // === Note CRUD handlers ===

  const handleNoteCreate = useCallback(async (position: Position) => {
    if (!currentKb) return;
    const note = await createNote({
      kb: currentKb,
      folder: currentPath,
      title: 'Untitled Note',
      position,
    });
    if (note) {
      refetchFolder();
      // Open the new note in the editor
      prepareEditorOpen(
        { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 141, width: 200, height: 283 },
        note,
      );
      setFocusedNote(note.path);
    }
  }, [currentKb, currentPath, createNote, refetchFolder, prepareEditorOpen, setFocusedNote]);

  const handleNoteSave = useCallback(async (kb: string, notePath: string, content: string, title: string, tags: string[]) => {
    await updateNote(kb, notePath, { content, title, tags });
  }, [updateNote]);

  const handleNoteDelete = useCallback(async (kb: string, notePath: string) => {
    await deleteNote(kb, notePath);
    setFocusedNote(null);
    clearEditorState();
    refetchFolder();
  }, [deleteNote, setFocusedNote, clearEditorState, refetchFolder]);

  // === Placement handler ===

  const handlePlacementClick = useCallback(async (position: Position) => {
    if (!placementType) return;

    if (placementType === 'note') {
      exitPlacementMode();
      await handleNoteCreate(position);
    } else if (placementType === 'section') {
      exitPlacementMode();
      await createSection({ position });
    } else if (placementType === 'sticky') {
      exitPlacementMode();
      await createSticky({ position });
    }
  }, [placementType, exitPlacementMode, createSection, createSticky]);

  // === Home page handler ===

  const handleHomeKbSelect = useCallback((kbName: string) => {
    setCurrentKb(kbName);
  }, [setCurrentKb]);

  const handleHomeNoteSelect = useCallback((note: { kb: string; path: string }) => {
    // Navigate to the KB and folder, then open the note
    const folderPath = note.path.split('/').slice(0, -1).join('/');
    navigateToFolder(note.kb, folderPath);
    setTimeout(() => {
      setFocusedNote(note.path);
    }, 100);
  }, [navigateToFolder, setFocusedNote]);

  const isOnCanvas = currentKb !== null;

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onToggle={handleSidebarToggle}
        kbs={kbs}
        currentKb={currentKb}
        currentPath={currentPath}
        entries={entries}
        meta={meta}
        onKbSelect={setCurrentKb}
        onFolderOpen={handleFolderOpen}
        onNoteOpen={(notePath) => {
          if (!currentKb) return;
          handleNoteOpen(
            notePath,
            { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 141, width: 200, height: 283 },
          );
        }}
        onSettingsClick={() => setSettingsOpen(true)}
        onNavigateToFolder={navigateToFolder}
        loading={loadingKbs}
      />

      <main className={`app-main full ${isPlacementMode ? 'placement-mode' : ''}`}>
        {!isOnCanvas ? (
          <Home
            kbs={kbs}
            loadingKbs={loadingKbs}
            kbRootConfigured={!!settings.kbRoot}
            onKbSelect={handleHomeKbSelect}
            onNoteSelect={handleHomeNoteSelect}
            onSettingsClick={() => setSettingsOpen(true)}
            searchNotes={searchNotes}
            searching={searching}
          />
        ) : (
          <Canvas
            entries={entries}
            meta={meta}
            images={images}
            sections={sections}
            stickies={stickies}
            currentKb={currentKb}
            currentPath={currentPath}
            activeTool="pan"
            isPlacementMode={isPlacementMode}
            onPlacementClick={handlePlacementClick}
            onNoteOpen={handleNoteOpen}
            onFolderOpen={handleFolderOpen}
            onItemPositionChange={handleItemPositionChange}
            onImagePositionChange={handleImagePositionChange}
            onImageResize={handleImageResize}
            onImagePaste={handleImagePaste}
            onImagesDelete={handleImagesDelete}
            onSectionCreate={handleSectionCreate}
            onSectionPositionChange={handleSectionPositionChange}
            onSectionResize={handleSectionResize}
            onSectionRename={handleSectionRename}
            onSectionColorChange={handleSectionColorChange}
            onSectionsDelete={handleSectionsDelete}
            onStickyCreate={handleStickyCreate}
            onStickyPositionChange={handleStickyPositionChange}
            onStickyTextChange={handleStickyTextChange}
            onStickyColorChange={handleStickyColorChange}
            onStickiesDelete={handleStickiesDelete}
            onNoteCreate={handleNoteCreate}
            loading={loadingFolder}
            settings={settings}
          />
        )}
      </main>

      {isOnCanvas && (
        <>
          <Toolbar
            isPlacementMode={isPlacementMode}
            placementType={placementType}
            onEnterPlacementMode={enterPlacementMode}
            onExitPlacementMode={exitPlacementMode}
          />
          <GhostSection visible={isPlacementMode && placementType === 'section'} />
          <GhostSticky visible={isPlacementMode && placementType === 'sticky'} />
          <PlacementHint visible={isPlacementMode} />
        </>
      )}

      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsDialog
            open={settingsOpen}
            settings={settings}
            onSettingChange={updateSetting}
            onClose={() => setSettingsOpen(false)}
            onKbRootSaved={refetchKbs}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {focusedNote && currentKb && (
          <NoteEditor
            kb={currentKb}
            notePath={focusedNote}
            originRect={originRect}
            initialNote={initialNoteForEditor}
            sidebarOpen={sidebarOpen}
            onClose={handleNoteClose}
            onSave={handleNoteSave}
            onDelete={handleNoteDelete}
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
      <EditorProvider>
        <AppContent />
      </EditorProvider>
    </PlacementProvider>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppWithProviders />} />
      <Route path="/:kb" element={<AppWithProviders />} />
      <Route path="/:kb/*" element={<AppWithProviders />} />
    </Routes>
  );
}

export default App;
