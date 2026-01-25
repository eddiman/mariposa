import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasImage, Position } from '../types';

// Use relative URLs - Vite proxy handles /api routes

interface UseImagesOptions {
  category?: string;
}

interface UseImagesReturn {
  images: CanvasImage[];
  loading: boolean;
  error: string | null;
  uploadImage: (file: File, position?: Position, category?: string) => void;
  duplicateImage: (id: string, position: Position) => Promise<CanvasImage | null>;
  updateImagePosition: (id: string, position: Position) => void;
  updateImageSize: (id: string, displayWidth: number, displayHeight: number) => void;
  deleteImage: (id: string) => Promise<boolean>;
  moveToCategory: (id: string, category: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

// Store image canvas positions in localStorage (images don't have frontmatter like notes)
const POSITIONS_KEY = 'mariposa-image-positions';

interface ImagePositions {
  [id: string]: {
    position?: Position;
    displayWidth?: number;
    displayHeight?: number;
  };
}

function loadPositions(): ImagePositions {
  try {
    const stored = localStorage.getItem(POSITIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePositions(positions: ImagePositions): void {
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage errors
  }
}

export function useImages(options: UseImagesOptions = {}): UseImagesReturn {
  const [images, setImages] = useState<CanvasImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.category) {
        params.set('category', options.category);
      }
      const url = `/api/assets${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch images');
      
      const data = await response.json();
      const positions = loadPositions();
      
      // Merge API images with stored positions, mark as ready
      const imagesWithPositions: CanvasImage[] = data.images.map((img: CanvasImage) => ({
        ...img,
        position: positions[img.id]?.position,
        displayWidth: positions[img.id]?.displayWidth ?? Math.min(img.width, 400),
        displayHeight: positions[img.id]?.displayHeight ?? Math.min(img.height, 400 * (img.height / img.width)),
        status: 'ready' as const,
      }));
      
      // Keep any uploading/error images that aren't in the fetched list
      setImages(prev => {
        const pendingImages = prev.filter(img => img.status === 'uploading' || img.status === 'error');
        const fetchedIds = new Set(imagesWithPositions.map((img: CanvasImage) => img.id));
        const uniquePending = pendingImages.filter(img => !fetchedIds.has(img.id));
        return [...imagesWithPositions, ...uniquePending];
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  }, [options.category]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const uploadImage = useCallback((file: File, position?: Position, category?: string): void => {
    // Generate a temporary ID for the placeholder
    const tempId = `temp-${uuidv4()}`;
    const displayWidth = 200;
    const displayHeight = 150;
    
    // Create placeholder image immediately
    const placeholder: CanvasImage = {
      id: tempId,
      webpUrl: '',
      thumbUrl: '',
      width: displayWidth,
      height: displayHeight,
      aspectRatio: displayWidth / displayHeight,
      category,
      position: position ?? { x: 100, y: 100 },
      displayWidth,
      displayHeight,
      status: 'uploading',
    };
    
    // Add placeholder to state immediately
    setImages(prev => [...prev, placeholder]);
    
    // Save position to localStorage
    const positions = loadPositions();
    positions[tempId] = {
      position: placeholder.position,
      displayWidth,
      displayHeight,
    };
    savePositions(positions);
    
    // Start async upload
    const formData = new FormData();
    formData.append('image', file);
    if (category) {
      formData.append('category', category);
    }
    
    fetch(`/api/assets/upload`, {
      method: 'POST',
      body: formData,
    })
      .then(async response => {
        if (!response.ok) throw new Error('Failed to upload image');
        
        const newImage: CanvasImage = await response.json();
        
        // Set default display size (max 400px wide, preserve aspect ratio)
        const finalDisplayWidth = Math.min(newImage.width, 400);
        const finalDisplayHeight = finalDisplayWidth / newImage.aspectRatio;
        
        const imageWithPosition: CanvasImage = {
          ...newImage,
          position: placeholder.position,
          displayWidth: finalDisplayWidth,
          displayHeight: finalDisplayHeight,
          status: 'ready',
        };
        
        // Update localStorage with real ID
        const updatedPositions = loadPositions();
        delete updatedPositions[tempId];
        updatedPositions[newImage.id] = {
          position: imageWithPosition.position,
          displayWidth: finalDisplayWidth,
          displayHeight: finalDisplayHeight,
        };
        savePositions(updatedPositions);
        
        // Replace placeholder with real image
        setImages(prev => prev.map(img => 
          img.id === tempId ? imageWithPosition : img
        ));
      })
      .catch(err => {
        // Update placeholder to error state
        setImages(prev => prev.map(img => 
          img.id === tempId 
            ? { 
                ...img, 
                status: 'error' as const, 
                errorMessage: err instanceof Error ? err.message : 'Upload failed' 
              } 
            : img
        ));
      });
  }, []);

  const duplicateImage = useCallback(async (id: string, position: Position): Promise<CanvasImage | null> => {
    try {
      // Find the original image to copy category
      const originalImage = images.find(img => img.id === id);
      
      const response = await fetch(`/api/assets/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: originalImage?.category }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to duplicate image');
      }
      
      const newImage: CanvasImage = await response.json();
      
      const displayWidth = originalImage?.displayWidth ?? Math.min(newImage.width, 400);
      const displayHeight = originalImage?.displayHeight ?? displayWidth / newImage.aspectRatio;
      
      const imageWithPosition: CanvasImage = {
        ...newImage,
        position,
        displayWidth,
        displayHeight,
        status: 'ready',
      };
      
      // Save position to localStorage
      const positions = loadPositions();
      positions[newImage.id] = {
        position,
        displayWidth,
        displayHeight,
      };
      savePositions(positions);
      
      // Add to state
      setImages(prev => [...prev, imageWithPosition]);
      
      return imageWithPosition;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate image');
      return null;
    }
  }, [images]);

  const updateImagePosition = useCallback((id: string, position: Position) => {
    // Optimistic update
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, position } : img
    ));
    
    // Persist to localStorage
    const positions = loadPositions();
    positions[id] = { ...positions[id], position };
    savePositions(positions);
  }, []);

  const updateImageSize = useCallback((id: string, displayWidth: number, displayHeight: number) => {
    // Optimistic update
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, displayWidth, displayHeight } : img
    ));
    
    // Persist to localStorage
    const positions = loadPositions();
    positions[id] = { ...positions[id], displayWidth, displayHeight };
    savePositions(positions);
  }, []);

  const deleteImage = useCallback(async (id: string): Promise<boolean> => {
    // Check if this is a temp/error image (not on server)
    const image = images.find(img => img.id === id);
    if (image?.id.startsWith('temp-')) {
      // Just remove from local state
      setImages(prev => prev.filter(img => img.id !== id));
      const positions = loadPositions();
      delete positions[id];
      savePositions(positions);
      return true;
    }
    
    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete image');
      }
      
      // Remove from state
      setImages(prev => prev.filter(img => img.id !== id));
      
      // Remove from localStorage
      const positions = loadPositions();
      delete positions[id];
      savePositions(positions);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
      return false;
    }
  }, [images]);

  const moveToCategory = useCallback(async (id: string, category: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to move image');
      }
      
      // Remove from current view since category changed
      setImages(prev => prev.filter(img => img.id !== id));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move image');
      return false;
    }
  }, []);

  return {
    images,
    loading,
    error,
    uploadImage,
    duplicateImage,
    updateImagePosition,
    updateImageSize,
    deleteImage,
    moveToCategory,
    refetch: fetchImages,
  };
}
