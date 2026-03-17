# AGENTS.md - Mariposa

Guidelines for AI coding agents working on this codebase.

## Project Overview

Mariposa is a local-first knowledge base explorer. It discovers Adjutant-format KBs (directories containing `kb.yaml`) under a user-configured root directory and presents their contents on an infinite spatial canvas powered by React Flow. Users can browse folders, view and create notes, organize with sections and stickies, and upload images. All KB metadata is stored in `.mariposa.json` sidecar files so `.md` files stay clean.

- **API** (`api/`): Express REST API — KB discovery, folder browsing, note CRUD, image management
- **Web** (`web/`): React 19 frontend — canvas-based KB explorer with rich text editor

## Project Structure

```
mariposa/
├── api/                                  # Express API server (port 3020)
│   ├── src/
│   │   ├── index.ts                      # Express app setup, createApp(), middleware, server start
│   │   ├── config.ts                     # Static config (port, host, ~/.mariposa paths)
│   │   ├── routes/
│   │   │   ├── config.ts                 # GET/PUT /api/config, POST browse (Finder), POST reveal
│   │   │   ├── kbs.ts                    # GET /api/kbs — KB discovery + metadata
│   │   │   ├── folders.ts               # GET/PUT /api/folders — folder listing + .mariposa.json CRUD + sections/stickies
│   │   │   ├── notes.ts                 # GET/POST/PUT/DELETE /api/notes + search
│   │   │   ├── assets.ts                # Image upload/serve/delete (Sharp + multer), KB-scoped
│   │   │   └── routes.test.ts           # Integration tests (supertest, 24 tests)
│   │   ├── services/
│   │   │   ├── configService.ts          # Read/write ~/.mariposa/config.json, kbRoot validation
│   │   │   ├── configService.test.ts     # 6 tests
│   │   │   ├── kbService.ts              # Discover KBs (scan for kb.yaml), parse metadata
│   │   │   ├── kbService.test.ts         # 9 tests
│   │   │   ├── folderService.ts          # List folders, read/write .mariposa.json, sections, stickies
│   │   │   ├── folderService.test.ts     # 15 tests
│   │   │   ├── fileNoteService.ts        # Note CRUD (create/read/update/delete/search .md files)
│   │   │   ├── fileNoteService.test.ts   # 33 tests
│   │   │   └── imageService.ts           # Sharp → WebP + thumbnails, KB-scoped in .mariposa/assets/
│   │   └── types/
│   │       ├── config.ts                 # AppConfig, Zod schema
│   │       ├── kb.ts                     # KbMeta, KbYamlSchema (Adjutant format)
│   │       ├── folder.ts                 # MariposaSidecar, FolderEntry, Section/Sticky schemas
│   │       └── note.ts                   # NoteFile, NoteMeta, NoteCreate/UpdateSchema
│   ├── vitest.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── web/                                  # React frontend (port 3021)
│   ├── src/
│   │   ├── main.tsx                      # React root + BrowserRouter
│   │   ├── App.tsx                       # Main app: wildcard routing, state orchestration, canvas
│   │   ├── index.css                     # Design tokens, color scales, themes
│   │   ├── types/
│   │   │   └── index.ts                  # Shared TypeScript types (KbMeta, NoteFile, Section, etc.)
│   │   ├── utils/
│   │   │   ├── platform.ts              # OS/touch detection helpers
│   │   │   └── sectionPositioning.ts    # Section layout calculations
│   │   ├── contexts/
│   │   │   ├── index.ts                 # Barrel export
│   │   │   ├── EditorContext.tsx         # Note editor overlay state + animation origin
│   │   │   └── PlacementContext.tsx      # Placement mode for creating items on canvas
│   │   ├── hooks/
│   │   │   ├── useKbs.ts               # Fetch + cache KB list from /api/kbs
│   │   │   ├── useCanvas.ts            # KB + folder path from URL params, navigation
│   │   │   ├── useFolder.ts            # Folder entries + .mariposa.json CRUD, sections, stickies
│   │   │   ├── useNotes.ts             # Note CRUD (create/read/update/delete/search)
│   │   │   ├── useImages.ts            # KB-scoped image upload/delete, localStorage positions
│   │   │   ├── useSettings.ts          # Theme, snap, kbRoot (server-side) settings
│   │   │   ├── useCanvasHistory.ts     # Undo/redo stack (max 50 entries)
│   │   │   ├── useSnapToGuides.ts      # Snap-to-guide alignment (8px threshold)
│   │   │   ├── useCanvasNodeDrag.ts    # Drag lifecycle: select, snap, persist, section membership
│   │   │   ├── useCanvasClipboard.ts   # Copy/paste nodes (system + in-memory clipboard)
│   │   │   ├── useCanvasContextMenu.tsx # Right-click menu items for canvas and nodes
│   │   │   ├── useCanvasKeyboard.ts    # Keyboard shortcuts (undo, copy, delete, escape, S/T)
│   │   │   └── useCanvasTouchGestures.ts # Long-press + two-finger tap context menus
│   │   └── components/
│   │       ├── Canvas/                  # Main canvas wrapper (React Flow container)
│   │       │   ├── Canvas.tsx
│   │       │   ├── Canvas.module.css
│   │       │   ├── CanvasLoader.tsx
│   │       │   └── index.ts
│   │       ├── nodes/                   # Custom React Flow node types
│   │       │   ├── index.ts            # nodeTypes map export
│   │       │   ├── NoteNode.tsx        # Note card with title + TipTap preview
│   │       │   ├── ImageNode.tsx       # Image with upload states + corner resize
│   │       │   ├── SectionNode.tsx     # Grouping rectangle with editable label + resize
│   │       │   └── StickyNode.tsx      # Colored sticky with inline editing
│   │       ├── Home/                    # Home page — KB browser
│   │       │   ├── Home.tsx            # KB cards, cross-KB search, setup prompt
│   │       │   ├── Home.module.css
│   │       │   ├── AnimatedBackground.tsx
│   │       │   └── index.ts
│   │       ├── Editor/                  # TipTap rich text editor (used inside NoteEditor)
│   │       │   ├── Editor.tsx          # TipTap with markdown, image paste/drop, KB-scoped upload
│   │       │   ├── Editor.module.css
│   │       │   └── index.ts
│   │       ├── NoteEditor/             # Full-screen note editor overlay
│   │       │   ├── NoteEditor.tsx      # Title, tags, autosave, delete, expand/collapse animation
│   │       │   ├── NoteEditor.module.css
│   │       │   └── index.ts
│   │       ├── Sidebar/                # Navigation sidebar — KB list + folder tree
│   │       │   ├── Sidebar.tsx         # KB list, breadcrumbs, folder entries
│   │       │   ├── Sidebar.module.css
│   │       │   └── index.ts
│   │       ├── Toolbar/                # Bottom toolbar (add note/section/sticky/image)
│   │       ├── ToolSwitcher/           # Tool mode switcher (pan/select)
│   │       ├── SelectionToolbar/       # Toolbar for multi-selected nodes
│   │       ├── ContextMenu/            # Right-click context menu
│   │       ├── SnapGuides/             # Visual alignment guides during drag
│   │       ├── GhostSection/           # Placement mode preview for sections
│   │       ├── GhostSticky/            # Placement mode preview for stickies
│   │       ├── PlacementHint/          # UI hint during placement mode
│   │       ├── SettingsDialog/         # App settings (KB root + Finder browse, theme, snap)
│   │       ├── Dialog/                 # Generic dialog wrapper
│   │       ├── TagInput/               # Tag input component for editor
│   │       └── AdaptiveBackground/     # Background that adapts to theme
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── docs/
│   ├── architecture.md                  # System design
│   ├── roadmap.md                       # Future plans (Phase 2: Local AI)
│   ├── kb-explorer-rewrite.md           # Rewrite plan + implementation status
│   ├── future-features.md              # Deferred feature ideas (file watching, etc.)
│   └── ios-clipboard-paste.md          # iOS clipboard/paste implementation notes
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
- **YAML Parsing**: js-yaml 4.x (for `kb.yaml` files)
- **Testing**: Vitest 3.x + supertest (87 tests)
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
cd api && npm run dev        # Runs on :3020

# API - Build for production
cd api && npm run build

# API - Run tests
cd api && npm test           # 87 tests across 5 files
cd api && npm run test:watch # Watch mode

# Web - Development (hot reload)
cd web && npm run dev        # Runs on :3021

# Web - Build for production
cd web && npm run build      # Includes tsc -b type check
```

