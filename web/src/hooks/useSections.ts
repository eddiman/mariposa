import { useCallback, useEffect, useState, useRef } from 'react';
import type { Section, SectionsResponse, SectionCreateInput, SectionUpdateInput, Position } from '../types';

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

interface UseSectionsOptions {
  category?: string;
}

interface UseSectionsReturn {
  sections: Section[];
  loading: boolean;
  error: string | null;
  fetchSections: () => Promise<void>;
  createSection: (input: SectionCreateInput) => Promise<Section | null>;
  updateSection: (slug: string, input: SectionUpdateInput) => Promise<Section | null>;
  updatePosition: (slug: string, position: Position) => void;
  updateSize: (slug: string, width: number, height: number) => void;
  deleteSection: (slug: string) => Promise<boolean>;
  moveToCategory: (slug: string, category: string) => Promise<Section | null>;
}

export function useSections(options: UseSectionsOptions = {}): UseSectionsReturn {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.category) {
        params.set('category', options.category);
      }
      const url = `/api/sections${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SectionsResponse = await res.json();
      setSections(data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sections');
    } finally {
      setLoading(false);
    }
  }, [options.category]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const createSection = useCallback(async (input: SectionCreateInput): Promise<Section | null> => {
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const section: Section = await res.json();
      setSections(prev => [...prev, section]);
      return section;
    } catch (err) {
      console.error('Failed to create section:', err);
      return null;
    }
  }, []);

  const updateSection = useCallback(async (slug: string, input: SectionUpdateInput): Promise<Section | null> => {
    try {
      const res = await fetch(`/api/sections/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const section: Section = await res.json();
      setSections(prev => prev.map(s => s.slug === slug ? section : s));
      return section;
    } catch (err) {
      console.error('Failed to update section:', err);
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
    
    // Validate slug format - should be 'section-N'
    if (!/^section-\d+$/.test(slug)) {
      console.warn(`Invalid section slug format: "${slug}". Expected format: section-N. Skipping API call.`);
      return;
    }
    
    try {
      const res = await fetch(`/api/sections/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Failed to update section position:', err);
      await fetchSections();
    }
  }, [fetchSections]);

  const updatePosition = useCallback((slug: string, position: Position): void => {
    // Optimistic update
    setSections(prev => prev.map(s => 
      s.slug === slug ? { ...s, position } : s
    ));

    pendingPositions.current.set(slug, position);

    if (!debouncedSavePositionRef.current.has(slug)) {
      debouncedSavePositionRef.current.set(slug, debounce((s: string) => savePosition(s), 300));
    }
    
    const debouncedSave = debouncedSavePositionRef.current.get(slug)!;
    debouncedSave(slug);
  }, [savePosition]);

  // Debounced size updates
  const pendingSizes = useRef<Map<string, { width: number; height: number }>>(new Map());
  const debouncedSaveSizeRef = useRef<Map<string, ReturnType<typeof debounce>>>(new Map());

  const saveSize = useCallback(async (slug: string) => {
    const size = pendingSizes.current.get(slug);
    if (!size) return;
    
    pendingSizes.current.delete(slug);
    
    // Validate slug format - should be 'section-N'
    if (!/^section-\d+$/.test(slug)) {
      console.warn(`Invalid section slug format: "${slug}". Expected format: section-N. Skipping API call.`);
      return;
    }
    
    try {
      const res = await fetch(`/api/sections/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width: size.width, height: size.height }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Failed to update section size:', err);
      await fetchSections();
    }
  }, [fetchSections]);

  const updateSize = useCallback((slug: string, width: number, height: number): void => {
    // Optimistic update
    setSections(prev => prev.map(s => 
      s.slug === slug ? { ...s, width, height } : s
    ));

    pendingSizes.current.set(slug, { width, height });

    if (!debouncedSaveSizeRef.current.has(slug)) {
      debouncedSaveSizeRef.current.set(slug, debounce((s: string) => saveSize(s), 300));
    }
    
    const debouncedSave = debouncedSaveSizeRef.current.get(slug)!;
    debouncedSave(slug);
  }, [saveSize]);

  const deleteSection = useCallback(async (slug: string): Promise<boolean> => {
    // Optimistic delete - remove from state immediately
    setSections(prev => prev.filter(s => s.slug !== slug));
    
    try {
      const res = await fetch(`/api/sections/${slug}`, {
        method: 'DELETE',
      });
      // 404 means it's already deleted, which is fine
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      console.error('Failed to delete section:', err);
      // Refetch to restore correct state on error
      await fetchSections();
      return false;
    }
  }, [fetchSections]);

  const moveToCategory = useCallback(async (slug: string, category: string): Promise<Section | null> => {
    try {
      const res = await fetch(`/api/sections/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const section: Section = await res.json();
      setSections(prev => prev.filter(s => s.slug !== slug));
      return section;
    } catch (err) {
      console.error('Failed to move section to category:', err);
      return null;
    }
  }, []);

  return {
    sections,
    loading,
    error,
    fetchSections,
    createSection,
    updateSection,
    updatePosition,
    updateSize,
    deleteSection,
    moveToCategory,
  };
}
