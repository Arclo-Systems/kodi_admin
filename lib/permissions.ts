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
  // Universidades (nota de admisión): pesos + escala = solo admin.
  | 'content:university:write'
  // Material de repaso: editar lo puede el editor; publicar (lo que ven los
  // usuarios) es solo admin, igual que aprobar una pregunta.
  | 'content:review-material:write'
  | 'content:review-material:publish'
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
  | 'economy:monetization:read'
  // Operación de la tienda (mini-ola IAP): cupos fundador, eventos de Play, incidencias, DLQ,
  // catálogo de SKUs y kill-switches. Es admin-only en el backend, a diferencia de la analítica
  // de monetización, que también ve el rol comercial.
  | 'economy:store-ops:read'
  // Las vistas de tienda SIN país (eventos, incidencias, DLQ, SKUs, flags): el backend las corta
  // con `assertGlobalScope`, así que un regional que llegue solo cosecha un 403.
  | 'economy:store-ops:global'
  // Energía + límites free (Ola 2a) — config económica, admin
  | 'economy:energy:write'
  // Recompensas de juego/estudio/hábito (ola recompensas) — emite moneda, admin
  | 'economy:rewards:write'
  // Kokos-packs (Ola 2b) — config de packs IAP, admin
  | 'economy:kokos-pack:write'
  // Precios de suscripción unificados (mini-ola unificación) — admin
  | 'economy:subscription-price:write'
  // Videos patrocinados (ola videos) — catálogo SponsorVideo, admin
  | 'economy:video:read'
  | 'economy:video:write'
  // Jobs / cola BullMQ (Ola 3c) — ops, admin-only
  | 'view:jobs'
  | 'view:notifications'
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
  // Identidad visual de los correos (mascota/logo/colores/redes) — afecta TODOS
  // los envíos, así que es admin aunque las plantillas ya lo sean.
  | 'messaging:brand'
  // Legal (N7) — términos, privacidad y bases de premiaciones publicados; los
  // lee la app y (términos/privacidad) las tiendas
  | 'view:legal'
  | 'legal:write'
  // Lanzamientos (Ola 3): versiones de app + roadmap por país
  | 'view:launches'
  | 'launches:write'
  | 'launches:country'
  // Juego (Ola 3 gameplay): Matches/Arena/Simulacros
  | 'view:game'
  | 'game:annul'
  // Arena Especial (Ola 6): programar eventos — solo admin
  | 'game:schedule'
  // Corona de la ruleta de Partida Kodi: config global (todos los módulos y países) — solo admin
  | 'game:wheel-config:write'
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
    'content:university:write',
    'content:review-material:write',
    'content:review-material:publish',
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
    'economy:monetization:read',
    'economy:store-ops:read',
    'economy:store-ops:global',
    'economy:energy:write',
    'economy:rewards:write',
    'economy:kokos-pack:write',
    'economy:subscription-price:write',
    'economy:video:read',
    'economy:video:write',
    'view:jobs',
    'view:notifications',
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
    'messaging:brand',
    'view:legal',
    'legal:write',
    'view:launches',
    'launches:write',
    'launches:country',
    'view:game',
    'game:annul',
    'game:schedule',
    'game:wheel-config:write',
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
    'content:review-material:write',
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
  'economy:store-ops:global', // eventos/incidencias/DLQ/SKUs/flags de tienda: no tienen país
  // Configurar la economía acuña moneda que se vende por dinero real, y ninguna de estas
  // configuraciones tiene país: el backend las cerró con @RequireGlobalScope y la UI tiene
  // que cortar igual, o le ofrece a un admin regional botones que el servidor le rechaza.
  'economy:rewards:write', // recompensas + metas de racha (rewards-admin, streak-goals-admin)
  'economy:energy:write', // energy-admin: config y free-limit
  'economy:mission:write', // templates de misión y refresh-config
  'economy:store:write', // alta/edición/baja de ítems de tienda
  'economy:referral:write', // hitos de referido
  'economy:achievement:regrant', // re-otorgar un logro = acuñar su premio de nuevo
  'economy:kokos-pack:write', // el paquete define cuántos Kokos da una compra real
  'economy:subscription-price:write', // la grilla que el catálogo de Play lee al publicar
]);

export function canWithScope(role: AdminRole, isGlobalScope: boolean, action: Action): boolean {
  if (!can(role, action)) return false;
  if (globalScopeRequired.has(action)) return isGlobalScope;
  return true;
}
