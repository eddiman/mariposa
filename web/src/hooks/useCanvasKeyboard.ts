import { useEffect, useRef } from 'react';
import type { Node } from '@xyflow/react';
import { setModuleClipboard } from './useCanvasClipboard';
import type { Position } from '../types';

interface UseCanvasKeyboardProps {
  deleteDialogOpen: boolean;
  nodes: Node[];
  getSelectedNoteSlugs: () => string[];
  getSelectedImageIds: () => string[];
  getSelectedSectionSlugs: () => string[];
  getSelectedStickySlugs: () => string[];
  clearSelection: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  onDeleteRequest: (noteSlugs: string[], imageIds: string[], sectionSlugs?: string[], stickySlugs?: string[]) => void;
  onAddSection?: (position: Position) => void;
  onAddSticky?: (position: Position) => void;
  screenToFlowPosition: (position: { x: number; y: number }) => Position;
}

export function useCanvasKeyboard({
  deleteDialogOpen,
  nodes,
  getSelectedNoteSlugs,
  getSelectedImageIds,
  getSelectedSectionSlugs,
  getSelectedStickySlugs,
  clearSelection,
  handleUndo,
  handleRedo,
  onDeleteRequest,
  onAddSection,
  onAddSticky,
  screenToFlowPosition,
}: UseCanvasKeyboardProps) {
  // Track mouse position for S and T shortcuts
  const mousePositionRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

      // S key to add section at cursor position
      if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (onAddSection) {
          const flowPosition = screenToFlowPosition(mousePositionRef.current);
          onAddSection(flowPosition);
        }
        return;
      }

      // T key to add sticky at cursor position
      if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (onAddSticky) {
          const flowPosition = screenToFlowPosition(mousePositionRef.current);
          onAddSticky(flowPosition);
        }
        return;
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }

      // Delete or Backspace to delete selected notes/images/sections/stickies
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedSlugs = getSelectedNoteSlugs();
        const selectedImageIds = getSelectedImageIds();
        const selectedSectionSlugs = getSelectedSectionSlugs();
        const selectedStickySlugs = getSelectedStickySlugs();
        if (selectedSlugs.length > 0 || selectedImageIds.length > 0 || selectedSectionSlugs.length > 0 || selectedStickySlugs.length > 0) {
          e.preventDefault();
          onDeleteRequest(selectedSlugs, selectedImageIds, selectedSectionSlugs, selectedStickySlugs);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteDialogOpen, clearSelection, getSelectedNoteSlugs, getSelectedImageIds, getSelectedSectionSlugs, getSelectedStickySlugs, handleUndo, handleRedo, nodes, onDeleteRequest, onAddSection, onAddSticky, screenToFlowPosition]);
}
