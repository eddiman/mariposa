import styles from './SystemStatus.module.css';

interface SystemStatusProps {
  status: {
    mode: 'adjutant' | 'standalone';
    available: boolean;
    adjutantDir?: string;
    lifecycleState?: 'OPERATIONAL' | 'PAUSED' | 'KILLED';
  };
}

export function SystemStatus({ status }: SystemStatusProps) {
  const getStateColor = (state?: string) => {
    switch (state) {
      case 'OPERATIONAL':
        return styles.stateOperational;
      case 'PAUSED':
        return styles.statePaused;
      case 'KILLED':
        return styles.stateKilled;
      default:
        return '';
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>System Status</h2>
      
      <div className={styles.statusGrid}>
        <div className={styles.statusItem}>
          <span className={styles.label}>Mode</span>
          <span className={styles.value}>{status.mode}</span>
        </div>

        <div className={styles.statusItem}>
          <span className={styles.label}>State</span>
          <span className={`${styles.value} ${getStateColor(status.lifecycleState)}`}>
            {status.lifecycleState || 'UNKNOWN'}
          </span>
        </div>

        {status.adjutantDir && (
          <div className={styles.statusItem}>
            <span className={styles.label}>Directory</span>
            <span className={styles.valuePath}>{status.adjutantDir}</span>
          </div>
        )}
      </div>
    </div>
  );
}
