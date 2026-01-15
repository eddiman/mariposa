# Mariposa

A note-taking server that stores notes as local `.md` files with YAML frontmatter. Provides both a REST API and an MCP (Model Context Protocol) Streamable HTTP interface for AI integration.

## Features

- **Markdown notes** with YAML frontmatter metadata
- **Categories** (folder-based organization)
- **Tags** for flexible note organization
- **REST API** for traditional HTTP clients
- **MCP Streamable HTTP** for AI assistant integration (OpenWebUI, Claude, etc.)
- **Auto-incrementing slugs** (`note-1`, `note-2`, etc.)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/eddiman/mariposa.git
cd mariposa

# Install dependencies
npm install

# Start the server
npm run dev
```

The server runs on `http://localhost:3020` by default.

## REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notes` | List all notes |
| `GET` | `/api/notes/:slug` | Get a note by slug |
| `POST` | `/api/notes` | Create a new note |
| `PUT` | `/api/notes/:slug` | Update a note |
| `DELETE` | `/api/notes/:slug` | Delete a note |
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Create a category |
| `DELETE` | `/api/categories/:name` | Delete an empty category |
| `GET` | `/api/tags` | List all unique tags |
| `GET` | `/health` | Health check |

### Query Parameters for `GET /api/notes`

- `category` - Filter by category
- `tags` - Filter by tags (comma-separated)
- `search` - Search in title and content

### Example: Create a Note

```bash
curl -X POST http://localhost:3020/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Note",
    "content": "# Hello\n\nThis is my note.",
    "category": "personal",
    "tags": ["example", "test"]
  }'
```

## MCP Integration

The server exposes an MCP Streamable HTTP endpoint at `/mcp` with the following tools:

| Tool | Description |
|------|-------------|
| `list_notes` | List notes with optional filters |
| `get_note` | Get a single note by slug |
| `create_note` | Create a new note |
| `update_note` | Update an existing note |
| `delete_note` | Delete a note |
| `list_categories` | List all categories |
| `create_category` | Create a new category |
| `list_tags` | List all unique tags |

### MCP Prompts

The server also provides prompts that guide AI assistants in presenting information:

| Prompt | Description |
|--------|-------------|
| `display_note` | Format a note for user-friendly display |
| `summarize_notes` | Summarize all notes with statistics |
| `create_note_helper` | Guide user through creating a new note |
| `search_notes` | Search and present matching results |

### OpenWebUI Setup

1. Go to **Admin Settings → External Tools**
2. Click **+ Add Server**
3. Configure:
   - **Type**: `MCP (Streamable HTTP)`
   - **Server URL**: `http://host.docker.internal:3020/mcp` (if OpenWebUI runs in Docker) or `http://localhost:3020/mcp`
   - **Authentication**: `None`
4. Save and verify connection

## Note Storage

Notes are stored as `.md` files in the `notes/` directory, organized by category:

```
notes/
├── uncategorized/
│   └── note-1.md
├── work/
│   └── note-2.md
└── personal/
    └── note-3.md
```

### Note Format

```markdown
---
slug: note-1
title: My Note Title
category: personal
tags:
  - example
  - test
createdAt: '2024-01-15T10:30:00.000Z'
updatedAt: '2024-01-15T10:30:00.000Z'
---

# My Note Title

Note content in markdown...
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production build |

## Configuration

Edit `src/config.ts` to change:

- `port` - Server port (default: `3020`)
- `host` - Bind address (default: `0.0.0.0`)
- `notesDir` - Notes storage directory
- `defaultCategory` - Default category for new notes (default: `uncategorized`)

## License

MIT
