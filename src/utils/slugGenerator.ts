import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

const COUNTER_PATH = path.join(config.notesDir, config.counterFile);

export async function getNextSlug(): Promise<string> {
  let counter = 1;

  try {
    const content = await fs.readFile(COUNTER_PATH, 'utf-8');
    counter = parseInt(content.trim(), 10);
    if (isNaN(counter)) {
      counter = await scanForHighestSlug();
    }
  } catch (error) {
    // Counter file doesn't exist, scan existing notes
    counter = await scanForHighestSlug();
  }

  const slug = `note-${counter}`;
  
  // Save incremented counter
  await fs.writeFile(COUNTER_PATH, String(counter + 1), 'utf-8');
  
  return slug;
}

async function scanForHighestSlug(): Promise<number> {
  let highest = 0;

  try {
    const categories = await fs.readdir(config.notesDir);
    
    for (const category of categories) {
      const categoryPath = path.join(config.notesDir, category);
      const stat = await fs.stat(categoryPath);
      
      if (!stat.isDirectory() || category.startsWith('.')) continue;
      
      const files = await fs.readdir(categoryPath);
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        const match = file.match(/^note-(\d+)\.md$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highest) highest = num;
        }
      }
    }
  } catch (error) {
    // Notes directory might not exist yet
  }

  return highest + 1;
}

export function isValidSlug(slug: string): boolean {
  return /^note-\d+$/.test(slug);
}
