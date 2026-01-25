import { memo, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Markdown } from 'tiptap-markdown';
// import { isTouchDevice } from '../../utils/platform.js'; // Unused - see TODO below
import type { Note } from '../../types';

export interface OriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NoteNodeData extends Note {
  onOpen: (slug: string, category: string, originRect: OriginRect) => void;
  categoryDisplayName?: string;
  isPanMode?: boolean;
  [key: string]: unknown; // Allow index signature for React Flow
}

// Read-only TipTap editor for rendering markdown content
function ReadOnlyContent({ content }: { content: string }) {
  const lastContentRef = useRef<string>(content);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Highlight.configure({ multicolor: false }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'note-preview-image',
        },
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'note-card-content',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      lastContentRef.current = content;
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}

function NoteNodeComponent({ data }: { data: NoteNodeData }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  // const lastTapRef = useRef<number>(0); // Unused - see TODO below
  // const doubleTapTimeout = 300; // ms threshold for double-tap - Unused - see TODO below

  const openNote = useCallback(() => {
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      data.onOpen(data.slug, data.category, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    } else {
      // Fallback if ref not available
      data.onOpen(data.slug, data.category, { x: 0, y: 0, width: 200, height: 283 });
    }
  }, [data]);

  const handleDoubleClick = useCallback(() => {
    // Block opening notes in pan mode
    if (data.isPanMode) return;
    openNote();
  }, [openNote, data.isPanMode]);

  // TODO: Double-tap to open note - currently disabled because it interferes with
  // pinch-to-zoom gestures on mobile. The double-tap detection fires during zoom,
  // causing notes to open unexpectedly. Need to find a way to differentiate between
  // intentional double-tap and zoom gesture.
  //
  // Handle touch events for double-tap detection on mobile
  // const handleTouchEnd = useCallback((e: React.TouchEvent) => {
  //   if (!isTouchDevice()) return;
  //   
  //   const now = Date.now();
  //   const timeSinceLastTap = now - lastTapRef.current;
  //   
  //   if (timeSinceLastTap < doubleTapTimeout && timeSinceLastTap > 0) {
  //     // Double tap detected
  //     e.preventDefault();
  //     openNote();
  //     lastTapRef.current = 0; // Reset to prevent triple-tap
  //   } else {
  //     lastTapRef.current = now;
  //   }
  // }, [openNote]);

  return (
    <div 
      ref={nodeRef}
      className="note-node"
      onDoubleClick={handleDoubleClick}
      // onTouchEnd={handleTouchEnd} // Disabled - see TODO above
    >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      
      <div className="note-node-paper">
        <h1 className="note-node-title">{data.title || 'Untitled'}</h1>
        {data.categoryDisplayName && data.category !== 'all-notes' && (
          <div className="note-node-category">in: {data.categoryDisplayName}</div>
        )}
        <ReadOnlyContent content={data.content} />
        <div className="note-node-fade" />
      </div>
      
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const NoteNode = memo(NoteNodeComponent);
