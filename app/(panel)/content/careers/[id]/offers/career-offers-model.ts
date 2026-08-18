import type {
  CareerOffer,
  CreateCareerOfferInput,
  OfferModality,
  UpdateCareerOfferInput,
} from '@/hooks/use-career-offers';

// Radix Select no admite value vacío — sentinel del repo para "sin modalidad".
export const NO_MODALITY = 'NONE';

export type OfferFormValues = {
  universityId: string;
  /** Sedes separadas con "|", igual que la columna del CSV. */
  campuses: string;
  modality: OfferModality | typeof NO_MODALITY;
  durationText: string;
  scheduleText: string;
  costText: string;
  note: string;
  url: string;
  isActive: boolean;
};

export const EMPTY_OFFER_FORM: OfferFormValues = {
  universityId: '',
  campuses: '',
  modality: NO_MODALITY,
  durationText: '',
  scheduleText: '',
  costText: '',
  note: '',
  url: '',
  isActive: true,
};

export function parseCampuses(raw: string): string[] {
  return raw
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function formatCampuses(campuses: readonly string[]): string {
  return campuses.join(' | ');
}

export function toOfferFormValues(offer: CareerOffer): OfferFormValues {
  return {
    universityId: offer.university.id,
    campuses: formatCampuses(offer.campuses),
    modality: offer.modality ?? NO_MODALITY,
    durationText: offer.durationText ?? '',
    scheduleText: offer.scheduleText ?? '',
    costText: offer.costText ?? '',
    note: offer.note ?? '',
    url: offer.url,
    isActive: offer.isActive,
  };
}

const optional = (raw: string): string | null => {
  const value = raw.trim();
  return value === '' ? null : value;
};

export function toUpdateOfferInput(v: OfferFormValues): UpdateCareerOfferInput {
  return {
    campuses: parseCampuses(v.campuses),
    modality: v.modality === NO_MODALITY ? null : v.modality,
    durationText: optional(v.durationText),
    scheduleText: optional(v.scheduleText),
    costText: optional(v.costText),
    note: optional(v.note),
    url: v.url.trim(),
    isActive: v.isActive,
  };
}

export function toCreateOfferInput(v: OfferFormValues): CreateCareerOfferInput {
  return { universityId: v.universityId, ...toUpdateOfferInput(v) };
}

/** Primer error de la validación local, o null. Mismo orden que el diálogo. */
export function validateOfferForm(v: OfferFormValues): string | null {
  if (!v.universityId) return 'Elegí la universidad privada';
  // La app abre esta URL con Linking.openURL: solo https (mismo criterio que el backend).
  if (!v.url.trim().startsWith('https://')) return 'El enlace debe empezar con https://';
  if (parseCampuses(v.campuses).length > 20) return 'Máximo 20 sedes por oferta';
  return null;
}
