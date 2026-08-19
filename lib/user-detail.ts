import { cache } from 'react';
import { adminFetch } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';

export type UserPlan = 'free' | 'basico' | 'plus' | 'pro';

/**
 * Identidad visual del módulo tal como la carga el panel en el árbol de
 * contenido. Se pinta de acá, nunca de un mapa local por `examType`: un examen
 * nuevo tiene que salir con su arte sin tocar código.
 */
export type ModuleIdentity = {
  shortName: string;
  fullName: string;
  examType: string;
  iconUrl: string | null;
  characterUrl: string | null;
  colorHex: string;
};

export type UserDetail = {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  friendCode: string;
  role: string;
  country: string;
  birthDate: string | null;
  accountStatus: string;
  isBot: boolean;
  titleActive: string | null;
  activeModuleId: string | null;
  activeModule: ModuleIdentity | null;
  streakDays: number;
  longestStreakDays: number;
  streakFreezeUsedThisWeek: boolean;
  streakProtectors: number;
  dailyGoalTarget: number;
  goalStreakDays: number;
  kokosBalance: number;
  kolonesBalance: number;
  soundsEnabled: boolean;
  notificationSettings: Record<string, boolean>;
  reminderHour: number | null;
  discoverySource: string | null;
  profilePublic: boolean;
  showInRankings: boolean;
  friendRequestPolicy: 'everyone' | 'nobody';
  emailVerifiedAt: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  plan: UserPlan;
  // Estado de cuenta / soporte
  requirePasswordChange: boolean;
  temporaryPasswordExpiresAt: string | null;
  bannedUntil: string | null;
  banReason: string | null;
  deleteRequestedAt: string | null;
  // Relaciones
  userModules: { module: ModuleIdentity }[];
  // B2: el examen activo es lo que decide qué contenido ve el usuario. Sin esto
  // soporte no podía diagnosticar "me salen preguntas de otro examen".
  examDates: {
    moduleId: string;
    examKey: string;
    examName: string;
    examDate: string | null;
    isActive: boolean;
    module: { shortName: string };
  }[];
  _count?: {
    userAchievements: number;
    subscriptions: number;
    inventory: number;
    questionAttempts: number;
  };
};

// cache() dedupe: el layout y el tab Perfil piden el mismo /users/:id en un request.
export const getUserDetail = cache(async (id: string): Promise<UserDetail | null> => {
  const res = await adminFetch(`/v1/admin/users/${id}`);
  if (!res.ok) return null;
  return unwrapData<UserDetail>(await res.json()) ?? null;
});
