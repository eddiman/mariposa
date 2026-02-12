import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command-line arguments
function parseArgs(): { notesDir?: string } {
  const args = process.argv.slice(2);
  const result: { notesDir?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--notes-dir' && args[i + 1]) {
      result.notesDir = args[i + 1];
      i++; // Skip next arg since we consumed it
    }
  }

  return result;
}

const cliArgs = parseArgs();

// Resolve notes directory: CLI arg > default
function resolveNotesDir(): string {
  if (cliArgs.notesDir) {
    // If absolute path, use as-is; otherwise resolve relative to cwd
    return path.isAbsolute(cliArgs.notesDir)
      ? cliArgs.notesDir
      : path.resolve(process.cwd(), cliArgs.notesDir);
  }
  return path.join(__dirname, '..', 'notes');
}

const notesDir = resolveNotesDir();

export const config = {
  port: 3020,
  host: '0.0.0.0', // Bind to all interfaces for Docker access
  notesDir,
  assetsDir: path.join(notesDir, '.assets', 'images'),
  counterFile: '.counter',
  defaultCategory: 'all-notes',
};
