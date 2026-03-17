import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { folderService } from './folderService.js';
import { configService } from './configService.js';
import { config } from '../config.js';

let tempDir: string;
let kbRoot: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mariposa-test-folder-'));
  kbRoot = path.join(tempDir, 'kbs');
  await fs.mkdir(kbRoot);

  Object.defineProperty(config, 'configDir', { value: tempDir, writable: true, configurable: true });
  Object.defineProperty(config, 'configFile', {
    get: () => path.join(tempDir, 'config.json'),
    configurable: true,
  });

  await fs.writeFile(
    path.join(tempDir, 'config.json'),
    JSON.stringify({ kbRoot }),
    'utf-8',
  );
  configService.clearCache();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

async function createTestKb(name: string) {
  const kbDir = path.join(kbRoot, name);
  await fs.mkdir(kbDir, { recursive: true });
  await fs.writeFile(
    path.join(kbDir, 'kb.yaml'),
    `name: ${name}\ndescription: Test\n`,
    'utf-8',
  );
  return kbDir;
}

describe('FolderService', () => {
  describe('list', () => {
    it('lists files and folders in KB root', async () => {
      const kbDir = await createTestKb('test-kb');
      await fs.mkdir(path.join(kbDir, 'data'));
      await fs.writeFile(path.join(kbDir, 'README.md'), '# Hello', 'utf-8');

      const listing = await folderService.list('test-kb');
      expect(listing).not.toBeNull();
      expect(listing!.kb).toBe('test-kb');
      expect(listing!.path).toBe('');

      const names = listing!.entries.map(e => e.name);
      expect(names).toContain('data');
      expect(names).toContain('README.md');
      expect(names).toContain('kb.yaml');

      // Folders should come first
      const folderIdx = listing!.entries.findIndex(e => e.name === 'data');
      const fileIdx = listing!.entries.findIndex(e => e.name === 'README.md');
      expect(folderIdx).toBeLessThan(fileIdx);
    });

    it('lists subfolder contents', async () => {
      const kbDir = await createTestKb('test-kb');
      const dataDir = path.join(kbDir, 'data');
      await fs.mkdir(dataDir);
      await fs.writeFile(path.join(dataDir, 'current.md'), '# Status', 'utf-8');
      await fs.mkdir(path.join(dataDir, 'events'));

      const listing = await folderService.list('test-kb', 'data');
      expect(listing).not.toBeNull();
      expect(listing!.path).toBe('data');
      expect(listing!.entries).toHaveLength(2);

      const names = listing!.entries.map(e => e.name);
      expect(names).toContain('current.md');
      expect(names).toContain('events');
    });

    it('hides hidden files and directories', async () => {
      const kbDir = await createTestKb('test-kb');
      await fs.writeFile(path.join(kbDir, '.hidden'), 'secret', 'utf-8');
      await fs.mkdir(path.join(kbDir, '.hidden-dir'));
      await fs.writeFile(path.join(kbDir, 'visible.md'), 'hello', 'utf-8');

      const listing = await folderService.list('test-kb');
      const names = listing!.entries.map(e => e.name);
      expect(names).not.toContain('.hidden');
      expect(names).not.toContain('.hidden-dir');
      expect(names).not.toContain('.mariposa.json');
      expect(names).toContain('visible.md');
    });

    it('returns null for nonexistent KB', async () => {
      const listing = await folderService.list('nonexistent');
      expect(listing).toBeNull();
    });

    it('returns null for nonexistent folder path', async () => {
      await createTestKb('test-kb');
      const listing = await folderService.list('test-kb', 'nonexistent/path');
      expect(listing).toBeNull();
    });

    it('prevents path traversal', async () => {
      await createTestKb('test-kb');
      const listing = await folderService.list('test-kb', '../../../etc');
      expect(listing).toBeNull();
    });

    it('includes file size and mtime for files', async () => {
      const kbDir = await createTestKb('test-kb');
      await fs.writeFile(path.join(kbDir, 'note.md'), '# Test note content', 'utf-8');

      const listing = await folderService.list('test-kb');
      const file = listing!.entries.find(e => e.name === 'note.md');
      expect(file).toBeDefined();
      expect(file!.size).toBeGreaterThan(0);
      expect(file!.mtime).toBeDefined();
    });
  });

  describe('getMeta / updateMeta', () => {
    it('returns default sidecar when none exists', async () => {
      await createTestKb('test-kb');
      const meta = await folderService.getMeta('test-kb');
      expect(meta).toEqual({
        items: {},
        sections: {},
        stickies: {},
        images: {},
      });
    });

    it('writes and reads sidecar data', async () => {
      await createTestKb('test-kb');

      const updated = await folderService.updateMeta('test-kb', '', {
        items: {
          'README.md': { position: { x: 100, y: 200 }, tags: ['important'] },
        },
      });

      expect(updated).not.toBeNull();
      expect(updated!.items['README.md'].position).toEqual({ x: 100, y: 200 });
      expect(updated!.items['README.md'].tags).toEqual(['important']);

      // Re-read
      const meta = await folderService.getMeta('test-kb');
      expect(meta!.items['README.md'].position).toEqual({ x: 100, y: 200 });
    });

    it('merges item updates without losing existing items', async () => {
      await createTestKb('test-kb');

      await folderService.updateMeta('test-kb', '', {
        items: { 'a.md': { position: { x: 10, y: 10 } } },
      });

      await folderService.updateMeta('test-kb', '', {
        items: { 'b.md': { position: { x: 20, y: 20 } } },
      });

      const meta = await folderService.getMeta('test-kb');
      expect(meta!.items['a.md']).toBeDefined();
      expect(meta!.items['b.md']).toBeDefined();
    });
  });

  describe('sections', () => {
    it('creates a section with UUID-based ID', async () => {
      await createTestKb('test-kb');

      const result1 = await folderService.createSection('test-kb', '', { name: 'First' });
      expect(result1).not.toBeNull();
      expect(result1!.id).toMatch(/^section-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result1!.section.name).toBe('First');

      const result2 = await folderService.createSection('test-kb', '', { name: 'Second' });
      expect(result2!.id).toMatch(/^section-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result2!.id).not.toBe(result1!.id); // Unique IDs

      const meta = await folderService.getMeta('test-kb');
      expect(Object.keys(meta!.sections)).toHaveLength(2);
    });

    it('deletes a section and clears item references', async () => {
      await createTestKb('test-kb');

      const result = await folderService.createSection('test-kb', '', { name: 'Target' });
      const sectionId = result!.id;

      // Assign an item to the section
      await folderService.updateMeta('test-kb', '', {
        items: { 'note.md': { section: sectionId } },
      });

      const deleted = await folderService.deleteSection('test-kb', '', sectionId);
      expect(deleted).toBe(true);

      const meta = await folderService.getMeta('test-kb');
      expect(meta!.sections[sectionId]).toBeUndefined();
      expect(meta!.items['note.md'].section).toBeUndefined();
    });

    it('returns false when deleting nonexistent section', async () => {
      await createTestKb('test-kb');
      const deleted = await folderService.deleteSection('test-kb', '', 'section-999');
      expect(deleted).toBe(false);
    });
  });

  describe('stickies', () => {
    it('creates a sticky with UUID-based ID', async () => {
      await createTestKb('test-kb');

      const result1 = await folderService.createSticky('test-kb', '', { text: 'Hello', color: 'pink' });
      expect(result1).not.toBeNull();
      expect(result1!.id).toMatch(/^sticky-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result1!.sticky.text).toBe('Hello');
      expect(result1!.sticky.color).toBe('pink');

      const result2 = await folderService.createSticky('test-kb', '', {});
      expect(result2!.id).toMatch(/^sticky-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result2!.id).not.toBe(result1!.id); // Unique IDs
      expect(result2!.sticky.color).toBe('yellow'); // default
    });

    it('deletes a sticky', async () => {
      await createTestKb('test-kb');
      const result = await folderService.createSticky('test-kb', '', { text: 'Remove me' });
      const stickyId = result!.id;

      const deleted = await folderService.deleteSticky('test-kb', '', stickyId);
      expect(deleted).toBe(true);

      const meta = await folderService.getMeta('test-kb');
      expect(meta!.stickies[stickyId]).toBeUndefined();
    });
  });
});