## Architecture Overview

### Data Flow

```
Browser → Web App (React + React Flow)
           ↕ REST API calls (proxied via Vite)
         Express API (:3020)
           ↕ File I/O
         KB Root Directory (user-configured)
           ├── <kb-name>/
           │   ├── kb.yaml              (Adjutant KB metadata)
           │   ├── .mariposa.json       (canvas positions, sections, stickies)
           │   ├── .mariposa/assets/    (uploaded images: WebP + thumbnails)
           │   ├── *.md                 (note files — pure markdown)
           │   └── <subfolder>/
           │       ├── .mariposa.json
           │       └── *.md
           └── ...
         ~/.mariposa/config.json        (app config: kbRoot path)
```

### KB Discovery

Mariposa scans the user-configured `kbRoot` directory for subdirectories containing `kb.yaml`. Each such directory is a knowledge base. The `kb.yaml` follows the Adjutant standard:

```yaml
name: "my-kb"
description: "Description of this knowledge base"
model: "anthropic/claude-sonnet-4-6"
access: "read-write"
created: "2026-01-15"
```

### .mariposa.json Sidecar

Every folder within a KB can have a `.mariposa.json` file storing canvas layout metadata. This is the only metadata file Mariposa creates inside KB directories — `.md` files stay clean.

```json
{
  "items": {
    "filename.md": { "position": { "x": 100, "y": 200 }, "tags": ["tag"], "title": "Override Title" },
    "subfolder": { "position": { "x": 400, "y": 100 } }
  },
  "sections": {
    "section-1": { "name": "Group", "position": { "x": 0, "y": 0 }, "width": 500, "height": 400, "color": "blue", "createdAt": "...", "updatedAt": "..." }
  },
  "stickies": {
    "sticky-1": { "text": "Note", "color": "yellow", "position": { "x": 0, "y": 0 }, "createdAt": "...", "updatedAt": "..." }
  },
  "nextSectionId": 2,
  "nextStickyId": 2
}
```

