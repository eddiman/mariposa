import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { configService } from './configService.js';
import { KbYamlSchema } from '../types/kb.js';
import type { KbMeta } from '../types/kb.js';

class KbService {
  /**
   * Discover all KBs by scanning the kbRoot directory for subdirectories
   * containing a kb.yaml file.
   */
  async list(): Promise<KbMeta[]> {
    const kbRoot = await configService.getKbRoot();
    if (!kbRoot) return [];

    const kbs: KbMeta[] = [];

    try {
      const entries = await fs.readdir(kbRoot, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

        const kbPath = path.join(kbRoot, entry.name);
        const meta = await this.parseKbYaml(kbPath);
        if (meta) {
          kbs.push(meta);
        }
      }
    } catch {
      // kbRoot doesn't exist or can't be read
      return [];
    }

    return kbs.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get metadata for a single KB by name.
   */
  async get(name: string): Promise<KbMeta | null> {
    const kbRoot = await configService.getKbRoot();
    if (!kbRoot) return null;

    // Prevent path traversal
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return null;
    }

    const kbPath = path.join(kbRoot, name);
    return this.parseKbYaml(kbPath);
  }

  /**
   * Resolve a KB name to its absolute filesystem path.
   * Returns null if KB doesn't exist or path traversal detected.
   */
  async resolveKbPath(name: string): Promise<string | null> {
    const kbRoot = await configService.getKbRoot();
    if (!kbRoot) return null;

    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return null;
    }

    const kbPath = path.join(kbRoot, name);

    try {
      const yamlPath = path.join(kbPath, 'kb.yaml');
      await fs.access(yamlPath);
      return kbPath;
    } catch {
      return null;
    }
  }

  // === Private ===

  private async parseKbYaml(kbPath: string): Promise<KbMeta | null> {
    try {
      const yamlPath = path.join(kbPath, 'kb.yaml');
      const content = await fs.readFile(yamlPath, 'utf-8');
      const raw = yaml.load(content);
      const parsed = KbYamlSchema.parse(raw);

      return {
        name: parsed.name,
        description: parsed.description,
        path: kbPath,
        access: parsed.access,
        created: parsed.created,
      };
    } catch {
      return null;
    }
  }
}

export const kbService = new KbService();
