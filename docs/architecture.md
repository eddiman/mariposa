# Architecture

System design documentation for Mariposa.

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              React + React Flow                   │  │
│  │                                                   │  │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────────┐   │  │
│  │  │  Home   │  │  Canvas  │  │  Editor (overlay)│  │  │
│  │  │ (search)│  │ (nodes)  │  │  (TipTap)       │  │  │
│  │  └─────────┘  └──────────┘  └────────────────┘   │  │
│  │                    │                              │  │
│  │  ┌─────────────────┼────────────────────────┐     │  │
│  │  │  Custom Hooks   │   Contexts             │     │  │
│  │  │  useNotes       │   EditorContext        │     │  │
│  │  │  useImages      │   PlacementContext     │     │  │
│  │  │  useSections    │   CategoryDialogCtx    │     │  │
│  │  │  useStickies    │                        │     │  │
│  │  │  useCanvas      │   localStorage         │     │  │
│  │  │  useSettings    │   (settings, img pos)  │     │  │
│  │  └─────────────────┼────────────────────────┘     │  │
│  └────────────────────┼──────────────────────────────┘  │
│                       │ REST API calls                  │
└───────────────────────┼─────────────────────────────────┘
                        │
          ┌─────────────┼─────────────────┐
          │     Express API (:3020)        │
          │                               │
          │  ┌─────────┐  ┌───────────┐   │
          │  │ Routes   │  │ MCP Server│   │
          │  │ /api/*   │  │ /mcp      │   │
          │  └────┬─────┘  └─────┬─────┘   │
          │       │              │          │
          │  ┌────┴──────────────┴──────┐  │
          │  │       Services           │  │
          │  │  noteService             │  │
          │  │  imageService (Sharp)    │  │
          │  │  sectionService          │  │
          │  │  stickyService           │  │
          │  └──────────┬───────────────┘  │
          └─────────────┼──────────────────┘
                        │ File I/O
          ┌─────────────┼─────────────────┐
          │     Local File System         │
          │                               │
          │  notes/                       │
          │  ├── *.md          (notes)    │
          │  ├── <category>/*.md          │
          │  ├── .assets/images/          │
          │  │   ├── <uuid>.webp          │
          │  │   ├── <uuid>-thumb.webp    │
          │  │   └── <uuid>.meta.json     │
          │  ├── .sections.json           │
          │  ├── .stickies.json           │
          │  └── .counter                 │
          └───────────────────────────────┘
```

## Data Entities

### Note

Stored as Markdown files with YAML frontmatter. Uncategorized notes live in `notes/`, categorized notes in `notes/<category>/`.

```yaml
---
title: My Note Title
tags:
  - javascript
  - react
created: 2025-01-15T10:30:00.000Z
modified: 2025-01-15T14:22:00.000Z
position:
  x: 320
  y: 180
---

# Heading

Note content in **Markdown** format.
```

| Field | Type | Description |
|-------|------|-------------|
| `slug` | string | Derived from filename (e.g., `note-1` from `note-1.md`) |
| `title` | string | From frontmatter |
| `content` | string | Markdown body after frontmatter |
| `tags` | string[] | Optional tag list |
| `category` | string | Directory name, or `null` for uncategorized |
| `created` | ISO date | Creation timestamp |
| `modified` | ISO date | Last modification timestamp |
| `position` | `{x, y}` | Canvas position |

### Image

Stored as WebP files in `notes/.assets/images/`. Each image has three files:

| File | Purpose |
|------|---------|
| `<uuid>.webp` | Full-size image (Sharp, quality 80) |
| `<uuid>-thumb.webp` | 300px-wide thumbnail (quality 75) |
| `<uuid>.meta.json` | Category metadata sidecar |

The `.meta.json` file contains:
```json
{
  "category": "my-category"
}
```

Canvas positions for images are stored client-side in localStorage under the `mariposa-image-positions` key.

Accepted upload formats: JPEG, PNG, GIF, WebP, SVG, HEIC/HEIF. All are converted to WebP via Sharp.

### Section

Stored in `notes/.sections.json` as a JSON array.

```json
{
  "slug": "section-1",
  "name": "Research",
  "category": "my-project",
  "position": { "x": 0, "y": 0 },
  "size": { "width": 600, "height": 400 },
  "color": "blue",
  "created": "2025-01-15T10:30:00.000Z",
  "modified": "2025-01-15T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `slug` | string | Auto-generated identifier |
| `name` | string | Editable display label |
| `category` | string | Which canvas space it belongs to |
| `position` | `{x, y}` | Canvas position |
| `size` | `{width, height}` | Rectangle dimensions |
| `color` | string | Color variant name |
| `created` | ISO date | Creation timestamp |
| `modified` | ISO date | Last modification timestamp |

### Sticky

Stored in `notes/.stickies.json` as a JSON array.

```json
{
  "slug": "sticky-1",
  "text": "Remember to check this",
  "category": "my-project",
  "color": "yellow",
  "position": { "x": 500, "y": 300 },
  "created": "2025-01-15T10:30:00.000Z",
  "modified": "2025-01-15T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `slug` | string | Auto-generated identifier |
| `text` | string | Sticky content |
| `category` | string | Which canvas space it belongs to |
| `color` | string | One of 9 color variants |
| `position` | `{x, y}` | Canvas position |
| `created` | ISO date | Creation timestamp |
| `modified` | ISO date | Last modification timestamp |

## Web Application

### Routing

React Router manages three views:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` | Search-first landing with animated background. Search queries the API and displays results grouped by category. Clicking a result navigates to the note's canvas and opens the editor. |
| `/:category` | `Canvas` | Infinite canvas for a category space. Loads notes, images, sections, and stickies for that category. |
| `/:category/:noteSlug` | `Canvas + Editor` | Same canvas view with the note editor overlay open. URL updates when opening/closing the editor. |

### State Architecture

All state lives in `App.tsx` and is managed through custom hooks:

```
App.tsx
├── useCanvas()          → currentSpace, focusedNote, navigation
├── useNotes()           → notes[], CRUD, position saves
├── useImages()          → images[], upload, positions (localStorage)
├── useSections()        → sections[], CRUD, resize saves
├── useStickies()        → stickies[], CRUD, color/text changes
├── useSettings()        → theme, snapToObject, showSnapLines
├── useCanvasHistory()   → undo/redo stack
├── useSnapToGuides()    → snap alignment lines
├── useCanvasNodeDrag()  → drag lifecycle
├── useCanvasClipboard() → copy/paste
├── useCanvasKeyboard()  → keyboard shortcuts
├── useCanvasTouchGestures() → long-press, two-finger tap
└── useCanvasContextMenu()   → right-click menus
```

Contexts provide cross-cutting state:

| Context | Purpose |
|---------|---------|
| `EditorContext` | Controls editor overlay: animation origin rect, initial note data for opening |
| `PlacementContext` | Controls placement mode: whether active, what type (note/section/sticky), ghost preview follows cursor |
| `CategoryDialogContext` | Controls category dialog: mode (select/create/rename/delete), target category |

### Canvas Implementation

The canvas uses `@xyflow/react` (React Flow) with four custom node types registered in `web/src/components/nodes/index.ts`:

- **NoteNode**: Shows title + read-only TipTap preview of markdown content. Double-click opens the full editor overlay. Supports highlight animation when focused from sidebar.
- **ImageNode**: Renders images with three states (uploading spinner, error icon, ready). Has a corner resize handle that maintains aspect ratio.
- **SectionNode**: Renders a colored rectangle with an editable name label (click to edit inline). Has 4-corner resize handles that scale inversely with zoom level. Supports touch resize.
- **StickyNode**: Renders a colored sticky note. Double-click (desktop) or single tap when selected (mobile) enters text editing mode. Cmd/Ctrl+Enter saves. 9 color variants available.

### Interactions

**Drag & Drop**: `useCanvasNodeDrag` manages the full lifecycle — auto-selects node on drag start, calculates snap guides during drag, persists positions on drag stop, and updates section membership when nodes are dragged in/out of sections.

**Snap-to-Guides**: `useSnapToGuides` calculates alignment lines (vertical and horizontal) by comparing the dragged node's edges and center to all other visible nodes. Threshold is 8px. Visual guides rendered by `SnapGuides` component.

**Undo/Redo**: `useCanvasHistory` maintains a stack of up to 50 operations (move, delete, create, resize). Supports batch operations for multi-node actions.

**Clipboard**: `useCanvasClipboard` copies node data to the system clipboard as JSON. Falls back to module-level in-memory storage if system clipboard is unavailable. Supports pasting image files directly onto the canvas.

**Keyboard Shortcuts** (`useCanvasKeyboard`):
| Key | Action |
|-----|--------|
| Cmd/Ctrl+Z | Undo |
| Cmd/Ctrl+Shift+Z | Redo |
| Cmd/Ctrl+C | Copy selected nodes |
| Cmd/Ctrl+V | Paste |
| Delete / Backspace | Delete selected nodes |
| Escape | Clear selection / exit placement mode |
| S | Enter section placement mode |
| T | Enter sticky placement mode |
| Enter | Select nodes inside a selected section |

**Touch Gestures** (`useCanvasTouchGestures`):
- Long-press (500ms) opens context menu
- Two-finger tap opens context menu
- Pinch-to-zoom detection prevents false triggers

### Editor

The editor is a full-screen overlay (`Editor` component) that slides in from the note's position on the canvas (animation origin tracked via `EditorContext`).

Inside, `NoteEditor` wraps a TipTap editor instance with these extensions:
- StarterKit (headings, lists, code blocks, etc.)
- Markdown (bidirectional markdown serialization via `tiptap-markdown`)
- Highlight (text highlighting)
- Image (inline images)
- Placeholder ("Start writing...")

The editor includes:
- Title input field
- Tag input (`TagInput` component)
- Category selector
- Rich text editing area with toolbar

## API Server

### Configuration (`api/src/config.ts`)

| Setting | Default | Description |
|---------|---------|-------------|
| Port | 3020 | HTTP server port |
| Host | `0.0.0.0` | Bind address |
| Notes directory | `api/notes/` | Overridable via `--notes-dir` CLI arg |
| Assets directory | `<notesDir>/.assets/images/` | Derived from notes dir |
| Counter file | `.counter` | Auto-increment slug counter |
| Default category | `all-notes` | Category for the main space |

### Service Layer

Each service is a singleton class handling file I/O for its entity type:

- **NoteService** (`noteService.ts`): Reads/writes `.md` files with YAML frontmatter. Handles search (title/content substring match), category filtering, tag filtering. Manages file moves between category directories.
- **ImageService** (`imageService.ts`): Uses Sharp to convert uploaded images to WebP (quality 80) and generate 300px thumbnails (quality 75). Manages `.meta.json` sidecar files for category metadata.
- **SectionService** (`sectionService.ts`): Reads/writes `.sections.json`. Filters by category field.
- **StickyService** (`stickyService.ts`): Reads/writes `.stickies.json`. Filters by category field.

### MCP Integration

The MCP server (`api/src/mcp/server.ts`) exposes Mariposa's note system to AI assistants via the Model Context Protocol. It uses Streamable HTTP transport through the `/mcp` endpoint.

**Available tools**: `list_notes`, `get_note`, `create_note`, `update_note`, `delete_note`, `list_categories`, `create_category`, `list_tags`

**Available prompts**: `display_note`, `summarize_notes`, `create_note_helper`, `search_notes`

The MCP route (`api/src/routes/mcp.ts`) handles three HTTP methods:
- `POST /mcp` — JSON-RPC requests from clients
- `GET /mcp` — SSE stream for server-initiated messages
- `DELETE /mcp` — Session termination

## Development Setup

### Proxy Configuration

The Vite dev server (`web/vite.config.ts`) proxies `/api` requests to the Express API:

```
Browser → localhost:3021 (Vite) → /api/* → localhost:3020 (Express)
```

This avoids CORS issues during development. In production, both would typically be served from the same origin or configured with appropriate CORS headers.

### Build Optimization

Vite's build config splits large dependencies into separate chunks:
- `@xyflow/react` → `vendor-xyflow` chunk
- TipTap packages → `vendor-tiptap` chunk

This improves caching — vendor code changes rarely while application code changes frequently.
