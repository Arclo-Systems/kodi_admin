'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

export type NewsStatus = 'draft' | 'scheduled' | 'published';

export type NewsListItem = {
  id: string;
  country: string;
  moduleId: string | null;
  /** Solo en el listado; `null` mientras el borrador no tenga módulo. */
  module: { shortName: string } | null;
  title: string;
  summary: string;
  status: NewsStatus;
  imageUrl: string | null;
  publishedAt: string;
  createdAt: string;
};

export type NewsListQuery = {
  country?: string;
  moduleId?: string;
  status?: NewsStatus;
  page: number;
  pageSize: number;
};

type NewsListPage = { items: NewsListItem[]; total: number; page: number; pageSize: number };

export function useNews(query: NewsListQuery) {
  return useQuery({
    queryKey: ['news', query],
    queryFn: async (): Promise<NewsListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      return (
        (await fetchJson<NewsListPage>(`/api/admin/content/news?${params}`)) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export type NewsDetail = NewsListItem & {
  body: string;
  createdBy: string | null;
  publishedBy: string | null;
};

export function useNewsArticle(id: string) {
  return useQuery({
    queryKey: ['news-article', id],
    enabled: !!id,
    queryFn: async (): Promise<NewsDetail | undefined> => {
      return fetchJson<NewsDetail>(`/api/admin/content/news/${id}`);
    },
  });
}

async function send(url: string, method: 'POST' | 'PATCH', body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
}

export function useNewsMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['news'] });

  return {
    schedule: useMutation({
      mutationFn: ({ id, publishedAt }: { id: string; publishedAt: string }) =>
        send(`/api/admin/content/news/${id}/schedule`, 'POST', { publishedAt }),
      onSuccess,
    }),
    publish: useMutation({
      mutationFn: (id: string) => send(`/api/admin/content/news/${id}/publish`, 'POST'),
      onSuccess,
    }),
    unpublish: useMutation({
      mutationFn: (id: string) => send(`/api/admin/content/news/${id}/unpublish`, 'POST'),
      onSuccess,
    }),
    duplicate: useMutation({
      mutationFn: ({ id, country, moduleId }: { id: string; country: string; moduleId?: string | null }) =>
        send(`/api/admin/content/news/${id}/duplicate`, 'POST', { country, moduleId }),
      onSuccess,
    }),
  };
}
