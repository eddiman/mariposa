import { Router, Request, Response } from 'express';
import { stickyService } from '../services/stickyService.js';
import { StickyCreateSchema, StickyUpdateSchema, StickyQuerySchema } from '../types/sticky.js';
import { ZodError } from 'zod';

const router = Router();

// List all stickies with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = StickyQuerySchema.parse(req.query);
    const stickies = await stickyService.list(query);
    res.json({ stickies, total: stickies.length });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to list stickies' });
    }
  }
});

// Get a single sticky by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const sticky = await stickyService.get(req.params.slug);
    if (!sticky) {
      res.status(404).json({ error: 'Sticky not found' });
      return;
    }
    res.json(sticky);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sticky' });
  }
});

// Create a new sticky
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = StickyCreateSchema.parse(req.body);
    const sticky = await stickyService.create(input);
    res.status(201).json(sticky);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid sticky data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create sticky' });
    }
  }
});

// Update an existing sticky
router.put('/:slug', async (req: Request, res: Response) => {
  try {
    const input = StickyUpdateSchema.parse(req.body);
    const sticky = await stickyService.update(req.params.slug, input);
    if (!sticky) {
      res.status(404).json({ error: 'Sticky not found' });
      return;
    }
    res.json(sticky);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid sticky data', details: error.errors });
    } else {
      console.error('Failed to update sticky:', error);
      res.status(500).json({ error: 'Failed to update sticky' });
    }
  }
});

// Delete a sticky
router.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const deleted = await stickyService.delete(req.params.slug);
    if (!deleted) {
      res.status(404).json({ error: 'Sticky not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sticky' });
  }
});

export default router;
