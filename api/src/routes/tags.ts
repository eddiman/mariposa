import { Router, Request, Response } from 'express';
import { noteService } from '../services/noteService.js';

const router = Router();

// List all unique tags
router.get('/', async (_req: Request, res: Response) => {
  try {
    const tags = await noteService.getTags();
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list tags' });
  }
});

export default router;
