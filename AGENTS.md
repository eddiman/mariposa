# AGENTS.md - Mariposa

Guidelines for AI coding agents working on this codebase.

## Project Overview

Mariposa is a local-first, canvas-based note-taking application. Notes, sections, stickies, and images live on an infinite spatial canvas powered by React Flow. All data is stored as local files — Markdown with YAML frontmatter for notes, JSON for sections and stickies, WebP for images.

- **API** (`api/`): Express REST API with MCP (Model Context Protocol) integration
- **Web** (`web/`): React 19 frontend with infinite canvas, rich text editor, and theming

## Project Structure

```
mariposa/
├── api/                              # Express API server (port 3020)
│   ├── src/
│   │   ├── index.ts                  # Express app setup, middleware, server start
│   │   ├── config.ts                 # Configuration constants (ports, paths, defaults)
│   │   ├── mcp/
│   │   │   └── server.ts             # MCP server: 8 tools, 4 prompts
│   │   ├── routes/
│   │   │   ├── notes.ts              # Note CRUD endpoints
│   │   │   ├── categories.ts         # Category management + metadata
│   │   │   ├── tags.ts               # Tag listing
│   │   │   ├── assets.ts             # Image upload/serve/delete (Sharp + multer)
│   │   │   ├── sections.ts           # Section CRUD
│   │   │   ├── stickies.ts           # Sticky CRUD
│   │   │   └── mcp.ts                # MCP Streamable HTTP transport
│   │   ├── services/
│   │   │   ├── noteService.ts        # Note file I/O, search, CRUD
│   │   │   ├── imageService.ts       # Image processing (Sharp → WebP + thumbnails)
│   │   │   ├── sectionService.ts     # Section JSON file I/O
│   │   │   └── stickyService.ts      # Sticky JSON file I/O
│   │   ├── types/
│   │   │   ├── note.ts               # Note, NoteMeta, Zod schemas
│   │   │   ├── section.ts            # Section type + Zod schemas
│   │   │   └── sticky.ts             # Sticky type + Zod schemas
│   │   └── utils/
│   │       ├── frontmatter.ts        # YAML frontmatter parse/stringify
│   │       └── slugGenerator.ts      # Auto-incrementing slug counter
│   ├── notes/                        # Note storage (markdown files, category subdirs)
│   │   └── .assets/images/           # Image storage (WebP + thumbnails + metadata JSON)
│   ├── package.json
│   └── tsconfig.json
│
├── web/                              # React frontend (port 3021)
│   ├── src/
│   │   ├── main.tsx                  # React root + BrowserRouter
│   │   ├── App.tsx                   # Main app: routing, state orchestration, canvas
│   │   ├── index.css                 # Design tokens, color scales, themes
│   │   ├── types/
│   │   │   └── index.ts              # Shared TypeScript types
│   │   ├── utils/
│   │   │   ├── platform.ts           # OS/touch detection helpers
│   │   │   └── sectionPositioning.ts # Section layout calculations
│   │   ├── contexts/
│   │   │   ├── index.ts              # Barrel export
│   │   │   ├── EditorContext.tsx      # Note editor overlay state + animation origin
│   │   │   ├── PlacementContext.tsx   # Placement mode for creating items on canvas
│   │   │   └── CategoryDialogContext.tsx  # Category dialog state + mode
│   │   ├── hooks/
│   │   │   ├── useCanvas.ts          # Space navigation via URL params, category CRUD
│   │   │   ├── useNotes.ts           # Note CRUD with optimistic updates, debounced saves
│   │   │   ├── useImages.ts          # Image upload/duplicate/delete, localStorage positions
│   │   │   ├── useSections.ts        # Section CRUD with optimistic updates, debounced saves
│   │   │   ├── useStickies.ts        # Sticky CRUD with optimistic updates, debounced saves
│   │   │   ├── useSettings.ts        # App settings (theme, snap) persisted in localStorage
│   │   │   ├── useCanvasHistory.ts   # Undo/redo stack (max 50 entries)
│   │   │   ├── useSnapToGuides.ts    # Snap-to-guide alignment (8px threshold)
│   │   │   ├── useCanvasNodeDrag.ts  # Drag lifecycle: select, snap, persist, section membership
│   │   │   ├── useCanvasClipboard.ts # Copy/paste nodes (system + in-memory clipboard)
│   │   │   ├── useCanvasContextMenu.tsx  # Right-click menu items for canvas and nodes
│   │   │   ├── useCanvasKeyboard.ts  # Keyboard shortcuts (undo, copy, delete, escape, S/T modes)
│   │   │   ├── useCanvasTouchGestures.ts # Long-press + two-finger tap context menus
│   │   │   ├── useSidebarNotes.ts    # Sidebar note interactions (focus, edit, add)
│   │   │   └── useCategoryNotes.ts   # Lazy-load + cache notes per category for sidebar
│   │   └── components/
│   │       ├── Canvas/               # Main canvas wrapper (React Flow container)
│   │       │   ├── Canvas.tsx
│   │       │   ├── Canvas.module.css
│   │       │   ├── CanvasLoader.tsx
│   │       │   └── index.ts
│   │       ├── nodes/                # Custom React Flow node types
│   │       │   ├── index.ts          # nodeTypes map export
│   │       │   ├── NoteNode.tsx      # Note card with title + TipTap preview
│   │       │   ├── NoteNode.module.css
│   │       │   ├── ImageNode.tsx     # Image with upload states + corner resize
│   │       │   ├── ImageNode.module.css
│   │       │   ├── SectionNode.tsx   # Grouping rectangle with editable label + resize handles
│   │       │   ├── SectionNode.module.css
│   │       │   ├── StickyNode.tsx    # Colored sticky with inline text editing
│   │       │   └── StickyNode.module.css
│   │       ├── Home/                 # Home page (search-first landing)
│   │       │   ├── Home.tsx
│   │       │   ├── Home.module.css
│   │       │   ├── AnimatedBackground.tsx
│   │       │   ├── AnimatedBackground.module.css
│   │       │   ├── SearchCard.tsx
│   │       │   └── SearchCard.module.css
│   │       ├── Editor/              # Full-screen note editor overlay
│   │       │   ├── Editor.tsx
│   │       │   ├── Editor.module.css
│   │       │   └── index.ts
│   │       ├── NoteEditor/          # TipTap editor instance
│   │       │   ├── NoteEditor.tsx
│   │       │   ├── NoteEditor.module.css
│   │       │   └── index.ts
│   │       ├── Sidebar/             # Navigation sidebar with category tree
│   │       │   ├── index.ts
│   │       │   ├── Sidebar.tsx
│   │       │   ├── Sidebar.module.css
│   │       │   ├── SidebarAllNotes.tsx
│   │       │   ├── SidebarAllNotesView.tsx
│   │       │   ├── SidebarCategoryItem.tsx
│   │       │   ├── SidebarCategoryView.tsx
│   │       │   └── SidebarNoteItem.tsx
│   │       ├── Toolbar/             # Bottom toolbar (add note/section/sticky/image)
│   │       │   ├── Toolbar.tsx
│   │       │   ├── Toolbar.module.css
│   │       │   └── index.ts
│   │       ├── ToolSwitcher/        # Tool mode switcher (pan/select)
│   │       │   ├── ToolSwitcher.tsx
│   │       │   ├── ToolSwitcher.module.css
│   │       │   └── index.ts
│   │       ├── SelectionToolbar/    # Toolbar for multi-selected nodes
│   │       │   ├── SelectionToolbar.tsx
│   │       │   ├── SelectionToolbar.module.css
│   │       │   └── index.ts
│   │       ├── ContextMenu/         # Right-click context menu
│   │       │   ├── ContextMenu.tsx
│   │       │   ├── ContextMenu.module.css
│   │       │   └── index.ts
│   │       ├── SnapGuides/          # Visual alignment guides during drag
│   │       │   ├── SnapGuides.tsx
│   │       │   ├── SnapGuides.module.css
│   │       │   └── index.ts
│   │       ├── GhostNote/           # Placement mode preview for notes
│   │       │   ├── GhostNote.tsx
│   │       │   ├── GhostNote.module.css
│   │       │   └── index.ts
│   │       ├── GhostSection/        # Placement mode preview for sections
│   │       │   ├── GhostSection.tsx
│   │       │   ├── GhostSection.module.css
│   │       │   └── index.ts
│   │       ├── GhostSticky/         # Placement mode preview for stickies
│   │       │   ├── GhostSticky.tsx
│   │       │   ├── GhostSticky.module.css
│   │       │   └── index.ts
│   │       ├── PlacementHint/       # UI hint during placement mode
│   │       │   ├── PlacementHint.tsx
│   │       │   ├── PlacementHint.module.css
│   │       │   └── index.ts
│   │       ├── CategoryDialog/      # Category create/rename/delete dialog
│   │       │   ├── CategoryDialog.tsx
│   │       │   ├── CategoryDialog.module.css
│   │       │   └── index.ts
│   │       ├── SettingsDialog/      # App settings (theme, snap options)
│   │       │   ├── SettingsDialog.tsx
│   │       │   ├── SettingsDialog.module.css
│   │       │   └── index.ts
│   │       ├── Dialog/              # Generic dialog wrapper
│   │       │   ├── Dialog.tsx
│   │       │   ├── Dialog.module.css
│   │       │   └── index.ts
│   │       ├── TagInput/            # Tag input component for editor
│   │       │   ├── TagInput.tsx
│   │       │   ├── TagInput.module.css
│   │       │   └── index.ts
│   │       └── AdaptiveBackground/  # Background that adapts to theme
│   │           ├── AdaptiveBackground.tsx
│   │           └── index.ts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── owui-mariposa-filter/             # Open WebUI integration (filter/pipe functions)
├── docs/
│   ├── architecture.md               # System design
│   └── roadmap.md                    # Future plans
├── README.md
└── AGENTS.md
```

