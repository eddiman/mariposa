# Mariposa

A canvas-based note-taking application with local-first storage and AI integration.

## Features

- **Infinite Canvas** - Arrange notes, images, sections, and stickies spatially
- **Rich Text Editor** - TipTap-powered Markdown editing with image support
- **Categories & Tags** - Organize notes into spaces with flexible tagging
- **Sections** - Visual grouping containers for related notes
- **Sticky Notes** - Quick color-coded annotations on the canvas
- **Theming** - Default (soft blue) and Bauhaus (geometric primary colors)
- **Home Page** - Search-first landing with animated background
- **MCP Integration** - AI assistant support via Model Context Protocol
- **Local Storage** - All data stored as Markdown files with YAML frontmatter

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Running the Application

```bash
# Terminal 1: Start API server (port 3020)
cd api && npm install && npm run dev

# Terminal 2: Start Web app (port 3021)
cd web && npm install && npm run dev
```

Open http://localhost:3021 in your browser.

## Project Structure

```
mariposa/
├── api/                 # Express REST API + MCP server
├── web/                 # React frontend with canvas UI
├── docs/                # Documentation
│   ├── architecture.md  # System design
│   └── roadmap.md       # Future plans
└── AGENTS.md            # AI coding agent guidelines
```

## Documentation

- **[Architecture](docs/architecture.md)** - System components, data flow, storage format
- **[Roadmap](docs/roadmap.md)** - Future plans including local LLM integration
- **[AGENTS.md](AGENTS.md)** - Guidelines for AI coding agents

## Tech Stack

| Component | Technology |
|-----------|------------|
| API | Express, TypeScript, Zod |
| Web | React 19, React Flow, TipTap, Vite |
| Storage | Markdown + YAML frontmatter |
| AI | MCP Streamable HTTP |

## License

MIT
