import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createMcpServer } from '../mcp/server.js';

const router = Router();

// Store transports by session ID for stateful connections
const transports: Map<string, StreamableHTTPServerTransport> = new Map();

// POST /mcp - Handle MCP JSON-RPC requests
router.post('/', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  console.log('MCP POST request:', {
    sessionId,
    method: req.body?.method,
    hasBody: !!req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'accept': req.headers['accept'],
    }
  });

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      // Reuse existing transport for this session
      transport = transports.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request - create new transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          console.log(`MCP session initialized: ${newSessionId}`);
          transports.set(newSessionId, transport);
        },
      });

      // Clean up transport on close
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports.has(sid)) {
          console.log(`MCP session closed: ${sid}`);
          transports.delete(sid);
        }
      };

      // Connect the MCP server to the transport
      const server = createMcpServer();
      await server.connect(transport);

      // Handle the initialization request
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      // Invalid request - no session ID and not an initialization request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request with existing transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// GET /mcp - Handle SSE streams (for server-initiated messages)
router.get('/', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({
      error: 'Invalid or missing session ID',
    });
    return;
  }

  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// DELETE /mcp - Handle session termination
router.delete('/', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({
      error: 'Invalid or missing session ID',
    });
    return;
  }

  console.log(`MCP session termination requested: ${sessionId}`);
  const transport = transports.get(sessionId)!;
  
  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error terminating session:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Error processing session termination',
      });
    }
  }
});

export default router;
