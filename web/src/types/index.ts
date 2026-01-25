// Shared TypeScript interfaces for the web app

// Canvas tool modes for touch interaction
export type CanvasTool = 'pan' | 'select';

export interface Position {
  x: number;
  y: number;
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

export interface NotesResponse {
  notes: Note[];
  total: number;
}

export interface NoteCreateInput {
  title: string;
  content?: string;
  category?: string;
  tags?: string[];
  position?: Position;
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  position?: Position;
}

export interface CategoryMeta {
  name: string;
  displayName: string;
  noteCount: number;
  position?: Position;
}

export interface CategoriesMetaResponse {
  categories: CategoryMeta[];
}

export interface CanvasImage {
  id: string;
  webpUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  category?: string;
  position?: Position;
  displayWidth?: number;  // Canvas display size
  displayHeight?: number;
  // Upload state
  status?: 'uploading' | 'ready' | 'error';
  errorMessage?: string;
}

export interface ImagesResponse {
  images: CanvasImage[];
  total: number;
}
