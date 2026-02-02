import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CategoryMeta } from '../types';

type CategoryDialogMode = 'select' | 'create' | 'rename' | 'delete';

interface CategoryDialogContextValue {
  // State
  isOpen: boolean;
  mode: CategoryDialogMode;
  categoryToDelete: CategoryMeta | null;
  categoryToRename: CategoryMeta | null;
  
  // Actions
  openCreateDialog: () => void;
  openRenameDialog: (category: CategoryMeta) => void;
  openDeleteDialog: (category: CategoryMeta) => void;
  closeDialog: () => void;
}

const CategoryDialogContext = createContext<CategoryDialogContextValue | null>(null);

interface CategoryDialogProviderProps {
  children: ReactNode;
}

export function CategoryDialogProvider({ children }: CategoryDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CategoryDialogMode>('select');
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryMeta | null>(null);
  const [categoryToRename, setCategoryToRename] = useState<CategoryMeta | null>(null);

  const openCreateDialog = useCallback(() => {
    setMode('create');
    setIsOpen(true);
  }, []);

  const openRenameDialog = useCallback((category: CategoryMeta) => {
    setCategoryToRename(category);
    setMode('rename');
    setIsOpen(true);
  }, []);

  const openDeleteDialog = useCallback((category: CategoryMeta) => {
    setCategoryToDelete(category);
    setMode('delete');
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setCategoryToDelete(null);
    setCategoryToRename(null);
  }, []);

  const value: CategoryDialogContextValue = {
    isOpen,
    mode,
    categoryToDelete,
    categoryToRename,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
  };

  return (
    <CategoryDialogContext.Provider value={value}>
      {children}
    </CategoryDialogContext.Provider>
  );
}

export function useCategoryDialog() {
  const context = useContext(CategoryDialogContext);
  if (!context) {
    throw new Error('useCategoryDialog must be used within a CategoryDialogProvider');
  }
  return context;
}
