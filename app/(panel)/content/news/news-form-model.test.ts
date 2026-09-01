import { describe, expect, it } from 'vitest';
import { NEWS_TITLE_MAX, NewsFormSchema } from './news-form-model';

// Reporte del founder (2026-09-01, screenshot HONOR): este titular se pinta con
// "…" en la app. La card de fila corta a 2 líneas (~34 caracteres por línea) y
// el héroe del detalle a 3 (~23 por línea): ambos ceden alrededor de los 68
// caracteres en un ancho de 360dp. El tope del form queda por debajo con margen
// para palabras largas que desperdician línea.
const TITULO_QUE_SE_CORTA =
  'Las Pruebas Nacionales Estandarizadas cambian: ahora buscan ayudar a';

const base = {
  country: 'CR',
  moduleId: '018f0d0e-0000-7000-8000-000000000001',
  title: 'PAA: hay nueva fecha de examen',
  summary: 'La UCR movió la convocatoria de octubre.',
  body: 'Cuerpo en **markdown**.',
  imageUrl: null,
};

describe('NewsFormSchema — tope de título para que no se corte en la app', () => {
  it('acepta una noticia válida', () => {
    expect(NewsFormSchema.safeParse(base).success).toBe(true);
  });

  it(`acepta un título de exactamente ${NEWS_TITLE_MAX} caracteres`, () => {
    const r = NewsFormSchema.safeParse({
      ...base,
      title: 'a'.repeat(NEWS_TITLE_MAX),
    });
    expect(r.success).toBe(true);
  });

  it(`rechaza un título de ${NEWS_TITLE_MAX + 1} caracteres con error en 'title'`, () => {
    const r = NewsFormSchema.safeParse({
      ...base,
      title: 'a'.repeat(NEWS_TITLE_MAX + 1),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(['title']);
      expect(r.error.issues[0]?.message).toContain('se cortaría en la app');
    }
  });

  it('rechaza el titular real del reporte del founder (ya se corta en la app)', () => {
    expect(TITULO_QUE_SE_CORTA.length).toBeGreaterThan(NEWS_TITLE_MAX);
    const r = NewsFormSchema.safeParse({ ...base, title: TITULO_QUE_SE_CORTA });
    expect(r.success).toBe(false);
  });

  it('recorta espacios antes de contar: espacios al borde no penalizan', () => {
    const r = NewsFormSchema.safeParse({
      ...base,
      title: `  ${'a'.repeat(NEWS_TITLE_MAX)}  `,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe('a'.repeat(NEWS_TITLE_MAX));
  });

  it('título vacío → Requerido', () => {
    const r = NewsFormSchema.safeParse({ ...base, title: '   ' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Requerido');
  });

  it('sin módulo → error en moduleId (toda noticia va a un módulo)', () => {
    const r = NewsFormSchema.safeParse({ ...base, moduleId: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['moduleId']);
  });

  it('resumen vacío → Requerido', () => {
    const r = NewsFormSchema.safeParse({ ...base, summary: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['summary']);
  });
});
