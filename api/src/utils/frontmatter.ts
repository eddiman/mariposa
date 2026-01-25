import matter from 'gray-matter';
import type { Note, NoteMeta, Position } from '../types/note.js';

export interface FrontmatterData {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  position?: Position;
  createdAt: string;
  updatedAt: string;
}

export function parseNote(fileContent: string): Note {
  const { data, content } = matter(fileContent);
  const meta = data as FrontmatterData;
  
  // Handle position parsing - YAML may quote 'y' key as it's a reserved word
  let position: Position | undefined;
  if (meta.position) {
    const pos = meta.position as Record<string, unknown>;
    position = {
      x: typeof pos.x === 'number' ? pos.x : 0,
      y: typeof pos.y === 'number' ? pos.y : (typeof pos['y'] === 'number' ? pos['y'] : 0),
    };
  }
  
  return {
    slug: meta.slug || '',
    title: meta.title || 'Untitled',
    content: content.trim(),
    category: meta.category || 'uncategorized',
    tags: meta.tags || [],
    position,
    createdAt: meta.createdAt || new Date().toISOString(),
    updatedAt: meta.updatedAt || new Date().toISOString(),
  };
}

export function serializeNote(note: Note): string {
  const frontmatter: FrontmatterData = {
    slug: note.slug,
    title: note.title,
    category: note.category,
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };

  // Only include position if it exists
  if (note.position) {
    frontmatter.position = note.position;
  }

  return matter.stringify(note.content, frontmatter);
}

export function parseNoteMeta(fileContent: string): NoteMeta {
  const { data } = matter(fileContent);
  const meta = data as FrontmatterData;
  
  return {
    slug: meta.slug,
    title: meta.title,
    category: meta.category,
    tags: meta.tags || [],
    position: meta.position,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
}
