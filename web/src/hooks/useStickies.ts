import { useCallback, useEffect, useState, useRef } from 'react';
import type { Sticky, StickiesResponse, StickyCreateInput, StickyUpdateInput, Position, StickyColor } from '../types';

// Debounce helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

interface UseStickiesOptions {
  category?: string;
}

interface UseStickiesReturn {
  stickies: Sticky[];
  loading: boolean;
  error: string | null;
  fetchStickies: () => Promise<void>;
  createSticky: (input: StickyCreateInput) => Promise<Sticky | null>;
  updateSticky: (slug: string, input: StickyUpdateInput) => Promise<Sticky | null>;
  updatePosition: (slug: string, position: Position) => void;
  updateText: (slug: string, text: string) => Promise<Sticky | null>;
  updateColor: (slug: string, color: StickyColor) => Promise<Sticky | null>;
  deleteSticky: (slug: string) => Promise<boolean>;
  moveToCategory: (slug: string, category: string) => Promise<Sticky | null>;
}

export function useStickies(options: UseStickiesOptions = {}): UseStickiesReturn {
  const [stickies, setStickies] = useState<Sticky[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStickies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.category) {
        params.set('category', options.category);
      }
      const url = `/api/stickies${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StickiesResponse = await res.json();
      setStickies(data.stickies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stickies');
    } finally {
      setLoading(false);
    }
  }, [options.category]);

  useEffect(() => {
    fetchStickies();
  }, [fetchStickies]);

  const createSticky = useCallback(async (input: StickyCreateInput): Promise<Sticky | null> => {
    try {
      const res = await fetch('/api/stickies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sticky: Sticky = await res.json();
      setStickies(prev => [...prev, sticky]);
      return sticky;
    } catch (err) {
      console.error('Failed to create sticky:', err);
      return null;
    }
  }, []);

  const updateSticky = useCallback(async (slug: string, input: StickyUpdateInput): Promise<Sticky | null> => {
    try {
      const res = await fetch(`/api/stickies/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sticky: Sticky = await res.json();
      setStickies(prev => prev.map(s => s.slug === slug ? sticky : s));
      return sticky;
    } catch (err) {
      console.error('Failed to update sticky:', err);
      return null;
    }
  }, []);

  // Debounced position updates
  const pendingPositions = useRef<Map<string, Position>>(new Map());
  const debouncedSavePositionRef = useRef<Map<string, ReturnType<typeof debounce>>>(new Map());

  const savePosition = useCallback(async (slug: string) => {
    const position = pendingPositions.current.get(slug);
    if (!position) return;
    
    pendingPositions.current.delete(slug);
    
    // Validate slug format - should be 'sticky-N'
    if (!/^sticky-\d+$/.test(slug)) {
      console.warn(`Invalid sticky slug format: "${slug}". Expected format: sticky-N. Skipping API call.`);
      return;
    }
    
    try {
      const res = await fetch(`/api/stickies/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Failed to update sticky position:', err);
      await fetchStickies();
    }
  }, [fetchStickies]);

  const updatePosition = useCallback((slug: string, position: Position): void => {
    // Optimistic update
    setStickies(prev => prev.map(s => 
      s.slug === slug ? { ...s, position } : s
    ));

    pendingPositions.current.set(slug, position);

    if (!debouncedSavePositionRef.current.has(slug)) {
      debouncedSavePositionRef.current.set(slug, debounce((s: string) => savePosition(s), 300));
    }
    
    const debouncedSave = debouncedSavePositionRef.current.get(slug)!;
    debouncedSave(slug);
  }, [savePosition]);

  const updateText = useCallback(async (slug: string, text: string): Promise<Sticky | null> => {
    // Optimistic update
    setStickies(prev => prev.map(s => 
      s.slug === slug ? { ...s, text } : s
    ));

    try {
      const res = await fetch(`/api/stickies/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sticky: Sticky = await res.json();
      setStickies(prev => prev.map(s => s.slug === slug ? sticky : s));
      return sticky;
    } catch (err) {
      console.error('Failed to update sticky text:', err);
      await fetchStickies();
      return null;
    }
  }, [fetchStickies]);

  const updateColor = useCallback(async (slug: string, color: StickyColor): Promise<Sticky | null> => {
    // Optimistic update
    setStickies(prev => prev.map(s => 
      s.slug === slug ? { ...s, color } : s
    ));

    try {
      const res = await fetch(`/api/stickies/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sticky: Sticky = await res.json();
      setStickies(prev => prev.map(s => s.slug === slug ? sticky : s));
      return sticky;
    } catch (err) {
      console.error('Failed to update sticky color:', err);
      await fetchStickies();
      return null;
    }
  }, [fetchStickies]);

  const deleteSticky = useCallback(async (slug: string): Promise<boolean> => {
    // Optimistic delete - remove from state immediately
    setStickies(prev => prev.filter(s => s.slug !== slug));
    
    try {
      const res = await fetch(`/api/stickies/${slug}`, {
        method: 'DELETE',
      });
      // 404 means it's already deleted, which is fine
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      console.error('Failed to delete sticky:', err);
      // Refetch to restore correct state on error
      await fetchStickies();
      return false;
    }
  }, [fetchStickies]);

  const moveToCategory = useCallback(async (slug: string, category: string): Promise<Sticky | null> => {
    try {
      const res = await fetch(`/api/stickies/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sticky: Sticky = await res.json();
      setStickies(prev => prev.filter(s => s.slug !== slug));
      return sticky;
    } catch (err) {
      console.error('Failed to move sticky to category:', err);
      return null;
    }
  }, []);

  return {
    stickies,
    loading,
    error,
    fetchStickies,
    createSticky,
    updateSticky,
    updatePosition,
    updateText,
    updateColor,
    deleteSticky,
    moveToCategory,
  };
}
