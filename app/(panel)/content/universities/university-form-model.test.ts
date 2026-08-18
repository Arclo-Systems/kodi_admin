import { describe, expect, it } from 'vitest';
import type { University } from '@/hooks/use-universities';
import {
  EMPTY_UNIVERSITY_FORM,
  NO_EXAM,
  toUniversityFormValues,
  toUniversityInput,
  validateUniversityForm,
  type UniversityFormValues,
} from './university-form-model';

function university(over: Partial<University> = {}): University {
  return {
    id: 'u-1',
    country: 'CR',
    code: 'UCR',
    name: 'Universidad de Costa Rica',
    type: 'public',
    websiteUrl: null,
    isSponsored: false,
    sponsoredFrom: null,
    sponsoredUntil: null,
    examWeight: '0.5',
    presentationWeight: '0.5',
    scaleMin: 200,
    scaleMax: 800,
    examSubjectId: null,
    isActive: true,
    updatedAt: '2026-08-17T00:00:00.000Z',
    ...over,
  };
}

function values(over: Partial<UniversityFormValues> = {}): UniversityFormValues {
  return { ...EMPTY_UNIVERSITY_FORM, code: 'UCR', name: 'UCR', ...over };
}

const PUBLIC_VALUES: Partial<UniversityFormValues> = {
  examWeight: '0.6',
  presentationWeight: '0.4',
  scaleMin: '200',
  scaleMax: '800',
};

describe('mapeo universidad → formulario', () => {
  it('una privada llega con pesos y escala vacíos, no en cero', () => {
    const v = toUniversityFormValues(
      university({
        type: 'private',
        examWeight: null,
        presentationWeight: null,
        scaleMin: null,
        scaleMax: null,
      }),
    );
    expect(v).toMatchObject({
      type: 'private',
      examWeight: '',
      presentationWeight: '',
      scaleMin: '',
      scaleMax: '',
      examSubjectId: NO_EXAM,
    });
  });

  it('conserva sitio web y ventana de patrocinio', () => {
    const v = toUniversityFormValues(
      university({
        websiteUrl: 'https://ulatina.cr',
        isSponsored: true,
        sponsoredFrom: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
        sponsoredUntil: new Date(2026, 5, 30, 23, 59, 59).toISOString(),
      }),
    );
    expect(v.websiteUrl).toBe('https://ulatina.cr');
    expect(v.isSponsored).toBe(true);
    expect(v.sponsoredFrom).toBe('2026-03-15');
    expect(v.sponsoredUntil).toBe('2026-06-30');
  });
});

describe('mapeo formulario → body', () => {
  it('una privada no manda pesos ni escala', () => {
    const input = toUniversityInput(values({ type: 'private', ...PUBLIC_VALUES }));
    expect(input).not.toHaveProperty('examWeight');
    expect(input).not.toHaveProperty('presentationWeight');
    expect(input).not.toHaveProperty('scaleMin');
    expect(input).not.toHaveProperty('scaleMax');
  });

  it('una pública manda los cuatro campos como números', () => {
    const input = toUniversityInput(values({ type: 'public', ...PUBLIC_VALUES }));
    expect(input).toMatchObject({
      examWeight: 0.6,
      presentationWeight: 0.4,
      scaleMin: 200,
      scaleMax: 800,
    });
  });

  it('apagar el patrocinio limpia las fechas', () => {
    const input = toUniversityInput(
      values({
        ...PUBLIC_VALUES,
        isSponsored: false,
        sponsoredFrom: '2026-03-15',
        sponsoredUntil: '2026-06-30',
      }),
    );
    expect(input.sponsoredFrom).toBeNull();
    expect(input.sponsoredUntil).toBeNull();
  });

  it('la ventana viaja en ISO cubriendo el día completo', () => {
    const input = toUniversityInput(
      values({
        ...PUBLIC_VALUES,
        isSponsored: true,
        sponsoredFrom: '2026-03-15',
        sponsoredUntil: '2026-06-30',
      }),
    );
    expect(new Date(input.sponsoredFrom ?? '').getTime()).toBe(
      new Date(2026, 2, 15, 0, 0, 0, 0).getTime(),
    );
    expect(new Date(input.sponsoredUntil ?? '').getTime()).toBe(
      new Date(2026, 5, 30, 23, 59, 59, 999).getTime(),
    );
  });

  it('normaliza código, nombre y sitio web vacío', () => {
    const input = toUniversityInput(
      values({ code: ' ulat ', name: '  Latina  ', websiteUrl: '   ', ...PUBLIC_VALUES }),
    );
    expect(input.code).toBe('ULAT');
    expect(input.name).toBe('Latina');
    expect(input.websiteUrl).toBeNull();
  });
});

describe('validación del formulario', () => {
  it('acepta una privada sin pesos ni escala', () => {
    expect(validateUniversityForm(values({ type: 'private' }))).toBeNull();
  });

  it('exige pesos y escala a una pública', () => {
    expect(validateUniversityForm(values({ type: 'public' }))).toMatch(/peso del examen/i);
  });

  it('exige que los pesos sumen 1', () => {
    expect(
      validateUniversityForm(values({ ...PUBLIC_VALUES, presentationWeight: '0.5' })),
    ).toMatch(/sumar 1/);
  });

  it('rechaza un sitio web que no sea https', () => {
    expect(
      validateUniversityForm(values({ type: 'private', websiteUrl: 'http://ulatina.cr' })),
    ).toMatch(/https/);
  });

  it('rechaza una ventana de patrocinio al revés', () => {
    expect(
      validateUniversityForm(
        values({
          type: 'private',
          isSponsored: true,
          sponsoredFrom: '2026-06-30',
          sponsoredUntil: '2026-03-15',
        }),
      ),
    ).toMatch(/anterior al inicio/);
  });

  it('rechaza un código corto antes que cualquier otra cosa', () => {
    expect(validateUniversityForm(values({ code: 'U' }))).toMatch(/código/i);
  });
});