## Tech Stack

### API (`api/`)
- **Language**: TypeScript ~5.3 (strict mode)
- **Runtime**: Node.js, ES2022 target, ESM (`"type": "module"`)
- **Framework**: Express 4.x
- **Validation**: Zod 3.x
- **Image Processing**: Sharp 0.34 (WebP conversion + thumbnails)
- **File Upload**: Multer 2.x (memory storage, 10MB limit)
- **MCP**: `@modelcontextprotocol/sdk` 1.x (Streamable HTTP transport)
- **Build**: tsup (production), tsx (development with watch)

### Web (`web/`)
- **Language**: TypeScript ~5.9
- **Framework**: React 19
- **Canvas**: `@xyflow/react` 12.x (React Flow)
- **Editor**: TipTap 3.15 (with Markdown, Highlight, Image, Placeholder extensions)
- **Routing**: React Router 7.x
- **Styling**: CSS Modules + design tokens in `index.css`
- **Build**: Vite 7.x with `@vitejs/plugin-react`
- **HTTPS**: `@vitejs/plugin-basic-ssl` for local dev

## Commands

```bash
# API - Development (hot reload)
cd api && npm run dev      # Runs on :3020

# API - Build for production
cd api && npm run build

# Web - Development (hot reload)
cd web && npm run dev      # Runs on :3021

# Web - Build for production
cd web && npm run build
```

