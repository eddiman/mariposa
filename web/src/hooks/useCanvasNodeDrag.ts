import { useCallback, useRef } from 'react';
import type { Node } from '@xyflow/react';
import type { Position } from '../types';
import type { NodeSnapshot, HistoryAction } from './useCanvasHistory';
import type { GuideLine } from '../components/SnapGuides';

interface UseCanvasNodeDragProps<T extends Record<string, unknown>> {
  isTouch: boolean;
  activeTool: string;
  settings: { snapToObject: boolean; showSnapLines: boolean };
  getNodes: () => Node<T>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<T>[]>>;
  calculateSnap: (node: Node<T>, allNodes: Node<T>[]) => { x: number; y: number; guides: GuideLine[] };
  updateGuides: (guides: GuideLine[]) => void;
  clearGuides: () => void;
  historyPush: (action: HistoryAction) => void;
  onNotePositionChange: (slug: string, position: Position) => void;
  onImagePositionChange: (id: string, position: Position) => void;
}

export function useCanvasNodeDrag<T extends Record<string, unknown>>({
  isTouch,
  activeTool,
  settings,
  getNodes,
  setNodes,
  calculateSnap,
  updateGuides,
  clearGuides,
  historyPush,
  onNotePositionChange,
  onImagePositionChange,
}: UseCanvasNodeDragProps<T>) {
  const shiftKeyRef = useRef(false);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Handle node drag start - capture initial positions for history and auto-select
  const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: Node<T>, draggedNodes: Node<T>[]) => {
    if (isTouch && activeTool === 'pan') return;

    // Auto-select the node if not already selected (and shift is not held)
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

  // Handle node drag for snap-to-guides
  const handleNodeDrag = useCallback((_event: React.MouseEvent, node: Node<T>) => {
    if (isTouch && activeTool === 'pan') return;

    if (!settings.snapToObject) {
      clearGuides();
      return;
    }

    const allNodes = getNodes();
    const { x, y, guides: newGuides } = calculateSnap(node, allNodes);

    if (settings.showSnapLines) {
      updateGuides(newGuides);
    }

    if (x !== node.position.x || y !== node.position.y) {
      setNodes(currentNodes =>
        currentNodes.map(n =>
          n.id === node.id ? { ...n, position: { x, y } } : n
        )
      );
    }
  }, [getNodes, calculateSnap, updateGuides, clearGuides, setNodes, settings.snapToObject, settings.showSnapLines, isTouch, activeTool]);

  // Handle node drag stop - persist position, push to history, and clear guides
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node<T>, draggedNodes: Node<T>[]) => {
    if (isTouch && activeTool === 'pan') return;

    // Build history action from captured start positions
    if (dragStartPositionsRef.current.size > 0) {
      const beforeSnapshots: NodeSnapshot[] = [];
      const afterSnapshots: NodeSnapshot[] = [];

      for (const n of draggedNodes) {
        const startPos = dragStartPositionsRef.current.get(n.id);
        if (startPos) {
          if (startPos.x !== n.position.x || startPos.y !== n.position.y) {
            beforeSnapshots.push({ id: n.id, position: startPos });
            afterSnapshots.push({ id: n.id, position: { x: n.position.x, y: n.position.y } });
          }
        }
      }

      if (beforeSnapshots.length > 0) {
        historyPush({
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
  }, [onNotePositionChange, onImagePositionChange, clearGuides, historyPush, isTouch, activeTool]);

  return {
    shiftKeyRef,
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
  };
}
