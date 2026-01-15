import { Router, Request, Response } from 'express';
import { noteService } from '../services/noteService.js';
import { NoteCreateSchema, NoteUpdateSchema, NoteQuerySchema } from '../types/note.js';
import { ZodError } from 'zod';

const router = Router();

// List all notes with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = NoteQuerySchema.parse(req.query);
    const notes = await noteService.list(query);
    res.json({ notes, total: notes.length });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to list notes' });
    }
  }
});

// Get a single note by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const note = await noteService.get(req.params.slug);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get note' });
  }
});

// Create a new note
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = NoteCreateSchema.parse(req.body);
    const note = await noteService.create(input);
    res.status(201).json(note);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid note data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create note' });
    }
  }
});

// Update an existing note
router.put('/:slug', async (req: Request, res: Response) => {
  try {
    const input = NoteUpdateSchema.parse(req.body);
    const note = await noteService.update(req.params.slug, input);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json(note);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid note data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update note' });
    }
  }
});

// Delete a note
router.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const deleted = await noteService.delete(req.params.slug);
    if (!deleted) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