**Note**: No test framework is currently configured.

## Architecture Overview

### Data Flow

```
Browser → Web App (React + React Flow)
           ↕ REST API calls
         Express API (port 3020)
           ↕ File I/O
         Local File System
           ├── notes/*.md           (Markdown + YAML frontmatter)
           ├── notes/<category>/*.md (categorized notes)
           ├── notes/.assets/images/ (WebP + thumbnails + metadata JSON)
           ├── notes/.sections.json  (section definitions)
           └── notes/.stickies.json  (sticky definitions)
```

### Web App Routing

| URL Pattern | View | Description |
|-------------|------|-------------|
| `/` | Home | Search-first landing page with animated background |
| `/:category` | Canvas | Infinite canvas for a category space |
| `/:category/:noteSlug` | Canvas + Editor | Canvas with note editor overlay open |

### State Management

- **URL-driven**: Current category and focused note come from React Router URL params
- **React state**: Canvas nodes, notes, sections, stickies managed in `App.tsx` via custom hooks
- **localStorage**: Settings (theme, snap options), image positions on canvas
- **Contexts**: Editor animation state, placement mode, category dialog state

### Canvas Node Types

| Type | Component | Description |
|------|-----------|-------------|
| `note` | `NoteNode` | Note card with title + read-only TipTap markdown preview. Double-click opens editor. |
| `image` | `ImageNode` | Image with upload/error/ready states. Corner resize handle maintains aspect ratio. |
| `section` | `SectionNode` | Grouping rectangle with editable name label. 4-corner resize handles. Color variants. |
| `sticky` | `StickyNode` | Colored sticky note with inline text editing. 9 color variants. |

