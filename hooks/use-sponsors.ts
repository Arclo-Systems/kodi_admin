'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type SponsorOption = { id: string; name: string };

export type PipelineStatus = 'prospect' | 'active' | 'lost';
export type SponsorCurrency = 'CRC' | 'USD';

export const PIPELINE_STATUSES: PipelineStatus[] = ['prospect', 'active', 'lost'];

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  prospect: 'Prospecto',
  active: 'Activo',
  lost: 'Perdido',
};

export type SponsorCounts = {
  banners: number;
  coupons: number;
  raffles: number;
  videos?: number;
};

export type Sponsor = {
  id: string;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  website: string | null;
  country: string | null;
  isActive: boolean;
  pipelineStatus: PipelineStatus;
  currency: SponsorCurrency;
  appliesIva: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  legalName: string | null;
  taxId: string | null;
  billingEmail: string | null;
  contractStartsAt: string | null;
  contractEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: SponsorCounts;
};

export type SponsorInput = {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  website: string | null;
  country: string | null;
  isActive: boolean;
  pipelineStatus: PipelineStatus;
  currency: SponsorCurrency;
  appliesIva: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  legalName: string | null;
  taxId: string | null;
  billingEmail: string | null;
  contractStartsAt: string | null;
  contractEndsAt: string | null;
};

export type SponsorListQuery = {
  country?: string;
  isActive?: boolean;
  search?: string;
  page: number;
  pageSize: number;
};

type SponsorListPage = {
  items: Sponsor[];
  total: number;
  page: number;
  pageSize: number;
};