### Note Identity

Notes are identified by filename, not slugs. `current.md` is the ID. Title is extracted from the first `# heading` in the file, falling back to filename sans extension. Mariposa-specific metadata (position, tags, title override) is stored in the parent folder's `.mariposa.json`, never in the `.md` file.

### Web App Routing

| URL Pattern | View | Description |
|-------------|------|-------------|
| `/` | Home | KB browser — cards for discovered KBs + cross-KB search |
| `/:kb` | Canvas | KB root folder canvas |
| `/:kb/*path` | Canvas | Subfolder canvas (e.g. `/ixda/data/events`) |

Note opening: Double-click a note on the canvas opens the editor overlay. Optional `?note=path` query param for shareable links.

### State Management

- **URL-driven**: Current KB and folder path from React Router wildcard params (`/:kb/*`)
- **React state**: Canvas nodes, folder entries, sections, stickies managed in `App.tsx` via custom hooks
- **localStorage**: Settings (theme, snap options), image positions on canvas
- **Server-side**: KB root path stored in `~/.mariposa/config.json` via `/api/config`
- **Contexts**: Editor animation state (`EditorContext`), placement mode (`PlacementContext`)

### Canvas Node Types

| Type | Component | Description |
|------|-----------|-------------|
| `note` | `NoteNode` | Note card with title + TipTap markdown preview. Double-click opens editor. |
| `image` | `ImageNode` | Image with upload/error/ready states. Corner resize maintains aspect ratio. |
| `section` | `SectionNode` | Grouping rectangle with editable label. 4-corner resize handles. Color variants. |
| `sticky` | `StickyNode` | Colored sticky with inline text editing. 9 color variants. |

### Hooks Reference

| Hook | Purpose |
|------|---------|
| `useKbs` | Fetch + cache KB list from API |
| `useCanvas` | Parse KB + folder path from URL params, navigation between folders |
| `useFolder` | Folder entries + `.mariposa.json` CRUD, sections, stickies (replaces old useNotes/useSections/useStickies) |
| `useNotes` | Note CRUD: create, read, update, delete, search |
| `useImages` | KB-scoped image upload/delete, localStorage positions |
| `useSettings` | Theme, snap settings (localStorage), kbRoot (server-side) |
| `useCanvasHistory` | Undo/redo stack (max 50), batch operation support |
| `useSnapToGuides` | Calculate snap alignment lines (8px threshold) |
| `useCanvasNodeDrag` | Drag lifecycle: auto-select, snap, persist, section membership |
| `useCanvasClipboard` | Copy/paste to system clipboard + in-memory fallback |
| `useCanvasContextMenu` | Build context menu items for canvas and nodes |
| `useCanvasKeyboard` | Keyboard shortcuts (Cmd+Z, Cmd+C, Delete, Escape, S, T, Enter) |
| `useCanvasTouchGestures` | Long-press (500ms) and two-finger tap for context menus |