### Hooks Reference

| Hook | Purpose |
|------|---------|
| `useCanvas` | Space navigation via URL params, category CRUD |
| `useNotes` | Note CRUD with optimistic updates, debounced position saves (300ms) |
| `useImages` | Image upload/duplicate/delete, positions in localStorage |
| `useSections` | Section CRUD with optimistic updates, debounced saves |
| `useStickies` | Sticky CRUD with optimistic updates, debounced saves |
| `useSettings` | Theme + snap settings, persisted in localStorage |
| `useCanvasHistory` | Undo/redo stack (max 50), batch operation support |
| `useSnapToGuides` | Calculate snap alignment lines (8px threshold) |
| `useCanvasNodeDrag` | Drag lifecycle: auto-select, snap, persist, section membership |
| `useCanvasClipboard` | Copy/paste to system clipboard + in-memory fallback |
| `useCanvasContextMenu` | Build context menu items for canvas and nodes |
| `useCanvasKeyboard` | Keyboard shortcuts (Cmd+Z, Cmd+C, Delete, Escape, S, T, Enter) |
| `useCanvasTouchGestures` | Long-press (500ms) and two-finger tap for context menus |
| `useSidebarNotes` | Sidebar note interactions: focus on node, open editor, create note |
| `useCategoryNotes` | Lazy-load + cache notes per category for sidebar display |

### Contexts

| Context | Hook | Purpose |
|---------|------|---------|
| `EditorContext` | `useEditor` | Editor overlay state: animation origin rect, initial note data |
| `PlacementContext` | `usePlacement` | Placement mode: type (note/section/sticky), enter/exit actions |
| `CategoryDialogContext` | `useCategoryDialog` | Category dialog: mode (select/create/rename/delete), target category |

## API Endpoints

### Notes (`/api/notes`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes` | List notes (optional: `?category=`, `?tags=`, `?search=`) |
| GET | `/api/notes/:slug` | Get a single note |
| POST | `/api/notes` | Create a note (Zod validated) |
| PUT | `/api/notes/:slug` | Update a note (partial) |
| DELETE | `/api/notes/:slug` | Delete a note |

### Categories (`/api/categories`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List category names |
| GET | `/api/categories/meta` | List categories with metadata (note counts, displayNames) |
| GET | `/api/categories/:name/meta` | Get metadata for one category |
| PUT | `/api/categories/:name/meta` | Update category metadata (displayName) |
| POST | `/api/categories` | Create a category |
| DELETE | `/api/categories/:name` | Delete category (optional `?moveTo=` to migrate notes) |

### Tags (`/api/tags`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tags` | List all unique tags |

### Assets (`/api/assets`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assets` | List images (optional `?category=`) |
| GET | `/api/assets/:filename` | Serve image file (1-year cache) |
| POST | `/api/assets/upload` | Upload image (multipart, 10MB limit) |
| POST | `/api/assets/:id/duplicate` | Duplicate an image |
| PATCH | `/api/assets/:id` | Update image metadata (category) |
| DELETE | `/api/assets/:id` | Delete image + all variants |

### Sections (`/api/sections`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sections` | List sections (optional `?category=`) |
| GET | `/api/sections/:slug` | Get a single section |
| POST | `/api/sections` | Create a section |
| PUT | `/api/sections/:slug` | Update a section |
| DELETE | `/api/sections/:slug` | Delete a section |

### Stickies (`/api/stickies`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stickies` | List stickies (optional `?category=`) |
| GET | `/api/stickies/:slug` | Get a single sticky |
| POST | `/api/stickies` | Create a sticky |
| PUT | `/api/stickies/:slug` | Update a sticky |
| DELETE | `/api/stickies/:slug` | Delete a sticky |

