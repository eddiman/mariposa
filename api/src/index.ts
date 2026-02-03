import express from 'express';
import { config } from './config.js';
import { noteService } from './services/noteService.js';
import { imageService } from './services/imageService.js';
import notesRouter from './routes/notes.js';
import categoriesRouter from './routes/categories.js';
import tagsRouter from './routes/tags.js';
import mcpRouter from './routes/mcp.js';
import assetsRouter from './routes/assets.js';
import sectionsRouter from './routes/sections.js';
import stickiesRouter from './routes/stickies.js';

const app = express();

// Middleware
app.use(express.json());

// CORS middleware - allow all origins for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id, Authorization');
  res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/notes', notesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/sections', sectionsRouter);
app.use('/api/stickies', stickiesRouter);

// MCP Streamable HTTP endpoint
app.use('/mcp', mcpRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Initialize services (creates directories)
    await noteService.init();
    await imageService.init();
    
    app.listen(config.port, config.host, () => {
      console.log(`Mariposa Note Server running on http://${config.host}:${config.port}`);
      console.log(`Notes directory: ${config.notesDir}`);
      console.log('\nREST API endpoints:');
      console.log('  GET    /api/notes          - List all notes');
      console.log('  GET    /api/notes/:slug    - Get a note');
      console.log('  POST   /api/notes          - Create a note');
      console.log('  PUT    /api/notes/:slug    - Update a note');
      console.log('  DELETE /api/notes/:slug    - Delete a note');
      console.log('  GET    /api/categories     - List categories');
      console.log('  POST   /api/categories     - Create category');
      console.log('  DELETE /api/categories/:name - Delete category');
      console.log('  GET    /api/tags           - List all tags');
      console.log('  POST   /api/assets/upload  - Upload image');
      console.log('  GET    /api/assets/:file   - Get image file');
      console.log('  DELETE /api/assets/:id     - Delete image');
      console.log('  GET    /api/sections       - List sections');
      console.log('  POST   /api/sections       - Create section');
      console.log('  PUT    /api/sections/:slug - Update section');
      console.log('  DELETE /api/sections/:slug - Delete section');
      console.log('  GET    /api/stickies       - List stickies');
      console.log('  POST   /api/stickies       - Create sticky');
      console.log('  PUT    /api/stickies/:slug - Update sticky');
      console.log('  DELETE /api/stickies/:slug - Delete sticky');
      console.log('  GET    /health             - Health check');
      console.log('\nMCP Streamable HTTP endpoint:');
      console.log('  POST   /mcp                - MCP JSON-RPC requests');
      console.log('  GET    /mcp                - MCP SSE stream');
      console.log('  DELETE /mcp                - MCP session termination');
      console.log('\nFor Docker access use: http://host.docker.internal:3020/mcp');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
