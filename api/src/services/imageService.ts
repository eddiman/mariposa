import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

export interface ImageMetadata {
  id: string;
  webpUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  category?: string;
}

interface ImageMeta {
  category?: string;
}

interface ProcessedImage {
  id: string;
  webpPath: string;
  thumbPath: string;
  width: number;
  height: number;
}

class ImageService {
  private assetsDir: string;

  constructor() {
    this.assetsDir = config.assetsDir;
  }

  async init(): Promise<void> {
    await fs.mkdir(this.assetsDir, { recursive: true });
  }

  private getImageMetaPath(id: string): string {
    return path.join(this.assetsDir, `${id}.meta.json`);
  }

  private async getImageMeta(id: string): Promise<ImageMeta> {
    try {
      const metaPath = this.getImageMetaPath(id);
      const content = await fs.readFile(metaPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async setImageMeta(id: string, meta: ImageMeta): Promise<void> {
    const metaPath = this.getImageMetaPath(id);
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  async processAndSave(buffer: Buffer, _originalName: string, category?: string): Promise<ProcessedImage & { category?: string }> {
    const id = uuidv4();

    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Define file paths (only WebP versions)
    const webpPath = path.join(this.assetsDir, `${id}.webp`);
    const thumbPath = path.join(this.assetsDir, `${id}-thumb.webp`);

    // Create WebP version (quality 80)
    await sharp(buffer)
      .webp({ quality: 80 })
      .toFile(webpPath);

    // Create thumbnail (300px width, quality 75)
    await sharp(buffer)
      .resize(300, null, { withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(thumbPath);

    // Save category if provided
    if (category) {
      await this.setImageMeta(id, { category });
    }

    return {
      id,
      webpPath,
      thumbPath,
      width,
      height,
      category,
    };
  }

  getUrls(id: string): { webpUrl: string; thumbUrl: string } {
    return {
      webpUrl: `/api/assets/${id}.webp`,
      thumbUrl: `/api/assets/${id}-thumb.webp`,
    };
  }

  async get(filename: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const filePath = path.join(this.assetsDir, filename);

    try {
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(filename).toLowerCase();

      const contentTypes: Record<string, string> = {
        '.webp': 'image/webp',
      };

      return {
        buffer,
        contentType: contentTypes[ext] || 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const files = await fs.readdir(this.assetsDir);
      const matchingFiles = files.filter(f => f.startsWith(id));

      if (matchingFiles.length === 0) {
        return false;
      }

      for (const file of matchingFiles) {
        const filePath = path.join(this.assetsDir, file);
        await fs.unlink(filePath);
      }

      return true;
    } catch {
      return false;
    }
  }

  async duplicate(id: string, category?: string): Promise<(ProcessedImage & { category?: string }) | null> {
    const newId = uuidv4();
    const oldWebpPath = path.join(this.assetsDir, `${id}.webp`);
    const oldThumbPath = path.join(this.assetsDir, `${id}-thumb.webp`);
    const newWebpPath = path.join(this.assetsDir, `${newId}.webp`);
    const newThumbPath = path.join(this.assetsDir, `${newId}-thumb.webp`);

    try {
      // Check if source exists
      await fs.access(oldWebpPath);
      
      // Copy the files
      await fs.copyFile(oldWebpPath, newWebpPath);
      await fs.copyFile(oldThumbPath, newThumbPath);
      
      // Get dimensions from the copied file
      const metadata = await sharp(newWebpPath).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;

      // Get original category if not provided
      let finalCategory = category;
      if (finalCategory === undefined) {
        const originalMeta = await this.getImageMeta(id);
        finalCategory = originalMeta.category;
      }

      // Save category if present
      if (finalCategory) {
        await this.setImageMeta(newId, { category: finalCategory });
      }

      return {
        id: newId,
        webpPath: newWebpPath,
        thumbPath: newThumbPath,
        width,
        height,
        category: finalCategory,
      };
    } catch {
      return null;
    }
  }

  async list(category?: string): Promise<ImageMetadata[]> {
    try {
      const files = await fs.readdir(this.assetsDir);
      
      // Group files by ID (UUID part before extension or -thumb)
      const idSet = new Set<string>();
      for (const file of files) {
        // Extract UUID from filename (only count main webp files, not thumbs)
        const match = file.match(/^([a-f0-9-]{36})\.webp$/);
        if (match) {
          idSet.add(match[1]);
        }
      }

      const images: ImageMetadata[] = [];
      for (const id of idSet) {
        const webpPath = path.join(this.assetsDir, `${id}.webp`);
        
        try {
          // Get image metadata (category)
          const imageMeta = await this.getImageMeta(id);
          
          // Filter by category if specified
          if (category !== undefined) {
            // If filtering by category, only include images in that category
            if (imageMeta.category !== category) {
              continue;
            }
          }

          const metadata = await sharp(webpPath).metadata();
          const width = metadata.width || 800;
          const height = metadata.height || 600;
          
          images.push({
            id,
            ...this.getUrls(id),
            width,
            height,
            aspectRatio: width / height,
            category: imageMeta.category,
          });
        } catch {
          // Skip if we can't read metadata
        }
      }

      return images;
    } catch {
      return [];
    }
  }

  async updateCategory(id: string, category: string | null): Promise<boolean> {
    try {
      const webpPath = path.join(this.assetsDir, `${id}.webp`);
      await fs.access(webpPath);
      
      const meta = await this.getImageMeta(id);
      if (category === null) {
        delete meta.category;
      } else {
        meta.category = category;
      }
      await this.setImageMeta(id, meta);
      return true;
    } catch {
      return false;
    }
  }
}

export const imageService = new ImageService();
