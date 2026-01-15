import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { noteService } from '../services/noteService.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'mariposa-notes',
    version: '1.0.0',
  });

  // Tool: list_notes
  server.tool(
    'list_notes',
    'List all notes with optional filters by category, tags, or search query',
    {
      category: z.string().optional().describe('Filter by category'),
      tags: z.string().optional().describe('Filter by tags (comma-separated)'),
      search: z.string().optional().describe('Search in title and content'),
    },
    async ({ category, tags, search }) => {
      const notes = await noteService.list({ category, tags, search });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ notes, total: notes.length }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: get_note
  server.tool(
    'get_note',
    'Get a single note by its slug',
    {
      slug: z.string().describe('The note slug (e.g., note-1)'),
    },
    async ({ slug }) => {
      const note = await noteService.get(slug);
      if (!note) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Note not found' }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(note, null, 2),
          },
        ],
      };
    }
  );

  // Tool: create_note
  server.tool(
    'create_note',
    'Create a new note with title, content, category, and tags',
    {
      title: z.string().describe('Note title (required)'),
      content: z.string().optional().default('').describe('Note content in markdown'),
      category: z.string().optional().default('uncategorized').describe('Category folder'),
      tags: z.array(z.string()).optional().default([]).describe('Tags for the note'),
    },
    async ({ title, content, category, tags }) => {
      const note = await noteService.create({ title, content, category, tags });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(note, null, 2),
          },
        ],
      };
    }
  );

  // Tool: update_note
  server.tool(
    'update_note',
    'Update an existing note by slug. Only provided fields will be updated.',
    {
      slug: z.string().describe('The note slug to update'),
      title: z.string().optional().describe('New title'),
      content: z.string().optional().describe('New content'),
      category: z.string().optional().describe('New category (moves the note)'),
      tags: z.array(z.string()).optional().describe('New tags (replaces existing)'),
    },
    async ({ slug, title, content, category, tags }) => {
      const note = await noteService.update(slug, { title, content, category, tags });
      if (!note) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Note not found' }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(note, null, 2),
          },
        ],
      };
    }
  );

  // Tool: delete_note
  server.tool(
    'delete_note',
    'Delete a note by its slug',
    {
      slug: z.string().describe('The note slug to delete'),
    },
    async ({ slug }) => {
      const deleted = await noteService.delete(slug);
      if (!deleted) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Note not found' }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: `Note ${slug} deleted` }),
          },
        ],
      };
    }
  );

  // Tool: list_categories
  server.tool(
    'list_categories',
    'List all available categories (folders)',
    {},
    async () => {
      const categories = await noteService.getCategories();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ categories }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: create_category
  server.tool(
    'create_category',
    'Create a new category (folder) for organizing notes',
    {
      name: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Category name can only contain letters, numbers, hyphens, and underscores').describe('Category name'),
    },
    async ({ name }) => {
      const created = await noteService.createCategory(name);
      if (!created) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Failed to create category' }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: `Category '${name}' created` }),
          },
        ],
      };
    }
  );

  // Tool: list_tags
  server.tool(
    'list_tags',
    'List all unique tags used across all notes',
    {},
    async () => {
      const tags = await noteService.getTags();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ tags }, null, 2),
          },
        ],
      };
    }
  );

  return server;
}
