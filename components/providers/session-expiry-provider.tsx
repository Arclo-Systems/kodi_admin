'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { SessionExpiryDialog } from '@/components/session-expiry-dialog';
import {
  IDLE_TIMEOUT_MS,
  nextSessionStep,
  readAccessExpiry,
} from '@/lib/session-expiry';

const TICK_MS = 1_000;
const CHANNEL = 'kodi-admin-session';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown'] as const;

type PeerMessage = { type: 'activity' | 'extended' | 'expired' };

/**
 * Vigila la sesión del panel: renueva en silencio mientras hay actividad, avisa antes de
 * cerrar por inactividad y cierra de verdad al agotarse.
 *
 * La renovación silenciosa NO reinicia el reloj de inactividad — si lo hiciera, una pestaña
 * abierta y olvidada mantendría la sesión viva para siempre.
 */
export function SessionExpiryProvider() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Se siembra al montar el vigilante, no en el render (leer el reloj durante el render
  // no es puro y React lo prohíbe).
  const lastActivityAt = useRef(0);
  const isWarning = useRef(false);
  // Guardas separadas a propósito: una renovación colgada no puede impedir el cierre por
  // inactividad, y el cierre ocurre una sola vez.
  const isRenewing = useRef(false);
  const hasExpired = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [isExtending, setIsExtending] = useState(false);

  const notifyPeers = useCallback((message: PeerMessage) => {
    channel.current?.postMessage(message);
  }, []);

  const closeWarning = useCallback((activeAt: number) => {
    lastActivityAt.current = activeAt;
    isWarning.current = false;
    setMsLeft(null);
  }, []);

  const expire = useCallback(async () => {
    if (hasExpired.current) return;
    hasExpired.current = true;
    notifyPeers({ type: 'expired' });
    // Cierra la sesión de verdad: el refresh token vive 30 días, dejarlo vivo convertiría
    // el vencimiento por inactividad en puro maquillaje.
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    queryClient.clear();
    router.replace('/login?reason=expired');
  }, [notifyPeers, queryClient, router]);

  const requestRenew = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // La renovación automática se saltea si ya hay una en vuelo; la que pide el admin desde
  // el aviso nunca se saltea (dos refresh a la vez los absorbe la ventana de gracia).
  const renewSilently = useCallback(async () => {
    if (isRenewing.current) return;
    isRenewing.current = true;
    try {
      await requestRenew();
    } finally {
      isRenewing.current = false;
    }
  }, [requestRenew]);

  const extend = useCallback(async () => {
    setIsExtending(true);
    const ok = await requestRenew();
    setIsExtending(false);
    if (!ok) return expire();
    closeWarning(Date.now());
    notifyPeers({ type: 'extended' });
  }, [closeWarning, expire, notifyPeers, requestRenew]);

  const logout = useCallback(async () => {
    setIsExtending(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    queryClient.clear();
    router.replace('/login');
  }, [queryClient, router]);

  useEffect(() => {
    const markActivity = (): void => {
      // Con el aviso abierto la decisión es explícita: mover el mouse no extiende nada.
      if (isWarning.current) return;
      lastActivityAt.current = Date.now();
      notifyPeers({ type: 'activity' });
    };
    for (const event of ACTIVITY_EVENTS)
      window.addEventListener(event, markActivity, { passive: true });
    return () => {
      for (const event of ACTIVITY_EVENTS)
        window.removeEventListener(event, markActivity);
    };
  }, [notifyPeers]);

  useEffect(() => {
    // Degradación: sin BroadcastChannel cada pestaña se cuida sola (la ventana de gracia
    // del backend absorbe que dos refresquen a la vez).
    if (typeof BroadcastChannel === 'undefined') return;
    const bus = new BroadcastChannel(CHANNEL);
    channel.current = bus;
    bus.onmessage = (event: MessageEvent<PeerMessage>) => {
      if (event.data.type === 'expired') {
        queryClient.clear();
        router.replace('/login?reason=expired');
        return;
      }
      if (isWarning.current && event.data.type === 'activity') return;
      closeWarning(Date.now());
    };
    return () => {
      channel.current = null;
      bus.close();
    };
  }, [closeWarning, queryClient, router]);

  useEffect(() => {
    const tick = (): void => {
      const now = Date.now();
      const step = nextSessionStep({
        now,
        lastActivityAt: lastActivityAt.current,
        accessExpiresAt: readAccessExpiry(document.cookie),
      });

      if (step === 'expire') {
        void expire();
        return;
      }
      if (step === 'warn') {
        isWarning.current = true;
        setMsLeft(lastActivityAt.current + IDLE_TIMEOUT_MS - now);
        return;
      }
      if (step === 'renew') void renewSilently();
    };

    if (lastActivityAt.current === 0) lastActivityAt.current = Date.now();
    const id = setInterval(tick, TICK_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [expire, renewSilently]);

  return (
    <SessionExpiryDialog
      open={msLeft !== null}
      msLeft={msLeft ?? 0}
      isExtending={isExtending}
      onExtend={() => void extend()}
      onLogout={() => void logout()}
    />
  );
}
