// IDs de los fixtures e2e del panel. Espejo de backend/prisma/seeds/e2e.seed.ts
// (el globalSetup corre ese seed antes de la suite). Si cambian allá, cambiar acá.
export const COUPON_FIXTURE = {
  couponId: '00000000-0000-4000-8000-0000000000c1',
  couponTitle: 'E2E · Cupón de prueba',
  code: 'E2E-TEST01',
} as const;

export const ACHIEVEMENT_FIXTURE = {
  achievementId: '00000000-0000-4000-8000-0000000000a1',
  name: 'E2E · Logro de prueba',
} as const;

export const MISSION_FIXTURE = {
  templateId: '00000000-0000-4000-8000-0000000000d1',
  title: 'E2E · Misión de prueba',
} as const;

export const STORE_FIXTURE = {
  itemId: '00000000-0000-4000-8000-0000000000e1',
  name: 'E2E · Ítem de prueba',
} as const;

export const BANNER_FIXTURE = {
  bannerId: '00000000-0000-4000-8000-0000000000f1',
} as const;

export const RAFFLE_FIXTURE = {
  raffleId: '00000000-0000-4000-8000-0000000000ab',
  name: 'E2E · Premiación de prueba',
} as const;

export const SPONSOR_FIXTURE = {
  sponsorId: '00000000-0000-4000-8000-0000000000ba',
  name: 'E2E · Sponsor de prueba',
  noteBody: 'Nota e2e — no borrar.',
  invoiceNumber: 'E2E-INV-001',
} as const;

export const MODERATION_FIXTURE = {
  reportId: '00000000-0000-4000-8000-0000000000c5',
  prohibitedWord: 'e2eprohibida',
} as const;

export const MESSAGING_FIXTURE = {
  segmentName: 'E2E · Segmento de prueba',
  templateKey: 'e2e-promo',
  campaignId: '00000000-0000-4000-8000-0000000000c9',
  sentCampaignId: '00000000-0000-4000-8000-0000000000ca',
} as const;

export const LAUNCHES_FIXTURE = {
  appVersionId: '00000000-0000-4000-8000-0000000000cb',
  version: '1.0.0',
  liveCountry: 'Costa Rica',
  preparingCountry: 'México',
} as const;

export const GAME_FIXTURE = {
  matchId: '00000000-0000-4000-8000-0000000000d5',
  arenaId: '00000000-0000-4000-8000-0000000000d6',
  simulacroId: '00000000-0000-4000-8000-0000000000d7',
} as const;

export const BOTS_FIXTURE = {
  botId: '00000000-0000-4000-8000-0000000000d8',
  botName: 'E2E · Bot de prueba',
  templateName: 'Medio',
} as const;

export const FEATURE_FIXTURE = {
  ideaId: '00000000-0000-4000-8000-0000000000d9',
  title: 'E2E · Idea de prueba',
} as const;
