import { useState } from 'react';
import styles from './QuickActions.module.css';

type Action = 'pause' | 'resume' | 'pulse' | 'review';
type ActionState = 'idle' | 'running' | 'success' | 'error';

interface QuickActionsProps {
  lifecycleState?: 'OPERATIONAL' | 'PAUSED' | 'KILLED';
  onAction: (action: Action) => Promise<void>;
}

export function QuickActions({ lifecycleState, onAction }: QuickActionsProps) {
  const isPaused = lifecycleState === 'PAUSED';
  const isKilled = lifecycleState === 'KILLED';

  const [actionStates, setActionStates] = useState<Record<Action, ActionState>>({
    pause: 'idle',
    resume: 'idle',
    pulse: 'idle',
    review: 'idle',
  });

  const handleAction = async (action: Action) => {
    if (actionStates[action] === 'running') return;

    setActionStates(prev => ({ ...prev, [action]: 'running' }));

    try {
      await onAction(action);
      setActionStates(prev => ({ ...prev, [action]: 'success' }));
      setTimeout(() => {
        setActionStates(prev => ({ ...prev, [action]: 'idle' }));
      }, 3000);
    } catch {
      setActionStates(prev => ({ ...prev, [action]: 'error' }));
      setTimeout(() => {
        setActionStates(prev => ({ ...prev, [action]: 'idle' }));
      }, 4000);
    }
  };

  const getButtonContent = (action: Action, icon: string, label: string) => {
    const state = actionStates[action];

    switch (state) {
      case 'running':
        return (
          <>
            <span className={`${styles.actionIcon} ${styles.spinning}`}>⟳</span>
            <span className={styles.actionLabel}>Running...</span>
          </>
        );
      case 'success':
        return (
          <>
            <span className={`${styles.actionIcon} ${styles.successIcon}`}>✓</span>
            <span className={`${styles.actionLabel} ${styles.successLabel}`}>Done</span>
          </>
        );
      case 'error':
        return (
          <>
            <span className={`${styles.actionIcon} ${styles.errorIcon}`}>✗</span>
            <span className={`${styles.actionLabel} ${styles.errorLabel}`}>Failed</span>
          </>
        );
      default:
        return (
          <>
            <span className={styles.actionIcon}>{icon}</span>
            <span className={styles.actionLabel}>{label}</span>
          </>
        );
    }
  };

  const getButtonClass = (action: Action, baseClass: string) => {
    const state = actionStates[action];
    const classes = [styles.actionButton, baseClass];
    if (state === 'running') classes.push(styles.actionRunning);
    if (state === 'success') classes.push(styles.actionSuccess);
    if (state === 'error') classes.push(styles.actionError);
    return classes.join(' ');
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Quick Actions</h2>

      <div className={styles.actionsGrid}>
        {!isPaused && !isKilled && (
          <button
            className={getButtonClass('pause', styles.actionPause)}
            onClick={() => handleAction('pause')}
            disabled={actionStates.pause === 'running'}
          >
            {getButtonContent('pause', '⏸', 'Pause')}
          </button>
        )}

        {isPaused && (
          <button
            className={getButtonClass('resume', styles.actionResume)}
            onClick={() => handleAction('resume')}
            disabled={actionStates.resume === 'running'}
          >
            {getButtonContent('resume', '▶', 'Resume')}
          </button>
        )}

        <button
          className={getButtonClass('pulse', styles.actionPulse)}
          onClick={() => handleAction('pulse')}
          disabled={actionStates.pulse === 'running'}
        >
          {getButtonContent('pulse', '💓', 'Pulse')}
        </button>

        <button
          className={getButtonClass('review', styles.actionReview)}
          onClick={() => handleAction('review')}
          disabled={actionStates.review === 'running'}
        >
          {getButtonContent('review', '📋', 'Review')}
        </button>
      </div>
    </div>
  );
}
