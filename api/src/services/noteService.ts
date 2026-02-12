import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { parseNote, serializeNote } from '../utils/frontmatter.js';
import { getNextSlug } from '../utils/slugGenerator.js';
import type { Note, NoteMeta, NoteCreateInput, NoteUpdateInput, NoteQuery, CategoryMeta, Position, CategoryCreateInput, CategoryUpdateInput } from '../types/note.js';

interface FolderMeta {
  position?: Position;
  displayName?: string;
}

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

  async list(query?: NoteQuery): Promise<Note[]> {
    const notes: Note[] = [];
    const categories = await this.getCategories();

    for (const category of categories) {
      // Filter by category if specified
      if (query?.category && category !== query.category) continue;

      const categoryPath = path.join(this.notesDir, category);
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(categoryPath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const note = parseNote(fileContent);

        // Filter by tags if specified
        if (query?.tags) {
          const queryTags = query.tags.split(',').map(t => t.trim().toLowerCase());
          const noteTags = note.tags.map(t => t.toLowerCase());
          const hasAllTags = queryTags.every(qt => noteTags.includes(qt));
          if (!hasAllTags) continue;
        }

        // Filter by search if specified
        if (query?.search) {
          const searchLower = query.search.toLowerCase();
          const titleMatch = note.title.toLowerCase().includes(searchLower);
          const contentMatch = note.content.toLowerCase().includes(searchLower);
          if (!titleMatch && !contentMatch) continue;
        }

        notes.push(note);
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
      position: input.position,
      section: input.section,
      createdAt: now,
      updatedAt: now,
    };

    const filePath = path.join(categoryPath, `${slug}.md`);
    const fileContent = serializeNote(note);
    await fs.writeFile(filePath, fileContent, 'utf-8');

    return note;
  }

  async update(slug: string, input: NoteUpdateInput): Promise<Note | null> {
    console.log('Backend update called for note:', slug, 'Input:', JSON.stringify(input, null, 2));
    
    // Find the actual file path first - this is more reliable than parsing category from file
    const existingFilePath = await this.findNoteFile(slug);
    if (!existingFilePath) return null;

    // Extract actual category from the file path
    const actualCategory = path.basename(path.dirname(existingFilePath));

    const existingContent = await fs.readFile(existingFilePath, 'utf-8');
    const existingNote = parseNote(existingContent);
    console.log('Existing note content length:', existingNote.content?.length);
    
    // Use the actual category from file path, not the parsed one (which may be wrong due to race conditions)
    existingNote.category = actualCategory;

    const now = new Date().toISOString();
    const newCategory = input.category || existingNote.category;

    // Handle section field - null means clear, undefined means keep existing
    let newSection: string | undefined;
    if (input.section === null) {
      newSection = undefined; // Clear section
    } else if (input.section !== undefined) {
      newSection = input.section; // Set new section
    } else {
      newSection = existingNote.section; // Keep existing
    }

    const updatedNote: Note = {
      ...existingNote,
      title: input.title ?? existingNote.title,
      content: input.content ?? existingNote.content,
      category: newCategory,
      tags: input.tags ?? existingNote.tags,
      position: input.position ?? existingNote.position,
      section: newSection,
      updatedAt: now,
    };
    
    console.log('Updated note content length:', updatedNote.content?.length);

    // If category changed, move the file
    if (newCategory !== actualCategory) {
      const newCategoryPath = path.join(this.notesDir, newCategory);
      await fs.mkdir(newCategoryPath, { recursive: true });
      const newPath = path.join(newCategoryPath, `${slug}.md`);

      // Write to new location and delete old
      const fileContent = serializeNote(updatedNote);
      await fs.writeFile(newPath, fileContent, 'utf-8');
      await fs.unlink(existingFilePath);
    } else {
      const fileContent = serializeNote(updatedNote);
      await fs.writeFile(existingFilePath, fileContent, 'utf-8');
    }
    
    console.log('Note update completed successfully:', slug);
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

  async createCategory(input: CategoryCreateInput): Promise<CategoryMeta | null> {
    const categoryPath = path.join(this.notesDir, input.slug);
    try {
      await fs.mkdir(categoryPath, { recursive: true });
      
      // Write meta file with displayName
      const metaPath = this.getCategoryMetaPath(input.slug);
      const meta: FolderMeta = { displayName: input.displayName };
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
      
      return {
        name: input.slug,
        displayName: input.displayName,
        noteCount: 0,
      };
    } catch {
      return null;
    }
  }

  async deleteCategory(name: string, moveNotesToCategory?: string): Promise<{ success: boolean; error?: string; movedNotes?: number }> {
    if (name === config.defaultCategory) {
      return { success: false, error: 'Cannot delete the default category' };
    }

    const categoryPath = path.join(this.notesDir, name);
    
    try {
      const files = await fs.readdir(categoryPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      if (mdFiles.length > 0) {
        if (!moveNotesToCategory) {
          return { success: false, error: `Category has ${mdFiles.length} notes. Specify a target category to move them.` };
        }
        
        // Move all notes to the target category
        const targetPath = path.join(this.notesDir, moveNotesToCategory);
        await fs.mkdir(targetPath, { recursive: true });
        
        for (const file of mdFiles) {
          const oldPath = path.join(categoryPath, file);
          const newPath = path.join(targetPath, file);
          
          // Read note, update category, write to new location
          const content = await fs.readFile(oldPath, 'utf-8');
          const note = parseNote(content);
          note.category = moveNotesToCategory;
          const updatedContent = serializeNote(note);
          await fs.writeFile(newPath, updatedContent, 'utf-8');
          await fs.unlink(oldPath);
        }
      }

      // Remove meta file if exists
      const metaPath = this.getCategoryMetaPath(name);
      try {
        await fs.unlink(metaPath);
      } catch {
        // Meta file doesn't exist, that's fine
      }

      await fs.rmdir(categoryPath);
      return { success: true, movedNotes: mdFiles.length };
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

  // === Category Meta Methods ===

  private getCategoryMetaPath(category: string): string {
    return path.join(this.notesDir, category, '.folder-meta.json');
  }

  async getCategoryMeta(category: string): Promise<CategoryMeta | null> {
    const categoryPath = path.join(this.notesDir, category);
    
    try {
      await fs.access(categoryPath);
    } catch {
      return null; // Category doesn't exist
    }

    // Count notes in this category
    const files = await fs.readdir(categoryPath);
    const noteCount = files.filter(f => f.endsWith('.md')).length;

    // Read meta file if it exists
    let position: Position | undefined;
    let displayName: string = category; // Default to folder name
    
    const metaPath = this.getCategoryMetaPath(category);
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta: FolderMeta = JSON.parse(metaContent);
      position = meta.position;
      if (meta.displayName) {
        displayName = meta.displayName;
      }
    } catch {
      // No meta file or invalid JSON - use defaults
    }

    return {
      name: category,
      displayName,
      position,
      noteCount,
    };
  }

  async getCategoriesMeta(): Promise<CategoryMeta[]> {
    const categories = await this.getCategories();
    const metas: CategoryMeta[] = [];

    for (const category of categories) {
      const meta = await this.getCategoryMeta(category);
      if (meta) {
        metas.push(meta);
      }
    }

    return metas;
  }

  async updateCategoryMeta(category: string, update: CategoryUpdateInput): Promise<CategoryMeta | null> {
    const categoryPath = path.join(this.notesDir, category);
    
    try {
      await fs.access(categoryPath);
    } catch {
      return null; // Category doesn't exist
    }

    // Read existing meta
    const metaPath = this.getCategoryMetaPath(category);
    let existingMeta: FolderMeta = {};
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      existingMeta = JSON.parse(metaContent);
    } catch {
      // No existing meta
    }

    // Merge updates
    const newMeta: FolderMeta = {
      ...existingMeta,
      ...(update.position !== undefined && { position: update.position }),
      ...(update.displayName !== undefined && { displayName: update.displayName }),
    };

    await fs.writeFile(metaPath, JSON.stringify(newMeta, null, 2), 'utf-8');

    return this.getCategoryMeta(category);
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
