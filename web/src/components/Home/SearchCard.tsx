import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import type { Note } from '../../types';
import styles from './SearchCard.module.css';

interface SearchCardProps {
  onNoteSelect: (note: Note) => void;
}

interface GroupedNotes {
  [category: string]: Note[];
}

export function SearchCard({ onNoteSelect }: SearchCardProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [resultsHeight, setResultsHeight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHighlightedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/notes?search=${encodeURIComponent(query.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.notes || []);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Group results by category
  const groupedResults = useMemo<GroupedNotes>(() => {
    const groups: GroupedNotes = {};
    for (const note of results) {
      const category = note.category || 'uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(note);
    }
    return groups;
  }, [results]);

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: Note[] = [];
    const sortedCategories = Object.keys(groupedResults).sort();
    for (const category of sortedCategories) {
      flat.push(...groupedResults[category]);
    }
    return flat;
  }, [groupedResults]);

  // Animate height changes when content updates
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    
    const showResults = query.trim().length > 0;
    if (!showResults) {
      setResultsHeight(0);
      return;
    }

    // Measure the actual content height
    const contentHeight = contentRef.current.scrollHeight;
    // Cap at max height (20rem = 320px)
    const targetHeight = Math.min(contentHeight, 320);
    setResultsHeight(targetHeight);
  }, [query, results, isLoading]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!flatResults.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < flatResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : flatResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && flatResults[highlightedIndex]) {
          onNoteSelect(flatResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setQuery('');
        setResults([]);
        setHighlightedIndex(-1);
        break;
    }
  }, [flatResults, highlightedIndex, onNoteSelect]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll(`.${styles.noteItem}`);
      const item = items[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  const showResults = query.trim().length > 0;
  const sortedCategories = Object.keys(groupedResults).sort();

  // Track cumulative index for highlighting
  let cumulativeIndex = 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Start searching..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div 
          className={`${styles.results} ${showResults ? styles.resultsOpen : ''}`}
          style={{ height: resultsHeight }}
          ref={resultsRef}
        >
          <div 
            className={`${styles.resultsInner} ${showResults ? styles.resultsOpen : ''}`}
            ref={contentRef}
          >
            {isLoading ? (
              <div className={styles.loadingState}>Searching...</div>
            ) : results.length === 0 && query.trim() ? (
              <div className={styles.emptyState}>No notes found</div>
            ) : (
              sortedCategories.map((category) => {
                const categoryNotes = groupedResults[category];
                const startIndex = cumulativeIndex;
                cumulativeIndex += categoryNotes.length;

                return (
                  <div key={category} className={styles.categoryGroup}>
                    <div className={styles.categoryHeader}>{category}</div>
                    {categoryNotes.map((note, noteIndex) => {
                      const absoluteIndex = startIndex + noteIndex;
                      return (
                        <div
                          key={note.slug}
                          className={`${styles.noteItem} ${absoluteIndex === highlightedIndex ? styles.highlighted : ''}`}
                          onClick={() => onNoteSelect(note)}
                          onMouseEnter={() => setHighlightedIndex(absoluteIndex)}
                        >
                          <p className={styles.noteTitle}>{note.title}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
