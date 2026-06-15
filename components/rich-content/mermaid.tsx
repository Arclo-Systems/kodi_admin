'use client';

import { useEffect, useRef, useState } from 'react';

// Carga perezosa de Mermaid (paquete pesado ~1MB) → no entra al bundle si no hay diagramas.
let mermaidPromise: Promise<typeof import('mermaid')> | null = null;
let initialized = false;

async function getMermaid() {
  if (!mermaidPromise) mermaidPromise = import('mermaid');
  const mermaid = (await mermaidPromise).default;
  if (!initialized) {
    // strict: sin HTML en labels ni click handlers (AUD-SEC-2).
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' });
    initialized = true;
  }
  return mermaid;
}

// Render de un diagrama Mermaid desde su fuente. try/catch → sintaxis inválida/incompleta
// (típico en el preview en vivo) muestra un fallback, no crashea.
export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Debounce: en el preview en vivo `chart` cambia con cada tecla; mermaid.render parsea en
    // el hilo principal, así que solo renderizamos tras una pausa de escritura (AUD-PERF-1).
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const mermaid = await getMermaid();
          const id = `m${Math.random().toString(36).slice(2)}`;
          const { svg } = await mermaid.render(id, chart);
          if (!cancelled && ref.current) {
            ref.current.innerHTML = svg; // strict → SVG sin scripts/HTML inseguro
            setError(false);
          }
        } catch {
          if (!cancelled) setError(true);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chart]);

  if (error) {
    return <span className="text-destructive text-sm">Diagrama inválido o incompleto.</span>;
  }
  // Sin overflow (DESIGN L9): el SVG escala a lo ancho del contenedor en vez de mostrar scrollbar.
  // Centrado: text-center cubre el svg inline; mx-auto cubre el caso en que mermaid lo emita block.
  return <div ref={ref} className="my-2 text-center [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" />;
}
