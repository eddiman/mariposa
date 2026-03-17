/**
 * Adjutant integration routes.
 *
 * Exposes Adjutant lifecycle state and mode information to the web UI.
 * These endpoints only return data when Adjutant integration is available.
 */

import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { registryService } from '../services/registryService.js';
import { kbService } from '../services/kbService.js';

const router = Router();

/**
 * GET /api/adjutant/status — Adjutant integration status.
 *
 * Returns:
 * - mode: 'adjutant' | 'standalone'
 * - available: whether Adjutant directory was found
 * - adjutantDir: path to Adjutant directory (if available)
 * - lifecycleState: OPERATIONAL | PAUSED | KILLED (read from state files)
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const mode = await kbService.getMode();
    const adjDir = await registryService.resolveAdjutantDir();

    const result: Record<string, unknown> = {
      mode,
      available: adjDir !== null,
    };

    if (adjDir) {
      result.adjutantDir = adjDir;

      // Read lifecycle state from filesystem markers
      try {
        await fs.access(path.join(adjDir, 'state', 'KILLED'));
        result.lifecycleState = 'KILLED';
      } catch {
        try {
          await fs.access(path.join(adjDir, 'state', 'PAUSED'));
          result.lifecycleState = 'PAUSED';
        } catch {
          result.lifecycleState = 'OPERATIONAL';
        }
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Adjutant status' });
  }
});

export default router;
