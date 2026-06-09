import type { AdminRole } from './auth';

export type Action =
  // Áreas top-level
  | 'view:dashboard'
  | 'view:users'
  | 'view:admins'
  | 'view:audit-log'
  | 'view:health'
  // Acciones de users
  | 'user:read'
  | 'user:update'
  | 'user:email-change'
  | 'user:delete'
  | 'user:toggle-bot'
  | 'user:ban'
  | 'user:adjust-balance'
  | 'user:reset-streak'
  | 'user:grant-item'
  | 'user:reset-password'
  | 'user:force-logout'
  | 'user:parental-consent'
  // Acciones de admins
  | 'admin:list'
  | 'admin:invite'
  | 'admin:update'
  | 'admin:deactivate'
  | 'admin:revoke-session'
  // Contenido (Ola 2a)
  | 'view:content'
  | 'content:question:write'
  | 'content:question:activate'
  | 'content:module:write'
  | 'content:subject:write'
  | 'content:news:write'
  | 'content:cutoffs:upload'
  | 'content:cutoffs:approve'
  | 'content:ai-prompt:write'
  | 'content:ai-prompt:activate'
  // Test Vocacional (PAA) — CRUD de carreras + ítems RIASEC = solo admin.
  | 'content:career:write'
  | 'content:vocational:write'
  // Subida masiva de carreras (espejo de cortes): editor sube/revisa, solo admin aprueba.
  | 'content:career:upload'
  | 'content:career:approve'
  // Economía (Ola 2b)
  | 'view:economy'
  | 'economy:achievement:read'
  | 'economy:achievement:write'
  | 'economy:achievement:regrant'
  | 'economy:mission:read'
  | 'economy:mission:write'
  | 'economy:mission:intervene'
  | 'economy:store:read'
  | 'economy:store:write'
  | 'economy:store:inventory'
  | 'economy:banner:read'
  | 'economy:banner:write'
  | 'economy:coupon:read'
  | 'economy:coupon:write'
  | 'economy:coupon:support'
  | 'economy:raffle:read'
  | 'economy:raffle:write'
  | 'economy:raffle:manage'
  | 'economy:sponsor:read'
  | 'economy:sponsor:write'
  // Referidos (Ola 4a)
  | 'economy:referral:read'
  | 'economy:referral:write'
  // Monetización (Ola 3b)
  | 'economy:subscription:read'
  | 'economy:subscription:write'
  | 'economy:cross-sell:write'
  | 'economy:monetization:read'
  // Energía + límites free (Ola 2a) — config económica, admin
  | 'economy:energy:write'
  // Kokos-packs (Ola 2b) — config de packs IAP, admin
  | 'economy:kokos-pack:write'
  // Precios de suscripción unificados (mini-ola unificación) — admin
  | 'economy:subscription-price:write'
  // Videos patrocinados (ola videos) — catálogo SponsorVideo, admin
  | 'economy:video:read'
  | 'economy:video:write'
  // Jobs / cola BullMQ (Ola 3c) — ops, admin-only
  | 'view:jobs'
  | 'jobs:manage'
  // Moderación social (Ola 3d)
  | 'view:moderation'
  | 'moderation:resolve'
  | 'moderation:prohibited-words'
  | 'user:reset-cosmetic'
  // Tickets de usuario (Ola 8a)
  | 'view:tickets'
  | 'tickets:triage'
  // Features / Ideas (Ola 8b) — roadmap interno, solo admin
  | 'view:features'
  | 'features:write'
  // Mensajería (Ola 3e) — email/push manual, admin
  | 'view:messaging'
  | 'messaging:send'
  | 'messaging:approve'
  | 'messaging:segments'
  | 'messaging:templates'
  // Lanzamientos (Ola 3): versiones de app + roadmap por país
  | 'view:launches'
  | 'launches:write'
  | 'launches:country'
  // Juego (Ola 3 gameplay): Matches/Arena/Simulacros
  | 'view:game'
  | 'game:annul'
  // Arena Especial (Ola 6): programar eventos — solo admin
  | 'game:schedule'
  // Bots (Área 24) — solo admin
  | 'view:bots'
  | 'bots:write'
  // Ligas (#23) — config de LeagueConfig, solo admin
  | 'view:leagues'
  | 'leagues:config:write'
  // Finanzas / P&L de la empresa (ola contabilidad) — admin GLOBAL (founder)
  | 'view:finance'
  | 'finance:write';

