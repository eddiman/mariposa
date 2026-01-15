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

  // ============================================
  // MCP Prompts - Define how notes are presented
  // ============================================

  // Prompt: Display a note in a readable format
  server.prompt(
    'display_note',
    'Display a note in a clean, readable format for the user',
    {
      slug: z.string().describe('The note slug to display'),
    },
    async ({ slug }) => {
      const note = await noteService.get(slug);
      if (!note) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Note "${slug}" was not found.`,
              },
            },
          ],
        };
      }

      const tagsStr = note.tags.length > 0 ? note.tags.join(', ') : 'none';
      const formattedDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Here is the note "${note.title}":\n\n---\n**Title:** ${note.title}\n**Category:** ${note.category}\n**Tags:** ${tagsStr}\n**Last updated:** ${formattedDate}\n\n${note.content}\n---\n\nPlease present this note to the user in a clear and friendly way.`,
            },
          },
        ],
      };
    }
  );

  // Prompt: Summarize all notes
  server.prompt(
    'summarize_notes',
    'Get a summary of all notes for the user',
    {},
    async () => {
      const notes = await noteService.list();
      const categories = await noteService.getCategories();
      const tags = await noteService.getTags();

      const notesList = notes
        .map((n) => `- "${n.title}" (${n.category}) [${n.tags.join(', ') || 'no tags'}]`)
        .join('\n');

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Here is a summary of the user's notes:\n\n**Total notes:** ${notes.length}\n**Categories:** ${categories.join(', ')}\n**All tags:** ${tags.join(', ') || 'none'}\n\n**Notes:**\n${notesList}\n\nPlease present this summary to the user in a helpful and organized way.`,
            },
          },
        ],
      };
    }
  );

  // Prompt: Help user create a note
  server.prompt(
    'create_note_helper',
    'Guide the user through creating a new note',
    {
      topic: z.string().optional().describe('Optional topic or subject for the note'),
    },
    async ({ topic }) => {
      const categories = await noteService.getCategories();
      const tags = await noteService.getTags();

      const topicHint = topic ? `The user wants to create a note about: "${topic}"` : 'The user wants to create a new note.';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `${topicHint}\n\nAvailable categories: ${categories.join(', ')}\nExisting tags: ${tags.join(', ') || 'none yet'}\n\nHelp the user create this note by:\n1. Suggesting a good title\n2. Asking what content they want to include\n3. Recommending an appropriate category\n4. Suggesting relevant tags\n\nThen use the create_note tool to save it.`,
            },
          },
        ],
      };
    }
  );

  // Prompt: Search and present notes
  server.prompt(
    'search_notes',
    'Search notes and present results to the user',
    {
      query: z.string().describe('Search query'),
    },
    async ({ query }) => {
      const notes = await noteService.list({ search: query });

      if (notes.length === 0) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `No notes found matching "${query}". Let the user know and offer to help them create a note about this topic.`,
              },
            },
          ],
        };
      }

      const results = notes
        .map((n) => `- **${n.title}** (${n.slug}) in ${n.category}`)
        .join('\n');

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Found ${notes.length} note(s) matching "${query}":\n\n${results}\n\nPresent these results to the user. If they want to see the full content of any note, use the get_note tool.`,
            },
          },
        ],
      };
    }
  );

  return server;
}