### MCP (`/mcp`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mcp` | MCP JSON-RPC requests |
| GET | `/mcp` | MCP SSE stream |
| DELETE | `/mcp` | MCP session termination |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

## MCP Tools and Prompts

### Tools (8)
| Tool | Parameters | Description |
|------|-----------|-------------|
| `list_notes` | `category?`, `tags?`, `search?` | List notes with optional filters |
| `get_note` | `slug` | Get a single note by slug |
| `create_note` | `title`, `content?`, `category?`, `tags?` | Create a new note |
| `update_note` | `slug`, `title?`, `content?`, `category?`, `tags?` | Update an existing note |
| `delete_note` | `slug` | Delete a note |
| `list_categories` | — | List all categories |
| `create_category` | `name` (regex: `[a-zA-Z0-9_-]+`) | Create a category |
| `list_tags` | — | List all unique tags |

### Prompts (4)
| Prompt | Parameters | Description |
|--------|-----------|-------------|
| `display_note` | `slug` | Display a note in readable format |
| `summarize_notes` | — | Summary of all notes, categories, and tags |
| `create_note_helper` | `topic?` | Guide through creating a note |
| `search_notes` | `query` | Search and present results |

## Storage Format

### Notes
Markdown files with YAML frontmatter in `notes/` (or `notes/<category>/`):
```yaml
---
title: My Note
tags:
  - javascript
  - react
created: 2025-01-15T10:30:00.000Z
modified: 2025-01-15T10:30:00.000Z
position:
  x: 100
  y: 200
---

Note content in Markdown...
```

### Images
Stored in `notes/.assets/images/`:
- `<uuid>.webp` — Full-size image (Sharp, quality 80)
- `<uuid>-thumb.webp` — 300px-wide thumbnail (quality 75)
- `<uuid>.meta.json` — Category metadata sidecar

Accepted upload formats: JPEG, PNG, GIF, WebP, SVG, HEIC/HEIF (all converted to WebP).

### Sections & Stickies
JSON files in the notes directory, filtered by category field.

## Design System

### Themes

Two themes controlled by `data-theme` attribute on `<html>`:

**Default theme**: Soft, rounded design
- Primary: `#0066cc`, neutral background `#f5f5f5`, white cards
- Fonts: Heading = `'Futura Classic', 'Jost', 'Nunito Sans'`, Body = `'Montserrat', system fonts`
- Border radius: 6px–28px, box shadows for depth

**Bauhaus theme** (`[data-theme="bauhaus"]`): Geometric, flat design
- Primary: Red `#de1c24`, Accent Blue `#1a47a8`, Accent Yellow `#f5c623`
- Fonts: `'Futura', 'Century Gothic', 'Avant Garde'` for both heading and body
- Zero border-radius, no shadows (solid borders instead)

### Design Tokens (in `web/src/index.css`)

**Color scales**: Blue (50–950, base `#3B67F6`), Pink (50–950, base `#F7A9F1`)

**Typography**:
- Font sizes: `--font-size-xxs` (11px) through `--font-size-5xl` (40px), 11 steps
- Weights: normal (400), medium (500), semibold (600), bold (700)
- Line heights: tight (1.2), normal (1.5), relaxed (1.75)

**Spacing**: `--spacing-0` (0) through `--spacing-24` (96px), 22 steps, base unit 4px

**Transitions**:
- `--transition-fast`: 0.15s ease
- `--transition-normal`: 0.2s ease
- `--transition-medium`: 0.25s ease
- `--transition-smooth`: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
- `--transition-bounce`: 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)

**Z-index layers**: dropdown (10), hint (99), toolbar (100), selection (150), editor (200), sidebar (201), dialog (300), context-backdrop (999), context-menu (1000), submenu (1001), max (10000)

**Component sizes**: note (200×283px), ghost note (120×160px), sidebar (280px), content max-width (700px), dialog (400px), touch target (44px), toolbar circle (56px)

**Breakpoints**: mobile (480px), tablet (768px), desktop (1024px)

## Code Style Guidelines

### Imports

