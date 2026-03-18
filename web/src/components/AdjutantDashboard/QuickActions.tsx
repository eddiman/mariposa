import styles from './QuickActions.module.css';

interface QuickActionsProps {
  lifecycleState?: 'OPERATIONAL' | 'PAUSED' | 'KILLED';
  onAction: (action: 'pause' | 'resume' | 'pulse' | 'review') => Promise<void>;
}

export function QuickActions({ lifecycleState, onAction }: QuickActionsProps) {
  const isPaused = lifecycleState === 'PAUSED';
  const isKilled = lifecycleState === 'KILLED';

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Quick Actions</h2>

      <div className={styles.actionsGrid}>
        {!isPaused && !isKilled && (
          <button
            className={`${styles.actionButton} ${styles.actionPause}`}
            onClick={() => onAction('pause')}
          >
            <span className={styles.actionIcon}>⏸</span>
            <span className={styles.actionLabel}>Pause</span>
          </button>
        )}

        {isPaused && (
          <button
            className={`${styles.actionButton} ${styles.actionResume}`}
            onClick={() => onAction('resume')}
          >
            <span className={styles.actionIcon}>▶</span>
            <span className={styles.actionLabel}>Resume</span>
          </button>
        )}

        <button
          className={`${styles.actionButton} ${styles.actionPulse}`}
          onClick={() => onAction('pulse')}
        >
          <span className={styles.actionIcon}>💓</span>
          <span className={styles.actionLabel}>Pulse</span>
        </button>

        <button
          className={`${styles.actionButton} ${styles.actionReview}`}
          onClick={() => onAction('review')}
        >
          <span className={styles.actionIcon}>📋</span>
          <span className={styles.actionLabel}>Review</span>
        </button>
      </div>
    </div>
  );
}
