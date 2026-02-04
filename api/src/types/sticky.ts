import { z } from 'zod';
import { PositionSchema } from './note.js';

// Sticky note colors
export const StickyColors = ['white', 'yellow', 'pink', 'blue', 'green', 'purple', 'orange', 'mint', 'peach'] as const;
export type StickyColor = typeof StickyColors[number];

// Zod schemas for validation
export const StickyCreateSchema = z.object({
  text: z.string().default(''),
  color: z.enum(StickyColors).default('yellow'),
  position: PositionSchema.optional(),
  category: z.string().default('all-notes'),
});

export const StickyUpdateSchema = z.object({
  text: z.string().optional(),
  color: z.enum(StickyColors).optional(),
  position: PositionSchema.optional(),
  category: z.string().optional(),
});

export const StickyQuerySchema = z.object({
  category: z.string().optional(),
});

// TypeScript interfaces
export interface Sticky {
  slug: string;
  text: string;
  color: StickyColor;
  position?: { x: number; y: number };
  category: string;
  createdAt: string;
  updatedAt: string;
}

export type StickyCreateInput = z.infer<typeof StickyCreateSchema>;
export type StickyUpdateInput = z.infer<typeof StickyUpdateSchema>;
export type StickyQuery = z.infer<typeof StickyQuerySchema>;
