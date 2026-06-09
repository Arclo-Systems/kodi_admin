'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

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
      const res = await fetch('/api/admin/jobs/counts', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch job counts failed');
      return unwrapData<JobCounts>(await res.json()) ?? {};
    },
  });
}

export function useJobs(state: JobState, page: number) {
  return useQuery({
    queryKey: ['jobs', 'list', state, page],
    queryFn: async (): Promise<JobsPage> => {
      const params = new URLSearchParams({ state, page: String(page), pageSize: String(JOBS_PAGE_SIZE) });
      const res = await fetch(`/api/admin/jobs?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch jobs failed');
      return (
        unwrapData<JobsPage>(await res.json()) ?? { items: [], state, page, pageSize: JOBS_PAGE_SIZE }
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
