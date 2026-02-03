import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { config } from '../config.js';
import { getNextSlugForType } from '../utils/slugGenerator.js';
import type { Section, SectionCreateInput, SectionUpdateInput, SectionQuery } from '../types/section.js';
import type { Position } from '../types/note.js';

interface SectionFrontmatter {
  slug: string;
  name: string;
  width: number;
  height: number;
  color?: string;
  position?: Position;
  category: string;
  createdAt: string;
  updatedAt: string;
}

function parseSection(fileContent: string): Section {
  const { data } = matter(fileContent);
  const meta = data as SectionFrontmatter;
  
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
    name: meta.name || 'Section',
    width: meta.width || 300,
    height: meta.height || 200,
    color: meta.color,
    position,
    category: meta.category || 'all-notes',
    createdAt: meta.createdAt || new Date().toISOString(),
    updatedAt: meta.updatedAt || new Date().toISOString(),
  };
}

function serializeSection(section: Section): string {
  const frontmatter: SectionFrontmatter = {
    slug: section.slug,
    name: section.name,
    width: section.width,
    height: section.height,
    category: section.category,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };

  if (section.color) {
    frontmatter.color = section.color;
  }
  if (section.position) {
    frontmatter.position = section.position;
  }

  // Sections have no body content
  return matter.stringify('', frontmatter);
}

class SectionService {
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

  async list(query?: SectionQuery): Promise<Section[]> {
    const sections: Section[] = [];
    const categories = await this.getCategories();

    for (const category of categories) {
      if (query?.category && category !== query.category) continue;

      const categoryPath = path.join(this.notesDir, category);
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        if (!file.startsWith('section-') || !file.endsWith('.md')) continue;

        const filePath = path.join(categoryPath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const section = parseSection(fileContent);
        sections.push(section);
      }
    }

    // Sort by createdAt descending
    return sections.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async get(slug: string): Promise<Section | null> {
    const filePath = await this.findSectionFile(slug);
    if (!filePath) return null;

    const content = await fs.readFile(filePath, 'utf-8');
    return parseSection(content);
  }

  async create(input: SectionCreateInput): Promise<Section> {
    const slug = await getNextSlugForType('section');
    const now = new Date().toISOString();
    const category = input.category || 'all-notes';

    // Ensure category directory exists
    const categoryPath = path.join(this.notesDir, category);
    await fs.mkdir(categoryPath, { recursive: true });

    const section: Section = {
      slug,
      name: input.name || 'Section',
      width: input.width || 300,
      height: input.height || 200,
      color: input.color,
      position: input.position,
      category,
      createdAt: now,
      updatedAt: now,
    };

    const filePath = path.join(categoryPath, `${slug}.md`);
    const fileContent = serializeSection(section);
    await fs.writeFile(filePath, fileContent, 'utf-8');

    return section;
  }

  async update(slug: string, input: SectionUpdateInput): Promise<Section | null> {
    const existingFilePath = await this.findSectionFile(slug);
    if (!existingFilePath) return null;

    const actualCategory = path.basename(path.dirname(existingFilePath));
    const existingContent = await fs.readFile(existingFilePath, 'utf-8');
    const existingSection = parseSection(existingContent);
    existingSection.category = actualCategory;

    const now = new Date().toISOString();
    const newCategory = input.category || existingSection.category;

    const updatedSection: Section = {
      ...existingSection,
      name: input.name ?? existingSection.name,
      width: input.width ?? existingSection.width,
      height: input.height ?? existingSection.height,
      color: input.color ?? existingSection.color,
      position: input.position ?? existingSection.position,
      category: newCategory,
      updatedAt: now,
    };

    // If category changed, move the file
    if (newCategory !== actualCategory) {
      const newCategoryPath = path.join(this.notesDir, newCategory);
      await fs.mkdir(newCategoryPath, { recursive: true });
      const newPath = path.join(newCategoryPath, `${slug}.md`);

      const fileContent = serializeSection(updatedSection);
      await fs.writeFile(newPath, fileContent, 'utf-8');
      await fs.unlink(existingFilePath);
    } else {
      const fileContent = serializeSection(updatedSection);
      await fs.writeFile(existingFilePath, fileContent, 'utf-8');
    }

    return updatedSection;
  }

  async delete(slug: string): Promise<boolean> {
    const filePath = await this.findSectionFile(slug);
    if (!filePath) return false;

    await fs.unlink(filePath);
    return true;
  }

  private async findSectionFile(slug: string): Promise<string | null> {
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

export const sectionService = new SectionService();
