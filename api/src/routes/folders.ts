import { Router, Request, Response } from 'express';
import { folderService } from '../services/folderService.js';

const router = Router();

// GET /api/folders?kb=:kb&path=:path — List folder contents
router.get('/', async (req: Request, res: Response) => {
  try {
    const kb = req.query.kb as string;
    const folderPath = (req.query.path as string) || '';

    if (!kb) {
      res.status(400).json({ error: 'Missing required query parameter: kb' });
      return;
    }

    const listing = await folderService.list(kb, folderPath);
    if (!listing) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list folder' });
  }
});

// GET /api/folders/meta?kb=:kb&path=:path — Get .mariposa.json
router.get('/meta', async (req: Request, res: Response) => {
  try {
    const kb = req.query.kb as string;
    const folderPath = (req.query.path as string) || '';

    if (!kb) {
      res.status(400).json({ error: 'Missing required query parameter: kb' });
      return;
    }

    const meta = await folderService.getMeta(kb, folderPath);
    if (!meta) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    res.json(meta);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get folder metadata' });
  }
});

// PUT /api/folders/meta?kb=:kb&path=:path — Update .mariposa.json
router.put('/meta', async (req: Request, res: Response) => {
  try {
    const kb = req.query.kb as string;
    const folderPath = (req.query.path as string) || '';

    if (!kb) {
      res.status(400).json({ error: 'Missing required query parameter: kb' });
      return;
    }

    const updated = await folderService.updateMeta(kb, folderPath, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update folder metadata' });
  }
});

// POST /api/folders/sections?kb=:kb&path=:path — Create a section
router.post('/sections', async (req: Request, res: Response) => {
  try {
    const kb = req.query.kb as string;
    const folderPath = (req.query.path as string) || '';

    if (!kb) {
      res.status(400).json({ error: 'Missing required query parameter: kb' });
      return;
    }

    const result = await folderService.createSection(kb, folderPath, req.body);
    if (!result) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// DELETE /api/folders/sections?kb=:kb&path=:path&id=:id — Delete a section
router.delete('/sections', async (req: Request, res: Response) => {
  try {
    const kb = req.query.kb as string;
    const folderPath = (req.query.path as string) || '';
    const sectionId = req.query.id as string;

    if (!kb || !sectionId) {
      res.status(400).json({ error: 'Missing required query parameters: kb, id' });
      return;
    }

    const deleted = await folderService.deleteSection(kb, folderPath, sectionId);
    if (!deleted) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// POST /api/folders/stickies?kb=:kb&path=:path — Create a sticky
router.post('/stickies', async (req: Request, res: Response) => {
  try {
    const kb = req.query.kb as string;
    const folderPath = (req.query.path as string) || '';

    if (!kb) {
      res.status(400).json({ error: 'Missing required query parameter: kb' });
      return;
    }

    const result = await folderService.createSticky(kb, folderPath, req.body);
    if (!result) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create sticky' });
  }
});

// DELETE /api/folders/stickies?kb=:kb&path=:path&id=:id — Delete a sticky
router.delete('/stickies', async (req: Request, res: Response) => {
  try {
    const kb = req.query.kb as string;
    const folderPath = (req.query.path as string) || '';
    const stickyId = req.query.id as string;

    if (!kb || !stickyId) {
      res.status(400).json({ error: 'Missing required query parameters: kb, id' });
      return;
    }

    const deleted = await folderService.deleteSticky(kb, folderPath, stickyId);
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
