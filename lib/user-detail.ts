import { cache } from 'react';
import { adminFetch } from '@/lib/auth';
import { unwrapData } from '@/lib/bff';

export type UserPlan = 'free' | 'basico' | 'plus' | 'pro';

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
  activeModule: { shortName: string; fullName: string } | null;
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
  examPassed: boolean;
  examPassedAt: string | null;
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
  userModules: {
    module: { shortName: string; fullName: string; examType: string; icon: string };
  }[];
  examDates: { moduleId: string; examDate: string; module: { shortName: string } }[];
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
