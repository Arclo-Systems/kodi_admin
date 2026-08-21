import { ACCESS_EXPIRY_COOKIE } from './bff';

/** Inactividad tolerada antes de cerrar la sesión (decisión de producto). */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** A partir de acá se muestra el aviso: dos minutos para reaccionar. */
export const IDLE_WARNING_MS = 28 * 60 * 1000;
/** Margen para renovar el access antes de que venza, sin que el admin se entere. */
export const RENEW_BEFORE_EXPIRY_MS = 60 * 1000;

export type SessionStep = 'wait' | 'renew' | 'warn' | 'expire';

/**
 * Vencimiento del access token (epoch ms) según la cookie `admin_at_exp`.
 * Es la única fuente: adivinarlo con un timer propio se desincroniza con el backend.
 */
export function readAccessExpiry(documentCookie: string): number | null {
  for (const part of documentCookie.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    if (part.slice(0, eq).trim() !== ACCESS_EXPIRY_COOKIE) continue;
    const value = Number(part.slice(eq + 1).trim());
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export function nextSessionStep(input: {
  now: number;
  lastActivityAt: number;
  accessExpiresAt: number | null;
}): SessionStep {
  const idleFor = input.now - input.lastActivityAt;

  if (idleFor >= IDLE_TIMEOUT_MS) return 'expire';
  if (idleFor >= IDLE_WARNING_MS) return 'warn';

  const expiresAt = input.accessExpiresAt;
  if (expiresAt !== null && input.now >= expiresAt - RENEW_BEFORE_EXPIRY_MS)
    return 'renew';

  return 'wait';
}
