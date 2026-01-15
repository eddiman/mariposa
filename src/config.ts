import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: 3020,
  host: '0.0.0.0', // Bind to all interfaces for Docker access
  notesDir: path.join(__dirname, '..', '..', 'notes'),
  counterFile: '.counter',
  defaultCategory: 'uncategorized',
};
