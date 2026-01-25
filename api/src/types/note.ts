import { z } from 'zod';

// Position schema for canvas placement
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// Zod schemas for validation
export const NoteCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().default(''),
  category: z.string().default('uncategorized'),
  tags: z.array(z.string()).default([]),
  position: PositionSchema.optional(),
});

export const NoteUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  position: PositionSchema.optional(),
});

export const NoteQuerySchema = z.object({
  category: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  search: z.string().optional(),
});

export const CategoryCreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  displayName: z.string().min(1, 'Display name is required'),
});

export const CategoryUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  position: PositionSchema.optional(),
});

// TypeScript interfaces
export interface Position {
  x: number;
  y: number;
}

export interface CategoryMeta {
  name: string;           // slug (folder name)
  displayName: string;    // Human-readable name
  position?: Position;
  noteCount: number;
}

export interface Note {
  slug: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  position?: Position;
  createdAt: string;
  updatedAt: string;
}

export interface NoteMeta {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  position?: Position;
  createdAt: string;
  updatedAt: string;
}

export type NoteCreateInput = z.infer<typeof NoteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof NoteUpdateSchema>;
export type NoteQuery = z.infer<typeof NoteQuerySchema>;
export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
