'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

// Estados de BullMQ expuestos por el backend (JobsAdminService). Espejo de JOB_STATES.
export const JOB_STATES = ['waiting', 'active', 'completed', 'failed', 'delayed'] as const;
export type JobState = (typeof JOB_STATES)[number];

export type Job = {
  id: string;
  name: string;
  state: string;
  attemptsMade: number;
  failedReason: string | null;
  data: unknown;
  timestamp: number | null;
  processedOn: number | null;
  finishedOn: number | null;
};

type JobsPage = { items: Job[]; state: string; page: number; pageSize: number };
export type JobCounts = Record<string, number>;

export const JOBS_PAGE_SIZE = 20;

async function send(url: string, method: 'POST' | 'DELETE'): Promise<unknown> {
  const res = await fetch(url, { method, credentials: 'include' });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

export function useJobCounts() {
  return useQuery({
    queryKey: ['jobs', 'counts'],
    queryFn: async (): Promise<JobCounts> => {
      return (await fetchJson<JobCounts>('/api/admin/jobs/counts')) ?? {};
    },
  });
}

export type JobSchedule = {
  name: string;
  /** Cron en UTC. */
  pattern: string;
  description: string;
  nextRunAt: number | null;
  lastRunAt: number | null;
  lastRunFailed: boolean | null;
};

export function useJobSchedules() {
  return useQuery({
    queryKey: ['jobs', 'schedules'],
    queryFn: async (): Promise<JobSchedule[]> => {
      return (await fetchJson<JobSchedule[]>('/api/admin/jobs/schedules')) ?? [];
    },
    // El calendario cambia con un deploy, no solo: no hace falta refetch agresivo.
    staleTime: 5 * 60 * 1000,
  });
}

export function useJobs(state: JobState, page: number) {
  return useQuery({
    queryKey: ['jobs', 'list', state, page],
    queryFn: async (): Promise<JobsPage> => {
      const params = new URLSearchParams({ state, page: String(page), pageSize: String(JOBS_PAGE_SIZE) });
      return (
        (await fetchJson<JobsPage>(`/api/admin/jobs?${params}`)) ?? {
          items: [],
          state,
          page,
          pageSize: JOBS_PAGE_SIZE,
        }
      );
    },
  });
}

export function useJobMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['jobs'] });
  return {
    retry: useMutation({
      mutationFn: (id: string) => send(`/api/admin/jobs/${id}/retry`, 'POST'),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => send(`/api/admin/jobs/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
    retryAllFailed: useMutation({
      mutationFn: () => send('/api/admin/jobs/retry-failed', 'POST'),
      onSuccess: invalidate,
    }),
  };
}
