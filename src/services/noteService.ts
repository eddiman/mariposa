import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { parseNote, parseNoteMeta, serializeNote } from '../utils/frontmatter.js';
import { getNextSlug } from '../utils/slugGenerator.js';
import type { Note, NoteMeta, NoteCreateInput, NoteUpdateInput, NoteQuery } from '../types/note.js';

class NoteService {
  private notesDir: string;

  constructor() {
    this.notesDir = config.notesDir;
  }

  async init(): Promise<void> {
    // Ensure notes directory and default category exist
    const defaultCategoryPath = path.join(this.notesDir, config.defaultCategory);
    await fs.mkdir(defaultCategoryPath, { recursive: true });
  }

  async list(query?: NoteQuery): Promise<NoteMeta[]> {
    const notes: NoteMeta[] = [];
    const categories = await this.getCategories();

    for (const category of categories) {
      // Filter by category if specified
      if (query?.category && category !== query.category) continue;

      const categoryPath = path.join(this.notesDir, category);
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(categoryPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const meta = parseNoteMeta(content);

        // Filter by tags if specified
        if (query?.tags) {
          const queryTags = query.tags.split(',').map(t => t.trim().toLowerCase());
          const noteTags = meta.tags.map(t => t.toLowerCase());
          const hasAllTags = queryTags.every(qt => noteTags.includes(qt));
          if (!hasAllTags) continue;
        }

        // Filter by search if specified
        if (query?.search) {
          const searchLower = query.search.toLowerCase();
          const titleMatch = meta.title.toLowerCase().includes(searchLower);
          if (!titleMatch) {
            // Also check content for full notes
            const fullNote = parseNote(content);
            if (!fullNote.content.toLowerCase().includes(searchLower)) {
              continue;
            }
          }
        }

        notes.push(meta);
      }
    }

    // Sort by updatedAt descending (newest first)
    return notes.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async get(slug: string): Promise<Note | null> {
    const filePath = await this.findNoteFile(slug);
    if (!filePath) return null;

    const content = await fs.readFile(filePath, 'utf-8');
    return parseNote(content);
  }

  async create(input: NoteCreateInput): Promise<Note> {
    const slug = await getNextSlug();
    const now = new Date().toISOString();
    const category = input.category || config.defaultCategory;

    // Ensure category directory exists
    const categoryPath = path.join(this.notesDir, category);
    await fs.mkdir(categoryPath, { recursive: true });

    const note: Note = {
      slug,
      title: input.title,
      content: input.content || '',
      category,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    const filePath = path.join(categoryPath, `${slug}.md`);
    const fileContent = serializeNote(note);
    await fs.writeFile(filePath, fileContent, 'utf-8');

    return note;
  }

  async update(slug: string, input: NoteUpdateInput): Promise<Note | null> {
    const existingNote = await this.get(slug);
    if (!existingNote) return null;

    const now = new Date().toISOString();
    const newCategory = input.category || existingNote.category;

    const updatedNote: Note = {
      ...existingNote,
      title: input.title ?? existingNote.title,
      content: input.content ?? existingNote.content,
      category: newCategory,
      tags: input.tags ?? existingNote.tags,
      updatedAt: now,
    };

    // If category changed, move the file
    if (newCategory !== existingNote.category) {
      const oldPath = path.join(this.notesDir, existingNote.category, `${slug}.md`);
      const newCategoryPath = path.join(this.notesDir, newCategory);
      await fs.mkdir(newCategoryPath, { recursive: true });
      const newPath = path.join(newCategoryPath, `${slug}.md`);

      // Write to new location and delete old
      const fileContent = serializeNote(updatedNote);
      await fs.writeFile(newPath, fileContent, 'utf-8');
      await fs.unlink(oldPath);
    } else {
      const filePath = path.join(this.notesDir, existingNote.category, `${slug}.md`);
      const fileContent = serializeNote(updatedNote);
      await fs.writeFile(filePath, fileContent, 'utf-8');
    }

    return updatedNote;
  }

  async delete(slug: string): Promise<boolean> {
    const filePath = await this.findNoteFile(slug);
    if (!filePath) return false;

    await fs.unlink(filePath);
    return true;
  }

  async getCategories(): Promise<string[]> {
    const entries = await fs.readdir(this.notesDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name)
      .sort();
  }

  async createCategory(name: string): Promise<boolean> {
    const categoryPath = path.join(this.notesDir, name);
    try {
      await fs.mkdir(categoryPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  async deleteCategory(name: string): Promise<{ success: boolean; error?: string }> {
    if (name === config.defaultCategory) {
      return { success: false, error: 'Cannot delete the default category' };
    }

    const categoryPath = path.join(this.notesDir, name);
    
    try {
      const files = await fs.readdir(categoryPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      if (mdFiles.length > 0) {
        return { success: false, error: 'Category is not empty' };
      }

      await fs.rmdir(categoryPath);
      return { success: true };
    } catch {
      return { success: false, error: 'Category not found' };
    }
  }

  async getTags(): Promise<string[]> {
    const notes = await this.list();
    const tagSet = new Set<string>();
    
    for (const note of notes) {
      for (const tag of note.tags) {
        tagSet.add(tag);
      }
    }

    return Array.from(tagSet).sort();
  }

  private async findNoteFile(slug: string): Promise<string | null> {
    const categories = await this.getCategories();

    for (const category of categories) {
      const filePath = path.join(this.notesDir, category, `${slug}.md`);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // File doesn't exist in this category
      }
    }

    return null;
  }
}

export const noteService = new NoteService();
