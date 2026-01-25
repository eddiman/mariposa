# AGENTS.md - Mariposa

Guidelines for AI coding agents working on this codebase.

## Project Overview

Mariposa is a note-taking application with:
- **API**: Express REST API with MCP (Model Context Protocol) integration
- **Web**: React frontend for browsing and managing notes

Notes are stored as local markdown files with YAML frontmatter.

## Project Structure

```
mariposa/
├── api/                    # Express API server (port 3020)
│   ├── src/
│   │   ├── index.ts        # Express app setup, middleware, server start
│   │   ├── config.ts       # Configuration constants
│   │   ├── mcp/            # Model Context Protocol integration
│   │   │   └── server.ts   # MCP server with tools and prompts
│   │   ├── routes/         # Express route handlers
│   │   │   ├── notes.ts    # Note CRUD endpoints
│   │   │   ├── categories.ts
│   │   │   ├── tags.ts
│   │   │   └── mcp.ts      # MCP Streamable HTTP transport
│   │   ├── services/
│   │   │   └── noteService.ts
│   │   ├── types/
│   │   │   └── note.ts
│   │   └── utils/
│   │       ├── frontmatter.ts
│   │       └── slugGenerator.ts
│   ├── notes/              # Note storage (markdown files)
│   ├── package.json
│   └── tsconfig.json
│
├── web/                    # React frontend (port 3021)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── components/
│   │       └── NotesList.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── owui-mariposa-filter/   # Open WebUI integration (filter/pipe functions)
└── AGENTS.md
```

## Tech Stack

### API (`api/`)
- **Language**: TypeScript 5.3+ (strict mode enabled)
- **Runtime**: Node.js with ES2022 target
- **Framework**: Express 4.x
- **Validation**: Zod for runtime schema validation
- **Module System**: ESM (`"type": "module"`)
- **Build Tool**: tsup
- **Dev Runner**: tsx (with watch mode)

### Web (`web/`)
- **Language**: TypeScript
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: None yet (minimal CSS)

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

**Note**: No test framework is currently configured. No ESLint or Prettier.

## Code Style Guidelines

### Imports

1. **Use `.js` extension** for all local imports (required for ESM):
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
| Classes | PascalCase | `NoteService` |
| Interfaces/Types | PascalCase | `Note`, `NoteMeta`, `FrontmatterData` |
| Zod Schemas | PascalCase + Schema | `NoteCreateSchema`, `NoteQuerySchema` |
| Functions | camelCase | `parseNote`, `getNextSlug` |
| Variables | camelCase | `noteService`, `filePath` |
| Unused parameters | Prefix with `_` | `_req`, `_res`, `_next` |

### TypeScript Patterns

- **Strict mode is enabled** - avoid `any` types
- Use **interfaces for data structures**, derive types from Zod:
  ```typescript
  export interface Note { slug: string; title: string; /* ... */ }
  export type NoteCreateInput = z.infer<typeof NoteCreateSchema>;
  ```
- Type assertions with `as` only when necessary

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

### Comments

- Minimal comments - code should be self-documenting
- Section dividers for large files: `// === Section Name ===`
- Inline comments only for non-obvious behavior

### Git Commit Style

- Lowercase, imperative mood
- Concise descriptions
- Examples: "add display hint...", "fix validation error...", "update timestamp format..."

## Key Implementation Details 

- Notes stored as `.md` files with YAML frontmatter in `notes/` directory
- Categories are subdirectories within `notes/`
- Default category: "uncategorized"
- Auto-incrementing slugs: `note-1`, `note-2`, etc. (via counter file)
- API server port: 3020 (configurable in `api/src/config.ts`)
- Web server port: 3021 (configurable in `web/vite.config.ts`)
