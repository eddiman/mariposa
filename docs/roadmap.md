# Roadmap

Future plans for Mariposa.

## Current State (v1)

Mariposa is a fully functional canvas-based note-taking app with:
- Infinite spatial canvas with notes, images, sections, and stickies
- Rich text editing with TipTap (Markdown-backed)
- Category-based organization with tagging
- Two visual themes (default soft, bauhaus geometric)
- Search-first home page
- MCP integration for AI assistant access to notes
- Local-first file storage (Markdown, JSON, WebP)

## Phase 2: Local AI Integration

### Vision

Add semantic search and conversational AI capabilities to Mariposa, powered entirely by local models via LM Studio. No data leaves the machine. No external services to start — the vector database runs in-process inside the API server.

### Architecture

```
┌──────────────────────────────────────────────────┐
│                 Mariposa Web                      │
│                                                  │
│  Search bar ──→ Semantic search results          │
│  Chat panel ──→ AI answers grounded in notes     │
└──────────────────┬───────────────────────────────┘
                   │ REST API
┌──────────────────┼───────────────────────────────┐
│           Mariposa API (:3020)                   │
│                  │                               │
│  ┌───────────────┼────────────────────────────┐  │
│  │  New endpoints:                            │  │
│  │  POST /api/search/semantic                 │  │
│  │  POST /api/ai/ask                          │  │
│  │  GET  /api/embeddings/status               │  │
│  │  POST /api/embeddings/rebuild              │  │
│  └───────┬───────────────────┬────────────────┘  │
│          │                   │                   │
│  ┌───────┴──────┐    ┌──────┴───────┐            │
│  │   Vectra     │    │  LM Studio   │            │
│  │  (in-process │    │  (localhost   │            │
│  │   vectors)   │    │   :1234)     │            │
│  └──────────────┘    └──────────────┘            │
│          │                                       │
│  notes/.vectors/     ← JSON index on disk        │
└──────────────────────────────────────────────────┘
```

### Why Vectra (not ChromaDB)

ChromaDB's Node.js client is client-only — it always requires a separate Python server or Docker container running. That means another terminal, another process to manage, another thing that can fail.

**Vectra** (`npm install vectra`) runs fully in-process inside the Express API:

| Attribute | Details |
|-----------|---------|
| **Runtime** | Pure TypeScript — no native bindings, no compilation |
| **Storage** | JSON files on disk (`notes/.vectors/`) |
| **Filtering** | MongoDB-style metadata operators (category, tags) |
| **Search** | Cosine similarity (brute-force) |
| **Scale** | ~10k vectors comfortably — plenty for a personal notes app |
| **Query speed** | <2ms for thousands of vectors |

This aligns with Mariposa's architecture — sections are `.sections.json`, stickies are `.stickies.json`, and now vectors are JSON files in `.vectors/`. Same file-based philosophy, same backup strategy.

### Vectra Index Structure

```
notes/.vectors/
├── index.json              # Vector index (embeddings + metadata)
└── <item files>            # Per-item metadata
```

Each indexed note stores:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Note slug |
| `vector` | float[] | Embedding from LM Studio |
| `metadata.title` | string | Note title |
| `metadata.category` | string | Category name |
| `metadata.tags` | string | Comma-separated tags |
| `metadata.modified` | string | ISO date — used to detect stale embeddings |

Metadata filtering enables scoped searches:
```typescript
// Search only within a category
const results = await index.queryItems(queryVector, 10, {
  category: { $eq: "web-dev" }
});

// Search by tag
const results = await index.queryItems(queryVector, 10, {
  tags: { $contains: "devops" }
});
```

### LM Studio

LM Studio runs locally and exposes OpenAI-compatible API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/embeddings` | Generate vector embeddings for note content |
| `POST /v1/chat/completions` | Chat completion for answering questions about notes |

**Recommended models**:
- **Embeddings**: `nomic-embed-text` — fast, good quality, small footprint
- **Chat**: `llama-3.2-3b-instruct` or `phi-3-mini`, `Qwen-2B` — balance between quality and speed on consumer hardware

LM Studio is the only external dependency. The app works normally without it — AI features degrade gracefully (semantic search falls back to text search, ask endpoint returns an error).

### New API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/search/semantic` | Semantic search across notes. Body: `{ query, category?, tags?, limit? }`. Returns ranked results with similarity scores. |
| POST | `/api/ai/ask` | Ask a question about your notes. Body: `{ question, category?, noteContext? }`. Uses RAG: retrieves relevant notes, passes them as context to the chat model, returns a grounded answer. |
| GET | `/api/embeddings/status` | Check embedding pipeline status: total notes, embedded count, pending count, last sync time. |
| POST | `/api/embeddings/rebuild` | Trigger a full re-embedding of all notes. Useful after model changes or bulk imports. |

### New MCP Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `semantic_search` | `query`, `category?`, `limit?` | Search notes by meaning rather than keyword |
| `ask_notes` | `question`, `category?` | Ask a question and get an answer grounded in note content |
| `find_related` | `slug`, `limit?` | Find notes semantically related to a given note |

### Implementation Phases

#### Phase 2a: Embedding Infrastructure
- `npm install vectra` in the API
- Create `vectorService.ts` — manages the Vectra index at `notes/.vectors/`
- Create `embeddingService.ts` — talks to LM Studio `/v1/embeddings`
- Build sync pipeline: on note create/update/delete, update embeddings async
- Add `/api/embeddings/status` and `/api/embeddings/rebuild` endpoints
- Initial bulk embedding of all existing notes on first startup

#### Phase 2b: Query Interface
- Add `/api/search/semantic` endpoint
- Integrate semantic search into the Home page search (alongside existing text search)
- Add visual indicator for semantic vs text match results
- Add `semantic_search` and `find_related` MCP tools

#### Phase 2c: Conversational AI
- Add `/api/ai/ask` endpoint with RAG pipeline
- Build chat UI panel in the web app
- Add `ask_notes` MCP tool
- Context-aware: automatically scope questions to current category when on canvas

### Considerations

**Performance**:
- Embedding generation is async — don't block note saves
- Cache embeddings; only re-embed when content changes (compare `modified` timestamps)
- Vectra loads the index into memory — fast queries, low overhead for personal-scale data

**Hardware**:
- Embedding models are lightweight — `nomic-embed-text` runs well on CPU
- Chat models benefit from GPU but 3B parameter models work on CPU with acceptable latency
- LM Studio must be running for AI features; app works normally without it (graceful degradation)

**Privacy**:
- All processing is local — no data sent to external services
- LM Studio runs models on the user's machine
- Vectra stores vectors as local JSON files

**Future scalability**:
- If the note corpus grows beyond ~10k and query performance becomes an issue, Vectra could be replaced with `sqlite-vec` + `better-sqlite3` (SQLite-based vector search with full SQL filtering). This would be a drop-in replacement at the service layer without changing the API contract.

## Future Ideas

These are longer-term possibilities beyond Phase 2:

- **Note linking**: Bidirectional links between notes, wiki-style `[[note-title]]` syntax
- **Graph visualization**: Visual graph of note connections and semantic relationships
- **Smart tags**: AI-suggested tags based on note content
- **Auto-categorization**: Suggest which category a note belongs to based on content similarity
- **Summary generation**: Auto-generate note summaries for canvas preview cards
- **Mobile app**: React Native or PWA for mobile access
- **Collaboration**: Optional sync layer for sharing spaces (would require rethinking local-first storage)
- **Plugin system**: Extensible architecture for custom node types and tools
