import { useEffect, useState } from 'react';

interface Note {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface NotesResponse {
  notes: Note[];
  total: number;
}

export function NotesList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/notes')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: NotesResponse) => {
        setNotes(data.notes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading notes...</p>;
  if (error) return <p>Error: {error}</p>;
  if (notes.length === 0) return <p>No notes found.</p>;

  return (
    <ul>
      {notes.map((note) => (
        <li key={note.slug}>
          <strong>{note.title}</strong> ({note.slug}) - {note.category}
          {note.tags.length > 0 && (
            <span> [{note.tags.join(', ')}]</span>
          )}
        </li>
      ))}
    </ul>
  );
}
