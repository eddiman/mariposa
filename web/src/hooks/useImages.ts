import { useCallback, useEffect, useState, useRef } from 'react';
import type { CanvasImage, Position } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const POSITIONS_STORAGE_KEY = 'mariposa-image-positions';

function loadPositions(): Record<string, { position: Position; displayWidth?: number; displayHeight?: number }> {
  try {
    const stored = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, { position: Position; displayWidth?: number; displayHeight?: number }>) {
  localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
}

interface UseImagesOptions {
  kb: string | null;
}

interface UseImagesReturn {
  images: CanvasImage[];
  loading: boolean;
  uploadImage: (file: File, position: Position) => Promise<CanvasImage | null>;
  updateImagePosition: (id: string, position: Position) => void;
  updateImageSize: (id: string, width: number, height: number) => void;
  deleteImage: (id: string) => Promise<boolean>;
}

export function useImages(options: UseImagesOptions): UseImagesReturn {
  const { kb } = options;
  const [images, setImages] = useState<CanvasImage[]>([]);
  const [loading, setLoading] = useState(false);
  const positionsRef = useRef(loadPositions());

  const fetchImages = useCallback(async () => {
    if (!kb) {
      setImages([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/assets?kb=${encodeURIComponent(kb)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fetchedImages: CanvasImage[] = (data.images || []).map((img: CanvasImage) => {
        const stored = positionsRef.current[img.id];
        return {
          ...img,
          position: stored?.position || { x: Math.random() * 400, y: Math.random() * 400 },
          displayWidth: stored?.displayWidth,
          displayHeight: stored?.displayHeight,
          status: 'ready' as const,
        };
      });
      setImages(fetchedImages);
    } catch (err) {
      console.error('Failed to fetch images:', err);
    } finally {
      setLoading(false);
    }
  }, [kb]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const uploadImage = useCallback(async (file: File, position: Position): Promise<CanvasImage | null> => {
    if (!kb) return null;

    const tempId = `upload-${Date.now()}`;
    const tempImage: CanvasImage = {
      id: tempId,
      webpUrl: '',
      thumbUrl: '',
      width: 300,
      height: 200,
      aspectRatio: 1.5,
      kb,
      position,
      status: 'uploading',
    };
    setImages(prev => [...prev, tempImage]);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('kb', kb);

      const res = await fetch('/api/assets/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const metadata = await res.json();

      const newImage: CanvasImage = {
        ...metadata,
        position,
        status: 'ready',
      };

      positionsRef.current[metadata.id] = { position };
      savePositions(positionsRef.current);

      setImages(prev => prev.map(img => img.id === tempId ? newImage : img));
      return newImage;
    } catch (err) {
      console.error('Failed to upload image:', err);
      setImages(prev => prev.map(img =>
        img.id === tempId ? { ...img, status: 'error', errorMessage: 'Upload failed' } : img,
      ));
      return null;
    }
  }, [kb]);

  const debouncedSavePositions = useRef(debounce(() => savePositions(positionsRef.current), 300));

  const updateImagePosition = useCallback((id: string, position: Position) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, position } : img));
    positionsRef.current[id] = { ...positionsRef.current[id], position };
    debouncedSavePositions.current();
  }, []);

  const updateImageSize = useCallback((id: string, displayWidth: number, displayHeight: number) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, displayWidth, displayHeight } : img,
    ));
    positionsRef.current[id] = { ...positionsRef.current[id], displayWidth, displayHeight };
    debouncedSavePositions.current();
  }, []);

  const deleteImage = useCallback(async (id: string): Promise<boolean> => {
    if (!kb) return false;

    setImages(prev => prev.filter(img => img.id !== id));

    try {
      const res = await fetch(`/api/assets/${id}?kb=${encodeURIComponent(kb)}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);

      delete positionsRef.current[id];
      savePositions(positionsRef.current);
      return true;
    } catch (err) {
      console.error('Failed to delete image:', err);
      await fetchImages();
      return false;
    }
  }, [kb, fetchImages]);

  return { images, loading, uploadImage, updateImagePosition, updateImageSize, deleteImage };
}
