import { useCallback, useEffect, useRef, useState } from 'react';

export interface AdjutantStatus {
  mode: 'adjutant' | 'standalone';
  available: boolean;
  adjutantDir?: string;
  lifecycleState?: 'OPERATIONAL' | 'PAUSED' | 'KILLED';
}

export interface Schedule {
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  script?: string;
  log?: string;
  kb_name?: string;
  kb_operation?: string;
}

export interface Identity {
  soul: string;
  heart: string;
  registry: string;
}

export interface HealthStatus {
  healthy: boolean;
  checks: {
    adjutantDirExists: boolean;
    configExists: boolean;
    cliExecutable: boolean;
  };
}

export interface AdjutantData {
  status: AdjutantStatus | null;
  schedules: Schedule[];
  identity: Identity | null;
  health: HealthStatus | null;
  journalEntries: string[];
  loading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
  fetchSchedules: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  handleScheduleToggle: (name: string, enabled: boolean) => Promise<void>;
  handleScheduleRun: (name: string) => Promise<void>;
  handleLifecycleAction: (action: 'pause' | 'resume' | 'pulse' | 'review') => Promise<void>;
}

/**
 * Persistent hook for Adjutant dashboard data.
 * Lives in AppContent so state survives route changes.
 * Fetches once on first mount, then only on explicit actions.
 */
export function useAdjutant(): AdjutantData {
  const [status, setStatus] = useState<AdjutantStatus | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [journalEntries, setJournalEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/adjutant/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
      setError('Failed to load Adjutant status');
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/adjutant/schedules');
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    }
  }, []);

  const fetchIdentity = useCallback(async () => {
    try {
      const res = await fetch('/api/adjutant/identity');
      if (!res.ok) throw new Error('Failed to fetch identity');
      const data = await res.json();
      setIdentity(data);
    } catch (err) {
      console.error('Failed to fetch identity:', err);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/adjutant/health');
      if (!res.ok) throw new Error('Failed to fetch health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  }, []);

  const fetchJournal = useCallback(async () => {
    try {
      const res = await fetch('/api/adjutant/journal/recent');
      if (!res.ok) throw new Error('Failed to fetch journal');
      const data = await res.json();
      setJournalEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to fetch journal:', err);
    }
  }, []);

  // Fetch once on first mount
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

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

    fetchAll();
  }, [fetchStatus, fetchSchedules, fetchIdentity, fetchHealth, fetchJournal]);

  const handleScheduleToggle = useCallback(async (name: string, enabled: boolean) => {
    const res = await fetch('/api/adjutant/schedules/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, enabled }),
    });
    if (!res.ok) throw new Error('Failed to toggle schedule');
    await fetchSchedules();
  }, [fetchSchedules]);

  const handleScheduleRun = useCallback(async (name: string) => {
    const res = await fetch('/api/adjutant/schedules/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to run schedule');
  }, []);

  const handleLifecycleAction = useCallback(async (action: 'pause' | 'resume' | 'pulse' | 'review') => {
    const res = await fetch('/api/adjutant/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error(`Failed to ${action}`);
    await fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    schedules,
    identity,
    health,
    journalEntries,
    loading,
    error,
    fetchStatus,
    fetchSchedules,
    fetchHealth,
    handleScheduleToggle,
    handleScheduleRun,
    handleLifecycleAction,
  };
}
