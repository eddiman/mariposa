import { Router, Request, Response } from 'express';
import { noteService } from '../services/noteService.js';
import { ZodError } from 'zod';
import { CategoryCreateSchema, CategoryUpdateSchema } from '../types/note.js';

const router = Router();

// List all categories (just names)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await noteService.getCategories();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

// List all categories with metadata (note counts, positions, displayNames)
router.get('/meta', async (_req: Request, res: Response) => {
  try {
    const categories = await noteService.getCategoriesMeta();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list category metadata' });
  }
});

// Get metadata for a specific category
router.get('/:name/meta', async (req: Request, res: Response) => {
  try {
    const meta = await noteService.getCategoryMeta(req.params.name);
    if (meta) {
      res.json(meta);
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get category metadata' });
  }
});

// Update category metadata (position, displayName)
router.put('/:name/meta', async (req: Request, res: Response) => {
  try {
    const update = CategoryUpdateSchema.parse(req.body);
    const meta = await noteService.updateCategoryMeta(req.params.name, update);
    if (meta) {
      res.json(meta);
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid metadata', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update category metadata' });
    }
  }
});

// Create a new category
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = CategoryCreateSchema.parse(req.body);
    const category = await noteService.createCategory(input);
    if (category) {
      res.status(201).json(category);
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid category data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
});

// Delete a category (with optional target for note migration)
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const moveToCategory = req.query.moveTo as string | undefined;
    const result = await noteService.deleteCategory(req.params.name, moveToCategory);
    if (result.success) {
      res.json({ success: true, movedNotes: result.movedNotes || 0 });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
