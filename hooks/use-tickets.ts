'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

export type TicketType = 'question_report' | 'suggestion' | 'bug_report';
export type TicketStatus = 'open' | 'triaging' | 'resolved' | 'dismissed';
export type TicketCategory =
  | 'respuesta_incorrecta'
  | 'typo'
  | 'ambigua'
  | 'desactualizada'
  | 'ofensiva'
  | 'otro';

export type TicketUserRef = {
  id: string;
  displayName: string;
  email?: string;
  country?: string;
} | null;

export type Ticket = {
  id: string;
  type: TicketType;
  status: TicketStatus;
  category: TicketCategory | null;
  message: string;
  context: unknown;
  questionId: string | null;
  assignedTo: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user: TicketUserRef;
  question: { id: string } | null;
  promotedIdeaId: string | null;
};

type TicketsPage = { items: Ticket[]; total: number; page: number; pageSize: number };

export type TicketsQuery = {
  status?: string;
  type?: string;
  page: number;
  pageSize: number;
};

export type TriageInput = {
  status: 'triaging' | 'resolved' | 'dismissed';
  resolution?: string;
  assignedTo?: string | null;
};

export const TICKETS_PAGE_SIZE = 20;

async function send(
  url: string,
  method: 'PATCH',
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

export function useTickets(query: TicketsQuery) {
  return useQuery({
    queryKey: ['tickets', 'list', query],
    queryFn: async (): Promise<TicketsPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      return (
        (await fetchJson<TicketsPage>(`/api/admin/tickets?${params}`)) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useTicket(id: string | null) {
  return useQuery({
    queryKey: ['tickets', 'detail', id],
    enabled: !!id,
    queryFn: async (): Promise<Ticket | undefined> => {
      return fetchJson<Ticket>(`/api/admin/tickets/${id}`);
    },
  });
}

export function useTriageTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TriageInput }) =>
      send(`/api/admin/tickets/${id}`, 'PATCH', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}
