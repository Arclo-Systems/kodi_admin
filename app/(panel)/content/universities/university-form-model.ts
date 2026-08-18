import { toYMD } from '@/components/ui/date-picker';
import type { University, UniversityInput } from '@/hooks/use-universities';
import type { UniversityType } from '@/lib/sponsorship';

// Radix Select no admite value vacío — sentinel del repo para "sin asignar".
export const NO_EXAM = 'NONE';

export type UniversityFormValues = {
  country: string;
  code: string;
  name: string;
  type: UniversityType;
  websiteUrl: string;
  isSponsored: boolean;
  /** 'YYYY-MM-DD' del DatePicker; se traduce a ISO en los bordes del día local. */
  sponsoredFrom: string;
  sponsoredUntil: string;
  examWeight: string;
  presentationWeight: string;
  scaleMin: string;
  scaleMax: string;
  examSubjectId: string;
  isActive: boolean;
};

export const EMPTY_UNIVERSITY_FORM: UniversityFormValues = {
  country: 'CR',
  code: '',
  name: '',
  type: 'public',
  websiteUrl: '',
  isSponsored: false,
  sponsoredFrom: '',
  sponsoredUntil: '',
  examWeight: '',
  presentationWeight: '',
  scaleMin: '',
  scaleMax: '',
  examSubjectId: NO_EXAM,
  isActive: true,
};

const toDay = (iso: string | null): string => (iso ? toYMD(new Date(iso)) : '');

// El patrocinio se administra por día: el inicio abre el día y el fin lo cierra,
// en hora local (la misma que muestra el DatePicker).
const startOfDayIso = (ymd: string): string => new Date(`${ymd}T00:00:00`).toISOString();
const endOfDayIso = (ymd: string): string => new Date(`${ymd}T23:59:59.999`).toISOString();

export function toUniversityFormValues(u: University): UniversityFormValues {
  return {
    country: u.country,
    code: u.code,
    name: u.name,
    type: u.type,
    websiteUrl: u.websiteUrl ?? '',
    isSponsored: u.isSponsored,
    sponsoredFrom: toDay(u.sponsoredFrom),
    sponsoredUntil: toDay(u.sponsoredUntil),
    examWeight: u.examWeight ?? '',
    presentationWeight: u.presentationWeight ?? '',
    scaleMin: u.scaleMin === null ? '' : String(u.scaleMin),
    scaleMax: u.scaleMax === null ? '' : String(u.scaleMax),
    examSubjectId: u.examSubjectId ?? NO_EXAM,
    isActive: u.isActive,
  };
}

/**
 * Una privada no examina (§10.1): sus pesos y escala viajan ausentes para que el
 * backend los guarde en null, y apagar el patrocinio limpia la ventana en vez de
 * dejar fechas huérfanas que la app podría interpretar.
 */
export function toUniversityInput(v: UniversityFormValues): UniversityInput {
  const sponsored = v.isSponsored;
  return {
    country: v.country,
    code: v.code.trim().toUpperCase(),
    name: v.name.trim(),
    type: v.type,
    websiteUrl: v.websiteUrl.trim() === '' ? null : v.websiteUrl.trim(),
    isSponsored: sponsored,
    sponsoredFrom: sponsored && v.sponsoredFrom ? startOfDayIso(v.sponsoredFrom) : null,
    sponsoredUntil: sponsored && v.sponsoredUntil ? endOfDayIso(v.sponsoredUntil) : null,
    ...(v.type === 'public'
      ? {
          examWeight: Number(v.examWeight),
          presentationWeight: Number(v.presentationWeight),
          scaleMin: Number(v.scaleMin),
          scaleMax: Number(v.scaleMax),
        }
      : {}),
    examSubjectId: v.examSubjectId === NO_EXAM ? null : v.examSubjectId,
    isActive: v.isActive,
  };
}

/** Primer error de la validación local, o null. Mismo orden que el formulario. */
export function validateUniversityForm(v: UniversityFormValues): string | null {
  const code = v.code.trim().toUpperCase();
  if (code.length < 2 || code.length > 20) return 'El código debe tener entre 2 y 20 caracteres';
  if (!v.name.trim()) return 'El nombre es obligatorio';

  const website = v.websiteUrl.trim();
  if (website && !website.startsWith('https://')) {
    return 'El sitio web debe empezar con https://';
  }

  if (v.isSponsored && v.sponsoredFrom && v.sponsoredUntil) {
    if (v.sponsoredUntil < v.sponsoredFrom) {
      return 'El fin del patrocinio no puede ser anterior al inicio';
    }
  }

  // Las privadas no llevan nota de admisión: nada que validar.
  if (v.type !== 'public') return null;

  const exam = Number(v.examWeight);
  const presentation = Number(v.presentationWeight);
  if (v.examWeight.trim() === '' || Number.isNaN(exam) || exam < 0 || exam > 1) {
    return 'El peso del examen debe estar entre 0 y 1';
  }
  if (
    v.presentationWeight.trim() === '' ||
    Number.isNaN(presentation) ||
    presentation < 0 ||
    presentation > 1
  ) {
    return 'El peso de la presentación debe estar entre 0 y 1';
  }
  if (Math.abs(exam + presentation - 1) > 1e-6) {
    return 'Los pesos deben sumar 1 (ej. 0.6 examen + 0.4 presentación)';
  }
  const scaleMin = Number(v.scaleMin);
  const scaleMax = Number(v.scaleMax);
  if (
    v.scaleMin.trim() === '' ||
    v.scaleMax.trim() === '' ||
    !Number.isInteger(scaleMin) ||
    !Number.isInteger(scaleMax)
  ) {
    return 'La escala debe ser de números enteros';
  }
  if (scaleMin >= scaleMax) return 'El mínimo de la escala debe ser menor que el máximo';
  return null;
}
