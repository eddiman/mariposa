import { useEffect, useState } from 'react';
import { SystemStatus } from './SystemStatus';
import { SchedulesManager } from './SchedulesManager';
import { IdentityDisplay } from './IdentityDisplay';
import { QuickActions } from './QuickActions';
import { HealthChecks } from './HealthChecks';
import { ActivityFeed } from './ActivityFeed';
import { AnimatedBackground } from '../Home/AnimatedBackground';
import styles from './AdjutantDashboard.module.css';

interface AdjutantStatus {
  mode: 'adjutant' | 'standalone';
  available: boolean;
  adjutantDir?: string;
  lifecycleState?: 'OPERATIONAL' | 'PAUSED' | 'KILLED';
}

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

interface Identity {
  soul: string;
  heart: string;
  registry: string;
}

interface HealthStatus {
  healthy: boolean;
  checks: {
    adjutantDirExists: boolean;
    configExists: boolean;
    cliExecutable: boolean;
  };
}

interface AdjutantDashboardProps {
  sidebarOpen?: boolean;
}

export function AdjutantDashboard({ sidebarOpen = false }: AdjutantDashboardProps) {
  const [status, setStatus] = useState<AdjutantStatus | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [journalEntries, setJournalEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/adjutant/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
      setError('Failed to load Adjutant status');
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/adjutant/schedules');
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    }
  };

  const fetchIdentity = async () => {
    try {
      const res = await fetch('/api/adjutant/identity');
      if (!res.ok) throw new Error('Failed to fetch identity');
      const data = await res.json();
      setIdentity(data);
    } catch (err) {
      console.error('Failed to fetch identity:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/adjutant/health');
      if (!res.ok) throw new Error('Failed to fetch health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  };

  const fetchJournal = async () => {
    try {
      const res = await fetch('/api/adjutant/journal/recent');
      if (!res.ok) throw new Error('Failed to fetch journal');
      const data = await res.json();
      setJournalEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to fetch journal:', err);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      fetchStatus(),
      fetchSchedules(),
      fetchIdentity(),
      fetchHealth(),
      fetchJournal(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleScheduleToggle = async (name: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/adjutant/schedules/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled }),
      });
      
      if (!res.ok) throw new Error('Failed to toggle schedule');
      
      // Refresh schedules
      await fetchSchedules();
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
      alert('Failed to toggle schedule');
    }
  };

  const handleScheduleRun = async (name: string) => {
    try {
      const res = await fetch('/api/adjutant/schedules/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (!res.ok) throw new Error('Failed to run schedule');
      
      alert(`Schedule "${name}" triggered successfully`);
    } catch (err) {
      console.error('Failed to run schedule:', err);
      alert('Failed to trigger schedule');
    }
  };

  const handleLifecycleAction = async (action: 'pause' | 'resume' | 'pulse' | 'review') => {
    try {
      const res = await fetch('/api/adjutant/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      if (!res.ok) throw new Error(`Failed to ${action}`);
      
      // Refresh status after lifecycle action
      await fetchStatus();
      alert(`${action.charAt(0).toUpperCase() + action.slice(1)} completed`);
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
      alert(`Failed to ${action}`);
    }
  };

  const dashboardClass = `${styles.dashboard} ${sidebarOpen ? styles.sidebarOpen : ''}`;

  if (loading) {
    return (
      <div className={dashboardClass}>
        <AnimatedBackground />
        <div className={styles.content}>
          <h1 className={styles.title}>Adjutant Dashboard</h1>
          <p className={styles.loading}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !status || !status.available) {
    return (
      <div className={dashboardClass}>
        <AnimatedBackground />
        <div className={styles.content}>
          <h1 className={styles.title}>Adjutant Dashboard</h1>
          <div className={styles.error}>
            <p>{error || 'Adjutant integration not available'}</p>
            <p className={styles.errorHint}>
              Make sure Adjutant is installed and the environment variable is set.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={dashboardClass}>
      <AnimatedBackground />
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleBracket}>&lt;</span>
            Adjutant
            <span className={styles.titleBracket}>&gt;</span>
          </h1>
          <p className={styles.subtitle}>Agent Control Center</p>
        </header>

        <div className={styles.grid}>
          <SystemStatus status={status} />
          <QuickActions
            lifecycleState={status.lifecycleState}
            onAction={handleLifecycleAction}
          />
          <HealthChecks health={health} onRefresh={fetchHealth} />
          <SchedulesManager
            schedules={schedules}
            onToggle={handleScheduleToggle}
            onRun={handleScheduleRun}
          />
          <IdentityDisplay identity={identity} />
          <ActivityFeed entries={journalEntries} />
        </div>
      </div>
    </div>
  );
}
