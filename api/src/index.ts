import express from 'express';
import { config } from './config.js';
import { configService } from './services/configService.js';
import configRouter from './routes/config.js';
import kbsRouter from './routes/kbs.js';
import foldersRouter from './routes/folders.js';
import notesRouter from './routes/notes.js';
import assetsRouter from './routes/assets.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // CORS middleware
  const allowedOrigins = [
    'http://localhost:3021',
    'https://localhost:3021',
  ];

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

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
  app.use('/api/config', configRouter);
  app.use('/api/kbs', kbsRouter);
  app.use('/api/folders', foldersRouter);
  app.use('/api/notes', notesRouter);
  app.use('/api/assets', assetsRouter);

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

  return app;
}

// Start server
async function start() {
  try {
    await configService.init();

    const app = createApp();

    app.listen(config.port, config.host, async () => {
      const kbRoot = await configService.getKbRoot();

      console.log(`Mariposa KB Explorer running on http://${config.host}:${config.port}`);
      console.log(`KB root: ${kbRoot || '(not configured — set via /api/config)'}`);
      console.log('\nREST API endpoints:');
      console.log('  GET    /api/config               - Get app config');
      console.log('  PUT    /api/config               - Update app config');
      console.log('  GET    /api/kbs                  - List knowledge bases');
      console.log('  GET    /api/kbs/:name            - Get KB metadata');
      console.log('  GET    /api/folders              - List folder contents');
      console.log('  GET    /api/folders/meta          - Get folder canvas metadata');
      console.log('  PUT    /api/folders/meta          - Update folder canvas metadata');
      console.log('  POST   /api/folders/sections      - Create section');
      console.log('  DELETE /api/folders/sections      - Delete section');
      console.log('  POST   /api/folders/stickies      - Create sticky');
      console.log('  DELETE /api/folders/stickies      - Delete sticky');
      console.log('  GET    /api/notes                - Get a note');
      console.log('  POST   /api/notes                - Create a note');
      console.log('  PUT    /api/notes                - Update a note');
      console.log('  DELETE /api/notes                - Delete a note');
      console.log('  GET    /api/notes/search         - Search notes');
      console.log('  GET    /api/assets               - List images');
      console.log('  GET    /api/assets/:file          - Serve image');
      console.log('  GET    /health                   - Health check');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start the server when this file is executed directly (not imported for testing)
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('/index.ts') ||
  process.argv[1].endsWith('/index.js')
);

if (isDirectExecution) {
  start();
}
