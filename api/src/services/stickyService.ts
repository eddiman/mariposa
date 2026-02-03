import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { config } from '../config.js';
import { getNextSlugForType } from '../utils/slugGenerator.js';
import type { Sticky, StickyCreateInput, StickyUpdateInput, StickyQuery, StickyColor } from '../types/sticky.js';
import type { Position } from '../types/note.js';

interface StickyFrontmatter {
  slug: string;
  text: string;
  color: StickyColor;
  position?: Position;
  category: string;
  createdAt: string;
  updatedAt: string;
}

function parseSticky(fileContent: string): Sticky {
  const { data } = matter(fileContent);
  const meta = data as StickyFrontmatter;
  
  // Handle position parsing - YAML may quote 'y' key
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
    text: meta.text || '',
    color: meta.color || 'yellow',
    position,
    category: meta.category || 'all-notes',
    createdAt: meta.createdAt || new Date().toISOString(),
    updatedAt: meta.updatedAt || new Date().toISOString(),
  };
}

function serializeSticky(sticky: Sticky): string {
  const frontmatter: StickyFrontmatter = {
    slug: sticky.slug,
    text: sticky.text,
    color: sticky.color,
    category: sticky.category,
    createdAt: sticky.createdAt,
    updatedAt: sticky.updatedAt,
  };

  if (sticky.position) {
    frontmatter.position = sticky.position;
  }

  // Stickies have no body content (text is in frontmatter)
  return matter.stringify('', frontmatter);
}

class StickyService {
  private notesDir: string;

  constructor() {
    this.notesDir = config.notesDir;
  }

  private async getCategories(): Promise<string[]> {
    const entries = await fs.readdir(this.notesDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name)
      .sort();
  }

  async list(query?: StickyQuery): Promise<Sticky[]> {
    const stickies: Sticky[] = [];
    const categories = await this.getCategories();

    for (const category of categories) {
      if (query?.category && category !== query.category) continue;

      const categoryPath = path.join(this.notesDir, category);
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        if (!file.startsWith('sticky-') || !file.endsWith('.md')) continue;

        const filePath = path.join(categoryPath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const sticky = parseSticky(fileContent);
        stickies.push(sticky);
      }
    }

    // Sort by createdAt descending
    return stickies.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async get(slug: string): Promise<Sticky | null> {
    const filePath = await this.findStickyFile(slug);
    if (!filePath) return null;

    const content = await fs.readFile(filePath, 'utf-8');
    return parseSticky(content);
  }

  async create(input: StickyCreateInput): Promise<Sticky> {
    const slug = await getNextSlugForType('sticky');
    const now = new Date().toISOString();
    const category = input.category || 'all-notes';

    // Ensure category directory exists
    const categoryPath = path.join(this.notesDir, category);
    await fs.mkdir(categoryPath, { recursive: true });

    const sticky: Sticky = {
      slug,
      text: input.text || '',
      color: input.color || 'yellow',
      position: input.position,
      category,
      createdAt: now,
      updatedAt: now,
    };

    const filePath = path.join(categoryPath, `${slug}.md`);
    const fileContent = serializeSticky(sticky);
    await fs.writeFile(filePath, fileContent, 'utf-8');

    return sticky;
  }

  async update(slug: string, input: StickyUpdateInput): Promise<Sticky | null> {
    const existingFilePath = await this.findStickyFile(slug);
    if (!existingFilePath) return null;

    const actualCategory = path.basename(path.dirname(existingFilePath));
    const existingContent = await fs.readFile(existingFilePath, 'utf-8');
    const existingSticky = parseSticky(existingContent);
    existingSticky.category = actualCategory;

    const now = new Date().toISOString();
    const newCategory = input.category || existingSticky.category;

    const updatedSticky: Sticky = {
      ...existingSticky,
      text: input.text ?? existingSticky.text,
      color: input.color ?? existingSticky.color,
      position: input.position ?? existingSticky.position,
      category: newCategory,
      updatedAt: now,
    };

    // If category changed, move the file
    if (newCategory !== actualCategory) {
      const newCategoryPath = path.join(this.notesDir, newCategory);
      await fs.mkdir(newCategoryPath, { recursive: true });
      const newPath = path.join(newCategoryPath, `${slug}.md`);

      const fileContent = serializeSticky(updatedSticky);
      await fs.writeFile(newPath, fileContent, 'utf-8');
      await fs.unlink(existingFilePath);
    } else {
      const fileContent = serializeSticky(updatedSticky);
      await fs.writeFile(existingFilePath, fileContent, 'utf-8');
    }

    return updatedSticky;
  }

  async delete(slug: string): Promise<boolean> {
    const filePath = await this.findStickyFile(slug);
    if (!filePath) return false;

    await fs.unlink(filePath);
    return true;
  }

  private async findStickyFile(slug: string): Promise<string | null> {
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

export const stickyService = new StickyService();
