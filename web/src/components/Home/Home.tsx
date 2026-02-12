import type { Note } from '../../types';
import { AnimatedBackground } from './AnimatedBackground';
import { SearchCard } from './SearchCard';
import styles from './Home.module.css';

interface HomeProps {
  appTitle?: string;
  onNoteSelect: (note: Note) => void;
}

export function Home({ appTitle = 'Mariposa', onNoteSelect }: HomeProps) {
  return (
    <div className={styles.home}>
      <AnimatedBackground />
      
      <div className={styles.content}>
        <h1 className={styles.title}>
          <span className={styles.titleBracket}>&lt;</span>
          {appTitle}
          <span className={styles.titleBracket}>&gt;</span>
        </h1>
        
        <SearchCard onNoteSelect={onNoteSelect} />
      </div>
    </div>
  );
}
