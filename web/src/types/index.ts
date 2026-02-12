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
  section?: string; // Section slug (e.g., "section-1")
  createdAt: string;
  updatedAt: string;
}

export interface NoteMeta {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  position?: Position;
  section?: string; // Section slug (e.g., "section-1")
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
  section?: string; // Section slug (e.g., "section-1")
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  position?: Position;
  section?: string | null; // null to clear section
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

// Section types
export interface Section {
  slug: string;
  name: string;
  width: number;
  height: number;
  color?: string;
  position?: Position;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionCreateInput {
  name?: string;
  width?: number;
  height?: number;
  color?: string;
  position?: Position;
  category?: string;
  noteSlugs?: string[]; // Notes to include in this section
}

export interface SectionUpdateInput {
  name?: string;
  width?: number;
  height?: number;
  color?: string;
  position?: Position;
  category?: string;
}

export interface SectionsResponse {
  sections: Section[];
  total: number;
}

// Sticky note types
export type StickyColor = 'white' | 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange' | 'mint' | 'peach';

export interface Sticky {
  slug: string;
  text: string;
  color: StickyColor;
  position?: Position;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface StickyCreateInput {
  text?: string;
  color?: StickyColor;
  position?: Position;
  category?: string;
}

export interface StickyUpdateInput {
  text?: string;
  color?: StickyColor;
  position?: Position;
  category?: string;
}

export interface StickiesResponse {
  stickies: Sticky[];
  total: number;
}
