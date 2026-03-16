import { Router, Request, Response } from 'express';
import { configService } from '../services/configService.js';

const router = Router();

// GET /api/config — Get current app config
router.get('/', async (_req: Request, res: Response) => {
  try {
    const appConfig = await configService.get();
    res.json(appConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// PUT /api/config — Update app config
router.put('/', async (req: Request, res: Response) => {
  try {
    const updated = await configService.update(req.body);
    res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update config' });
    }
  }
});

export default router;
