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
  moduleIds: ['018f0d0e-0000-7000-8000-000000000001'],
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

  it('sin módulos → error en moduleIds (toda noticia va a por lo menos uno)', () => {
    const r = NewsFormSchema.safeParse({ ...base, moduleIds: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['moduleIds']);
  });

  it('acepta varios módulos (el mismo aviso le sirve a más de un examen)', () => {
    const r = NewsFormSchema.safeParse({
      ...base,
      moduleIds: [
        '018f0d0e-0000-7000-8000-000000000001',
        '018f0d0e-0000-7000-8000-000000000002',
      ],
    });
    expect(r.success).toBe(true);
  });

  it('resumen vacío → Requerido', () => {
    const r = NewsFormSchema.safeParse({ ...base, summary: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['summary']);
  });
});

// La app dibuja el cuerpo con `html:false`: un tag HTML le llega LITERAL al
// estudiante, mientras el preview del panel lo sanea y no lo muestra. Sin este
// gate el autor guardaba creyendo que estaba bien. Mismo criterio que preguntas.
describe('NewsFormSchema — el cuerpo rechaza HTML crudo', () => {
  it.each([
    ['div', 'Texto <div class="x">roto</div>'],
    ['script', '<script src="https://x.test/a.js"></script>'],
    ['img', 'Mirá <img src="https://x.test/a.png" />'],
    ['a', 'Entrá <a href="https://x.test">acá</a>'],
  ])('rechaza <%s> en el cuerpo', (_tag, body) => {
    const r = NewsFormSchema.safeParse({ ...base, body });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['body']);
  });

  it.each([
    ['markdown normal', 'Un **cambio** importante y una [nota](https://x.test).'],
    ['tabla GFM', '| Materia | Fecha |\n| --- | --- |\n| Mate | 3/4 |'],
    ['lista y cita', '- uno\n- dos\n\n> Ojo con la fecha.'],
    ['desigualdad que parece tag', 'Se aprueba si a<b y no al revés.'],
    ['markdown sin cerrar', 'Un **título a medias y un [link sin cerrar'],
  ])('acepta %s', (_caso, body) => {
    expect(NewsFormSchema.safeParse({ ...base, body }).success).toBe(true);
  });

  it('acepta un cuerpo larguísimo (no hay tope de cuerpo)', () => {
    const body = 'Párrafo con contenido real.\n\n'.repeat(2000);
    expect(NewsFormSchema.safeParse({ ...base, body }).success).toBe(true);
  });
});
