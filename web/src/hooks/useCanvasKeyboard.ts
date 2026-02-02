import { useEffect } from 'react';
import type { Node } from '@xyflow/react';
import { setModuleClipboard } from './useCanvasClipboard';

interface UseCanvasKeyboardProps {
  deleteDialogOpen: boolean;
  nodes: Node[];
  getSelectedNoteSlugs: () => string[];
  getSelectedImageIds: () => string[];
  clearSelection: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  onDeleteRequest: (noteSlugs: string[], imageIds: string[]) => void;
}

export function useCanvasKeyboard({
  deleteDialogOpen,
  nodes,
  getSelectedNoteSlugs,
  getSelectedImageIds,
  clearSelection,
  handleUndo,
  handleRedo,
  onDeleteRequest,
}: UseCanvasKeyboardProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(JSON.stringify(clipboardData)).catch(() => {
              // Fallback to memory
            });
          }

          setModuleClipboard({
            nodes: selectedNodes,
            position: { x: minX, y: minY },
          });
        }
        return;
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
          onDeleteRequest(selectedSlugs, selectedImageIds);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteDialogOpen, clearSelection, getSelectedNoteSlugs, getSelectedImageIds, handleUndo, handleRedo, nodes, onDeleteRequest]);
}
