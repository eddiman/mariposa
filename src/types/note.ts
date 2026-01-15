import { z } from 'zod';

// Zod schemas for validation
export const NoteCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().default(''),
  category: z.string().default('uncategorized'),
  tags: z.array(z.string()).default([]),
});

export const NoteUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const NoteQuerySchema = z.object({
  category: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  search: z.string().optional(),
});

// TypeScript interfaces
export interface Note {
  slug: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteMeta {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type NoteCreateInput = z.infer<typeof NoteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof NoteUpdateSchema>;
export type NoteQuery = z.infer<typeof NoteQuerySchema>;
