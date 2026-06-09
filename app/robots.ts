import type { MetadataRoute } from 'next';

// Panel interno: se bloquea el crawling por completo (además del header X-Robots-Tag en
// next.config). No querés que el login ni ninguna ruta del admin aparezca en buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