### Contexts

| Context | Hook | Purpose |
|---------|------|---------|
| `EditorContext` | `useEditor` | Editor overlay state: animation origin rect, initial note data (`NoteFile`) |
| `PlacementContext` | `usePlacement` | Placement mode: type (note/section/sticky), enter/exit actions |

## API Endpoints

### Config (`/api/config`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Get current config (kbRoot path) |
| PUT | `/api/config` | Update config (validates directory + contains KB subdirs) |
| POST | `/api/config/browse` | Open native Finder/file manager directory picker |
| POST | `/api/config/reveal` | Open a path in native file manager (Finder/xdg-open) |

### KBs (`/api/kbs`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/kbs` | List discovered KBs (scan kbRoot for dirs with `kb.yaml`) |
| GET | `/api/kbs/:name` | Get KB metadata (parsed from `kb.yaml`) |

### Folders (`/api/folders`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/folders?kb=&path=` | List folder contents (files + subfolders) with `.mariposa.json` |
| GET | `/api/folders/meta?kb=&path=` | Get `.mariposa.json` for a folder |
| PUT | `/api/folders/meta?kb=&path=` | Update `.mariposa.json` for a folder |
| POST | `/api/folders/sections?kb=&path=` | Create a section in a folder |
| DELETE | `/api/folders/sections?kb=&path=&id=` | Delete a section |
| POST | `/api/folders/stickies?kb=&path=` | Create a sticky in a folder |
| DELETE | `/api/folders/stickies?kb=&path=&id=` | Delete a sticky |

### Notes (`/api/notes`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes?kb=&path=` | Get note content + metadata |
| POST | `/api/notes` | Create a new note (`{ kb, folder?, title, content?, tags?, position? }`) |
| PUT | `/api/notes?kb=&path=` | Update note content and/or metadata |
| DELETE | `/api/notes?kb=&path=` | Delete a note + its sidecar metadata |
| GET | `/api/notes/search?kb=&q=` | Search notes within a KB (filename + content) |

### Assets (`/api/assets`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assets?kb=` | List images for a KB |
| GET | `/api/assets/:filename?kb=` | Serve image file (1-year cache) |
| POST | `/api/assets/upload` | Upload image (multipart, 10MB, body includes `kb`) |
| DELETE | `/api/assets/:id?kb=` | Delete image + all variants |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

## Storage Format

### Notes
Pure markdown files in KB directories. No YAML frontmatter — all metadata is in `.mariposa.json`:
```markdown
# My Note Title

Note content in Markdown...
```

Title extraction priority: `.mariposa.json` title override > first `# heading` in file > filename sans extension.

### Images
Stored in `<kb>/.mariposa/assets/`:
- `<uuid>.webp` — Full-size image (Sharp, quality 80)
- `<uuid>-thumb.webp` — 300px-wide thumbnail (quality 75)

Accepted upload formats: JPEG, PNG, GIF, WebP, SVG, HEIC/HEIF (all converted to WebP).

### Sections & Stickies
Stored in the folder's `.mariposa.json` under `sections` and `stickies` keys. No separate files. Auto-incrementing IDs (`section-1`, `sticky-1`, etc.).

### App Configuration
`~/.mariposa/config.json`:
```json
{ "kbRoot": "/path/to/knowledge-bases" }
```

## Design System

### Themes

Two themes controlled by `data-theme` attribute on `<html>`:

**Default theme**: Soft, rounded design
- Primary: `#0066cc`, neutral background `#f5f5f5`, white cards
- Fonts: Heading = `'Futura Classic', 'Jost', 'Nunito Sans'`, Body = `'Montserrat', system fonts`
- Border radius: 6px-28px, box shadows for depth

**Bauhaus theme** (`[data-theme="bauhaus"]`): Geometric, flat design
- Primary: Red `#de1c24`, Accent Blue `#1a47a8`, Accent Yellow `#f5c623`
- Fonts: `'Futura', 'Century Gothic', 'Avant Garde'` for both heading and body
- Zero border-radius, no shadows (solid borders instead)

### Design Tokens (in `web/src/index.css`)

**Color scales**: Blue (50-950, base `#3B67F6`), Pink (50-950, base `#F7A9F1`)

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

