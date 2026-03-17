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

/**
 * POST /api/adjutant/kb/query — Query a KB via Adjutant's sub-agent.
 *
 * This is a pass-through to `adjutant kb query <name> "<question>"`.
 * Only available when Adjutant integration is active and the adjutant
 * CLI is on PATH.
 *
 * Body: { kb: string, question: string }
 * Returns: { answer: string, source: string }
 */
router.post('/kb/query', async (req: Request, res: Response) => {
  try {
    const { kb: kbName, question } = req.body;

    if (!kbName || !question) {
      res.status(400).json({ error: 'Missing required fields: kb, question' });
      return;
    }

    const adjDir = await registryService.resolveAdjutantDir();
    if (!adjDir) {
      res.status(503).json({ error: 'Adjutant integration not available' });
      return;
    }

    // Verify the KB exists
    const kb = await kbService.get(kbName);
    if (!kb) {
      res.status(404).json({ error: `Knowledge base "${kbName}" not found` });
      return;
    }

    // Shell out to adjutant CLI
    const { spawn } = await import('child_process');
    const adjutantBin = path.join(adjDir, 'adjutant');

    // Check if the adjutant CLI exists
    try {
      await fs.access(adjutantBin);
    } catch {
      res.status(503).json({ error: 'Adjutant CLI not found. Is Adjutant installed?' });
      return;
    }

    const proc = spawn(adjutantBin, ['kb', 'query', kbName, question], {
      cwd: adjDir,
      env: { ...process.env, ADJ_DIR: adjDir },
      timeout: 60_000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('error', (error) => {
      console.error('KB query process error:', error);
      res.status(500).json({ error: 'Failed to execute KB query' });
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        res.json({
          answer: stdout.trim(),
          kb: kbName,
          question,
        });
      } else {
        console.error('KB query failed:', stderr);
        res.status(500).json({
          error: 'KB query failed',
          details: stderr.trim() || `Process exited with code ${code}`,
        });
      }
    });
  } catch (error) {
    console.error('KB query error:', error);
    res.status(500).json({ error: 'Failed to query knowledge base' });
  }
});

export default router;
