import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
  PanOnScrollMode,
  type Node,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NoteNode, type NoteNodeData, type OriginRect } from './nodes/NoteNode';
import { ImageNode, type ImageNodeData } from './nodes/ImageNode';
import { Dialog } from './Dialog';
import { SnapGuides } from './SnapGuides';
import { AdaptiveBackground } from './AdaptiveBackground';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import { useSnapToGuides } from '../hooks/useSnapToGuides';
import { useCanvasHistory, type NodeSnapshot } from '../hooks/useCanvasHistory';
import { isTouchDevice } from '../utils/platform.js';
import type { Note, Position, CanvasImage, CategoryMeta, CanvasTool } from '../types';
import type { Settings } from '../hooks/useSettings';

type CanvasNodeData = NoteNodeData | ImageNodeData;

export type { OriginRect };

// Module-level clipboard storage - persists across component remounts
let moduleClipboard: { nodes: Node<CanvasNodeData>[]; position: Position } | null = null;

export interface CanvasHistoryHandle {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface CanvasProps {
  notes: Note[];
  images: CanvasImage[];
  categories: CategoryMeta[];
  activeTool?: CanvasTool;
  isPlacementMode?: boolean;
  onPlacementClick?: (position: Position) => void;
  onNoteOpen: (slug: string, category: string, originRect: OriginRect) => void;
  onNotePositionChange: (slug: string, position: Position) => void;
  onImagePositionChange: (id: string, position: Position) => void;
  onImageResize: (id: string, width: number, height: number) => void;
  onImagePaste: (file: File, position: Position) => void;
  onNotesDelete: (slugs: string[]) => Promise<void>;
  onImagesDelete: (ids: string[]) => Promise<void>;
  onNoteDuplicate: (slug: string, position: Position) => Promise<void>;
  onImageDuplicate: (id: string, position: Position) => Promise<void>;
  onNoteMoveToCategory?: (slug: string, category: string) => Promise<Note | null>;
  onImageMoveToCategory?: (id: string, category: string) => Promise<boolean>;
  onSelectionChange?: (selectedNodes: Node<CanvasNodeData>[]) => void;
  onUpdateNodePositionsRef?: (handler: (updates: NodePositionUpdate[]) => void) => void;
  onHistoryChange?: (handle: CanvasHistoryHandle) => void;
  loading: boolean;
  settings: Settings;
}

export interface NodePositionUpdate {
  id: string;
  x: number;
  y: number;
}

const nodeTypes: NodeTypes = {
  note: NoteNode,
  image: ImageNode,
};

// Default position layout - arrange items in a grid if no position set
// A4 proportions: width 200px, height ~283px (1:1.414)
function getDefaultPosition(index: number): Position {
  const cols = 4;
  const noteWidth = 200;
  const noteHeight = 283;
  const gap = 60;
  
  const col = index % cols;
  const row = Math.floor(index / cols);
  
  return {
    x: col * (noteWidth + gap),
    y: row * (noteHeight + gap),
  };
}

export function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasInner({ 
  notes, 
  images,
  categories,
  activeTool = 'select',
  isPlacementMode = false,
  onPlacementClick,
  onNoteOpen, 
  onNotePositionChange, 
  onImagePositionChange,
  onImageResize,
  onImagePaste,
  onNotesDelete,
  onImagesDelete,
  onNoteDuplicate,
  onImageDuplicate,
  onNoteMoveToCategory,
  onImageMoveToCategory,
  onSelectionChange,
  onUpdateNodePositionsRef,
  onHistoryChange,
  loading,
  settings,
}: CanvasProps) {
  const { getNodes, screenToFlowPosition } = useReactFlow();
  const { guides, calculateSnap, updateGuides, clearGuides } = useSnapToGuides();
  const history = useCanvasHistory();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notesToDelete, setNotesToDelete] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'canvas' | 'node'; nodeId?: string } | null>(null);
  const [pasteInputPosition, setPasteInputPosition] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const shiftKeyRef = useRef(false);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const contextMenuPositionRef = useRef<Position>({ x: 0, y: 0 });
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pasteTargetRef = useRef<HTMLInputElement>(null);
  const pendingPasteRef = useRef<boolean>(false);

  // Memoize touch device detection to ensure consistent value during render
  const isTouch = useMemo(() => isTouchDevice(), []);

  // Track shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftKeyRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftKeyRef.current = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Track mouse position for paste operations
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle paste from the hidden input - this captures native paste events on iOS
  const handlePasteTargetPaste = useCallback((e: React.ClipboardEvent) => {
    if (!pendingPasteRef.current) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    // First, check for direct image data
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const pastePosition = contextMenuPositionRef.current;
          onImagePaste(file, pastePosition);
          pendingPasteRef.current = false;
          setPasteInputPosition(prev => ({ ...prev, visible: false }));
          setContextMenu(null);
          return;
        }
      }
    }
    
    // Check for text/uri-list (iOS often provides image URLs instead of blobs)
    const uriList = e.clipboardData?.getData('text/uri-list');
    if (uriList) {
      const urls = uriList.split('\n').filter(url => url.trim() && !url.startsWith('#'));
      const imageUrl = urls.find(url => 
        /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(url) ||
        url.includes('image') ||
        url.startsWith('data:image/')
      ) || urls[0]; // Fall back to first URL
      
      if (imageUrl) {
        e.preventDefault();
        
        const pastePosition = contextMenuPositionRef.current;
        
        // Fetch the image and convert to File
        fetch(imageUrl)
          .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.blob();
          })
          .then(blob => {
            const extension = blob.type.split('/')[1] || 'png';
            const file = new File([blob], `pasted-image.${extension}`, { type: blob.type || 'image/png' });
            onImagePaste(file, pastePosition);
          })
          .catch(() => {
            // Failed to fetch image from URL
          });
        
        pendingPasteRef.current = false;
        setPasteInputPosition(prev => ({ ...prev, visible: false }));
        setContextMenu(null);
        return;
      }
    }
    
    // No image found - try to paste nodes
    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      try {
        const data = JSON.parse(text);
        if (data.type === 'mariposa-nodes' && Array.isArray(data.nodes) && data.nodes.length > 0) {
          const pastePosition = contextMenuPositionRef.current;
          const offsetX = pastePosition.x - data.origin.x;
          const offsetY = pastePosition.y - data.origin.y;
          
          for (const node of data.nodes) {
            const newPosition = {
              x: node.position.x + offsetX,
              y: node.position.y + offsetY,
            };
            
            if (node.type === 'note') {
              onNoteDuplicate(node.id, newPosition);
            } else if (node.type === 'image') {
              const imageId = node.id.replace('image-', '');
              onImageDuplicate(imageId, newPosition);
            }
          }
          pendingPasteRef.current = false;
          setPasteInputPosition(prev => ({ ...prev, visible: false }));
          setContextMenu(null);
          return;
        }
      } catch {
        // Not valid JSON
      }
    }
    
    // Fall back to module clipboard
    if (moduleClipboard) {
      const pastePosition = contextMenuPositionRef.current;
      const offsetX = pastePosition.x - moduleClipboard.position.x;
      const offsetY = pastePosition.y - moduleClipboard.position.y;
      
      for (const node of moduleClipboard.nodes) {
        const newPosition = {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        };
        
        if (node.type === 'note') {
          onNoteDuplicate(node.id, newPosition);
        } else if (node.type === 'image') {
          const imageId = node.id.replace('image-', '');
          onImageDuplicate(imageId, newPosition);
        }
      }
      pendingPasteRef.current = false;
      setPasteInputPosition(prev => ({ ...prev, visible: false }));
      setContextMenu(null);
    }
  }, [onImagePaste, onNoteDuplicate, onImageDuplicate, contextMenu]);

  // Convert notes and images to React Flow nodes
  const initialNodes: Node<CanvasNodeData>[] = useMemo(() => {
    // Create note nodes
    const isPanMode = isTouch && activeTool === 'pan';
    
    const noteNodes: Node<NoteNodeData>[] = notes.map((note, index) => {
      // Get display name for the note's category
      const categoryMeta = categories.find(c => c.name === note.category);
      const categoryDisplayName = categoryMeta?.displayName || note.category;
      
      return {
        id: note.slug,
        type: 'note',
        position: note.position || getDefaultPosition(index),
        data: {
          ...note,
          categoryDisplayName,
          onOpen: onNoteOpen,
          isPanMode,
        },
        draggable: !isPanMode,
        selected: false,
      };
    });

    // Create image nodes
    const imageNodes: Node<ImageNodeData>[] = images.map((image, index) => ({
      id: `image-${image.id}`,
      type: 'image',
      position: image.position || getDefaultPosition(notes.length + index),
      data: {
        ...image,
        onResize: (id: string, width: number, height: number) => {
          onImageResize(id, width, height);
        },
        isPanMode,
      },
      draggable: !isPanMode,
      selected: false,
    }));

    return [...noteNodes, ...imageNodes];
  }, [notes, images, categories, onNoteOpen, onImageResize, isTouch, activeTool]);

  // Track structural changes (new/deleted nodes) - NOT content changes
  // Content changes are handled separately to avoid full re-sync
  const nodeStructureKey = useMemo(() => {
    // Only include identity and category - not content (handled via data sync)
    const noteKey = notes.map(n => `${n.slug}:${n.category}`).join('|');
    const imageKey = images.map(i => `${i.id}:${i.displayWidth}:${i.status}`).join('|');
    return `${noteKey}::${imageKey}`;
  }, [notes, images]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  
  // Keep a ref to initialNodes for the sync effect
  const initialNodesRef = useRef(initialNodes);
  initialNodesRef.current = initialNodes;

  // Sync nodes when notes structure changes (not position-only changes)
  // This preserves selection and local position state
  // We use nodeStructureKey to avoid re-syncing on position-only changes from optimistic updates
  useEffect(() => {
    setNodes(currentNodes => {
      const selectionMap = new Map(
        currentNodes.map(n => [n.id, n.selected ?? false])
      );
      const positionMap = new Map(
        currentNodes.map(n => [n.id, n.position])
      );
      
      return initialNodesRef.current.map(node => ({
        ...node,
        // Preserve current position if we have one (to avoid jumps during updates)
        position: positionMap.get(node.id) ?? node.position,
        selected: selectionMap.get(node.id) ?? false,
      }));
    });
  }, [nodeStructureKey, setNodes]);

  // Sync node data (title, content) when notes change - without resetting positions
  // This is separate from structure sync to avoid blinking on content edits
  useEffect(() => {
    const noteDataMap = new Map(notes.map(n => [n.slug, n]));
    const imageDataMap = new Map(images.map(i => [`image-${i.id}`, i]));
    
    setNodes(currentNodes => 
      currentNodes.map(node => {
        if (node.type === 'note') {
          const noteData = noteDataMap.get(node.id);
          if (noteData && (noteData.title !== (node.data as NoteNodeData).title || 
                          noteData.content !== (node.data as NoteNodeData).content)) {
            return {
              ...node,
              data: {
                ...node.data,
                ...noteData,
              },
            };
          }
        } else if (node.type === 'image') {
          const imageData = imageDataMap.get(node.id);
          if (imageData) {
            return {
              ...node,
              data: {
                ...node.data,
                ...imageData,
              },
            };
          }
        }
        return node;
      })
    );
  }, [notes, images, setNodes]);

  // Sync isPanMode and draggable when tool changes
  useEffect(() => {
    const isPanMode = isTouch && activeTool === 'pan';
    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        draggable: !isPanMode,
        data: {
          ...node.data,
          isPanMode,
        },
      }))
    );
  }, [activeTool, isTouch, setNodes]);

  // Get selected note slugs (exclude images)
  const getSelectedNoteSlugs = useCallback(() => {
    return nodes
      .filter(n => n.selected && n.type === 'note')
      .map(n => n.id);
  }, [nodes]);

  // Get selected image IDs
  const getSelectedImageIds = useCallback(() => {
    return nodes
      .filter(n => n.selected && n.type === 'image')
      .map(n => n.id.replace('image-', ''));
  }, [nodes]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setNodes(currentNodes => 
      currentNodes.map(n => ({ ...n, selected: false }))
    );
  }, [setNodes]);

  // Apply a history action (used for undo/redo)
  const applyHistoryState = useCallback((snapshots: NodeSnapshot[]) => {
    const positionMap = new Map(snapshots.map(s => [s.id, { x: s.position.x, y: s.position.y }]));
    
    setNodes(currentNodes => 
      currentNodes.map(node => {
        const pos = positionMap.get(node.id);
        if (pos) {
          return { ...node, position: pos };
        }
        return node;
      })
    );
    
    // Persist the restored positions
    for (const snapshot of snapshots) {
      if (snapshot.id.startsWith('image-')) {
        const imageId = snapshot.id.replace('image-', '');
        onImagePositionChange(imageId, snapshot.position);
      } else {
        onNotePositionChange(snapshot.id, snapshot.position);
      }
    }
  }, [setNodes, onNotePositionChange, onImagePositionChange]);

  // Undo handler
  const handleUndo = useCallback(() => {
    const action = history.undo();
    if (action) {
      applyHistoryState(action.before);
    }
  }, [history, applyHistoryState]);

  // Redo handler
  const handleRedo = useCallback(() => {
    const action = history.redo();
    if (action) {
      applyHistoryState(action.after);
    }
  }, [history, applyHistoryState]);

  // Expose history handle to parent via ref pattern to avoid infinite loops
  const historyHandleRef = useRef<CanvasHistoryHandle>({
    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
  });
  
  // Update the ref with current values
  historyHandleRef.current = {
    undo: handleUndo,
    redo: handleRedo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
  
  // Only notify parent once on mount with stable ref-based handle
  useEffect(() => {
    if (onHistoryChange) {
      onHistoryChange({
        undo: () => historyHandleRef.current.undo(),
        redo: () => historyHandleRef.current.redo(),
        get canUndo() { return historyHandleRef.current.canUndo; },
        get canRedo() { return historyHandleRef.current.canRedo; },
      });
    }
  }, [onHistoryChange]);

  // Update node positions with history tracking (used by SelectionToolbar for alignment)
  const updateNodePositions = useCallback((updates: NodePositionUpdate[]) => {
    // Capture before state
    const beforeSnapshots: NodeSnapshot[] = updates.map(u => {
      const node = nodes.find(n => n.id === u.id);
      return {
        id: u.id,
        position: node?.position ?? { x: 0, y: 0 },
      };
    });
    
    // Capture after state
    const afterSnapshots: NodeSnapshot[] = updates.map(u => ({
      id: u.id,
      position: { x: u.x, y: u.y },
    }));
    
    // Push to history
    history.push({
      type: 'move',
      description: 'Align nodes',
      before: beforeSnapshots,
      after: afterSnapshots,
    });

    // Update positions while explicitly preserving selection
    setNodes(currentNodes => {
      const updateMap = new Map(updates.map(u => [u.id, { x: u.x, y: u.y }]));
      return currentNodes.map(node => {
        const update = updateMap.get(node.id);
        if (update) {
          return { 
            ...node, 
            position: update,
            // Keep existing selection state
            selected: node.selected,
          };
        }
        return node;
      });
    });
    
    // Then persist positions (outside of setNodes to avoid re-render loop)
    for (const update of updates) {
      if (update.id.startsWith('image-')) {
        const imageId = update.id.replace('image-', '');
        onImagePositionChange(imageId, { x: update.x, y: update.y });
      } else {
        onNotePositionChange(update.id, { x: update.x, y: update.y });
      }
    }
  }, [setNodes, onNotePositionChange, onImagePositionChange, nodes, history]);

  // Track selection changes and notify parent
  useEffect(() => {
    if (onSelectionChange) {
      const selectedNodes = nodes.filter(n => n.selected);
      onSelectionChange(selectedNodes);
    }
  }, [nodes, onSelectionChange]);

  // Provide updateNodePositions handler to parent
  useEffect(() => {
    if (onUpdateNodePositionsRef) {
      onUpdateNodePositionsRef(updateNodePositions);
    }
  }, [onUpdateNodePositionsRef, updateNodePositions]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (notesToDelete.length > 0) {
      await onNotesDelete(notesToDelete);
      setNotesToDelete([]);
    }
    if (imagesToDelete.length > 0) {
      await onImagesDelete(imagesToDelete);
      setImagesToDelete([]);
    }
    setDeleteDialogOpen(false);
  }, [notesToDelete, onNotesDelete, imagesToDelete, onImagesDelete]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setNotesToDelete([]);
    setImagesToDelete([]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if dialog is open or typing in input
      if (deleteDialogOpen) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Cmd+Shift+Z (Mac) or Ctrl+Shift+Z / Ctrl+Y (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Copy: Cmd+C (Mac) or Ctrl+C (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          e.preventDefault();
          // Calculate the center of selected nodes for relative positioning
          const minX = Math.min(...selectedNodes.map(n => n.position.x));
          const minY = Math.min(...selectedNodes.map(n => n.position.y));
          
          const clipboardData = {
            type: 'mariposa-nodes',
            nodes: selectedNodes.map(n => ({
              id: n.id,
              type: n.type,
              position: n.position,
              data: n.data,
            })),
            origin: { x: minX, y: minY },
          };
          
          // Write to system clipboard if available (not available on iOS over HTTP)
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(JSON.stringify(clipboardData)).catch(() => {
              // Fallback: just store in memory (won't work across tabs but still works in same session)
              console.warn('Failed to write to system clipboard, using memory fallback');
            });
          }
          
          // Also keep in memory for immediate use
          moduleClipboard = {
            nodes: selectedNodes,
            position: { x: minX, y: minY },
          };
        }
        return;
      }

      // Paste: Cmd+V (Mac) or Ctrl+V (Windows/Linux) - for nodes or images
      // We don't prevent default here - let the paste event fire
      // The paste event handler checks for our data format first, then images
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        // Don't prevent default - let paste event handle it
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }

      // Delete or Backspace to delete selected notes/images
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedSlugs = getSelectedNoteSlugs();
        const selectedImageIds = getSelectedImageIds();
        if (selectedSlugs.length > 0 || selectedImageIds.length > 0) {
          e.preventDefault();
          setNotesToDelete(selectedSlugs);
          setImagesToDelete(selectedImageIds);
          setDeleteDialogOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteDialogOpen, clearSelection, getSelectedNoteSlugs, getSelectedImageIds, handleUndo, handleRedo, nodes]);

  // Generate delete dialog message
  const getDeleteDialogMessage = () => {
    const totalCount = notesToDelete.length + imagesToDelete.length;
    if (totalCount === 1) {
      if (notesToDelete.length === 1) {
        const note = notes.find(n => n.slug === notesToDelete[0]);
        return `Are you sure you want to delete "${note?.title || 'Untitled'}"?`;
      } else {
        return `Are you sure you want to delete this image?`;
      }
    }
    
    const parts = [];
    if (notesToDelete.length > 0) {
      parts.push(`${notesToDelete.length} note${notesToDelete.length > 1 ? 's' : ''}`);
    }
    if (imagesToDelete.length > 0) {
      parts.push(`${imagesToDelete.length} image${imagesToDelete.length > 1 ? 's' : ''}`);
    }
    return `Are you sure you want to delete ${parts.join(' and ')}?`;
  };

  // Get dialog title
  const getDeleteDialogTitle = () => {
    if (imagesToDelete.length > 0 && notesToDelete.length === 0) {
      return imagesToDelete.length === 1 ? 'Delete Image' : 'Delete Images';
    }
    if (notesToDelete.length > 0 && imagesToDelete.length === 0) {
      return notesToDelete.length === 1 ? 'Delete Note' : 'Delete Notes';
    }
    return 'Delete Items';
  };

  // Handle node changes including selection
  const handleNodesChange = useCallback((changes: NodeChange<Node<CanvasNodeData>>[]) => {
    // In pan mode on touch devices, ignore all selection changes
    if (isTouch && activeTool === 'pan') {
      const nonSelectionChanges = changes.filter(change => change.type !== 'select');
      if (nonSelectionChanges.length === 0) return;
      onNodesChange(nonSelectionChanges);
      
      // Still check for position changes
      for (const change of nonSelectionChanges) {
        if (change.type === 'position' && change.dragging === false && change.position) {
          if (change.id.startsWith('image-')) {
            const imageId = change.id.replace('image-', '');
            onImagePositionChange(imageId, change.position);
          } else {
            onNotePositionChange(change.id, change.position);
          }
        }
      }
      return;
    }
    
    if (shiftKeyRef.current) {
      // Shift is held - modify selection changes to preserve existing selections
      const modifiedChanges = changes.map(change => {
        if (change.type === 'select') {
          // Find current node to check its selection state
          const currentNode = nodes.find(n => n.id === change.id);
          
          if (currentNode?.selected && !change.selected) {
            // Node is currently selected and change wants to deselect it
            // For shift+click (single node): allow toggle (deselect)
            // For shift+drag (multiple): prevent deselection
            const selectionChanges = changes.filter(c => c.type === 'select');
            if (selectionChanges.length > 1) {
              // Multiple selection changes = drag box, preserve selection
              return { ...change, selected: true };
            }
            // Single selection change = click, allow toggle (keep as-is for deselect)
          }
        }
        return change;
      });
      
      onNodesChange(modifiedChanges);
    } else {
      // Normal handling when shift is not held
      onNodesChange(changes);
    }
    
    // Check for position changes (drag end)
    for (const change of changes) {
      if (change.type === 'position' && change.dragging === false && change.position) {
        // Determine if this is a note or image node
        if (change.id.startsWith('image-')) {
          const imageId = change.id.replace('image-', '');
          onImagePositionChange(imageId, change.position);
        } else {
          onNotePositionChange(change.id, change.position);
        }
      }
    }
  }, [onNodesChange, onNotePositionChange, onImagePositionChange, nodes, isTouch, activeTool]);

  // Handle node drag start - capture initial positions for history and auto-select
  const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: Node<CanvasNodeData>, draggedNodes: Node<CanvasNodeData>[]) => {
    // Block all node interactions in pan mode on touch devices
    if (isTouch && activeTool === 'pan') return;
    
    // Auto-select the node if it's not already selected (and shift is not held)
    if (!node.selected && !shiftKeyRef.current) {
      setNodes(currentNodes =>
        currentNodes.map(n => ({
          ...n,
          selected: n.id === node.id,
        }))
      );
    }
    
    // Capture starting positions of all dragged nodes
    dragStartPositionsRef.current.clear();
    for (const n of draggedNodes) {
      dragStartPositionsRef.current.set(n.id, { x: n.position.x, y: n.position.y });
    }
  }, [setNodes, isTouch, activeTool]);

  // Handle node drag for snap-to-guides - applies snap during drag
  const handleNodeDrag = useCallback((_event: React.MouseEvent, node: Node<CanvasNodeData>) => {
    // Block all node interactions in pan mode on touch devices
    if (isTouch && activeTool === 'pan') return;
    
    if (!settings.snapToObject) {
      clearGuides();
      return;
    }
    
    const allNodes = getNodes();
    const { x, y, guides: newGuides } = calculateSnap(node, allNodes);
    
    // Show guides if enabled
    if (settings.showSnapLines) {
      updateGuides(newGuides);
    }
    
    // Apply snap position during drag if different from current
    if (x !== node.position.x || y !== node.position.y) {
      setNodes(currentNodes => 
        currentNodes.map(n => 
          n.id === node.id ? { ...n, position: { x, y } } : n
        )
      );
    }
  }, [getNodes, calculateSnap, updateGuides, clearGuides, setNodes, settings.snapToObject, settings.showSnapLines, isTouch, activeTool]);

  // Handle node drag stop - persist position, push to history, and clear guides
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node<CanvasNodeData>, draggedNodes: Node<CanvasNodeData>[]) => {
    // Block all node interactions in pan mode on touch devices
    if (isTouch && activeTool === 'pan') return;
    
    // Build history action from captured start positions
    if (dragStartPositionsRef.current.size > 0) {
      const beforeSnapshots: NodeSnapshot[] = [];
      const afterSnapshots: NodeSnapshot[] = [];
      
      for (const n of draggedNodes) {
        const startPos = dragStartPositionsRef.current.get(n.id);
        if (startPos) {
          // Only record if position actually changed
          if (startPos.x !== n.position.x || startPos.y !== n.position.y) {
            beforeSnapshots.push({ id: n.id, position: startPos });
            afterSnapshots.push({ id: n.id, position: { x: n.position.x, y: n.position.y } });
          }
        }
      }
      
      // Push to history if there were actual changes
      if (beforeSnapshots.length > 0) {
        history.push({
          type: 'move',
          description: `Move ${beforeSnapshots.length} node(s)`,
          before: beforeSnapshots,
          after: afterSnapshots,
        });
      }
      
      dragStartPositionsRef.current.clear();
    }
    
    // Persist the final positions
    for (const n of draggedNodes) {
      if (n.id.startsWith('image-')) {
        const imageId = n.id.replace('image-', '');
        onImagePositionChange(imageId, n.position);
      } else {
        onNotePositionChange(n.id, n.position);
      }
    }
    
    clearGuides();
  }, [onNotePositionChange, onImagePositionChange, clearGuides, history, isTouch, activeTool]);

  // Handle paste - check for images first (from clipboard data), then our node format
  const handlePaste = useCallback((event: ClipboardEvent) => {
    // Don't handle paste if we're in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    event.preventDefault();

    // IMPORTANT: Capture image file synchronously before any async operations
    // because clipboardData is only available during the event
    let imageFile: File | null = null;
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          imageFile = item.getAsFile();
          break;
        }
      }
    }

    // If we have an image file, paste it immediately - don't check for node data
    // This prioritizes image paste over stale node data in clipboard
    if (imageFile) {
      const pastePosition = screenToFlowPosition({
        x: mousePositionRef.current.x,
        y: mousePositionRef.current.y,
      });
      onImagePaste(imageFile, pastePosition);
      return;
    }

    // No image - check for our node data in system clipboard (async) or fall back to module clipboard
    const pasteFromClipboardData = (text: string | null) => {
      if (text) {
        try {
          const data = JSON.parse(text);
          if (data.type === 'mariposa-nodes' && Array.isArray(data.nodes) && data.nodes.length > 0) {
            // This is our node data - paste nodes
            const pastePosition = screenToFlowPosition({
              x: mousePositionRef.current.x,
              y: mousePositionRef.current.y,
            });
            
            const offsetX = pastePosition.x - data.origin.x;
            const offsetY = pastePosition.y - data.origin.y;

            for (const node of data.nodes) {
              const newPosition = {
                x: node.position.x + offsetX,
                y: node.position.y + offsetY,
              };
              
              if (node.type === 'note') {
                onNoteDuplicate(node.id, newPosition);
              } else if (node.type === 'image') {
                // Image node IDs are prefixed with 'image-'
                const imageId = node.id.replace('image-', '');
                onImageDuplicate(imageId, newPosition);
              }
            }
            return true;
          }
        } catch {
          // Not valid JSON or not our format - ignore
        }
      }
      return false;
    };

    // Try system clipboard first if available
    if (navigator.clipboard?.readText) {
      navigator.clipboard.readText()
        .then(text => {
          if (!pasteFromClipboardData(text) && moduleClipboard) {
            // Fall back to module clipboard
            const pastePosition = screenToFlowPosition({
              x: mousePositionRef.current.x,
              y: mousePositionRef.current.y,
            });
            const offsetX = pastePosition.x - moduleClipboard.position.x;
            const offsetY = pastePosition.y - moduleClipboard.position.y;
            
            for (const node of moduleClipboard.nodes) {
              const newPosition = {
                x: node.position.x + offsetX,
                y: node.position.y + offsetY,
              };
              if (node.type === 'note') {
                onNoteDuplicate(node.id, newPosition);
              } else if (node.type === 'image') {
                const imageId = node.id.replace('image-', '');
                onImageDuplicate(imageId, newPosition);
              }
            }
          }
        })
        .catch(() => {
          // Clipboard read failed - try module clipboard
          if (moduleClipboard) {
            const pastePosition = screenToFlowPosition({
              x: mousePositionRef.current.x,
              y: mousePositionRef.current.y,
            });
            const offsetX = pastePosition.x - moduleClipboard.position.x;
            const offsetY = pastePosition.y - moduleClipboard.position.y;
            
            for (const node of moduleClipboard.nodes) {
              const newPosition = {
                x: node.position.x + offsetX,
                y: node.position.y + offsetY,
              };
              if (node.type === 'note') {
                onNoteDuplicate(node.id, newPosition);
              } else if (node.type === 'image') {
                const imageId = node.id.replace('image-', '');
                onImageDuplicate(imageId, newPosition);
              }
            }
          }
        });
    } else if (moduleClipboard) {
      // No system clipboard - use module clipboard directly
      const pastePosition = screenToFlowPosition({
        x: mousePositionRef.current.x,
        y: mousePositionRef.current.y,
      });
      const offsetX = pastePosition.x - moduleClipboard.position.x;
      const offsetY = pastePosition.y - moduleClipboard.position.y;
      
      for (const node of moduleClipboard.nodes) {
        const newPosition = {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        };
        if (node.type === 'note') {
          onNoteDuplicate(node.id, newPosition);
        } else if (node.type === 'image') {
          const imageId = node.id.replace('image-', '');
          onImageDuplicate(imageId, newPosition);
        }
      }
    }
  }, [screenToFlowPosition, onImagePaste, onNoteDuplicate, onImageDuplicate]);

  // Set up paste listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Handle pane click - placement mode or clear selection
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    // If in placement mode, create note at click position
    if (isPlacementMode && onPlacementClick) {
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onPlacementClick(flowPosition);
      return;
    }
    
    // Otherwise just clear selection
    clearSelection();
  }, [isPlacementMode, onPlacementClick, screenToFlowPosition, clearSelection]);

  // Close context menu
  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle right-click on canvas background
  const handlePaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    // Store the flow position for paste operations
    contextMenuPositionRef.current = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'canvas' });
  }, [screenToFlowPosition]);

  // Handle right-click on a node
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node<CanvasNodeData>) => {
    event.preventDefault();
    // Select the node if not already selected
    if (!node.selected) {
      setNodes(currentNodes =>
        currentNodes.map(n => ({
          ...n,
          selected: n.id === node.id,
        }))
      );
    }
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', nodeId: node.id });
  }, [setNodes]);

  // Handle right-click on selection box (multi-selection)
  const handleSelectionContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    // Keep the current selection, just show context menu
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', nodeId: undefined });
  }, []);

  // Touch context menu trigger (reusable for long-press and two-finger tap)
  const triggerTouchContextMenu = useCallback((clientX: number, clientY: number) => {
    contextMenuPositionRef.current = screenToFlowPosition({ x: clientX, y: clientY });
    
    // Check if touch is over a node
    const flowNodes = getNodes();
    const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });
    
    // Find node under touch point
    const touchedNode = flowNodes.find(node => {
      const nodeWidth = node.measured?.width ?? 200;
      const nodeHeight = node.measured?.height ?? 100;
      return (
        flowPosition.x >= node.position.x &&
        flowPosition.x <= node.position.x + nodeWidth &&
        flowPosition.y >= node.position.y &&
        flowPosition.y <= node.position.y + nodeHeight
      );
    });

    if (touchedNode) {
      // Select the node if not already selected
      if (!touchedNode.selected) {
        setNodes(currentNodes =>
          currentNodes.map(n => ({
            ...n,
            selected: n.id === touchedNode.id,
          }))
        );
      }
      setContextMenu({ x: clientX, y: clientY, type: 'node', nodeId: touchedNode.id });
    } else {
      setContextMenu({ x: clientX, y: clientY, type: 'canvas' });
    }
  }, [screenToFlowPosition, getNodes, setNodes]);

  // Refs for native touch event handling (capture phase to run before React Flow)
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressPosRef = useRef<{ x: number; y: number } | null>(null);
  const twoFingerTapRef = useRef<{ startTime: number; x: number; y: number; initialDistance: number } | null>(null);
  const triggerTouchContextMenuRef = useRef(triggerTouchContextMenu);
  const longPressFiredRef = useRef(false); // Track if long-press opened context menu
  
  // Keep the ref updated with the latest callback
  useEffect(() => {
    triggerTouchContextMenuRef.current = triggerTouchContextMenu;
  }, [triggerTouchContextMenu]);

  // Native touch event handlers using capture phase
  // Using a state to trigger re-run when container ref is attached
  const [containerMounted, setContainerMounted] = useState(false);
  
  // Callback ref to detect when container is mounted
  const setCanvasContainerRef = useCallback((node: HTMLDivElement | null) => {
    canvasContainerRef.current = node;
    setContainerMounted(!!node);
  }, []);

  useEffect(() => {
    if (!isTouch) return;
    
    const container = canvasContainerRef.current;
    if (!container) return;

    const clearLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Reset long-press fired flag on new touch
      longPressFiredRef.current = false;
      
      // Two-finger tap detection
      if (e.touches.length === 2) {
        clearLongPress();
        const x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        // Calculate initial distance between fingers to detect pinch vs tap
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const initialDistance = Math.sqrt(dx * dx + dy * dy);
        twoFingerTapRef.current = { startTime: Date.now(), x, y, initialDistance };
        return;
      }

      // Single finger - start long-press timer
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        longPressPosRef.current = { x: touch.clientX, y: touch.clientY };
        
        clearLongPress();
        longPressTimerRef.current = window.setTimeout(() => {
          if (longPressPosRef.current) {
            longPressFiredRef.current = true; // Mark that long-press opened menu
            triggerTouchContextMenuRef.current(longPressPosRef.current.x, longPressPosRef.current.y);
          }
        }, 500);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Cancel two-finger tap if fingers move apart (pinch gesture)
      if (twoFingerTapRef.current && e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const distanceChange = Math.abs(currentDistance - twoFingerTapRef.current.initialDistance);
        
        // If fingers moved apart or together by more than 30px, it's a pinch, not a tap
        if (distanceChange > 30) {
          twoFingerTapRef.current = null;
        }
        return;
      }
      
      if (!longPressPosRef.current || e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - longPressPosRef.current.x);
      const dy = Math.abs(touch.clientY - longPressPosRef.current.y);
      
      // Cancel long-press if moved too much
      if (dx > 10 || dy > 10) {
        clearLongPress();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      clearLongPress();
      
      // If long-press just fired, prevent any click/mousedown from closing menu
      // by stopping propagation (but we're passive, so we can't preventDefault)
      // Instead, we'll use a timeout to reset the flag after events settle
      if (longPressFiredRef.current) {
        // Keep the flag true for a bit to block pane click
        setTimeout(() => {
          longPressFiredRef.current = false;
        }, 300);
      }
      
      // Two-finger tap completion
      if (twoFingerTapRef.current && e.touches.length === 0) {
        const elapsed = Date.now() - twoFingerTapRef.current.startTime;
        if (elapsed < 300) {
          triggerTouchContextMenuRef.current(twoFingerTapRef.current.x, twoFingerTapRef.current.y);
        }
        twoFingerTapRef.current = null;
      }
    };

    const handleTouchCancel = () => {
      clearLongPress();
      twoFingerTapRef.current = null;
    };

    // Use capture phase to run before React Flow's handlers
    container.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    container.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
    container.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: true });

    return () => {
      clearLongPress();
      container.removeEventListener('touchstart', handleTouchStart, { capture: true });
      container.removeEventListener('touchmove', handleTouchMove, { capture: true });
      container.removeEventListener('touchend', handleTouchEnd, { capture: true });
      container.removeEventListener('touchcancel', handleTouchCancel, { capture: true });
    };
  }, [isTouch, containerMounted]); // Re-run when container is mounted

  // Copy selected nodes to clipboard (both system and internal state)
  const handleCopyNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    // Calculate the center of selected nodes for relative positioning
    const minX = Math.min(...selectedNodes.map(n => n.position.x));
    const minY = Math.min(...selectedNodes.map(n => n.position.y));

    const clipboardData = {
      type: 'mariposa-nodes',
      nodes: selectedNodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      origin: { x: minX, y: minY },
    };
    
    // Write to system clipboard if available (not available on iOS over HTTP)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(JSON.stringify(clipboardData)).catch(() => {
        // Silently fail - we have internal clipboard state as fallback
      });
    }

    // Keep internal state for UI feedback (e.g., enabling paste button)
    // This is the primary mechanism on iOS where system clipboard may not work
    moduleClipboard = {
      nodes: selectedNodes,
      position: { x: minX, y: minY },
    };
    
    // Close context menu after copy
    setContextMenu(null);
  }, [nodes]);

  // Paste nodes or images from clipboard
  // On iOS Safari, we use a hidden input to capture the native paste event
  // This works because the paste event provides clipboardData synchronously
  const handlePasteNodes = useCallback(() => {
    // Mark that we're expecting a paste
    pendingPasteRef.current = true;
    
    // Get the screen position for the paste input (use context menu position)
    const screenPos = contextMenu ? { x: contextMenu.x, y: contextMenu.y } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    // Position the paste input on-screen so iOS shows the native paste popup
    setPasteInputPosition({ x: screenPos.x, y: screenPos.y, visible: true });
    
    // Focus the hidden input to receive paste events
    if (pasteTargetRef.current) {
      pasteTargetRef.current.focus();
      
      // On iOS Safari, we need to select the input content to enable paste
      pasteTargetRef.current.select();
      
      // Try execCommand('paste') - this triggers native paste on iOS Safari
      // Must be called synchronously during user activation
      try {
        const execResult = document.execCommand('paste');
        if (execResult) {
          // execCommand succeeded - the paste event handler will process it
          // Don't proceed with clipboard.read() as it will fail anyway
          return;
        }
      } catch {
        // execCommand not supported
      }
      
      // On iOS, the native paste popup should appear now - don't call clipboard.read()
      // as it will fail with NotAllowedError. Just wait for user to tap the native paste button.
      // We'll close the context menu but keep the paste input visible for iOS.
      setContextMenu(null);
    }
    
    // Try navigator.clipboard.read() as fallback for desktop browsers
    // This is called synchronously during user activation
    if (navigator.clipboard?.read) {
      const pastePosition = contextMenuPositionRef.current;
      
      navigator.clipboard.read().then(async (clipboardItems) => {
        // If we already handled paste via native event, skip
        if (!pendingPasteRef.current) {
          return;
        }
        
        for (const item of clipboardItems) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            try {
              const blob = await item.getType(imageType);
              const file = new File([blob], 'pasted-image.png', { type: imageType });
              onImagePaste(file, pastePosition);
              pendingPasteRef.current = false;
              setContextMenu(null);
              return;
            } catch {
              // Failed to get image, continue
            }
          }
          
          // Try common image formats directly
          const commonImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
          for (const type of commonImageTypes) {
            try {
              const blob = await item.getType(type);
              if (blob && blob.size > 0) {
                const file = new File([blob], `pasted-image.${type.split('/')[1]}`, { type });
                onImagePaste(file, pastePosition);
                pendingPasteRef.current = false;
                setContextMenu(null);
                return;
              }
            } catch {
              // This type not available, try next
            }
          }
        }
        
        // No image found via clipboard API - try text for node data
        if (pendingPasteRef.current && navigator.clipboard?.readText) {
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              const data = JSON.parse(text);
              if (data.type === 'mariposa-nodes' && Array.isArray(data.nodes) && data.nodes.length > 0) {
                const offsetX = pastePosition.x - data.origin.x;
                const offsetY = pastePosition.y - data.origin.y;
                
                for (const node of data.nodes) {
                  const newPosition = {
                    x: node.position.x + offsetX,
                    y: node.position.y + offsetY,
                  };
                  
                  if (node.type === 'note') {
                    onNoteDuplicate(node.id, newPosition);
                  } else if (node.type === 'image') {
                    const imageId = node.id.replace('image-', '');
                    onImageDuplicate(imageId, newPosition);
                  }
                }
                pendingPasteRef.current = false;
                setContextMenu(null);
                return;
              }
            }
          } catch {
            // Clipboard read failed
          }
        }
        
        // Fall back to module clipboard
        if (pendingPasteRef.current && moduleClipboard) {
          const offsetX = pastePosition.x - moduleClipboard.position.x;
          const offsetY = pastePosition.y - moduleClipboard.position.y;
          
          for (const node of moduleClipboard.nodes) {
            const newPosition = {
              x: node.position.x + offsetX,
              y: node.position.y + offsetY,
            };
            
            if (node.type === 'note') {
              onNoteDuplicate(node.id, newPosition);
            } else if (node.type === 'image') {
              const imageId = node.id.replace('image-', '');
              onImageDuplicate(imageId, newPosition);
            }
          }
          pendingPasteRef.current = false;
          setContextMenu(null);
        }
      }).catch(() => {
        // Clipboard API failed - the native paste event handler will take over
        // if the user triggers a paste via keyboard or system menu
      });
    }
  }, [onNoteDuplicate, onImageDuplicate, onImagePaste]);

  // Handle image file selection (from "Add Image" menu option)
  const handleImageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const pastePosition = contextMenuPositionRef.current;
      onImagePaste(file, pastePosition);
    }
    // Reset input so same file can be selected again
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    setContextMenu(null);
  }, [onImagePaste]);

  // Trigger image file picker
  const handleAddImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  // Build context menu items based on menu type
  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu) return [];

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl+';

    if (contextMenu.type === 'canvas') {
      // Canvas background context menu
      return [
        {
          label: 'Paste',
          shortcut: `${modKey}V`,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          ),
          onClick: handlePasteNodes,
          // Always enabled - can paste images from system clipboard or nodes from internal clipboard
          disabled: false,
        },
        {
          label: 'Add Image',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          ),
          onClick: handleAddImage,
        },
        { label: '', onClick: () => {}, divider: true },
        {
          label: 'Undo',
          shortcut: `${modKey}Z`,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.36 2.64L3 13" />
            </svg>
          ),
          onClick: handleUndo,
          disabled: !history.canUndo,
        },
        {
          label: 'Redo',
          shortcut: isMac ? '⇧⌘Z' : 'Ctrl+Y',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 019-9 9 9 0 016.36 2.64L21 13" />
            </svg>
          ),
          onClick: handleRedo,
          disabled: !history.canRedo,
        },
      ];
    } else {
      // Node context menu
      const selectedNodes = nodes.filter(n => n.selected);
      const selectedNotes = selectedNodes.filter(n => n.type === 'note');
      const selectedImages = selectedNodes.filter(n => n.type === 'image');
      const hasSelection = selectedNodes.length > 0;
      const selectionLabel = selectedNodes.length === 1 ? 'item' : `${selectedNodes.length} items`;

      // Build "Move to" submenu items
      const moveToItems: ContextMenuItem[] = [
        {
          label: 'Uncategorized',
          onClick: async () => {
            for (const n of selectedNotes) {
              if (onNoteMoveToCategory) await onNoteMoveToCategory(n.id, 'all-notes');
            }
            for (const n of selectedImages) {
              const imageId = n.id.replace('image-', '');
              if (onImageMoveToCategory) await onImageMoveToCategory(imageId, 'all-notes');
            }
          },
        },
        ...categories.map(cat => ({
          label: cat.displayName,
          onClick: async () => {
            for (const n of selectedNotes) {
              if (onNoteMoveToCategory) await onNoteMoveToCategory(n.id, cat.name);
            }
            for (const n of selectedImages) {
              const imageId = n.id.replace('image-', '');
              if (onImageMoveToCategory) await onImageMoveToCategory(imageId, cat.name);
            }
          },
        })),
      ];

      return [
        {
          label: 'Copy',
          shortcut: `${modKey}C`,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          ),
          onClick: handleCopyNodes,
          disabled: !hasSelection,
        },
        { label: '', onClick: () => {}, divider: true },
        {
          label: 'Move to',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
          ),
          onClick: () => {},
          disabled: !hasSelection || categories.length === 0,
          submenu: moveToItems,
        },
        { label: '', onClick: () => {}, divider: true },
        {
          label: `Delete ${selectionLabel}`,
          shortcut: '⌫',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          ),
          onClick: () => {
            const noteSlugs = selectedNotes.map(n => n.id);
            const imageIds = selectedImages.map(n => n.id.replace('image-', ''));
            if (noteSlugs.length > 0 || imageIds.length > 0) {
              setNotesToDelete(noteSlugs);
              setImagesToDelete(imageIds);
              setDeleteDialogOpen(true);
            }
          },
          disabled: !hasSelection,
          danger: true,
        },
      ];
    }
  }, [contextMenu, history.canUndo, history.canRedo, handleUndo, handleRedo, handleCopyNodes, handlePasteNodes, handleAddImage, nodes, categories, onNoteMoveToCategory, onImageMoveToCategory]);

  if (loading) {
    return (
      <div className="canvas-loading">
        <p>Loading notes...</p>
      </div>
    );
  }

  return (
    <div className={`canvas-container ${isTouch && activeTool === 'pan' ? 'pan-mode' : ''}`} ref={setCanvasContainerRef}>
      <ReactFlow
        nodes={nodes}
        edges={[]}
        onNodesChange={handleNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onSelectionContextMenu={handleSelectionContextMenu}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        // Pan controls - on touch devices, pan mode enables drag-to-pan
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
        panOnDrag={isTouch ? activeTool === 'pan' : false}
        panActivationKeyCode="Space"
        // Selection controls - disabled in pan mode on touch devices
        selectionOnDrag={isTouch ? activeTool === 'select' : true}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        selectNodesOnDrag={false}
        // Node dragging - disabled in pan mode on touch devices
        nodesDraggable={!isTouch || activeTool === 'select'}
        // Node selection - disabled in pan mode on touch devices
        elementsSelectable={!isTouch || activeTool === 'select'}
        nodesConnectable={false}
        // Disable default delete - we handle it ourselves with confirmation dialog
        deleteKeyCode={null}
      >
        <AdaptiveBackground />
        <Controls showInteractive={false} />
        <SnapGuides guides={guides} />
      </ReactFlow>
      
      <Dialog
        open={deleteDialogOpen}
        title={getDeleteDialogTitle()}
        message={getDeleteDialogMessage()}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={handleContextMenuClose}
        />
      )}

      {/* Hidden file input for iOS "Add Image" functionality */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageInputChange}
      />
      
      {/* Hidden input for capturing native paste events on iOS Safari */}
      {/* Positioned on-screen when paste is triggered so iOS shows native paste popup */}
      <input
        ref={pasteTargetRef}
        type="text"
        value=""
        readOnly
        style={{
          position: 'fixed',
          left: pasteInputPosition.visible ? `${pasteInputPosition.x - 50}px` : '-9999px',
          top: pasteInputPosition.visible ? `${pasteInputPosition.y - 20}px` : '-9999px',
          width: pasteInputPosition.visible ? '100px' : '1px',
          height: pasteInputPosition.visible ? '40px' : '1px',
          opacity: pasteInputPosition.visible ? 1 : 0,
          zIndex: pasteInputPosition.visible ? 10000 : -1,
          pointerEvents: pasteInputPosition.visible ? 'auto' : 'none',
          fontSize: '16px', // Prevents iOS zoom on focus
          background: pasteInputPosition.visible ? 'white' : 'transparent',
          border: pasteInputPosition.visible ? '2px solid #007AFF' : 'none',
          borderRadius: '8px',
          textAlign: 'center',
        }}
        onPaste={handlePasteTargetPaste}
        onBlur={() => {
          // Hide the paste input when it loses focus (user tapped elsewhere)
          if (pasteInputPosition.visible) {
            setPasteInputPosition(prev => ({ ...prev, visible: false }));
            pendingPasteRef.current = false;
          }
        }}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
