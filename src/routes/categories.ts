import { Router, Request, Response } from 'express';
import { noteService } from '../services/noteService.js';
import { z } from 'zod';
import { ZodError } from 'zod';

const router = Router();

const CategoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required').regex(/^[a-zA-Z0-9_-]+$/, 'Category name can only contain letters, numbers, hyphens, and underscores'),
});

// List all categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await noteService.getCategories();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

// Create a new category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = CategoryCreateSchema.parse(req.body);
    const created = await noteService.createCategory(name);
    if (created) {
      res.status(201).json({ message: 'Category created', name });
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

// Delete a category (only if empty)
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const result = await noteService.deleteCategory(req.params.name);
    if (result.success) {
      res.status(204).send();
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
