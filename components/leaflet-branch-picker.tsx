'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type {
  Map as LeafletMap,
  Marker,
  LeafletMouseEvent,
  IconOptions,
} from 'leaflet';
import { cn } from '@/lib/utils';

type Props = {
  latitude: number;
  longitude: number;
  onPick: (lat: number, lng: number, address?: string) => void;
  // Alto del mapa (clase Tailwind). Default chico para el modal; grande en la página dedicada.
  className?: string;
};

// Centro por defecto (GAM, Costa Rica) cuando la sucursal aún no tiene coordenadas.
const DEFAULT_CENTER: [number, number] = [9.9281, -84.0907];

const ICON: IconOptions = {
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
};

export function LeafletBranchPicker({ latitude, longitude, onPick, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    let marker: Marker | null = null;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      const hasValue = latitude !== 0 || longitude !== 0;
      const center: [number, number] = hasValue
        ? [latitude, longitude]
        : DEFAULT_CENTER;

      map = L.map(containerRef.current).setView(center, hasValue ? 15 : 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.icon(ICON);
      if (hasValue) marker = L.marker([latitude, longitude], { icon }).addTo(map);

      map.on('click', (e: LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (marker) marker.setLatLng([lat, lng]);
        else if (map) marker = L.marker([lat, lng], { icon }).addTo(map);
        onPickRef.current(lat, lng);
        void reverseGeocode(lat, lng).then((address) => {
          if (address) onPickRef.current(lat, lng, address);
        });
      });

      // El mapa suele montarse dentro de un diálogo (tamaño 0 al inicializar).
      window.setTimeout(() => map?.invalidateSize(), 120);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
    // Init una sola vez; el remount se fuerza con `key` desde el padre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={cn('w-full rounded-md border', className ?? 'h-72')} />;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'es' } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { display_name?: string };
    return body.display_name ?? null;
  } catch {
    return null; // la dirección es opcional/editable a mano
  }
}