1. **Use `.js` extension** for all local imports in the API (required for ESM):
   ```typescript
   import { config } from './config.js';
   ```

2. **Import order**: External packages first, then local modules

3. **Use `import type`** for type-only imports:
   ```typescript
   import type { Note, NoteMeta } from '../types/note.js';
   ```

4. **Prefer named imports** over default imports where available

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | camelCase | `noteService.ts`, `slugGenerator.ts` |
| Components | PascalCase files | `NoteNode.tsx`, `SearchCard.tsx` |
| CSS Modules | ComponentName.module.css | `NoteNode.module.css` |
| Classes | PascalCase | `NoteService` |
| Interfaces/Types | PascalCase | `Note`, `NoteMeta`, `FrontmatterData` |
| Zod Schemas | PascalCase + Schema | `NoteCreateSchema`, `NoteQuerySchema` |
| Functions/Hooks | camelCase | `parseNote`, `useCanvas` |
| Variables | camelCase | `noteService`, `filePath` |
| CSS custom properties | `--kebab-case` | `--color-primary`, `--spacing-4` |
| Unused parameters | Prefix with `_` | `_req`, `_res`, `_next` |

### TypeScript Patterns

- **Strict mode is enabled** — avoid `any` types
- Use **interfaces for data structures**, derive types from Zod:
  ```typescript
  export interface Note { slug: string; title: string; /* ... */ }
  export type NoteCreateInput = z.infer<typeof NoteCreateSchema>;
  ```
- Type assertions with `as` only when necessary

### React Patterns

- **CSS Modules** for all component styling — no inline styles, no global CSS classes
- **Custom hooks** for all data fetching and state logic — components stay presentational
- **Optimistic updates** — update local state immediately, then sync with API
- **Debounced saves** — position/size changes debounce at 300ms before API call
- **Barrel exports** — each component directory has an `index.ts` re-exporting the component

### Error Handling

1. **Zod validation with instanceof check**:
   ```typescript
   try {
     const input = NoteCreateSchema.parse(req.body);
   } catch (error) {
     if (error instanceof ZodError) {
       res.status(400).json({ error: 'Invalid data', details: error.errors });
     } else {
       res.status(500).json({ error: 'Failed to create' });
     }
   }
   ```

2. **Empty catch blocks** for expected failures (e.g., file not found)

3. **Return `null` or `false`** for "not found" scenarios instead of throwing

4. **HTTP status codes**: 400 (bad request), 404 (not found), 500 (server error), 201 (created), 204 (no content)

### API Response Patterns

```typescript
res.json({ notes, total: notes.length });  // Lists with count
res.json(note);                            // Single item
res.json({ error: 'message' });            // Errors
res.json({ success: true, message: '' });  // Action confirmations
res.status(204).send();                    // Successful delete
```

### File Organization

- **Services**: Single class per file, exported as singleton
- **Routes**: Router pattern with default export
- **Utils**: Pure functions, one concern per file
- **Components**: One component per directory with `.tsx`, `.module.css`, and `index.ts`
- **Hooks**: One hook per file in `hooks/` directory

### Comments

- Minimal comments — code should be self-documenting
- Section dividers for large files: `// === Section Name ===`
- Inline comments only for non-obvious behavior

### Git Commit Style

- Lowercase, imperative mood
- Concise descriptions
- Examples: `add display hint...`, `fix validation error...`, `update timestamp format...`

## Key Implementation Details

- Notes stored as `.md` files with YAML frontmatter in `notes/` directory
- Categories are subdirectories within `notes/`
- Default category: `all-notes` (configurable in `api/src/config.ts`)
- Auto-incrementing slugs: `note-1`, `note-2`, etc. (via `.counter` file)
- Images stored as WebP in `notes/.assets/images/` with `-thumb` thumbnails and `.meta.json` sidecars
- Image positions stored client-side in localStorage (`mariposa-image-positions` key)
- API server: port 3020, host `0.0.0.0`
- Web server: port 3021, with Vite proxy forwarding `/api` to `localhost:3020`
- Notes dir configurable via CLI `--notes-dir` argument
- Vite build splits `@xyflow/react` and TipTap into separate chunks
