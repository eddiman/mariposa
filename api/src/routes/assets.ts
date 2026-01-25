import { Router } from 'express';
import multer from 'multer';
import { imageService } from '../services/imageService.js';
import type { ImageMetadata } from '../services/imageService.js';

const router = Router();

// Configure multer for memory storage (we'll process with sharp)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, SVG, and HEIC are allowed.'));
    }
  },
});

// POST /api/assets/upload - Upload an image
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const category = req.body.category as string | undefined;

    const processed = await imageService.processAndSave(
      req.file.buffer,
      req.file.originalname,
      category
    );

    const urls = imageService.getUrls(processed.id);

    const metadata: ImageMetadata = {
      id: processed.id,
      ...urls,
      width: processed.width,
      height: processed.height,
      aspectRatio: processed.width / processed.height,
      category: processed.category,
    };

    res.status(201).json(metadata);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// GET /api/assets - List all images (optionally filter by category)
router.get('/', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const images = await imageService.list(category);
    res.json({ images, total: images.length });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// GET /api/assets/:filename - Get an image file
router.get('/:filename', async (req, res) => {
  try {
    const result = await imageService.get(req.params.filename);
    
    if (!result) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    res.set('Content-Type', result.contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(result.buffer);
  } catch (error) {
    console.error('Get error:', error);
    res.status(500).json({ error: 'Failed to get image' });
  }
});

// POST /api/assets/:id/duplicate - Duplicate an image
router.post('/:id/duplicate', async (req, res) => {
  try {
    const category = req.body.category as string | undefined;
    const processed = await imageService.duplicate(req.params.id, category);
    
    if (!processed) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const urls = imageService.getUrls(processed.id);

    const metadata: ImageMetadata = {
      id: processed.id,
      ...urls,
      width: processed.width,
      height: processed.height,
      aspectRatio: processed.width / processed.height,
      category: processed.category,
    };

    res.status(201).json(metadata);
  } catch (error) {
    console.error('Duplicate error:', error);
    res.status(500).json({ error: 'Failed to duplicate image' });
  }
});

// PATCH /api/assets/:id - Update image metadata (category)
router.patch('/:id', async (req, res) => {
  try {
    const category = req.body.category as string | null | undefined;
    
    if (category === undefined) {
      res.status(400).json({ error: 'No update data provided' });
      return;
    }

    const success = await imageService.updateCategory(req.params.id, category);
    
    if (!success) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// DELETE /api/assets/:id - Delete an image and all its variants
router.delete('/:id', async (req, res) => {
  try {
    const success = await imageService.delete(req.params.id);
    
    if (!success) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
