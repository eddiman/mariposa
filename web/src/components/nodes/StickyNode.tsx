import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Sticky, StickyColor } from '../../types';
import styles from './StickyNode.module.css';

export interface StickyNodeData extends Sticky {
  onTextChange?: (slug: string, text: string) => void;
  isPanMode?: boolean;
  [key: string]: unknown;
}

interface StickyNodeProps {
  data: StickyNodeData;
  selected?: boolean;
}

function StickyNodeComponent({ data, selected }: StickyNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync text from data
  useEffect(() => {
    if (!isEditing) {
      setEditText(data.text);
    }
  }, [data.text, isEditing]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data.isPanMode) {
      setIsEditing(true);
    }
  }, [data.isPanMode]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText !== data.text && data.onTextChange) {
      data.onTextChange(data.slug, editText);
    }
  }, [editText, data.text, data.onTextChange, data.slug]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditText(data.text);
      setIsEditing(false);
    }
    // Allow Enter for multiline, but Cmd/Ctrl+Enter to save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
    }
  }, [data.text]);

  const colorClass = styles[data.color as StickyColor] || styles.yellow;

  return (
    <div
      className={`${styles['sticky-node']} ${colorClass} ${selected ? styles.selected : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className={styles['sticky-input']}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          placeholder="Enter text..."
        />
      ) : (
        <div className={styles['sticky-text']}>
          {data.text || 'Double-click to edit'}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const StickyNode = memo(StickyNodeComponent);
