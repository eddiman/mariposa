import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

const COUNTER_PATH = path.join(config.notesDir, config.counterFile);

export async function getNextSlug(): Promise<string> {
  return getNextSlugForType('note');
}

export async function getNextSlugForType(type: 'note' | 'section' | 'sticky'): Promise<string> {
  const counterFile = type === 'note' ? config.counterFile : `.${type}-counter`;
  const counterPath = path.join(config.notesDir, counterFile);
  
  let counter = 1;

  try {
    const content = await fs.readFile(counterPath, 'utf-8');
    counter = parseInt(content.trim(), 10);
    if (isNaN(counter)) {
      counter = await scanForHighestSlugOfType(type);
    }
  } catch {
    // Counter file doesn't exist, scan existing files
    counter = await scanForHighestSlugOfType(type);
  }

  const slug = `${type}-${counter}`;
  
  // Save incremented counter
  await fs.writeFile(counterPath, String(counter + 1), 'utf-8');
  
  return slug;
}

async function scanForHighestSlugOfType(type: string): Promise<number> {
  let highest = 0;
  const pattern = new RegExp(`^${type}-(\\d+)\\.md$`);

  try {
    const categories = await fs.readdir(config.notesDir);
    
    for (const category of categories) {
      const categoryPath = path.join(config.notesDir, category);
      const stat = await fs.stat(categoryPath);
      
      if (!stat.isDirectory() || category.startsWith('.')) continue;
      
      const files = await fs.readdir(categoryPath);
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        const match = file.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highest) highest = num;
        }
      }
    }
  } catch {
    // Notes directory might not exist yet
  }

  return highest + 1;
}

export function isValidSlug(slug: string): boolean {
  return /^note-\d+$/.test(slug);
}

export function isValidSectionSlug(slug: string): boolean {
  return /^section-\d+$/.test(slug);
}

export function isValidStickySlug(slug: string): boolean {
  return /^sticky-\d+$/.test(slug);
}