**Component sizes**: note (200x283px), sidebar (280px), content max-width (700px), dialog (400px), touch target (44px), toolbar circle (56px)

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
   import type { NoteFile, NoteMeta } from '../types/note.js';
   ```

4. **Prefer named imports** over default imports where available

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | camelCase | `configService.ts`, `fileNoteService.ts` |
| Components | PascalCase files | `NoteNode.tsx`, `Sidebar.tsx` |
| CSS Modules | ComponentName.module.css | `NoteNode.module.css` |
| Classes | PascalCase | `ConfigService`, `FileNoteService` |
| Interfaces/Types | PascalCase | `NoteFile`, `KbMeta`, `MariposaSidecar` |
| Zod Schemas | PascalCase + Schema | `NoteCreateSchema`, `AppConfigSchema` |
| Functions/Hooks | camelCase | `extractTitle`, `useCanvas`, `useFolder` |
| Variables | camelCase | `kbService`, `folderPath` |
| CSS custom properties | `--kebab-case` | `--color-primary`, `--spacing-4` |
| Unused parameters | Prefix with `_` | `_req`, `_res`, `_next` |

### TypeScript Patterns

- **Strict mode is enabled** — avoid `any` types
- Use **interfaces for data structures**, derive types from Zod:
  ```typescript
  export interface NoteFile { filename: string; path: string; kb: string; /* ... */ }
  export type NoteCreateInput = z.infer<typeof NoteCreateSchema>;
  ```
- Type assertions with `as` only when necessary
- Node types use `id` (not `slug`) — `Section.id`, `Sticky.id`

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
res.json({ kbs, total: kbs.length });     // Lists with count
res.json(note);                            // Single item
res.json({ error: 'message' });            // Errors
res.json({ success: true });               // Action confirmations
res.status(204).send();                    // Successful delete
```

### File Organization

- **Services**: Single class per file, exported as singleton instance
- **Routes**: Router pattern with default export
- **Types**: One concern per file in `types/` directory
- **Components**: One component per directory with `.tsx`, `.module.css`, and `index.ts`
- **Hooks**: One hook per file in `hooks/` directory
- **Tests**: Co-located with source files (`*.test.ts`)

### Comments

- Minimal comments — code should be self-documenting
- Section dividers for large files: `// === Section Name ===`
- Inline comments only for non-obvious behavior
- JSDoc on public service methods

### Git Commit Style

- Lowercase, imperative mood
- Concise descriptions
- Examples: `add native finder directory picker`, `fix proxy timeout for browse endpoint`, `rewrite sidebar as folder tree`

## Testing

Tests use Vitest and are co-located with source files. 87 tests across 5 files:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `configService.test.ts` | 6 | Config read/write, kbRoot validation (exists, contains KBs) |
| `kbService.test.ts` | 9 | KB discovery, hidden dir filtering, path traversal prevention |
| `folderService.test.ts` | 15 | Folder listing, sidecar CRUD, section/sticky create/delete |
| `fileNoteService.test.ts` | 33 | Note CRUD, title extraction, search, filename dedup, path traversal |
| `routes.test.ts` | 24 | Integration tests for all API endpoints via supertest |

Tests create temp directories with mock KB structures and clean up after each test. The API `createApp()` function is exported separately from `start()` to allow testing without binding to a port.

```bash
cd api && npm test        # Run all tests
cd api && npm run test:watch  # Watch mode
```

## Key Implementation Details

- KBs discovered by scanning `kbRoot` for directories with `kb.yaml` (Adjutant format)
- Notes are pure `.md` files — no YAML frontmatter, no generated slugs
- Note identity = filename (`current.md`), canvas node ID = `note-<filename>`
- Section/sticky identity = auto-incrementing IDs (`section-1`, `sticky-1`)
- All canvas metadata stored in `.mariposa.json` sidecars (positions, tags, sections, stickies)
- New notes auto-generate filenames from title via `slugify()` + dedup (`my-note.md`, `my-note-2.md`)
- Images stored per-KB in `<kb>/.mariposa/assets/` as WebP + thumbnails
- Image positions stored client-side in localStorage (`mariposa-image-positions` key)
- NoteEditor has 1.5s debounced autosave, supports image paste/drop (including iOS)
- `POST /api/config/browse` opens native Finder via AppleScript (`choose folder`)
- `POST /api/config/reveal` opens a path in Finder via `open` command
- API server: port 3020, host `0.0.0.0`
- Web server: port 3021, Vite proxy forwards `/api` to `localhost:3020`
- Vite proxy has `timeout: 0` for `/api/config/browse` (Finder dialog needs unlimited time)
- Vite build splits `@xyflow/react` and TipTap into separate chunks
- `createApp()` is exported from `index.ts` for test use; server only starts when run directly
