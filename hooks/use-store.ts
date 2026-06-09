'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type StoreCategory = 'cosmetic' | 'functional';
export type StoreItemType =
  | 'frame'
  | 'avatar'
  | 'title'
  | 'app_icon'
  | 'app_theme' // deprecado (Ola D): se muestra en tablas, no se crea
  | 'response_animation' // deprecado (Ola D)
  | 'streak_protector'
  | 'second_chance'
  | 'insignia';
export type StoreTier = 'basico' | 'estandar' | 'premium';
export type StorePlan = 'basico' | 'plus' | 'pro';

// Tipos CREABLES (app_theme/response_animation deprecados → fuera).
export const STORE_ITEM_TYPES: StoreItemType[] = [
  'frame',
  'avatar',
  'title',
  'app_icon',
  'streak_protector',
  'second_chance',
  'insignia',
];

export const ITEM_TYPE_LABELS: Record<StoreItemType, string> = {
  frame: 'Marco',
  avatar: 'Avatar',
  title: 'Título',
  app_icon: 'Ícono de app',
  app_theme: 'Tema de app (deprecado)',
  response_animation: 'Animación (deprecado)',
  streak_protector: 'Protector de racha',
  second_chance: 'Segunda oportunidad',
  insignia: 'Insignia',
};

export const REQUIRES_PLAN_LABELS: Record<StorePlan, string> = {
  basico: 'Básico',
  plus: 'Plus',
  pro: 'Pro',
};

export const CATEGORY_LABELS: Record<StoreCategory, string> = {
  cosmetic: 'Cosmético',
  functional: 'Funcional',
};

export const TIER_LABELS: Record<StoreTier, string> = {
  basico: 'Básico',
  estandar: 'Estándar',
  premium: 'Premium',
};

export type StoreItem = {
  id: string;
  name: string;
  description: string;
  category: StoreCategory;
  itemType: StoreItemType;
  tier: StoreTier;
  kokosPrice: number;
  requiresPlan: StorePlan | null;
  country: string | null;
  previewUrl: string;
  assetUrl: string | null;
  releaseAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  purchasable: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
  ownedBy?: number;
};

export type StoreItemInput = {
  name: string;
  description: string;
  category: StoreCategory;
  itemType: StoreItemType;
  tier: StoreTier;
  kokosPrice: number;
  requiresPlan: StorePlan | null;
  country: string | null;
  previewUrl: string;
  assetUrl: string | null;
  releaseAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  purchasable: boolean;
};

export type StoreListQuery = {
  category?: StoreCategory;
  itemType?: StoreItemType;
  country?: string;
  isActive?: boolean;
  purchasable?: boolean;
  page: number;
  pageSize: number;
};

type StoreListPage = {
  items: StoreItem[];
  total: number;
  page: number;
  pageSize: number;
};

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

export function useStoreItems(query: StoreListQuery) {
  return useQuery({
    queryKey: ['store-items', query],
    queryFn: async (): Promise<StoreListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/economy/store?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch store items failed');
      return (
        unwrapData<StoreListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useStoreItem(id: string) {
  return useQuery({
    queryKey: ['store-item', id],
    enabled: !!id,
    queryFn: async (): Promise<StoreItem | undefined> => {
      const res = await fetch(`/api/admin/economy/store/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch store item failed');
      return unwrapData<StoreItem>(await res.json());
    },
  });
}

export function useStoreItemMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (input: StoreItemInput): Promise<string> => {
        const body = await sendJson('/api/admin/economy/store', 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['store-items'] }),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<StoreItemInput> }) =>
        sendJson(`/api/admin/economy/store/${id}`, 'PATCH', input),
      onSuccess: (_data, { id }) => {
        qc.invalidateQueries({ queryKey: ['store-items'] });
        qc.invalidateQueries({ queryKey: ['store-item', id] });
      },
    }),
  };
}

export type InventoryAction = 'grant' | 'revoke';

export function useInventoryAdjust() {
  return useMutation({
    mutationFn: ({
      friendCode,
      itemId,
      action,
      reason,
    }: {
      friendCode: string;
      itemId: string;
      action: InventoryAction;
      reason: string;
    }) =>
      sendJson(`/api/admin/economy/store/inventory/${encodeURIComponent(friendCode)}`, 'POST', {
        itemId,
        action,
        reason,
      }),
  });
}
