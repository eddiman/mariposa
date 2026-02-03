import { z } from 'zod';
import { PositionSchema } from './note.js';

// Zod schemas for validation
export const SectionCreateSchema = z.object({
  name: z.string().default('Section'),
  width: z.number().default(300),
  height: z.number().default(200),
  color: z.string().optional(),
  position: PositionSchema.optional(),
  category: z.string().default('all-notes'),
});

export const SectionUpdateSchema = z.object({
  name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  color: z.string().optional(),
  position: PositionSchema.optional(),
  category: z.string().optional(),
});

export const SectionQuerySchema = z.object({
  category: z.string().optional(),
});

// TypeScript interfaces
export interface Section {
  slug: string;
  name: string;
  width: number;
  height: number;
  color?: string;
  position?: { x: number; y: number };
  category: string;
  createdAt: string;
  updatedAt: string;
}

export type SectionCreateInput = z.infer<typeof SectionCreateSchema>;
export type SectionUpdateInput = z.infer<typeof SectionUpdateSchema>;
export type SectionQuery = z.infer<typeof SectionQuerySchema>;