// Esta matriz es SOLO para gating de UX (ocultar/mostrar). La autoridad real son los
// guards del backend (@RequireRole/@RequireGlobalScope). Si divergen, manda el backend.
// Nunca confiar solo en can() para seguridad.
const matrix: Record<AdminRole, Action[]> = {
  admin: [
    'view:dashboard',
    'view:users',
    'view:admins',
    'view:audit-log',
    'view:health',
    'user:read',
    'user:update',
    'user:email-change',
    'user:delete',
    'user:toggle-bot',
    'user:ban',
    'user:adjust-balance',
    'user:reset-streak',
    'user:grant-item',
    'user:reset-password',
    'user:force-logout',
    'user:parental-consent',
    'admin:list',
    'admin:invite',
    'admin:update',
    'admin:deactivate',
    'admin:revoke-session',
    'view:content',
    'content:question:write',
    'content:question:activate',
    'content:module:write',
    'content:subject:write',
    'content:news:write',
    'content:cutoffs:upload',
    'content:cutoffs:approve',
    'content:ai-prompt:write',
    'content:ai-prompt:activate',
    'content:career:write',
    'content:vocational:write',
    'content:career:upload',
    'content:career:approve',
    'view:economy',
    'economy:achievement:read',
    'economy:achievement:write',
    'economy:achievement:regrant',
    'economy:mission:read',
    'economy:mission:write',
    'economy:mission:intervene',
    'economy:store:read',
    'economy:store:write',
    'economy:store:inventory',
    'economy:banner:read',
    'economy:banner:write',
    'economy:coupon:read',
    'economy:coupon:write',
    'economy:coupon:support',
    'economy:raffle:read',
    'economy:raffle:write',
    'economy:raffle:manage',
    'economy:sponsor:read',
    'economy:sponsor:write',
    'economy:referral:read',
    'economy:referral:write',
    'economy:subscription:read',
    'economy:subscription:write',
    'economy:cross-sell:write',
    'economy:monetization:read',
    'economy:energy:write',
    'economy:kokos-pack:write',
    'economy:subscription-price:write',
    'economy:video:read',
    'economy:video:write',
    'view:jobs',
    'jobs:manage',
    'view:moderation',
    'moderation:resolve',
    'moderation:prohibited-words',
    'user:reset-cosmetic',
    'view:tickets',
    'tickets:triage',
    'view:features',
    'features:write',
    'view:messaging',
    'messaging:send',
    'messaging:approve',
    'messaging:segments',
    'messaging:templates',
    'view:launches',
    'launches:write',
    'launches:country',
    'view:game',
    'game:annul',
    'game:schedule',
    'view:bots',
    'bots:write',
    'view:leagues',
    'leagues:config:write',
    'view:finance',
    'finance:write',
  ],
  editor: [
    'view:dashboard',
    'view:audit-log',
    'view:health',
    'view:content',
    'content:question:write',
    'content:subject:write',
    'content:news:write',
    'content:cutoffs:upload',
    'content:career:upload',
    'content:ai-prompt:write',
    'view:economy',
    'economy:achievement:read',
    'economy:banner:read',
    'economy:banner:write',
    'view:launches',
  ],
  support: [
    'view:dashboard',
    'view:users',
    'view:audit-log',
    'view:health',
    'user:read',
    'user:update',
    'user:ban',
    'user:adjust-balance',
    'user:reset-streak',
    'user:grant-item',
    'user:reset-password',
    'user:force-logout',
    'user:parental-consent',
    'view:moderation',
    'moderation:resolve',
    'view:tickets',
    'tickets:triage',
    'view:launches',
    'view:game',
  ],
  commercial: [
    'view:dashboard',
    'view:audit-log',
    'view:health',
    'view:economy',
    'economy:sponsor:read',
    'economy:sponsor:write',
    'economy:referral:read',
    'economy:referral:write',
    'economy:coupon:read',
    'economy:coupon:write',
    'economy:banner:read',
    'economy:banner:write',
    'economy:monetization:read',
  ],
};

export function can(role: AdminRole, action: Action): boolean {
  return matrix[role]?.includes(action) ?? false;
}

// Algunas acciones requieren scope global.
const globalScopeRequired: Set<Action> = new Set([
  'admin:invite',
  'admin:update',
  'admin:deactivate',
  'admin:revoke-session',
  'messaging:approve', // aprobar broadcast >1000 (el backend lo exige con @RequireGlobalScope)
  'launches:country', // cambiar estado de lanzamiento de un país (habilita registro)
  'view:finance', // contabilidad de la empresa = solo admin global (founder)
  'finance:write',
]);

export function canWithScope(role: AdminRole, isGlobalScope: boolean, action: Action): boolean {
  if (!can(role, action)) return false;
  if (globalScopeRequired.has(action)) return isGlobalScope;
  return true;
}