// Opciones de sponsor para selects (forms de cupones, banners, facturas). Trae activos.
export function useSponsorOptions() {
  return useQuery({
    queryKey: ['sponsor-options'],
    staleTime: 60_000,
    queryFn: async (): Promise<SponsorOption[]> => {
      const res = await fetch('/api/admin/economy/sponsors?pageSize=100&isActive=true', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch sponsors failed');
      const page = unwrapData<SponsorListPage>(await res.json());
      return (page?.items ?? []).map((s) => ({ id: s.id, name: s.name }));
    },
  });
}

export function useSponsors(query: SponsorListQuery) {
  return useQuery({
    queryKey: ['sponsors', query],
    queryFn: async (): Promise<SponsorListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/economy/sponsors?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch sponsors failed');
      return (
        unwrapData<SponsorListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useSponsor(id: string) {
  return useQuery({
    queryKey: ['sponsor', id],
    enabled: !!id,
    queryFn: async (): Promise<Sponsor | undefined> => {
      const res = await fetch(`/api/admin/economy/sponsors/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch sponsor failed');
      return unwrapData<Sponsor>(await res.json());
    },
  });
}

async function sendJson(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

export function useSponsorMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (input: SponsorInput): Promise<string> => {
        const body = await sendJson('/api/admin/economy/sponsors', 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['sponsors'] });
        qc.invalidateQueries({ queryKey: ['sponsor-options'] });
      },
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<SponsorInput> }) =>
        sendJson(`/api/admin/economy/sponsors/${id}`, 'PATCH', input),
      onSuccess: (_data, { id }) => {
        qc.invalidateQueries({ queryKey: ['sponsors'] });
        qc.invalidateQueries({ queryKey: ['sponsor', id] });
      },
    }),
  };
}

// Cambio de etapa del pipeline (drag en el Kanban). Optimista con rollback.
export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pipelineStatus }: { id: string; pipelineStatus: PipelineStatus }) =>
      sendJson(`/api/admin/economy/sponsors/${id}`, 'PATCH', { pipelineStatus }),
    onMutate: async ({ id, pipelineStatus }) => {
      await qc.cancelQueries({ queryKey: ['sponsors'] });
      const snapshots = qc.getQueriesData<SponsorListPage>({ queryKey: ['sponsors'] });
      for (const [key, page] of snapshots) {
        if (!page) continue;
        qc.setQueryData<SponsorListPage>(key, {
          ...page,
          items: page.items.map((s) => (s.id === id ? { ...s, pipelineStatus } : s)),
        });
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, page]) => qc.setQueryData(key, page));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['sponsors'] }),
  });
}

// ─── CRM: timeline / notas / documentos ─────────────────────────────────────

export type SponsorActivity = {
  id: string;
  type: string;
  summary: string;
  actorId: string | null;
  createdAt: string;
};

export type SponsorNote = {
  id: string;
  body: string;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorDocument = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

async function fetchItems<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('fetch failed');
  return unwrapData<Paged<T>>(await res.json())?.items ?? [];
}

async function sendDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
}

const CRM_PAGE = '?page=1&pageSize=50';

export function useSponsorActivities(id: string) {
  return useQuery({
    queryKey: ['sponsor-activities', id],
    enabled: !!id,
    queryFn: () =>
      fetchItems<SponsorActivity>(`/api/admin/economy/sponsors/${id}/activities${CRM_PAGE}`),
  });
}

export function useSponsorNotes(id: string) {
  return useQuery({
    queryKey: ['sponsor-notes', id],
    enabled: !!id,
    queryFn: () => fetchItems<SponsorNote>(`/api/admin/economy/sponsors/${id}/notes${CRM_PAGE}`),
  });
}

export function useSponsorDocuments(id: string) {
  return useQuery({
    queryKey: ['sponsor-documents', id],
    enabled: !!id,
    queryFn: () =>
      fetchItems<SponsorDocument>(`/api/admin/economy/sponsors/${id}/documents${CRM_PAGE}`),
  });
}

export function useSponsorNoteMutations(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sponsor-notes', id] });
    qc.invalidateQueries({ queryKey: ['sponsor-activities', id] });
  };
  return {
    create: useMutation({
      mutationFn: (body: string) =>
        sendJson(`/api/admin/economy/sponsors/${id}/notes`, 'POST', { body }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ noteId, body }: { noteId: string; body: string }) =>
        sendJson(`/api/admin/economy/sponsors/${id}/notes/${noteId}`, 'PATCH', { body }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (noteId: string) =>
        sendDelete(`/api/admin/economy/sponsors/${id}/notes/${noteId}`),
      onSuccess: invalidate,
    }),
  };
}

export function useSponsorDocumentMutations(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sponsor-documents', id] });
    qc.invalidateQueries({ queryKey: ['sponsor-activities', id] });
  };
  return {
    upload: useMutation({
      mutationFn: (input: { filename: string; contentType: string; dataBase64: string }) =>
        sendJson(`/api/admin/economy/sponsors/${id}/documents`, 'POST', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (docId: string) =>
        sendDelete(`/api/admin/economy/sponsors/${id}/documents/${docId}`),
      onSuccess: invalidate,
    }),
  };
}

// ─── Sucursales geolocalizadas (Ola 3) ──────────────────────────────────────

export type SponsorBranch = {
  id: string;
  sponsorId: string;
  label: string;
  latitude: number;
  longitude: number;
  country: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { couponBranches: number };
};

export type SponsorBranchInput = {
  label: string;
  latitude: number;
  longitude: number;
  country: string;
  address: string | null;
  isActive?: boolean;
};

export function useSponsorBranches(id: string) {
  return useQuery({
    queryKey: ['sponsor-branches', id],
    enabled: !!id,
    queryFn: async (): Promise<SponsorBranch[]> => {
      const res = await fetch(`/api/admin/economy/sponsors/${id}/branches`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch branches failed');
      return unwrapData<SponsorBranch[]>(await res.json()) ?? [];
    },
  });
}

export function useSponsorBranchMutations(id: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['sponsor-branches', id] });
  return {
    create: useMutation({
      mutationFn: (input: SponsorBranchInput) =>
        sendJson(`/api/admin/economy/sponsors/${id}/branches`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ branchId, input }: { branchId: string; input: Partial<SponsorBranchInput> }) =>
        sendJson(`/api/admin/economy/sponsors/${id}/branches/${branchId}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (branchId: string) =>
        sendDelete(`/api/admin/economy/sponsors/${id}/branches/${branchId}`),
      onSuccess: invalidate,
    }),
  };
}
