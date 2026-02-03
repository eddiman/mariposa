import { Router, Request, Response } from 'express';
import { sectionService } from '../services/sectionService.js';
import { SectionCreateSchema, SectionUpdateSchema, SectionQuerySchema } from '../types/section.js';
import { ZodError } from 'zod';

const router = Router();

// List all sections with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = SectionQuerySchema.parse(req.query);
    const sections = await sectionService.list(query);
    res.json({ sections, total: sections.length });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to list sections' });
    }
  }
});

// Get a single section by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const section = await sectionService.get(req.params.slug);
    if (!section) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }
    res.json(section);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get section' });
  }
});

// Create a new section
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = SectionCreateSchema.parse(req.body);
    const section = await sectionService.create(input);
    res.status(201).json(section);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid section data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create section' });
    }
  }
});

// Update an existing section
router.put('/:slug', async (req: Request, res: Response) => {
  try {
    const input = SectionUpdateSchema.parse(req.body);
    const section = await sectionService.update(req.params.slug, input);
    if (!section) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }
    res.json(section);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid section data', details: error.errors });
    } else {
      console.error('Failed to update section:', error);
      res.status(500).json({ error: 'Failed to update section' });
    }
  }
});

// Delete a section
router.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const deleted = await sectionService.delete(req.params.slug);
    if (!deleted) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

export default router;
