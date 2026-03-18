import { useState } from 'react';
import styles from './SchedulesManager.module.css';

interface Schedule {
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  script?: string;
  log?: string;
  kb_name?: string;
  kb_operation?: string;
}

interface SchedulesManagerProps {
  schedules: Schedule[];
  onToggle: (name: string, enabled: boolean) => Promise<void>;
  onRun: (name: string) => Promise<void>;
}

export function SchedulesManager({ schedules, onToggle, onRun }: SchedulesManagerProps) {
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);

  const handleToggle = async (name: string, currentEnabled: boolean) => {
    await onToggle(name, !currentEnabled);
  };

  const handleRun = async (name: string) => {
    if (confirm(`Run schedule "${name}" now?`)) {
      await onRun(name);
    }
  };

  const toggleExpand = (name: string) => {
    setExpandedSchedule(prev => prev === name ? null : name);
  };

  if (schedules.length === 0) {
    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Schedules</h2>
        <p className={styles.empty}>No schedules configured</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        Schedules <span className={styles.count}>({schedules.length})</span>
      </h2>

      <div className={styles.schedulesList}>
        {schedules.map(schedule => (
          <div key={schedule.name} className={styles.scheduleItem}>
            <div className={styles.scheduleHeader} onClick={() => toggleExpand(schedule.name)}>
              <div className={styles.scheduleInfo}>
                <h3 className={styles.scheduleName}>{schedule.name}</h3>
                <p className={styles.scheduleDescription}>{schedule.description}</p>
                <span className={styles.scheduleCron}>{schedule.schedule}</span>
              </div>
              <div className={styles.scheduleStatus}>
                <span className={`${styles.statusBadge} ${schedule.enabled ? styles.statusEnabled : styles.statusDisabled}`}>
                  {schedule.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {expandedSchedule === schedule.name && (
              <div className={styles.scheduleDetails}>
                <div className={styles.detailsGrid}>
                  {schedule.kb_name && (
                    <>
                      <span className={styles.detailLabel}>KB:</span>
                      <span className={styles.detailValue}>{schedule.kb_name}</span>
                      <span className={styles.detailLabel}>Operation:</span>
                      <span className={styles.detailValue}>{schedule.kb_operation}</span>
                    </>
                  )}
                  {schedule.script && (
                    <>
                      <span className={styles.detailLabel}>Script:</span>
                      <span className={styles.detailValue}>{schedule.script}</span>
                    </>
                  )}
                  {schedule.log && (
                    <>
                      <span className={styles.detailLabel}>Log:</span>
                      <span className={styles.detailValue}>{schedule.log}</span>
                    </>
                  )}
                </div>

                <div className={styles.scheduleActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleToggle(schedule.name, schedule.enabled)}
                  >
                    {schedule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    onClick={() => handleRun(schedule.name)}
                  >
                    Run Now
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
