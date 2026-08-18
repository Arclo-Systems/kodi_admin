import { describe, expect, it } from 'vitest';
import type { CareerOffer } from '@/hooks/use-career-offers';
import {
  EMPTY_OFFER_FORM,
  NO_MODALITY,
  formatCampuses,
  parseCampuses,
  toCreateOfferInput,
  toOfferFormValues,
  toUpdateOfferInput,
  validateOfferForm,
  type OfferFormValues,
} from './career-offers-model';

function offer(over: Partial<CareerOffer> = {}): CareerOffer {
  return {
    id: 'o-1',
    careerProfileId: 'c-1',
    campuses: ['San José', 'Heredia'],
    modality: 'mixta',
    durationText: '4 años',
    scheduleText: null,
    costText: null,
    note: null,
    url: 'https://ulatina.cr/derecho',
    sortOrder: 0,
    isActive: true,
    updatedAt: '2026-08-17T00:00:00.000Z',
    university: {
      id: 'u-1',
      code: 'ULAT',
      name: 'Universidad Latina',
      type: 'private',
      isSponsored: false,
      sponsoredFrom: null,
      sponsoredUntil: null,
    },
    ...over,
  };
}

function values(over: Partial<OfferFormValues> = {}): OfferFormValues {
  return { ...EMPTY_OFFER_FORM, universityId: 'u-1', url: 'https://ulatina.cr', ...over };
}

describe('sedes', () => {
  it('parte por "|" limpiando espacios y vacíos', () => {
    expect(parseCampuses(' San José | Heredia ||  ')).toEqual(['San José', 'Heredia']);
  });

  it('formatea de vuelta con el separador visible', () => {
    expect(formatCampuses(['San José', 'Heredia'])).toBe('San José | Heredia');
  });

  it('ida y vuelta es estable', () => {
    expect(parseCampuses(formatCampuses(['A', 'B']))).toEqual(['A', 'B']);
  });
});

describe('mapeo oferta → formulario', () => {
  it('los campos vacíos llegan como string vacío y la modalidad como sentinel', () => {
    const v = toOfferFormValues(offer({ modality: null }));
    expect(v).toMatchObject({
      universityId: 'u-1',
      campuses: 'San José | Heredia',
      modality: NO_MODALITY,
      scheduleText: '',
      costText: '',
      note: '',
      url: 'https://ulatina.cr/derecho',
      isActive: true,
    });
  });
});

describe('mapeo formulario → body', () => {
  it('los textos vacíos viajan como null, no como ""', () => {
    const input = toUpdateOfferInput(values({ durationText: '  ', note: '' }));
    expect(input.durationText).toBeNull();
    expect(input.note).toBeNull();
  });

  it('el sentinel de modalidad viaja como null', () => {
    expect(toUpdateOfferInput(values()).modality).toBeNull();
  });

  it('el alta agrega la universidad al resto del cuerpo', () => {
    const input = toCreateOfferInput(values({ campuses: 'San José', modality: 'virtual' }));
    expect(input).toMatchObject({ universityId: 'u-1', campuses: ['San José'], modality: 'virtual' });
  });

  it('recorta el enlace', () => {
    expect(toUpdateOfferInput(values({ url: '  https://ulatina.cr/x  ' })).url).toBe(
      'https://ulatina.cr/x',
    );
  });
});

describe('validación del diálogo', () => {
  it('exige universidad', () => {
    expect(validateOfferForm(values({ universityId: '' }))).toMatch(/universidad/i);
  });

  it('exige https', () => {
    expect(validateOfferForm(values({ url: 'http://ulatina.cr' }))).toMatch(/https/);
    expect(validateOfferForm(values({ url: '' }))).toMatch(/https/);
  });

  it('corta en 20 sedes', () => {
    const many = Array.from({ length: 21 }, (_, i) => `Sede ${i}`).join('|');
    expect(validateOfferForm(values({ campuses: many }))).toMatch(/20 sedes/);
  });

  it('una oferta mínima válida no da error', () => {
    expect(validateOfferForm(values())).toBeNull();
  });
});
