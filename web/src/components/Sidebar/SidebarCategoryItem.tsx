import type { CategoryMeta } from '../../types/index.js';
import styles from './Sidebar.module.css';

interface SidebarCategoryItemProps {
  category: CategoryMeta;
  isActive: boolean;
  onTitleClick: () => void;
  onChevronClick: () => void;
}

export function SidebarCategoryItem({
  category,
  isActive,
  onTitleClick,
  onChevronClick,
}: SidebarCategoryItemProps) {
  const isEmpty = category.noteCount === 0;

  return (
    <div className={styles['sidebar-category-wrapper']}>
      {/* Main category row */}
      <div className={`${styles['sidebar-category-row']} ${isActive ? styles.active : ''}`}>
        <button
          className={styles['sidebar-category-title']}
          onClick={onTitleClick}
          title={category.displayName}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <span className={styles['sidebar-category-text']}>{category.displayName}</span>
          <span className={styles['sidebar-category-count']}>{category.noteCount}</span>
        </button>

        <button
          className={`${styles['sidebar-category-chevron']} ${isEmpty ? styles.muted : ''}`}
          onClick={onChevronClick}
          aria-label="View notes"
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <polyline points="9,18 15,12 9,6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
