import matter from 'gray-matter';
import type { Note, NoteMeta } from '../types/note.js';

export interface FrontmatterData {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function parseNote(fileContent: string): Note {
  const { data, content } = matter(fileContent);
  const meta = data as FrontmatterData;
  
  return {
    slug: meta.slug,
    title: meta.title,
    content: content.trim(),
    category: meta.category,
    tags: meta.tags || [],
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
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
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
}
