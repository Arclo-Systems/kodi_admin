'use client';

import { useMutation } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

// Caps espejo del backend (AUD-SEC1).
export const PRIZE_CAPS = { kolones: 10_000, kokos: 5_000, xp: 5_000 } as const;
export const MAX_BRACKETS = 10;

export type PrizeBracketInput = {
  min_rank: number;
  max_rank: number;
  kolones: number;
  kokos: number;
  xp: number;
};

export type ScheduleEspecialInput = {
  module_id: string;
  scheduled_at: string;
  prizes: PrizeBracketInput[];
};

// Tramos no solapados (espejo de hasOverlap del backend, AUD-API2).
export function hasOverlap(
  brackets: { min_rank: number; max_rank: number }[],
): boolean {
  const sorted = [...brackets].sort((a, b) => a.min_rank - b.min_rank);
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1];
    if (cur && prev && cur.min_rank <= prev.max_rank) return true;
  }
  return false;
}

export function useScheduleEspecial() {
  return useMutation({
    mutationFn: async (input: ScheduleEspecialInput): Promise<string> => {
      const res = await fetch('/api/admin/game/arenas/especial', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(b.message ?? 'Error programando el evento');
      }
      return unwrapData<{ id: string }>(await res.json())?.id ?? '';
    },
  });
}
